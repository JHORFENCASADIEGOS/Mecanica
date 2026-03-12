import sys
import subprocess
import importlib.util

# Lista de librerias requeridas y su nombre de modulo
required = {'Flask': 'flask', 'Flask-MySQLdb': 'flask_mysqldb'}
missing = []

for package, module_name in required.items():
    if importlib.util.find_spec(module_name) is None:
        missing.append(package)

# Si falta alguna libreria, la instalamos
if missing:
    print(f"Instalando librerias faltantes: {', '.join(missing)} ...")
    python = sys.executable
    subprocess.check_call([python, '-m', 'pip', 'install', *missing], stdout=subprocess.DEVNULL)
    print("Instalacion completada con exito. Ejecutando aplicacion...\n")

from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session
from flask_mysqldb import MySQL
from flask.json.provider import DefaultJSONProvider
from datetime import datetime, date
from decimal import Decimal
import os
import json

class CustomJSONProvider(DefaultJSONProvider):
    def default(self, o):
        if isinstance(o, (datetime, date)):
            return o.isoformat()
        if isinstance(o, Decimal):
            return float(o)
        return super().default(o)

app = Flask(__name__)
app.json_provider_class = CustomJSONProvider
app.json = CustomJSONProvider(app)
app.secret_key = 'super_secret_key'

# Configuración de la base de datos
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = 'As123456789!'
app.config['MYSQL_DB'] = 'TALLER_ERP'
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'
mysql = MySQL(app)

# ==========================================
# MÉTODO REUTILIZABLE PARA LLAMAR PROCEDURES
# ==========================================
def call_procedure(procedure_name, data_dict, user='admin'):
    json_data = json.dumps(data_dict)
    try:
        cur = mysql.connection.cursor()
        cur.callproc(procedure_name, (json_data, user))
        result = cur.fetchall()
        
        # Consumir TODOS los result sets pendientes para evitar "Commands out of sync"
        while cur.nextset():
            pass
        
        cur.close()
        
        # Commit para cualquier operación de escritura
        mysql.connection.commit()
        
        if result and len(result) == 1 and 'OSUCCESS' in result[0]:
            return result[0]
        return result
    except Exception as e:
        try:
            mysql.connection.rollback()
        except:
            pass
        return {
            'OSUCCESS': 0,
            'OMENSAJE': f'Error en conexión o ejecución: {str(e)}'
        }

# ==========================================
# RUTAS DE API REST
# ==========================================

@app.route('/api/session', methods=['GET'])
def get_session():
    """Devuelve los datos del usuario logueado al frontend."""
    if 'usuario' not in session:
        return jsonify({'OSUCCESS': 0, 'OMENSAJE': 'No autenticado'}), 401
    return jsonify({'OSUCCESS': 1, 'data': session['usuario']})

@app.route('/api/<procedure>', methods=['POST'])
def api_router(procedure):
    # Permitir login (vcrud=7) y registro (vcrud=1,6) sin sesión
    datos = request.json
    vcrud = datos.get('vcrud')
    
    is_login = procedure.upper() == 'MECANICA_CRUD_TERCEROS' and vcrud == 7
    is_register_tercero = procedure.upper() == 'MECANICA_CRUD_TERCEROS' and vcrud == 1 and datos.get('auto_registro')
    is_register_user = procedure.upper() == 'MECANICA_CRUD_TERCEROS' and vcrud == 6 and datos.get('auto_registro')
    
    if 'usuario' not in session and not is_login and not is_register_tercero and not is_register_user:
        return jsonify({'OSUCCESS': 0, 'OMENSAJE': 'No autorizado, inicie sesión.'}), 401

    usuario_auditoria = session.get('usuario', {}).get('USERNAME', 'invitado')
    
    procedures_permitidos = [
        'MECANICA_CRUD_TERCEROS',
        'MECANICA_CRUD_VEHICULO',
        'MECANICA_CRUD_MATERIAL',
        'MECANICA_CRUD_ORDENES_TRABAJOS',
        'MECANICA_CRUD_ORDEN_DETALLES',
        'MECANICA_CRUD_TRANSACCIONES',
        'MECANICA_CRUD_INVENTARIO',
        'MECANICA_CRUD_SISTEMA'
    ]
    
    if procedure.upper() not in procedures_permitidos:
        return jsonify({'OSUCCESS': 0, 'OMENSAJE': 'Procedure no permitido'}), 403

    # Limpiar el flag auto_registro antes de enviar al procedure
    payload = {k: v for k, v in datos.items() if k != 'auto_registro'}
    
    resultado = call_procedure(procedure.upper(), payload, user=usuario_auditoria)
    
    # LOGIN
    if procedure.upper() == 'MECANICA_CRUD_TERCEROS' and vcrud == 7:
        if isinstance(resultado, (list, tuple)) and len(resultado) > 0 and 'USUID' in resultado[0]:
            user_data = resultado[0]
            # Determinar rol principal
            if user_data.get('ES_TRABAJADOR') == 1:
                user_data['ROL'] = 'trabajador'
            elif user_data.get('ES_CLIENTE') == 1:
                user_data['ROL'] = 'cliente'
            else:
                user_data['ROL'] = 'admin'
            session['usuario'] = user_data
            return jsonify({'OSUCCESS': 1, 'OMENSAJE': 'Login exitoso', 'data': user_data})
        else:
            return jsonify({'OSUCCESS': 0, 'OMENSAJE': 'Credenciales incorrectas'})

    return jsonify(resultado)

# ==========================================
# RUTAS DE VISTAS FRONTEND
# ==========================================

@app.route('/')
def index():
    if 'usuario' in session:
        rol = session['usuario'].get('ROL', 'admin')
        if rol == 'trabajador':
            return render_template('trabajador.html')
        elif rol == 'cliente':
            return render_template('cliente.html')
        else:
            return render_template('dashboard.html')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, port=5000)