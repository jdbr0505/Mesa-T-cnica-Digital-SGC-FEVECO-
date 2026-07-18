import { db } from '../config/firebase.js';
import { DRAW_IDS, EVENT_STATUS } from '../core/constants.js';
import { createFirstDraw, createSecondDraw, verifyFirstDraw, verifySecondDraw } from '../domain/draw-engine.js';
import { buildAudit } from './audit.service.js';
import { collection, doc, getDoc, getDocs, onSnapshot, runTransaction, serverTimestamp } from './firestore.service.js';
import { getParticipants } from './participant.service.js';
import { getResults } from './score.service.js';

export function subscribeDraws(eventId, callback, errorCallback) {
  return onSnapshot(collection(db, 'eventos', eventId, 'sorteos'), snapshot => callback(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))), errorCallback);
}

export async function generateFirstDraw(eventId) {
  const participants = (await getParticipants(eventId)).filter(item => item.estado === 'activo');
  if (participants.length < 1) throw new Error('No hay atletas activos para sortear.');
  const draw = await createFirstDraw(participants);
  const drawRef = doc(db, 'eventos', eventId, 'sorteos', DRAW_IDS.FIRST);
  await runTransaction(db, async transaction => {
    const existing = await transaction.get(drawRef);
    if (existing.exists()) throw new Error('El sorteo inicial ya existe y es inmutable desde la aplicación.');
    transaction.set(drawRef, { ...draw, createdAt: serverTimestamp(), lockedAt: serverTimestamp() });
    transaction.set(doc(db, 'eventos', eventId), { estado: EVENT_STATUS.DRAW_1_LOCKED, updatedAt: serverTimestamp(), nominaBloqueadaAt: serverTimestamp() }, { merge: true });
    transaction.set(doc(collection(db, 'eventos', eventId, 'auditoria')), buildAudit({ action: 'SORTEO', entity: 'sorteo', entityId: DRAW_IDS.FIRST, detail: `Sorteo inicial ejecutado para ${participants.length} atletas`, after: { sourceHash: draw.sourceHash, resultHash: draw.resultHash, algoritmo: draw.algoritmo } }));
  });
  return draw;
}

export async function generateSecondDraw(eventId) {
  const results = (await getResults(eventId)).filter(item => item.estadoParticipante !== 'retirado');
  if (!results.length || results.every(item => item.mangasComputadas === 0)) throw new Error('No hay resultados guardados para generar la segunda salida.');
  const draw = await createSecondDraw(results);
  const drawRef = doc(db, 'eventos', eventId, 'sorteos', DRAW_IDS.SECOND);
  await runTransaction(db, async transaction => {
    const existing = await transaction.get(drawRef);
    if (existing.exists()) throw new Error('El sorteo de segunda salida ya existe y es inmutable desde la aplicación.');
    transaction.set(drawRef, { ...draw, createdAt: serverTimestamp(), lockedAt: serverTimestamp() });
    transaction.set(doc(db, 'eventos', eventId), { estado: EVENT_STATUS.DRAW_2_LOCKED, updatedAt: serverTimestamp() }, { merge: true });
    transaction.set(doc(collection(db, 'eventos', eventId, 'auditoria')), buildAudit({ action: 'SORTEO', entity: 'sorteo', entityId: DRAW_IDS.SECOND, detail: `Segunda salida generada para ${results.length} atletas`, after: { sourceHash: draw.sourceHash, resultHash: draw.resultHash, algoritmo: draw.algoritmo } }));
  });
  return draw;
}

export async function verifyStoredDraw(eventId, drawId) {
  const snapshot = await getDoc(doc(db, 'eventos', eventId, 'sorteos', drawId));
  if (!snapshot.exists()) throw new Error('No existe un sorteo para verificar.');
  const draw = { id: snapshot.id, ...snapshot.data() };
  if (drawId === DRAW_IDS.FIRST) return verifyFirstDraw(draw, await getParticipants(eventId));
  return verifySecondDraw(draw, await getResults(eventId));
}

export async function getDraws(eventId) {
  const snapshot = await getDocs(collection(db, 'eventos', eventId, 'sorteos'));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}
