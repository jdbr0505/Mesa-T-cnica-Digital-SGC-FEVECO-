# SGC FEVECO v3.0.0

Sistema modular de mesa técnica para gestionar temporadas, eventos, nóminas, mangas, cómputos, resultados, sorteos verificables, auditoría y respaldos.

## Inicio rápido en Windows

1. Descomprima el proyecto.
2. Ejecute `iniciar_sistema.bat`.
3. Se abrirá `http://localhost:5500/sistema_coleo.html`.

También puede usar Visual Studio Code con **Live Server**. No abra el HTML directamente con `file://`, porque los módulos y fragmentos HTML requieren un servidor local.

## Inicio rápido en Linux o macOS

```bash
chmod +x iniciar_sistema.sh
./iniciar_sistema.sh
```

## Arquitectura

- `sistema_coleo.html`: shell mínimo de la aplicación.
- `partials/`: módulos HTML independientes por pantalla.
- `js/core/`: estado, constantes, utilidades y hash.
- `js/domain/`: reglas puras de puntuación, ranking y sorteos.
- `js/services/`: acceso a Firestore, persistencia, auditoría y respaldo.
- `js/modules/`: controladores y renderizado de interfaz.
- `css/`: estilos heredados y extensiones v3.
- `tests/`: pruebas automatizadas de lógica de negocio.
- `docs/`: copias de la versión original y documentación complementaria.
  - `GUIA_DE_PRUEBAS.md`: evaluación funcional paso a paso.
  - `ESQUEMA_FIRESTORE.md`: estructura de colecciones y documentos.
  - `REPORTE_TECNICO_V3.md`: resumen de la actualización.

## Colecciones creadas automáticamente

Al iniciar, el sistema crea una temporada y un evento inicial solamente cuando la base de datos no contiene ninguno. Las colecciones y subcolecciones se crean automáticamente cuando se utiliza cada función:

```text
temporadas/{temporadaId}
eventos/{eventoId}
  participantes/{cedulaNormalizada}
  indices/cedula_{cedulaNormalizada}
  indices/equino_{equinoNormalizado}
  mangas/{mangaId}
    computos/{participanteId}
  resultados/{participanteId}
  sorteos/primera-salida
  sorteos/segunda-salida
  auditoria/{movimientoId}
auditoria_sistema/{movimientoId}
```

## Alcance de seguridad

Por solicitud expresa, esta actualización **no modifica autenticación ni reglas de seguridad de Firestore**. El sistema seguirá dependiendo de las reglas que ya tenga configuradas el proyecto Firebase. La inmutabilidad de sorteos se aplica en la lógica de la aplicación y se verifica mediante hashes; no impide que un administrador modifique directamente documentos desde la consola de Firebase.

## Migración de la versión anterior

En **Eventos y temporadas**, use **Migrar nómina antigua**. El sistema lee la colección raíz `coleadores`, normaliza la cédula, crea índices de unicidad y copia los registros al evento activo. Los duplicados de cédula o equino se omiten y la operación queda auditada.

## Pruebas automatizadas

Requiere Node.js 20 o superior:

```bash
npm test
```

Las pruebas cubren:

- Puntuación base FEVECO.
- Orden reglamentario del ranking.
- Detección de empates exactos.
- Clasificación por edad y sexo.
- Normalización de cédulas y cálculo de edad.
- Verificación criptográfica del sorteo inicial y detección de alteraciones.
- Orden de mérito y verificación del sorteo de segunda salida.

## Dependencias en línea

- Firebase JavaScript SDK 10.8.0.
- Google Fonts (Inter).
- jsPDF 2.5.1 y jsPDF-AutoTable 3.8.2 para exportar informes PDF.

## Reglamento aplicado

La configuración predeterminada se basa en el Reglamento de Competencia FEVECO, marzo de 2026:

- Coleada efectiva: 1 punto.
- Coleada nula: 0 puntos.
- Sanciones: descuento de puntos según su cantidad registrada.
- Saque de puerta: indicador independiente.
- Desempate del primer lugar: puntuación, sanciones, efectividad y saques de puerta; si continúa el empate, debe efectuarse el turno reglamentario de desempate.

La mesa técnica debe confirmar cualquier disposición transitoria acordada en el congresillo técnico antes de usar el sistema en una competencia oficial.
