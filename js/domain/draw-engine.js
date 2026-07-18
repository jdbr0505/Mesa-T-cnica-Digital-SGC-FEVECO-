import { POSITIONS } from '../core/constants.js';
import { normalizeText } from '../core/utils.js';
import { mulberry32, randomSeed, sha256, stableStringify, xmur3 } from '../core/hash.js';
import { buildOfficialRanking } from './ranking.js';

function canonicalParticipant(participant) {
  return {
    id: participant.id,
    nombre: participant.nombre,
    equino: participant.equino,
    asociacion: participant.asociacion || 'SIN ASOCIACIÓN'
  };
}

function deterministicShuffle(items, seed) {
  const seedFn = xmur3(seed);
  const random = mulberry32(seedFn());
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function makeTurnsAvoidingSameAssociation(shuffled) {
  const pool = [...shuffled];
  const turns = [];
  let conflicts = 0;
  let turnNumber = 1;
  while (pool.length) {
    const group = [];
    const associations = new Set();
    while (group.length < 4 && pool.length) {
      let index = pool.findIndex(item => !associations.has(normalizeText(item.asociacion)));
      if (index === -1) {
        index = 0;
        conflicts += 1;
      }
      const [selected] = pool.splice(index, 1);
      associations.add(normalizeText(selected.asociacion));
      group.push({ ...selected, puesto: POSITIONS[group.length], posicionTurno: group.length + 1 });
    }
    turns.push({ numero: turnNumber, participantes: group });
    turnNumber += 1;
  }
  return { turns, conflicts };
}

export async function createFirstDraw(participants) {
  const source = participants.filter(item => item.estado !== 'retirado').map(canonicalParticipant).sort((a, b) => a.id.localeCompare(b.id));
  const seed = randomSeed();
  const sourceHash = await sha256(source);
  const shuffled = deterministicShuffle(source, seed);
  const { turns, conflicts } = makeTurnsAvoidingSameAssociation(shuffled);
  const resultHash = await sha256(turns);
  return { tipo: 'primera_salida', algoritmo: 'SGC-FY-CONSTRAINTS-v1', semilla: seed, sourceHash, resultHash, sourceCount: source.length, conflictosAsociacion: conflicts, turnos: turns, inmutable: true };
}

export async function verifyFirstDraw(draw, participants) {
  const source = participants.filter(item => item.estado !== 'retirado').map(canonicalParticipant).sort((a, b) => a.id.localeCompare(b.id));
  const sourceHash = await sha256(source);
  const shuffled = deterministicShuffle(source, draw.semilla);
  const { turns } = makeTurnsAvoidingSameAssociation(shuffled);
  const resultHash = await sha256(turns);
  return { valid: sourceHash === draw.sourceHash && resultHash === draw.resultHash && stableStringify(turns) === stableStringify(draw.turnos), sourceHash, resultHash, currentCount: source.length };
}

export async function createSecondDraw(results) {
  const ranking = buildOfficialRanking(results).map(item => ({
    id: item.participanteId,
    nombre: item.nombre,
    equino: item.equino || '',
    asociacion: item.asociacion || 'SIN ASOCIACIÓN',
    puntos: item.puntos,
    sanciones: item.sanciones,
    efectividad: item.efectividad,
    saquesPuerta: item.saquesPuerta,
    empateExacto: item.empateExacto
  }));
  const sourceHash = await sha256(ranking);
  const turns = [];
  for (let i = 0; i < ranking.length; i += 4) {
    turns.push({ numero: Math.floor(i / 4) + 1, participantes: ranking.slice(i, i + 4).map((item, index) => ({ ...item, puesto: POSITIONS[index], posicionTurno: index + 1 })) });
  }
  const resultHash = await sha256(turns);
  return { tipo: 'segunda_salida', algoritmo: 'SGC-MERITO-FEVECO-2026-v1', semilla: null, sourceHash, resultHash, sourceCount: ranking.length, turnos: turns, inmutable: true };
}

export async function verifySecondDraw(draw, results) {
  const regenerated = await createSecondDraw(results);
  return { valid: regenerated.sourceHash === draw.sourceHash && regenerated.resultHash === draw.resultHash && stableStringify(regenerated.turnos) === stableStringify(draw.turnos), sourceHash: regenerated.sourceHash, resultHash: regenerated.resultHash, currentCount: regenerated.sourceCount };
}
