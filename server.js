import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import cron from "node-cron";

// Leer .env manualmente — garantiza que la key está disponible sin importar el orden ESM
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envContent = readFileSync(resolve(__dirname, ".env"), "utf8");
  for (const line of envContent.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch { /* .env opcional */ }

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

Contexto actual (Semana 3, Abril 2026 — 14 al 20 Abr):
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

ESTADO SEMANA 3 ABRIL 2026 (14–20 Abr):
- Cobranza al día ✓ (pero ver DEUDA CLIENTES arriba — $11,442 pendiente)
- 6/6 membresías reactivadas ✓
- MercadoPago en configuración (Flavio) — recomendación: MercadoPago (2.9%) vs Clip (3.5%)
- Fiestas Infantiles: paquete comercial listo ✓ (Básico $3,500 / Plus $5,800 / Premium $9,200)
- Cotización Escuelas: template listo para prospectar ✓
- Convenio laboral: borrador listo, pendiente revisión Berenice Soto
- Neurodivergentes: reunión Adrián/Luna realizada, meta 6 alumnos para mayo. 🔴 Adrián sale el 30 abril — Luna asume operación, falta definir coordinación del programa.
- 🔴 ALERTA FINANCIERA: Abril proyecta ~$43,000 (peor mes 2026). Criterio de decisión locación: si al 15 mayo ingresos < $55,000 y sin contratos nuevos → buscar local en junio.

TAREAS ACTIVAS SEMANA 3:
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

PIPELINE ACTIVO (Semana 3 Abril):
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

PRÓXIMO FOCO (Semana 3):
- Activar MercadoPago: Flavio pendiente de configuración → seguimiento urgente
  → Recomendación: MercadoPago (2.9%) por integración con WhatsApp vs Clip (3.5%)
- Proceso de venta de Fiestas Infantiles: asegurar que Jesús tenga el template de cotización activo
- Proceso de prospección escolar: primer contacto con 2–3 escuelas esta semana (Flavio/Jesús)
- Seguimiento constitución cooperativa: Jesús/Berenice Soto deben avanzar el acta al 100% en abril

Tus responsabilidades: mapeo de flujos, detección de cuellos de botella, SOPs, checklists, automatizaciones.
KPIs: tiempo promedio de entrega, % tareas a tiempo, SOPs implementados/mes, reducción de tiempo en procesos clave.

Cuando propones mejoras: sé específico (herramienta, costo, tiempo de implementación, beneficio esperado).`,
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

// ─── HISTORIAL DE CONVERSACIONES (en memoria) ──────────────────────────────

const conversations = {
  orchestrator: [],
  gym: [],
  ventas: [],
  procesos: [],
  finanzas: [],
};

// ─── ENDPOINT: CHAT CON AGENTE (streaming) ─────────────────────────────────

app.post("/api/agents/:agentId/chat", async (req, res) => {
  const { agentId } = req.params;
  const { message, resetHistory } = req.body;

  if (!SYSTEM_PROMPTS[agentId]) {
    return res.status(404).json({ error: `Agente "${agentId}" no encontrado` });
  }

  if (resetHistory) conversations[agentId] = [];

  // Agrega el mensaje del usuario al historial
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
          tools: VENTAS_TOOLS,
          messages: workingMessages,
        });

        let turnText = "";
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const chunk = event.delta.text;
            turnText += chunk;
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
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
            result = `Herramienta "${block.name}" no implementada.`;
          }

          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
        }
        workingMessages.push({ role: "user", content: toolResults });
      }

      conversations[agentId].push({ role: "assistant", content: finalAssistantText });
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    // ── Resto de agentes: streaming simple ──────────────────────────────────
    let fullText = "";

    const stream = client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      system: [{ type: "text", text: SYSTEM_PROMPTS[agentId], cache_control: { type: "ephemeral" } }],
      messages: conversations[agentId],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        const chunk = event.delta.text;
        fullText += chunk;
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
    }

    conversations[agentId].push({ role: "assistant", content: fullText });

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
          content: `Nueva tarea: "${task}"\n\nResponde SOLO con:\n1. ¿A qué agente(s) delegas esta tarea? (gym / ventas / procesos)\n2. Instrucción exacta para ese agente (1-2 oraciones).\nFormato: AGENTE: [id] | INSTRUCCIÓN: [texto]`,
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

    // Paso 2: Detecta el agente target del plan
    const match = orchestratorPlan.match(/AGENTE:\s*(gym|ventas|procesos|finanzas)/i);
    const targetAgent = match ? match[1].toLowerCase() : null;

    if (targetAgent && SYSTEM_PROMPTS[targetAgent]) {
      const instrMatch = orchestratorPlan.match(/INSTRUCCIÓN:\s*(.+)/i);
      const instruccion = instrMatch ? instrMatch[1].trim() : task;

      res.write(
        `data: ${JSON.stringify({ step: "delegation", target: targetAgent })}\n\n`
      );

      // Paso 3: El agente especialista responde
      conversations[targetAgent].push({ role: "user", content: instruccion });

      let agentResponse = "";
      const agentStream = client.messages.stream({
        model: "claude-opus-4-6",
        max_tokens: 2048,
        system: [{ type: "text", text: SYSTEM_PROMPTS[targetAgent], cache_control: { type: "ephemeral" } }],
        messages: conversations[targetAgent],
      });

      for await (const event of agentStream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          agentResponse += event.delta.text;
          res.write(
            `data: ${JSON.stringify({ step: targetAgent, text: event.delta.text })}\n\n`
          );
        }
      }

      conversations[targetAgent].push({
        role: "assistant",
        content: agentResponse,
      });
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error(err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
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

// ─── SERVE ESTÁTICO (producción: npm run build → node server.js) ────────────

const distPath = resolve(__dirname, "dist");
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (_req, res) => res.sendFile(resolve(distPath, "index.html")));
  console.log("📦 Sirviendo frontend desde dist/");
}

// ─── START ──────────────────────────────────────────────────────────────────

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🤖 Multi-Agent API corriendo en http://localhost:${PORT}`);
  console.log(`   Agentes disponibles: orchestrator, gym, ventas, procesos`);
});
