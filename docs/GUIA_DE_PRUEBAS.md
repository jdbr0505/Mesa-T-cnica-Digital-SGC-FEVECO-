# Guía de pruebas funcionales — SGC FEVECO v3.0.0

Esta guía permite evaluar cada mejora de forma aislada. Use preferiblemente un evento de prueba y conserve un respaldo antes de comenzar.

## Preparación

1. Descomprima el proyecto.
2. Ejecute `iniciar_sistema.bat` en Windows o `./iniciar_sistema.sh` en Linux/macOS.
3. Confirme que la dirección sea `http://localhost:5500/sistema_coleo.html` y no una ruta `file://`.
4. Abra las herramientas del navegador y compruebe que no existan errores rojos de JavaScript.

## Prueba 1 — Modularización

1. Abra la pestaña Red del navegador.
2. Recargue la página.
3. Compruebe que se cargan `partials/*.html`, `js/core/*`, `js/domain/*`, `js/services/*` y `js/modules/*`.
4. Navegue por todas las pestañas del menú.

**Resultado esperado:** todas las pantallas se cargan y el sistema no depende del HTML o JavaScript monolítico original.

## Prueba 2 — Temporadas y eventos

1. Cree una temporada con nombre, año y fechas.
2. Cree un evento asociado a esa temporada.
3. Cambie entre temporadas y eventos.
4. Recargue la página.

**Resultado esperado:** la temporada y el evento persisten; el evento contiene las mangas iniciales “Primera salida” y “Segunda salida”.

## Prueba 3 — Prevención de duplicados

1. Inscriba un atleta con una cédula y un equino.
2. Intente inscribir otra vez la misma cédula.
3. Intente inscribir otra persona con el mismo equino.

**Resultado esperado:** la primera inscripción se guarda; los dos intentos duplicados son rechazados con un mensaje claro.

## Prueba 4 — Categoría automática

1. Introduzca una fecha de nacimiento y seleccione el sexo.
2. Cambie la fecha y el sexo varias veces.
3. Observe los campos de edad y categoría.

**Resultado esperado:** ambos campos se recalculan con la fecha del evento y no pueden editarse manualmente.

## Prueba 5 — Migración de nómina antigua

1. Seleccione un evento de prueba vacío.
2. Pulse “Migrar nómina antigua”.
3. Ejecute la migración por segunda vez.

**Resultado esperado:** en la primera ejecución se copian registros válidos desde `coleadores`; en la segunda se omiten los ya importados. El resumen queda en auditoría.

## Prueba 6 — Sorteo inicial verificable

1. Inscriba al menos cuatro atletas.
2. Genere la primera salida.
3. Copie la semilla y los hashes mostrados.
4. Pulse “Verificar integridad”.
5. Intente generar nuevamente el sorteo.

**Resultado esperado:** la verificación indica integridad válida; el segundo intento es rechazado y la nómina queda bloqueada desde la interfaz.

## Prueba 7 — Persistencia de cómputos

1. Abra “Cómputos”.
2. Seleccione una manga e introduzca efectivas, nulas, sanciones y saques de puerta.
3. Pulse “Guardar todos”.
4. Recargue la página y vuelva a la misma manga.

**Resultado esperado:** los valores reaparecen, el estado indica “Guardado” y la clasificación acumulada permanece disponible.

## Prueba 8 — Varias mangas y resultado acumulado

1. Cree una manga adicional.
2. Registre valores distintos en al menos dos mangas.
3. Cambie entre mangas y vuelva a la tabla acumulada.

**Resultado esperado:** cada manga conserva sus datos y el resultado general suma todas las mangas del evento.

## Prueba 9 — Desempate reglamentario

1. Cree dos resultados con igual puntuación, sanciones, efectividad y saques de puerta.
2. Guarde los cómputos.

**Resultado esperado:** ambos comparten posición, aparece “Empate reglamentario” y el sistema solicita un turno de desempate en lugar de declarar un ganador automático.

## Prueba 10 — Segunda salida

1. Con resultados guardados, genere la segunda salida.
2. Revise que el orden corresponda a la clasificación.
3. Pulse “Verificar integridad”.
4. Intente generarla nuevamente.

**Resultado esperado:** el orden de mérito y el hash son verificables; el segundo intento queda bloqueado.

## Prueba 11 — Auditoría

1. Cree un participante, guarde cómputos, retire o reactive un atleta y genere un sorteo.
2. Abra “Auditoría”.
3. Filtre por tipo de acción.

**Resultado esperado:** cada operación aparece con acción, entidad, detalle, fecha, origen y valores relevantes.

## Prueba 12 — Exportación CSV y PDF

1. Exporte nómina, resultados y auditoría en CSV.
2. Abra cada archivo en Excel o LibreOffice.
3. Genere el informe PDF.

**Resultado esperado:** los CSV contienen cabeceras y datos del evento activo; el PDF contiene contexto del evento, clasificación, nómina y huellas de los sorteos.

## Prueba 13 — Respaldo y restauración

1. Genere un respaldo JSON de un evento con datos.
2. Abra el archivo y confirme `schema: "sgc-feveco-backup"` y `schemaVersion: 3`.
3. Importe el mismo archivo desde la pantalla de exportación.
4. Seleccione el evento restaurado.

**Resultado esperado:** se crea una temporada y un evento nuevos; no se sobrescribe el original; se restauran participantes, mangas, cómputos, resultados, sorteos, auditoría, estado y reglas del evento.

## Prueba 14 — Pruebas automatizadas

Desde la carpeta del proyecto ejecute:

```bash
npm test
```

**Resultado esperado:** siete pruebas aprobadas y cero fallidas.

## Límites conocidos del alcance

- No se incorporaron autenticación ni roles.
- No se modificaron reglas de seguridad de Firestore.
- El bloqueo de sorteos es lógico y criptográficamente verificable dentro de la aplicación; un administrador con acceso directo a Firebase todavía puede alterar documentos.
- La prueba completa contra la base remota depende de que las reglas actuales permitan las operaciones de lectura y escritura requeridas.
