import { DRAW_IDS } from '../core/constants.js';
import { state } from '../core/state.js';
import { escapeHtml, formatDateTime, shortHash } from '../core/utils.js';
import { generateFirstDraw, generateSecondDraw, verifyStoredDraw } from '../services/draw.service.js';
import { setBusy, showToast } from './ui.js';

function drawById(id) {
  return state.draws.find(item => item.id === id);
}

function positionClass(position = '') {
  const value = position.toLowerCase();
  if (value.includes('coso')) return 'coso';
  if (value.includes('centro')) return 'centro';
  if (value.includes('tapón') || value.includes('tapon')) return 'tapon';
  return 'puerta';
}

function renderTurns(draw, containerId, second = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!draw?.turnos?.length) {
    container.innerHTML = '<div class="empty-cell">No hay turnos almacenados.</div>';
    return;
  }
  container.innerHTML = draw.turnos.map(turn => `<div class="turno-block ${second && turn.numero === 1 ? 'elite-block' : ''}">
    <div class="turno-header ${second && turn.numero === 1 ? 'elite-header' : ''}">
      <span><span class="turno-num">${second && turn.numero === 1 ? 'TURNO DE MÉRITO' : `TURNO ${turn.numero}`}</span></span>
      <span class="turno-metric">${turn.participantes.length} atletas</span>
    </div>
    <div class="turno-body"><div class="table-responsive"><table><thead><tr><th>Puesto</th><th>Coleador</th><th>Asociación</th><th>Equino</th>${second ? '<th>Puntos previos</th><th>Condición</th>' : ''}</tr></thead><tbody>
      ${turn.participantes.map(item => `<tr>
        <td><span class="puesto-badge ${positionClass(item.puesto)}">${item.posicionTurno}. ${escapeHtml(item.puesto)}</span></td>
        <td><strong>${escapeHtml(item.nombre || '—')}</strong></td>
        <td>${escapeHtml(item.asociacion || '—')}</td>
        <td>${escapeHtml(item.equino || '—')}</td>
        ${second ? `<td><strong>${Number(item.puntos || 0).toFixed(1)}</strong></td><td>${item.empateExacto ? '<span class="warning-badge status-badge">Empate</span>' : '—'}</td>` : ''}
      </tr>`).join('')}
    </tbody></table></div></div>
  </div>`).join('');
}

function renderMetadata(draw, elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.classList.toggle('hidden', !draw);
  if (!draw) {
    element.innerHTML = '';
    return;
  }
  element.innerHTML = `
    <div><strong>Algoritmo</strong><span>${escapeHtml(draw.algoritmo || '—')}</span></div>
    <div><strong>Registros</strong><span>${draw.sourceCount || 0}</span></div>
    <div><strong>Hash de entrada</strong><code title="${escapeHtml(draw.sourceHash || '')}">${escapeHtml(shortHash(draw.sourceHash))}</code></div>
    <div><strong>Hash del resultado</strong><code title="${escapeHtml(draw.resultHash || '')}">${escapeHtml(shortHash(draw.resultHash))}</code></div>
    <div><strong>Fecha</strong><span>${escapeHtml(formatDateTime(draw.createdAt))}</span></div>
    ${draw.semilla ? `<div><strong>Semilla</strong><code title="${escapeHtml(draw.semilla)}">${escapeHtml(shortHash(draw.semilla))}</code></div>` : ''}
    ${Number.isFinite(draw.conflictosAsociacion) ? `<div><strong>Conflictos inevitables</strong><span>${draw.conflictosAsociacion}</span></div>` : ''}`;
}

async function verify(drawId, button) {
  if (!state.activeEventId) return showToast('Selecciona un evento.', 'warning');
  try {
    setBusy(button, true, 'Verificando…');
    const result = await verifyStoredDraw(state.activeEventId, drawId);
    if (result.valid) showToast('Integridad verificada: la nómina, el orden y los hashes coinciden.', 'success', 6000);
    else showToast(`Verificación fallida. Hash actual: ${shortHash(result.resultHash)}. Revisa si la nómina o los datos fueron alterados.`, 'error', 8000);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    setBusy(button, false);
  }
}

export function bindDrawsModule() {
  document.getElementById('btn-generate-draw-1')?.addEventListener('click', async event => {
    if (!state.activeEventId) return showToast('Selecciona un evento.', 'warning');
    if (!confirm('Al generar el sorteo inicial la nómina quedará bloqueada en la aplicación. ¿Continuar?')) return;
    const button = event.currentTarget;
    try {
      setBusy(button, true, 'Sorteando…');
      await generateFirstDraw(state.activeEventId);
      showToast('Sorteo inicial generado, registrado con huellas SHA-256 y bloqueado.', 'success', 6000);
    } catch (error) {
      showToast(error.message, 'error', 7000);
    } finally {
      setBusy(button, false);
    }
  });
  document.getElementById('btn-verify-draw-1')?.addEventListener('click', event => verify(DRAW_IDS.FIRST, event.currentTarget));

  document.getElementById('btn-generate-draw-2')?.addEventListener('click', async event => {
    if (!state.activeEventId) return showToast('Selecciona un evento.', 'warning');
    const button = event.currentTarget;
    try {
      setBusy(button, true, 'Generando…');
      await generateSecondDraw(state.activeEventId);
      showToast('Segunda salida generada y almacenada con hash verificable.', 'success', 6000);
    } catch (error) {
      showToast(error.message, 'error', 7000);
    } finally {
      setBusy(button, false);
    }
  });
  document.getElementById('btn-verify-draw-2')?.addEventListener('click', event => verify(DRAW_IDS.SECOND, event.currentTarget));
}

export function renderDrawsModule() {
  const first = drawById(DRAW_IDS.FIRST);
  const second = drawById(DRAW_IDS.SECOND);
  const firstSection = document.getElementById('resultados-sorteo-1');
  const secondSection = document.getElementById('resultados-sorteo-2');
  firstSection?.classList.toggle('hidden', !first);
  secondSection?.classList.toggle('hidden', !second);
  renderMetadata(first, 'draw-1-metadata');
  renderMetadata(second, 'draw-2-metadata');
  renderTurns(first, 'turno-container-1', false);
  renderTurns(second, 'turno-container-2', true);

  const generateFirst = document.getElementById('btn-generate-draw-1');
  const verifyFirst = document.getElementById('btn-verify-draw-1');
  const generateSecond = document.getElementById('btn-generate-draw-2');
  const verifySecond = document.getElementById('btn-verify-draw-2');
  if (generateFirst) generateFirst.disabled = Boolean(first) || !state.participants.some(item => item.estado === 'activo');
  if (verifyFirst) verifyFirst.disabled = !first;
  if (generateSecond) generateSecond.disabled = Boolean(second) || !state.results.some(item => item.mangasComputadas > 0);
  if (verifySecond) verifySecond.disabled = !second;
}
