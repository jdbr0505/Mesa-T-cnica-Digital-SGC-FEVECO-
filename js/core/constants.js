export const APP_VERSION = '3.0.0';
export const BACKUP_SCHEMA_VERSION = 3;

export const EVENT_STATUS = Object.freeze({
  DRAFT: 'borrador',
  REGISTRATION: 'inscripciones',
  DRAW_1_LOCKED: 'sorteo_1_bloqueado',
  SCORING: 'computos',
  DRAW_2_LOCKED: 'sorteo_2_bloqueado',
  FINISHED: 'finalizado'
});

export const DEFAULT_SCORING_RULES = Object.freeze({
  effectivePoints: 1,
  nullPoints: 0,
  sanctionPoints: -1,
  doorStartPoints: 0,
  effectivenessFormula: 'efectivas_netas / coleadas_totales_brutas * 100',
  regulation: 'Reglamento de Competencia FEVECO, marzo 2026, artículos 45, 67 y 69'
});

export const DEFAULT_MANGAS = Object.freeze([
  { id: 'salida-1', numero: 1, nombre: 'Primera salida', tipo: 'salida', estado: 'abierta' },
  { id: 'salida-2', numero: 2, nombre: 'Segunda salida', tipo: 'salida', estado: 'pendiente' }
]);

export const DRAW_IDS = Object.freeze({ FIRST: 'primera-salida', SECOND: 'segunda-salida' });
export const POSITIONS = Object.freeze(['Coso', 'Centro', 'Tapón', 'Puerta']);

export const TAB_TITLES = Object.freeze({
  eventos: 'Eventos y temporadas',
  registro: 'Registro de atletas y ejemplares',
  sorteo1: 'Sorteo verificable — primera salida',
  computos: 'Cómputos de manga',
  sorteo2: 'Sorteo dinámico — segunda salida',
  estadisticas: 'Resultados y estadísticas',
  auditoria: 'Auditoría de cambios',
  exportar: 'Exportar y respaldar'
});
