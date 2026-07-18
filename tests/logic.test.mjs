import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateScore } from '../js/domain/scoring.js';
import { buildOfficialRanking, topTieGroup } from '../js/domain/ranking.js';
import { calculateAge, categoryByAgeAndSex, normalizeId } from '../js/core/utils.js';

test('puntuación FEVECO base', () => {
  const result = calculateScore({ efectivas: 4, nulas: 2, sanciones: 1, saquesPuerta: 3 });
  assert.equal(result.puntos, 3);
  assert.equal(result.efectivasNetas, 3);
  assert.equal(result.efectividad, 50);
});

test('ranking usa puntos, sanciones, efectividad y saque de puerta', () => {
  const ranking = buildOfficialRanking([
    { participanteId: 'B', puntos: 3, sanciones: 1, efectividad: 60, saquesPuerta: 2 },
    { participanteId: 'A', puntos: 3, sanciones: 0, efectividad: 50, saquesPuerta: 0 }
  ]);
  assert.equal(ranking[0].participanteId, 'A');
});

test('empate exacto queda identificado', () => {
  const ranking = buildOfficialRanking([
    { participanteId: 'A', puntos: 2, sanciones: 0, efectividad: 50, saquesPuerta: 1 },
    { participanteId: 'B', puntos: 2, sanciones: 0, efectividad: 50, saquesPuerta: 1 }
  ]);
  assert.equal(topTieGroup(ranking).length, 2);
  assert.equal(ranking[0].posicion, ranking[1].posicion);
});

test('categorías por edad y sexo', () => {
  assert.equal(categoryByAgeAndSex(10, 'M'), 'Destete (Mixto)');
  assert.equal(categoryByAgeAndSex(14, 'F'), 'Preinfantil Femenino');
  assert.equal(categoryByAgeAndSex(35, 'M'), 'A');
  assert.equal(categoryByAgeAndSex(35, 'F'), 'Femenino (Mayores)');
});

test('normalización de cédula y edad', () => {
  assert.equal(normalizeId('V-12.345.678'), 'V12345678');
  assert.equal(calculateAge('2000-07-12', new Date('2026-07-12T00:00:00')), 26);
});

import { createFirstDraw, createSecondDraw, verifyFirstDraw, verifySecondDraw } from '../js/domain/draw-engine.js';

test('sorteo inicial puede verificarse y detecta alteraciones', async () => {
  const participants = [
    { id: 'V1', nombre: 'Ana', equino: 'Lucero', asociacion: 'A', estado: 'activo' },
    { id: 'V2', nombre: 'Bruno', equino: 'Rayo', asociacion: 'B', estado: 'activo' },
    { id: 'V3', nombre: 'Carla', equino: 'Sol', asociacion: 'C', estado: 'activo' },
    { id: 'V4', nombre: 'Diego', equino: 'Trueno', asociacion: 'D', estado: 'activo' }
  ];
  const draw = await createFirstDraw(participants);
  assert.equal((await verifyFirstDraw(draw, participants)).valid, true);
  const tampered = structuredClone(draw);
  tampered.turnos[0].participantes[0].puesto = 'Alterado';
  assert.equal((await verifyFirstDraw(tampered, participants)).valid, false);
});

test('sorteo de segunda salida conserva el orden de mérito y es verificable', async () => {
  const results = [
    { participanteId: 'A', nombre: 'Atleta A', puntos: 4, sanciones: 0, efectividad: 80, saquesPuerta: 1 },
    { participanteId: 'B', nombre: 'Atleta B', puntos: 3, sanciones: 0, efectividad: 75, saquesPuerta: 2 }
  ];
  const draw = await createSecondDraw(results);
  assert.equal(draw.turnos[0].participantes[0].id, 'A');
  assert.equal((await verifySecondDraw(draw, results)).valid, true);
});
