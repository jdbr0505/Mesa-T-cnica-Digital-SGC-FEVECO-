import { setState, state, subscribeState } from './core/state.js';
import { ensureBootstrap, subscribeEvents, subscribeMangas, subscribeSeasons } from './services/event.service.js';
import { subscribeParticipants } from './services/participant.service.js';
import { subscribeResults, subscribeScores } from './services/score.service.js';
import { subscribeDraws } from './services/draw.service.js';
import { subscribeEventAudit } from './services/audit.service.js';
import { bindNavigation, fatalError, mountShell, renderContextHeader, showToast } from './modules/ui.js';
import { bindEventsModule, renderEventsModule } from './modules/events.js';
import { bindParticipantsModule, renderParticipantsModule } from './modules/participants.js';
import { bindScoresModule, renderScoresModule } from './modules/scores.js';
import { bindDrawsModule, renderDrawsModule } from './modules/draws.js';
import { renderStatsModule } from './modules/stats.js';
import { bindAuditModule, renderAuditModule } from './modules/audit.js';
import { bindExportsModule } from './modules/exports.js';

let globalUnsubs = [];
let eventUnsubs = [];
let scoreUnsub = null;
let activeSubscriptionEventId = '';
let pendingEventId = '';

function handleFirestoreError(error) {
  console.error(error);
  const message = error?.code === 'permission-denied'
    ? 'Firebase rechazó la operación por permisos. Esta versión no modifica reglas de seguridad, según el alcance solicitado.'
    : `Error de Firebase: ${error.message || error}`;
  showToast(message, 'error', 9000);
}

function clearEventSubscriptions() {
  eventUnsubs.forEach(unsubscribe => {
    try { unsubscribe?.(); } catch (error) { console.warn(error); }
  });
  eventUnsubs = [];
  if (scoreUnsub) {
    try { scoreUnsub(); } catch (error) { console.warn(error); }
    scoreUnsub = null;
  }
}

function activateManga(mangaId) {
  const selected = mangaId || state.mangas[0]?.id || '';
  setState({ activeMangaId: selected, scores: [] });
  if (scoreUnsub) scoreUnsub();
  scoreUnsub = null;
  if (state.activeEventId && selected) {
    scoreUnsub = subscribeScores(state.activeEventId, selected, scores => setState({ scores }), handleFirestoreError);
  }
}

function activateEvent(eventId) {
  const event = state.events.find(item => item.id === eventId);
  if (!event) return;
  if (activeSubscriptionEventId === eventId) {
    setState({ activeEventId: eventId, activeSeasonId: event.temporadaId, activeEvent: event });
    return;
  }
  clearEventSubscriptions();
  activeSubscriptionEventId = eventId;
  setState({
    activeEventId: eventId,
    activeSeasonId: event.temporadaId,
    activeEvent: event,
    participants: [], mangas: [], scores: [], results: [], draws: [], audit: []
  });

  eventUnsubs.push(subscribeParticipants(eventId, participants => setState({ participants }), handleFirestoreError));
  eventUnsubs.push(subscribeMangas(eventId, mangas => {
    setState({ mangas });
    const mangaId = mangas.some(item => item.id === state.activeMangaId) ? state.activeMangaId : mangas[0]?.id || '';
    if (mangaId !== state.activeMangaId || !scoreUnsub) activateManga(mangaId);
  }, handleFirestoreError));
  eventUnsubs.push(subscribeResults(eventId, results => setState({ results }), handleFirestoreError));
  eventUnsubs.push(subscribeDraws(eventId, draws => setState({ draws }), handleFirestoreError));
  eventUnsubs.push(subscribeEventAudit(eventId, audit => setState({ audit }), handleFirestoreError));
}

function selectSeason(seasonId) {
  const events = state.events.filter(item => item.temporadaId === seasonId);
  setState({ activeSeasonId: seasonId });
  if (!events.some(item => item.id === state.activeEventId)) {
    if (events[0]) activateEvent(events[0].id);
    else setState({ activeEventId: '', activeEvent: null, participants: [], mangas: [], scores: [], results: [], draws: [], audit: [] });
  }
}

function requestEventActivation(eventId) {
  pendingEventId = eventId;
  const exists = state.events.some(item => item.id === eventId);
  if (exists) {
    pendingEventId = '';
    activateEvent(eventId);
  }
}

function bindAllModules() {
  bindNavigation();
  bindEventsModule({
    onSelectSeason: selectSeason,
    onSelectEvent: activateEvent,
    onSeasonCreated: seasonId => setState({ activeSeasonId: seasonId }),
    onEventCreated: requestEventActivation
  });
  bindParticipantsModule();
  bindScoresModule({ onMangaChange: activateManga });
  bindDrawsModule();
  bindAuditModule();
  bindExportsModule({ onRestored: result => {
    setState({ activeSeasonId: result.seasonId });
    requestEventActivation(result.eventId);
  }});
}

function bindRenders() {
  subscribeState((_current, patch) => {
    renderEventsModule();
    renderContextHeader();
    renderParticipantsModule(patch);
    renderScoresModule(patch);
    renderDrawsModule();
    renderStatsModule();
    renderAuditModule();
  });
}

async function start() {
  await mountShell();
  bindAllModules();
  bindRenders();
  const bootstrap = await ensureBootstrap();
  if (!state.activeSeasonId) setState({ activeSeasonId: bootstrap.seasonId });
  if (!state.activeEventId) setState({ activeEventId: bootstrap.eventId });

  globalUnsubs.push(subscribeSeasons(seasons => {
    const activeSeasonId = seasons.some(item => item.id === state.activeSeasonId) ? state.activeSeasonId : seasons[0]?.id || '';
    setState({ seasons, activeSeasonId });
  }, handleFirestoreError));

  globalUnsubs.push(subscribeEvents(events => {
    setState({ events });
    if (pendingEventId && events.some(item => item.id === pendingEventId)) {
      const id = pendingEventId;
      pendingEventId = '';
      activateEvent(id);
      return;
    }
    const requested = state.activeEventId || bootstrap.eventId;
    const selected = events.find(item => item.id === requested)
      || events.find(item => item.temporadaId === state.activeSeasonId)
      || events[0];
    if (selected) activateEvent(selected.id);
  }, handleFirestoreError));

  window.addEventListener('beforeunload', () => {
    clearEventSubscriptions();
    globalUnsubs.forEach(unsubscribe => unsubscribe?.());
  });
  showToast('SGC FEVECO v3 inicializado. La base de datos se organiza automáticamente por eventos.', 'success', 5500);
}

start().catch(fatalError);
