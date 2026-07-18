import { state } from '../core/state.js';
import { downloadBlob, formatDateTime, rowsToCsv, shortHash, slugify } from '../core/utils.js';
import { createEventBackup, restoreEventBackup } from '../services/backup.service.js';
import { setBusy, showToast } from './ui.js';

let callbacks = {};

function requireEvent() {
  if (!state.activeEventId || !state.activeEvent) throw new Error('Selecciona un evento antes de exportar.');
}

function filename(suffix, extension) {
  const base = slugify(state.activeEvent?.nombre || 'evento-sgc');
  return `${base}-${suffix}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

function activeParticipants() {
  return state.participants.filter(item => item.estado !== 'retirado');
}

export function bindExportsModule(options = {}) {
  callbacks = options;
  document.getElementById('btn-export-nomina')?.addEventListener('click', () => {
    try {
      requireEvent();
      const csv = rowsToCsv(
        ['Cédula', 'Coleador', 'Fecha de nacimiento', 'Edad', 'Sexo', 'Categoría', 'Asociación', 'Equino', 'Propietario', 'Estado'],
        state.participants.map(item => [item.cedula, item.nombre, item.fechaNacimiento, item.edad, item.sexo, item.categoria, item.asociacion, item.equino, item.propietario, item.estado])
      );
      downloadBlob(filename('nomina', 'csv'), csv, 'text/csv;charset=utf-8');
      showToast('Nómina CSV generada.', 'success');
    } catch (error) { showToast(error.message, 'error'); }
  });

  document.getElementById('btn-export-results')?.addEventListener('click', () => {
    try {
      requireEvent();
      const csv = rowsToCsv(
        ['Posición', 'Coleador', 'Categoría', 'Asociación', 'Efectivas', 'Nulas', 'Sanciones', 'Saques de puerta', 'Puntos', 'Efectividad', 'Condición'],
        state.results.map(item => [item.posicion, item.nombre, item.categoria, item.asociacion, item.efectivas, item.nulas, item.sanciones, item.saquesPuerta, item.puntos, item.efectividad, item.empateExacto ? 'Empate reglamentario' : 'Clasificado'])
      );
      downloadBlob(filename('resultados', 'csv'), csv, 'text/csv;charset=utf-8');
      showToast('Resultados CSV generados.', 'success');
    } catch (error) { showToast(error.message, 'error'); }
  });

  document.getElementById('btn-export-audit')?.addEventListener('click', () => {
    try {
      requireEvent();
      const csv = rowsToCsv(
        ['Fecha', 'Acción', 'Entidad', 'Identificador', 'Detalle', 'Origen', 'Actor'],
        state.audit.map(item => [formatDateTime(item.createdAt), item.accion, item.entidad, item.entidadId, item.detalle, item.origen, item.actor])
      );
      downloadBlob(filename('auditoria', 'csv'), csv, 'text/csv;charset=utf-8');
      showToast('Auditoría CSV generada.', 'success');
    } catch (error) { showToast(error.message, 'error'); }
  });

  document.getElementById('btn-export-pdf')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    try {
      requireEvent();
      setBusy(button, true, 'Generando…');
      await exportPdf();
      showToast('Informe PDF generado.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setBusy(button, false);
    }
  });

  document.getElementById('btn-export-backup')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    try {
      requireEvent();
      setBusy(button, true, 'Respaldando…');
      const backup = await createEventBackup(state.activeEventId);
      downloadBlob(filename('respaldo-integral', 'json'), JSON.stringify(backup, null, 2), 'application/json;charset=utf-8');
      showToast('Respaldo integral JSON generado.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setBusy(button, false);
    }
  });

  document.getElementById('backup-file-input')?.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!confirm('El respaldo se restaurará como una temporada y un evento nuevos. No se sobrescribirá el evento actual. ¿Continuar?')) {
      event.target.value = '';
      return;
    }
    try {
      const backup = JSON.parse(await file.text());
      const result = await restoreEventBackup(backup);
      showToast('Respaldo restaurado como evento nuevo.', 'success', 7000);
      callbacks.onRestored?.(result);
    } catch (error) {
      showToast(`No se pudo restaurar: ${error.message}`, 'error', 8000);
    } finally {
      event.target.value = '';
    }
  });
}

async function exportPdf() {
  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) throw new Error('La biblioteca PDF aún no está disponible. Verifica la conexión a Internet e inténtalo nuevamente.');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const event = state.activeEvent;
  const season = state.seasons.find(item => item.id === state.activeSeasonId);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('SGC FEVECO — Informe técnico del evento', 14, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Evento: ${event.nombre}`, 14, 23);
  doc.text(`Temporada: ${season?.nombre || '—'} | Fecha: ${event.fecha || '—'} | Lugar: ${event.lugar || '—'}`, 14, 29);
  doc.text(`Estado: ${event.estado || '—'} | Modalidad: ${event.modalidad || '—'} | Generado: ${new Date().toLocaleString('es-VE')}`, 14, 35);
  doc.setFontSize(8);
  doc.text('Criterios: puntuación; menor número de sanciones; efectividad; saques de puerta. Empates exactos requieren turno de desempate.', 14, 41);

  doc.autoTable({
    startY: 46,
    head: [['#', 'Coleador', 'Categoría', 'Asociación', 'E', 'N', 'Sanc.', 'SP', 'Puntos', 'Efectividad', 'Condición']],
    body: state.results.map(item => [item.posicion, item.nombre, item.categoria, item.asociacion, item.efectivas, item.nulas, item.sanciones, item.saquesPuerta, Number(item.puntos || 0).toFixed(1), `${Number(item.efectividad || 0).toFixed(1)}%`, item.empateExacto ? 'Desempate' : 'Clasificado']),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [26, 26, 46] }
  });

  let nextY = (doc.lastAutoTable?.finalY || 46) + 8;
  if (nextY > 165) { doc.addPage(); nextY = 15; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Nómina activa', 14, nextY);
  doc.autoTable({
    startY: nextY + 4,
    head: [['Cédula', 'Coleador', 'Edad', 'Categoría', 'Asociación', 'Equino', 'Propietario']],
    body: activeParticipants().map(item => [item.cedula, item.nombre, item.edad, item.categoria, item.asociacion, item.equino, item.propietario]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [15, 52, 96] }
  });

  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Integridad de sorteos', 14, 15);
  doc.autoTable({
    startY: 20,
    head: [['Sorteo', 'Algoritmo', 'Registros', 'Hash de entrada', 'Hash de resultado', 'Fecha']],
    body: state.draws.map(item => [item.id, item.algoritmo, item.sourceCount, shortHash(item.sourceHash, 24), shortHash(item.resultHash, 24), formatDateTime(item.createdAt)]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [5, 150, 105] }
  });
  const footerY = (doc.lastAutoTable?.finalY || 20) + 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Documento generado por SGC FEVECO v3.0.0. Auditoría registrada: ${state.audit.length} movimientos.`, 14, footerY);
  doc.save(filename('informe', 'pdf'));
}
