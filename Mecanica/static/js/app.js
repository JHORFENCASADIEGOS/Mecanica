// ==========================================
// APP.JS — Dashboard Admin Completo
// ==========================================
let currentView = null;
let currentData = [];
let editingId = null;

// ==========================================
// UTILIDADES
// ==========================================
async function apiCall(procedure, payload) {
    const res = await fetch(`/api/${procedure}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return await res.json();
}

// ==========================================
// CONFIGURACIÓN DE VISTAS
// ==========================================
const views = {
    dashboard: {
        title: 'Inicio',
        render: async () => {
            try {
                const [ordenes, materiales, terceros, estados] = await Promise.all([
                    apiCall('MECANICA_CRUD_ORDENES_TRABAJOS', { vcrud: 2 }),
                    apiCall('MECANICA_CRUD_MATERIAL', { vcrud: 2 }),
                    apiCall('MECANICA_CRUD_TERCEROS', { vcrud: 2 }),
                    apiCall('MECANICA_CRUD_SISTEMA', { vcrud: 2, tabla: 'ESTADOS_ORDEN' })
                ]);
                const ords = Array.isArray(ordenes) ? ordenes : [];
                const mats = Array.isArray(materiales) ? materiales : [];
                const ters = Array.isArray(terceros) ? terceros : [];
                const ests = Array.isArray(estados) ? estados : [];
                const activas = ords.filter(o => o.ESTADO !== 'Cerrada').length;
                const totalIngresos = ords.reduce((s, o) => s + Number(o.TOTAL || 0), 0);
                const saldoPend = ords.reduce((s, o) => s + Number(o.SALDO_PENDIENTE || 0), 0);
                const lowStock = mats.filter(m => m.STOCK !== null && m.STOCK < 5).length;

                // Contar órdenes por estado real
                const estadoColors = {
                    0: 'text-purple-400',
                    1: 'text-blue-400',
                    2: 'text-yellow-400',
                    3: 'text-emerald-400',
                    4: 'text-slate-400'
                };
                let estadosHTML = '';
                ests.forEach((e, i) => {
                    const cnt = ords.filter(o => o.ESTADO === e.NOMBRE).length;
                    const color = estadoColors[i] || 'text-white';
                    estadosHTML += `<div class="flex justify-between items-center py-1">
                        <span class="text-slate-400 text-sm">${e.NOMBRE}</span>
                        <span class="${color} font-bold text-sm">${cnt}</span>
                    </div>`;
                });
                if (ests.length === 0) {
                    estadosHTML = '<p class="text-slate-500 text-sm">No hay estados configurados</p>';
                }

                return `
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 animate-fade-in">
                    <div class="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 shadow-lg">
                        <div class="flex justify-between items-start">
                            <div><p class="text-sm font-medium text-slate-400">Órdenes Activas</p><h3 class="text-2xl font-bold text-white mt-1">${activas}</h3></div>
                            <div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400"><i class="fa-solid fa-wrench"></i></div>
                        </div>
                    </div>
                    <div class="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 shadow-lg">
                        <div class="flex justify-between items-start">
                            <div><p class="text-sm font-medium text-slate-400">Total Facturado</p><h3 class="text-2xl font-bold text-white mt-1">$${totalIngresos.toLocaleString('es-CO')}</h3></div>
                            <div class="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400"><i class="fa-solid fa-dollar-sign"></i></div>
                        </div>
                    </div>
                    <div class="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 shadow-lg">
                        <div class="flex justify-between items-start">
                            <div><p class="text-sm font-medium text-slate-400">Saldo Pendiente</p><h3 class="text-2xl font-bold text-white mt-1">$${saldoPend.toLocaleString('es-CO')}</h3></div>
                            <div class="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400"><i class="fa-solid fa-clock"></i></div>
                        </div>
                    </div>
                    <div class="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 shadow-lg">
                        <div class="flex justify-between items-start">
                            <div><p class="text-sm font-medium text-slate-400">Stock Bajo</p><h3 class="text-2xl font-bold text-white mt-1">${lowStock} items</h3></div>
                            <div class="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400"><i class="fa-solid fa-triangle-exclamation"></i></div>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    <div class="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 shadow-lg">
                        <h3 class="text-lg font-medium text-white mb-4"><i class="fa-solid fa-users mr-2 text-blue-400"></i>Resumen de Personas</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between"><span class="text-slate-400">Clientes</span><span class="text-white font-semibold">${ters.filter(t => t.ES_CLIENTE).length}</span></div>
                            <div class="flex justify-between"><span class="text-slate-400">Trabajadores</span><span class="text-white font-semibold">${ters.filter(t => t.ES_TRABAJADOR).length}</span></div>
                            <div class="flex justify-between"><span class="text-slate-400">Proveedores</span><span class="text-white font-semibold">${ters.filter(t => t.ES_PROVEEDOR).length}</span></div>
                        </div>
                    </div>
                    <div class="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 shadow-lg">
                        <h3 class="text-lg font-medium text-white mb-4"><i class="fa-solid fa-chart-pie mr-2 text-emerald-400"></i>Órdenes por Estado</h3>
                        <div class="space-y-2">
                            ${estadosHTML}
                        </div>
                    </div>
                </div>`;
            } catch (err) {
                return `<div class="p-4 bg-red-500/10 text-red-500 rounded-lg">Error cargando dashboard: ${err.message}</div>`;
            }
        }
    },
    terceros: {
        title: 'Clientes / Personal',
        procedure: 'MECANICA_CRUD_TERCEROS',
        idField: 'TERID',
        vcrud: { read: 2, create: 1, update: 4, delete: 5 },
        columns: ['TERID', 'DOCUMENTO', 'NOMBRE', 'TELEFONO', 'EMAIL', 'ES_CLIENTE', 'ES_TRABAJADOR'],
        labels: ['ID', 'Documento', 'Nombre', 'Teléfono', 'Email', 'Cliente', 'Trabajador'],
        formFields: [
            { name: 'documento', label: 'Documento ID', type: 'text', required: true },
            { name: 'nombre', label: 'Nombre Completo', type: 'text', required: true },
            { name: 'telefono', label: 'Teléfono', type: 'text' },
            { name: 'email', label: 'Correo Electrónico', type: 'email' },
            { name: 'es_cliente', label: '¿Es Cliente?', type: 'select', options: [{val:1,text:'Sí'},{val:0,text:'No'}] },
            { name: 'es_trabajador', label: '¿Es Trabajador?', type: 'select', options: [{val:1,text:'Sí'},{val:0,text:'No'}] },
            { name: 'es_proveedor', label: '¿Es Proveedor?', type: 'select', options: [{val:1,text:'Sí'},{val:0,text:'No'}] },
            { name: 'username', label: 'Usuario (login)', type: 'text', required: true, createOnly: true },
            { name: 'password_hash', label: 'Contraseña', type: 'password', required: true, createOnly: true }
        ]
    },
    vehiculos: {
        title: 'Vehículos Registrados',
        procedure: 'MECANICA_CRUD_VEHICULO',
        idField: 'VEHICULOID',
        vcrud: { read: 2, create: 1, update: 4, delete: 5 },
        columns: ['VEHICULOID', 'PROPIETARIO', 'PLACA', 'MARCA', 'MODELO', 'ANIO', 'COLOR'],
        labels: ['ID', 'Propietario', 'Placa', 'Marca', 'Modelo', 'Año', 'Color'],
        formFields: [
            { name: 'terid', label: 'Propietario', type: 'async_select', required: true,
              loader: async () => { const d = await apiCall('MECANICA_CRUD_TERCEROS', {vcrud:2}); return Array.isArray(d) ? d.map(t => ({val:t.TERID, text:`${t.NOMBRE} (${t.DOCUMENTO})`})) : []; } },
            { name: 'placa', label: 'Placa', type: 'text', required: true },
            { name: 'marca', label: 'Marca', type: 'text', required: true },
            { name: 'modelo', label: 'Modelo', type: 'text', required: true },
            { name: 'anio', label: 'Año', type: 'number', required: true, defaultValue: new Date().getFullYear() },
            { name: 'color', label: 'Color', type: 'text' }
        ]
    },
    materiales: {
        title: 'Catálogo de Repuestos y Servicios',
        procedure: 'MECANICA_CRUD_MATERIAL',
        idField: 'MATERIALID',
        vcrud: { read: 2, create: 1, update: 4, delete: 5 },
        columns: ['MATERIALID', 'TIPO_ARTICULO', 'NOMBRE', 'DESCRIPCION', 'PRECIO', 'STOCK'],
        labels: ['ID', 'Tipo', 'Nombre', 'Descripción', 'Precio', 'Stock'],
        formFields: [
            { name: 'tipoartid', label: 'Tipo de Artículo', type: 'async_select', required: true,
              loader: async () => { const d = await apiCall('MECANICA_CRUD_SISTEMA', {vcrud:2, tabla:'TIPOS_ARTICULO'}); return Array.isArray(d) ? d.map(t => ({val:t.TIPOARTID, text:t.NOMBRE})) : []; } },
            { name: 'nombre', label: 'Nombre', type: 'text', required: true },
            { name: 'descripcion', label: 'Descripción', type: 'text' },
            { name: 'precio', label: 'Precio', type: 'number', required: true },
            { name: 'stock', label: 'Stock Inicial (0 para servicios)', type: 'number', defaultValue: 0 }
        ]
    },
    ordenes: {
        title: 'Órdenes de Trabajo',
        procedure: 'MECANICA_CRUD_ORDENES_TRABAJOS',
        idField: 'ORDENID',
        vcrud: { read: 2, create: 1, update: 4, delete: 5 },
        columns: ['ORDENID', 'CLIENTE', 'TRABAJADOR', 'PLACA', 'ESTADO', 'TOTAL', 'SALDO_PENDIENTE'],
        labels: ['# Orden', 'Cliente', 'Trabajador', 'Placa', 'Estado', 'Total', 'Saldo'],
        formFields: [
            { name: 'cliente_terid', label: 'Cliente', type: 'async_select', required: true,
              loader: async () => { const d = await apiCall('MECANICA_CRUD_TERCEROS', {vcrud:2}); return Array.isArray(d) ? d.filter(t => t.ES_CLIENTE).map(t => ({val:t.TERID, text:`${t.NOMBRE} (${t.DOCUMENTO})`})) : []; } },
            { name: 'trabajador_terid', label: 'Trabajador Asignado', type: 'async_select',
              loader: async () => { const d = await apiCall('MECANICA_CRUD_TERCEROS', {vcrud:2}); return Array.isArray(d) ? d.filter(t => t.ES_TRABAJADOR).map(t => ({val:t.TERID, text:t.NOMBRE})) : []; } },
            { name: 'vehiculoid', label: 'Vehículo', type: 'async_select', required: true,
              loader: async () => { const d = await apiCall('MECANICA_CRUD_VEHICULO', {vcrud:2}); return Array.isArray(d) ? d.map(v => ({val:v.VEHICULOID, text:`${v.PLACA} — ${v.MARCA} ${v.MODELO} (${v.PROPIETARIO})`})) : []; } },
            { name: 'estadoid', label: 'Estado', type: 'async_select', required: true,
              loader: async () => { const d = await apiCall('MECANICA_CRUD_SISTEMA', {vcrud:2, tabla:'ESTADOS_ORDEN'}); return Array.isArray(d) ? d.map(e => ({val:e.ESTADOID, text:e.NOMBRE})) : []; } },
            { name: 'kilometraje_ingreso', label: 'Kilometraje', type: 'number' },
            { name: 'fecha_agendada', label: 'Fecha Agendada', type: 'datetime-local' },
            { name: 'observaciones', label: 'Observaciones', type: 'text' },
            { name: 'porcentaje_descuento', label: '% Descuento', type: 'number' }
        ],
        extraActions: true
    },
    inventario: {
        title: 'Movimientos de Inventario',
        procedure: 'MECANICA_CRUD_INVENTARIO',
        idField: 'MOVID',
        customLoad: async () => {
            // Cargar todos los materiales primero para listar sus movimientos
            const mats = await apiCall('MECANICA_CRUD_MATERIAL', { vcrud: 2 });
            if (!Array.isArray(mats) || mats.length === 0) return [];
            // Obtener movimientos de todos los materiales (simplificado: listar últimos de cada uno)
            // Usamos una consulta global: no hay vcrud para "todos", usaremos material a material
            let allMov = [];
            for (const m of mats.slice(0, 20)) { // Limitamos a 20 para rendimiento
                const mov = await apiCall('MECANICA_CRUD_INVENTARIO', { vcrud: 2, materialid: m.MATERIALID });
                if (Array.isArray(mov)) allMov = allMov.concat(mov);
            }
            return allMov.sort((a, b) => new Date(b.FECHA_MOVIMIENTO) - new Date(a.FECHA_MOVIMIENTO)).slice(0, 50);
        },
        vcrud: { create: 1, update: 4, delete: 5 },
        columns: ['MOVID', 'MATERIAL', 'TIPO_MOVIMIENTO', 'CANTIDAD', 'FECHA_MOVIMIENTO', 'MOTIVO'],
        labels: ['ID', 'Material', 'Tipo', 'Cantidad', 'Fecha', 'Motivo'],
        formFields: [
            { name: 'materialid', label: 'Material', type: 'async_select', required: true,
              loader: async () => { const d = await apiCall('MECANICA_CRUD_MATERIAL', {vcrud:2}); return Array.isArray(d) ? d.map(m => ({val:m.MATERIALID, text:`${m.NOMBRE} (Stock: ${m.STOCK ?? 'N/A'})`})) : []; } },
            { name: 'tipo_movimiento', label: 'Tipo', type: 'select', options: [{val:'ENTRADA',text:'Entrada'},{val:'SALIDA',text:'Salida'},{val:'AJUSTE',text:'Ajuste'}] },
            { name: 'cantidad', label: 'Cantidad', type: 'number', required: true },
            { name: 'motivo', label: 'Motivo', type: 'text' },
            { name: 'ordenid', label: 'ID Orden (opcional)', type: 'number' }
        ]
    },
    finanzas: {
        title: 'Finanzas / Transacciones',
        render: async () => {
            try {
                const ordenes = await apiCall('MECANICA_CRUD_ORDENES_TRABAJOS', { vcrud: 2 });
                const ords = Array.isArray(ordenes) ? ordenes : [];
                const conSaldo = ords.filter(o => Number(o.SALDO_PENDIENTE) > 0);

                let rows = '';
                for (const o of ords.slice(0, 30)) {
                    const txs = await apiCall('MECANICA_CRUD_TRANSACCIONES', { vcrud: 2, ordenid: o.ORDENID });
                    const pagos = Array.isArray(txs) ? txs : [];
                    const totalPagado = pagos.reduce((s, t) => s + Number(t.MONTO), 0);
                    rows += `
                    <tr class="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                        <td class="px-4 py-3 text-white font-medium">#${o.ORDENID}</td>
                        <td class="px-4 py-3">${o.CLIENTE}</td>
                        <td class="px-4 py-3 text-right">$${Number(o.TOTAL || 0).toLocaleString('es-CO')}</td>
                        <td class="px-4 py-3 text-right text-emerald-400">$${totalPagado.toLocaleString('es-CO')}</td>
                        <td class="px-4 py-3 text-right ${Number(o.SALDO_PENDIENTE) > 0 ? 'text-amber-400' : 'text-slate-400'}">$${Number(o.SALDO_PENDIENTE || 0).toLocaleString('es-CO')}</td>
                        <td class="px-4 py-3 text-right">
                            ${Number(o.SALDO_PENDIENTE) > 0 ? `<button onclick="openPaymentModal(${o.ORDENID}, ${o.SALDO_PENDIENTE})" class="text-sm text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1 rounded-lg transition-colors"><i class="fa-solid fa-dollar-sign mr-1"></i>Pago</button>` : '<span class="text-xs text-slate-500">Pagado</span>'}
                        </td>
                    </tr>`;
                }

                return `
                <div class="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden shadow-lg animate-fade-in">
                    <div class="p-5 border-b border-slate-700 flex justify-between items-center">
                        <h3 class="text-lg font-medium text-white">Pagos por Orden</h3>
                        <span class="text-sm text-amber-400"><i class="fa-solid fa-clock mr-1"></i>${conSaldo.length} con saldo pendiente</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead><tr class="bg-slate-850 border-b border-slate-700">
                                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Orden</th>
                                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Cliente</th>
                                <th class="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Total</th>
                                <th class="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Pagado</th>
                                <th class="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Saldo</th>
                                <th class="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Acción</th>
                            </tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>`;
            } catch (err) {
                return `<div class="p-4 bg-red-500/10 text-red-500 rounded-lg">Error: ${err.message}</div>`;
            }
        }
    },
    configuracion: {
        title: 'Configuración del Sistema',
        render: async () => {
            try {
                const [tipos, estados] = await Promise.all([
                    apiCall('MECANICA_CRUD_SISTEMA', { vcrud: 2, tabla: 'TIPOS_ARTICULO' }),
                    apiCall('MECANICA_CRUD_SISTEMA', { vcrud: 2, tabla: 'ESTADOS_ORDEN' })
                ]);
                const tiposList = Array.isArray(tipos) ? tipos : [];
                const estadosList = Array.isArray(estados) ? estados : [];

                return `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    <div class="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 shadow-lg">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-white font-medium"><i class="fa-solid fa-tags mr-2 text-blue-400"></i>Tipos de Artículo</h3>
                            <button onclick="openSysModal('TIPOS_ARTICULO')" class="text-sm text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1 rounded-lg transition-colors"><i class="fa-solid fa-plus mr-1"></i>Nuevo</button>
                        </div>
                        <div class="space-y-2">${tiposList.map(t => `
                            <div class="flex justify-between items-center p-2 rounded-lg bg-slate-900/50 border border-slate-700/30">
                                <span class="text-slate-300 text-sm">${t.NOMBRE}</span>
                                <div class="flex space-x-1">
                                    <button onclick="openSysModal('TIPOS_ARTICULO', ${t.TIPOARTID}, '${t.NOMBRE}')" class="text-blue-400 hover:bg-blue-500/10 p-1 rounded transition-colors"><i class="fa-solid fa-pen text-xs"></i></button>
                                    <button onclick="deleteSys('TIPOS_ARTICULO', ${t.TIPOARTID})" class="text-red-400 hover:bg-red-500/10 p-1 rounded transition-colors"><i class="fa-regular fa-trash-can text-xs"></i></button>
                                </div>
                            </div>`).join('')}
                        </div>
                    </div>
                    <div class="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 shadow-lg">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-white font-medium"><i class="fa-solid fa-list-check mr-2 text-emerald-400"></i>Estados de Orden</h3>
                            <button onclick="openSysModal('ESTADOS_ORDEN')" class="text-sm text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-lg transition-colors"><i class="fa-solid fa-plus mr-1"></i>Nuevo</button>
                        </div>
                        <div class="space-y-2">${estadosList.map(e => `
                            <div class="flex justify-between items-center p-2 rounded-lg bg-slate-900/50 border border-slate-700/30">
                                <span class="text-slate-300 text-sm">${e.NOMBRE}</span>
                                <div class="flex space-x-1">
                                    <button onclick="openSysModal('ESTADOS_ORDEN', ${e.ESTADOID}, '${e.NOMBRE}')" class="text-blue-400 hover:bg-blue-500/10 p-1 rounded transition-colors"><i class="fa-solid fa-pen text-xs"></i></button>
                                    <button onclick="deleteSys('ESTADOS_ORDEN', ${e.ESTADOID})" class="text-red-400 hover:bg-red-500/10 p-1 rounded transition-colors"><i class="fa-regular fa-trash-can text-xs"></i></button>
                                </div>
                            </div>`).join('')}
                        </div>
                    </div>
                </div>`;
            } catch (err) {
                return `<div class="p-4 bg-red-500/10 text-red-500 rounded-lg">Error: ${err.message}</div>`;
            }
        }
    }
};

// ==========================================
// CARGADOR CENTRAL DE VISTAS
// ==========================================
async function loadView(viewId, element = null) {
    const config = views[viewId];
    if (!config) return;
    currentView = viewId;

    if (element) {
        document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
        element.classList.add('active');
    }

    document.getElementById('page-title').textContent = config.title;
    const container = document.getElementById('view-container');
    const loader = document.getElementById('loader');
    container.innerHTML = '';
    loader.classList.remove('hidden');

    try {
        if (config.render) {
            container.innerHTML = await config.render();
        } else if (config.customLoad) {
            currentData = await config.customLoad();
            container.innerHTML = generateTableHTML(config, currentData);
        } else {
            const res = await apiCall(config.procedure, { vcrud: config.vcrud.read });
            currentData = Array.isArray(res) ? res : [];
            container.innerHTML = generateTableHTML(config, currentData);
        }
    } catch (err) {
        container.innerHTML = `<div class="p-4 bg-red-500/10 text-red-500 rounded-lg">Error cargando ${viewId}: ${err.message}</div>`;
    } finally {
        loader.classList.add('hidden');
    }
}

// ==========================================
// GENERADOR DE TABLAS
// ==========================================
function generateTableHTML(config, data) {
    if (!Array.isArray(data)) return `<div class="p-4 bg-red-500/10 text-red-500 rounded-lg">${data.OMENSAJE || 'Error de datos'}</div>`;

    let thead = '<tr class="bg-slate-850 border-b border-slate-700">';
    config.labels.forEach(lbl => { thead += `<th class="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase">${lbl}</th>`; });
    thead += '<th class="px-4 py-3 text-right">Acciones</th></tr>';

    let tbody = '';
    if (data.length === 0) {
        tbody = `<tr><td colspan="${config.columns.length + 1}" class="px-6 py-8 text-center text-slate-500">No hay registros</td></tr>`;
    } else {
        data.forEach((row, idx) => {
            tbody += '<tr class="hover:bg-slate-700/30 border-b border-slate-700/50 transition-colors">';
            config.columns.forEach(col => {
                let val = row[col] !== null && row[col] !== undefined ? row[col] : '-';
                // Format booleans
                if (val === 1 || val === true) val = '<span class="text-emerald-400 text-xs">✓ Sí</span>';
                else if (val === 0 || val === false) val = '<span class="text-slate-500 text-xs">✗ No</span>';
                tbody += `<td class="px-4 py-3 whitespace-nowrap text-sm text-slate-300">${val}</td>`;
            });

            const recordId = row[config.idField];
            let extraBtns = '';
            if (config.extraActions && currentView === 'ordenes') {
                extraBtns = `<button onclick="openOrderDetails(${recordId})" class="text-blue-400 hover:text-blue-300 mr-2 px-2 py-1 rounded-md hover:bg-blue-500/10 transition-colors" title="Ver/Agregar Detalles"><i class="fa-solid fa-list-check"></i></button><button onclick="openPaymentModal(${recordId}, ${row.SALDO_PENDIENTE || 0})" class="text-emerald-400 hover:text-emerald-300 mr-2 px-2 py-1 rounded-md hover:bg-emerald-500/10 transition-colors" title="Registrar Pago"><i class="fa-solid fa-dollar-sign"></i></button>`;
            }
            tbody += `
            <td class="px-4 py-3 whitespace-nowrap text-right text-sm">
                ${extraBtns}
                <button onclick="openModal(${idx})" class="text-blue-400 hover:text-blue-300 mr-2 px-2 py-1 rounded-md hover:bg-blue-500/10 transition-colors" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteRecord(${recordId})" class="text-red-400 hover:text-red-300 px-2 py-1 rounded-md hover:bg-red-500/10 transition-colors" title="Eliminar"><i class="fa-regular fa-trash-can"></i></button>
            </td></tr>`;
        });
    }

    return `
    <div class="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg mt-4 animate-fade-in">
        <div class="p-5 border-b border-slate-700 flex justify-between items-center">
            <h3 class="text-lg font-medium text-white">${config.title}</h3>
            <button onclick="openModal()" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20">
                <i class="fa-solid fa-plus mr-2"></i>Nuevo Registro
            </button>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full"><thead>${thead}</thead><tbody>${tbody}</tbody></table>
        </div>
    </div>`;
}

// ==========================================
// MODALES (FORMULARIOS CRUD)
// ==========================================
async function openModal(dataIndex = null) {
    const config = views[currentView];
    if (!config || !config.formFields) return;

    editingId = null;
    let rowData = null;
    if (dataIndex !== null) {
        rowData = currentData[dataIndex];
        editingId = rowData[config.idField];
        document.getElementById('modal-title').textContent = `Editar #${editingId}`;
    } else {
        document.getElementById('modal-title').textContent = 'Nuevo Registro';
    }

    const alertBox = document.getElementById('modal-alert');
    alertBox.classList.add('hidden');
    const fieldsContainer = document.getElementById('form-fields');
    fieldsContainer.innerHTML = '<div class="text-center py-4 text-slate-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Cargando formulario...</div>';
    document.getElementById('global-modal').classList.remove('hidden');

    // Pre-cargar opciones de selects dinámicos
    const asyncLoads = {};
    for (const field of config.formFields) {
        if (field.type === 'async_select' && field.loader) {
            asyncLoads[field.name] = await field.loader();
        }
    }

    fieldsContainer.innerHTML = '';
    const inputClass = 'w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500';

    config.formFields.forEach(field => {
        if (field.createOnly && editingId) return;
        let val = rowData && rowData[field.name.toUpperCase()] !== undefined ? rowData[field.name.toUpperCase()] : '';
        if (val === '' && field.defaultValue !== undefined) val = field.defaultValue;

        // Convertir fecha de cualquier formato a formato input datetime-local ('2026-03-14T10:00')
        if (field.type === 'datetime-local' && val) {
            try {
                const d = new Date(val);
                if (!isNaN(d.getTime())) {
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    const hh = String(d.getHours()).padStart(2, '0');
                    const mi = String(d.getMinutes()).padStart(2, '0');
                    val = `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
                }
            } catch { }
        }

        let inputHtml = '';
        if (field.type === 'select') {
            let opts = field.options.map(o => `<option value="${o.val}" ${String(val) === String(o.val) ? 'selected' : ''}>${o.text}</option>`).join('');
            inputHtml = `<select id="field_${field.name}" ${field.required ? 'required' : ''} class="${inputClass}"><option value="">Seleccione...</option>${opts}</select>`;
        } else if (field.type === 'async_select') {
            const options = asyncLoads[field.name] || [];
            let opts = options.map(o => `<option value="${o.val}" ${String(val) === String(o.val) ? 'selected' : ''}>${o.text}</option>`).join('');
            inputHtml = `<select id="field_${field.name}" ${field.required ? 'required' : ''} class="${inputClass}"><option value="">— Seleccione —</option>${opts}</select>`;
        } else {
            inputHtml = `<input type="${field.type}" id="field_${field.name}" value="${val}" ${field.required ? 'required' : ''} class="${inputClass}">`;
        }
        fieldsContainer.innerHTML += `<div><label class="block text-sm font-medium text-slate-400 mb-1">${field.label}</label>${inputHtml}</div>`;
    });
}

function closeModal() {
    document.getElementById('global-modal').classList.add('hidden');
    // Si estábamos viendo detalles de orden, refrescar la tabla
    if (detailOrdenId) {
        detailOrdenId = null;
        document.getElementById('dynamic-form').onsubmit = handleFormSubmit;
        loadView(currentView);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const config = views[currentView];
    const submitBtn = document.getElementById('btn-save');
    const alertBox = document.getElementById('modal-alert');
    let payload = {};

    if (editingId) {
        payload.vcrud = config.vcrud.update;
        payload[config.idField.toLowerCase()] = editingId;
    } else {
        payload.vcrud = config.vcrud.create;
    }

    config.formFields.forEach(field => {
        if (field.createOnly && editingId) return;
        let val = document.getElementById(`field_${field.name}`).value;
        if (field.type === 'number') val = val ? parseFloat(val) : 0;
        else if (field.type === 'select' || field.type === 'async_select') val = val !== '' ? (isNaN(val) ? val : parseInt(val)) : null;
        else if (field.type === 'datetime-local') val = val || new Date().toISOString().slice(0, 16);
        else val = val || '';
        payload[field.name] = val;
    });

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Guardando...';

    try {
        // Separar username/password del payload del tercero
        const username = payload.username;
        const password = payload.password_hash;
        delete payload.username;
        delete payload.password_hash;

        const data = await apiCall(config.procedure, payload);
        alertBox.classList.remove('hidden', 'bg-red-500/10', 'text-red-500', 'bg-emerald-500/10', 'text-emerald-500');
        if (data.OSUCCESS === 1) {
            // Si es creación de tercero Y tiene usuario, crear el usuario también
            if (!editingId && currentView === 'terceros' && username && password && data.TERID) {
                const userRes = await apiCall('MECANICA_CRUD_TERCEROS', {
                    vcrud: 6,
                    terid: data.TERID,
                    username: username,
                    password_hash: password
                });
                if (userRes.OSUCCESS === 1) {
                    alertBox.classList.add('bg-emerald-500/10', 'text-emerald-500');
                    alertBox.textContent = `Tercero y usuario creados exitosamente.`;
                } else {
                    alertBox.classList.add('bg-amber-500/10', 'text-amber-400');
                    alertBox.textContent = `Tercero creado, pero error al crear usuario: ${userRes.OMENSAJE}`;
                }
            } else {
                alertBox.classList.add('bg-emerald-500/10', 'text-emerald-500');
                alertBox.textContent = data.OMENSAJE || 'Guardado exitosamente.';
            }
            setTimeout(() => { closeModal(); loadView(currentView); }, 1200);
        } else {
            alertBox.classList.add('bg-red-500/10', 'text-red-500');
            alertBox.textContent = data.OMENSAJE || 'Error al guardar.';
        }
    } catch (err) {
        alertBox.classList.remove('hidden');
        alertBox.classList.add('bg-red-500/10', 'text-red-500');
        alertBox.textContent = 'Error de conexión';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i>Guardar Cambios';
    }
}

async function deleteRecord(id) {
    if (!confirm(`¿Eliminar el registro #${id}?`)) return;
    const config = views[currentView];
    let payload = { vcrud: config.vcrud.delete };
    payload[config.idField.toLowerCase()] = id;
    try {
        const data = await apiCall(config.procedure, payload);
        if (data.OSUCCESS === 1) loadView(currentView);
        else alert(data.OMENSAJE || 'No se pudo eliminar');
    } catch { alert('Error de conexión'); }
}

// ==========================================
// REGISTRAR PAGO (ADMIN — Efectivo/Tarjeta)
// ==========================================
function openPaymentModal(ordenId, saldoPendiente) {
    document.getElementById('modal-title').textContent = `Registrar Pago — Orden #${ordenId}`;
    const alertBox = document.getElementById('modal-alert');
    alertBox.classList.add('hidden');

    document.getElementById('form-fields').innerHTML = `
        <div class="bg-slate-900/50 rounded-lg p-3 mb-4 flex justify-between">
            <span class="text-slate-400 text-sm">Saldo Pendiente</span>
            <span class="text-amber-400 font-bold">$${Number(saldoPendiente).toLocaleString('es-CO')}</span>
        </div>
        <div><label class="block text-sm font-medium text-slate-400 mb-1">Monto del Pago</label>
            <input type="number" id="field_monto" step="0.01" max="${saldoPendiente}" required class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="0.00">
        </div>
        <div><label class="block text-sm font-medium text-slate-400 mb-1">Método de Pago</label>
            <select id="field_metodo" required class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="Efectivo">💵 Efectivo</option>
                <option value="Tarjeta">💳 Tarjeta (Presencial)</option>
            </select>
        </div>
        <div><label class="block text-sm font-medium text-slate-400 mb-1">Referencia (opcional)</label>
            <input type="text" id="field_referencia" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500" placeholder="No. recibo, voucher...">
        </div>
        <input type="hidden" id="field_payment_ordenid" value="${ordenId}">
    `;

    // Override the form submission for payment
    const form = document.getElementById('dynamic-form');
    form.onsubmit = (e) => handlePaymentSubmit(e);
    document.getElementById('global-modal').classList.remove('hidden');
}

async function handlePaymentSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('btn-save');
    const alertBox = document.getElementById('modal-alert');
    const ordenid = parseInt(document.getElementById('field_payment_ordenid').value);
    const monto = parseFloat(document.getElementById('field_monto').value);
    const metodo = document.getElementById('field_metodo').value;
    const referencia = document.getElementById('field_referencia').value || null;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Procesando...';

    try {
        const data = await apiCall('MECANICA_CRUD_TRANSACCIONES', {
            vcrud: 1,
            ordenid: ordenid,
            monto: monto,
            metodo_pago: metodo,
            origen: 'Fisico',
            referencia: referencia
        });

        alertBox.classList.remove('hidden', 'bg-red-500/10', 'text-red-500', 'bg-emerald-500/10', 'text-emerald-500');
        if (data.OSUCCESS === 1) {
            alertBox.classList.add('bg-emerald-500/10', 'text-emerald-500');
            alertBox.textContent = data.OMENSAJE + ` — Saldo restante: $${Number(data.SALDO_PENDIENTE).toLocaleString('es-CO')}`;
            setTimeout(() => { closeModal(); loadView(currentView); }, 1500);
        } else {
            alertBox.classList.add('bg-red-500/10', 'text-red-500');
            alertBox.textContent = data.OMENSAJE || 'Error al registrar pago';
        }
    } catch {
        alertBox.classList.remove('hidden');
        alertBox.classList.add('bg-red-500/10', 'text-red-500');
        alertBox.textContent = 'Error de conexión';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i>Guardar Cambios';
        // Restore original handler
        document.getElementById('dynamic-form').onsubmit = handleFormSubmit;
    }
}

// ==========================================
// CONFIGURACIÓN DEL SISTEMA (SYS)
// ==========================================
function openSysModal(tabla, id = null, nombre = '') {
    document.getElementById('modal-title').textContent = id ? `Editar ${tabla}` : `Nuevo ${tabla}`;
    const alertBox = document.getElementById('modal-alert');
    alertBox.classList.add('hidden');

    document.getElementById('form-fields').innerHTML = `
        <div><label class="block text-sm font-medium text-slate-400 mb-1">Nombre</label>
            <input type="text" id="field_sys_nombre" value="${nombre}" required class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none">
        </div>
        <input type="hidden" id="field_sys_tabla" value="${tabla}">
        <input type="hidden" id="field_sys_id" value="${id || ''}">
    `;

    document.getElementById('dynamic-form').onsubmit = handleSysSubmit;
    document.getElementById('global-modal').classList.remove('hidden');
}

async function handleSysSubmit(e) {
    e.preventDefault();
    const alertBox = document.getElementById('modal-alert');
    const submitBtn = document.getElementById('btn-save');
    const tabla = document.getElementById('field_sys_tabla').value;
    const id = document.getElementById('field_sys_id').value;
    const nombre = document.getElementById('field_sys_nombre').value;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Guardando...';

    try {
        const payload = { tabla, nombre };
        if (id) { payload.vcrud = 4; payload.id = parseInt(id); }
        else { payload.vcrud = 1; }

        const data = await apiCall('MECANICA_CRUD_SISTEMA', payload);
        alertBox.classList.remove('hidden', 'bg-red-500/10', 'text-red-500', 'bg-emerald-500/10', 'text-emerald-500');
        if (data.OSUCCESS === 1) {
            alertBox.classList.add('bg-emerald-500/10', 'text-emerald-500');
            alertBox.textContent = data.OMENSAJE;
            setTimeout(() => { closeModal(); loadView('configuracion'); }, 800);
        } else {
            alertBox.classList.add('bg-red-500/10', 'text-red-500');
            alertBox.textContent = data.OMENSAJE;
        }
    } catch {
        alertBox.classList.remove('hidden'); alertBox.classList.add('bg-red-500/10', 'text-red-500');
        alertBox.textContent = 'Error de conexión';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i>Guardar Cambios';
        document.getElementById('dynamic-form').onsubmit = handleFormSubmit;
    }
}

async function deleteSys(tabla, id) {
    if (!confirm('¿Eliminar este registro del sistema?')) return;
    try {
        const data = await apiCall('MECANICA_CRUD_SISTEMA', { vcrud: 5, tabla, id });
        if (data.OSUCCESS === 1) loadView('configuracion');
        else alert(data.OMENSAJE);
    } catch { alert('Error de conexión'); }
}

// ==========================================
// DETALLES DE ORDEN (Admin)
// ==========================================
let detailOrdenId = null;

async function openOrderDetails(ordenId) {
    detailOrdenId = ordenId;
    document.getElementById('modal-title').textContent = `Detalles — Orden #${ordenId}`;
    const alertBox = document.getElementById('modal-alert');
    alertBox.classList.add('hidden');
    const fieldsContainer = document.getElementById('form-fields');
    fieldsContainer.innerHTML = '<div class="text-center py-4 text-slate-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Cargando detalles...</div>';
    document.getElementById('global-modal').classList.remove('hidden');

    // Cargar detalles y materiales en paralelo
    const [detalles, materiales] = await Promise.all([
        apiCall('MECANICA_CRUD_ORDEN_DETALLES', { vcrud: 2, ordenid: ordenId }),
        apiCall('MECANICA_CRUD_MATERIAL', { vcrud: 2 })
    ]);

    const dets = Array.isArray(detalles) ? detalles : [];
    const mats = Array.isArray(materiales) ? materiales : [];
    const total = dets.reduce((s, d) => s + Number(d.SUBTOTAL || 0), 0);

    let detallesHTML = '';
    if (dets.length > 0) {
        detallesHTML = `
        <table class="w-full text-sm mb-4">
            <thead><tr class="border-b border-slate-700 text-slate-400">
                <th class="py-2 text-left">Material</th>
                <th class="py-2 text-right">Cant.</th>
                <th class="py-2 text-right">P.Unit</th>
                <th class="py-2 text-right">Subtotal</th>
                <th class="py-2 text-right"></th>
            </tr></thead>
            <tbody>${dets.map(d => `
                <tr class="border-b border-slate-700/30">
                    <td class="py-2 text-white">${d.MATERIAL}</td>
                    <td class="py-2 text-right text-slate-300">${d.CANTIDAD}</td>
                    <td class="py-2 text-right text-slate-300">$${Number(d.VALOR_UNITARIO || 0).toLocaleString('es-CO')}</td>
                    <td class="py-2 text-right text-emerald-400">$${Number(d.SUBTOTAL || 0).toLocaleString('es-CO')}</td>
                    <td class="py-2 text-right"><button onclick="deleteOrderDetail(${d.DETALLEID})" class="text-red-400 hover:text-red-300 px-1"><i class="fa-regular fa-trash-can text-xs"></i></button></td>
                </tr>`).join('')}
            </tbody>
        </table>
        <div class="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg mb-4">
            <span class="text-sm text-slate-400">Total de la orden</span>
            <span class="text-lg font-bold text-white">$${total.toLocaleString('es-CO')}</span>
        </div>`;
    } else {
        detallesHTML = '<p class="text-slate-500 text-sm mb-4">No hay items en esta orden. Agrega materiales o servicios abajo.</p>';
    }

    let matOptions = mats.map(m => `<option value="${m.MATERIALID}" data-precio="${m.PRECIO}">${m.NOMBRE} — $${Number(m.PRECIO).toLocaleString('es-CO')}</option>`).join('');

    const inputClass = 'w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none';
    fieldsContainer.innerHTML = `
        ${detallesHTML}
        <div class="border-t border-slate-700 pt-4">
            <h4 class="text-sm font-semibold text-blue-400 mb-3"><i class="fa-solid fa-plus mr-1"></i>Agregar Item</h4>
            <div class="space-y-3">
                <div>
                    <label class="block text-sm text-slate-400 mb-1">Material / Servicio</label>
                    <select id="det-material" class="${inputClass}" onchange="updateDetPrice()">
                        <option value="">— Seleccione —</option>${matOptions}
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm text-slate-400 mb-1">Cantidad</label>
                        <input type="number" id="det-cantidad" value="1" min="1" class="${inputClass}">
                    </div>
                    <div>
                        <label class="block text-sm text-slate-400 mb-1">Precio Unitario</label>
                        <input type="number" id="det-precio" step="0.01" class="${inputClass}" readonly>
                    </div>
                </div>
                <button onclick="addOrderDetail()" class="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
                    <i class="fa-solid fa-plus mr-1"></i>Agregar a la Orden
                </button>
            </div>
        </div>`;

    // Override form submit to prevent default behavior
    document.getElementById('dynamic-form').onsubmit = (e) => { e.preventDefault(); };
}

function updateDetPrice() {
    const sel = document.getElementById('det-material');
    const opt = sel.options[sel.selectedIndex];
    const precio = opt && opt.dataset.precio ? opt.dataset.precio : 0;
    document.getElementById('det-precio').value = precio;
}

async function addOrderDetail() {
    const materialid = document.getElementById('det-material').value;
    const cantidad = parseInt(document.getElementById('det-cantidad').value) || 1;
    const precio = parseFloat(document.getElementById('det-precio').value) || 0;

    if (!materialid) { alert('Selecciona un material o servicio'); return; }

    const alertBox = document.getElementById('modal-alert');
    try {
        const res = await apiCall('MECANICA_CRUD_ORDEN_DETALLES', {
            vcrud: 1,
            ordenid: detailOrdenId,
            materialid: parseInt(materialid),
            cantidad: cantidad,
            valor_unitario: precio,
            porcentaje_descuento: 0
        });
        console.log('addOrderDetail response:', res);
        // La respuesta puede ser un objeto con OSUCCESS o un array
        const data = Array.isArray(res) ? (res[0] || {}) : res;
        const success = data.OSUCCESS === 1 || data.OSUCCESS === '1';

        alertBox.className = 'mb-4 p-3 rounded-lg text-sm text-center';
        alertBox.classList.remove('hidden');
        if (success || !data.OMENSAJE) {
            alertBox.classList.add('bg-emerald-500/10', 'text-emerald-400');
            alertBox.textContent = data.OMENSAJE || 'Item agregado correctamente';
            // Recargar detalles en el modal
            setTimeout(() => openOrderDetails(detailOrdenId), 500);
        } else {
            alertBox.classList.add('bg-red-500/10', 'text-red-400');
            alertBox.textContent = data.OMENSAJE || 'Error al agregar';
        }
    } catch (err) {
        console.error('addOrderDetail error:', err);
        alertBox.className = 'mb-4 p-3 rounded-lg text-sm text-center bg-red-500/10 text-red-400';
        alertBox.classList.remove('hidden');
        alertBox.textContent = 'Error de conexión: ' + err.message;
    }
}

async function deleteOrderDetail(detalleId) {
    if (!confirm('¿Eliminar este item de la orden?')) return;
    try {
        const data = await apiCall('MECANICA_CRUD_ORDEN_DETALLES', { vcrud: 5, detalleid: detalleId });
        if (data.OSUCCESS === 1) {
            await openOrderDetails(detailOrdenId); // Recargar
        } else {
            alert(data.OMENSAJE || 'Error al eliminar');
        }
    } catch { alert('Error de conexión'); }
}
