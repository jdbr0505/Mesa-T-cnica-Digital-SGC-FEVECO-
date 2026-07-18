import { db } from '../config/firebase.js';
import { DEFAULT_MANGAS, DEFAULT_SCORING_RULES, EVENT_STATUS } from '../core/constants.js';
import { slugify } from '../core/utils.js';
import { appendSystemAuditToBatch } from './audit.service.js';
import { collection, doc, getDocs, onSnapshot, serverTimestamp, setDoc, writeBatch } from './firestore.service.js';

function mapSnapshot(snapshot) {
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function createSeason(data) {
  const id = `${slugify(data.nombre)}-${data.anio}-${Date.now().toString(36)}`;
  const ref = doc(db, 'temporadas', id);
  const batch = writeBatch(db);
  const season = {
    nombre: data.nombre.trim(),
    anio: Number(data.anio),
    fechaInicio: data.fechaInicio,
    fechaFin: data.fechaFin,
    estado: 'activa',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  batch.set(ref, season);
  appendSystemAuditToBatch(batch, { action: 'CREAR', entity: 'temporada', entityId: id, detail: `Temporada creada: ${season.nombre}`, after: season });
  await batch.commit();
  return id;
}

export async function createEvent(data) {
  const id = `${slugify(data.nombre)}-${data.fecha.replaceAll('-', '')}-${Date.now().toString(36)}`;
  const eventRef = doc(db, 'eventos', id);
  const batch = writeBatch(db);
  const event = {
    temporadaId: data.temporadaId,
    nombre: data.nombre.trim(),
    fecha: data.fecha,
    lugar: data.lugar.trim(),
    modalidad: data.modalidad || 'individual',
    categoria: data.categoria || 'mixta',
    observaciones: data.observaciones?.trim() || '',
    estado: EVENT_STATUS.REGISTRATION,
    reglasPuntuacion: { ...DEFAULT_SCORING_RULES },
    versionSistema: '3.0.0',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  batch.set(eventRef, event);
  for (const manga of DEFAULT_MANGAS) {
    batch.set(doc(db, 'eventos', id, 'mangas', manga.id), { ...manga, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
  appendSystemAuditToBatch(batch, { action: 'CREAR', entity: 'evento', entityId: id, detail: `Evento creado: ${event.nombre}`, after: event });
  await batch.commit();
  return id;
}

export async function createManga(eventId, data) {
  const id = `${slugify(data.nombre)}-${Date.now().toString(36)}`;
  const batch = writeBatch(db);
  batch.set(doc(db, 'eventos', eventId, 'mangas', id), {
    numero: Number(data.numero),
    nombre: data.nombre.trim(),
    tipo: data.tipo || 'manga',
    estado: 'abierta',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  const auditRef = doc(collection(db, 'eventos', eventId, 'auditoria'));
  batch.set(auditRef, {
    accion: 'CREAR', entidad: 'manga', entidadId: id, detalle: `Manga creada: ${data.nombre}`,
    actor: 'Mesa Técnica', origen: 'interfaz-v3', createdAt: serverTimestamp()
  });
  await batch.commit();
  return id;
}

export function subscribeSeasons(callback, errorCallback) {
  return onSnapshot(collection(db, 'temporadas'), snapshot => callback(mapSnapshot(snapshot).sort((a, b) => (b.anio || 0) - (a.anio || 0))), errorCallback);
}

export function subscribeEvents(callback, errorCallback) {
  return onSnapshot(collection(db, 'eventos'), snapshot => callback(mapSnapshot(snapshot).sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')))), errorCallback);
}

export function subscribeMangas(eventId, callback, errorCallback) {
  return onSnapshot(collection(db, 'eventos', eventId, 'mangas'), snapshot => callback(mapSnapshot(snapshot).sort((a, b) => (a.numero || 0) - (b.numero || 0))), errorCallback);
}

export async function getSeasons() {
  return mapSnapshot(await getDocs(collection(db, 'temporadas')));
}

export async function getEvents() {
  return mapSnapshot(await getDocs(collection(db, 'eventos')));
}

export async function getMangas(eventId) {
  return mapSnapshot(await getDocs(collection(db, 'eventos', eventId, 'mangas'))).sort((a, b) => (a.numero || 0) - (b.numero || 0));
}

export async function ensureBootstrap() {
  let seasons = await getSeasons();
  let seasonId = seasons[0]?.id;
  const now = new Date();
  const year = now.getFullYear();
  if (!seasonId) {
    seasonId = `temporada-${year}`;
    await setDoc(doc(db, 'temporadas', seasonId), {
      nombre: `Temporada ${year}`,
      anio: year,
      fechaInicio: `${year}-01-01`,
      fechaFin: `${year}-12-31`,
      estado: 'activa',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      bootstrap: true
    });
    seasons = await getSeasons();
  }

  let events = await getEvents();
  let eventId = events[0]?.id;
  if (!eventId) {
    eventId = await createEvent({
      temporadaId: seasonId,
      nombre: 'Evento inicial',
      fecha: now.toISOString().slice(0, 10),
      lugar: 'Por definir',
      modalidad: 'individual',
      categoria: 'mixta',
      observaciones: 'Evento creado automáticamente durante la actualización a SGC v3.'
    });
    events = await getEvents();
  }
  return { seasonId, eventId, seasons, events };
}
