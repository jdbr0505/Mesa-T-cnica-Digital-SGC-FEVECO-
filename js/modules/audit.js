import { state } from '../core/state.js';
import { escapeHtml, formatDateTime } from '../core/utils.js';
import { showToast } from './ui.js';

let currentFilter = '';

export function bindAuditModule(options = {}) {
  document.getElementById('audit-filter')?.addEventListener('change', event => {
    currentFilter = event.target.value;
    renderAuditModule();
  });
  document.getElementById('btn-refresh-audit')?.addEventListener('click', () => {
    options.onRefresh?.();
    showToast('La auditoría se actualiza en tiempo real.', 'info');
  });
}

export function renderAuditModule() {
  const tbody = document.getElementById('audit-table');
  if (!tbody) return;
  const data = currentFilter ? state.audit.filter(item => String(item.accion || '').includes(currentFilter)) : state.audit;
  tbody.innerHTML = data.map(item => `<tr>
    <td>${escapeHtml(formatDateTime(item.createdAt))}</td>
    <td><span class="audit-action">${escapeHtml(item.accion || '—')}</span></td>
    <td><strong>${escapeHtml(item.entidad || '—')}</strong><br><small>${escapeHtml(item.entidadId || '')}</small></td>
    <td>${escapeHtml(item.detalle || '—')}</td>
    <td>${escapeHtml(item.origen || 'interfaz-v3')}</td>
  </tr>`).join('') || '<tr><td colspan="5" class="empty-cell">No hay registros de auditoría para este filtro.</td></tr>';
}
