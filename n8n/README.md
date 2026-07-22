# Bot de Telegram — SGC FEVECO (n8n)

Chatbot de Telegram con IA (n8n + OpenAI) que consulta estadísticas de la nómina de
coleadores, busca coleadores, inscribe nuevos coleadores y genera un sorteo rápido —
todo hablando directamente contra el Firestore que ya usa `sistema_coleo.html`.

## ⚠️ Actualización: el backend v3 ya llegó — los sub-workflows apuntan a un esquema obsoleto

Este bot se construyó originalmente contra el esquema viejo (colección plana
`coleadores`). El compañero de backend ya subió el sistema v3 completo descrito en
`simulacion.md` (ver `docs/ESQUEMA_FIRESTORE.md`), que reemplaza esa colección por una
jerarquía anidada:

```
eventos/{eventoId}/participantes/{cedulaNormalizada}
eventos/{eventoId}/mangas/{mangaId}/computos/{participanteId}
eventos/{eventoId}/resultados/{participanteId}
eventos/{eventoId}/sorteos/primera-salida | segunda-salida
eventos/{eventoId}/auditoria/{movimientoId}
```

**Los 4 sub-workflows de este bot (`.../coleadores`) ya no coinciden con este esquema y
no funcionarán tal cual contra el proyecto Firebase real.** Antes de usarlos hay que:

1. Elegir el `eventoId` activo (fijo, o resuelto dinámicamente vía una consulta a
   `eventos` filtrando por estado "activo").
2. Cambiar cada URL de Firestore de `documents/coleadores` a
   `documents/eventos/{eventoId}/participantes`.
3. Adaptar los campos leídos en los nodos Code al esquema nuevo (`fechaNacimiento`,
   `sexo`, `asociacion`, campos normalizados, etc. — ver `docs/ESQUEMA_FIRESTORE.md`).
4. La inscripción ahora debe reservar cédula y equino vía los documentos de índice
   (`indices/cedula_...`, `indices/equino_...`) en vez de una simple consulta de
   duplicados — replicar esa transacción o, mejor, exponer un endpoint/Cloud Function en
   el backend que el bot pueda llamar en lugar de escribir directo a Firestore.

Esta sección queda documentada aquí para que quien retome el bot no tenga que
redescubrir el desfase. El resto de este README describe el diseño original (útil como
referencia de arquitectura), pero los ejemplos de rutas de Firestore están desactualizados.

## Qué hacía originalmente vs. qué describe el manual `simulacion.md`

Por eso este bot se construyó originalmente contra la realidad de ese momento:

| Función del bot | Estado |
|---|---|
| Estadísticas y conteos de la nómina | ✅ Funciona ya (lee `coleadores`) |
| Buscar coleador por nombre/cédula | ✅ Funciona ya |
| Inscribir coleador (con cálculo automático de categoría y rechazo de cédula duplicada) | ✅ Funciona ya |
| Sorteo rápido (Coso/Centro/Tapón/Puerta) | ✅ Funciona ya, pero es **referencial**: no se guarda en Firestore porque hoy la app tampoco persiste el sorteo fuera del navegador |
| Cómputos de manga, sanciones, clasificación, segunda salida por mérito | ❌ No implementado — depende de que el otro desarrollador suba el backend v3 a GitHub |
| Temporadas / eventos / mangas múltiples | ❌ No implementado — mismo motivo |
| Auditoría y respaldo JSON | ❌ No implementado — mismo motivo |

Cuando el otro desarrollador suba las colecciones nuevas (`temporadas`, `eventos`,
`mangas`, `computos`, `auditoria`, etc.), solo hay que actualizar las URLs de Firestore
y los campos dentro de los 4 sub-workflows — la arquitectura del bot (Telegram → Agente
IA → herramientas) no cambia. Ver la sección "Cómo extender" al final.

## Arquitectura

```
Telegram ──▶ Telegram Trigger ──▶ AI Agent (OpenAI) ──▶ Responder en Telegram
                                       │  ▲
                          ai_memory ───┘  └─── ai_languageModel
                                       │
                     ┌─────────────────┼─────────────────┬──────────────────┐
                     ▼                 ▼                 ▼                  ▼
             Tool: estadísticas  Tool: buscar     Tool: inscribir     Tool: sorteo rápido
             (sub-workflow)      (sub-workflow)   (sub-workflow)      (sub-workflow)
                     │                 │                 │                  │
                     └─────────────────┴────────► Firestore REST API ◄──────┘
                                          (colección "coleadores")
```

Cada herramienta es un **sub-workflow independiente** (patrón "Call n8n Workflow Tool"),
no un nodo de IA monolítico. Esto permite probar/depurar cada función por separado desde
n8n sin pasar por Telegram, y mantiene la lógica de negocio (duplicados, cálculo de
categoría, barajado Fisher-Yates) fuera del prompt del modelo.

## Archivos

- `workflow-telegram-bot.json` — workflow principal (Telegram + Agente IA).
- `subworkflow-estadisticas.json` — herramienta de conteos/estadísticas.
- `subworkflow-buscar-coleador.json` — herramienta de búsqueda.
- `subworkflow-inscribir-coleador.json` — herramienta de inscripción (con validación).
- `subworkflow-sorteo-rapido.json` — herramienta de sorteo rápido.

## Requisitos previos

1. Una instancia de n8n (cloud o self-hosted) con los nodos de LangChain/AI habilitados
   (vienen incluidos por defecto desde n8n 1.19+).
2. Un bot de Telegram creado con [@BotFather](https://t.me/BotFather) → guarda el token.
3. Una API key de OpenAI (o el proveedor de modelo que prefieras; el workflow usa
   `gpt-4o-mini` por defecto, se puede cambiar en el nodo "OpenAI Chat Model").
4. Una **cuenta de servicio de Google Cloud** con acceso a Firestore del proyecto
   `sgc-feveco-app`:
   - En Google Cloud Console → IAM y administración → Cuentas de servicio → crear una
     cuenta nueva con el rol **Cloud Datastore User** (`roles/datastore.user`) sobre el
     proyecto `sgc-feveco-app`.
   - Genera una clave JSON para esa cuenta de servicio.
   - Importante: al usar la API de Google Cloud (OAuth2 de cuenta de servicio) en vez
     del SDK cliente de Firebase, el bot **no está sujeto a las reglas de seguridad de
     Firestore** que usa `sistema_coleo.html` — actúa con permisos de IAM. Dale a esa
     cuenta de servicio solo el rol necesario (`datastore.user`), nada de "Owner".

## Paso a paso para poner el bot en marcha

### 1. Crear las credenciales en n8n

- **Telegram API**: pega el token de tu bot (obtenido de @BotFather) en la credencial
  "Telegram API" de n8n. No lo pegues en este README ni en ningún archivo del repo.
- **Gemini API** (si usas Gemini en vez de OpenAI como modelo del agente): pega la key
  en la credencial correspondiente de n8n, nunca en archivos versionados en git.
- **Google API (cuenta de servicio)**: en n8n, crea una credencial tipo "Google API"
  (Service Account), pega el JSON de la cuenta de servicio y define el scope:
  `https://www.googleapis.com/auth/datastore`.

### 2. Configurar la variable de entorno del proyecto

En la configuración de n8n (variables de entorno del servidor, o "Variables" en n8n
Cloud), define:

```
FIRESTORE_PROJECT_ID=sgc-feveco-app
```

Todos los sub-workflows usan `{{$env.FIRESTORE_PROJECT_ID}}` para no hardcodear el
project id en cada nodo.

### 3. Importar los sub-workflows primero

Importa, en este orden, y **activa cada uno** (Active = ON, para que quede disponible
como sub-workflow invocable, aunque no tenga trigger propio expuesto):

1. `subworkflow-estadisticas.json`
2. `subworkflow-buscar-coleador.json`
3. `subworkflow-inscribir-coleador.json`
4. `subworkflow-sorteo-rapido.json`

En cada uno, abre los nodos **HTTP Request** (`Obtener Coleadores`, `Verificar Cedula
Duplicada`, `Crear Coleador`) y selecciona tu credencial de Google API recién creada
(el JSON trae un placeholder `REPLACE_WITH_GOOGLE_CREDENTIAL_ID` que no existe en tu
instancia, así que n8n te pedirá reasignarla).

### 4. Importar el workflow principal

Importa `workflow-telegram-bot.json`. Luego:

- En el nodo **Telegram Trigger** y **Responder en Telegram**: asigna tu credencial de
  Telegram.
- En **OpenAI Chat Model**: asigna tu credencial de OpenAI.
- En cada nodo **Herramienta - \***: abre el nodo y, en el campo "From list" del
  workflow, vuelve a seleccionar el sub-workflow correspondiente (los IDs del JSON son
  placeholders `REPLACE_WITH_..._WORKFLOW_ID` porque el ID real solo se asigna al
  importar en tu instancia). Los mapeos de campos con `$fromAI(...)` deberían
  mantenerse; si no aparecen, usa el botón "Add Field" y el ayudante `$fromAI` de n8n
  para recrearlos (los nombres de campo están documentados en cada sub-workflow).

### 5. Activar y probar

- Activa el workflow principal (Active = ON). Esto registra el webhook de Telegram
  automáticamente.
- Escríbele al bot en Telegram, por ejemplo:
  - "¿Cuántos coleadores hay inscritos?"
  - "Búscame a Andrés Morales"
  - "Inscribe a Pedro Gómez, cédula V-11.222.333, 27 años, equino El Trueno, propietario
    Hato La Fe"
  - "Hazme un sorteo rápido"

## Notas de diseño / decisiones tomadas

- **Duplicados**: el `addColeador()` actual en `script.js` **no** valida cédulas
  duplicadas (solo lo describe el manual v3). El sub-workflow de inscripción sí agrega
  esa validación porque es barata y evita ensuciar la nómina vía el bot — puedes quitarla
  si prefieres que el bot se comporte exactamente igual que el formulario web actual.
- **Categoría automática**: igual que `autoCategoria()` en `script.js`, si no se indica
  categoría se calcula por rango de edad.
- **Sorteo rápido**: replica el algoritmo Fisher-Yates de `generarSorteoInicial()`, pero
  es puramente informativo — no escribe nada en Firestore ni bloquea la nómina, porque
  hoy tampoco existe esa persistencia en la app web.
- **Memoria por chat**: cada chat de Telegram tiene su propia ventana de memoria
  (últimos 12 turnos) para que el agente recuerde el contexto de la conversación sin
  mezclar chats distintos.

## Cómo extender cuando llegue el backend v3

Cuando el otro desarrollador suba a GitHub las colecciones nuevas del manual
(`temporadas`, `eventos`, `mangas`, `computos`, `auditoria`, `respaldos`):

1. Duplica `subworkflow-estadisticas.json` como base para nuevas herramientas
   (ej. "estadísticas por evento", "clasificación de una manga").
2. Cambia la URL de Firestore al nuevo path (ej.
   `.../documents/eventos/{eventoId}/mangas/{mangaId}/computos`).
3. Actualiza los campos leídos en el nodo Code según el nuevo esquema de datos.
4. Agrega el nuevo sub-workflow como herramienta adicional en `workflow-telegram-bot.json`
   siguiendo el mismo patrón `toolWorkflow` + `$fromAI(...)`.
5. Actualiza el `systemMessage` del nodo **AI Agent** para que el agente sepa que esas
   funciones ya están disponibles (hoy el prompt le dice explícitamente que no las tiene).
