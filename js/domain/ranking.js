export function compareOfficialMetrics(a, b) {
  return (b.puntos - a.puntos)
    || (a.sanciones - b.sanciones)
    || (b.efectividad - a.efectividad)
    || (b.saquesPuerta - a.saquesPuerta);
}

export function exactOfficialTie(a, b) {
  return a.puntos === b.puntos
    && a.sanciones === b.sanciones
    && a.efectividad === b.efectividad
    && a.saquesPuerta === b.saquesPuerta;
}

export function buildOfficialRanking(results = []) {
  const sorted = [...results].sort((a, b) => compareOfficialMetrics(a, b) || String(a.participanteId).localeCompare(String(b.participanteId)));
  let last = null;
  let lastPosition = 0;
  return sorted.map((item, index) => {
    const tied = last && exactOfficialTie(last, item);
    const position = tied ? lastPosition : index + 1;
    last = item;
    lastPosition = position;
    return { ...item, posicion: position, empateExacto: Boolean(tied || (sorted[index + 1] && exactOfficialTie(item, sorted[index + 1]))) };
  });
}

export function topTieGroup(ranking = []) {
  if (ranking.length < 2) return [];
  const first = ranking[0];
  const group = ranking.filter(item => exactOfficialTie(first, item));
  return group.length > 1 ? group : [];
}
