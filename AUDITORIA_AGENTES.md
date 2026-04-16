# Auditoría de Agentes — Multi-Agent Workspace
**Fecha:** 15 Abril 2026 | **Revisado por:** Claude Code

---

## 🔴 BLOQUEANTES — Impiden funcionar ahora mismo

### 1. API sin créditos
- **Síntoma:** Los 4 agentes de auditoría muestran "Error" al lanzar.
- **Causa:** La API key en `.env` no tiene saldo. El servidor recibe HTTP 400: "Your credit balance is too low."
- **Afecta:** Toda llamada a Claude — auditoría, chat y orquestador.
- **Fix:** Recargar créditos en [console.anthropic.com → Billing](https://console.anthropic.com).

---

### 2. No existe tab "Chat" en la UI
- **Síntoma:** No hay forma de hablarle directamente a ningún agente desde la interfaz.
- **Causa:** El endpoint `POST /api/agents/:agentId/chat` existe en `server.js` y funciona con SSE streaming, pero nunca se construyó el tab de chat en `App.jsx`. Los TABS definidos son: `red`, `oficina`, `interacciones`, `briefs`, `auditoria`, `db` — no hay `chat`.
- **Afecta:** 100% del flujo conversacional con Gym PM, Orquestador, Ventas, Finanzas, Procesos.
- **Fix:** Agregar tab `chat` con selector de agente y caja de mensajes que conecte al endpoint existente.

---

## 🟠 DATOS OBSOLETOS — La app muestra información de semana 2

### 3. Header principal desactualizado
- **Archivo:** `App.jsx` línea 1141
- **Texto actual:** `"5 agentes coordinados — Semana 2, Abril 2026"`
- **Realidad:** Estamos en Semana 3 (14–20 Abr).
- **Fix:** Cambiar a "Semana 3" manualmente (o dinamizarlo con `new Date()`).

---

### 4. BriefPanel "Esta Semana" — sigue en semana 2
- **Archivo:** `App.jsx` línea 573
- **Texto actual:** `"Plan Semana 2 — 7 al 13 Abr"` con badge "Semana activa"
- **Realidad:** Las 6 tareas están marcadas `done: true` — es la semana pasada.
- **Fix:** Actualizar el array `weeklyPriorities` del agente Gym con las tareas de semana 3 (están en `server.js` líneas 101–107).

---

### 5. weeklyPriorities del Gym — tareas de semana 2 completadas
- **Archivo:** `App.jsx` líneas 85–93
- **Problema:** Las 6 prioridades tienen `done: true` (semana 2 cerrada). No existen las tareas de semana 3.
- **Tareas semana 3 que faltan agregar** (ya en system prompt de server.js):
  - Programa de capacitación de maestros (Ángel/Pinky, P2)
  - Publicar catálogo de servicios digital (Jesús, P2)
  - Buzón de quejas / QR formulario (Adrián, P2)
  - Cotizar rotulado de paredes y señalética (Pinky, P3)
  - Baby Parkour: reunión de avance (Flavio/Lulú, P2)
  - Seguimiento constitución cooperativa (Jesús, P2)

---

### 6. weeklyPriorities de Finanzas — tareas sin actualizar
- **Archivo:** `App.jsx` líneas 256–261
- **Problema:** 4 tareas con `done: false` pero son objetivos de semana 2 (Clínica Reforma, MercadoPago, Instituto Nezaldi). No refleja el estado real ni las prioridades de semana 3.

---

### 7. INTERACTIONS — solo tiene registros de semana 2
- **Archivo:** `App.jsx` líneas 281–297
- **Problema:** Los 15 mensajes hardcodeados son del 7–13 Abr (semana 2). No hay ninguna interacción de semana 3. La sección "Log de Interacciones" siempre mostrará la misma semana a menos que se edite manualmente el código.

---

### 8. currentFocus de agentes desactualizado
- **Archivo:** `App.jsx`
- `orchestrator.currentFocus`: "Semana 2 cerrada ✓ — Consolidando reporte ejecutivo para PINKY"
- `gym.currentFocus`: "Semana 2 completada ✓ — Preparando plan semana 3"
- Ambos siguen reflejando el estado de la semana pasada.

---

## 🟡 ARQUITECTURA — Limitaciones estructurales

### 9. Gym PM no genera tareas automáticamente
- **Problema:** `weeklyPriorities` es un array estático en `App.jsx`. El agente Gym PM en `server.js` tiene las tareas semana 3 en su system prompt, pero esa información nunca llega a la UI porque no hay conexión entre ambos.
- **Causa raíz:** No hay endpoint que le pregunte al agente "¿cuáles son las tareas de esta semana?" y renderice la respuesta en el tab "Esta semana".
- **Opciones de fix:**
  - A) Botón "Generar brief semanal" que llame al agente y parsee la respuesta.
  - B) Editar manualmente `weeklyPriorities` en `App.jsx` cada semana.

---

### 10. System prompt del Gym — fecha hardcodeada
- **Archivo:** `server.js` línea 91
- **Texto actual:** `ESTADO SEMANA 3 ABRIL 2026 (14–20 Abr)`
- **Problema:** Cuando llegue la semana 4, el agente seguirá creyendo que es semana 3. Hay que editar `server.js` manualmente cada lunes.
- **Fix sugerido:** Usar `new Date()` para calcular dinámicamente la semana y fecha, o añadir un campo en la UI donde Pinky pegue el contexto de la semana cada lunes.

---

### 11. Agente Finanzas no puede leer los archivos reales
- **Archivo:** `server.js` líneas 159–169
- **Problema:** El system prompt lista 10 archivos Excel/CSV como "archivos de referencia (en disco, úsalos como contexto)", pero el servidor nunca los lee. No hay ningún código que lea esos archivos y los inyecte en el contexto del agente.
- **Consecuencia:** El agente solo conoce los datos que están hardcodeados en el system prompt (ingresos 2026, pipeline, precios). Si el Excel cambia, el agente no se entera.
- **Fix:** Leer los CSVs al inicio del servidor e inyectarlos como contexto adicional en los mensajes, o construir un endpoint que parsee y resuma los archivos antes de cada llamada.

---

### 12. INTERACTIONS completamente estáticas
- **Problema:** El log de interacciones es decorativo — no registra las conversaciones reales que ocurren a través del endpoint `/api/agents/:agentId/chat`. Si Pinky chatea con el Orquestador, esa conversación no aparece en el tab "Interacciones".
- **Fix:** Guardar en el historial de `conversations` (ya existe en `server.js`) un log de interacciones inter-agente y exponerlo via endpoint `GET /api/interactions`.

---

## 🔵 BUGS DE CÓDIGO — Menores

### 13. EventSource innecesario en startAudit()
- **Archivo:** `App.jsx` líneas 1023–1026
```js
const es = new EventSource("http://localhost:3001/api/agents/gym/audit");
// EventSource only supports GET — use fetch + ReadableStream instead
es.close();
```
- Se crea y cierra inmediatamente un EventSource sin propósito. No causa error pero es código muerto.
- **Fix:** Eliminar esas 3 líneas.

---

### 14. Numeración de fases del pipeline no coincide entre UI y backend
- **Archivo:** `App.jsx` línea 1043 vs `server.js` líneas 721–727
- **Backend:** CRO = fase 1, Copy = fase 1, SEO = fase 2 (dos fases reales).
- **UI:** Muestra 3 columnas (CRO, Copy, SEO) como si fueran 3 fases separadas.
- **App.jsx:** `const agentPhase = { "gym-cro": 1, "gym-copy": 2, "gym-seo": 3 }` — asigna fase 3 a SEO cuando el backend lo etiqueta como fase 2.
- **Consecuencia:** El indicador visual de progreso puede mostrar "Fase 3" cuando el backend nunca emite un evento de fase 3.

---

## 📋 Resumen de prioridades

| # | Problema | Impacto | Esfuerzo fix |
|---|----------|---------|--------------|
| 1 | API sin créditos | 🔴 Bloquea todo | Inmediato (recargar) |
| 2 | No hay tab Chat | 🔴 Sin interfaz de conversación | Alto (nuevo componente) |
| 3–8 | Datos semana 2 obsoletos | 🟠 Información falsa | Bajo (editar valores) |
| 9 | Gym PM no auto-genera tareas | 🟠 Requiere edición manual semanal | Medio (botón + endpoint) |
| 10 | Fecha hardcodeada en system prompt | 🟡 Desactualización semanal | Bajo (dinámica con JS) |
| 11 | Finanzas no lee archivos reales | 🟡 Agente responde con datos viejos | Alto (parsear archivos) |
| 12 | Interacciones no son reales | 🟡 Tab decorativo | Medio (endpoint nuevo) |
| 13 | EventSource zombie | 🔵 Código muerto | Mínimo (3 líneas) |
| 14 | Fases pipeline descalibradas | 🔵 UI inconsistente | Mínimo (cambiar números) |

---

## ✅ Qué sí funciona bien

- Streaming SSE del backend (`server.js`) — arquitectura correcta.
- Todos los system prompts de los 5 agentes — información completa y bien estructurada.
- Pipeline de auditoría (CRO → Copy → SEO con contexto compartido) — bien diseñado.
- Botón UX se activa solo cuando los 3 anteriores terminan — lógica correcta.
- Historial de conversaciones en memoria por agente (`conversations` object) — funciona.
- Herramientas `web_fetch` y `web_search` en los agentes de auditoría — implementadas correctamente.
- La API key está cargada desde `.env` — configuración correcta.
