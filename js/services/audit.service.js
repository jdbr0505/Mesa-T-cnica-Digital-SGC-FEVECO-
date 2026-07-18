import { db } from '../config/firebase.js';
import { collection, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp } from './firestore.service.js';

export function eventAuditRef(eventId) {
  return collection(db, 'eventos', eventId, 'auditoria');
}

export function buildAudit({ action, entity, entityId = '', detail, before = null, after = null, source = 'interfaz-v3' }) {
  return {
    accion: action,
    entidad: entity,
    entidadId: entityId,
    detalle: detail,
    antes: before,
    despues: after,
    origen: source,
    actor: 'Mesa Técnica',
    createdAt: serverTimestamp()
  };
}

export function appendAuditToBatch(batch, eventId, data) {
  const ref = doc(eventAuditRef(eventId));
  batch.set(ref, buildAudit(data));
  return ref.id;
}

export function appendSystemAuditToBatch(batch, data) {
  const ref = doc(collection(db, 'auditoria_sistema'));
  batch.set(ref, buildAudit(data));
  return ref.id;
}

export async function getEventAudit(eventId) {
  const snapshot = await getDocs(query(eventAuditRef(eventId), orderBy('createdAt', 'desc')));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export function subscribeEventAudit(eventId, callback, errorCallback) {
  const q = query(eventAuditRef(eventId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snapshot => callback(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))), errorCallback);
}
