// ==========================================
// TRABAJADOR.JS — Portal del Trabajador
// ==========================================

let workerOrders = [];
let allEstados = [];
let selectedOrderId = null;

// Obtener datos del usuario logueado desde la sesión Flask
async function getSession() {
    try {
        const res = await fetch('/api/session');
        return (await res.json()).data;
    } catch { return null; }
}

// Llamada genérica a la API
async function apiCall(procedure, payload) {
    const res = await fetch(`/api/${procedure}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return await res.json();
}

// Colores para estados
function getStatusColor(estado) {
    const map = {
        'Agendada App': 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
        'En Taller': 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
        'En Reparacion': 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
        'Lista Para Entrega': 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
        'Cerrada': 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
    };
    return map[estado] || 'bg-slate-500/15 text-slate-400 border border-slate-500/30';
}

// ==========================================
// CARGAR ÓRDENES DEL TRABAJADOR
// ==========================================
async function loadWorkerOrders(el) {
    if (el) {
        document.querySelectorAll('.sidebar-item').forEach(e => e.classList.remove('active'));
        el.classList.add('active');
    }

    const container = document.getElementById('view-container');
    const loader = document.getElementById('loader');
    container.innerHTML = '';
    loader.classList.remove('hidden');

    try {
        const user = await getSession();
        if (!user) { window.location.href = '/'; return; }

        // Cargar estados disponibles
        const estadosRes = await apiCall('MECANICA_CRUD_SISTEMA', { vcrud: 2, tabla: 'ESTADOS_ORDEN' });
        if (Array.isArray(estadosRes)) allEstados = estadosRes;

        // Cargar órdenes asignadas al trabajador
        const data = await apiCall('MECANICA_CRUD_ORDENES_TRABAJOS', {
            vcrud: 8,
            trabajador_terid: user.TERID
        });
        workerOrders = Array.isArray(data) ? data : [];

        renderOrders();
    } catch (err) {
        container.innerHTML = `<div class="p-4 bg-red-500/10 text-red-500 rounded-lg">Error cargando órdenes: ${err.message}</div>`;
    } finally {
        loader.classList.add('hidden');
    }
}

function renderOrders() {
    const container = document.getElementById('view-container');

    if (workerOrders.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16 animate-fade-in">
                <div class="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                    <i class="fa-solid fa-clipboard-check text-3xl text-yellow-400"></i>
                </div>
                <h3 class="text-lg font-medium text-white mb-2">No tienes órdenes asignadas</h3>
                <p class="text-sm text-slate-500">Cuando te asignen una orden de trabajo, aparecerá aquí.</p>
            </div>`;
        return;
    }

    let cards = '';
    workerOrders.forEach((order, idx) => {
        const statusClasses = getStatusColor(order.ESTADO);
        cards += `
        <div class="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 shadow-lg hover:border-slate-600/50 transition-all animate-fade-in">
            <div class="flex items-start justify-between mb-3">
                <div>
                    <h4 class="text-white font-semibold text-base">Orden #${order.ORDENID}</h4>
                    <p class="text-slate-400 text-sm mt-0.5"><i class="fa-solid fa-user mr-1"></i>${order.CLIENTE}</p>
                </div>
                <span class="status-badge ${statusClasses}">${order.ESTADO}</span>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div class="flex items-center text-slate-400">
                    <i class="fa-solid fa-car w-5 text-slate-500"></i>
                    <span>${order.PLACA} — ${order.MARCA} ${order.MODELO}</span>
                </div>
                <div class="flex items-center text-slate-400">
                    <i class="fa-solid fa-calendar w-5 text-slate-500"></i>
                    <span>${order.FECHA_AGENDADA ? new Date(order.FECHA_AGENDADA).toLocaleDateString('es-CO') : 'Sin agendar'}</span>
                </div>
                <div class="flex items-center text-slate-400">
                    <i class="fa-solid fa-tachometer-alt w-5 text-slate-500"></i>
                    <span>${order.KILOMETRAJE_INGRESO || '-'} km</span>
                </div>
                <div class="flex items-center text-slate-400">
                    <i class="fa-solid fa-dollar-sign w-5 text-slate-500"></i>
                    <span>$${Number(order.TOTAL || 0).toLocaleString('es-CO')}</span>
                </div>
            </div>
            <div class="flex space-x-2">
                <button onclick="openStatusModal(${idx})" class="flex-1 px-3 py-2 text-sm font-medium text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg transition-colors">
                    <i class="fa-solid fa-exchange-alt mr-1"></i>Cambiar Estado
                </button>
                <button onclick="viewOrderDetail(${idx})" class="flex-1 px-3 py-2 text-sm font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors">
                    <i class="fa-solid fa-eye mr-1"></i>Ver Detalles
                </button>
            </div>
        </div>`;
    });

    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <div>
                <h3 class="text-xl font-semibold text-white">Mis Órdenes Asignadas</h3>
                <p class="text-sm text-slate-500 mt-1">${workerOrders.length} orden(es) en total</p>
            </div>
            <button onclick="loadWorkerOrders()" class="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors">
                <i class="fa-solid fa-rotate mr-1"></i>Actualizar
            </button>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">${cards}</div>`;
}

// ==========================================
// CAMBIAR ESTADO
// ==========================================
function openStatusModal(idx) {
    const order = workerOrders[idx];
    selectedOrderId = order.ORDENID;
    document.getElementById('status-modal-order').textContent = `Orden #${order.ORDENID} — ${order.CLIENTE} (${order.PLACA})`;
    
    const select = document.getElementById('new-status');
    select.innerHTML = '';
    allEstados.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.ESTADOID;
        opt.textContent = e.NOMBRE;
        if (e.ESTADOID === order.ESTADOID) opt.selected = true;
        select.appendChild(opt);
    });

    document.getElementById('status-alert').classList.add('hidden');
    document.getElementById('status-modal').classList.remove('hidden');
}

function closeStatusModal() {
    document.getElementById('status-modal').classList.add('hidden');
    selectedOrderId = null;
}

async function saveStatus() {
    if (!selectedOrderId) return;
    const btn = document.getElementById('btn-save-status');
    const alert = document.getElementById('status-alert');
    const newEstado = document.getElementById('new-status').value;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>Guardando...';

    try {
        const data = await apiCall('MECANICA_CRUD_ORDENES_TRABAJOS', {
            vcrud: 6,
            ordenid: selectedOrderId,
            estadoid: parseInt(newEstado)
        });

        alert.classList.remove('hidden', 'bg-red-500/10', 'text-red-400', 'bg-emerald-500/10', 'text-emerald-400');
        if (data.OSUCCESS === 1) {
            alert.classList.add('bg-emerald-500/10', 'text-emerald-400');
            alert.textContent = '¡Estado actualizado!';
            setTimeout(() => { closeStatusModal(); loadWorkerOrders(); }, 800);
        } else {
            alert.classList.add('bg-red-500/10', 'text-red-400');
            alert.textContent = data.OMENSAJE || 'Error al actualizar';
        }
    } catch (err) {
        alert.classList.remove('hidden');
        alert.classList.add('bg-red-500/10', 'text-red-400');
        alert.textContent = 'Error de conexión';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i>Actualizar';
    }
}

// ==========================================
// VER DETALLES DE ORDEN
// ==========================================
async function viewOrderDetail(idx) {
    const order = workerOrders[idx];
    document.getElementById('detail-title').textContent = `Orden #${order.ORDENID} — Detalles`;
    const body = document.getElementById('detail-body');
    body.innerHTML = '<div class="text-center py-8"><i class="fa-solid fa-spinner fa-spin text-2xl text-yellow-400"></i></div>';
    document.getElementById('detail-modal').classList.remove('hidden');

    try {
        const detalles = await apiCall('MECANICA_CRUD_ORDEN_DETALLES', { vcrud: 2, ordenid: order.ORDENID });
        let detallesHTML = '';
        if (Array.isArray(detalles) && detalles.length > 0) {
            detallesHTML = `
            <table class="w-full text-sm mt-4">
                <thead><tr class="border-b border-slate-700 text-slate-400">
                    <th class="py-2 text-left">Material/Servicio</th>
                    <th class="py-2 text-left">Tipo</th>
                    <th class="py-2 text-right">Cant.</th>
                    <th class="py-2 text-right">Subtotal</th>
                </tr></thead>
                <tbody>${detalles.map(d => `
                    <tr class="border-b border-slate-700/50">
                        <td class="py-2 text-white">${d.MATERIAL}</td>
                        <td class="py-2 text-slate-400">${d.TIPO_ARTICULO}</td>
                        <td class="py-2 text-right text-slate-300">${d.CANTIDAD}</td>
                        <td class="py-2 text-right text-emerald-400">$${Number(d.SUBTOTAL || 0).toLocaleString('es-CO')}</td>
                    </tr>`).join('')}
                </tbody>
            </table>`;
        } else {
            detallesHTML = '<p class="text-slate-500 text-sm mt-4">No hay materiales/servicios registrados aún.</p>';
        }

        body.innerHTML = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-slate-900/50 rounded-lg p-3">
                    <p class="text-xs text-slate-500 mb-1">Cliente</p>
                    <p class="text-white text-sm font-medium">${order.CLIENTE}</p>
                </div>
                <div class="bg-slate-900/50 rounded-lg p-3">
                    <p class="text-xs text-slate-500 mb-1">Estado</p>
                    <span class="status-badge ${getStatusColor(order.ESTADO)}">${order.ESTADO}</span>
                </div>
                <div class="bg-slate-900/50 rounded-lg p-3">
                    <p class="text-xs text-slate-500 mb-1">Vehículo</p>
                    <p class="text-white text-sm">${order.MARCA} ${order.MODELO} — ${order.PLACA}</p>
                </div>
                <div class="bg-slate-900/50 rounded-lg p-3">
                    <p class="text-xs text-slate-500 mb-1">Km</p>
                    <p class="text-white text-sm">${order.KILOMETRAJE_INGRESO || '-'}</p>
                </div>
            </div>
            <div class="border-t border-slate-700 pt-4">
                <h4 class="text-sm font-semibold text-white mb-2"><i class="fa-solid fa-list mr-1 text-yellow-400"></i>Materiales y Servicios</h4>
                ${detallesHTML}
            </div>
            <div class="bg-slate-900/50 rounded-lg p-3 flex justify-between items-center">
                <span class="text-sm text-slate-400">Total de la Orden</span>
                <span class="text-lg font-bold text-white">$${Number(order.TOTAL || 0).toLocaleString('es-CO')}</span>
            </div>
        </div>`;
    } catch (err) {
        body.innerHTML = `<div class="text-red-400 text-sm p-4">Error cargando detalles: ${err.message}</div>`;
    }
}

function closeDetailModal() {
    document.getElementById('detail-modal').classList.add('hidden');
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadWorkerOrders();
});
