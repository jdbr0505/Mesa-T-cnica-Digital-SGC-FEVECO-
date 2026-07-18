import { EVENT_STATUS } from '../core/constants.js';
import { state } from '../core/state.js';
import { calculateAge, categoryByAgeAndSex, categoryClass, escapeHtml, getEventReferenceDate } from '../core/utils.js';
import { addParticipant, setParticipantStatus } from '../services/participant.service.js';
import { setBusy, showToast } from './ui.js';

const editableStatuses = new Set([EVENT_STATUS.DRAFT, EVENT_STATUS.REGISTRATION]);

function refreshDerivedFields() {
  const birthDate = document.getElementById('col-fecha-nacimiento')?.value;
  const sex = document.getElementById('col-sexo')?.value || 'M';
  const age = birthDate ? calculateAge(birthDate, getEventReferenceDate(state.activeEvent)) : null;
  const category = age !== null ? categoryByAgeAndSex(age, sex) : '';
  const ageInput = document.getElementById('col-edad');
  const categoryInput = document.getElementById('col-categoria');
  if (ageInput) ageInput.value = age === null ? '' : age;
  if (categoryInput) categoryInput.value = category;
}

export function bindParticipantsModule() {
  document.getElementById('col-fecha-nacimiento')?.addEventListener('change', refreshDerivedFields);
  document.getElementById('col-sexo')?.addEventListener('change', refreshDerivedFields);

  document.getElementById('participant-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!state.activeEventId) return showToast('Selecciona un evento antes de inscribir.', 'warning');
    refreshDerivedFields();
    const age = Number(document.getElementById('col-edad').value);
    const category = document.getElementById('col-categoria').value;
    if (!Number.isInteger(age) || age < 8) return showToast('La edad mínima admitida por la clasificación configurada es 8 años.', 'warning');
    const button = event.submitter;
    try {
      setBusy(button, true, 'Inscribiendo…');
      await addParticipant(state.activeEventId, {
        nombre: document.getElementById('col-nombre').value,
        cedula: document.getElementById('col-cedula').value,
        fechaNacimiento: document.getElementById('col-fecha-nacimiento').value,
        edad: age,
        sexo: document.getElementById('col-sexo').value,
        categoria: category,
        asociacion: document.getElementById('col-asociacion').value,
        equino: document.getElementById('col-equino').value,
        propietario: document.getElementById('col-propietario').value
      });
      const name = document.getElementById('col-nombre').value;
      event.target.reset();
      document.getElementById('col-sexo').value = 'M';
      refreshDerivedFields();
      showToast(`${name} fue inscrito correctamente.`, 'success');
    } catch (error) {
      showToast(error.message, 'error', 6500);
    } finally {
      setBusy(button, false);
    }
  });

  document.getElementById('tabla-nomina')?.addEventListener('click', async event => {
    const button = event.target.closest('[data-participant-action]');
    if (!button) return;
    const participantId = button.dataset.participantId;
    const action = button.dataset.participantAction;
    const participant = state.participants.find(item => item.id === participantId);
    if (!participant) return;
    const nextStatus = action === 'reactivate' ? 'activo' : 'retirado';
    const question = nextStatus === 'retirado' ? `¿Retirar a ${participant.nombre} de la nómina? El registro no será borrado.` : `¿Reactivar a ${participant.nombre}?`;
    if (!confirm(question)) return;
    try {
      setBusy(button, true);
      await setParticipantStatus(state.activeEventId, participantId, nextStatus);
      showToast(`Estado de ${participant.nombre} actualizado a ${nextStatus}.`, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setBusy(button, false);
    }
  });
}

export function renderParticipantsModule(patch = {}) {
  const locked = !editableStatuses.has(state.activeEvent?.estado);
  const form = document.getElementById('participant-form');
  if (form) form.querySelectorAll('input, select, button').forEach(element => { element.disabled = locked; });
  const lockBadge = document.getElementById('registration-lock-badge');
  if (lockBadge) {
    lockBadge.textContent = locked ? 'Nómina bloqueada' : 'Inscripciones abiertas';
    lockBadge.classList.toggle('danger-badge', locked);
    lockBadge.classList.toggle('success-badge', !locked);
  }
  if ('activeEvent' in patch || 'activeEventId' in patch) refreshDerivedFields();

  const tbody = document.getElementById('tabla-nomina');
  if (!tbody) return;
  tbody.innerHTML = state.participants.map(item => {
    const retired = item.estado === 'retirado';
    return `<tr class="${retired ? 'retired-row' : ''}" data-participant-id="${escapeHtml(item.id)}">
      <td><span class="cedula-badge">${escapeHtml(item.cedula || item.id)}</span></td>
      <td><strong>${escapeHtml(item.nombre || '—')}</strong></td>
      <td>${item.edad ?? '—'}</td>
      <td><span class="cat-tag ${categoryClass(item.categoria)}">${escapeHtml(item.categoria || '—')}</span></td>
      <td>${escapeHtml(item.asociacion || '—')}</td>
      <td>${escapeHtml(item.equino || '—')}</td>
      <td>${escapeHtml(item.propietario || '—')}</td>
      <td><span class="status-badge ${retired ? 'danger-badge' : 'success-badge'}">${escapeHtml(item.estado || 'activo')}</span></td>
      <td><button class="btn btn-sm ${retired ? 'btn-secondary' : 'btn-danger'}" type="button" data-participant-action="${retired ? 'reactivate' : 'retire'}" data-participant-id="${escapeHtml(item.id)}" ${locked ? 'disabled' : ''}>${retired ? 'Reactivar' : 'Retirar'}</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="9" class="empty-cell">No hay atletas inscritos en el evento activo.</td></tr>';
  document.getElementById('count-nomina').textContent = state.participants.filter(item => item.estado !== 'retirado').length;
}
