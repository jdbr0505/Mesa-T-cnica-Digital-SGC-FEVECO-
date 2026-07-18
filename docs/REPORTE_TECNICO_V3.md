# Reporte técnico de actualización — SGC FEVECO v3.0.0

## Resumen ejecutivo

La aplicación original era un frontend monolítico conectado directamente a una colección global `coleadores`. La versión 3 reorganiza la aplicación en módulos HTML y JavaScript, introduce temporadas y eventos, persiste mangas y cómputos, calcula resultados acumulados, bloquea duplicados mediante índices transaccionales, registra auditoría, crea sorteos verificables con SHA-256 y agrega exportaciones CSV, PDF y respaldo JSON.

## Cambios implementados

1. **Modularización de HTML**: nueve fragmentos de pantalla cargados desde `partials/`.
2. **Modularización de JavaScript**: núcleo, dominio, servicios y módulos de interfaz.
3. **Temporadas y eventos**: selección global y creación automática de mangas iniciales.
4. **Persistencia de cómputos**: subcolecciones por evento y manga.
5. **Resultados acumulados**: documentos persistentes por participante.
6. **Prevención de duplicados**: índices de cédula y equino dentro de transacciones Firestore.
7. **Auditoría**: bitácora por evento y bitácora de sistema.
8. **Sorteo inicial verificable**: semilla criptográfica, algoritmo determinista, hashes y bloqueo lógico.
9. **Sorteo dinámico verificable**: orden por mérito y hash del resultado.
10. **Desempate**: puntos, sanciones, efectividad y saques de puerta; empate exacto no se resuelve automáticamente.
11. **Categorías 2026**: Destete, Preinfantil, Infantil, Femenino, C, B, A, AA, Máster y Supermaster.
12. **Migración de la colección antigua**: importación idempotente con omisión de duplicados.
13. **Exportaciones**: nómina, resultados y auditoría en CSV; informe PDF; respaldo integral JSON.
14. **Restauración**: crea una copia en una temporada y evento nuevos.
15. **Pruebas automatizadas**: siete pruebas de dominio ejecutadas con Node.

## Exclusiones respetadas

No se implementaron autenticación, roles ni reglas de seguridad de Firestore. La inmutabilidad de los sorteos se aplica en la interfaz y se verifica criptográficamente, pero no sustituye una regla de base de datos que prohíba modificaciones directas.
