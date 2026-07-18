import { DEFAULT_SCORING_RULES } from '../core/constants.js';
import { safeNumber } from '../core/utils.js';

export function calculateScore(entry, rules = DEFAULT_SCORING_RULES) {
  const effective = safeNumber(entry.efectivas);
  const nulls = safeNumber(entry.nulas);
  const sanctions = safeNumber(entry.sanciones);
  const doorStarts = safeNumber(entry.saquesPuerta);
  const points = (effective * rules.effectivePoints) + (nulls * rules.nullPoints) + (sanctions * rules.sanctionPoints) + (doorStarts * rules.doorStartPoints);
  const grossAttempts = effective + nulls;
  const netEffective = Math.max(0, effective - sanctions);
  const effectiveness = grossAttempts > 0 ? Number(((netEffective / grossAttempts) * 100).toFixed(2)) : 0;
  return { efectivas: effective, nulas: nulls, sanciones: sanctions, saquesPuerta: doorStarts, puntos: points, efectivasNetas: netEffective, intentosBrutos: grossAttempts, efectividad: effectiveness };
}

export function aggregateScores(entries, rules = DEFAULT_SCORING_RULES) {
  const total = entries.reduce((acc, entry) => {
    acc.efectivas += safeNumber(entry.efectivas);
    acc.nulas += safeNumber(entry.nulas);
    acc.sanciones += safeNumber(entry.sanciones);
    acc.saquesPuerta += safeNumber(entry.saquesPuerta);
    return acc;
  }, { efectivas: 0, nulas: 0, sanciones: 0, saquesPuerta: 0 });
  return calculateScore(total, rules);
}
