"""
====================================================================
PRUEBAS UNITARIAS — TALLER_ERP (Sistema ERP para Taller Mecánico)
====================================================================

Módulo probado  : MECANICA_CRUD_TERCEROS (API REST + Stored Procedure)
Tipo de prueba  : Prueba Unitaria (Black-box sobre la API REST)
Framework       : pytest + Flask test client
Estándar        : ISO/IEC 25010 — Adecuación Funcional, Seguridad

Autores         : [Nombre del grupo]
Fecha           : Mayo 2026
Asignatura      : Calidad de Software — CUN
====================================================================
"""

import sys
import os
import json
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime

# Agregar el directorio padre al path para importar app.py
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app


# ======================================================================
# FIXTURES — Configuración reutilizable para las pruebas
# ======================================================================

@pytest.fixture
def client():
    """
    Crea un cliente de prueba de Flask.
    Configura la app en modo TESTING para capturar excepciones
    y desactivar CSRF.
    """
    app.config['TESTING'] = True
    app.config['SECRET_KEY'] = 'test_secret_key'
    with app.test_client() as client:
        yield client


@pytest.fixture
def authenticated_client(client):
    """
    Crea un cliente autenticado con una sesión simulada.
    Simula un login exitoso para que las rutas protegidas sean accesibles.
    """
    with client.session_transaction() as sess:
        sess['usuario'] = {
            'USUID': 1,
            'TERID': 1,
            'USERNAME': 'admin',
            'NOMBRE': 'Administrador Principal',
            'DOCUMENTO': '000000000',
            'EMAIL': 'admin@taller.com',
            'ES_CLIENTE': 0,
            'ES_TRABAJADOR': 0,
            'ES_PROVEEDOR': 0,
            'ROL': 'admin'
        }
    return client


def mock_call_procedure_success(*args, **kwargs):
    """Mock genérico que simula una respuesta exitosa del procedure."""
    return {'OSUCCESS': 1, 'OMENSAJE': 'Operación exitosa', 'TERID': 99}


def mock_call_procedure_login_success(*args, **kwargs):
    """Mock que simula un login exitoso devolviendo datos de usuario."""
    return [
        {
            'USUID': 1,
            'TERID': 1,
            'USERNAME': 'admin',
            'NOMBRE': 'Administrador Principal',
            'DOCUMENTO': '000000000',
            'EMAIL': 'admin@taller.com',
            'ES_CLIENTE': 0,
            'ES_TRABAJADOR': 1,
            'ES_PROVEEDOR': 0
        }
    ]


def mock_call_procedure_login_fail(*args, **kwargs):
    """Mock que simula un login fallido (credenciales incorrectas)."""
    return []


def mock_call_procedure_error(*args, **kwargs):
    """Mock que simula un error del procedure."""
    return {'OSUCCESS': 0, 'OMENSAJE': 'Error en conexión o ejecución: Test error'}


# ======================================================================
# CASO DE PRUEBA CP-001: CREAR TERCERO (vcrud=1)
# ======================================================================
# Requerimiento : RF-001 — El sistema debe permitir crear un tercero
#                 con los campos obligatorios (documento, nombre, etc.)
# Criterio ISO  : Adecuación Funcional (Completitud funcional)
# ======================================================================

class TestCP001_CrearTercero:
    """
    CP-001: Verificar la creación correcta de un tercero
    a través de la API REST.
    """

    @patch('app.call_procedure')
    def test_crear_tercero_datos_validos(self, mock_proc, authenticated_client):
        """
        Escenario 1: Crear un tercero con TODOS los datos válidos.
        
        Precondición : Usuario autenticado como administrador.
        Datos entrada: Documento='12345678', Nombre='Juan Pérez',
                       Teléfono='3001234567', Email='juan@test.com',
                       es_cliente=1, es_trabajador=0, es_proveedor=0
        
        Resultado esperado: OSUCCESS=1, TERID asignado.
        """
        mock_proc.return_value = {
            'OSUCCESS': 1,
            'OMENSAJE': 'Tercero creado exitosamente',
            'TERID': 99
        }

        payload = {
            'vcrud': 1,
            'documento': '12345678',
            'nombre': 'Juan Pérez',
            'telefono': '3001234567',
            'email': 'juan@test.com',
            'es_cliente': 1,
            'es_trabajador': 0,
            'es_proveedor': 0
        }

        response = authenticated_client.post(
            '/api/MECANICA_CRUD_TERCEROS',
            data=json.dumps(payload),
            content_type='application/json'
        )

        data = response.get_json()
        
        # Verificaciones (Assertions)
        assert response.status_code == 200, \
            f"Se esperaba código 200, se obtuvo {response.status_code}"
        assert data['OSUCCESS'] == 1, \
            f"Se esperaba OSUCCESS=1, se obtuvo {data.get('OSUCCESS')}"
        assert 'TERID' in data, \
            "El response debe contener el ID del tercero creado (TERID)"
        assert data['TERID'] == 99, \
            f"Se esperaba TERID=99, se obtuvo {data.get('TERID')}"

        # Verificar que se llamó al procedure con los datos correctos
        mock_proc.assert_called_once()
        call_args = mock_proc.call_args
        assert call_args[0][0] == 'MECANICA_CRUD_TERCEROS', \
            "Debe llamar al procedure MECANICA_CRUD_TERCEROS"

        print("✅ CP-001 Escenario 1: Creación con datos válidos — PASA")

    @patch('app.call_procedure')
    def test_crear_tercero_sin_nombre(self, mock_proc, authenticated_client):
        """
        Escenario 2: Intentar crear un tercero SIN nombre (campo obligatorio).
        
        Precondición : Usuario autenticado como administrador.
        Datos entrada: Documento='99999999', Nombre=None,
                       Teléfono='3009999999', Email='test@test.com'
        
        Resultado esperado: OSUCCESS=0, mensaje de error.
        """
        mock_proc.return_value = {
            'OSUCCESS': 0,
            'OMENSAJE': "Error [1048]: Column 'NOMBRE' cannot be null"
        }

        payload = {
            'vcrud': 1,
            'documento': '99999999',
            'nombre': None,
            'telefono': '3009999999',
            'email': 'test@test.com',
            'es_cliente': 1,
            'es_trabajador': 0,
            'es_proveedor': 0
        }

        response = authenticated_client.post(
            '/api/MECANICA_CRUD_TERCEROS',
            data=json.dumps(payload),
            content_type='application/json'
        )

        data = response.get_json()

        assert response.status_code == 200
        assert data['OSUCCESS'] == 0, \
            "Crear un tercero sin nombre debe fallar (OSUCCESS=0)"
        assert 'OMENSAJE' in data, \
            "El response debe contener un mensaje de error"

        print("✅ CP-001 Escenario 2: Creación sin nombre (inválido) — PASA")

    @patch('app.call_procedure')
    def test_crear_tercero_documento_duplicado(self, mock_proc, authenticated_client):
        """
        Escenario 3: Intentar crear un tercero con documento duplicado.
        
        Precondición : Usuario autenticado. Existe un tercero con
                       documento '000000000'.
        Datos entrada: Documento='000000000' (ya existente)
        
        Resultado esperado: OSUCCESS=0, error de duplicado.
        """
        mock_proc.return_value = {
            'OSUCCESS': 0,
            'OMENSAJE': "Error [1062]: Duplicate entry '000000000' for key 'DOCUMENTO'"
        }

        payload = {
            'vcrud': 1,
            'documento': '000000000',
            'nombre': 'Duplicado Test',
            'telefono': '3000000000',
            'email': 'dup@test.com',
            'es_cliente': 1,
            'es_trabajador': 0,
            'es_proveedor': 0
        }

        response = authenticated_client.post(
            '/api/MECANICA_CRUD_TERCEROS',
            data=json.dumps(payload),
            content_type='application/json'
        )

        data = response.get_json()

        assert response.status_code == 200
        assert data['OSUCCESS'] == 0, \
            "Crear un tercero con documento duplicado debe fallar"
        assert 'Duplicate' in data.get('OMENSAJE', '') or data['OSUCCESS'] == 0, \
            "Debe indicar el error de duplicado"

        print("✅ CP-001 Escenario 3: Documento duplicado — PASA")


# ======================================================================
# CASO DE PRUEBA CP-002: LOGIN DE USUARIO (vcrud=7)
# ======================================================================
# Requerimiento : RF-007 — El sistema debe validar credenciales y
#                 establecer sesión de usuario.
# Criterio ISO  : Seguridad (Autenticidad), Adecuación Funcional
# ======================================================================

class TestCP002_LoginUsuario:
    """
    CP-002: Verificar el proceso de autenticación (login)
    del sistema TALLER_ERP.
    """

    @patch('app.call_procedure')
    def test_login_credenciales_validas(self, mock_proc, client):
        """
        Escenario 1: Login con credenciales VÁLIDAS.
        
        Precondición : El usuario 'admin' con contraseña '123' existe
                       en la base de datos.
        Datos entrada: username='admin', password_hash='123'
        
        Resultado esperado: OSUCCESS=1, datos de usuario, sesión activa.
        """
        mock_proc.return_value = [
            {
                'USUID': 1,
                'TERID': 1,
                'USERNAME': 'admin',
                'NOMBRE': 'Administrador Principal',
                'DOCUMENTO': '000000000',
                'EMAIL': 'admin@taller.com',
                'ES_CLIENTE': 0,
                'ES_TRABAJADOR': 0,
                'ES_PROVEEDOR': 0
            }
        ]

        payload = {
            'vcrud': 7,
            'username': 'admin',
            'password_hash': '123'
        }

        response = client.post(
            '/api/MECANICA_CRUD_TERCEROS',
            data=json.dumps(payload),
            content_type='application/json'
        )

        data = response.get_json()

        assert response.status_code == 200, \
            f"Se esperaba código 200, se obtuvo {response.status_code}"
        assert data['OSUCCESS'] == 1, \
            f"Login con credenciales válidas debe ser exitoso, se obtuvo OSUCCESS={data.get('OSUCCESS')}"
        assert data.get('OMENSAJE') == 'Login exitoso', \
            f"Mensaje esperado: 'Login exitoso', obtenido: '{data.get('OMENSAJE')}'"
        assert 'data' in data, \
            "El response debe contener los datos del usuario"
        assert data['data']['USERNAME'] == 'admin', \
            f"El username del usuario logueado debe ser 'admin'"

        print("✅ CP-002 Escenario 1: Login con credenciales válidas — PASA")

    @patch('app.call_procedure')
    def test_login_credenciales_invalidas(self, mock_proc, client):
        """
        Escenario 2: Login con credenciales INVÁLIDAS.
        
        Precondición : Ninguna.
        Datos entrada: username='hacker', password_hash='wrongpass'
        
        Resultado esperado: OSUCCESS=0, mensaje de error.
        """
        mock_proc.return_value = []  # Lista vacía = no encontró usuario

        payload = {
            'vcrud': 7,
            'username': 'hacker',
            'password_hash': 'wrongpass'
        }

        response = client.post(
            '/api/MECANICA_CRUD_TERCEROS',
            data=json.dumps(payload),
            content_type='application/json'
        )

        data = response.get_json()

        assert response.status_code == 200
        assert data['OSUCCESS'] == 0, \
            "Login con credenciales inválidas debe fallar (OSUCCESS=0)"
        assert 'incorrectas' in data.get('OMENSAJE', '').lower() or data['OSUCCESS'] == 0, \
            "Debe indicar que las credenciales son incorrectas"

        print("✅ CP-002 Escenario 2: Login con credenciales inválidas — PASA")

    @patch('app.call_procedure')
    def test_login_campos_vacios(self, mock_proc, client):
        """
        Escenario 3: Login con campos VACÍOS.
        
        Precondición : Ninguna.
        Datos entrada: username='', password_hash=''
        
        Resultado esperado: OSUCCESS=0, error de credenciales.
        """
        mock_proc.return_value = []

        payload = {
            'vcrud': 7,
            'username': '',
            'password_hash': ''
        }

        response = client.post(
            '/api/MECANICA_CRUD_TERCEROS',
            data=json.dumps(payload),
            content_type='application/json'
        )

        data = response.get_json()

        assert response.status_code == 200
        assert data['OSUCCESS'] == 0, \
            "Login con campos vacíos debe fallar"

        print("✅ CP-002 Escenario 3: Login con campos vacíos — PASA")

    @patch('app.call_procedure')
    def test_login_asigna_rol_trabajador(self, mock_proc, client):
        """
        Escenario 4: Verificar que al loguearse un trabajador,
        el sistema asigne correctamente el ROL='trabajador'.
        
        Precondición : El usuario es un trabajador registrado.
        Datos entrada: Credenciales de un trabajador.
        
        Resultado esperado: ROL='trabajador' en la sesión.
        """
        mock_proc.return_value = [
            {
                'USUID': 2,
                'TERID': 4,
                'USERNAME': 'terid4',
                'NOMBRE': 'Daniel Mendoza',
                'DOCUMENTO': '10354',
                'EMAIL': 'daniel@prueba.com',
                'ES_CLIENTE': 0,
                'ES_TRABAJADOR': 1,
                'ES_PROVEEDOR': 0
            }
        ]

        payload = {
            'vcrud': 7,
            'username': 'terid4',
            'password_hash': '123'
        }

        response = client.post(
            '/api/MECANICA_CRUD_TERCEROS',
            data=json.dumps(payload),
            content_type='application/json'
        )

        data = response.get_json()

        assert response.status_code == 200
        assert data['OSUCCESS'] == 1
        assert data['data']['ROL'] == 'trabajador', \
            f"El rol asignado debe ser 'trabajador', se obtuvo '{data['data'].get('ROL')}'"

        print("✅ CP-002 Escenario 4: Asignación de rol trabajador — PASA")


# ======================================================================
# CASO DE PRUEBA CP-003: SEGURIDAD DE SESIÓN Y CONTROL DE ACCESO
# ======================================================================
# Requerimiento : RNF-001 — El sistema debe rechazar peticiones
#                 no autenticadas con código HTTP 401.
# Criterio ISO  : Seguridad (Control de Acceso, Confidencialidad)
# ======================================================================

class TestCP003_SeguridadSesion:
    """
    CP-003: Verificar que el sistema protege los endpoints
    contra accesos no autorizados.
    """

    def test_acceso_sin_sesion_retorna_401(self, client):
        """
        Escenario 1: Acceder a la API sin sesión activa.
        
        Precondición : NO hay sesión de usuario activa.
        Datos entrada: Petición POST a /api/MECANICA_CRUD_TERCEROS
                       con vcrud=2 (Leer todos) SIN login previo.
        
        Resultado esperado: HTTP 401, OSUCCESS=0.
        """
        payload = {
            'vcrud': 2  # Leer todos los terceros
        }

        response = client.post(
            '/api/MECANICA_CRUD_TERCEROS',
            data=json.dumps(payload),
            content_type='application/json'
        )

        data = response.get_json()

        assert response.status_code == 401, \
            f"Sin sesión, se esperaba código 401, se obtuvo {response.status_code}"
        assert data['OSUCCESS'] == 0, \
            "Sin sesión activa, OSUCCESS debe ser 0"
        assert 'No autorizado' in data.get('OMENSAJE', '') or 'sesión' in data.get('OMENSAJE', '').lower(), \
            "Debe indicar que no está autorizado"

        print("✅ CP-003 Escenario 1: Acceso sin sesión (401) — PASA")

    def test_procedure_no_permitido_retorna_403(self, authenticated_client):
        """
        Escenario 2: Intentar ejecutar un procedure NO permitido.
        
        Precondición : Usuario autenticado.
        Datos entrada: Petición POST a /api/DROP_TABLE_MALICIOSO
        
        Resultado esperado: HTTP 403, OSUCCESS=0.
        """
        payload = {
            'vcrud': 1,
            'nombre': 'Test Malicioso'
        }

        response = authenticated_client.post(
            '/api/DROP_TABLE_MALICIOSO',
            data=json.dumps(payload),
            content_type='application/json'
        )

        data = response.get_json()

        assert response.status_code == 403, \
            f"Procedure no permitido debe devolver 403, se obtuvo {response.status_code}"
        assert data['OSUCCESS'] == 0, \
            "Procedure no permitido, OSUCCESS debe ser 0"
        assert 'no permitido' in data.get('OMENSAJE', '').lower(), \
            "Debe indicar que el procedure no está permitido"

        print("✅ CP-003 Escenario 2: Procedure no permitido (403) — PASA")

    def test_sesion_get_sin_autenticacion(self, client):
        """
        Escenario 3: Consultar los datos de sesión sin estar logueado.
        
        Precondición : NO hay sesión de usuario activa.
        Datos entrada: GET /api/session
        
        Resultado esperado: HTTP 401, OSUCCESS=0.
        """
        response = client.get('/api/session')

        data = response.get_json()

        assert response.status_code == 401, \
            f"Sin sesión, /api/session debe devolver 401, se obtuvo {response.status_code}"
        assert data['OSUCCESS'] == 0
        assert 'No autenticado' in data.get('OMENSAJE', ''), \
            "Debe indicar que no está autenticado"

        print("✅ CP-003 Escenario 3: GET session sin autenticación (401) — PASA")

    @patch('app.call_procedure')
    def test_sesion_get_con_autenticacion(self, mock_proc, authenticated_client):
        """
        Escenario 4: Consultar datos de sesión estando autenticado.
        
        Precondición : Usuario autenticado como admin.
        Datos entrada: GET /api/session
        
        Resultado esperado: HTTP 200, datos del usuario.
        """
        response = authenticated_client.get('/api/session')

        data = response.get_json()

        assert response.status_code == 200, \
            f"Con sesión activa, se esperaba 200, se obtuvo {response.status_code}"
        assert data['OSUCCESS'] == 1
        assert data['data']['USERNAME'] == 'admin', \
            "Debe devolver los datos del usuario logueado"

        print("✅ CP-003 Escenario 4: GET session con autenticación — PASA")

    def test_login_permitido_sin_sesion(self, client):
        """
        Escenario 5: El login (vcrud=7) debe ser accesible SIN sesión.
        
        Precondición : NO hay sesión activa.
        Datos entrada: vcrud=7, username='admin', password_hash='123'
        
        Resultado esperado: NO retorna 401 (el login está exceptuado).
        """
        with patch('app.call_procedure') as mock_proc:
            mock_proc.return_value = []  # No importa el resultado, solo que no de 401

            payload = {
                'vcrud': 7,
                'username': 'admin',
                'password_hash': '123'
            }

            response = client.post(
                '/api/MECANICA_CRUD_TERCEROS',
                data=json.dumps(payload),
                content_type='application/json'
            )

            assert response.status_code != 401, \
                "El endpoint de login (vcrud=7) debe ser accesible sin sesión"

            print("✅ CP-003 Escenario 5: Login accesible sin sesión — PASA")


# ======================================================================
# CASO DE PRUEBA CP-004 (EXTRA): NAVEGACIÓN Y VISTAS
# ======================================================================
# Requerimiento : RF-NAV — Las rutas de navegación deben redirigir
#                 correctamente según el rol del usuario.
# Criterio ISO  : Usabilidad (Operabilidad)
# ======================================================================

class TestCP004_NavegacionVistas:
    """
    CP-004 (Extra): Verificar que las rutas de navegación
    responden correctamente según el estado de sesión.
    """

    def test_index_sin_sesion_muestra_login(self, client):
        """
        Sin sesión, la ruta '/' debe mostrar la página de login.
        """
        response = client.get('/')
        assert response.status_code == 200
        print("✅ CP-004 Escenario 1: Index sin sesión muestra login — PASA")

    def test_logout_redirige_a_index(self, authenticated_client):
        """
        La ruta '/logout' debe limpiar la sesión y redirigir a '/'.
        """
        response = authenticated_client.get('/logout', follow_redirects=False)
        assert response.status_code in [302, 301], \
            f"Logout debe redirigir, se obtuvo {response.status_code}"
        print("✅ CP-004 Escenario 2: Logout redirige a index — PASA")


# ======================================================================
# Ejecución directa (para capturas de pantalla)
# ======================================================================

if __name__ == '__main__':
    print("=" * 70)
    print("  PRUEBAS UNITARIAS — TALLER_ERP")
    print("  Sistema: ERP para Taller Mecánico")
    print("  Módulo: MECANICA_CRUD_TERCEROS + API REST")
    print(f"  Fecha : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    pytest.main([__file__, '-v', '--tb=short'])
