import { state } from '../core/state.js';
import { categoryClass, escapeHtml, formatDateTime, safeNumber } from '../core/utils.js';
import { calculateScore } from '../domain/scoring.js';
import { topTieGroup } from '../domain/ranking.js';
import { saveScores } from '../services/score.service.js';
import { promptCreateManga } from './events.js';
import { setBusy, showToast } from './ui.js';

let callbacks = {};

function readRow(row) {
  const participantId = row.dataset.compId;
  const participant = state.participants.find(item => item.id === participantId);
  return {
    participanteId: participantId,
    nombre: participant?.nombre || participantId,
    efectivas: safeNumber(row.querySelector('[data-field="efectivas"]')?.value),
    nulas: safeNumber(row.querySelector('[data-field="nulas"]')?.value),
    sanciones: safeNumber(row.querySelector('[data-field="sanciones"]')?.value),
    saquesPuerta: safeNumber(row.querySelector('[data-field="saquesPuerta"]')?.value)
  };
}

function updateRowPreview(row) {
  const result = calculateScore(readRow(row), state.activeEvent?.reglasPuntuacion);
  const display = row.querySelector('[data-score-display]');
  const status = row.querySelector('[data-save-status]');
  if (display) {
    display.textContent = result.puntos.toFixed(1);
    display.className = `puntaje-display ${result.puntos < 0 ? 'negative' : result.puntos > 0 ? 'positive' : ''}`;
  }
  if (status) {
    status.textContent = 'Sin guardar';
    status.className = 'save-state dirty';
  }
}

export function bindScoresModule(options = {}) {
  callbacks = options;
  document.getElementById('score-manga-select')?.addEventListener('change', event => callbacks.onMangaChange?.(event.target.value));
  document.getElementById('btn-create-manga')?.addEventListener('click', async event => {
    try {
      setBusy(event.currentTarget, true, 'Creando…');
      const mangaId = await promptCreateManga();
      if (mangaId) callbacks.onMangaChange?.(mangaId);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setBusy(event.currentTarget, false);
    }
  });
  document.getElementById('tabla-computos-body')?.addEventListener('input', event => {
    const input = event.target.closest('.comp-input');
    if (!input) return;
    updateRowPreview(input.closest('tr[data-comp-id]'));
  });
  document.getElementById('btn-save-all-scores')?.addEventListener('click', async event => {
    if (!state.activeEventId || !state.activeMangaId) return showToast('Selecciona un evento y una manga.', 'warning');
    const rows = [...document.querySelectorAll('#tabla-computos-body tr[data-comp-id]')];
    if (!rows.length) return showToast('No hay atletas activos para computar.', 'warning');
    const button = event.currentTarget;
    try {
      setBusy(button, true, 'Guardando…');
      await saveScores(state.activeEventId, state.activeMangaId, rows.map(readRow));
      showToast(`Se guardaron ${rows.length} cómputos y se recalculó el resultado general.`, 'success');
    } catch (error) {
      showToast(error.message, 'error', 6500);
    } finally {
      setBusy(button, false);
    }
  });
}

export function renderScoresModule(patch = {}) {
  const mangaSelect = document.getElementById('score-manga-select');
  if (mangaSelect && ('mangas' in patch || 'activeMangaId' in patch || !mangaSelect.options.length)) {
    mangaSelect.innerHTML = state.mangas.map(item => `<option value="${escapeHtml(item.id)}">${item.numero || ''}. ${escapeHtml(item.nombre)}</option>`).join('') || '<option value="">Sin mangas</option>';
    mangaSelect.value = state.activeMangaId || state.mangas[0]?.id || '';
  }

  if ('participants' in patch || 'scores' in patch || 'activeMangaId' in patch || 'activeEventId' in patch) {
    const scoreMap = new Map(state.scores.map(item => [item.participanteId || item.id, item]));
    const activeParticipants = state.participants.filter(item => item.estado !== 'retirado');
    const tbody = document.getElementById('tabla-computos-body');
    if (tbody) tbody.innerHTML = activeParticipants.map(participant => {
      const score = scoreMap.get(participant.id) || {};
      const computed = calculateScore(score, state.activeEvent?.reglasPuntuacion);
      return `<tr data-comp-id="${escapeHtml(participant.id)}">
        <td><strong>${escapeHtml(participant.nombre)}</strong><br><small class="equino-sub">${escapeHtml(participant.equino || 'Sin equino')} · ${escapeHtml(participant.asociacion || 'Sin asociación')}</small></td>
        <td><input type="number" class="comp-input e-input" data-field="efectivas" min="0" value="${computed.efectivas}"></td>
        <td><input type="number" class="comp-input n-input" data-field="nulas" min="0" value="${computed.nulas}"></td>
        <td><input type="number" class="comp-input a-input" data-field="sanciones" min="0" value="${computed.sanciones}"></td>
        <td><input type="number" class="comp-input sp-input" data-field="saquesPuerta" min="0" value="${computed.saquesPuerta}"></td>
        <td><span class="puntaje-display ${computed.puntos < 0 ? 'negative' : computed.puntos > 0 ? 'positive' : ''}" data-score-display>${computed.puntos.toFixed(1)}</span></td>
        <td><span class="save-state ${score.updatedAt ? 'saved' : 'pending'}" data-save-status title="${escapeHtml(formatDateTime(score.updatedAt))}">${score.updatedAt ? 'Guardado' : 'Pendiente'}</span></td>
      </tr>`;
    }).join('') || '<tr><td colspan="7" class="empty-cell">No hay atletas activos.</td></tr>';
  }

  if ('results' in patch || 'participants' in patch || 'activeEventId' in patch) renderRankingTable();
}

function renderRankingTable() {
  const activeIds = new Set(state.participants.filter(item => item.estado !== 'retirado').map(item => item.id));
  const ranking = state.results.filter(item => activeIds.has(item.participanteId));
  const tbody = document.getElementById('tabla-totales');
  if (tbody) tbody.innerHTML = ranking.map(item => {
    const medal = item.posicion === 1 ? 'gold' : item.posicion === 2 ? 'silver' : item.posicion === 3 ? 'bronze' : '';
    return `<tr class="${item.empateExacto ? 'tie-row' : ''}">
      <td><span class="pos-badge ${medal}">${item.posicion}</span></td>
      <td><strong>${escapeHtml(item.nombre || '—')}</strong></td>
      <td><span class="metric-badge e-badge">${item.efectivas || 0}</span></td>
      <td><span class="metric-badge n-badge">${item.nulas || 0}</span></td>
      <td><span class="metric-badge a-badge">${item.sanciones || 0}</span></td>
      <td><span class="metric-badge sp-badge">${item.saquesPuerta || 0}</span></td>
      <td><strong class="${item.puntos > 0 ? 'pts-gold' : item.puntos < 0 ? 'negative' : ''}">${Number(item.puntos || 0).toFixed(1)}</strong></td>
      <td><span class="eff-badge ${item.efectividad < 50 ? 'eff-low' : ''}">${Number(item.efectividad || 0).toFixed(1)}%</span></td>
      <td>${item.empateExacto ? '<span class="status-badge warning-badge">Empate reglamentario</span>' : '<span class="status-badge success-badge">Clasificado</span>'}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="9" class="empty-cell">Guarda los cómputos para generar la clasificación.</td></tr>';

  const tieGroup = topTieGroup(ranking);
  const warning = document.getElementById('tie-warning');
  if (warning) {
    warning.classList.toggle('hidden', tieGroup.length < 2);
    warning.textContent = tieGroup.length > 1
      ? `Empate exacto en el primer lugar entre ${tieGroup.map(item => item.nombre).join(', ')}. Conforme al artículo 69, se requiere turno de desempate; el sistema no adjudica un ganador automáticamente.`
      : '';
  }
}
