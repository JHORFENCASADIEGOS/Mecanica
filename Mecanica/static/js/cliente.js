// ==========================================
// CLIENTE.JS — Portal del Cliente
// ==========================================

let currentClientView = 'vehiculos';
let clientUser = null;
let myVehicles = [];
let myOrders = [];
let availableServices = [];
let selectedServices = [];

// ==========================================
// UTILIDADES
// ==========================================
async function getSession() {
    try {
        const res = await fetch('/api/session');
        const d = await res.json();
        return d.data;
    } catch { return null; }
}

async function apiCall(procedure, payload) {
    const res = await fetch(`/api/${procedure}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return await res.json();
}

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

function showLoader() { document.getElementById('loader').classList.remove('hidden'); }
function hideLoader() { document.getElementById('loader').classList.add('hidden'); }

// ==========================================
// ROUTER
// ==========================================
async function switchView(view, el) {
    if (el) {
        document.querySelectorAll('.sidebar-item').forEach(e => e.classList.remove('active'));
        el.classList.add('active');
    }
    currentClientView = view;
    const titles = { vehiculos: 'Mis Vehículos', agendar: 'Agendar Servicio', ordenes: 'Mis Órdenes' };
    document.getElementById('page-title').textContent = titles[view] || '';

    if (!clientUser) {
        clientUser = await getSession();
        if (!clientUser) { window.location.href = '/'; return; }
    }

    if (view === 'vehiculos') await loadVehicles();
    else if (view === 'agendar') await loadScheduleView();
    else if (view === 'ordenes') await loadMyOrders();
}

// ==========================================
// MIS VEHÍCULOS
// ==========================================
async function loadVehicles() {
    const container = document.getElementById('view-container');
    container.innerHTML = '';
    showLoader();
    try {
        const data = await apiCall('MECANICA_CRUD_VEHICULO', { vcrud: 6, terid: clientUser.TERID });
        myVehicles = Array.isArray(data) ? data : [];
        renderVehicles();
    } catch (err) {
        container.innerHTML = `<div class="p-4 bg-red-500/10 text-red-400 rounded-lg">Error: ${err.message}</div>`;
    } finally { hideLoader(); }
}

function renderVehicles() {
    const container = document.getElementById('view-container');
    let cards = '';
    myVehicles.forEach((v, i) => {
        cards += `
        <div class="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 shadow-lg hover:border-emerald-500/30 transition-all animate-fade-in">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center">
                    <div class="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mr-3">
                        <i class="fa-solid fa-car text-emerald-400"></i>
                    </div>
                    <div>
                        <h4 class="text-white font-semibold">${v.MARCA} ${v.MODELO}</h4>
                        <p class="text-slate-400 text-sm">${v.PLACA}</p>
                    </div>
                </div>
                <div class="flex space-x-1">
                    <button onclick="editVehicle(${i})" class="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Editar">
                        <i class="fa-solid fa-pen text-sm"></i>
                    </button>
                    <button onclick="deleteVehicle(${v.VEHICULOID})" class="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Eliminar">
                        <i class="fa-regular fa-trash-can text-sm"></i>
                    </button>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
                <div class="text-slate-400"><i class="fa-solid fa-calendar w-4 mr-1 text-slate-500"></i>Año: ${v.ANIO || '-'}</div>
                <div class="text-slate-400"><i class="fa-solid fa-palette w-4 mr-1 text-slate-500"></i>Color: ${v.COLOR || '-'}</div>
            </div>
        </div>`;
    });

    if (myVehicles.length === 0) {
        cards = `<div class="col-span-full text-center py-12">
            <div class="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <i class="fa-solid fa-car text-2xl text-emerald-400"></i>
            </div>
            <p class="text-slate-400">No tienes vehículos registrados</p>
            <p class="text-sm text-slate-500 mt-1">Agrega tu primer vehículo para agendar servicios</p>
        </div>`;
    }

    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <div>
                <h3 class="text-xl font-semibold text-white">Mis Vehículos</h3>
                <p class="text-sm text-slate-500 mt-1">${myVehicles.length} vehículo(s) registrado(s)</p>
            </div>
            <button onclick="openVehicleForm()" class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20">
                <i class="fa-solid fa-plus mr-2"></i>Agregar Vehículo
            </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">${cards}</div>`;
}

function openVehicleForm(idx = null) {
    const v = idx !== null ? myVehicles[idx] : null;
    const isEdit = v !== null;
    document.getElementById('modal-title').textContent = isEdit ? `Editar ${v.PLACA}` : 'Nuevo Vehículo';
    document.getElementById('modal-alert').classList.add('hidden');

    document.getElementById('modal-body').innerHTML = `
        <form onsubmit="saveVehicle(event, ${isEdit ? v.VEHICULOID : 'null'})" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-sm font-medium text-slate-400 mb-1">Placa</label>
                    <input id="v-placa" value="${v?.PLACA || ''}" required class="card-input" placeholder="ABC-123">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-400 mb-1">Marca</label>
                    <input id="v-marca" value="${v?.MARCA || ''}" required class="card-input" placeholder="Toyota">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-sm font-medium text-slate-400 mb-1">Modelo</label>
                    <input id="v-modelo" value="${v?.MODELO || ''}" required class="card-input" placeholder="Corolla">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-400 mb-1">Año</label>
                    <input id="v-anio" type="number" value="${v?.ANIO || ''}" required class="card-input" placeholder="2024">
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-400 mb-1">Color</label>
                <input id="v-color" value="${v?.COLOR || ''}" class="card-input" placeholder="Blanco">
            </div>
            <div class="flex justify-end space-x-3 pt-2">
                <button type="button" onclick="closeModal()" class="px-4 py-2 text-sm text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" class="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-500/20 transition-colors">
                    <i class="fa-solid fa-floppy-disk mr-1"></i>${isEdit ? 'Actualizar' : 'Guardar'}
                </button>
            </div>
        </form>`;
    document.getElementById('global-modal').classList.remove('hidden');
}

function editVehicle(idx) { openVehicleForm(idx); }

async function saveVehicle(e, vehiculoid) {
    e.preventDefault();
    const alert = document.getElementById('modal-alert');
    const payload = {
        vcrud: vehiculoid ? 4 : 1,
        terid: clientUser.TERID,
        placa: document.getElementById('v-placa').value,
        marca: document.getElementById('v-marca').value,
        modelo: document.getElementById('v-modelo').value,
        anio: parseInt(document.getElementById('v-anio').value),
        color: document.getElementById('v-color').value
    };
    if (vehiculoid) payload.vehiculoid = vehiculoid;

    try {
        const data = await apiCall('MECANICA_CRUD_VEHICULO', payload);
        alert.classList.remove('hidden');
        if (data.OSUCCESS === 1) {
            alert.className = 'mb-4 p-3 rounded-lg text-sm text-center bg-emerald-500/10 text-emerald-400';
            alert.textContent = data.OMENSAJE;
            setTimeout(() => { closeModal(); loadVehicles(); }, 800);
        } else {
            alert.className = 'mb-4 p-3 rounded-lg text-sm text-center bg-red-500/10 text-red-400';
            alert.textContent = data.OMENSAJE;
        }
    } catch { alert.className = 'mb-4 p-3 rounded-lg text-sm text-center bg-red-500/10 text-red-400'; alert.textContent = 'Error de conexión'; alert.classList.remove('hidden'); }
}

async function deleteVehicle(id) {
    if (!confirm('¿Eliminar este vehículo? No se puede deshacer.')) return;
    try {
        const data = await apiCall('MECANICA_CRUD_VEHICULO', { vcrud: 5, vehiculoid: id });
        if (data.OSUCCESS === 1) loadVehicles();
        else alert(data.OMENSAJE);
    } catch { alert('Error de conexión'); }
}

function closeModal() { document.getElementById('global-modal').classList.add('hidden'); }

// ==========================================
// AGENDAR SERVICIO
// ==========================================
async function loadScheduleView() {
    const container = document.getElementById('view-container');
    container.innerHTML = '';
    showLoader();

    try {
        // Cargar vehículos del cliente y servicios/materiales disponibles
        const [vehData, matData] = await Promise.all([
            apiCall('MECANICA_CRUD_VEHICULO', { vcrud: 6, terid: clientUser.TERID }),
            apiCall('MECANICA_CRUD_MATERIAL', { vcrud: 2 })
        ]);
        myVehicles = Array.isArray(vehData) ? vehData : [];
        availableServices = Array.isArray(matData) ? matData : [];
        selectedServices = [];
        renderScheduleForm();
    } catch (err) {
        container.innerHTML = `<div class="p-4 bg-red-500/10 text-red-400 rounded-lg">Error: ${err.message}</div>`;
    } finally { hideLoader(); }
}

function renderScheduleForm() {
    const container = document.getElementById('view-container');

    if (myVehicles.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16 animate-fade-in">
                <div class="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                    <i class="fa-solid fa-car text-2xl text-emerald-400"></i>
                </div>
                <h3 class="text-lg text-white font-medium mb-2">Primero registra un vehículo</h3>
                <p class="text-sm text-slate-500">Necesitas tener al menos un vehículo registrado para agendar un servicio.</p>
                <button onclick="switchView('vehiculos', document.getElementById('nav-vehiculos'))" class="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500 transition-colors">
                    <i class="fa-solid fa-plus mr-1"></i>Agregar Vehículo
                </button>
            </div>`;
        return;
    }

    let vehicleOptions = myVehicles.map(v => `<option value="${v.VEHICULOID}">${v.PLACA} — ${v.MARCA} ${v.MODELO}</option>`).join('');
    let serviceCards = availableServices.map((s, i) => `
        <div class="flex items-center justify-between p-3 rounded-lg border border-slate-700/50 hover:border-emerald-500/30 transition-colors cursor-pointer ${selectedServices.find(ss => ss.MATERIALID === s.MATERIALID) ? 'border-emerald-500 bg-emerald-500/5' : ''}" onclick="toggleService(${i})">
            <div class="flex items-center">
                <input type="checkbox" ${selectedServices.find(ss => ss.MATERIALID === s.MATERIALID) ? 'checked' : ''} class="mr-3 accent-emerald-500" readonly>
                <div>
                    <p class="text-white text-sm font-medium">${s.NOMBRE}</p>
                    <p class="text-xs text-slate-500">${s.TIPO_ARTICULO}</p>
                </div>
            </div>
            <span class="text-emerald-400 font-semibold text-sm">$${Number(s.PRECIO).toLocaleString('es-CO')}</span>
        </div>`).join('');

    const total = selectedServices.reduce((sum, s) => sum + Number(s.PRECIO), 0);

    container.innerHTML = `
    <div class="max-w-3xl mx-auto animate-fade-in">
        <h3 class="text-xl font-semibold text-white mb-6">Agendar Servicio</h3>
        
        <!-- Paso 1: Vehículo -->
        <div class="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 mb-4">
            <h4 class="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">
                <i class="fa-solid fa-1 mr-2 w-5 h-5 inline-flex items-center justify-center rounded-full bg-emerald-500/20 text-xs"></i>
                Selecciona tu Vehículo
            </h4>
            <select id="sched-vehiculo" class="card-input">${vehicleOptions}</select>
        </div>

        <!-- Paso 2: Servicios -->
        <div class="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 mb-4">
            <h4 class="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">
                <i class="fa-solid fa-2 mr-2 w-5 h-5 inline-flex items-center justify-center rounded-full bg-emerald-500/20 text-xs"></i>
                Selecciona Servicios / Repuestos
            </h4>
            <div class="space-y-2 max-h-60 overflow-y-auto">${serviceCards}</div>
        </div>

        <!-- Paso 3: Fecha y Observaciones -->
        <div class="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 mb-4">
            <h4 class="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">
                <i class="fa-solid fa-3 mr-2 w-5 h-5 inline-flex items-center justify-center rounded-full bg-emerald-500/20 text-xs"></i>
                Fecha y Observaciones
            </h4>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-sm text-slate-400 mb-1">Fecha deseada</label>
                    <input type="datetime-local" id="sched-fecha" class="card-input">
                </div>
                <div>
                    <label class="block text-sm text-slate-400 mb-1">Kilometraje actual</label>
                    <input type="number" id="sched-km" class="card-input" placeholder="85000">
                </div>
            </div>
            <div class="mt-3">
                <label class="block text-sm text-slate-400 mb-1">Observaciones</label>
                <textarea id="sched-obs" rows="2" class="card-input" placeholder="Describe el problema o lo que necesitas..."></textarea>
            </div>
        </div>

        <!-- Resumen y Pago -->
        <div class="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 mb-4">
            <h4 class="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">
                <i class="fa-solid fa-4 mr-2 w-5 h-5 inline-flex items-center justify-center rounded-full bg-emerald-500/20 text-xs"></i>
                Resumen y Pago
            </h4>
            <div id="order-summary">
                ${selectedServices.length > 0 ? selectedServices.map(s => `
                    <div class="flex justify-between text-sm py-1 border-b border-slate-700/30">
                        <span class="text-slate-300">${s.NOMBRE}</span>
                        <span class="text-white">$${Number(s.PRECIO).toLocaleString('es-CO')}</span>
                    </div>
                `).join('') : '<p class="text-slate-500 text-sm">Selecciona al menos un servicio arriba</p>'}
            </div>
            <div class="flex justify-between items-center mt-3 pt-3 border-t border-slate-700">
                <span class="text-white font-semibold">Total Estimado</span>
                <span class="text-xl font-bold text-emerald-400">$${total.toLocaleString('es-CO')}</span>
            </div>
        </div>

        <!-- Botón Pagar -->
        <button onclick="openPaymentGateway()" ${selectedServices.length === 0 ? 'disabled' : ''} 
            class="w-full py-3 rounded-xl text-white font-semibold text-base transition-all shadow-lg ${selectedServices.length > 0 ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20' : 'bg-slate-700 cursor-not-allowed opacity-60'}">
            <i class="fa-solid fa-credit-card mr-2"></i>Proceder al Pago — $${total.toLocaleString('es-CO')}
        </button>
    </div>`;
}

function toggleService(idx) {
    const s = availableServices[idx];
    const exists = selectedServices.findIndex(ss => ss.MATERIALID === s.MATERIALID);
    if (exists >= 0) selectedServices.splice(exists, 1);
    else selectedServices.push(s);
    renderScheduleForm();
}

// ==========================================
// PASARELA DE PAGO SIMULADA
// ==========================================
function openPaymentGateway() {
    if (selectedServices.length === 0) return;
    const total = selectedServices.reduce((sum, s) => sum + Number(s.PRECIO), 0);

    document.getElementById('modal-title').innerHTML = '<i class="fa-solid fa-lock mr-2 text-emerald-400"></i>Pasarela de Pago Seguro';
    document.getElementById('modal-alert').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = `
        <!-- Tarjeta Visual -->
        <div class="cc-container mb-6 relative z-0">
            <div class="flex justify-between items-start mb-8">
                <i class="fa-solid fa-credit-card text-white/70 text-2xl"></i>
                <span class="text-white/60 text-xs font-semibold tracking-widest">VISA</span>
            </div>
            <p id="cc-display" class="text-white text-lg tracking-[0.25em] font-mono mb-4">•••• •••• •••• ••••</p>
            <div class="flex justify-between">
                <div>
                    <p class="text-white/50 text-[10px] uppercase">Titular</p>
                    <p id="cc-name-display" class="text-white text-sm">${clientUser.NOMBRE}</p>
                </div>
                <div>
                    <p class="text-white/50 text-[10px] uppercase">Vence</p>
                    <p id="cc-exp-display" class="text-white text-sm">MM/AA</p>
                </div>
            </div>
        </div>

        <form onsubmit="processPayment(event)" class="space-y-4">
            <div>
                <label class="block text-sm text-slate-400 mb-1">Número de Tarjeta</label>
                <input id="cc-number" type="text" maxlength="19" required class="card-input font-mono tracking-wider" placeholder="4242 4242 4242 4242" oninput="updateCardDisplay()">
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-sm text-slate-400 mb-1">Vencimiento</label>
                    <input id="cc-exp" type="text" maxlength="5" required class="card-input" placeholder="12/28" oninput="updateCardDisplay()">
                </div>
                <div>
                    <label class="block text-sm text-slate-400 mb-1">CVV</label>
                    <input id="cc-cvv" type="text" maxlength="4" required class="card-input" placeholder="123">
                </div>
            </div>
            <div class="bg-slate-900/50 rounded-lg p-3 flex justify-between items-center">
                <span class="text-slate-400 text-sm">Total a Pagar</span>
                <span class="text-emerald-400 font-bold text-lg">$${total.toLocaleString('es-CO')}</span>
            </div>
            <div id="payment-alert" class="hidden mb-2 p-3 rounded-lg text-sm text-center"></div>
            <button type="submit" id="btn-pay" class="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all">
                <i class="fa-solid fa-lock mr-2"></i>Pagar $${total.toLocaleString('es-CO')}
            </button>
            <p class="text-xs text-slate-500 text-center"><i class="fa-solid fa-shield-halved mr-1"></i>Pago simulado — Ambiente estudiantil</p>
        </form>`;
    document.getElementById('global-modal').classList.remove('hidden');
}

function updateCardDisplay() {
    const num = document.getElementById('cc-number').value;
    const exp = document.getElementById('cc-exp').value;
    document.getElementById('cc-display').textContent = num || '•••• •••• •••• ••••';
    document.getElementById('cc-exp-display').textContent = exp || 'MM/AA';
}

async function processPayment(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-pay');
    const payAlert = document.getElementById('payment-alert');
    const total = selectedServices.reduce((sum, s) => sum + Number(s.PRECIO), 0);

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Procesando pago...';
    payAlert.classList.add('hidden');

    // Simular procesamiento de pago (1.5 segundos)
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
        // Paso 1: Crear la Orden de Trabajo con estado "Agendada App" (estadoid=1 asumimos)
        const estadosRes = await apiCall('MECANICA_CRUD_SISTEMA', { vcrud: 2, tabla: 'ESTADOS_ORDEN' });
        const estados = Array.isArray(estadosRes) ? estadosRes : [];
        const estadoAgendada = estados.find(e => e.NOMBRE === 'Agendada App');
        const estadoid = estadoAgendada ? estadoAgendada.ESTADOID : 1;

        const vehiculoid = parseInt(document.getElementById('sched-vehiculo').value);
        const fechaRaw = document.getElementById('sched-fecha').value;
        const fechaAgendada = fechaRaw || new Date().toISOString().slice(0, 16);
        const km = document.getElementById('sched-km').value ? parseInt(document.getElementById('sched-km').value) : 0;
        const obs = document.getElementById('sched-obs').value || '';

        const orderRes = await apiCall('MECANICA_CRUD_ORDENES_TRABAJOS', {
            vcrud: 1,
            cliente_terid: clientUser.TERID,
            trabajador_terid: 0,
            vehiculoid: vehiculoid,
            estadoid: estadoid,
            fecha_agendada: fechaAgendada,
            kilometraje_ingreso: km,
            observaciones: obs,
            porcentaje_descuento: 0
        });

        if (orderRes.OSUCCESS !== 1) {
            payAlert.className = 'mb-2 p-3 rounded-lg text-sm text-center bg-red-500/10 text-red-400';
            payAlert.textContent = orderRes.OMENSAJE || 'Error al crear la orden';
            payAlert.classList.remove('hidden');
            return;
        }

        const newOrdenId = orderRes.ORDENID;

        // Paso 2: Agregar cada servicio/material como detalle de la orden
        for (const s of selectedServices) {
            await apiCall('MECANICA_CRUD_ORDEN_DETALLES', {
                vcrud: 1,
                ordenid: newOrdenId,
                materialid: s.MATERIALID,
                cantidad: 1,
                valor_unitario: s.PRECIO,
                porcentaje_descuento: 0
            });
        }

        // Paso 3: Registrar la transacción (pago virtual)
        await apiCall('MECANICA_CRUD_TRANSACCIONES', {
            vcrud: 1,
            ordenid: newOrdenId,
            monto: total,
            metodo_pago: 'App_Pasarela',
            origen: 'App',
            referencia: 'PAGO-SIM-' + Date.now()
        });

        // Éxito
        payAlert.className = 'mb-2 p-3 rounded-lg text-sm text-center bg-emerald-500/10 text-emerald-400';
        payAlert.innerHTML = '<i class="fa-solid fa-check-circle mr-1"></i>¡Pago exitoso! Orden #' + newOrdenId + ' creada.';
        payAlert.classList.remove('hidden');

        btn.innerHTML = '<i class="fa-solid fa-check mr-2"></i>¡Pago Completado!';
        btn.className = 'w-full py-3 bg-emerald-700 text-white font-semibold rounded-xl cursor-default';

        setTimeout(() => {
            closeModal();
            switchView('ordenes', document.getElementById('nav-ordenes'));
        }, 2000);

    } catch (err) {
        payAlert.className = 'mb-2 p-3 rounded-lg text-sm text-center bg-red-500/10 text-red-400';
        payAlert.textContent = 'Error de conexión: ' + err.message;
        payAlert.classList.remove('hidden');
    } finally {
        if (!btn.classList.contains('bg-emerald-700')) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-lock mr-2"></i>Pagar $${total.toLocaleString('es-CO')}`;
        }
    }
}

// ==========================================
// MIS ÓRDENES (Solo lectura)
// ==========================================
async function loadMyOrders() {
    const container = document.getElementById('view-container');
    container.innerHTML = '';
    showLoader();
    try {
        const data = await apiCall('MECANICA_CRUD_ORDENES_TRABAJOS', { vcrud: 7, cliente_terid: clientUser.TERID });
        myOrders = Array.isArray(data) ? data : [];
        renderMyOrders();
    } catch (err) {
        container.innerHTML = `<div class="p-4 bg-red-500/10 text-red-400 rounded-lg">Error: ${err.message}</div>`;
    } finally { hideLoader(); }
}

function renderMyOrders() {
    const container = document.getElementById('view-container');

    if (myOrders.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16 animate-fade-in">
                <div class="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                    <i class="fa-solid fa-clipboard text-2xl text-emerald-400"></i>
                </div>
                <h3 class="text-lg text-white font-medium mb-2">No tienes órdenes aún</h3>
                <p class="text-sm text-slate-500">Agenda tu primer servicio para verlo aquí.</p>
                <button onclick="switchView('agendar', document.getElementById('nav-agendar'))" class="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500 transition-colors">
                    <i class="fa-solid fa-calendar-plus mr-1"></i>Agendar Servicio
                </button>
            </div>`;
        return;
    }

    let rows = myOrders.map(o => `
        <tr class="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
            <td class="px-4 py-3 text-white font-medium">#${o.ORDENID}</td>
            <td class="px-4 py-3">${o.PLACA}</td>
            <td class="px-4 py-3">${o.MARCA} ${o.MODELO}</td>
            <td class="px-4 py-3"><span class="status-badge ${getStatusColor(o.ESTADO)}">${o.ESTADO}</span></td>
            <td class="px-4 py-3 text-right">$${Number(o.TOTAL || 0).toLocaleString('es-CO')}</td>
            <td class="px-4 py-3 text-right">$${Number(o.SALDO_PENDIENTE || 0).toLocaleString('es-CO')}</td>
            <td class="px-4 py-3 text-sm text-slate-400">${o.FECHA_AGENDADA ? new Date(o.FECHA_AGENDADA).toLocaleDateString('es-CO') : '-'}</td>
        </tr>`).join('');

    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <div>
                <h3 class="text-xl font-semibold text-white">Mis Órdenes</h3>
                <p class="text-sm text-slate-500 mt-1">${myOrders.length} orden(es)</p>
            </div>
            <button onclick="loadMyOrders()" class="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 transition-colors">
                <i class="fa-solid fa-rotate mr-1"></i>Actualizar
            </button>
        </div>
        <div class="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden shadow-lg animate-fade-in">
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="bg-slate-850 border-b border-slate-700">
                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Orden</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Placa</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Vehículo</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Estado</th>
                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Total</th>
                            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Saldo</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Agendada</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    switchView('vehiculos', document.getElementById('nav-vehiculos'));
});
