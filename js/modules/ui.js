import { TAB_TITLES } from '../core/constants.js';
import { escapeHtml } from '../core/utils.js';
import { setState, state } from '../core/state.js';

const PARTIALS = [
  'sidebar', 'topbar', 'tab-eventos', 'tab-registro', 'tab-sorteo1',
  'tab-computos', 'tab-sorteo2', 'tab-estadisticas', 'tab-auditoria', 'tab-exportar'
];

async function fetchPartial(name) {
  const response = await fetch(`./partials/${name}.html?v=3.0.0`);
  if (!response.ok) throw new Error(`No se pudo cargar partials/${name}.html`);
  return response.text();
}

export async function mountShell() {
  if (location.protocol === 'file:') {
    throw new Error('El sistema modular debe abrirse mediante un servidor local. Ejecuta iniciar_sistema.bat o usa Live Server.');
  }
  const html = await Promise.all(PARTIALS.map(fetchPartial));
  const [sidebar, topbar, ...tabs] = html;
  const root = document.getElementById('app-root');
  root.innerHTML = `${sidebar}<main class="main-content">${topbar}<div class="content-body">${tabs.join('')}</div></main>`;
  root.hidden = false;
  document.getElementById('app-loader')?.remove();
}

export function showToast(message, type = 'info', timeout = 4200) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = document.createElement('span');
  icon.className = 'toast-symbol';
  icon.textContent = type === 'success' ? '✓' : type === 'error' ? '!' : type === 'warning' ? '⚠' : 'i';
  const text = document.createElement('span');
  text.textContent = message;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-close';
  close.setAttribute('aria-label', 'Cerrar');
  close.textContent = '×';
  const dismiss = () => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 350);
  };
  close.addEventListener('click', dismiss);
  toast.append(icon, text, close);
  container.appendChild(toast);
  setTimeout(dismiss, timeout);
}

export function bindNavigation() {
  const nav = document.getElementById('nav-menu');
  const sidebar = document.getElementById('sidebar');
  const hamburger = document.getElementById('hamburger');
  const overlay = document.getElementById('overlay');

  const closeMenu = () => {
    sidebar?.classList.remove('open');
    hamburger?.classList.remove('active');
    overlay?.classList.remove('show');
  };
  const toggleMenu = () => {
    sidebar?.classList.toggle('open');
    hamburger?.classList.toggle('active');
    overlay?.classList.toggle('show');
  };
  hamburger?.addEventListener('click', toggleMenu);
  overlay?.addEventListener('click', closeMenu);
  nav?.addEventListener('click', event => {
    const item = event.target.closest('.nav-item');
    if (!item) return;
    switchTab(item.dataset.tab);
    closeMenu();
  });
}

export function switchTab(tabId) {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.tab === tabId));
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.toggle('active', tab.id === `tab-${tabId}`));
  const title = TAB_TITLES[tabId] || 'SGC FEVECO';
  const titleElement = document.getElementById('page-title');
  if (titleElement) titleElement.textContent = title;
  setState({ currentTab: tabId });
}

export function renderContextHeader() {
  const event = state.activeEvent;
  const season = state.seasons.find(item => item.id === state.activeSeasonId);
  const context = document.getElementById('top-context');
  const badge = document.getElementById('event-status-badge');
  if (context) context.textContent = event ? `${event.nombre} · ${event.lugar || 'Sin lugar'} · ${event.fecha || 'Sin fecha'}` : 'Selecciona un evento para comenzar';
  if (badge) {
    badge.textContent = event?.estado?.replaceAll('_', ' ') || 'Sin evento';
    badge.dataset.status = event?.estado || '';
  }
  document.title = event ? `${event.nombre} — SGC FEVECO` : 'SGC FEVECO v3';
  const seasonLabel = season?.nombre ? `${season.nombre}` : 'Sin temporada';
  document.documentElement.dataset.context = escapeHtml(seasonLabel);
}

export function setBusy(button, busy, label = 'Procesando…') {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = label;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

export function fatalError(error) {
  console.error(error);
  const loader = document.getElementById('app-loader');
  if (loader) loader.innerHTML = `<div class="fatal-message"><h2>No fue posible iniciar SGC FEVECO</h2><p>${escapeHtml(error.message || String(error))}</p><p>Consulta el archivo README.md para iniciar el servidor local.</p></div>`;
}
