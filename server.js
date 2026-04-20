import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import cron from "node-cron";
import { createConnection } from "net";

// Leer .env manualmente — garantiza que la key está disponible sin importar el orden ESM
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envContent = readFileSync(resolve(__dirname, ".env"), "utf8");
  for (const line of envContent.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch { /* .env opcional */ }

const RENDER_PATH        = "C:/Users/alex/AppData/Local/Temp/office_blender_render.png";
const RENDER_PATH_WEAPES = "C:/Users/alex/AppData/Local/Temp/office_weapes_render.png";
const RENDER_PATH_WOODSPA = "C:/Users/alex/AppData/Local/Temp/office_woodspa_render.png";

const app = express();
app.use(cors());
app.use(express.json());

// ── Blender routes ───────────────────────────────────────────────────────────
app.post("/api/blender/run", async (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== "string") return res.status(400).json({ error: "Missing code" });
  try {
    const result = await executeBlender(code);
    if (result.status !== "ok") return res.status(500).json({ error: result.message ?? "Blender error" });
    res.json({ ok: true, stdout: result.stdout ?? "" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/blender/office", async (_req, res) => {
  try {
    const blenderResult = await executeBlender(generateOfficeScript());
    if (blenderResult.status !== "ok") return res.status(500).json({ error: blenderResult.message ?? "Blender error" });
    const imgBuffer = readFileSync(RENDER_PATH);
    res.json({ ok: true, image: imgBuffer.toString("base64") });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/blender/office/weapes", async (_req, res) => {
  try {
    const blenderResult = await executeBlender(generateWeapesScript());
    if (blenderResult.status !== "ok") return res.status(500).json({ error: blenderResult.message ?? "Blender error" });
    const imgBuffer = readFileSync(RENDER_PATH_WEAPES);
    res.json({ ok: true, image: imgBuffer.toString("base64") });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/blender/office/woodspa", async (_req, res) => {
  try {
    const blenderResult = await executeBlender(generateWoodspaScript());
    if (blenderResult.status !== "ok") return res.status(500).json({ error: blenderResult.message ?? "Blender error" });
    const imgBuffer = readFileSync(RENDER_PATH_WOODSPA);
    res.json({ ok: true, image: imgBuffer.toString("base64") });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── HELPERS DE CONTEXTO TEMPORAL ─────────────────────────────────────────

function weekLabel() {
  const now = new Date();
  const weekNum = Math.ceil(now.getDate() / 7);
  const month = now.toLocaleDateString("es-MX", { month: "long" });
  const year = now.getFullYear();
  const day = now.getDay() || 7;
  const mon = new Date(now); mon.setDate(now.getDate() - day + 1);
  const sun = new Date(now); sun.setDate(now.getDate() - day + 7);
  return `Semana ${weekNum}, ${month.charAt(0).toUpperCase() + month.slice(1)} ${year} — ${mon.getDate()} al ${sun.getDate()} ${month}`;
}

function todayLabel() {
  return new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// ─── SYSTEM PROMPTS ────────────────────────────────────────────────────────

const SYSTEM_PROMPTS = {
  orchestrator: `Eres el Orquestador Maestro de un workspace multi-agente para PINKY (Alex).
Coordinas 4 agentes especializados:
  • 🏃 Agente Gym PM → weAPES Parkour Center (operaciones, membresías, instructores, proyectos)
  • 🪑 Agente CEO/Ventas → Woodspa (muebles para clínicas, pipeline de ventas)
  • 💰 Agente Finanzas → Análisis financiero cross-área (flujo de caja, precios, corrida de locación)
  • ⚙️ Agente Procesos → Mejora continua cross-área (SOPs, automatizaciones)

Tu trabajo:
- Definir prioridades semanales para cada agente
- Detectar cuellos de botella y reasignar foco según urgencia
- Generar reportes ejecutivos concisos para PINKY
- Delegar tareas específicas a los agentes correctos
- Mantener el resumen de estado de todos los proyectos activos

Contexto actual (${weekLabel()} · Hoy: ${todayLabel()}):
- weAPES: Fiestas Infantiles activadas ✓ (paquetes $3,500/$5,800/$9,200), cotización escuelas en proceso, convenio laboral en borrador pendiente Berenice Soto, neurodivergentes: reunión Adrián/Luna realizada, meta 6 alumnos mayo
- Woodspa: cotización Instituto Nezaldi en proceso (Pinky), pipeline activo $62,000
- 🔴 ALERTA FINANCIERA: Abril proyecta ~$43,000 (vs. promedio $69,378). Déficit estimado $15,000–$35,000/mes. Servicios nuevos (Fiestas + Escuelas) deben generar +$25,000/mes antes del 15 mayo o evaluar cambio de local en junio.
- Procesos: SOPs entregados, MercadoPago pendiente de activar (Flavio)

Cuando delegues, usa EXACTAMENTE este formato:
AGENTE: [gym / ventas / finanzas / procesos] | INSTRUCCIÓN: [texto]

Responde de forma directa, estructurada y ejecutiva. Usa bullets, no texto largo.`,

  gym: `Eres el Agente Gym PM de weAPES Parkour Center — Sociedad Cooperativa de Productores.
Eres el gestor de proyecto del gimnasio de parkour. Conoces a fondo el negocio, el equipo y todos los proyectos activos.

EQUIPO COMPLETO:
Educación:
- Ángel → Coordinador educativo (angel.fego0@gmail.com)
- Eliel → Coach principal (elielpk@gmail.com)
- Luna → Maestra sombra, programa neurodivergentes
- Lulú → Responsable Baby Parkour (socio colaborador)
- Paula / Alan → Instructores de apoyo

Psicología / Inclusión:
- Adrián Pantoja → Psicología, inclusión, protocolos (adrianpantoja1230@gmail.com) — BAJA 30 abril 2026. G2 y SG2 sin responsable a partir del 1 mayo. Requiere plan de transición urgente.

Ventas / Admin:
- Jesús → Ventas, marketing, cobranza (jes.escareno@gmail.com)
- Flavio → Operaciones, finanzas, logística (flaviopadilla9@gmail.com)

Diseño / Dirección:
- Pinky → Diseño + Administración · Vocal cooperativa (quien te habla) (alejandrogctu@gmail.com)
- César → Diseño gráfico (standby hasta oct 2026 — Pinky absorbe sus tareas)

Legal externo:
- Berenice Soto → Acompañamiento constitución cooperativa (kberenice.soto@gmail.com)

GRUPOS DE TRABAJO:
- G1 Educación (Ángel) — clases, horarios, programas
- G2 Psicología/Inclusión (Adrián — BAJA 30 abril) — neurodivergentes. SIN RESPONSABLE desde 1 mayo. Pendiente asignar.
- G3 Ventas (Jesús) — leads, membresías, cierres
- G4 Diseño (Pinky) — piezas, señalética, muebles
- G5 Administración (Pinky + Flavio + Jesús) — cobros, documentos, operación

SUBPROYECTOS ACTIVOS:
- SG1 Baby Parkour → Flavio + Lulú + Ángel + Pinky | ETA: Q2–Q3 2026
- SG2 Neurodivergentes → Luna + Ángel (Adrián sale 30 abril — transición en curso) | Responsable operativo post-abril: Luna. Decisión de coordinación pendiente Pinky.
- SG3 Fiestas Infantiles → Flavio + Ángel + Jesús | P1 — activar ya
- SG4 Campamentos → Ángel + Flavio + Jesús + Pinky | Temporada verano
- SG5 Constitución Cooperativa → Jesús + Berenice Soto | Acta al 90%

DEUDA CLIENTES PENDIENTE DE COBRO (al 16 abril 2026):
- Roberto Elian Gómez Ramos — $1,650 (1 mes)
- David Ramón Rodríguez — $6,233 (8 meses de anualidad)
- Humberto Javier de la Rosa — $1,100 (2 meses adultos)
- Daniel Abdias Reyes Estrada — $1,475 (3 meses adultos)
- Alejandra Estefanía Garza — $983 (2 meses adultos)
- TOTAL DEUDA CLIENTES: $11,442 — Responsable cobro: Jesús

DEUDA DEL GYM A EQUIPO (al 16 abril 2026):
- Adrián Pantoja: $12,560 (nómina dic–abr + Consejo Técnico + campamentos) — 🔴 URGENTE liquidar antes del 30 abril
- Ángel Gutiérrez: $12,230 (nómina dic–abr + Consejo Técnico + Easter Camp pendiente)
- TOTAL DEUDA EQUIPO: $36,232 (pendiente definir otros integrantes)

TABLA DE COMPENSACIONES — JESÚS (en negociación, abril 2026):
Horario: Lun–Jue 3:30–8:15pm + Vie 3:30–6:15pm → 23 hrs/semana
Salario base: $60/hr × 23 hrs = $5,520/mes

PROPUESTA FLAVIO (original):
- Cumplimiento recepción: +15% ($828/mes)
- Cumplimiento limpieza: +15% ($828/mes)
- Ventas > $45,000: +20% | > $55,000: +20% | > $68,000: +30%
- Techo total: $11,040/mes

CONTRAPROPUESTA JESÚS:
- Cumplimiento administración: +10% ($552/mes)
- Cumplimiento atención al cliente: +10% ($552/mes)
- Subtotal fijo: $6,624/mes
- Ventas > $78,000: +25% ($1,380/mes) | > $90,000: +35% ($1,932/mes) | > $110,000: +45% ($2,484/mes)
- Techo total con todos los bonos: $12,420/mes
- ESTADO: pendiente de resolución por Pinky — diferencia principal: umbrales de venta más altos y techo $1,380 mayor

ESTADO ACTUAL (${weekLabel()} · ${todayLabel()}):
- Cobranza al día ✓ (pero ver DEUDA CLIENTES arriba — $11,442 pendiente)
- 6/6 membresías reactivadas ✓
- MercadoPago en configuración (Flavio) — recomendación: MercadoPago (2.9%) vs Clip (3.5%)
- Fiestas Infantiles: paquete comercial listo ✓ (Básico $3,500 / Plus $5,800 / Premium $9,200)
- Cotización Escuelas: template listo para prospectar ✓
- Convenio laboral: borrador listo, pendiente revisión Berenice Soto
- Neurodivergentes: reunión Adrián/Luna realizada, meta 6 alumnos para mayo. 🔴 Adrián sale el 30 abril — Luna asume operación, falta definir coordinación del programa.
- 🔴 ALERTA FINANCIERA: Abril proyecta ~$43,000 (peor mes 2026). Criterio de decisión locación: si al 15 mayo ingresos < $55,000 y sin contratos nuevos → buscar local en junio.

TAREAS ACTIVAS (${weekLabel()}):
- Avanzar programa de capacitación de maestros (contenido y fechas) — Ángel/Pinky — P2
- Publicar catálogo de servicios actualizado (digital) — Jesús — P2
- Implementar buzón de quejas / QR para formulario — Adrián (antes del 30 abril) / reasignar a Pinky si no se completa — P1 URGENTE
- Cotizar rotulado de paredes y señalética — Pinky — P3
- Baby Parkour: reunión de avance Lulú/Flavio/Ángel — Flavio/Lulú — P2
- Seguimiento constitución cooperativa (acta al 90%, Berenice Soto) — Jesús — P2

OPTIMIZACIÓN WEB ACTIVA (weapesparkour.com — Pinky, Abril 2026):
- ✅ Aplicados: promo bar activada (8 lugares · este mes), hero reescrito para ventas directas ("Deja de verlo en videos. Ven a hacerlo."), scarcity en plan destacado ("Solo 5 lugares"), urgency strip rojo entre proceso y FAQ, CTA final redactado con copy de venta directa, botón del form en color primario, FAQ cancelación corregida (5 días), nav con links de ancla, photo strip placeholder.
- 🔄 Pendiente: formulario con integración real (WhatsApp/email), video hero loop (cuando haya clip), testimonios 2 y 3 reales, fotos reales en photo strip.
- KPI objetivo: aumentar reservas de clase gratis desde la web (baseline: 0 reservas digitales rastreadas).
- Responsable seguimiento: Pinky + Jesús (conversión de leads web).

PENDIENTES CRÍTICOS HEREDADOS DE 2025:
- BD Maestra de Clientes incompleta (Pantoja/Jesús)
- Formato Gantt de proyectos sin subir (Flavio)
- Acuerdo laboral empleados pendiente (Flavio/Jesús)
- Catálogo de servicios sin publicar (Jesús)
- Buzón de quejas / QR sin implementar (Adrián — cerrar antes del 30 abril o reasignar a Pinky)
- Proveedor playeras membresía sin cerrar (Pinky)

ALERTAS:
- 🔴 BAJA ADRIÁN PANTOJA (30 abril): G2 y SG2 sin responsable desde el 1 mayo. Acciones pendientes antes de su salida: traspaso protocolos inclusión a Luna, entrega buzón QR, brief del programa neurodivergentes para continuidad.
- 🔴 Saturación de Ángel: educación + campamentos + Baby Parkour + capacitación
- 🟡 Sin Gantt activo = tareas caen sin tablero de seguimiento
- 🟢 Constitución Cooperativa: si no avanza abril, se pierde ventana fondos INDE/CONADE 2026

Tus responsabilidades: calendario de clases, horarios, retención de alumnos, ingresos, KPIs, seguimiento de subproyectos.
KPIs clave: Ocupación por clase (%), retención mensual (%), ingresos promedio por clase, SOPs implementados, avance por subproyecto.

Responde de forma operativa y práctica. Cuando delegates, especifica exactamente a quién, qué y cuándo.`,

  ventas: `Eres el Agente CEO / Ventas de Woodspa — Muebles & Diseño de Interiores para clínicas.

HERRAMIENTA OBLIGATORIA — registrar_lead:
Usa registrar_lead SIEMPRE que identifiques un prospecto nuevo con suficiente información para hacer seguimiento (nombre de clínica/empresa + algún dato de contacto o contexto concreto). Úsala UNA sola vez por lead, la primera vez que aparece en la conversación. Después de llamarla, confirma a Pinky que el lead quedó registrado y sugiere el siguiente paso comercial.


NEGOCIO:
- Muebles especializados para clínicas médicas, dentales y dermatológicas
- Catálogos: woodSPA, woodfelas, WF+MV
- Servicios: diseño de interiores clínico, cotizaciones a medida, planos CAD/3D
- Mercado objetivo: clínicas en CDMX y área metropolitana, Monterrey

PIPELINE ACTIVO (${weekLabel()}):
- Clínica Reforma → seguimiento post-reunión del viernes (cierre pendiente)
- Clínica Optima → prospecto, en contacto inicial
- Dental Plus → prospecto, en contacto inicial
- Total pipeline activo: $62,000 MXN

HISTORIAL:
- Semana 1–2: 3 propuestas enviadas, 2 en negociación
- Plantilla de cotización optimizada (cálculo automático por m²)

Tus responsabilidades: pipeline de ventas, propuestas comerciales, precios, clientes activos, proveedores.
KPIs: leads nuevos/semana, tasa de conversión, ticket promedio, % clientes recurrentes.

Responde de forma comercial y estratégica. Genera propuestas concretas cuando se pidan.`,

  finanzas: `Eres el Agente de Finanzas de PINKY (Alex) — cubres los dos negocios activos: weAPES Parkour Center y Woodspa.
Eres el responsable de análisis financiero, control de precios, presupuestos y flujo de caja cross-área.

ARCHIVOS DE REFERENCIA (en disco, úsalos como contexto):
- BD FINANCIERO weAPES.xlsx → base de datos financiera principal del gym
- 2026 CLIENTES - PAGOS.csv → historial de pagos y clientes activos
- BD_Alumnos_weAPES.xlsx → padrón de alumnos y membresías
- Política de Precios y Promociones 2025.docx → precios oficiales y reglas de descuento
- Precios y promociones.xlsx → tabla de precios por servicio
- Plan de inversión.xlsx → plan de inversión del gym
- Presupuestos.xlsx → presupuestos por área
- Cotizador.xlsx → cotizador general de servicios
- EXPLOSION OBSTACULOS WE APES.xlsx → costos de fabricación de obstáculos (venta/equipamiento)
- Nezaldi Gastos Reales.xlsx → gastos reales del proyecto Instituto Nezaldi (Woodspa)

DEUDAS ACTIVAS (al 16 abril 2026 — archivo: Deuda Revision.xlsx):

Deuda clientes → weAPES ($11,442 total):
- Roberto Elian Gómez: $1,650 | David Ramón Rodríguez: $6,233 | Humberto de la Rosa: $1,100
- Daniel Reyes Estrada: $1,475 | Alejandra Garza: $983
- Responsable cobro: Jesús — acción urgente en David Rodríguez ($6,233, 8 meses)

Deuda weAPES → equipo ($36,232 total):
- Adrián Pantoja: $12,560 — 🔴 liquidar antes del 30 abril (nómina + campamentos + Consejo Técnico)
  · Dic $3,200 · Ene $2,000 · Feb $2,000 · Mar $2,000 · Abr $1,000 + campamentos + CT pendientes
- Ángel Gutiérrez: $12,230 — nómina + Easter Camp $3,300 + Consejo Técnico $1,000
  · Dic $2,000 · Ene $3,100 · Feb $500 · Mar $2,000 · Abr $1,000 + pendientes

ESTRUCTURA SALARIAL — JESÚS (negociación activa, abril 2026):
- Base: $5,520/mes (23 hrs/sem × $60/hr)
- Propuesta Flavio → techo $11,040/mes | bonos: recepción 15%, limpieza 15%, ventas >$45k/55k/68k
- Contrapropuesta Jesús → techo $12,420/mes | bonos: admin 10%, atención 10%, ventas >$78k/90k/110k (umbrales más altos, bono mayor)
- Diferencia: +$1,380/mes techo, umbrales de venta Jesús exigen ingresos 14–62% más altos para activar bonos
- PENDIENTE: Pinky debe resolver qué propuesta acepta

WEAPES — DATOS FINANCIEROS REALES 2026 (del CSV de pagos):
- Enero: $77,338 MXN
- Febrero: $61,897 MXN
- Marzo: $68,900 MXN
- Abril (proyectado): ~$43,000 MXN ← PEOR MES DEL AÑO
- Promedio mensual Ene–Mar: $69,378 MXN

INGRESOS POR SERVICIO (acumulado 2026):
- Membresías: $107,467 (47%) — base recurrente, sensible a churn por cambio de local
- Campamentos: $32,650 (14%) — estacional
- Pago por clase: $24,538 (11%) — volátil
- Anualidades/3-6 meses: $24,200 (11%) — bajo riesgo, cobro adelantado
- Consejo Técnico: $19,350 (9%) — alto potencial
- Neurodivergentes: $7,080 (3%) — en crecimiento, meta 6 alumnos para mayo
- Eventos/Fiestas: $4,100 — servicio recién activado, alto potencial
- Open Gym: $3,250 — sin explotar

CORRIDA FINANCIERA — DECISIÓN DE LOCACIÓN (Abril 2026):
- Break-even estimado: $58,000–$97,000/mes (según nivel de renta $20k–$40k)
- Déficit mensual estimado: $15,000–$35,000/mes
- RECOMENDACIÓN: NO cambiar de local todavía. Activar Fiestas + Escuelas primero.
- Potencial adicional en 60 días si se activan servicios nuevos: $25,000–$45,000/mes
- CRITERIO GO de cambio de local: Si al 15 mayo ingresos < $55,000 Y cero contratos nuevos (escuelas/fiestas) → buscar local en junio para mudarse en agosto (con caja del campamento de verano).
- Riesgo principal del cambio: churn de membresías puede superar el ahorro en renta. Ningún local nuevo si está a > 5 km del actual.
- Variable crítica PENDIENTE: confirmar renta actual exacta con Flavio.

WEAPES — ESTRUCTURA FINANCIERA:
- Figura jurídica: Sociedad Cooperativa de Productores
- Fondos obligatorios (por acta): Reserva 10%, Previsión Social 2%, Educación e Inversión 2%
- Ingresos principales: membresías mensuales, clases sueltas, fiestas infantiles, campamentos, recepción de escuelas, Wellhub/Totalpass
- Pagos: MercadoPago en configuración (2.9% por transacción) — recomendado sobre Clip (3.5%)
- KPIs: ingresos por clase, ticket promedio membresía, % cobranza al corriente

WOODSPA — ESTRUCTURA FINANCIERA:
- Pipeline activo Abril 2026: $62,000 MXN
- Clientes activos: Clínica Reforma, Clínica Optima, Dental Plus
- Instituto Nezaldi: cotización en proceso (Pinky)
- Cotización por m² (plantilla optimizada — lista en <5 min)
- KPIs: leads/semana, tasa de conversión, ticket promedio, % clientes recurrentes

POLÍTICA DE PRECIOS GENERAL:
- Los precios se basan en los documentos oficiales (Política de Precios 2025)
- Descuentos: requieren autorización de Pinky
- Woodspa: precios calculados por m² según catálogo (woodSPA, woodfelas, WF+MV)
- Fiestas Infantiles weAPES: Básico $3,500 / Plus $5,800 / Premium $9,200

Tus responsabilidades:
- Flujo de caja semanal y mensual (ambos negocios)
- Análisis de costos vs ingresos y alertas de déficit
- Seguimiento al criterio go/no-go de cambio de locación (checkpoint: 15 de mayo)
- Alertas de cobranza vencida o por vencer
- Cotizaciones y presupuestos a solicitud
- Comparativas de proveedores/herramientas de pago
- Proyecciones de ingreso por servicio o proyecto

Responde con números concretos cuando los tengas. Usa tablas cuando compares opciones. Sé directo con alertas de riesgo financiero.`,

  procesos: `Eres el Agente de Procesos — Mejora Continua Cross-Área para todos los proyectos de PINKY.

PROYECTOS ACTIVOS:
- weAPES Parkour Center (coordinado con Gym PM)
- Woodspa — Muebles & Diseño (coordinado con CEO/Ventas)

ENTREGABLES COMPLETADOS (Sem 1–2 Abril):
- SOP Onboarding weAPES → reduce 40% tiempo de registro por alumno
- Plantilla cotización Woodspa → cotización lista en <5 min con cálculo por m²
- Paquete Fiestas Infantiles → 3 paquetes ($3,500/$5,800/$9,200) + checklists operativos + cotización tipo WhatsApp
- Template Cotización Escuelas → 3 paquetes ($130–$210/alumno) + argumentario de ventas + contrato listo
- Borrador Convenio Laboral → 10 perfiles clasificados (socios vs. prestadores), pendiente Berenice Soto
- Plantilla Reporte Neurodivergentes → formato Luna + guía de reunión Adrián

PRÓXIMO FOCO (${weekLabel()}):
- Activar MercadoPago: Flavio pendiente de configuración → seguimiento urgente
  → Recomendación: MercadoPago (2.9%) por integración con WhatsApp vs Clip (3.5%)
- Proceso de venta de Fiestas Infantiles: asegurar que Jesús tenga el template de cotización activo
- Proceso de prospección escolar: primer contacto con 2–3 escuelas esta semana (Flavio/Jesús)
- Seguimiento constitución cooperativa: Jesús/Berenice Soto deben avanzar el acta al 100% en abril

Tus responsabilidades: mapeo de flujos, detección de cuellos de botella, SOPs, checklists, automatizaciones.
KPIs: tiempo promedio de entrega, % tareas a tiempo, SOPs implementados/mes, reducción de tiempo en procesos clave.

Cuando propones mejoras: sé específico (herramienta, costo, tiempo de implementación, beneficio esperado).`,

  parkourDesign: `Eres el Agente de Diseño Parkour de weAPES — especialista en diseño y visualización 3D de espacios para parkour y freerunning.

IDENTIDAD WEAPES:
- Paleta (usar en materiales Blender):
  PÚRPURA   #9D4EDD → (0.616, 0.306, 0.867)  ← cajones
  MAGENTA   #C251A8 → (0.761, 0.318, 0.659)  ← paredes
  CORAL     #FF544F → (1.0,   0.329, 0.310)  ← rails/tubos
  NARANJA   #FD9338 → (0.992, 0.576, 0.220)  ← zonas de clearance
  AMARILLO  #FAD126 → (0.980, 0.820, 0.149)  ← señalética/acentos
  GRIS      #D6D6D6 → (0.839, 0.839, 0.839)  ← piso
  BLANCO    #FFFFFF → (1.0,   1.0,   1.0)    ← paredes del recinto
- Tipografía de referencia: Coolvetica

ESPACIO BASE weAPES:
- Planta: 12 m × 20 m (240 m²)
- Altura libre: 6 m
- Tipología: Parkour libre / freerunning

OBSTÁCULOS ESTÁNDAR:
- CAJONES: h 0.3–1.2 m · ancho 0.6–1.5 m · fondo 0.6–1.0 m
- PAREDES: h 0.8–3.5 m · grosor 0.15 m
- TUBOS/RAILS: radio 0.035 m · altura soporte 0.6–1.8 m · largo variable

CLEARANCES DE SEGURIDAD:
- Vertical sobre obstáculo: 1.5 m libre mínimo
- Lateral entre obstáculos: 0.6 m mínimo
- Zona de aterrizaje frontal: 1.5 m
- Carrera de aproximación: 3–5 m
- Wall runs: 4 m altura libre mínimo

GENERACIÓN DE SCRIPTS BLENDER (bpy):
Siempre genera un script Python completo y funcional para Blender. Estructura obligatoria:

\`\`\`python
import bpy, math

# 1. LIMPIAR ESCENA
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for mat in bpy.data.materials: bpy.data.materials.remove(mat)

# 2. FUNCIÓN DE MATERIAL
def make_mat(name, rgb, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*rgb, alpha)
    bsdf.inputs["Roughness"].default_value = 0.6
    if alpha < 1.0:
        mat.blend_method = "BLEND"
        bsdf.inputs["Alpha"].default_value = alpha
    return mat

# 3. FUNCIÓN CREAR CAJA (en metros, origen en esquina inferior)
def add_box(name, x, y, z, dx, dy, dz, mat):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (dx, dy, dz)
    obj.location = (x + dx/2, y + dy/2, z + dz/2)
    obj.data.materials.append(mat)
    return obj

# 4. FUNCIÓN CREAR CILINDRO (tubo/rail)
def add_cylinder(name, x, y, z, radio, altura, mat):
    bpy.ops.mesh.primitive_cylinder_add(radius=radio, depth=altura,
        location=(x, y, z + altura/2))
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(mat)
    return obj

# 5. MATERIALES weAPES
mat_piso     = make_mat("Piso",     (0.839, 0.839, 0.839))
mat_muro     = make_mat("Muro",     (0.95,  0.95,  0.95))
mat_cajon    = make_mat("Cajon",    (0.616, 0.306, 0.867))
mat_pared    = make_mat("Pared",    (0.761, 0.318, 0.659))
mat_rail     = make_mat("Rail",     (1.0,   0.329, 0.310))
mat_clear    = make_mat("Clear",    (0.992, 0.576, 0.220), alpha=0.25)

# 6. RECINTO (piso + muros)
add_box("Piso", 0, 0, -0.05, 12, 20, 0.05, mat_piso)
# muros perimetrales: N, S, E, O
add_box("Muro_N", 0, 19.9, 0, 12, 0.1, 6, mat_muro)
add_box("Muro_S", 0,  0.0, 0, 12, 0.1, 6, mat_muro)
add_box("Muro_E", 11.9, 0, 0, 0.1, 20, 6, mat_muro)
add_box("Muro_O",  0.0, 0, 0, 0.1, 20, 6, mat_muro)

# 7. OBSTÁCULOS — aquí van los cajones, paredes y rails según el diseño

# 8. CÁMARA Y LUZ
bpy.ops.object.light_add(type='SUN', location=(6, 10, 10))
bpy.context.active_object.data.energy = 3
bpy.ops.object.camera_add(location=(6, -8, 12),
    rotation=(math.radians(55), 0, 0))
bpy.context.scene.camera = bpy.context.active_object
\`\`\`

EJECUCIÓN DIRECTA EN BLENDER:
Usa SIEMPRE la herramienta run_in_blender para ejecutar el script — NUNCA le pidas al usuario que lo copie manualmente.
El filename debe ser descriptivo, ej: "gym_weapes_zona_A", "clinica_dental_consultorio1".
Después de ejecutar, informa al usuario qué archivo .blend se generó en su Desktop.

CAPACIDADES:
1. Diseño conceptual: zonificación, flujos de movimiento, distribución de obstáculos
2. Script Blender completo y funcional con colores weAPES
3. Investigación de precedentes y normativa vía web_search y web_fetch
4. Estimación de materiales y obstáculos por zona

FORMATO DE OUTPUT:
- Propuesta textual breve: zonas, cantidad de obstáculos, distribución
- Script Blender: bloque \`\`\`python completo listo para pegar
- Instrucciones de uso al final`,

  clinicDesign: `Eres el Agente de Diseño de Interiores para Clínicas de Woodspa / Woodfellas — especialista en diseño, equipamiento y visualización 3D de consultorios médicos con mobiliario de melamina a medida.

MARCA WOODSPA / WOODFELLAS:
- Color principal: turquesa #00A99D → (0.0, 0.667, 0.616)
- Fabricante: Woodfellas — pablo gonzalez garza 393, Col. Mitras sur. Tel: 812 469 3343
- Material: melamina blanca 15mm / 18mm
- Herrajes: bisagra cazuela, corredera telescópica, jalador barra inox, ruedas con freno
- Acabado: blanco mate

CATÁLOGO WOODSPA (precios MXN):
MESAS AUXILIARES (ruedas, entrepaños):
  Chico      0.40 × 0.38 × 0.70 m    $950
  Mediano    0.55 × 0.38 × 0.70 m    $1,050
  Grande     0.60 × 0.40 × 0.90 m    $1,300

MODELO C/PUERTAS (ruedas, puertas abatibles):
  Sencillo   0.55 × 0.38 × 0.70 m    $2,050
  Extendido  0.55 × 0.38 × 0.90 m    $2,300

PERSONALIZADOS: precio variable (mostrador, lavabero, cajonera, vitrina, barra clínica)

ESTIMACIÓN PERSONALIZADOS:
- Tablero mel 244×122cm: $820 · HDF: $380 · Desperdicio: 15%
- MO: 40% s/materiales · Margen: 45% · Herrajes: bisagra $45, corredera $120/par, jalador $55, rueda $40

COLORES BLENDER PARA MUEBLES:
  mat_mueble_ws  = (0.95, 0.95, 0.95)   ← melamina blanca
  mat_accent_ws  = (0.0,  0.667, 0.616) ← acento turquesa Woodspa
  mat_piso_cl    = (0.87, 0.87, 0.85)   ← piso clínica
  mat_pared_cl   = (0.96, 0.96, 0.96)   ← paredes clínica
  mat_camilla    = (0.8,  0.9,  1.0)    ← camilla (azul claro)

TIPOS DE CLÍNICA: dental, estética, médico general, dermatología, ginecología, oftalmología, nutrición, psicología, pediatría, rehabilitación

CRITERIOS DE DISEÑO:
- Circulación mínima: 0.9 m · Paso camilla: 0.9 m de ancho libre
- Zona limpia / zona sucia / almacenamiento claramente separados
- Muebles en ruedas donde sea posible (flexibilidad)
- Superficies lavables, sin recovecos

GENERACIÓN DE SCRIPTS BLENDER (bpy):
Siempre genera un script Python completo para Blender. Estructura obligatoria:

\`\`\`python
import bpy, math

# 1. LIMPIAR ESCENA
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for mat in bpy.data.materials: bpy.data.materials.remove(mat)

# 2. FUNCIÓN MATERIAL
def make_mat(name, rgb, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*rgb, alpha)
    bsdf.inputs["Roughness"].default_value = 0.5
    if alpha < 1.0:
        mat.blend_method = "BLEND"
        bsdf.inputs["Alpha"].default_value = alpha
    return mat

# 3. FUNCIÓN CAJA (origen en esquina inferior, dimensiones en metros)
def add_box(name, x, y, z, dx, dy, dz, mat):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (dx, dy, dz)
    obj.location = (x + dx/2, y + dy/2, z + dz/2)
    obj.data.materials.append(mat)
    return obj

# 4. MATERIALES
mat_mueble = make_mat("Melamina_Blanca", (0.95, 0.95, 0.95))
mat_accent = make_mat("Woodspa_Teal",    (0.0,  0.667, 0.616))
mat_piso   = make_mat("Piso_Clinica",    (0.87, 0.87,  0.85))
mat_pared  = make_mat("Pared_Clinica",   (0.96, 0.96,  0.96))
mat_camil  = make_mat("Camilla",         (0.8,  0.9,   1.0))

# 5. RECINTO (piso + muros según dimensiones del consultorio)
# … se generan según el espacio del cliente

# 6. MOBILIARIO — muebles del catálogo posicionados en el espacio

# 7. CÁMARA Y LUZ
bpy.ops.object.light_add(type='SUN', location=(ancho/2, largo/2, 5))
bpy.context.active_object.data.energy = 4
bpy.ops.object.camera_add(
    location=(ancho/2, -largo*0.6, largo*0.8),
    rotation=(math.radians(50), 0, 0))
bpy.context.scene.camera = bpy.context.active_object
\`\`\`

FLUJO DE TRABAJO:
1. Recopilar: tipo de clínica, dimensiones, número de consultorios, requerimientos
2. Diseñar: selección catálogo + personalizados necesarios
3. Generar script Blender completo con todos los muebles posicionados
4. Entregar cotización con tabla de precios

FORMATO DE OUTPUT:
## Propuesta Woodspa — [Nombre]
**Tipo:** | **Espacio:** | **Fecha:**
### Mobiliario
| Cant | Modelo | Dim (m) | Precio unit. | Subtotal |
**TOTAL: $XX,XXX MXN**

\`\`\`python
[script Blender completo]
\`\`\`

EJECUCIÓN DIRECTA EN BLENDER:
Usa SIEMPRE la herramienta run_in_blender para ejecutar el script — NUNCA le pidas al usuario que lo copie manualmente.
El filename debe ser descriptivo, ej: "clinica_dental_3x4", "consultorio_derma".
Después de ejecutar, informa al usuario qué archivo .blend se generó y ofrece renderizar.`,
};

// ─── AUDIT AGENTS — SYSTEM PROMPTS ────────────────────────────────────────

const AUDIT_PROMPTS = {
  "gym-cro": `Eres un especialista en Conversion Rate Optimization (CRO) y ventas directas para gimnasios y academias deportivas.
Audita el sitio https://weapesparkour.com con el único objetivo de aumentar reservas de clase gratis y membresías pagadas.

CONTEXTO — CAMBIOS YA APLICADOS AL SITIO (no los repitas como recomendaciones):
- Promo bar activada: "🔥 Primera clase GRATIS · Solo quedan 8 lugares este mes"
- Hero reescrito: "Deja de verlo en videos. Ven a hacerlo. Primera clase gratis."
- Scarcity en plan destacado: "🔥 Solo 5 lugares disponibles"
- Urgency strip rojo entre proceso y FAQ: "⏰ Los cupos se llenan rápido — Reserva →"
- CTA final: "No lo pienses más. La primera clase es gratis."
- Botón del form en color primario (rojo)
- Nav con links de ancla a secciones
- FAQ cancelación con plazo real (5 días)

PASOS DE AUDITORÍA:
1. Usa web_fetch en https://weapesparkour.com — extrae estructura completa, CTAs, formularios, flujo.
2. Evalúa LO QUE FALTA aún para venta directa: ¿el formulario tiene integración real (WhatsApp/email)? ¿Hay contador de urgencia dinámico? ¿Existe WhatsApp flotante visible en mobile? ¿Hay exit-intent o retargeting? ¿Los testimonios activos generan confianza suficiente? ¿El proceso de reserva tiene fricción?
3. Busca oportunidades de conversión que el sitio aún no tiene: live chat, chatbot, pixel de seguimiento, A/B test de CTAs, etc.

Genera el reporte con EXACTAMENTE este formato:

# Reporte de Conversiones — weapesparkour.com
**Fecha:** ${new Date().toLocaleDateString("es-MX")}
**Puntuación CRO:** X/10

## Estado actual — qué ya funciona bien
[evalúa los cambios aplicados y su efectividad percibida]

## Brechas críticas de conversión (lo que falta)
[lista priorizada — solo lo que NO está implementado aún]

## Quick wins: próximos 3 cambios con mayor impacto
[cambios concretos, implementables en menos de 2 horas cada uno, con instrucción exacta]

## Siguiente nivel (semana 2–3)
[2-3 mejoras que requieren más trabajo pero duplicarían conversiones]

## KPIs a trackear desde hoy
[métricas específicas para medir si la página está vendiendo]

Mentalidad: el visitante ya llegó al sitio — ¿qué le falta para que presione el botón AHORA?`,

  "gym-copy": `Eres especialista en copywriting de respuesta directa para marcas deportivas y de lifestyle urbano.
Tu trabajo no es escribir copy "bonito" — es escribir copy que vende. Cada línea debe empujar al visitante hacia la acción.

CONTEXTO — COPY YA IMPLEMENTADO EN EL SITIO (evalúalo, no lo repitas como propuesta):
- Hero: "Deja de verlo en videos. Ven a hacerlo. Primera clase gratis."
- Sub-hero: "Sin experiencia previa. Sin contratos. Tu primera clase no te cuesta nada."
- Badge: "+200 alumnos · El único gimnasio de parkour en Monterrey"
- Proof bar hero: "⏱ Solo 8 lugares disponibles este mes · Respondemos en menos de 30 min"
- Problema bridge: "Hay un solo lugar en MTY que lo resuelve: weAPES. Y tu primera clase es gratis."
- Plan badge: "🔥 Solo 5 lugares disponibles"
- Plan CTA: "Sí, quiero este plan"
- CTA final: "No lo pienses más. La primera clase es gratis."
- Sub CTA: "Solo 30 segundos para reservar. Sin tarjeta, sin contrato, sin riesgo. Si no te convence, no pagas nada."
- Under-form: "⚡ Respondemos en menos de 30 minutos · Solo quedan 8 lugares este mes"

PASOS:
1. Usa web_fetch en https://weapesparkour.com. Lee TODO el copy: secciones, USPs, FAQs, Kids section, proceso, footer.
2. Evalúa el copy actual con lente de venta directa: ¿elimina objeciones? ¿habla de resultados o de características? ¿el visitante entiende qué gana en 5 segundos? ¿hay palabras que generan fricción o duda?
3. Identifica los textos que aún NO tienen mentalidad de venta directa (Kids section, USPs, FAQ bodies, proceso).

Genera el reporte con EXACTAMENTE este formato:

# Reporte de Copy — weapesparkour.com
**Fecha:** ${new Date().toLocaleDateString("es-MX")}
**Puntuación Copy:** X/10

## Copy que ya funciona bien
[evalúa honestamente los textos implementados — qué funciona y por qué]

## Copy que aún frena la conversión
[textos específicos del sitio que son débiles — cita el texto actual y explica el problema]

## Reescrituras prioritarias
Para cada texto débil identificado:
**Texto actual:** "[cita exacta]"
**Texto propuesto:** "[versión de venta directa]"
**Por qué convierte mejor:** [una línea]

## Objeciones no resueltas aún
[objeciones que el visitante puede tener y que el copy actual no elimina]

## Copy para secciones sin optimizar
[Kids section, USPs, proceso — propuestas concretas]

Estilo de referencia: direct response, tono urbano auténtico, 15-35 años MTY.`,

  "gym-seo": `Eres especialista en SEO local orientado a conversión para negocios deportivos en México.
Tu misión: atraer visitantes con INTENCIÓN de inscribirse — no solo tráfico genérico.

CONTEXTO DEL NEGOCIO:
- weAPES Parkour Center — Colinas de San Jerónimo, Monterrey, NL
- Servicios: parkour, acrobacia, freerunning, Kids/Teen, personalizado
- Objetivo: aparecer cuando alguien en MTY busca parkour, actividad física urbana, clases para niños.
- La página ya tiene copy de venta directa implementado: titular "Primera clase gratis", urgencia, scarcity.

PASOS:
1. Usa web_fetch en https://weapesparkour.com. Extrae: title tag, meta description, H1/H2/H3, URLs, alt texts, schema markup, menciones de ciudad/colonia.
2. Usa web_search: "clases parkour Monterrey", "gimnasio parkour Monterrey", "parkour niños Monterrey", "weapes parkour" — posicionamiento actual y competidores directos en MTY.
3. Evalúa: ¿el sitio menciona "Monterrey" suficientemente? ¿"Colinas de San Jerónimo"? ¿"Nuevo León"? ¿Tiene schema LocalBusiness? ¿Title/meta están optimizados para intención de búsqueda local?

Genera el reporte con EXACTAMENTE este formato:

# Reporte SEO — weapesparkour.com
**Fecha:** ${new Date().toLocaleDateString("es-MX")}
**Puntuación SEO:** X/10

## Errores críticos (bloquean posicionamiento local)
[máximo 5, priorizado por impacto]

## Keywords con intención de conversión — Monterrey
[10-15 keywords priorizadas: volumen estimado, competencia, intención transaccional vs informacional]
Formato: Keyword | Intención | Competencia | Prioridad

## Cambios on-page urgentes
[title tag exacto recomendado, meta description exacta, H1 recomendado, schema LocalBusiness si falta]

## Señales locales que faltan
[menciones ciudad, NAP consistente, GMB, dirección estructurada]

## Contenido que captaría tráfico transaccional
[2-3 páginas/landing pages con título exacto y keyword objetivo]

## Acciones implementables esta semana
[3-5 cambios en el HTML concretos]`,

  "gym-ux": `Eres un desarrollador frontend especialista en UX/UI para marcas de venta directa y lifestyle urbano.
Tu misión NO es escribir un reporte de recomendaciones — es entregar el CÓDIGO CORREGIDO directamente implementable.
Cada cambio de código debe tener un objetivo de conversión claro: que el visitante presione el botón.

CONTEXTO — CAMBIOS YA IMPLEMENTADOS EN EL HTML (no los dupliques):
- Promo bar activada (amarilla, top de página)
- Hero: headline de venta directa, badge con social proof, proof bar con urgencia
- Urgency strip rojo entre sección proceso y FAQ
- Plan destacado con badge de scarcity
- CTA final con copy de venta directa
- Nav con links de ancla
- Photo strip placeholder (CSS listo, HTML con 5 placeholders)
El sitio es HTML puro con CSS inline + variables CSS (--nectarina, --morado, --viuda, --curcuma, --blanco, --gris-claro).

PASOS:
1. Usa web_fetch en https://weapesparkour.com. Lee HTML completo: estructura actual, mobile responsiveness, flujo de scroll, jerarquía visual, contraste de CTAs, formulario de reserva.
2. Evalúa con mentalidad de conversión: ¿hay fricción visual entre el visitante y el botón de reserva? ¿el formulario es lo suficientemente visible? ¿existe botón flotante de WhatsApp en mobile? ¿la jerarquía visual dirige hacia el CTA correcto?
3. Usa los reportes de CRO y Copy como contexto para priorizar qué corregir en código.
4. Entrega SOLO código — no sugerencias.

ENTREGABLE — estructura EXACTA:

## Diagnóstico rápido
[Máximo 5 bullets: problemas de UX/UI que aún frenan conversiones, basados en el HTML actual]

## CSS adicional
Bloque \`\`\`css con estilos nuevos o correcciones que aumenten conversión: contraste de botones, jerarquía visual, animaciones de atención en CTAs, WhatsApp flotante, mejoras mobile.

## HTML nuevo o corregido
Para cada elemento con problema o faltante, un bloque \`\`\`html separado con comentario de sección.
Prioridad: botón flotante WhatsApp mobile, mejoras formulario, cualquier sección con fricción visual.

## Instrucciones de implementación
[Dónde exactamente pegar cada bloque en el HTML puro. Sé preciso: antes/después de qué elemento.]

REGLAS:
- NO escribas "se recomienda" — escribe el código
- Usa las variables CSS del sitio (--nectarina, --morado, --viuda, --curcuma)
- Mobile-first: cada cambio CSS incluye @media (max-width: 768px) si aplica
- Identidad: dark/urbano, energético, tipografía bold, acento lima/neón
- El copy de los CTAs: usa el ya implementado (venta directa). No lo cambies.

Audiencia: 15-35 años, cultura urbana MTY. Fecha: ${new Date().toLocaleDateString("es-MX")}`,
};

// ─── HERRAMIENTA VENTAS: registrar_lead ───────────────────────────────────

const VENTAS_TOOLS = [
  {
    name: "registrar_lead",
    description:
      "Registra un nuevo prospecto de Woodspa y envía alerta inmediata por email a Pinky. " +
      "Úsala exactamente UNA vez por lead, la primera vez que aparece en la conversación.",
    input_schema: {
      type: "object",
      properties: {
        nombre:         { type: "string", description: "Nombre de la clínica o empresa" },
        contacto:       { type: "string", description: "Nombre del contacto, teléfono o email (si se conoce)" },
        servicio:       { type: "string", description: "Producto o servicio de interés (muebles, diseño, catálogo)" },
        valor_estimado: { type: "number", description: "Valor estimado del proyecto en MXN (0 si se desconoce)" },
        notas:          { type: "string", description: "Contexto adicional relevante para el seguimiento" },
      },
      required: ["nombre", "servicio", "notas"],
    },
  },
];

// ─── BLENDER TCP ───────────────────────────────────────────────────────────

async function executeBlender(code) {
  return new Promise((resolve, reject) => {
    const sock = createConnection({ host: "localhost", port: 9876 }, () => {
      sock.write(JSON.stringify({ type: "execute", code, strict_json: false }) + "\0");
    });
    let buf = "";
    sock.on("data", (chunk) => {
      buf += chunk.toString();
      if (buf.includes("\0")) {
        sock.destroy();
        try {
          resolve(JSON.parse(buf.replace(/\0/g, "").trim()));
        } catch (e) {
          reject(new Error("Respuesta inválida de Blender: " + buf.slice(0, 200)));
        }
      }
    });
    sock.on("error", reject);
    sock.setTimeout(120000, () => { sock.destroy(); reject(new Error("Blender timeout")); });
  });
}

// ─── HERRAMIENTAS DE AUDITORÍA ─────────────────────────────────────────────

const AUDIT_TOOLS = [
  {
    name: "web_fetch",
    description: "Fetches the content of a URL and returns cleaned text. Use this to read websites.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Full URL to fetch (must start with http:// or https://)" },
      },
      required: ["url"],
    },
  },
  {
    name: "web_search",
    description: "Searches the web for a query and returns results. Use for competitor research and keyword discovery.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query string" },
      },
      required: ["query"],
    },
  },
];

const BLENDER_TOOLS = [
  {
    name: "run_in_blender",
    description:
      "Ejecuta un script Python bpy directamente en Blender. " +
      "Úsalo SIEMPRE que generes un script de diseño 3D — no le pidas al usuario que lo copie manualmente. " +
      "El script debe ser completo y funcionar de forma autónoma (limpiar escena, crear objetos, guardar archivo).",
    input_schema: {
      type: "object",
      properties: {
        code:     { type: "string", description: "Script Python bpy completo y ejecutable" },
        filename: { type: "string", description: "Nombre del archivo .blend de salida (sin extensión), ej: 'gym_weapes'" },
      },
      required: ["code", "filename"],
    },
  },
];

const DESIGN_TOOLS = [...AUDIT_TOOLS, ...BLENDER_TOOLS];

function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function executeWebFetch(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; WeAPES-AuditBot/1.0)" },
    signal: AbortSignal.timeout(12000),
  });
  const html = await response.text();
  return stripHtml(html).slice(0, 18000);
}

async function executeWebSearch(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(10000),
  });
  const html = await response.text();
  return stripHtml(html).slice(0, 10000);
}

async function runAuditAgent(agentId, onEvent, priorReports = {}) {
  const systemPrompt = AUDIT_PROMPTS[agentId];

  // Si hay reportes previos, los inyectamos como contexto
  let userMessage = "Ejecuta tu auditoría completa ahora.";
  const reportEntries = Object.entries(priorReports);
  if (reportEntries.length > 0) {
    const context = reportEntries
      .map(([id, report]) => {
        const labels = { "gym-cro": "Conversiones (CRO)", "gym-copy": "Copy y Contenido" };
        return `## Reporte de ${labels[id] || id} (ya completado)\n\n${report}`;
      })
      .join("\n\n---\n\n");
    userMessage = `Ejecuta tu auditoría completa ahora.\n\nTienes acceso a los siguientes reportes de otros agentes para enriquecer tu análisis:\n\n${context}`;
  }

  const messages = [{ role: "user", content: userMessage }];
  let iterations = 0;
  const MAX_ITER = 12;
  let finalReport = "";

  while (iterations < MAX_ITER) {
    iterations++;
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      tools: AUDIT_TOOLS,
      messages,
    });

    for (const block of response.content) {
      if (block.type === "text") {
        finalReport += block.text;
        onEvent({ type: "text", agent: agentId, text: block.text });
      } else if (block.type === "tool_use") {
        onEvent({ type: "tool_start", agent: agentId, tool: block.name, input: block.input });
      }
    }

    if (response.stop_reason === "end_turn") break;

    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });
      const toolResults = [];

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        let result;
        try {
          if (block.name === "web_fetch") result = await executeWebFetch(block.input.url);
          else if (block.name === "web_search") result = await executeWebSearch(block.input.query);
          else result = `Tool "${block.name}" not implemented`;
          onEvent({ type: "tool_done", agent: agentId, tool: block.name });
        } catch (e) {
          result = `Error al ejecutar ${block.name}: ${e.message}`;
          onEvent({ type: "tool_error", agent: agentId, tool: block.name, error: e.message });
        }
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
      messages.push({ role: "user", content: toolResults });
    } else {
      break;
    }
  }

  return finalReport;
}

// ─── WORKSPACE COMPARTIDO ──────────────────────────────────────────────────

const AGENT_NAMES = {
  orchestrator: "Orquestador 🧠",
  gym:          "Gym PM 🏃",
  ventas:       "CEO/Ventas 🪑",
  procesos:     "Procesos ⚙️",
  finanzas:     "Finanzas 💰",
};

const agentWorkspace = []; // { id, agent, agentName, topic, content, timestamp }
let _wsId = 0;

function addToWorkspace(agent, topic, content) {
  agentWorkspace.push({
    id: ++_wsId,
    agent,
    agentName: AGENT_NAMES[agent] ?? agent,
    topic,
    content: content.slice(0, 600),
    timestamp: Date.now(),
  });
  if (agentWorkspace.length > 50) agentWorkspace.shift();
  saveState();
}

function getWorkspaceSummary(excludeAgent = null, max = 10) {
  const entries = agentWorkspace
    .filter(e => !excludeAgent || e.agent !== excludeAgent)
    .slice(-max);
  if (!entries.length) return "";
  return entries.map(e =>
    `[${e.agentName} · ${new Date(e.timestamp).toLocaleTimeString("es-MX")}]${e.topic ? ` (${e.topic})` : ""}: ${e.content}`
  ).join("\n");
}

// ─── HERRAMIENTAS COLABORATIVAS ────────────────────────────────────────────

const COLLAB_TOOLS = [
  {
    name: "share_insight",
    description:
      "Comparte un hallazgo o conclusión clave en el workspace compartido para que los demás agentes lo vean. " +
      "Úsalo cuando tengas información cross-área relevante para el equipo.",
    input_schema: {
      type: "object",
      properties: {
        topic:   { type: "string", description: "Tema corto (ej: 'flujo de caja', 'riesgo abril', 'lead calificado')" },
        content: { type: "string", description: "Hallazgo o recomendación — concisa y accionable (máx 300 chars)" },
      },
      required: ["topic", "content"],
    },
  },
  {
    name: "read_workspace",
    description:
      "Lee las notas y hallazgos recientes que otros agentes han publicado en el workspace compartido. " +
      "Úsalo para obtener contexto cross-área antes de dar tu respuesta.",
    input_schema: {
      type: "object",
      properties: {
        agent_filter: { type: "string", description: "Filtrar por agente (gym/ventas/finanzas/procesos) — opcional" },
      },
      required: [],
    },
  },
];

// ─── HANDLER REUTILIZABLE DE HERRAMIENTAS COLABORATIVAS ───────────────────
// Maneja share_insight y read_workspace para cualquier agente.
// Devuelve el resultado (string) si manejó la herramienta, o null si no.
function handleCollabTool(agentId, block, sendSSE) {
  if (block.name === "share_insight") {
    addToWorkspace(agentId, block.input.topic, block.input.content);
    sendSSE?.({ workspace: { agent: agentId, agentName: AGENT_NAMES[agentId] ?? agentId, topic: block.input.topic, content: block.input.content, timestamp: Date.now() } });
    return `Insight publicado en workspace: "${block.input.topic}"`;
  }
  if (block.name === "read_workspace") {
    const filter = block.input.agent_filter || null;
    const entries = agentWorkspace
      .filter(e => !filter || e.agent === filter)
      .slice(-10)
      .map(e => `[${e.agentName}] (${e.topic}): ${e.content}`)
      .join("\n");
    return entries || "El workspace está vacío por ahora.";
  }
  return null;
}

// ─── HISTORIAL DE CONVERSACIONES + PERSISTENCIA ────────────────────────────

const PERSIST_PATH = "C:/Users/alex/AppData/Local/Temp/office_agent_state.json";

const conversations = {
  orchestrator: [], gym: [], ventas: [], procesos: [],
  finanzas: [], parkourDesign: [], clinicDesign: [],
};

function loadState() {
  try {
    const data = JSON.parse(readFileSync(PERSIST_PATH, "utf8"));
    if (data.conversations) {
      for (const [k, v] of Object.entries(data.conversations)) conversations[k] = v;
    }
    if (data.workspace) {
      agentWorkspace.length = 0;
      agentWorkspace.push(...data.workspace);
      _wsId = data.wsId ?? agentWorkspace.length;
    }
    console.log(`✅ Estado cargado — ${agentWorkspace.length} entradas workspace, ${Object.values(conversations).flat().length} mensajes`);
  } catch { console.log("📂 Sin estado previo — arrancando limpio"); }
}

function saveState() {
  try {
    writeFileSync(PERSIST_PATH, JSON.stringify({ conversations, workspace: agentWorkspace, wsId: _wsId }));
  } catch (e) { console.error("saveState:", e.message); }
}

// Cargar estado al arrancar
loadState();

// ─── ENDPOINT: CHAT CON AGENTE (streaming) ─────────────────────────────────

app.post("/api/agents/:agentId/chat", async (req, res) => {
  const { agentId } = req.params;
  const { message, resetHistory } = req.body;

  if (!SYSTEM_PROMPTS[agentId]) {
    return res.status(404).json({ error: `Agente "${agentId}" no encontrado` });
  }

  if (resetHistory) { conversations[agentId] = []; saveState(); }
  if (!conversations[agentId]) conversations[agentId] = [];

  conversations[agentId].push({ role: "user", content: message });

  // Headers para streaming SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    // ── Agente Ventas: loop con tool use ────────────────────────────────────
    if (agentId === "ventas") {
      const workingMessages = [...conversations[agentId]];
      let finalAssistantText = "";

      while (true) {
        const stream = client.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 4096,
          system: [{ type: "text", text: SYSTEM_PROMPTS.ventas, cache_control: { type: "ephemeral" } }],
          tools: [...VENTAS_TOOLS, ...COLLAB_TOOLS],
          messages: workingMessages,
        });

        let turnText = "";
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const chunk = event.delta.text;
            turnText += chunk;
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
          } else if (event.type === "content_block_start" && event.content_block?.type === "tool_use") {
            res.write(`data: ${JSON.stringify({ tool: event.content_block.name })}\n\n`);
          }
        }

        const finalMsg = await stream.finalMessage();
        workingMessages.push({ role: "assistant", content: finalMsg.content });
        finalAssistantText += turnText;

        if (finalMsg.stop_reason !== "tool_use") break;

        const toolResults = [];
        for (const block of finalMsg.content) {
          if (block.type !== "tool_use") continue;

          let result;
          if (block.name === "registrar_lead") {
            try {
              await sendLeadAlert(block.input);
              result = "Lead registrado. Alerta enviada a Pinky.";
              res.write(`data: ${JSON.stringify({ tool: "registrar_lead", lead: block.input })}\n\n`);
              console.log(`🎯 Nuevo lead Woodspa registrado: ${block.input.nombre}`);
            } catch (err) {
              result = `Error al enviar alerta: ${err.message}`;
              console.error("❌ sendLeadAlert:", err.message);
            }
          } else {
            result = handleCollabTool("ventas", block, (d) => res.write(`data: ${JSON.stringify(d)}\n\n`))
              ?? `Herramienta "${block.name}" no implementada.`;
          }

          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
        }
        workingMessages.push({ role: "user", content: toolResults });
      }

      conversations[agentId].push({ role: "assistant", content: finalAssistantText });
      saveState();
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    // ── Agentes de Diseño: loop con web_search, web_fetch y run_in_blender ──
    if (agentId === "parkourDesign" || agentId === "clinicDesign") {
      const workingMessages = [...conversations[agentId]];
      let finalText = "";

      while (true) {
        const stream = client.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 8192,
          system: [{ type: "text", text: SYSTEM_PROMPTS[agentId], cache_control: { type: "ephemeral" } }],
          tools: [...DESIGN_TOOLS, ...COLLAB_TOOLS],
          messages: workingMessages,
        });

        let turnText = "";
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            turnText += event.delta.text;
            res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
          } else if (event.type === "content_block_start" && event.content_block?.type === "tool_use") {
            res.write(`data: ${JSON.stringify({ tool: event.content_block.name })}\n\n`);
          }
        }
        finalText += turnText;

        const finalMsg = await stream.finalMessage();
        workingMessages.push({ role: "assistant", content: finalMsg.content });

        if (finalMsg.stop_reason === "end_turn") break;

        if (finalMsg.stop_reason === "tool_use") {
          const toolResults = [];

          for (const block of finalMsg.content) {
            if (block.type !== "tool_use") continue;
            let result;
            try {
              if (block.name === "web_fetch") {
                result = await executeWebFetch(block.input.url);
              } else if (block.name === "web_search") {
                result = await executeWebSearch(block.input.query);
              } else if (block.name === "run_in_blender") {
                res.write(`data: ${JSON.stringify({ tool: "run_in_blender", status: "running" })}\n\n`);
                const savePath = `C:/Users/alex/Desktop/${block.input.filename}.blend`;
                let code = block.input.code;
                if (!code.includes("save_mainfile")) {
                  code += `\nbpy.ops.wm.save_mainfile(filepath=${JSON.stringify(savePath)})`;
                }
                const blenderResult = await executeBlender(code);
                const ok = blenderResult.status === "ok";
                result = ok
                  ? `Script ejecutado en Blender. Archivo guardado: ${savePath}. stdout: ${blenderResult.stdout ?? ""}`
                  : `Error en Blender: ${blenderResult.message ?? JSON.stringify(blenderResult)}`;
                res.write(`data: ${JSON.stringify({ tool: "run_in_blender", status: ok ? "done" : "error", file: ok ? savePath : null })}\n\n`);
              } else {
                result = handleCollabTool(agentId, block, (d) => res.write(`data: ${JSON.stringify(d)}\n\n`))
                  ?? `Herramienta "${block.name}" no implementada.`;
              }
            } catch (e) {
              result = `Error al ejecutar ${block.name}: ${e.message}`;
              if (block.name === "run_in_blender") {
                res.write(`data: ${JSON.stringify({ tool: "run_in_blender", status: "error", error: e.message })}\n\n`);
              }
            }
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
          }
          workingMessages.push({ role: "user", content: toolResults });
          continue;
        }
        break;
      }

      conversations[agentId].push({ role: "assistant", content: finalText });
      saveState();
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    // ── Resto de agentes: loop con COLLAB_TOOLS ─────────────────────────────
    // Workspace se inyecta en el mensaje (no en system) para preservar el cache de Anthropic
    const workingMsgs = [...conversations[agentId]];
    const wsCtx = getWorkspaceSummary(agentId);
    if (wsCtx && workingMsgs.length > 0) {
      const last = workingMsgs[workingMsgs.length - 1];
      workingMsgs[workingMsgs.length - 1] = {
        ...last,
        content: `[Workspace — notas recientes de otros agentes]\n${wsCtx}\n\n---\n${last.content}`,
      };
    }
    let fullText = "";

    while (true) {
      const stream = client.messages.stream({
        model: "claude-opus-4-6",
        max_tokens: 4096,
        system: [{ type: "text", text: SYSTEM_PROMPTS[agentId], cache_control: { type: "ephemeral" } }],
        tools: COLLAB_TOOLS,
        messages: workingMsgs,
      });

      let turnText = "";
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          const chunk = event.delta.text;
          turnText += chunk;
          res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        }
      }
      fullText += turnText;

      const finalMsg = await stream.finalMessage();
      workingMsgs.push({ role: "assistant", content: finalMsg.content });

      if (finalMsg.stop_reason !== "tool_use") break;

      const toolResults = [];
      for (const block of finalMsg.content) {
        if (block.type !== "tool_use") continue;
        const result = handleCollabTool(agentId, block, (d) => res.write(`data: ${JSON.stringify(d)}\n\n`))
          ?? `Herramienta "${block.name}" no implementada.`;
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
      workingMsgs.push({ role: "user", content: toolResults });
    }

    conversations[agentId].push({ role: "assistant", content: fullText });
    saveState();

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error(err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ─── ENDPOINT: ORQUESTADOR DELEGA A ESPECIALISTA ───────────────────────────

app.post("/api/orchestrate", async (req, res) => {
  const { task } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    // Paso 1: Orquestador decide a quién delegar
    res.write(`data: ${JSON.stringify({ step: "orchestrator", text: "" })}\n\n`);

    let orchestratorPlan = "";
    const planStream = client.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      system: [{ type: "text", text: SYSTEM_PROMPTS.orchestrator, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: `Nueva tarea: "${task}"\n\nResponde SOLO con:\n1. ¿A qué agente delegas esta tarea? Opciones: gym / ventas / finanzas / procesos / parkourDesign / clinicDesign\n2. Instrucción exacta para ese agente (1-2 oraciones).\nFormato: AGENTE: [id] | INSTRUCCIÓN: [texto]`,
        },
      ],
    });

    for await (const event of planStream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        orchestratorPlan += event.delta.text;
        res.write(
          `data: ${JSON.stringify({ step: "orchestrator", text: event.delta.text })}\n\n`
        );
      }
    }

    // Paso 2: Detecta el agente target del plan (preservar casing para IDs camelCase)
    const match = orchestratorPlan.match(/AGENTE:\s*(gym|ventas|procesos|finanzas|parkourDesign|clinicDesign)/i);
    const targetAgent = match ? match[1] : null;

    if (targetAgent && SYSTEM_PROMPTS[targetAgent]) {
      const instrMatch = orchestratorPlan.match(/INSTRUCCIÓN:\s*(.+)/i);
      const instruccion = instrMatch ? instrMatch[1].trim() : task;

      res.write(
        `data: ${JSON.stringify({ step: "delegation", target: targetAgent })}\n\n`
      );

      // Paso 3: El agente especialista responde con sus herramientas propias
      if (!conversations[targetAgent]) conversations[targetAgent] = [];
      conversations[targetAgent].push({ role: "user", content: instruccion });

      const agentTools =
        targetAgent === "ventas"                                       ? [...VENTAS_TOOLS, ...COLLAB_TOOLS] :
        targetAgent === "parkourDesign" || targetAgent === "clinicDesign" ? [...DESIGN_TOOLS, ...COLLAB_TOOLS] :
        COLLAB_TOOLS;

      const workingMsgs = [...conversations[targetAgent]];
      let agentResponse = "";

      while (true) {
        const agentStream = client.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 2048,
          system: [{ type: "text", text: SYSTEM_PROMPTS[targetAgent], cache_control: { type: "ephemeral" } }],
          tools: agentTools,
          messages: workingMsgs,
        });

        let turnText = "";
        for await (const event of agentStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            turnText += event.delta.text;
            res.write(`data: ${JSON.stringify({ step: targetAgent, text: event.delta.text })}\n\n`);
          }
        }
        agentResponse += turnText;

        const finalMsg = await agentStream.finalMessage();
        workingMsgs.push({ role: "assistant", content: finalMsg.content });

        if (finalMsg.stop_reason !== "tool_use") break;

        const toolResults = [];
        for (const block of finalMsg.content) {
          if (block.type !== "tool_use") continue;
          let result;
          if (block.name === "registrar_lead") {
            try {
              await sendLeadAlert(block.input);
              result = "Lead registrado. Alerta enviada a Pinky.";
              res.write(`data: ${JSON.stringify({ tool: "registrar_lead", lead: block.input })}\n\n`);
            } catch (err) {
              result = `Error al enviar alerta: ${err.message}`;
            }
          } else {
            result = handleCollabTool(targetAgent, block, (d) => res.write(`data: ${JSON.stringify(d)}\n\n`))
              ?? `Herramienta "${block.name}" no implementada.`;
          }
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
        }
        workingMsgs.push({ role: "user", content: toolResults });
      }

      conversations[targetAgent].push({ role: "assistant", content: agentResponse });
      saveState();
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error(err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ─── ENDPOINT: WORKSPACE ───────────────────────────────────────────────────

app.get("/api/workspace", (_req, res) => {
  res.json({ entries: agentWorkspace.slice(-30) });
});

app.delete("/api/workspace", (_req, res) => {
  agentWorkspace.length = 0;
  _wsId = 0;
  saveState();
  res.json({ ok: true });
});

// ─── ENDPOINT: COLABORACIÓN MULTI-AGENTE ───────────────────────────────────

app.post("/api/collaborate", async (req, res) => {
  const { topic, agents: requestedAgents } = req.body;
  if (!topic) return res.status(400).json({ error: "Falta topic" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`); };

  const participantes = (requestedAgents || ["gym", "ventas", "finanzas", "procesos"])
    .filter(id => SYSTEM_PROMPTS[id]);

  const agentResponses = {};

  try {
    for (const agentId of participantes) {
      send({ step: agentId, status: "thinking" });

      // Contexto de agentes que ya respondieron
      const priorCtx = Object.entries(agentResponses)
        .map(([id, text]) => `### ${AGENT_NAMES[id] ?? id} dijo:\n${text}`)
        .join("\n\n---\n\n");

      // Workspace se inyecta en el mensaje de usuario, no en system, para preservar cache
      const wsCtx = getWorkspaceSummary(agentId);
      const wsPrefix = wsCtx ? `[Workspace — notas recientes de otros agentes]\n${wsCtx}\n\n---\n` : "";

      const userMsg = priorCtx
        ? `${wsPrefix}Tema de colaboración: "${topic}"\n\nPerspectivas previas:\n\n${priorCtx}\n\n---\n\nDa tu perspectiva desde tu área: (1) impacto, (2) información clave que aportas, (3) feedback o recomendación concreta a lo que dijeron los demás.`
        : `${wsPrefix}Tema de colaboración: "${topic}"\n\nEres el primer agente en responder. Comparte tu perspectiva desde tu área de forma concisa y accionable.`;

      let agentText = "";
      let workingMsgs = [{ role: "user", content: userMsg }];

      while (true) {
        const localStream = client.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 1200,
          system: [{ type: "text", text: SYSTEM_PROMPTS[agentId], cache_control: { type: "ephemeral" } }],
          tools: COLLAB_TOOLS,
          messages: workingMsgs,
        });

        let turnText = "";
        for await (const event of localStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            turnText += event.delta.text;
            agentText += event.delta.text;
            send({ step: agentId, status: "streaming", text: event.delta.text });
          }
        }

        const finalMsg = await localStream.finalMessage();
        workingMsgs.push({ role: "assistant", content: finalMsg.content });

        if (finalMsg.stop_reason !== "tool_use") break;

        const toolResults = [];
        for (const block of finalMsg.content) {
          if (block.type !== "tool_use") continue;
          const result = handleCollabTool(agentId, block, send)
            ?? `Herramienta "${block.name}" no implementada.`;
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
        }
        workingMsgs.push({ role: "user", content: toolResults });
      }
      agentResponses[agentId] = agentText;

      // Auto-publica al workspace
      if (agentText.trim()) {
        addToWorkspace(agentId, `Colaboración: ${topic.slice(0, 50)}`, agentText.slice(0, 400));
      }

      send({ step: agentId, status: "done" });
    }

    // Síntesis final del orquestador
    send({ step: "synthesis", status: "thinking" });

    const allText = Object.entries(agentResponses)
      .map(([id, text]) => `### ${AGENT_NAMES[id] ?? id}:\n${text}`)
      .join("\n\n---\n\n");

    const synthStream = client.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      system: [{ type: "text", text: SYSTEM_PROMPTS.orchestrator }],
      messages: [{ role: "user", content: `Sintetiza en 4-6 bullets las perspectivas clave y la acción prioritaria del equipo sobre: "${topic}"\n\n${allText}` }],
    });

    for await (const event of synthStream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        send({ step: "synthesis", status: "streaming", text: event.delta.text });
      }
    }

    send({ done: true });
    res.end();
  } catch (err) {
    console.error("❌ /api/collaborate:", err.message);
    send({ error: err.message });
    res.end();
  }
});

// ─── ENDPOINT: AUDITORÍA WEB (4 sub-agentes del Gym) ──────────────────────

app.post("/api/agents/gym/audit", async (_req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (data) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // ── CRO → Copy → SEO estrictamente secuencial ───────────────
    const collectedReports = {};

    const sequence = [
      { id: "gym-cro",  phase: 1, label: "Fase 1 — Conversiones" },
      { id: "gym-copy", phase: 1, label: "Fase 1 — Copy" },
      { id: "gym-seo",  phase: 2, label: "Fase 2 — SEO" },
    ];

    let currentPhase = 0;
    for (const { id, phase, label } of sequence) {
      if (phase !== currentPhase) {
        currentPhase = phase;
        sendEvent({ type: "phase", phase, label });
      }
      sendEvent({ type: "agent_start", agent: id });
      let report = "";
      try {
        await runAuditAgent(id, (evt) => {
          if (evt.type === "text") report += evt.text;
          sendEvent(evt);
        }, collectedReports);
        collectedReports[id] = report;
        sendEvent({ type: "agent_done", agent: id });
      } catch (err) {
        sendEvent({ type: "agent_error", agent: id, error: err.message });
      }
    }

    // Guarda contexto completo para el botón UX
    auditReportsCache = { ...collectedReports };
    sendEvent({ type: "done", reportsReady: true });
  } catch (err) {
    sendEvent({ type: "error", error: err.message });
  }

  res.end();
});

// ─── ENDPOINT: UX/UI — activación manual con contexto de los 3 agentes ───

let auditReportsCache = {};

app.post("/api/agents/gym/audit/ux", async (_req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (data) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent({ type: "agent_start", agent: "gym-ux" });
  try {
    await runAuditAgent("gym-ux", sendEvent, auditReportsCache);
    sendEvent({ type: "agent_done", agent: "gym-ux" });
  } catch (err) {
    sendEvent({ type: "agent_error", agent: "gym-ux", error: err.message });
  }
  sendEvent({ type: "done" });
  res.end();
});

// ─── ENDPOINT: LIMPIAR HISTORIAL ───────────────────────────────────────────

app.delete("/api/agents/:agentId/history", (req, res) => {
  const { agentId } = req.params;
  if (conversations[agentId] !== undefined) {
    conversations[agentId] = [];
    saveState();
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: "Agente no encontrado" });
  }
});

// ─── EMAIL AGENT ────────────────────────────────────────────────────────────

const TEAM_EMAILS = [
  { name: "Ángel",         role: "Coordinador Educativo",  email: "angel.fego0@gmail.com" },
  { name: "Eliel",         role: "Coach Principal",        email: "elielpk@gmail.com" },
  // Adrián Pantoja — baja 30 abril 2026 (removido de minutas)
  { name: "Jesús",         role: "Ventas/Admin",           email: "jes.escareno@gmail.com" },
  { name: "Flavio",        role: "Operaciones/Finanzas",   email: "flaviopadilla9@gmail.com" },
  { name: "Berenice Soto", role: "Legal",                  email: "kberenice.soto@gmail.com" },
  { name: "Pinky",         role: "Dirección/Diseño",       email: "alejandrogctu@gmail.com" },
];

const mailer = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// Inbox en memoria
const inboxCache = { emails: [], lastCheck: null };

// ── Helpers ────────────────────────────────────────────────────────────────

function mdToHtml(md) {
  return md
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.*)/gm, "<h4 style='margin:10px 0 4px;color:#333'>$1</h4>")
    .replace(/^## (.*)/gm,  "<h3 style='margin:14px 0 6px;color:#1a1a2e'>$1</h3>")
    .replace(/^# (.*)/gm,   "<h2 style='margin:0 0 8px;color:#1a1a2e'>$1</h2>")
    .replace(/^- (.*)/gm,   "<li style='margin:2px 0'>$1</li>")
    .replace(/(<li[^>]*>.*<\/li>\n?)+/gs, "<ul style='margin:6px 0;padding-left:20px'>$&</ul>")
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");
}

function emailTemplate(title, content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto">
    <div style="background:#1a1a2e;color:white;padding:20px 24px;border-radius:8px 8px 0 0">
      <div style="font-size:20px;font-weight:bold">🏃 weAPES Parkour Center</div>
      <div style="opacity:.75;font-size:13px;margin-top:4px">${title}</div>
    </div>
    <div style="background:white;padding:24px;border:1px solid #ddd;border-radius:0 0 8px 8px;line-height:1.7;color:#333">
      ${content}
    </div>
    <div style="text-align:center;color:#aaa;font-size:11px;margin-top:10px">
      Generado automáticamente por el sistema weAPES · ${new Date().toLocaleDateString("es-MX")}
    </div>
  </div>
</body></html>`;
}

// ── Alerta de nuevo lead Woodspa → Pinky ──────────────────────────────────

async function sendLeadAlert(lead) {
  const { nombre, contacto = "—", servicio, valor_estimado = 0, notas } = lead;
  const fecha = new Date().toLocaleDateString("es-MX", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const hora = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  const valorStr = valor_estimado > 0
    ? `$${valor_estimado.toLocaleString("es-MX")} MXN`
    : "Por definir";

  const content = `
<div style="background:#f9f3ee;border-left:4px solid #c0882a;padding:16px 20px;border-radius:0 6px 6px 0;margin-bottom:20px">
  <div style="font-size:18px;font-weight:bold;color:#c0882a">🪑 Nuevo Lead — Woodspa</div>
  <div style="font-size:12px;color:#888;margin-top:4px">${fecha} · ${hora}</div>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
  <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold;width:150px">Clínica / Empresa</td><td style="padding:8px 12px">${nombre}</td></tr>
  <tr><td style="padding:8px 12px;font-weight:bold">Contacto</td><td style="padding:8px 12px">${contacto}</td></tr>
  <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold">Servicio de interés</td><td style="padding:8px 12px;background:#f5f5f5">${servicio}</td></tr>
  <tr><td style="padding:8px 12px;font-weight:bold">Valor estimado</td>
      <td style="padding:8px 12px;font-weight:bold;color:${valor_estimado > 0 ? "#2a7a3b" : "#888"}">${valorStr}</td></tr>
  <tr><td style="padding:8px 12px;background:#f5f5f5;font-weight:bold;vertical-align:top">Notas</td>
      <td style="padding:8px 12px;background:#f5f5f5">${notas}</td></tr>
</table>`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto">
    <div style="background:#2c1a0e;color:white;padding:20px 24px;border-radius:8px 8px 0 0">
      <div style="font-size:20px;font-weight:bold">🪑 Woodspa — Muebles &amp; Diseño</div>
      <div style="opacity:.75;font-size:13px;margin-top:4px">Alerta de nuevo prospecto</div>
    </div>
    <div style="background:white;padding:24px;border:1px solid #ddd;border-radius:0 0 8px 8px;line-height:1.7;color:#333">
      ${content}
    </div>
    <div style="text-align:center;color:#aaa;font-size:11px;margin-top:10px">
      Detectado por el Agente CEO/Ventas · ${new Date().toLocaleDateString("es-MX")}
    </div>
  </div>
</body></html>`;

  await mailer.sendMail({
    from: `"Woodspa Agente" <${process.env.EMAIL_USER}>`,
    to: "alejandrogctu@gmail.com",
    subject: `🪑 Nuevo lead Woodspa: ${nombre}`,
    html,
    text: `Nuevo lead Woodspa\n\nClínica/Empresa: ${nombre}\nContacto: ${contacto}\nServicio: ${servicio}\nValor estimado: ${valorStr}\nNotas: ${notas}\n\nDetectado: ${fecha} · ${hora}`,
  });
}

// ── Generar minuta con el Agente Gym ───────────────────────────────────────

async function generateMinuta() {
  const fecha = new Date().toLocaleDateString("es-MX", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const semana = Math.ceil(new Date().getDate() / 7);

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1500,
    system: [{ type: "text", text: SYSTEM_PROMPTS.gym, cache_control: { type: "ephemeral" } }],
    messages: [{
      role: "user",
      content: `Genera la Minuta Semanal de weAPES — Semana ${semana} (${fecha}).

Estructura EXACTA (no cambies los títulos):

# Minuta Semanal weAPES — Semana ${semana}

## ✅ Logros esta semana
[bullets: qué se completó]

## 📊 Estado de subproyectos
[SG1–SG5: avance, responsable, próximo paso]

## 🔴 Pendientes críticos próxima semana
[Tarea | Responsable | Fecha límite]

## 💰 Alerta financiera
[solo si hay algo relevante, sino omitir]

## 📋 Prioridades por grupo
[G1–G5: 1 acción concreta cada uno]

Máximo 400 palabras. Directo, sin relleno.`,
    }],
  });

  return response.content.find(b => b.type === "text")?.text ?? "";
}

// ── Enviar minuta a todo el equipo ─────────────────────────────────────────

async function sendWeeklyMinuta() {
  const minuta = await generateMinuta();
  const semana = Math.ceil(new Date().getDate() / 7);
  const mes = new Date().toLocaleDateString("es-MX", { month: "long" });
  const año = new Date().getFullYear();
  const subject = `weAPES — Minuta Semana ${semana} ${mes} ${año}`;
  const html = emailTemplate(subject, mdToHtml(minuta));

  const results = await Promise.allSettled(
    TEAM_EMAILS.map(m =>
      mailer.sendMail({
        from: `"weAPES Admin" <${process.env.EMAIL_USER}>`,
        to: m.email,
        subject,
        html,
        text: minuta,
      })
      .then(() => ({ name: m.name, email: m.email, ok: true }))
      .catch(err => ({ name: m.name, email: m.email, ok: false, error: err.message }))
    )
  );

  return {
    minuta,
    sent: results.map(r => r.status === "fulfilled" ? r.value : r.reason),
    sentAt: new Date().toISOString(),
  };
}

// ── Clasificar email con Haiku (rápido y barato) ───────────────────────────

async function classifyEmail(from, subject, body) {
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 400,
    system: [{ type: "text", text: SYSTEM_PROMPTS.gym, cache_control: { type: "ephemeral" } }],
    messages: [{
      role: "user",
      content: `Email recibido en admin@weapesparkour.com:
De: ${from}
Asunto: ${subject}
Cuerpo: ${body.slice(0, 800)}

Responde SOLO JSON válido (sin texto extra):
{"categoria":"cliente_nuevo|alumno_activo|proveedor|urgente|admin|spam","prioridad":"alta|media|baja","requiere_respuesta":true,"resumen":"una línea de qué trata","accion":"qué hacer exactamente","borrador":"borrador de respuesta corto o null"}`,
    }],
  });

  const text = response.content.find(b => b.type === "text")?.text ?? "{}";
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  } catch {
    return { categoria: "admin", prioridad: "media", resumen: subject, accion: "Revisar manualmente" };
  }
}

// ── Polling IMAP ───────────────────────────────────────────────────────────

async function pollInbox() {
  const imap = new ImapFlow({
    host: "imap.hostinger.com",
    port: 993,
    secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    logger: false,
  });

  await imap.connect();
  const lock = await imap.getMailboxLock("INBOX");
  let newCount = 0;

  try {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    for await (const msg of imap.fetch({ seen: false, since }, { envelope: true, source: true })) {
      const uid = String(msg.uid);
      if (inboxCache.emails.some(e => e.uid === uid)) continue;

      const raw = msg.source?.toString() ?? "";
      const bodyRaw = raw.split(/\r?\n\r?\n/).slice(1).join("\n");
      const body = bodyRaw
        .replace(/=\r?\n/g, "")
        .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "")
        .trim()
        .slice(0, 1200);

      const from    = msg.envelope?.from?.[0]?.address ?? "desconocido";
      const subject = msg.envelope?.subject ?? "(sin asunto)";
      const date    = msg.envelope?.date ?? new Date();

      const classification = await classifyEmail(from, subject, body);
      inboxCache.emails.unshift({ uid, from, subject, date, body, ...classification, processedAt: new Date() });
      newCount++;
    }
  } finally {
    lock.release();
    await imap.logout();
  }

  inboxCache.emails = inboxCache.emails.slice(0, 60);
  inboxCache.lastCheck = new Date();
  return newCount;
}

// ─── CRON JOBS ─────────────────────────────────────────────────────────────

// Minuta semanal: viernes 6pm hora Monterrey
cron.schedule("0 18 * * 5", async () => {
  console.log("📧 Generando minuta semanal weAPES...");
  try {
    const r = await sendWeeklyMinuta();
    const ok = r.sent.filter(s => s.ok).length;
    console.log(`✅ Minuta enviada a ${ok}/${TEAM_EMAILS.length} integrantes`);
  } catch (err) {
    console.error("❌ Error minuta:", err.message);
  }
}, { timezone: "America/Monterrey" });

// Inbox polling: cada 5 minutos
cron.schedule("*/5 * * * *", async () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  try {
    const n = await pollInbox();
    if (n > 0) console.log(`📬 ${n} email(s) nuevo(s) clasificados`);
  } catch (err) {
    console.error("📬 IMAP error:", err.message);
  }
});

// ─── ENDPOINTS EMAIL ────────────────────────────────────────────────────────

// GET  /api/email/inbox — inbox clasificado
app.get("/api/email/inbox", async (_req, res) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)
      return res.status(503).json({ error: "EMAIL_USER / EMAIL_PASS no configurados en .env" });
    if (!inboxCache.lastCheck || Date.now() - new Date(inboxCache.lastCheck).getTime() > 5 * 60 * 1000)
      await pollInbox();
    res.json({ emails: inboxCache.emails, lastCheck: inboxCache.lastCheck });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/inbox/refresh — forzar refresco manual
app.post("/api/email/inbox/refresh", async (_req, res) => {
  try {
    const newEmails = await pollInbox();
    res.json({ ok: true, newEmails, total: inboxCache.emails.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/minuta/preview — previsualizar sin enviar
app.post("/api/email/minuta/preview", async (_req, res) => {
  try {
    const minuta = await generateMinuta();
    res.json({ ok: true, minuta });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/minuta/send — enviar manualmente ahora
app.post("/api/email/minuta/send", async (_req, res) => {
  try {
    const result = await sendWeeklyMinuta();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GENERAR ESCENA OFICINA ────────────────────────────────────────────────

// ── Helpers de script compartidos (header reutilizable) ────────────────────
const BLENDER_HEADER = `
import bpy, math, mathutils

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
for m in list(bpy.data.materials): bpy.data.materials.remove(m)

def mm(name, r, g, b, rough=0.5, metal=0.0, emit=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (r, g, b, alpha)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if emit > 0:
        p.inputs['Emission Color'].default_value = (r, g, b, 1)
        p.inputs['Emission Strength'].default_value = emit
    if alpha < 1.0:
        m.blend_method = 'BLEND'
    return m

def box(name, x, y, z, dx, dy, dz, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x+dx/2, y+dy/2, z+dz/2))
    o = bpy.context.object; o.scale=(dx,dy,dz); o.name=name
    o.data.materials.append(mat); return o

def cyl(name, x, y, z, r, h, mat):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(x, y, z+h/2))
    o = bpy.context.object; o.name=name; o.data.materials.append(mat); return o

def sphere(name, x, y, z, r, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x,y,z))
    o = bpy.context.object; o.name=name; o.data.materials.append(mat); return o

def eevee_render(filepath, res_x=1920, res_y=1080):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    try:
        sc.eevee.taa_render_samples = 32
        sc.eevee.use_gtao = True
        sc.eevee.use_bloom = True
        sc.eevee.bloom_intensity = 0.05
    except Exception: pass
    sc.render.resolution_x = res_x; sc.render.resolution_y = res_y
    sc.render.filepath = filepath
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGB'
    bpy.ops.render.render(write_still=True)

def setup_world(r, g, b, strength=0.5):
    w = bpy.data.worlds['World']; w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (r, g, b, 1)
    bg.inputs['Strength'].default_value = strength
`;

// ── weAPES — oficina parkour/industrial ───────────────────────────────────
function generateWeapesScript() {
  return BLENDER_HEADER + `
# ═══ WEAPES OFFICE — Parkour / Industrial ═══════════════════════════════════

# Materiales
mConc0= mm('C0',0.52,0.52,0.54,rough=0.95)  # concreto claro
mConc1= mm('C1',0.44,0.44,0.46,rough=0.95)  # concreto oscuro
mWall = mm('W', 0.82,0.84,0.80,rough=0.9)   # pared industrial
mAccent=mm('Acc',0.20,0.85,0.50,rough=0.3)  # verde weAPES
mYellow=mm('Yel',0.97,0.86,0.10,rough=0.4)  # amarillo weAPES
mPurple=mm('Pur',0.52,0.22,0.96,rough=0.4)  # morado weAPES
mSteel= mm('Stl',0.55,0.57,0.60,rough=0.2,metal=0.9)
mDesk = mm('Dsk',0.22,0.22,0.24,rough=0.4)  # escritorio oscuro
mDeskT= mm('DsT',0.26,0.28,0.30,rough=0.25)
mMon  = mm('Mon',0.06,0.06,0.08,rough=0.1,metal=0.5)
mSkin = mm('Skn',0.94,0.78,0.62,rough=0.75)
mHair = mm('Har',0.12,0.08,0.06,rough=0.85)
mLP   = mm('LP', 1.00,0.96,0.82,rough=0.4,emit=2.8)
mGlass= mm('Gl', 0.70,0.85,0.95,rough=0.05,alpha=0.4)

# Piso de concreto con juntas
for i in range(9):
    for j in range(7):
        fm = mConc0 if (i+j)%2==0 else mConc1
        box(f'F{i}_{j}',i*0.8,j*0.8,-0.04,0.79,0.79,0.04,fm)

# Paredes industriales con paneles de aislante
mPanel=mm('Pnl',0.30,0.32,0.34,rough=0.7)
box('WB',0,-0.1,0,7.5,0.1,3.5,mWall)
box('WL',-0.1,0,0,0.1,6.5,3.5,mWall)
box('WR',7.5,0,0,0.1,6.5,3.5,mWall)
box('WTop',0,-0.1,3.5,7.5,0.1,0.3,mm('WT',0.18,0.20,0.22,rough=0.6))  # franja oscura superior

# Vigas metálicas en techo
for bx in [1.5,3.75,6.0]:
    box(f'Viga{bx}',bx-0.06,0,3.2,0.12,6.5,0.18,mSteel)
box('VigaT',0,3.2,3.2,7.5,0.12,0.18,mSteel)

# Paneles de luz industriales colgantes
for lx,ly in [(1.5,1.5),(3.75,1.5),(6.0,1.5),(1.5,4.5),(3.75,4.5)]:
    box(f'LS{lx}',lx-0.06,ly-0.02,2.8,0.12,0.04,0.42,mSteel)
    box(f'LP{lx}',lx-0.35,ly-0.22,2.38,0.70,0.44,0.06,mLP)

# Ventanas industriales con marco metálico
for wx in [1.0,3.5,6.0]:
    box(f'WG{wx}',wx-0.40,-0.06,0.80,0.80,0.06,1.80,mGlass)
    box(f'WF{wx}',wx-0.42,-0.08,0.78,0.84,0.08,0.05,mSteel)
    box(f'WFv{wx}',wx-0.01,-0.08,0.80,0.04,0.08,1.82,mSteel)

# Pantalla/pizarrón en pared posterior
mScrS=mm('SS',0.04,0.10,0.20,rough=0.05,emit=1.0)
box('ScrF',1.5,-0.08,0.9,2.8,0.08,1.6,mMon)
box('ScrFace',1.62,-0.03,1.0,2.56,0.03,1.4,mScrS)
box('ScrPed',2.87,-0.05,0,0.10,0.05,0.9,mSteel)

# Logo weAPES en la pared (franja colores)
box('LogoG',0,-0.03,2.9,2.5,0.03,0.22,mAccent)
box('LogoY',2.5,-0.03,2.9,2.5,0.03,0.22,mYellow)
box('LogoP',5.0,-0.03,2.9,2.5,0.03,0.22,mPurple)

# Mesa de reuniones central (mesa negra estilo industrial)
mTabla=mm('Tb',0.14,0.14,0.16,rough=0.3,metal=0.1)
box('MT',2.0,1.8,0,3.0,1.8,0.6,mTabla)
box('MTS',1.9,1.7,0.6,3.2,2.0,0.06,mm('MtS',0.20,0.22,0.24,rough=0.15,metal=0.2))
for lx,ly in [(2.15,2.0),(4.85,2.0),(2.15,3.6),(4.85,3.6)]:
    cyl(f'MTL{lx}',lx,ly,0,0.055,0.6,mSteel)

# Sillas de reunión estilo industrial
mChr=mm('Chr',0.16,0.18,0.20,rough=0.5); mChrL=mm('CL',0.50,0.52,0.55,rough=0.15,metal=0.7)
for ci,(cx,cy) in enumerate([[2.6,1.4],[3.5,1.4],[4.4,1.4],[2.6,3.8],[3.5,3.8],[4.4,3.8],[1.8,2.7],[5.2,2.7]]):
    box(f'CS{ci}',cx-0.26,cy-0.26,0.18,0.52,0.52,0.07,mChr)
    box(f'CB{ci}',cx-0.26,cy-0.27,0.24,0.52,0.07,0.56,mChr)
    for lx2,ly2 in [(-0.21,-0.20),(0.21,-0.20),(-0.21,0.20),(0.21,0.20)]:
        cyl(f'CL{ci}{lx2}',cx+lx2,cy+ly2+0.20,0,0.020,0.20,mChrL)

# Rack de parkour en pared derecha (barras de práctica)
mRack=mm('Rck',0.80,0.82,0.84,rough=0.2,metal=0.8)
for rz in [0.6,1.0,1.4]:
    box(f'Rb{rz}',7.0,1.0,rz,0.40,0.08,0.06,mRack)
    box(f'Rp{rz}',7.38,1.0,0.3,0.06,0.08,1.2+rz*0.1,mRack)

# ── Paletas por especie primate ──────────────────────────────────────────────
PRIMATE_FUR  = {"gym":(0.48,0.24,0.10),"parkour":(0.54,0.23,0.08),"finanzas":(0.83,0.53,0.06),"procesos":(0.48,0.54,0.58)}
PRIMATE_FACE = {"gym":(0.83,0.52,0.35),"parkour":(0.78,0.44,0.31),"finanzas":(0.29,0.51,0.79),"procesos":(0.66,0.73,0.76)}
PRIMATE_DARK = {"gym":(0.30,0.14,0.06),"parkour":(0.34,0.14,0.05),"finanzas":(0.55,0.35,0.04),"procesos":(0.30,0.34,0.38)}
PRIMATE_BELLY= {"gym":(0.90,0.65,0.45),"parkour":(0.84,0.56,0.40),"finanzas":(0.93,0.68,0.18),"procesos":(0.75,0.82,0.84)}

# Agentes weAPES — primates
AGENTS_W = [
    ("gym",       0.3,0.3,1.8,0.9,(0.04,0.75,0.45),+1,"Gym PM"),
    ("parkour",   5.0,0.3,1.8,0.9,(0.64,0.28,0.95),+1,"Diseño Parkour"),
    ("finanzas",  0.3,4.5,1.8,0.9,(0.03,0.60,0.75),-1,"Finanzas"),
    ("procesos",  5.0,4.5,1.8,0.9,(0.14,0.40,0.95),-1,"Procesos"),
]

for aid,x,y,w,d,(r,g,b),fd,label in AGENTS_W:
    mac  = mm(f'AC{aid}',r,g,b,rough=0.4)
    mscr = mm(f'SC{aid}',r*0.5,g*0.9,b*0.9,rough=0.05,emit=1.0)
    mChrA= mm(f'Ca{aid}',0.16,0.18,0.20,rough=0.5)
    fr,fg,fb = PRIMATE_FUR[aid]
    fr2,fg2,fb2 = PRIMATE_FACE[aid]
    dr,dg,db = PRIMATE_DARK[aid]
    br,bg2,bb = PRIMATE_BELLY[aid]
    mFur  = mm(f'Fu{aid}',fr,fg,fb,rough=0.72)
    mFace = mm(f'Fc{aid}',fr2,fg2,fb2,rough=0.65)
    mDark = mm(f'Dk2{aid}',dr,dg,db,rough=0.72)
    mBelly= mm(f'Bl{aid}',br,bg2,bb,rough=0.65)
    me    = mm(f'Ey{aid}',r,g,b,rough=0.05)

    # Escritorio oscuro industrial
    box(f'Dk{aid}',x,y,0,w,d,0.72,mDesk)
    box(f'DkT{aid}',x-0.02,y-0.02,0.72,w+0.04,d+0.04,0.05,mm(f'DT{aid}',0.26,0.28,0.30,rough=0.25))
    box(f'DkStr{aid}',x,y,0.48,w,0.025,0.24,mac)
    cx=x+w/2; cy=y+d/2
    # Monitor
    box(f'MnB{aid}',cx-0.28,cy-0.015,0.98,0.56,0.03,0.40,mMon)
    box(f'MnS{aid}',cx-0.24,cy-0.005,1.02,0.48,0.01,0.32,mscr)
    box(f'MnP{aid}',cx-0.02,cy-0.015,0.76,0.04,0.03,0.22,mMon)
    box(f'KB{aid}',cx-0.18,cy+0.06,0.75,0.36,0.16,0.018,mm(f'kb{aid}',0.22,0.22,0.24,rough=0.55))
    # Silla
    ch_y = cy + fd*(d/2+0.38)
    box(f'ChS{aid}',cx-0.24,ch_y-0.24,0.20,0.48,0.48,0.06,mChrA)
    box(f'ChB{aid}',cx-0.24,ch_y-0.26,0.25,0.48,0.05,0.50,mChrA)
    for lx2,ly2 in [(-0.19,-0.18),(0.19,-0.18),(-0.19,0.18),(0.19,0.18)]:
        cyl(f'ChL{aid}{lx2}',cx+lx2,ch_y+ly2,0,0.018,0.21,mm(f'CL{aid}{lx2}',0.50,0.52,0.55,rough=0.15,metal=0.7))

    # ── Cuerpo primate ──────────────────────────────────────────────────────
    # Torso con pelaje
    sphere(f'TrB{aid}',cx,ch_y-fd*0.05,0.58,0.19,mFur)
    # Barriga más clara
    sphere(f'TrF{aid}',cx,ch_y-fd*0.10,0.56,0.13,mBelly)
    # Camiseta/chaqueta de color del agente
    box(f'Tr{aid}',cx-0.13,ch_y-0.08,0.38,0.26,0.16,0.38,mac)
    # Piernas
    box(f'LL{aid}',cx-0.13,ch_y-0.08,0.10,0.11,0.08,0.28,mm(f'Lf{aid}',dr,dg,db,rough=0.7))
    box(f'LR{aid}',cx+0.02,ch_y-0.08,0.10,0.11,0.08,0.28,mm(f'Lr{aid}',dr,dg,db,rough=0.7))
    # Brazos sobre el escritorio
    box(f'AL{aid}',cx-0.20,ch_y-fd*0.10-0.03,0.60,0.09,0.19,0.06,mFur)
    box(f'AR{aid}',cx+0.11,ch_y-fd*0.10-0.03,0.60,0.09,0.19,0.06,mFur)

    # ── Cabeza primate ──────────────────────────────────────────────────────
    sphere(f'Hd{aid}',cx,ch_y,1.12,0.21,mFur)
    # Disco facial más claro
    sphere(f'FcD{aid}',cx,ch_y-fd*0.14,1.10,0.145,mFace)
    # Hocico protruyente
    sphere(f'Mz{aid}',cx,ch_y-fd*0.19,1.06,0.08,mFace)
    # Nariz
    sphere(f'Nz{aid}',cx,ch_y-fd*0.21,1.10,0.030,mDark)
    # Orejas
    sphere(f'EarL{aid}',cx-0.19,ch_y,1.12,0.078,mFur)
    sphere(f'EarR{aid}',cx+0.19,ch_y,1.12,0.078,mFur)
    sphere(f'EarLi{aid}',cx-0.19,ch_y-fd*0.02,1.14,0.046,mFace)
    sphere(f'EarRi{aid}',cx+0.19,ch_y-fd*0.02,1.14,0.046,mFace)
    # Ojos con color del agente
    for ex in [-0.07,0.07]:
        sphere(f'Ew{aid}{ex}',cx+ex,ch_y-fd*0.17,1.12,0.034,mm(f'EW{aid}{ex}',1,1,1,rough=0.05))
        sphere(f'E{aid}{ex}',cx+ex*0.7,ch_y-fd*0.19,1.14,0.018,me)
    # Cola — arco de esferas hacia atrás
    for ti in range(5):
        ang = ti * 0.30
        ty = ch_y + fd*(0.18 + ti*0.10)
        tz = 0.90 - ti*0.04 + math.sin(ang)*0.12
        sphere(f'Tl{aid}{ti}',cx-0.15,ty,tz, max(0.06-ti*0.008,0.025), mFur if ti<3 else mBelly)

    # ── Accesorio por agente ────────────────────────────────────────────────
    if aid == "gym":
        # Headband rojo
        cyl(f'Hb{aid}',cx,ch_y,1.30,0.22,0.038,mm(f'HB{aid}',0.92,0.22,0.22,rough=0.4))
    elif aid == "parkour":
        # Cresta rojiza + lápiz
        sphere(f'Crest{aid}',cx,ch_y,1.30,0.16,mm(f'Cr{aid}',0.62,0.22,0.06,rough=0.65))
        box(f'Pen{aid}',cx+0.18,ch_y+fd*0.04,1.24,0.028,0.028,0.26,mm(f'Pn{aid}',0.98,0.94,0.78,rough=0.5))
    elif aid == "finanzas":
        # Lentes dorados (puente + 2 marcos)
        box(f'Br{aid}',cx-0.08,ch_y-fd*0.20,1.16,0.16,0.02,0.015,mm(f'BRG{aid}',0.85,0.65,0.05,rough=0.3,metal=0.6))
        for bx2 in [-0.08,0.08]:
            cyl(f'Lns{aid}{bx2}',cx+bx2,ch_y-fd*0.20,1.14,0.055,0.015,mm(f'LF{aid}{bx2}',0.85,0.65,0.05,rough=0.3,metal=0.6))
    elif aid == "procesos":
        # Casco amarillo
        sphere(f'Hat{aid}',cx,ch_y,1.30,0.24,mm(f'Ht{aid}',0.97,0.82,0.08,rough=0.4),)
        box(f'HatV{aid}',cx-0.22,ch_y-fd*0.18,1.22,0.44,0.04,0.04,mm(f'HV{aid}',0.95,0.78,0.06,rough=0.4))

# Plantas/decoración weAPES
mp=mm('Pot',0.40,0.38,0.36,rough=0.8); mpl=mm('Pl',0.12,0.55,0.18,rough=0.85)
for px,py in [(0.3,5.9),(7.1,0.3)]:
    cyl(f'Pt{px}',px,py,0,0.20,0.45,mp)
    sphere(f'Pl{px}',px,py,0.76,0.28,mpl)
    for li in range(4):
        a=li*math.pi/2+math.pi/4
        sphere(f'Pl{px}l{li}',px+math.cos(a)*0.17,py+math.sin(a)*0.17,0.66,0.17,mpl)

# Cámara — desde el lado abierto mirando hacia la pared trasera
cam_loc=(3.8,9.5,4.5); cam_target=(3.6,1.8,0.9)
bpy.ops.object.camera_add(location=cam_loc)
cam=bpy.context.object; cam.name='Cam'
direction=mathutils.Vector(cam_target)-mathutils.Vector(cam_loc)
cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
cam.data.lens=32; bpy.context.scene.camera=cam

# Iluminación — industrial (fría/dura)
bpy.ops.object.light_add(type='SUN',location=(5,10,12))
s=bpy.context.object.data; s.energy=5.0; s.color=(0.92,0.96,1.0)
s.angle=math.radians(3)
bpy.context.object.rotation_euler=(math.radians(38),0,math.radians(155))
bpy.ops.object.light_add(type='AREA',location=(3.8,4.0,3.8))
f=bpy.context.object.data; f.energy=80; f.size=6; f.color=(0.80,0.90,1.0)
bpy.context.object.rotation_euler=(math.radians(-55),0,0)
bpy.ops.object.light_add(type='AREA',location=(3.8,0.5,2.5))
bk=bpy.context.object.data; bk.energy=40; bk.size=4; bk.color=(0.30,0.92,0.55)
bpy.context.object.rotation_euler=(math.radians(50),0,0)

setup_world(0.60,0.68,0.80,0.4)
eevee_render(${JSON.stringify(RENDER_PATH_WEAPES)})
bpy.ops.wm.save_mainfile(filepath='C:/Users/alex/Desktop/oficina_weapes.blend')
result={"ok":True}
`;
}

// ── Woodspa — oficina clínica/diseño ──────────────────────────────────────
function generateWoodspaScript() {
  return BLENDER_HEADER + `
# ═══ WOODSPA OFFICE — Clean Clinical / Design Studio ═══════════════════════

# Materiales — paleta blanca/madera/teal
mFloor0=mm('F0',0.94,0.92,0.88,rough=0.2)   # piso claro
mFloor1=mm('F1',0.88,0.85,0.80,rough=0.2)   # piso oscuro
mWall  =mm('Wl',0.97,0.97,0.96,rough=0.9)   # pared blanca
mWood  =mm('Wd',0.68,0.48,0.30,rough=0.55)  # madera cálida
mTeal  =mm('Tl',0.00,0.56,0.50,rough=0.35)  # teal Woodspa
mAmber =mm('Am',0.90,0.55,0.10,rough=0.35)  # amber Woodspa
mCream =mm('Cr',0.98,0.96,0.92,rough=0.6)   # crema
mGlass =mm('Gl',0.75,0.90,0.95,rough=0.04,alpha=0.35)
mMetal =mm('Mt',0.82,0.84,0.86,rough=0.1,metal=0.9)
mDesk  =mm('Dsk',0.96,0.94,0.90,rough=0.35) # escritorio crema
mDeskT =mm('DsT',0.98,0.97,0.94,rough=0.2)
mMon   =mm('Mon',0.10,0.10,0.12,rough=0.1,metal=0.4)
mLP    =mm('LP', 1.00,0.98,0.94,rough=0.5,emit=2.2)
mSkin  =mm('Skn',0.94,0.78,0.62,rough=0.75)
mHair  =mm('Har',0.12,0.08,0.06,rough=0.85)

# Piso de madera con tablas
for i in range(15):  # tablas de 0.5m
    for j in range(12):
        fm=mFloor0 if i%2==0 else mFloor1
        box(f'F{i}_{j}',i*0.5,j*0.5,-0.04,0.49,0.49,0.04,fm)

# Paredes blancas con zócalos
box('WB',0,-0.1,0,8.0,0.1,3.2,mWall)
box('WL',-0.1,0,0,0.1,6.0,3.2,mWall)
box('WR',8.0,0,0,0.1,6.0,3.2,mWall)
# Zócalos madera
box('ZB',0,-0.01,0,8.0,0.01,0.12,mWood)
box('ZL',-0.01,0,0,0.01,6.0,0.12,mWood)
box('ZR',8.0,0,0,0.01,6.0,0.12,mWood)

# Franja decorativa horizontal (teal) a media pared
box('BandaTeal',0,-0.02,1.40,8.0,0.02,0.08,mTeal)

# Paneles de luz de techo (rectangulares, modernos)
for lx,ly in [(1.5,1.5),(4.0,1.5),(6.5,1.5),(1.5,4.5),(4.0,4.5),(6.5,4.5)]:
    box(f'LP{lx}{ly}',lx-0.50,ly-0.25,3.17,1.0,0.50,0.05,mLP)

# Ventanas grandes (piso a techo casi)
for wx in [1.2,3.8,6.4]:
    box(f'WG{wx}',wx-0.45,-0.05,0.30,0.90,0.05,2.60,mGlass)
    box(f'WFt{wx}',wx-0.47,-0.06,2.90,0.94,0.06,0.05,mMetal)
    box(f'WFb{wx}',wx-0.47,-0.06,0.28,0.94,0.06,0.05,mMetal)

# Pantalla de presentación (minimalista)
mScrFace=mm('SS',0.02,0.06,0.14,rough=0.04,emit=0.8)
box('ScrF',1.6,-0.06,0.85,2.9,0.06,1.7,mMon)
box('ScrFace',1.72,-0.02,0.95,2.66,0.02,1.5,mScrFace)
box('ScrPed',3.0,-0.04,0,0.08,0.04,0.85,mMetal)

# Mesa de reuniones (madera clara ovalada → simular con caja)
mTabla=mm('Tb',0.75,0.62,0.44,rough=0.3,metal=0.05)
box('MT',2.1,2.0,0,3.4,1.8,0.68,mTabla)
box('MTS',2.0,1.9,0.68,3.6,2.0,0.05,mm('MtS',0.80,0.68,0.50,rough=0.15))
for lx,ly in [(2.3,2.2),(5.3,2.2),(2.3,3.6),(5.3,3.6)]:
    cyl(f'MTL{lx}',lx,ly,0,0.055,0.68,mMetal)

# Sillas de reunión (modernas, blancas)
mChr=mm('Chr',0.95,0.93,0.90,rough=0.5); mChrL=mm('CL',0.78,0.80,0.82,rough=0.1,metal=0.8)
for ci,(cx,cy) in enumerate([[2.7,1.55],[3.8,1.55],[4.9,1.55],[2.7,4.15],[3.8,4.15],[4.9,4.15],[1.9,2.9],[5.7,2.9]]):
    box(f'CS{ci}',cx-0.26,cy-0.26,0.18,0.52,0.52,0.07,mChr)
    box(f'CB{ci}',cx-0.26,cy-0.27,0.24,0.52,0.07,0.56,mChr)
    for lx2,ly2 in [(-0.21,-0.20),(0.21,-0.20),(-0.21,0.20),(0.21,0.20)]:
        cyl(f'CL{ci}{lx2}',cx+lx2,cy+ly2+0.20,0,0.020,0.20,mChrL)

# Estantería de madera en pared izquierda (catálogos y muestras)
box('ShBase',0.06,0.60,0,0.22,0.90,1.60,mWood)
for ri,rz in enumerate([0.10,0.48,0.88,1.28]):
    box(f'SR{ri}',0.04,0.58,rz+0.10,0.26,0.94,0.04,mWood)
# Muestras de material (rectángulos de color)
for bi,(br,bg,bb,by,bz) in enumerate([(0.96,0.96,0.96,0.62,0.14),(0.80,0.55,0.20,0.62,0.30),(0.02,0.56,0.50,0.62,0.46),(0.92,0.82,0.70,0.62,0.52),(0.96,0.82,0.50,1.00,0.24),(0.60,0.42,0.26,1.00,0.40),(0.26,0.60,0.54,1.38,0.28)]):
    box(f'Sm{bi}',0.07,by,bz,0.06,0.08,0.14,mm(f'Sm{bi}',br,bg,bb,rough=0.4))

# Agentes Woodspa
AGENTS_WS = [
    ("ventas",  0.5,0.5,1.8,1.0,(0.90,0.48,0.04),+1,"CEO/Ventas"),
    ("clinic",  5.5,0.5,1.8,1.0,(0.00,0.56,0.50),+1,"Diseño Clínicas"),
]

for aid,x,y,w,d,(r,g,b),fd,label in AGENTS_WS:
    mac  = mm(f'AC{aid}',r,g,b,rough=0.4)
    mscr = mm(f'SC{aid}',r*0.6,g*0.9,b*0.9,rough=0.05,emit=0.9)
    # Escritorio limpio
    box(f'Dk{aid}',x,y,0,w,d,0.72,mDesk)
    box(f'DkT{aid}',x-0.02,y-0.02,0.72,w+0.04,d+0.04,0.05,mDeskT)
    box(f'DkStr{aid}',x,y,0.48,w,0.025,0.24,mac)
    cx=x+w/2; cy=y+d/2
    # Monitor delgado
    box(f'MnB{aid}',cx-0.28,cy-0.015,0.98,0.56,0.03,0.40,mMon)
    box(f'MnS{aid}',cx-0.24,cy-0.005,1.02,0.48,0.01,0.32,mscr)
    box(f'MnP{aid}',cx-0.02,cy-0.015,0.76,0.04,0.02,0.22,mMetal)
    box(f'MnF{aid}',cx-0.10,cy-0.012,0.70,0.20,0.015,0.03,mMetal)
    box(f'KB{aid}',cx-0.18,cy+0.06,0.75,0.36,0.16,0.016,mm(f'kb{aid}',0.90,0.88,0.85,rough=0.5))
    ch_y=cy+fd*(d/2+0.38)
    mChrA=mm(f'Ca{aid}',0.92,0.90,0.87,rough=0.5)
    # Silla
    box(f'ChS{aid}',cx-0.24,ch_y-0.24,0.20,0.48,0.48,0.06,mChrA)
    box(f'ChB{aid}',cx-0.24,ch_y-0.26,0.25,0.48,0.05,0.50,mChrA)
    for lx2,ly2 in [(-0.19,-0.18),(0.19,-0.18),(-0.19,0.18),(0.19,0.18)]:
        cyl(f'ChL{aid}{lx2}',cx+lx2,ch_y+ly2,0,0.018,0.21,mm(f'CL{aid}{lx2}',0.65,0.67,0.70,rough=0.15,metal=0.7))

    if aid == "clinic":
        # ── MechBot — clinicDesign ─────────────────────────────────────────
        mArmor = mm(f'Ar{aid}',0.88,0.86,0.84,rough=0.35)
        mDark2 = mm(f'Jt{aid}',0.18,0.22,0.28,rough=0.45)
        mScreen= mm(f'Sc{aid}',0.29,0.51,0.65,rough=0.05,emit=0.8)
        mCopper= mm(f'Cu{aid}',0.77,0.49,0.22,rough=0.3,metal=0.7)
        mAccBot= mm(f'Ab{aid}',r,g,b,rough=0.35,emit=0.3)
        # Torso — chasis oscuro + placa frontal
        box(f'Tr{aid}',cx-0.15,ch_y-0.09,0.36,0.30,0.18,0.44,mDark2)
        box(f'TrP{aid}',cx-0.11,ch_y-0.09+fd*0.001,0.40,0.22,0.04,0.32,mArmor)
        box(f'TrAcc{aid}',cx-0.11,ch_y-0.09+fd*0.001,0.70,0.22,0.03,0.04,mAccBot)
        # Punto central pecho
        cyl(f'Dot{aid}',cx,ch_y-fd*0.005,0.60,0.034,0.020,mDark2)
        # Piernas con placas
        for sx in [-1,1]:
            box(f'Lg{aid}{sx}',cx+sx*0.035-0.055,ch_y-0.08,0.10,0.11,0.08,0.28,mDark2)
            box(f'LgP{aid}{sx}',cx+sx*0.035-0.042,ch_y-0.08+fd*0.001,0.12,0.084,0.035,0.20,mArmor)
        # Brazos — módulo forearm en el izquierdo
        box(f'AL{aid}',cx-0.22,ch_y-fd*0.10-0.03,0.60,0.10,0.20,0.06,mDark2)
        box(f'ALP{aid}',cx-0.20,ch_y-fd*0.10-0.01,0.62,0.06,0.14,0.04,mArmor)
        box(f'AR{aid}',cx+0.12,ch_y-fd*0.10-0.03,0.60,0.13,0.24,0.06,mArmor)  # módulo más grueso
        box(f'ARB{aid}',cx+0.12,ch_y-fd*0.10-0.01,0.62,0.13,0.03,0.04,mAccBot)
        # Hombros — esferas de junta
        sphere(f'ShL{aid}',cx-0.20,ch_y-fd*0.005,0.82,0.075,mDark2)
        sphere(f'ShR{aid}',cx+0.20,ch_y-fd*0.005,0.82,0.075,mDark2)
        # ── Cabeza monitor ────────────────────────────────────────────────
        # Carcasa
        box(f'Hd{aid}',cx-0.19,ch_y-0.19,1.06,0.38,0.38,0.34,mArmor)
        # Cuello
        cyl(f'Nk{aid}',cx,ch_y,0.98,0.07,0.08,mDark2)
        # Pantalla frontal (emissiva)
        box(f'Scr{aid}',cx-0.14,ch_y-0.19+fd*0.001,1.10,0.28,0.04,0.22,mScreen)
        # Bisel
        box(f'Bsl{aid}',cx-0.155,ch_y-0.19+fd*0.0005,1.09,0.31,0.045,0.25,mDark2)
        # Ojos circulares (esferas blancas)
        for ex in [-0.065,0.065]:
            sphere(f'Ew{aid}{ex}',cx+ex,ch_y-fd*0.17,1.22,0.034,mm(f'EW{aid}{ex}',1,1,1,rough=0.02,emit=0.6))
            sphere(f'Ep{aid}{ex}',cx+ex*0.5,ch_y-fd*0.18,1.235,0.018,mm(f'EP{aid}{ex}',0.60,0.82,0.92,rough=0.05))
        # Puerto circular lateral
        cyl(f'Port{aid}',cx+0.21,ch_y,1.20,0.075,0.045,mDark2)
        sphere(f'PortC{aid}',cx+0.235,ch_y,1.20,0.040,mAccBot)
        # Tornillos esquinas cabeza
        for bx3,bz3 in [(-0.17,1.08),(0.17,1.08),(-0.17,1.28),(0.17,1.28)]:
            cyl(f'Bt{aid}{bx3}',cx+bx3,ch_y-fd*0.17,bz3,0.014,0.016,mCopper)
        # Antena
        cyl(f'Ant{aid}',cx,ch_y,1.40,0.008,0.14,mDark2)
        sphere(f'AntT{aid}',cx,ch_y,1.54,0.022,mAccBot)
    else:
        # ── Humano chibi — ventas ──────────────────────────────────────────
        box(f'Tr{aid}',cx-0.15,ch_y-0.09,0.36,0.30,0.18,0.44,mac)
        # Solapas y corbata
        for sx in [-1,1]:
            box(f'Lp{aid}{sx}',cx+sx*0.06,ch_y-0.06,0.62,0.07,0.04,0.16,mm(f'LP{aid}{sx}',r*0.6,g*0.6,b*0.6,rough=0.45))
        box(f'Ti{aid}',cx-0.02,ch_y-0.05,0.38,0.035,0.035,0.24,mm(f'TI{aid}',0.82,0.10,0.10,rough=0.45))
        box(f'LL{aid}',cx-0.13,ch_y-0.08,0.10,0.11,0.08,0.30,mac)
        box(f'LR{aid}',cx+0.02,ch_y-0.08,0.10,0.11,0.08,0.30,mac)
        box(f'AL{aid}',cx-0.21,ch_y-fd*0.10-0.03,0.60,0.10,0.20,0.06,mac)
        box(f'AR{aid}',cx+0.11,ch_y-fd*0.10-0.03,0.60,0.10,0.20,0.06,mac)
        sphere(f'Hd{aid}',cx,ch_y,1.10,0.19,mSkin)
        box(f'Hr{aid}',cx-0.19,ch_y-0.15,1.16,0.38,0.22,0.10,mHair)
        me=mm(f'Ey{aid}',r,g,b,rough=0.05)
        for ex in [-0.06,0.06]:
            sphere(f'E{aid}{ex}',cx+ex,ch_y-fd*0.16,1.10,0.026,me)

# Detalles decorativos Woodspa — muestra de materiales
for i,(mr,mg,mb) in enumerate([(0.85,0.72,0.58),(0.95,0.88,0.78),(0.40,0.70,0.65)]):
    box(f'Mat{i}',6.0+i*0.45,5.2,0.75,0.40,0.60,0.04,mm(f'Mt{i}',mr,mg,mb,rough=0.35))

# Plantas decorativas (Woodspa = plantas elegantes)
mp=mm('Pot',0.70,0.60,0.48,rough=0.7); mpl=mm('Pl',0.14,0.52,0.22,rough=0.85)
for px,py in [(0.30,5.5),(7.6,5.5),(7.6,0.30)]:
    cyl(f'Pt{px}_{py}',px,py,0,0.18,0.55,mp)
    sphere(f'Pl{px}_{py}',px,py,0.90,0.28,mpl)
    for li in range(3):
        a=li*math.pi*2/3
        sphere(f'Pl{px}_{py}l{li}',px+math.cos(a)*0.16,py+math.sin(a)*0.16,0.72,0.16,mpl)

# Cámara — desde el lado abierto mirando hacia la pared trasera
cam_loc=(4.0,9.0,4.5); cam_target=(3.8,1.8,0.9)
bpy.ops.object.camera_add(location=cam_loc)
cam=bpy.context.object; cam.name='Cam'
direction=mathutils.Vector(cam_target)-mathutils.Vector(cam_loc)
cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
cam.data.lens=32; bpy.context.scene.camera=cam

# Iluminación — cálida, médica (blanca cálida)
bpy.ops.object.light_add(type='SUN',location=(5,10,11))
s=bpy.context.object.data; s.energy=3.5; s.color=(1.0,0.97,0.90)
s.angle=math.radians(8)
bpy.context.object.rotation_euler=(math.radians(40),0,math.radians(160))
bpy.ops.object.light_add(type='AREA',location=(4.0,3.5,3.8))
f=bpy.context.object.data; f.energy=100; f.size=6; f.color=(1.0,0.98,0.94)
bpy.context.object.rotation_euler=(math.radians(-58),0,0)
bpy.ops.object.light_add(type='AREA',location=(4.0,0.5,3))
bk=bpy.context.object.data; bk.energy=45; bk.size=5; bk.color=(0.90,0.62,0.20)
bpy.context.object.rotation_euler=(math.radians(50),0,0)

setup_world(0.90,0.92,0.96,0.7)
eevee_render(${JSON.stringify(RENDER_PATH_WOODSPA)})
bpy.ops.wm.save_mainfile(filepath='C:/Users/alex/Desktop/oficina_woodspa.blend')
result={"ok":True}
`;
}

function generateOfficeScript() {
  return `
import bpy, math, mathutils

# ── Limpiar escena ──────────────────────────────────────────────────────────
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
for m in list(bpy.data.materials): bpy.data.materials.remove(m)

# ── Helpers ─────────────────────────────────────────────────────────────────
def mm(name, r, g, b, rough=0.5, metal=0.0, emit=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (r, g, b, alpha)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if emit > 0:
        p.inputs['Emission Color'].default_value = (r, g, b, 1)
        p.inputs['Emission Strength'].default_value = emit
    if alpha < 1.0:
        m.blend_method = 'BLEND'
    return m

def box(name, x, y, z, dx, dy, dz, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x+dx/2, y+dy/2, z+dz/2))
    o = bpy.context.object
    o.scale = (dx, dy, dz)
    o.name = name
    o.data.materials.append(mat)
    return o

def cyl(name, x, y, z, r, h, mat):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(x, y, z+h/2))
    o = bpy.context.object; o.name = name
    o.data.materials.append(mat); return o

def sphere(name, x, y, z, r, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x,y,z))
    o = bpy.context.object; o.name = name
    o.data.materials.append(mat); return o

# ── Materiales globales ──────────────────────────────────────────────────────
mFloor0 = mm('F0', 0.90, 0.88, 0.84, rough=0.25)
mFloor1 = mm('F1', 0.80, 0.78, 0.74, rough=0.25)
mWall   = mm('Wall', 0.96, 0.95, 0.93, rough=0.85)
mCeil   = mm('Ceil', 0.99, 0.99, 1.00, rough=0.9)
mScrF   = mm('ScrF', 0.10, 0.14, 0.22, rough=0.2, metal=0.3)
mScrS   = mm('ScrS', 0.03, 0.09, 0.22, rough=0.05, emit=1.2)
mGlass  = mm('Glass',0.72, 0.88, 0.98, rough=0.05, alpha=0.5)
mLPanel = mm('LP', 1.00, 0.98, 0.90, rough=0.5, emit=2.5)
mMtab   = mm('MTab',0.55, 0.60, 0.68, rough=0.2, metal=0.1)
mMleg   = mm('MLeg',0.38, 0.40, 0.46, rough=0.15, metal=0.6)
mChair  = mm('Chr', 0.25, 0.28, 0.35, rough=0.55)
mChrLeg = mm('CL',  0.50, 0.52, 0.58, rough=0.2, metal=0.5)
mDesk   = mm('Desk',0.90, 0.87, 0.82, rough=0.4)
mDeskT  = mm('DskT',0.94, 0.92, 0.88, rough=0.25)
mMon    = mm('Mon', 0.08, 0.08, 0.12, rough=0.15, metal=0.4)
mKB     = mm('KB',  0.18, 0.19, 0.22, rough=0.55)
mSkin   = mm('Skin',0.94, 0.78, 0.62, rough=0.75)
mHair   = mm('Hair',0.12, 0.08, 0.06, rough=0.85)
mShelf  = mm('Shf', 0.82, 0.68, 0.52, rough=0.65)
mPot    = mm('Pot', 0.60, 0.44, 0.30, rough=0.8)
mPlant  = mm('Plt', 0.15, 0.55, 0.20, rough=0.85)

# ── Suelo en mosaico 60x60 cm ────────────────────────────────────────────────
for i in range(14):   # 8m / 0.6 = ~14
    for j in range(12):  # 7m / 0.6 = ~12
        fm = mFloor0 if (i+j)%2==0 else mFloor1
        box(f'F{i}_{j}', i*0.6, j*0.6, -0.04, 0.594, 0.594, 0.04, fm)

# ── Paredes y techo ──────────────────────────────────────────────────────────
box('WBack',  0,   -0.12, 0, 8.2, 0.12, 3.3, mWall)
box('WLeft', -0.12, 0,   0, 0.12, 7.2,  3.3, mWall)
box('WRight', 8.0,  0,   0, 0.12, 7.2,  3.3, mWall)
box('Ceil',   0,    0, 3.2, 8.2,  7.2,  0.08, mCeil)

# ── Pantalla de presentación (pared posterior) ───────────────────────────────
box('ScrFrm', 1.6, -0.08, 1.0, 2.8, 0.08, 1.6, mScrF)
box('ScrFace',1.72,-0.03, 1.1, 2.56,0.03, 1.4, mScrS)
box('ScrPed', 2.95,-0.06, 0.0, 0.10,0.06, 1.0, mScrF)

# ── Ventanas ─────────────────────────────────────────────────────────────────
for wx in [1.3, 3.9, 6.5]:
    box(f'WF{wx}', wx-0.38, -0.08, 0.65, 0.76, 0.08, 1.8, mGlass)
    # marcos
    box(f'WMH{wx}', wx-0.40, -0.09, 1.54, 0.80, 0.09, 0.05, mScrF)
    box(f'WML{wx}', wx-0.01, -0.09, 0.63, 0.05, 0.09, 1.84, mScrF)

# ── Paneles de luz en techo ───────────────────────────────────────────────────
for lx,ly in [(1.5,1.8),(4.0,1.8),(6.5,1.8),(1.5,5.2),(4.0,5.2),(6.5,5.2)]:
    box(f'LP{lx}{ly}', lx-0.4,ly-0.2, 3.18, 0.80,0.40,0.04, mLPanel)

# ── Mesa de reuniones ────────────────────────────────────────────────────────
box('MT',  2.4, 2.1, 0.0, 3.2, 1.8, 0.55, mMtab)
box('MTS', 2.3, 2.0, 0.55,3.4, 2.0, 0.07, mDeskT)
for lx,ly in [(2.55,2.25),(5.45,2.25),(2.55,3.75),(5.45,3.75)]:
    cyl(f'MTL{lx}', lx, ly, 0, 0.055, 0.55, mMleg)

# ── Sillas de reunión ────────────────────────────────────────────────────────
for ci,(cx,cy) in enumerate([[3.1,1.7],[4.0,1.7],[4.9,1.7],
                              [3.1,4.2],[4.0,4.2],[4.9,4.2],
                              [2.1,3.0],[5.9,3.0]]):
    box(f'CS{ci}',cx-0.26,cy-0.26,0.18,0.52,0.52,0.07, mChair)
    box(f'CB{ci}',cx-0.26,cy-0.27,0.24,0.52,0.07,0.56, mChair)
    for lx2,ly2 in [(-0.21,-0.20),(0.21,-0.20),(-0.21,0.20),(0.21,0.20)]:
        cyl(f'CL{ci}_{lx2}',cx+lx2,cy+ly2+0.20, 0, 0.020, 0.20, mChrLeg)

# ── Estantería en pared izquierda ────────────────────────────────────────────
box('ShBase',0.06,0.70,0, 0.22,0.80,1.50, mShelf)
for ri,rz in enumerate([0.12,0.50,0.90,1.28]):
    box(f'SR{ri}',0.04,0.68,rz+0.10, 0.26,0.84,0.04, mShelf)
for bi,(br,bg,bb,by,bz) in enumerate([
    (0.92,0.22,0.22,0.72,0.14),(0.22,0.48,0.94,0.72,0.30),(0.12,0.74,0.30,0.72,0.46),
    (0.96,0.60,0.04,0.72,0.52),(0.54,0.34,0.96,1.10,0.24),(0.02,0.70,0.82,1.10,0.42),
    (0.92,0.26,0.58,1.48,0.27),(0.22,0.82,0.50,1.48,0.45)]):
    box(f'Bk{bi}',0.07,by,bz,0.06,0.08,0.16,mm(f'Bkm{bi}',br,bg,bb,rough=0.55))

# ── Plantas ───────────────────────────────────────────────────────────────────
for px,py in [(0.30,6.5),(7.7,0.30),(7.7,6.5)]:
    cyl(f'Pt{px}',px,py,0,0.20,0.42,mPot)
    sphere(f'Pl{px}',px,py,0.74,0.30,mPlant)
    for li in range(4):
        a=li*math.pi*2/4 + math.pi/4
        sphere(f'Pl{px}l{li}',px+math.cos(a)*0.18,py+math.sin(a)*0.18,0.65,0.18,mPlant)

# ── Escritorios + personajes chibi ──────────────────────────────────────────
AGENTS = [
    # id        x    y    w    d    color_rgb                       face_dir
    ("gym",       0.3, 2.0, 1.8, 1.0, (0.04, 0.70, 0.48),          +1),
    ("orquesta",  3.1, 0.3, 2.0, 1.0, (0.52, 0.25, 0.96),          +1),
    ("procesos",  3.1, 4.4, 2.0, 1.0, (0.14, 0.40, 0.95),          -1),
    ("ventas",    5.7, 2.0, 1.8, 1.0, (0.90, 0.48, 0.02),          +1),
    ("finanzas",  0.3, 4.7, 1.8, 1.0, (0.03, 0.58, 0.72),          -1),
    ("parkour",   5.7, 4.7, 1.8, 1.0, (0.64, 0.30, 0.90),          -1),
    ("clinic",    0.3, 0.3, 1.8, 1.0, (0.00, 0.56, 0.50),          +1),
]

for aid,x,y,w,d,(r,g,b),fd in AGENTS:
    mac  = mm(f'AC{aid}',r,g,b,rough=0.45)
    mscr2= mm(f'SC{aid}',r*0.4,g*0.8,b*0.8,rough=0.05,emit=0.8)

    # Escritorio — cuerpo + superficie + franja de color
    box(f'Dk{aid}',    x,      y,     0,    w,   d,   0.72, mDesk)
    box(f'DkT{aid}',   x-0.02, y-0.02,0.72, w+0.04,d+0.04,0.05, mDeskT)
    box(f'DkStr{aid}', x,      y,     0.50, w,   0.025,0.22, mac)  # franja color

    cx = x + w/2; cy = y + d/2

    # Monitor
    box(f'MnB{aid}',cx-0.30,cy-0.015,1.00, 0.60,0.03,0.42, mMon)
    box(f'MnS{aid}',cx-0.26,cy-0.005,1.04, 0.52,0.01,0.34, mscr2)
    box(f'MnP{aid}',cx-0.02,cy-0.015,0.78, 0.04,0.03,0.24, mMon)
    box(f'MnF{aid}',cx-0.12,cy-0.012,0.72, 0.24,0.02,0.04, mMon)

    # Teclado
    box(f'KB{aid}',cx-0.20,cy+0.06,0.77, 0.40,0.17,0.018, mKB)

    # Personaje — sentado frente al monitor
    # fd=+1 → personaje en Y superior (frente +Y), fd=-1 → en Y inferior (frente -Y)
    ch_y  = cy + fd*(d/2 + 0.38)
    face_y = cy + fd*(d/2 + 0.20)  # hacia dónde mira

    # silla del agente
    box(f'ChS{aid}',cx-0.24,ch_y-0.24,0.20,0.48,0.48,0.06,mChair)
    box(f'ChB{aid}',cx-0.24,ch_y-0.26,0.25,0.48,0.05,0.50,mChair)
    for lx2,ly2 in [(-0.20,-0.18),(0.20,-0.18),(-0.20,0.18),(0.20,0.18)]:
        cyl(f'ChL{aid}{lx2}',cx+lx2,ch_y+ly2,0,0.018,0.21,mChrLeg)

    # cuerpo
    box(f'Tr{aid}', cx-0.16,ch_y-0.10,0.36, 0.32,0.20,0.44, mac)
    # piernas
    box(f'LL{aid}', cx-0.14,ch_y-0.09,0.10, 0.12,0.08,0.30, mac)
    box(f'LR{aid}', cx+0.02,ch_y-0.09,0.10, 0.12,0.08,0.30, mac)
    # brazos sobre el escritorio
    arm_y_sign = -fd  # brazos hacia el escritorio
    box(f'AL{aid}', cx-0.22,ch_y+arm_y_sign*0.08-0.04,0.60,0.10,0.22,0.06, mac)
    box(f'AR{aid}', cx+0.12,ch_y+arm_y_sign*0.08-0.04,0.60,0.10,0.22,0.06, mac)
    # cabeza — esfera
    sphere(f'Hd{aid}',cx,ch_y,1.12,0.20,mSkin)
    # cabello
    box(f'Hr{aid}',cx-0.20,ch_y-0.16,1.18,0.40,0.24,0.10,mHair)
    # ojos con color del agente
    me2=mm(f'Ey{aid}',r,g,b,rough=0.05)
    for ex in [-0.07,0.07]:
        sphere(f'E{aid}{ex}',cx+ex,ch_y-fd*0.17,1.12,0.028,me2)

# ── Cámara — ángulo isométrico amigable ──────────────────────────────────────
# Vista desde esquina delantera, ángulo ~40°, no cenital
cam_loc = (4.2, -5.5, 9.5)
cam_target = (4.0, 3.5, 0.8)
bpy.ops.object.camera_add(location=cam_loc)
cam = bpy.context.object; cam.name = 'Cam'
direction = mathutils.Vector(cam_target) - mathutils.Vector(cam_loc)
cam.rotation_euler = direction.to_track_quat('-Z','Y').to_euler()
cam.data.lens = 38
bpy.context.scene.camera = cam

# ── Iluminación EEVEE ────────────────────────────────────────────────────────
# Luz principal desde arriba-izquierda
bpy.ops.object.light_add(type='SUN', location=(6, -4, 12))
sun = bpy.context.object.data
sun.energy = 4.0; sun.color = (1.0, 0.96, 0.88)
sun.angle = math.radians(5)
bpy.context.object.rotation_euler = (math.radians(42), 0, math.radians(-28))

# Relleno suave desde adelante
bpy.ops.object.light_add(type='AREA', location=(4, -1, 4))
fill = bpy.context.object.data
fill.energy = 80; fill.size = 5; fill.color = (0.85, 0.92, 1.0)
bpy.context.object.rotation_euler = (math.radians(60), 0, 0)

# Luz trasera cálida
bpy.ops.object.light_add(type='AREA', location=(4, 7.5, 3))
back = bpy.context.object.data
back.energy = 40; back.size = 4; back.color = (1.0, 0.94, 0.80)
bpy.context.object.rotation_euler = (math.radians(-55), 0, math.radians(180))

# ── World / cielo ────────────────────────────────────────────────────────────
w = bpy.data.worlds['World']; w.use_nodes = True
bg = w.node_tree.nodes['Background']
bg.inputs['Color'].default_value = (0.72, 0.82, 1.0, 1)
bg.inputs['Strength'].default_value = 0.6

# ── Render — EEVEE (rápido, ~10 seg) ─────────────────────────────────────────
sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'

# Calidad EEVEE
try:
    sc.eevee.taa_render_samples = 32
    sc.eevee.use_gtao = True
    sc.eevee.use_bloom = True
    sc.eevee.bloom_intensity = 0.04
except Exception: pass

sc.render.resolution_x = 1920
sc.render.resolution_y = 1080
sc.render.resolution_percentage = 100
sc.render.filepath = ${JSON.stringify(RENDER_PATH)}
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGB'

bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_mainfile(filepath='C:/Users/alex/Desktop/oficina_weapes.blend')
result = {"ok": True}
`;
}

// ─── SERVE ESTÁTICO (producción: npm run build → node server.js) ────────────

const distPath = resolve(__dirname, "dist");
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("/{*path}", (_req, res) => res.sendFile(resolve(distPath, "index.html")));
  console.log("📦 Sirviendo frontend desde dist/");
}

// ─── START ──────────────────────────────────────────────────────────────────

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🤖 Multi-Agent API corriendo en http://localhost:${PORT}`);
  console.log(`   Agentes disponibles: orchestrator, gym, ventas, procesos`);
});
