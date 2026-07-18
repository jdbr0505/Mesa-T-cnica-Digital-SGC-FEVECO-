const listeners = new Set();

export const state = {
  seasons: [],
  events: [],
  activeSeasonId: localStorage.getItem('sgc.activeSeasonId') || '',
  activeEventId: localStorage.getItem('sgc.activeEventId') || '',
  activeEvent: null,
  participants: [],
  mangas: [],
  activeMangaId: localStorage.getItem('sgc.activeMangaId') || 'salida-1',
  scores: [],
  results: [],
  draws: [],
  audit: [],
  currentTab: 'eventos',
  subscriptions: []
};

export function setState(patch) {
  Object.assign(state, patch);
  if ('activeSeasonId' in patch) localStorage.setItem('sgc.activeSeasonId', patch.activeSeasonId || '');
  if ('activeEventId' in patch) localStorage.setItem('sgc.activeEventId', patch.activeEventId || '');
  if ('activeMangaId' in patch) localStorage.setItem('sgc.activeMangaId', patch.activeMangaId || 'salida-1');
  listeners.forEach(listener => listener(state, patch));
}

export function subscribeState(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearSubscriptions() {
  state.subscriptions.forEach(unsubscribe => {
    try { unsubscribe?.(); } catch (error) { console.warn('Error cerrando suscripción', error); }
  });
  state.subscriptions = [];
}
