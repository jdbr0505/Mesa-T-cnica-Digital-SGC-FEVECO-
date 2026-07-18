// 1. Importar la Base de Datos y los métodos de Firestore
import { db } from './firebase-config.js';
import { collection, addDoc, onSnapshot, doc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Constantes de Puntuación FEVECO
const PTS_EFECTIVA = 5;
const PTS_NULA = -2;
const PTS_AMONESTACION = -1;
const PTS_SP = 3;

// Sistema de Notificaciones (Toasts)
function mostrarToast(mensaje, tipo) {
    const container = document.getElementById('toast-container');
    const icons = {
        success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
        error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        warning: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    };
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `${icons[tipo] || icons.info}<span>${mensaje}</span><button class="toast-close" onclick="this.parentElement.classList.add('removing');setTimeout(()=>this.parentElement.remove(),350)">✕</button>`;
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.isConnected) {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 350);
        }
    }, 4000);
}

// Control de Interfaz
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('show');
    document.getElementById('hamburger').classList.toggle('active');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    
    const items = document.querySelectorAll('.nav-item');
    const tabMap = { registro: 0, sorteo1: 1, computos: 2, sorteodinamico: 3, estadisticas: 4 };
    if (tabMap[tabId] !== undefined) items[tabMap[tabId]].classList.add('active');
    
    const titles = {
        registro: 'Registro de Atletas y Ejemplares',
        sorteo1: 'Generador Estocástico — Sorteo 1',
        computos: 'Mesa Técnica — Cómputos Métricos',
        sorteodinamico: 'Algoritmo de Sorteo Dinámico',
        estadisticas: 'Panel de Estadísticas FEVECO'
    };
    document.getElementById('page-title').innerText = titles[tabId] || 'SGC FEVECO';
    if (document.querySelector('.sidebar.open')) toggleSidebar();
}

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
});

function autoCategoria() {
    const edad = parseInt(document.getElementById('col-edad').value);
    const select = document.getElementById('col-categoria');
    if (!edad) return;
    const cats = [
        [12, 14, 'Pre-Infantil (12-14)'],
        [15, 17, 'Infantil (15-17)'],
        [18, 23, 'C (18-23)'],
        [24, 31, 'B (24-31)'],
        [32, 39, 'A (32-39)'],
        [40, 49, 'AA (40-49)'],
        [50, 59, 'Master (50-59)'],
        [60, 99, 'Super Master (60+)']
    ];
    for (const [min, max, label] of cats) {
        if (edad >= min && edad <= max) { select.value = label; return; }
    }
}

// 2. Base de Datos CRUD
async function addColeador() {
    const name = document.getElementById('col-nombre').value.trim();
    const cedula = document.getElementById('col-cedula').value.trim();
    const edad = document.getElementById('col-edad').value;
    const cat = document.getElementById('col-categoria').value;
    const equino = document.getElementById('col-equino').value.trim();
    const prop = document.getElementById('col-propietario').value.trim();
    
    if (!name || !cedula || !edad || !equino || !prop) {
        mostrarToast('Complete todos los campos obligatorios.', 'warning');
        return;
    }
    
    try {
        await addDoc(collection(db, "coleadores"), {
            nombre: name,
            cedula: cedula,
            edad: edad,
            categoria: cat,
            equino: equino,
            propietario: prop,
            fecha_registro: serverTimestamp()
        });

        document.getElementById('col-nombre').value = '';
        document.getElementById('col-cedula').value = '';
        document.getElementById('col-edad').value = '';
        document.getElementById('col-equino').value = '';
        document.getElementById('col-propietario').value = '';
        
        mostrarToast(`${name} guardado en la Base de Datos.`, 'success');
    } catch (error) {
        console.error(error);
        mostrarToast('Error al conectar con la Nube.', 'error');
    }
}

async function eliminarColeador(btn) {
    const tr = btn.closest('tr');
    const docId = tr.dataset.id;
    const name = tr.querySelector('td:nth-child(2)').textContent.trim();
    
    if (!confirm(`¿Estás seguro de eliminar a ${name}?`)) return;

    try {
        await deleteDoc(doc(db, "coleadores", docId));
        mostrarToast(`${name} eliminado.`, 'info');
    } catch (error) {
        console.error(error);
        mostrarToast('Error al eliminar.', 'error');
    }
}

// Funciones Auxiliares UI
function actualizarContador() {
    const count = document.querySelectorAll('#tabla-nomina tr').length;
    document.getElementById('count-nomina').textContent = count;
}

function catClass(cat) {
    if (cat.includes('Pre-Infantil')) return 'cat-preinfantil';
    if (cat.includes('Infantil')) return 'cat-infantil';
    if (cat.includes('C ')) return 'cat-c';
    if (cat.includes('B ')) return 'cat-b';
    if (cat.includes('A ')) return 'cat-a';
    if (cat.includes('AA')) return 'cat-aa';
    if (cat.includes('Master')) return 'cat-master';
    if (cat.includes('Super')) return 'cat-supermaster';
    return 'cat-c';
}
function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

// --- ALGORITMOS DE SORTEOS ---
function generarSorteoInicial() {
    const tbody = document.getElementById('tabla-nomina');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    if (rows.length === 0) {
        mostrarToast('No hay coleadores inscritos.', 'warning');
        return;
    }
    
    document.getElementById('resultados-sorteo-1').classList.remove('hidden');
    
    // Algoritmo de Barajado (Fisher-Yates)
    const shuffled = [...rows];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const puestoLabels = ['coso', 'centro', 'tapon', 'puerta'];
    let html = '';
    
    // Agrupar en turnos de 4
    for(let i=0; i < shuffled.length; i+=4) {
        let turnoNum = Math.floor(i/4) + 1;
        let grupo = shuffled.slice(i, i+4);
        
        html += `<div class="turno-block">
            <div class="turno-header"><span><span class="turno-num">TURNO ${turnoNum}</span> — Manga Oficial</span><span class="turno-metric">${grupo.length} Coleadores</span></div>
            <div class="turno-body"><table><thead><tr><th>Puesto</th><th>Coleador</th><th>Equino</th></tr></thead><tbody>`;
            
        grupo.forEach((row, index) => {
            const cols = row.querySelectorAll('td');
            const name = cols[1] ? cols[1].textContent.trim() : '—';
            const equino = cols[4] ? cols[4].textContent.trim() : '—';
            const puestoClase = puestoLabels[index] || 'coso';
            const puestoNombre = (index === 0) ? '1 (Coso)' : (index === 1) ? '2 (Centro)' : (index === 2) ? '3 (Tapón)' : '4 (Puerta)';
            html += `<tr><td><span class="puesto-badge ${puestoClase}">${puestoNombre}</span></td><td>${name}</td><td>${equino}</td></tr>`;
        });
        html += '</tbody></table></div></div>';
    }
    
    document.getElementById('turno-container-1').innerHTML = html;
    mostrarToast(`Sorteo estocástico generado con éxito.`, 'success');
}

function generarSorteoDinamico() {
    const filasRanking = Array.from(document.querySelectorAll('#tabla-ranking tr'));
    if(filasRanking.length === 0) {
        mostrarToast('Debe haber cómputos guardados para el sorteo dinámico.', 'warning');
        return;
    }

    document.getElementById('resultados-sorteo-dinamico').classList.remove('hidden');
    const puestoLabels = ['coso', 'centro', 'tapon', 'puerta'];
    let html = '';

    // Agrupar de 4 en 4 (Ya vienen ordenados del Ranking General)
    for(let i=0; i < filasRanking.length; i+=4) {
        let turnoNum = Math.floor(i/4) + 1;
        let grupo = filasRanking.slice(i, i+4);
        let esElite = (turnoNum === 1) ? 'elite-block' : '';
        let headerElite = (turnoNum === 1) ? 'elite-header' : '';
        let titulo = (turnoNum === 1) ? 'TURNO DE ÉLITE' : `TURNO ${turnoNum}`;

        html += `<div class="turno-block ${esElite}">
            <div class="turno-header ${headerElite}"><span><span class="turno-num">${titulo}</span></span><span class="turno-metric">Salida 2</span></div>
            <div class="turno-body"><table><thead><tr><th>Puesto</th><th>Coleador</th><th>Puntaje Previo</th></tr></thead><tbody>`;

        grupo.forEach((row, index) => {
            const cols = row.querySelectorAll('td');
            const name = cols[1].textContent.trim();
            const ptsHTML = cols[7].innerHTML; // Trae el strong con color
            
            const puestoClase = puestoLabels[index] || 'coso';
            const puestoNombre = (index === 0) ? '1 (Coso)' : (index === 1) ? '2 (Centro)' : (index === 2) ? '3 (Tapón)' : '4 (Puerta)';
            
            html += `<tr><td><span class="puesto-badge ${puestoClase}">${puestoNombre}</span></td><td>${name}</td><td>${ptsHTML} Pts</td></tr>`;
        });
        html += '</tbody></table></div></div>';
    }
    document.getElementById('turno-container-dinamico').innerHTML = html;
    mostrarToast('Sorteo dinámico generado por orden de mérito.', 'success');
}

// --- MESA TÉCNICA Y CÓMPUTOS ---
function calcularPuntaje(e, n, a, sp) {
    return (e * PTS_EFECTIVA) + (n * PTS_NULA) + (a * PTS_AMONESTACION) + (sp * PTS_SP);
}

function reasignarListenersInputs() {
    document.querySelectorAll('.comp-input').forEach(input => {
        input.addEventListener('input', function () {
            const tr = this.closest('tr[data-comp-id]');
            if (!tr) return;
            const id = tr.dataset.compId;
            const e = parseInt(document.getElementById(`e-${id}`).value) || 0;
            const n = parseInt(document.getElementById(`n-${id}`).value) || 0;
            const a_val = parseInt(document.getElementById(`a-${id}`).value) || 0;
            const sp = parseInt(document.getElementById(`sp-${id}`).value) || 0;
            
            const pts = calcularPuntaje(e, n, a_val, sp);
            const display = document.getElementById(`p-${id}`);
            if(display) {
                display.textContent = pts.toFixed(1);
                display.style.color = pts < 0 ? '#ef4444' : pts > 0 ? '#059669' : 'inherit';
            }
        });
    });
}

function guardarComputo(id) {
    actualizarTablaTotales();
    const e = document.getElementById(`e-${id}`).value || 0;
    mostrarToast(`Cómputos guardados en memoria local para esta manga.`, 'success');
}

function actualizarTablaTotales() {
    const data = [];
    document.querySelectorAll('#tabla-computos-body tr[data-comp-id]').forEach(tr => {
        const id = tr.dataset.compId;
        const name = tr.querySelector('td strong').textContent.trim();
        const e = parseInt(document.getElementById(`e-${id}`).value) || 0;
        const n = parseInt(document.getElementById(`n-${id}`).value) || 0;
        const a_val = parseInt(document.getElementById(`a-${id}`).value) || 0;
        const sp = parseInt(document.getElementById(`sp-${id}`).value) || 0;
        const pts = calcularPuntaje(e, n, a_val, sp);
        const totalIntentos = e + n;
        const efectividad = totalIntentos > 0 ? Math.round((e / totalIntentos) * 100) : 0;
        data.push({ id, name, e, n, a: a_val, sp, pts, efectividad });
    });
    
    // Ordenar de mayor a menor puntaje
    data.sort((a, b) => b.pts - a.pts);
    const tbody = document.getElementById('tabla-totales');
    const medals = ['gold', 'silver', 'bronze'];
    
    tbody.innerHTML = data.map((d, i) => {
        const medalClass = medals[i] || '';
        const ptsColor = d.pts < 0 ? 'style="color:#ef4444;"' : d.pts > 0 ? 'class="pts-gold"' : '';
        const effClass = d.efectividad >= 80 ? '' : d.efectividad >= 1 ? 'eff-low' : 'eff-zero';
        const posClass = medalClass ? `pos-${i + 1}` : '';
        return `<tr class="${posClass}">
            <td><span class="pos-badge ${medalClass}">${i + 1}</span></td>
            <td><strong>${d.name}</strong></td>
            <td><span class="metric-badge e-badge">${d.e}</span></td>
            <td><span class="metric-badge n-badge">${d.n}</span></td>
            <td><span class="metric-badge a-badge">${d.a}</span></td>
            <td><span class="metric-badge sp-badge">${d.sp}</span></td>
            <td><strong ${ptsColor}>${d.pts.toFixed(1)}</strong></td>
            <td><span class="eff-badge ${effClass}">${d.efectividad}%</span></td>
        </tr>`;
    }).join('');
    
    // Al actualizar los totales, también disparamos la actualización del panel de estadísticas y ranking
    actualizarEstadisticas();
}

function actualizarEstadisticas() {
    const compRows = document.querySelectorAll('#tabla-computos-body tr[data-comp-id]');
    let totalE = 0, totalN = 0, totalA = 0, totalSP = 0, totalPts = 0;
    
    compRows.forEach(tr => {
        const id = tr.dataset.compId;
        const e = parseInt(document.getElementById(`e-${id}`)?.value) || 0;
        const n = parseInt(document.getElementById(`n-${id}`)?.value) || 0;
        const a_val = parseInt(document.getElementById(`a-${id}`)?.value) || 0;
        const sp = parseInt(document.getElementById(`sp-${id}`)?.value) || 0;
        totalE += e; totalN += n; totalA += a_val; totalSP += sp;
        totalPts += calcularPuntaje(e, n, a_val, sp);
    });
    
    const totalInt = totalE + totalN;
    const efectividad = totalInt > 0 ? ((totalE / totalInt) * 100).toFixed(1) : '0.0';
    const numColeadores = document.querySelectorAll('#tabla-nomina tr').length;
    const promedio = numColeadores > 0 ? (totalPts / numColeadores).toFixed(2) : '0.00';

    document.getElementById('stat-coleadores').textContent = numColeadores;
    document.getElementById('stat-efectivas').textContent = totalE;
    document.getElementById('stat-nulas').textContent = totalN;
    document.getElementById('stat-sp').textContent = totalSP;
    
    const effSpan = document.getElementById('stat-efectividad');
    effSpan.innerHTML = `${efectividad}<span class="stat-unit">%</span>`;
    document.getElementById('stat-promedio').textContent = promedio;

    const nominaRows = document.querySelectorAll('#tabla-nomina tr');
    const rankingData = [];
    
    nominaRows.forEach(tr => {
        const cols = tr.querySelectorAll('td');
        const name = cols[1] ? cols[1].textContent.trim() : '—';
        const cat = cols[3] ? cols[3].textContent.trim() : '—';
        const id = tr.dataset.id;
        
        let e = 0, n = 0, a_val = 0, sp = 0;
        
        // Buscar si este ID tiene valores en los inputs de cómputo
        const inputE = document.getElementById(`e-${id}`);
        if(inputE) {
            e = parseInt(inputE.value) || 0;
            n = parseInt(document.getElementById(`n-${id}`).value) || 0;
            a_val = parseInt(document.getElementById(`a-${id}`).value) || 0;
            sp = parseInt(document.getElementById(`sp-${id}`).value) || 0;
        }
        
        const pts = calcularPuntaje(e, n, a_val, sp);
        const totalInt2 = e + n;
        const eff = totalInt2 > 0 ? Math.round((e / totalInt2) * 100) : 0;
        rankingData.push({ name, cat, e, n, a: a_val, sp, pts, eff });
    });
    
    rankingData.sort((a, b) => b.pts - a.pts);
    const medals2 = ['gold', 'silver', 'bronze'];
    const tbodyRank = document.getElementById('tabla-ranking');
    
    tbodyRank.innerHTML = rankingData.map((d, i) => {
        const mClass = medals2[i] || '';
        const ptsColor = d.pts < 0 ? 'style="color:#ef4444;"' : d.pts > 0 ? 'class="pts-gold"' : '';
        const effClass = d.eff >= 80 ? '' : d.eff >= 1 ? 'eff-low' : 'eff-zero';
        const catClass2 = catClass(d.cat);
        return `<tr${mClass ? ` class="pos-${i+1}"` : ''}>
            <td><span class="pos-badge ${mClass}">${i + 1}</span></td>
            <td><strong>${d.name}</strong></td>
            <td><span class="cat-tag ${catClass2}">${d.cat}</span></td>
            <td>${d.e}</td><td>${d.n}</td><td>${d.sp}</td><td>${d.a}</td>
            <td><strong ${ptsColor}>${d.pts.toFixed(1)}</strong></td>
            <td><span class="eff-badge ${effClass}">${d.eff}%</span></td>
        </tr>`;
    }).join('');
}

// 4. INICIALIZADOR GLOBAL y Escuchador de Firebase
function inicializar() {
    onSnapshot(collection(db, "coleadores"), (snapshot) => {
        const tbodyNomina = document.getElementById('tabla-nomina');
        const tbodyComputos = document.getElementById('tabla-computos-body');
        
        // Guardar valores actuales de los inputs para no borrarlos al actualizar la tabla
        let valoresActuales = {};
        if (tbodyComputos) {
            tbodyComputos.querySelectorAll('tr').forEach(tr => {
                let id = tr.dataset.compId;
                valoresActuales[id] = {
                    e: document.getElementById(`e-${id}`)?.value || "0",
                    n: document.getElementById(`n-${id}`)?.value || "0",
                    a: document.getElementById(`a-${id}`)?.value || "0",
                    sp: document.getElementById(`sp-${id}`)?.value || "0"
                };
            });
        }

        tbodyNomina.innerHTML = '';
        let computosHTML = '';
        
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id; 
            
            // 1. Armar fila para "Nómina"
            const trNom = document.createElement('tr');
            trNom.dataset.id = id;
            trNom.innerHTML = `
                <td><span class="cedula-badge">${escHtml(data.cedula || '—')}</span></td>
                <td><strong>${escHtml(data.nombre || '—')}</strong></td>
                <td>${escHtml(data.edad || '—')}</td>
                <td><span class="cat-tag ${catClass(data.categoria || '—')}">${escHtml(data.categoria || '—')}</span></td>
                <td>${escHtml(data.equino || '—')}</td>
                <td>${escHtml(data.propietario || '—')}</td>
                <td><button class="btn-icon delete-btn" onclick="eliminarColeador(this)" title="Eliminar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button></td>
            `;
            tbodyNomina.appendChild(trNom);

            // 2. Armar fila para "Cómputos de Manga"
            const guardadoE = valoresActuales[id]?.e || "0";
            const guardadoN = valoresActuales[id]?.n || "0";
            const guardadoA = valoresActuales[id]?.a || "0";
            const guardadoSP = valoresActuales[id]?.sp || "0";
            const puntaje = calcularPuntaje(parseInt(guardadoE), parseInt(guardadoN), parseInt(guardadoA), parseInt(guardadoSP));
            const colorPuntaje = puntaje < 0 ? '#ef4444' : puntaje > 0 ? '#059669' : 'inherit';

            computosHTML += `
                <tr data-comp-id="${id}">
                    <td><strong>${escHtml(data.nombre || '—')}</strong><br><small class="equino-sub">Equino: ${escHtml(data.equino || '—')}</small></td>
                    <td><input type="number" class="comp-input e-input" id="e-${id}" value="${guardadoE}" min="0"></td>
                    <td><input type="number" class="comp-input n-input" id="n-${id}" value="${guardadoN}" min="0"></td>
                    <td><input type="number" class="comp-input a-input" id="a-${id}" value="${guardadoA}" min="0"></td>
                    <td><input type="number" class="comp-input sp-input" id="sp-${id}" value="${guardadoSP}" min="0"></td>
                    <td><span class="puntaje-display" id="p-${id}" style="color:${colorPuntaje}">${puntaje.toFixed(1)}</span></td>
                    <td><button class="btn btn-sm" onclick="guardarComputo('${id}')">Guardar</button></td>
                </tr>
            `;
        });
        
        if (tbodyComputos) tbodyComputos.innerHTML = computosHTML;
        
        actualizarContador();
        reasignarListenersInputs();
        actualizarTablaTotales(); // Actualiza estadísticas automáticamente
    }, (error) => {
        console.error(error);
        if(error.code === 'permission-denied') {
            mostrarToast('⚠️ Permisos de BD denegados. Cambie reglas a "Modo de Prueba".', 'error');
        }
    });
}

// Ejecutar Inicialización
document.addEventListener('DOMContentLoaded', inicializar);

// Exponer funciones globales
window.toggleSidebar = toggleSidebar;
window.switchTab = switchTab;
window.autoCategoria = autoCategoria;
window.addColeador = addColeador;
window.eliminarColeador = eliminarColeador;
window.generarSorteoInicial = generarSorteoInicial;
window.generarSorteoDinamico = generarSorteoDinamico;
window.guardarComputo = guardarComputo;