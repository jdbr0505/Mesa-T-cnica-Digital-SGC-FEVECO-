import { db } from '../config/firebase.js';
import { EVENT_STATUS } from '../core/constants.js';
import { normalizeId, normalizeText } from '../core/utils.js';
import { buildAudit } from './audit.service.js';
import { collection, doc, getDoc, getDocs, onSnapshot, runTransaction, serverTimestamp, writeBatch } from './firestore.service.js';

const editableStatuses = new Set([EVENT_STATUS.DRAFT, EVENT_STATUS.REGISTRATION]);

function participantRef(eventId, participantId) {
  return doc(db, 'eventos', eventId, 'participantes', participantId);
}

function indexRef(eventId, type, value) {
  return doc(db, 'eventos', eventId, 'indices', `${type}_${value}`);
}

export async function addParticipant(eventId, participant) {
  const participantId = normalizeId(participant.cedula);
  const horseKey = normalizeId(participant.equino);
  if (!participantId) throw new Error('La cédula no es válida.');
  if (!horseKey) throw new Error('El nombre del equino no es válido.');

  await runTransaction(db, async transaction => {
    const eventRef = doc(db, 'eventos', eventId);
    const personIndex = indexRef(eventId, 'cedula', participantId);
    const horseIndex = indexRef(eventId, 'equino', horseKey);
    const [eventSnap, personIndexSnap, horseIndexSnap] = await Promise.all([
      transaction.get(eventRef), transaction.get(personIndex), transaction.get(horseIndex)
    ]);
    if (!eventSnap.exists()) throw new Error('El evento activo no existe.');
    if (!editableStatuses.has(eventSnap.data().estado)) throw new Error('La nómina está bloqueada porque el primer sorteo ya fue ejecutado.');
    if (personIndexSnap.exists()) throw new Error('Ya existe un atleta con esa cédula en el evento.');
    if (horseIndexSnap.exists()) throw new Error(`El equino ya está asignado a ${horseIndexSnap.data().nombre || 'otro atleta'} en este evento.`);

    const record = {
      ...participant,
      cedula: participant.cedula.trim(),
      cedulaNormalizada: participantId,
      nombre: participant.nombre.trim(),
      nombreNormalizado: normalizeText(participant.nombre),
      asociacion: participant.asociacion.trim(),
      asociacionNormalizada: normalizeText(participant.asociacion),
      equino: participant.equino.trim(),
      equinoNormalizado: horseKey,
      propietario: participant.propietario.trim(),
      estado: 'activo',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    transaction.set(participantRef(eventId, participantId), record);
    transaction.set(personIndex, { participanteId: participantId, tipo: 'cedula', valor: participantId, createdAt: serverTimestamp() });
    transaction.set(horseIndex, { participanteId: participantId, tipo: 'equino', valor: horseKey, nombre: record.nombre, createdAt: serverTimestamp() });
    transaction.set(doc(collection(db, 'eventos', eventId, 'auditoria')), buildAudit({ action: 'CREAR', entity: 'participante', entityId: participantId, detail: `Inscripción de ${record.nombre}`, after: { ...record, createdAt: null, updatedAt: null } }));
  });
  return participantId;
}

export async function setParticipantStatus(eventId, participantId, status) {
  await runTransaction(db, async transaction => {
    const eventRef = doc(db, 'eventos', eventId);
    const pRef = participantRef(eventId, participantId);
    const [eventSnap, participantSnap] = await Promise.all([transaction.get(eventRef), transaction.get(pRef)]);
    if (!eventSnap.exists() || !participantSnap.exists()) throw new Error('No se encontró el registro.');
    if (!editableStatuses.has(eventSnap.data().estado)) throw new Error('La nómina está bloqueada por el sorteo inicial.');
    const before = participantSnap.data();
    transaction.update(pRef, { estado: status, updatedAt: serverTimestamp() });
    transaction.set(doc(collection(db, 'eventos', eventId, 'auditoria')), buildAudit({ action: status === 'retirado' ? 'RETIRAR' : 'ACTUALIZAR', entity: 'participante', entityId: participantId, detail: `${before.nombre}: estado ${status}`, before: { estado: before.estado }, after: { estado: status } }));
  });
}

export function subscribeParticipants(eventId, callback, errorCallback) {
  return onSnapshot(collection(db, 'eventos', eventId, 'participantes'), snapshot => {
    const data = snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
    callback(data);
  }, errorCallback);
}

export async function getParticipants(eventId) {
  const snapshot = await getDocs(collection(db, 'eventos', eventId, 'participantes'));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function migrateLegacyParticipants(eventId) {
  const eventSnapshot = await getDoc(doc(db, 'eventos', eventId));
  if (!eventSnapshot.exists()) throw new Error('El evento activo no existe.');
  if (!editableStatuses.has(eventSnapshot.data().estado)) throw new Error('La migración no puede modificar una nómina bloqueada por el sorteo inicial.');
  const legacy = await getDocs(collection(db, 'coleadores'));
  if (legacy.empty) return { imported: 0, skipped: 0 };
  let imported = 0;
  let skipped = 0;
  const records = legacy.docs.map(item => ({ legacyId: item.id, ...item.data() }));
  const seenParticipants = new Set();
  const seenHorses = new Set();
  for (let offset = 0; offset < records.length; offset += 120) {
    const batch = writeBatch(db);
    for (const item of records.slice(offset, offset + 120)) {
      const id = normalizeId(item.cedula) || `LEGACY${normalizeId(item.legacyId)}`;
      const pRef = participantRef(eventId, id);
      const horseKey = normalizeId(item.equino || `EQUINO-${item.legacyId}`);
      const horseIdxRef = indexRef(eventId, 'equino', horseKey);
      const [participantExists, horseExists] = await Promise.all([getDoc(pRef), getDoc(horseIdxRef)]);
      if (participantExists.exists() || horseExists.exists() || seenParticipants.has(id) || seenHorses.has(horseKey)) { skipped += 1; continue; }
      seenParticipants.add(id);
      seenHorses.add(horseKey);
      const record = {
        nombre: item.nombre || 'Sin nombre',
        nombreNormalizado: normalizeText(item.nombre || ''),
        cedula: item.cedula || id,
        cedulaNormalizada: id,
        fechaNacimiento: null,
        edad: Number(item.edad) || null,
        sexo: 'M',
        categoria: item.categoria || 'Sin categoría',
        asociacion: item.asociacion || 'SIN ASOCIACIÓN',
        asociacionNormalizada: normalizeText(item.asociacion || 'SIN ASOCIACIÓN'),
        equino: item.equino || 'Sin equino',
        equinoNormalizado: horseKey,
        propietario: item.propietario || 'Sin propietario',
        estado: 'activo',
        origen: 'migracion_v2',
        legacyId: item.legacyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      batch.set(pRef, record);
      batch.set(indexRef(eventId, 'cedula', id), { participanteId: id, tipo: 'cedula', valor: id, createdAt: serverTimestamp() });
      batch.set(horseIdxRef, { participanteId: id, tipo: 'equino', valor: horseKey, nombre: record.nombre, createdAt: serverTimestamp() });
      imported += 1;
    }
    await batch.commit();
  }
  const auditBatch = writeBatch(db);
  auditBatch.set(doc(collection(db, 'eventos', eventId, 'auditoria')), buildAudit({ action: 'MIGRAR', entity: 'participantes', detail: `Migración desde colección coleadores: ${imported} importados, ${skipped} omitidos`, after: { imported, skipped } }));
  await auditBatch.commit();
  return { imported, skipped };
}
