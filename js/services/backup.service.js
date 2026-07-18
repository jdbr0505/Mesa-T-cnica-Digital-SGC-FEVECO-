import { db } from '../config/firebase.js';
import { BACKUP_SCHEMA_VERSION } from '../core/constants.js';
import { normalizeId, toIso } from '../core/utils.js';
import { buildAudit, getEventAudit } from './audit.service.js';
import { createEvent, createSeason, getMangas } from './event.service.js';
import { collection, doc, getDoc, getDocs, serverTimestamp, writeBatch } from './firestore.service.js';
import { getParticipants } from './participant.service.js';
import { getAllScores, getResults } from './score.service.js';
import { getDraws } from './draw.service.js';


function omitId(record = {}) {
  const { id: _id, ...rest } = record;
  return rest;
}

function serialize(value) {
  if (value === null || value === undefined) return value ?? null;
  if (value?.toDate) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
  return value;
}

export async function createEventBackup(eventId) {
  const eventSnapshot = await getDoc(doc(db, 'eventos', eventId));
  if (!eventSnapshot.exists()) throw new Error('Evento no encontrado.');
  const event = { id: eventSnapshot.id, ...eventSnapshot.data() };
  const seasonSnapshot = event.temporadaId ? await getDoc(doc(db, 'temporadas', event.temporadaId)) : null;
  const [participants, mangas, scores, results, draws, audit] = await Promise.all([
    getParticipants(eventId), getMangas(eventId), getAllScores(eventId), getResults(eventId), getDraws(eventId), getEventAudit(eventId)
  ]);
  return serialize({
    schema: 'sgc-feveco-backup',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    season: seasonSnapshot?.exists() ? { id: seasonSnapshot.id, ...seasonSnapshot.data() } : null,
    event,
    participants,
    mangas,
    scores,
    results,
    draws,
    audit
  });
}

async function commitChunks(operations, chunkSize = 350) {
  for (let offset = 0; offset < operations.length; offset += chunkSize) {
    const batch = writeBatch(db);
    operations.slice(offset, offset + chunkSize).forEach(operation => operation(batch));
    await batch.commit();
  }
}

export async function restoreEventBackup(backup) {
  if (backup?.schema !== 'sgc-feveco-backup' || Number(backup.schemaVersion) !== BACKUP_SCHEMA_VERSION) {
    throw new Error('El archivo no corresponde a un respaldo compatible con SGC FEVECO v3.');
  }
  const now = new Date();
  const season = backup.season || {};
  const restoredSeasonId = await createSeason({
    nombre: `${season.nombre || `Temporada ${now.getFullYear()}`} — Restaurada`,
    anio: season.anio || now.getFullYear(),
    fechaInicio: season.fechaInicio || `${now.getFullYear()}-01-01`,
    fechaFin: season.fechaFin || `${now.getFullYear()}-12-31`
  });
  const originalEvent = backup.event || {};
  const restoredEventId = await createEvent({
    temporadaId: restoredSeasonId,
    nombre: `${originalEvent.nombre || 'Evento'} — Restaurado`,
    fecha: originalEvent.fecha || now.toISOString().slice(0, 10),
    lugar: originalEvent.lugar || 'Restaurado desde respaldo',
    modalidad: originalEvent.modalidad || 'individual',
    categoria: originalEvent.categoria || 'mixta',
    observaciones: `Restaurado desde respaldo generado el ${backup.generatedAt || 'sin fecha'}. ${originalEvent.observaciones || ''}`
  });

  const operations = [];
  for (const participant of backup.participants || []) {
    const id = participant.id || normalizeId(participant.cedula);
    if (!id) continue;
    operations.push(batch => batch.set(doc(db, 'eventos', restoredEventId, 'participantes', id), {
      ...omitId(participant),
      restoredAt: serverTimestamp(),
      originalCreatedAt: toIso(participant.createdAt)
    }, { merge: true }));
    operations.push(batch => batch.set(doc(db, 'eventos', restoredEventId, 'indices', `cedula_${id}`), { participanteId: id, tipo: 'cedula', valor: id, restoredAt: serverTimestamp() }));
    const horseKey = participant.equinoNormalizado || normalizeId(participant.equino);
    if (horseKey) operations.push(batch => batch.set(doc(db, 'eventos', restoredEventId, 'indices', `equino_${horseKey}`), { participanteId: id, tipo: 'equino', valor: horseKey, nombre: participant.nombre, restoredAt: serverTimestamp() }));
  }
  for (const manga of backup.mangas || []) {
    operations.push(batch => batch.set(doc(db, 'eventos', restoredEventId, 'mangas', manga.id), { ...omitId(manga), restoredAt: serverTimestamp() }, { merge: true }));
  }
  for (const score of backup.scores || []) {
    const mangaId = score.mangaId || 'salida-1';
    const id = score.participanteId || score.id;
    operations.push(batch => batch.set(doc(db, 'eventos', restoredEventId, 'mangas', mangaId, 'computos', id), { ...omitId(score), restoredAt: serverTimestamp() }, { merge: true }));
  }
  for (const result of backup.results || []) {
    const id = result.participanteId || result.id;
    operations.push(batch => batch.set(doc(db, 'eventos', restoredEventId, 'resultados', id), { ...omitId(result), restoredAt: serverTimestamp() }, { merge: true }));
  }
  for (const draw of backup.draws || []) {
    operations.push(batch => batch.set(doc(db, 'eventos', restoredEventId, 'sorteos', draw.id), { ...omitId(draw), restoredAt: serverTimestamp(), restoredFromBackup: true }, { merge: true }));
  }
  for (const item of backup.audit || []) {
    operations.push(batch => batch.set(doc(collection(db, 'eventos', restoredEventId, 'auditoria')), {
      ...omitId(item),
      originalCreatedAt: toIso(item.createdAt),
      createdAt: serverTimestamp(),
      origen: 'restauracion-v3'
    }));
  }

  // Restablece el estado funcional y la configuración del evento después de
  // haber creado la copia aislada. Los identificadores y las fechas técnicas
  // de la copia permanecen nuevos para no sobrescribir el evento original.
  operations.push(batch => batch.set(doc(db, 'eventos', restoredEventId), {
    estado: originalEvent.estado || ((backup.draws || []).some(item => item.id === 'primera-salida') ? 'sorteo_1_bloqueado' : 'inscripciones'),
    ...(originalEvent.reglasPuntuacion ? { reglasPuntuacion: originalEvent.reglasPuntuacion } : {}),
    versionSistema: '3.0.0',
    restoredAt: serverTimestamp(),
    restoredFromEventId: originalEvent.id || null,
    restoredFromBackupAt: backup.generatedAt || null,
    updatedAt: serverTimestamp()
  }, { merge: true }));
  operations.push(batch => batch.set(doc(collection(db, 'eventos', restoredEventId, 'auditoria')), buildAudit({ action: 'RESTAURAR', entity: 'evento', entityId: restoredEventId, detail: `Evento restaurado desde respaldo ${backup.generatedAt || ''}`, after: { originalEventId: originalEvent.id || null } })));
  await commitChunks(operations);
  return { seasonId: restoredSeasonId, eventId: restoredEventId };
}
