# Esquema Firestore — SGC FEVECO v3.0.0

Firestore no exige crear tablas previamente. Las colecciones se materializan automáticamente al guardar el primer documento.

```text
temporadas/{temporadaId}
  nombre, anio, fechaInicio, fechaFin, estado, createdAt, updatedAt

eventos/{eventoId}
  temporadaId, nombre, fecha, lugar, modalidad, categoria, observaciones,
  estado, reglasPuntuacion, versionSistema, createdAt, updatedAt

  participantes/{cedulaNormalizada}
    nombre, cedula, fechaNacimiento, edad, sexo, categoria, asociacion,
    equino, propietario, estado, campos normalizados, timestamps

  indices/cedula_{cedulaNormalizada}
  indices/equino_{equinoNormalizado}

  mangas/{mangaId}
    numero, nombre, tipo, estado, timestamps

    computos/{participanteId}
      efectivas, nulas, sanciones, saquesPuerta, puntos, efectividad,
      efectivasNetas, intentosBrutos, observacion, timestamps

  resultados/{participanteId}
    identidad desnormalizada, mangasComputadas, totales acumulados,
    puntos, efectividad, estadoParticipante, updatedAt

  sorteos/primera-salida
  sorteos/segunda-salida
    algoritmo, semilla, sourceHash, resultHash, sourceCount, turnos,
    inmutable, createdAt, lockedAt

  auditoria/{movimientoId}
    accion, entidad, entidadId, detalle, antes, despues, actor, origen, createdAt

auditoria_sistema/{movimientoId}
```

## Unicidad

La cédula y el equino se reservan dentro de una transacción mediante documentos de índice. Si el índice ya existe, Firestore cancela la inscripción antes de crear el participante.

## Persistencia acumulada

Los cómputos viven dentro de cada manga. Después de guardar, el servicio recorre las mangas, agrega los valores por participante y actualiza `resultados/{participanteId}`.

## Sorteos

Cada tipo de sorteo utiliza un identificador fijo. La transacción comprueba que el documento no exista antes de crearlo. Los hashes SHA-256 permiten comprobar que la nómina fuente y el resultado no hayan cambiado.
