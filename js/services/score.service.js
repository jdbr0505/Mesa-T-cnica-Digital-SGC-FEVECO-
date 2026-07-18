import { db } from '../config/firebase.js';
import { DEFAULT_SCORING_RULES, EVENT_STATUS } from '../core/constants.js';
import { aggregateScores, calculateScore } from '../domain/scoring.js';
import { buildOfficialRanking } from '../domain/ranking.js';
import { buildAudit } from './audit.service.js';
import { collection, doc, getDoc, getDocs, onSnapshot, serverTimestamp, writeBatch } from './firestore.service.js';
import { getMangas } from './event.service.js';
import { getParticipants } from './participant.service.js';

export function subscribeScores(eventId, mangaId, callback, errorCallback) {
  return onSnapshot(collection(db, 'eventos', eventId, 'mangas', mangaId, 'computos'), snapshot => {
    callback(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
  }, errorCallback);
}

export function subscribeResults(eventId, callback, errorCallback) {
  return onSnapshot(collection(db, 'eventos', eventId, 'resultados'), snapshot => {
    callback(buildOfficialRanking(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))));
  }, errorCallback);
}

export async function saveScores(eventId, mangaId, entries) {
  const eventSnap = await getDoc(doc(db, 'eventos', eventId));
  if (!eventSnap.exists()) throw new Error('Evento no encontrado.');
  const rules = eventSnap.data().reglasPuntuacion || DEFAULT_SCORING_RULES;
  for (let offset = 0; offset < entries.length; offset += 200) {
    const batch = writeBatch(db);
    for (const entry of entries.slice(offset, offset + 200)) {
      const computed = calculateScore(entry, rules);
      const scoreRef = doc(db, 'eventos', eventId, 'mangas', mangaId, 'computos', entry.participanteId);
      batch.set(scoreRef, {
        participanteId: entry.participanteId,
        mangaId,
        ...computed,
        observacion: entry.observacion || '',
        updatedAt: serverTimestamp(),
        createdAt: entry.createdAt || serverTimestamp()
      }, { merge: true });
      batch.set(doc(collection(db, 'eventos', eventId, 'auditoria')), buildAudit({ action: 'ACTUALIZAR', entity: 'computo', entityId: `${mangaId}:${entry.participanteId}`, detail: `Cómputo guardado para ${entry.nombre || entry.participanteId} en ${mangaId}`, after: computed }));
    }
    batch.set(doc(db, 'eventos', eventId), { estado: EVENT_STATUS.SCORING, updatedAt: serverTimestamp() }, { merge: true });
    await batch.commit();
  }
  await recalculateResults(eventId);
}

export async function recalculateResults(eventId) {
  const [eventSnap, participants, mangas] = await Promise.all([
    getDoc(doc(db, 'eventos', eventId)),
    getParticipants(eventId),
    getMangas(eventId)
  ]);
  const rules = eventSnap.data()?.reglasPuntuacion || DEFAULT_SCORING_RULES;
  const byParticipant = new Map(participants.map(participant => [participant.id, []]));
  for (const manga of mangas) {
    const snapshot = await getDocs(collection(db, 'eventos', eventId, 'mangas', manga.id, 'computos'));
    snapshot.docs.forEach(item => {
      const score = item.data();
      if (!byParticipant.has(score.participanteId)) byParticipant.set(score.participanteId, []);
      byParticipant.get(score.participanteId).push({ ...score, mangaId: manga.id });
    });
  }

  for (let offset = 0; offset < participants.length; offset += 400) {
    const batch = writeBatch(db);
    for (const participant of participants.slice(offset, offset + 400)) {
      const scores = byParticipant.get(participant.id) || [];
      const aggregate = aggregateScores(scores, rules);
      batch.set(doc(db, 'eventos', eventId, 'resultados', participant.id), {
        participanteId: participant.id,
        nombre: participant.nombre,
        categoria: participant.categoria,
        asociacion: participant.asociacion,
        equino: participant.equino,
        propietario: participant.propietario,
        estadoParticipante: participant.estado,
        mangasComputadas: scores.length,
        ...aggregate,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
    await batch.commit();
  }
}

export async function getAllScores(eventId) {
  const mangas = await getMangas(eventId);
  const result = [];
  for (const manga of mangas) {
    const snapshot = await getDocs(collection(db, 'eventos', eventId, 'mangas', manga.id, 'computos'));
    snapshot.docs.forEach(item => result.push({ id: item.id, mangaId: manga.id, ...item.data() }));
  }
  return result;
}

export async function getResults(eventId) {
  const snapshot = await getDocs(collection(db, 'eventos', eventId, 'resultados'));
  return buildOfficialRanking(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
}
