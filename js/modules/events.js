import { EVENT_STATUS } from '../core/constants.js';
import { state } from '../core/state.js';
import { escapeHtml, formatDate } from '../core/utils.js';
import { createEvent, createManga, createSeason } from '../services/event.service.js';
import { migrateLegacyParticipants } from '../services/participant.service.js';
import { setBusy, showToast } from './ui.js';

let callbacks = {};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function bindEventsModule(options = {}) {
  callbacks = options;
  const year = new Date().getFullYear();
  const seasonYear = document.getElementById('season-year');
  const seasonName = document.getElementById('season-name');
  const seasonStart = document.getElementById('season-start');
  const seasonEnd = document.getElementById('season-end');
  const eventDate = document.getElementById('event-date');
  if (seasonYear) seasonYear.value = year;
  if (seasonName) seasonName.value = `Temporada ${year}`;
  if (seasonStart) seasonStart.value = `${year}-01-01`;
  if (seasonEnd) seasonEnd.value = `${year}-12-31`;
  if (eventDate) eventDate.value = today();

  document.getElementById('season-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter;
    try {
      setBusy(button, true, 'Creando…');
      const id = await createSeason({
        nombre: document.getElementById('season-name').value,
        anio: document.getElementById('season-year').value,
        fechaInicio: document.getElementById('season-start').value,
        fechaFin: document.getElementById('season-end').value
      });
      showToast('Temporada creada correctamente.', 'success');
      callbacks.onSeasonCreated?.(id);
      event.target.reset();
      seasonYear.value = year;
      seasonName.value = `Temporada ${year}`;
      seasonStart.value = `${year}-01-01`;
      seasonEnd.value = `${year}-12-31`;
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setBusy(button, false);
    }
  });

  document.getElementById('event-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter;
    try {
      setBusy(button, true, 'Creando…');
      const eventId = await createEvent({
        temporadaId: document.getElementById('event-season').value,
        nombre: document.getElementById('event-name').value,
        fecha: document.getElementById('event-date').value,
        lugar: document.getElementById('event-location').value,
        modalidad: document.getElementById('event-type').value,
        categoria: document.getElementById('event-category').value,
        observaciones: document.getElementById('event-notes').value
      });
      showToast('Evento y mangas iniciales creados.', 'success');
      event.target.reset();
      document.getElementById('event-date').value = today();
      callbacks.onEventCreated?.(eventId);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setBusy(button, false);
    }
  });

  document.getElementById('global-season-select')?.addEventListener('change', event => callbacks.onSelectSeason?.(event.target.value));
  document.getElementById('global-event-select')?.addEventListener('change', event => callbacks.onSelectEvent?.(event.target.value));

  document.getElementById('season-table')?.addEventListener('click', event => {
    const button = event.target.closest('[data-season-id]');
    if (button) callbacks.onSelectSeason?.(button.dataset.seasonId);
  });
  document.getElementById('event-table')?.addEventListener('click', event => {
    const button = event.target.closest('[data-event-id]');
    if (button) callbacks.onSelectEvent?.(button.dataset.eventId);
  });

  document.getElementById('btn-migrate-legacy')?.addEventListener('click', async event => {
    if (!state.activeEventId) return showToast('Selecciona un evento.', 'warning');
    if (!confirm('La migración copiará la colección antigua "coleadores" al evento activo y omitirá duplicados. ¿Continuar?')) return;
    const button = event.currentTarget;
    try {
      setBusy(button, true, 'Migrando…');
      const result = await migrateLegacyParticipants(state.activeEventId);
      showToast(`Migración completada: ${result.imported} importados y ${result.skipped} omitidos.`, 'success', 6500);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setBusy(button, false);
    }
  });
}

export function renderEventsModule() {
  const seasonSelect = document.getElementById('global-season-select');
  const eventSelect = document.getElementById('global-event-select');
  const eventSeason = document.getElementById('event-season');
  const seasonOptions = state.seasons.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.nombre)} (${item.anio || '—'})</option>`).join('');
  if (seasonSelect) {
    seasonSelect.innerHTML = seasonOptions || '<option value="">Sin temporadas</option>';
    seasonSelect.value = state.activeSeasonId || state.seasons[0]?.id || '';
  }
  if (eventSeason) {
    eventSeason.innerHTML = seasonOptions || '<option value="">Sin temporadas</option>';
    eventSeason.value = state.activeSeasonId || state.seasons[0]?.id || '';
  }

  const filteredEvents = state.events.filter(item => !state.activeSeasonId || item.temporadaId === state.activeSeasonId);
  if (eventSelect) {
    eventSelect.innerHTML = filteredEvents.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.nombre)}</option>`).join('') || '<option value="">Sin eventos</option>';
    eventSelect.value = state.activeEventId || filteredEvents[0]?.id || '';
  }

  const seasonTable = document.getElementById('season-table');
  if (seasonTable) seasonTable.innerHTML = state.seasons.map(item => `
    <tr class="${item.id === state.activeSeasonId ? 'selected-row' : ''}">
      <td><strong>${escapeHtml(item.nombre)}</strong></td><td>${item.anio || '—'}</td>
      <td>${escapeHtml(item.fechaInicio || '—')} — ${escapeHtml(item.fechaFin || '—')}</td>
      <td><span class="status-badge">${escapeHtml(item.estado || 'activa')}</span></td>
      <td><button class="btn btn-sm btn-secondary" type="button" data-season-id="${escapeHtml(item.id)}">Activar</button></td>
    </tr>`).join('') || '<tr><td colspan="5" class="empty-cell">No hay temporadas.</td></tr>';

  const eventTable = document.getElementById('event-table');
  if (eventTable) eventTable.innerHTML = filteredEvents.map(item => {
    const season = state.seasons.find(seasonItem => seasonItem.id === item.temporadaId);
    return `<tr class="${item.id === state.activeEventId ? 'selected-row' : ''}">
      <td><strong>${escapeHtml(item.nombre)}</strong><br><small>${escapeHtml(item.modalidad || 'individual')}</small></td>
      <td>${escapeHtml(season?.nombre || '—')}</td><td>${escapeHtml(item.fecha || '—')}</td>
      <td>${escapeHtml(item.lugar || '—')}</td><td><span class="status-badge" data-status="${escapeHtml(item.estado || '')}">${escapeHtml((item.estado || 'borrador').replaceAll('_', ' '))}</span></td>
      <td><button class="btn btn-sm btn-secondary" type="button" data-event-id="${escapeHtml(item.id)}">Abrir</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" class="empty-cell">No hay eventos en esta temporada.</td></tr>';

  document.getElementById('season-count').textContent = state.seasons.length;
  document.getElementById('event-count').textContent = filteredEvents.length;
  const migrateButton = document.getElementById('btn-migrate-legacy');
  if (migrateButton) {
    const editable = [EVENT_STATUS.DRAFT, EVENT_STATUS.REGISTRATION].includes(state.activeEvent?.estado);
    migrateButton.disabled = !state.activeEventId || !editable;
    migrateButton.title = editable ? 'Copiar la colección antigua al evento activo' : 'La nómina ya está bloqueada por el sorteo inicial';
  }
}

export async function promptCreateManga() {
  if (!state.activeEventId) throw new Error('Selecciona un evento.');
  const name = prompt('Nombre de la nueva manga:', `Manga ${state.mangas.length + 1}`)?.trim();
  if (!name) return null;
  const id = await createManga(state.activeEventId, { nombre: name, numero: state.mangas.length + 1, tipo: 'manga' });
  showToast('Manga creada.', 'success');
  return id;
}
