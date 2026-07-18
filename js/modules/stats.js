import { state } from '../core/state.js';
import { categoryClass, escapeHtml } from '../core/utils.js';

export function renderStatsModule() {
  const activeIds = new Set(state.participants.filter(item => item.estado !== 'retirado').map(item => item.id));
  const ranking = state.results.filter(item => activeIds.has(item.participanteId));
  const totals = ranking.reduce((acc, item) => {
    acc.efectivas += Number(item.efectivas || 0);
    acc.nulas += Number(item.nulas || 0);
    acc.sanciones += Number(item.sanciones || 0);
    acc.saquesPuerta += Number(item.saquesPuerta || 0);
    acc.puntos += Number(item.puntos || 0);
    return acc;
  }, { efectivas: 0, nulas: 0, sanciones: 0, saquesPuerta: 0, puntos: 0 });
  const gross = totals.efectivas + totals.nulas;
  const effectiveness = gross > 0 ? Math.max(0, ((totals.efectivas - totals.sanciones) / gross) * 100) : 0;
  const average = ranking.length ? totals.puntos / ranking.length : 0;

  document.getElementById('stat-coleadores').textContent = activeIds.size;
  document.getElementById('stat-efectivas').textContent = totals.efectivas;
  document.getElementById('stat-nulas').textContent = totals.nulas;
  document.getElementById('stat-sp').textContent = totals.saquesPuerta;
  document.getElementById('stat-efectividad').innerHTML = `${effectiveness.toFixed(1)}<span class="stat-unit">%</span>`;
  document.getElementById('stat-promedio').textContent = average.toFixed(2);

  const tbody = document.getElementById('tabla-ranking');
  if (!tbody) return;
  tbody.innerHTML = ranking.map(item => {
    const medal = item.posicion === 1 ? 'gold' : item.posicion === 2 ? 'silver' : item.posicion === 3 ? 'bronze' : '';
    return `<tr class="${item.empateExacto ? 'tie-row' : ''}">
      <td><span class="pos-badge ${medal}">${item.posicion}</span></td>
      <td><strong>${escapeHtml(item.nombre || '—')}</strong><br><small>${escapeHtml(item.asociacion || '—')}</small></td>
      <td><span class="cat-tag ${categoryClass(item.categoria)}">${escapeHtml(item.categoria || '—')}</span></td>
      <td>${item.efectivas || 0}</td><td>${item.nulas || 0}</td><td>${item.sanciones || 0}</td><td>${item.saquesPuerta || 0}</td>
      <td><strong>${Number(item.puntos || 0).toFixed(1)}</strong></td>
      <td><span class="eff-badge ${Number(item.efectividad || 0) < 50 ? 'eff-low' : ''}">${Number(item.efectividad || 0).toFixed(1)}%</span></td>
      <td>${item.empateExacto ? '<span class="status-badge warning-badge">Requiere desempate</span>' : '—'}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="10" class="empty-cell">No hay resultados calculados.</td></tr>';
}
