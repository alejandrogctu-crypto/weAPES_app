import { useState, useEffect, useRef } from "react";
import WeApesDB from "./WeApesDB";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";

// ============================================================
// DATA
// ============================================================

// status: "working" | "idle" | "alerta"
const AGENTS = [
  {
    id: "orchestrator",
    name: "Orquestador Maestro",
    subtitle: "Coordinador Central",
    emoji: "🧠",
    colorKey: "purple",
    status: "working",
    currentFocus: "Semana 3 activa — Supervisando fiestas infantiles, cooperativa y criterio de locación",
    folder: null,
    brief: {
      mision:
        "Priorizar y alinear semanalmente los 3 agentes especializados según impacto estratégico y recursos disponibles.",
      responsabilidades: [
        "Definir prioridades semanales para cada agente",
        "Consolidar reportes y métricas de los 3 agentes",
        "Detectar cuellos de botella cross-área",
        "Reasignar foco según urgencia o cambios de contexto",
        "Generar resumen ejecutivo semanal para PINKY",
      ],
      inputs: ["Objetivos mensuales de cada área", "Reportes de los agentes", "Calendarios y deadlines activos"],
      outputs: ["Plan semanal priorizado por agente", "Alertas de riesgo", "Reporte ejecutivo consolidado"],
      kpis: ["% tareas completadas vs planeadas", "Tiempo de ciclo delegación → reporte", "Cumplimiento de objetivos mensuales"],
    },
  },
  {
    id: "gym",
    name: "Agente Gym PM",
    subtitle: "weAPES Parkour Center",
    emoji: "🏃",
    colorKey: "emerald",
    status: "working",
    currentFocus: "Semana 3 activa — Capacitación maestros, catálogo digital y Baby Parkour en curso",
    folder: {
      name: "weAPES _ai",
      hostPath: "C:/Users/alex/Desktop/weAPES _ai",
      totalFiles: 45,
      categories: [
        {
          label: "Documentos estratégicos",
          icon: "📋",
          files: [
            { name: "Plan de Acción Abril 2026 — weAPES.docx", tag: "Activo" },
            { name: "Grupos de Trabajo — weAPES Abril 2026.docx", tag: "Activo" },
            { name: "Acta constitutiva - Actualizada.docx", tag: "Legal" },
          ],
        },
        {
          label: "Marketing",
          icon: "📢",
          files: [
            { name: "POSTER_weAPES_valores.pdf", tag: "PDF" },
            { name: "APES_LONA-3x.pdf", tag: "PDF" },
            { name: "A-AP_POSTERS.pdf", tag: "PDF" },
          ],
        },
        {
          label: "Brand assets",
          icon: "🎨",
          files: [
            { name: "Recurso 1.png — Recurso 12.png", tag: "PNG" },
            { name: "2025__lona-250225.psd", tag: "PSD" },
          ],
        },
      ],
      team: [
        { name: "Ángel", role: "Coordinador educativo", email: "angel.fego0@gmail.com", status: "active" },
        { name: "Eliel", role: "Coach principal", email: "elielpk@gmail.com", status: "active" },
        { name: "Jesús", role: "Ventas y marketing", email: "jes.escareno@gmail.com", status: "active" },
        { name: "Adrián", role: "Psicología / Inclusión", email: "adrianpantoja1230@gmail.com", status: "active" },
        { name: "Flavio", role: "Operaciones y finanzas", email: "flaviopadilla9@gmail.com", status: "active" },
        { name: "Pinky", role: "Diseño + Administración · Vocal", email: "alejandrogctu@gmail.com", status: "active", isYou: true },
        { name: "César", role: "Diseño gráfico (standby oct 2026)", email: "cesarmachuca.90@gmail.com", status: "standby" },
      ],
      weeklyPriorities: [
        { area: "Educación", task: "Avanzar programa de capacitación de maestros (contenido y fechas)", who: "Ángel / Pinky", priority: "P2", done: false },
        { area: "Ventas", task: "Publicar catálogo de servicios actualizado (digital)", who: "Jesús", priority: "P2", done: false },
        { area: "Psicología", task: "Implementar buzón de quejas / QR para formulario", who: "Adrián", priority: "P2", done: false },
        { area: "Diseño", task: "Cotizar rotulado de paredes y señalética", who: "Pinky", priority: "P3", done: false },
        { area: "Baby Parkour", task: "Reunión de avance Lulú / Flavio / Ángel", who: "Flavio / Lulú", priority: "P2", done: false },
        { area: "Legal", task: "Seguimiento constitución cooperativa (acta al 90%, Berenice Soto)", who: "Jesús", priority: "P2", done: false },
      ],
    },
    brief: {
      mision:
        "Optimizar la gestión operativa y comercial de weAPES Parkour Center para incrementar ingresos y retención de alumnos.",
      responsabilidades: [
        "Estructurar calendario de clases y horarios óptimos",
        "Gestionar roles de instructores y cobertura",
        "Monitorear métricas de ocupación y retención",
        "Proponer y ejecutar campañas de captación de alumnos",
        "Documentar SOPs del gimnasio",
        "Seguimiento a pagos y membresías activas",
      ],
      inputs: ["Datos de asistencia semanal", "Feedback de alumnos", "Capacidad del espacio", "Disponibilidad de instructores"],
      outputs: ["Reporte semanal de KPIs", "Plan de clases mensual", "Propuestas de mejora operativa"],
      kpis: ["Ocupación por clase (%)", "Retención mensual de alumnos (%)", "Ingresos por clase promedio", "NPS de alumnos"],
    },
  },
  {
    id: "ventas",
    name: "Agente CEO / Ventas",
    subtitle: "Woodspa — Muebles & Diseño Interior",
    emoji: "🪑",
    colorKey: "amber",
    status: "working",
    currentFocus: "Seguimiento Clínica Reforma + 2 prospectos nuevos esta semana",
    folder: {
      name: "woodspa",
      hostPath: "C:/Users/alex/Desktop/woodspa",
      totalFiles: 60,
      categories: [
        {
          label: "Catálogos",
          icon: "📚",
          files: [
            { name: "catalogo woodSPA.pdf", tag: "PDF" },
            { name: "catalogo woodfelas.pdf", tag: "PDF" },
            { name: "catalogo WF+MV.pdf", tag: "PDF" },
            { name: "CATALOGO DE SERVICIOS Y PRECIOS.xlsx", tag: "XLSX" },
          ],
        },
        {
          label: "Cotizaciones",
          icon: "💰",
          files: [
            { name: "cotizacion mueble.pdf", tag: "PDF" },
            { name: "cotizacion mueble.ai", tag: "AI" },
          ],
        },
        {
          label: "Planos CAD",
          icon: "🏗️",
          files: [
            { name: "A-SC_MESAMED_01072025.dwg", tag: "DWG" },
            { name: "A-SC_BARRA_.5.dwg", tag: "DWG" },
            { name: "A-SC_woodspa 001.dwg", tag: "DWG" },
            { name: "A-SC_MESAMED_141024.dxf", tag: "DXF" },
          ],
        },
        {
          label: "Modelos 3D",
          icon: "📐",
          files: [
            { name: "A-SC_WA-CORTES.3dm", tag: "3DM" },
            { name: "consultorio mark.3dm", tag: "3DM" },
            { name: "3voronoi.stl", tag: "STL" },
          ],
        },
        {
          label: "Diseño clínico",
          icon: "🎨",
          files: [
            { name: "clinico01.ai", tag: "AI" },
            { name: "clinico02.ai", tag: "AI" },
          ],
        },
      ],
      team: null,
      weeklyPriorities: null,
    },
    brief: {
      mision:
        "Escalar las ventas y el posicionamiento de Woodspa — muebles para clínicas y diseño de interiores. El negocio ya opera; el foco está en aumentar volumen y ticket promedio.",
      responsabilidades: [
        "Gestionar y actualizar pipeline de ventas activo",
        "Diseñar propuestas comerciales y cotizaciones personalizadas",
        "Definir estrategia de precios y portafolio",
        "Coordinación con clientes activos y seguimiento postventa",
        "Identificar nuevos segmentos de mercado médico",
        "Gestionar relación con proveedores y tiempos de entrega",
      ],
      inputs: ["Lista de prospectos calificados", "Portafolio actualizado (woodSPA, woodfelas, WF+MV)", "Historial de clientes", "Planos y cotizaciones activas"],
      outputs: ["Pipeline actualizado", "Propuestas comerciales listas", "Estrategia de escalamiento trimestral", "Reporte semanal de ventas"],
      kpis: ["Leads nuevos / semana", "Tasa de conversión (%)", "Ticket promedio ($)", "% clientes recurrentes"],
    },
  },
  {
    id: "procesos",
    name: "Agente Procesos",
    subtitle: "Mejora Continua Cross-Área",
    emoji: "⚙️",
    colorKey: "blue",
    status: "idle",
    currentFocus: "SOPs entregados — esperando feedback para automatizar cobros",
    folder: null,
    brief: {
      mision:
        "Identificar y optimizar los procesos de todos los proyectos activos para aumentar eficiencia y escalar operaciones sin depender de más personal.",
      responsabilidades: [
        "Mapear flujos de trabajo actuales en todas las áreas",
        "Detectar cuellos de botella y tareas repetitivas",
        "Proponer automatizaciones y mejoras de proceso",
        "Crear plantillas, checklists y SOPs reutilizables",
        "Coordinar implementación de mejoras con los otros agentes",
        "Medir y reportar eficiencia operativa mensualmente",
      ],
      inputs: ["Flujos de trabajo actuales", "Feedback de equipo", "Datos históricos de proyectos", "Deadlines y entregables activos"],
      outputs: ["Mapas de proceso documentados", "Checklists y SOPs listos", "Plan de mejoras priorizadas", "Reporte de eficiencia mensual"],
      kpis: ["Tiempo promedio de entrega", "% tareas a tiempo", "SOPs implementados/mes", "Reducción en tiempo de procesos clave (%)"],
    },
  },
  {
    id: "finanzas",
    name: "Agente Finanzas",
    subtitle: "Control Financiero Cross-Área",
    emoji: "📊",
    colorKey: "cyan",
    status: "idle",
    currentFocus: "Listo para análisis — conecta BD FINANCIERO y pipeline Woodspa",
    folder: {
      name: "finanzas_01",
      hostPath: "C:/Users/alex/Desktop/weAPES _ai/finanzas_01",
      totalFiles: 8,
      categories: [
        {
          label: "Precios y política",
          icon: "💰",
          files: [
            { name: "Política de Precios y Promociones 2025.docx", tag: "DOCX" },
            { name: "Precios y promociones.xlsx", tag: "XLSX" },
          ],
        },
        {
          label: "Bases de datos",
          icon: "🗄️",
          files: [
            { name: "BD FINANCIERO weAPES.xlsx", tag: "XLSX" },
            { name: "2026 CLIENTES - PAGOS.csv", tag: "CSV" },
            { name: "BD_Alumnos_weAPES.xlsx", tag: "XLSX" },
          ],
        },
        {
          label: "Presupuestos y costos",
          icon: "📋",
          files: [
            { name: "Plan de inversión.xlsx", tag: "XLSX" },
            { name: "Presupuestos.xlsx", tag: "XLSX" },
            { name: "Cotizador.xlsx", tag: "XLSX" },
            { name: "EXPLOSION OBSTACULOS WE APES.xlsx", tag: "XLSX" },
            { name: "Nezaldi Gastos Reales.xlsx", tag: "XLSX" },
          ],
        },
      ],
      team: null,
      weeklyPriorities: [
        { area: "weAPES", task: "Monitorear flujo de caja semana 3 — criterio locación activo (meta $55k al 15 mayo)", who: "Pinky / Flavio", priority: "P1", done: false },
        { area: "weAPES", task: "Confirmar renta actual exacta con Flavio — variable crítica pendiente", who: "Flavio", priority: "P1", done: false },
        { area: "Woodspa", task: "Cotización Instituto Nezaldi — cerrar números y enviar", who: "Pinky", priority: "P2", done: false },
        { area: "weAPES", task: "Proyectar impacto de Fiestas + Escuelas en mayo ($25k adicionales)", who: "Pinky", priority: "P2", done: false },
      ],
    },
    brief: {
      mision:
        "Mantener visibilidad financiera en tiempo real sobre weAPES y Woodspa: flujo de caja, precios, presupuestos y rentabilidad por proyecto.",
      responsabilidades: [
        "Monitorear flujo de caja semanal y mensual (ambos negocios)",
        "Alertar cobranza vencida o membresías por renovar",
        "Generar cotizaciones y presupuestos a solicitud",
        "Comparar costos de herramientas/proveedores (pagos, insumos)",
        "Seguimiento al plan de inversión y presupuesto anual",
        "Proyecciones de ingreso por servicio, evento o proyecto",
      ],
      inputs: ["BD FINANCIERO weAPES", "Pipeline Woodspa", "Política de precios", "Presupuestos activos", "Gastos reales por proyecto"],
      outputs: ["Reporte semanal de caja", "Alertas de cobranza", "Cotizaciones listas", "Análisis costo-beneficio", "Proyecciones mensuales"],
      kpis: ["Ingresos por clase promedio ($)", "% cobranza al corriente", "Ticket promedio Woodspa ($)", "Margen bruto por proyecto (%)"],
    },
  },
];

const INTERACTIONS = [
  { id: 1, from: "orchestrator", to: "gym", time: "Lun 08:00", message: "Semana 2: prioridad en cerrar 6 membresías reactivadas. Resolver instructor viernes 7pm antes del miércoles. Coordina con Ángel hoy.", type: "delegacion" },
  { id: 2, from: "orchestrator", to: "ventas", time: "Lun 08:05", message: "Dar seguimiento a Clínica Reforma esta semana. Meta: cerrar al menos 1 propuesta activa. Agrega 2 prospectos nuevos al pipeline.", type: "delegacion" },
  { id: 3, from: "orchestrator", to: "procesos", time: "Lun 08:10", message: "SOPs aprobados. Siguiente entregable: propuesta para automatizar cobros weAPES. Presenta opciones el jueves.", type: "delegacion" },
  { id: 4, from: "gym", to: "orchestrator", time: "Lun 15:00", message: "⚠️ Instructor viernes 7pm sigue sin confirmar. Eliel no puede. Opciones: cubrir yo o cancelar grupo. ¿Autorizo descuento para atraer asistentes?", type: "alerta" },
  { id: 5, from: "orchestrator", to: "gym", time: "Lun 15:30", message: "Autorizado: 20% descuento clase viernes 7pm. Publica hoy en WhatsApp y stories. Si no llega a 5 alumnos, cancela y avisa con 24h.", type: "delegacion" },
  { id: 6, from: "ventas", to: "orchestrator", time: "Mar 11:00", message: "Primer contacto con Clínica Reforma enviado. Esperando respuesta. Agregué Clínica Optima y Dental Plus al pipeline. Total activo: $62,000.", type: "reporte" },
  { id: 7, from: "procesos", to: "gym", time: "Mar 14:00", message: "Para automatizar cobros: recomiendo Clip + Google Forms para registro digital. ¿Tienen RFC activo para terminal? Necesito confirmación de Flavio.", type: "colaboracion" },
  { id: 8, from: "gym", to: "procesos", time: "Mar 16:30", message: "Flavio confirma RFC activo. Clip ya lo evaluamos antes pero no avanzó. ¿Tienes comparativa con MercadoPago? El costo por transacción importa.", type: "colaboracion" },
  { id: 9, from: "gym", to: "orchestrator", time: "Mié 17:00", message: "Mid-week: 4 membresías cerradas de 6 objetivo. Clase viernes con 7 inscritos (éxito). Cobranza pendiente: 3 alumnos sin pago semana 1.", type: "reporte" },
  { id: 10, from: "ventas", to: "orchestrator", time: "Mié 17:30", message: "Clínica Reforma respondió — quieren reunión presencial viernes. Pipeline actualizado: $62,000 activo, $18,000 en cierre próximo.", type: "reporte" },
  { id: 11, from: "procesos", to: "orchestrator", time: "Jue 10:00", message: "Comparativa cobros lista: MercadoPago 2.9% vs Clip 3.5%. Recomiendo MercadoPago por integración con WhatsApp. Propuesta detallada adjunta.", type: "reporte" },
  { id: 12, from: "orchestrator", to: "gym", time: "Jue 10:30", message: "Aprobado MercadoPago. Coordina con Procesos para implementar esta semana. Los 3 alumnos con saldo: Jesús les da seguimiento hoy, máximo mañana.", type: "delegacion" },
  { id: 13, from: "gym", to: "orchestrator", time: "Jue 18:00", message: "✅ Semana 2 cerrada. Cobranza al día, instructor viernes confirmado, 6/6 membresías reactivadas, Gantt subido, post IG publicado. MercadoPago en configuración.", type: "reporte" },
  { id: 14, from: "ventas", to: "orchestrator", time: "Jue 18:15", message: "✅ Reunión Clínica Reforma confirmada para mañana viernes 11am. Propuesta lista. Pipeline: $62,000 activo.", type: "reporte" },
  { id: 15, from: "orchestrator", to: "gym", time: "Jue 18:30", message: "Semana 2 completada al 100%. Excelente ejecución. Semana 3 arranca el lunes — enviaré prioridades el domingo por la noche.", type: "delegacion" },
  { id: 16, from: "orchestrator", to: "gym", time: "Lun 08:00 (S3)", message: "Semana 3 arranca. Prioridades: capacitación maestros con Ángel, catálogo digital con Jesús, reunión Baby Parkour con Flavio/Lulú. 🔴 Alerta financiera activa — abril proyecta $43k. Activa Fiestas y prospección Escuelas esta semana.", type: "delegacion" },
  { id: 17, from: "orchestrator", to: "finanzas", time: "Lun 08:10 (S3)", message: "Confirmar renta exacta con Flavio es prioridad P1. Sin ese dato el análisis de locación está incompleto. Proyectar escenario con Fiestas + Escuelas activados para el 15 mayo.", type: "delegacion" },
  { id: 18, from: "gym", to: "orchestrator", time: "Mar 10:00 (S3)", message: "🔴 Ángel sigue saturado: educación + Baby Parkour + capacitación + campamentos. Solicitando revisión de carga. ¿Autorizas contratar instructor de apoyo temporal para cubrir semana 4?", type: "alerta" },
];

// ============================================================
// THEME
// ============================================================

const C = {
  purple: { hex: "#7c3aed", hexLight: "#ede9fe", hexBorder: "#a78bfa" },
  emerald: { hex: "#059669", hexLight: "#d1fae5", hexBorder: "#6ee7b7" },
  amber: { hex: "#d97706", hexLight: "#fef3c7", hexBorder: "#fcd34d" },
  blue: { hex: "#2563eb", hexLight: "#dbeafe", hexBorder: "#93c5fd" },
  cyan: { hex: "#0891b2", hexLight: "#cffafe", hexBorder: "#67e8f9" },
};

const MSG = {
  delegacion: { badge: "bg-purple-100 text-purple-700", bg: "bg-purple-50", border: "border-purple-200", label: "Delegación" },
  reporte: { badge: "bg-emerald-100 text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", label: "Reporte" },
  colaboracion: { badge: "bg-blue-100 text-blue-700", bg: "bg-blue-50", border: "border-blue-200", label: "Colaboración" },
  alerta: { badge: "bg-red-100 text-red-700", bg: "bg-red-50", border: "border-red-200", label: "⚠️ Alerta" },
};

const FILE_TYPE_COLOR = {
  PDF: "#dc2626", XLSX: "#16a34a", DWG: "#ea580c", DXF: "#ea580c",
  "3DM": "#7c3aed", STL: "#7c3aed", AI: "#f59e0b", PSD: "#2563eb",
  PNG: "#0891b2", DOCX: "#1d4ed8", MD: "#374151", Activo: "#059669",
  Legal: "#dc2626",
};

// ============================================================
// HELPER COMPONENTS
// ============================================================

function SectionLabel({ children, mt = true }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8, marginTop: mt ? 20 : 0 }}>
      {children}
    </p>
  );
}

function FileTag({ tag }) {
  const color = FILE_TYPE_COLOR[tag] || "#64748b";
  return (
    <span style={{ background: color + "18", color, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, flexShrink: 0, letterSpacing: "0.05em" }}>
      {tag}
    </span>
  );
}

function PriorityBadge({ p }) {
  const colors = { P1: { bg: "#fee2e2", text: "#dc2626" }, P2: { bg: "#fef9c3", text: "#a16207" } };
  const c = colors[p] || colors.P2;
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, flexShrink: 0 }}>
      {p}
    </span>
  );
}

function FolderBadge({ folder, colorKey }) {
  const c = C[colorKey];
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: c.hexLight, border: `1px solid ${c.hexBorder}`, borderRadius: 20, padding: "4px 10px", fontSize: 11, color: c.hex, fontWeight: 600 }}>
      <span>📁</span>
      <span>{folder.name}</span>
      <span style={{ opacity: 0.6 }}>·</span>
      <span style={{ opacity: 0.7 }}>{folder.totalFiles} archivos</span>
    </div>
  );
}

function AgentCard({ agent, isSelected, onClick, wide = false, pulse = false }) {
  const c = C[agent.colorKey];
  const s = STATUS_CFG[agent.status] || STATUS_CFG.idle;
  const showPulse = (agent.status === "working" || agent.status === "alerta") && pulse;
  return (
    <div
      onClick={onClick}
      style={{
        cursor: "pointer", background: "white", borderRadius: 16,
        border: `2px solid ${isSelected ? c.hex : "#e2e8f0"}`,
        boxShadow: isSelected ? `0 0 0 4px ${c.hexLight}` : "0 1px 3px rgba(0,0,0,0.08)",
        padding: 20, transition: "all 0.18s ease",
        minWidth: wide ? 300 : undefined,
      }}
    >
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        {/* Avatar with pulse ring */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {showPulse && (
            <span style={{
              position: "absolute", inset: -4, borderRadius: 16,
              border: `2px solid ${s.dot}`,
              opacity: pulse ? 0.7 : 0,
              transition: "opacity 0.9s ease",
              pointerEvents: "none",
            }} />
          )}
          <div style={{ width: 48, height: 48, borderRadius: 12, background: c.hex, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            {agent.emoji}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot, display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: s.text, fontWeight: 600 }}>{s.label}</span>
            {agent.folder && (
              <span style={{ marginLeft: 4, fontSize: 10, background: c.hexLight, color: c.hex, padding: "1px 7px", borderRadius: 20, fontWeight: 600, border: `1px solid ${c.hexBorder}` }}>
                📁 {agent.folder.name}
              </span>
            )}
          </div>
          <p style={{ fontWeight: 700, color: "#1e293b", fontSize: 14, margin: "0 0 2px 0" }}>{agent.name}</p>
          <p style={{ fontSize: 12, color: c.hex, fontWeight: 600, margin: "0 0 8px 0" }}>{agent.subtitle}</p>
          <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, margin: 0 }}>{agent.currentFocus}</p>
        </div>
      </div>
    </div>
  );
}

// ── BRIEF PANEL (expanded) ──────────────────────────────────
function BriefPanel({ agent, onClose }) {
  const c = C[agent.colorKey];
  const [innerTab, setInnerTab] = useState("brief");

  const tabs = [
    { id: "brief", label: "📋 Brief" },
    ...(agent.folder ? [{ id: "carpeta", label: `📁 ${agent.folder.name}` }] : []),
    ...(agent.folder?.team ? [{ id: "equipo", label: "👥 Equipo" }] : []),
    ...(agent.folder?.weeklyPriorities ? [{ id: "semana", label: "🗓️ Esta semana" }] : []),
  ];

  return (
    <div style={{ marginTop: 24, background: "white", borderRadius: 16, border: `2px solid ${c.hex}`, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
      {/* Header */}
      <div style={{ background: c.hex, color: "white", padding: "16px 24px", display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontSize: 28 }}>{agent.emoji}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>{agent.name}</p>
          <p style={{ opacity: 0.8, fontSize: 13, margin: 0 }}>{agent.subtitle}</p>
        </div>
        {agent.folder && (
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "4px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <span>📁</span> {agent.folder.name}
          </div>
        )}
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
      </div>

      {/* Inner tabs */}
      {tabs.length > 1 && (
        <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9", background: "#fafafa" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setInnerTab(t.id)} style={{ padding: "10px 18px", fontSize: 13, fontWeight: 500, background: "none", border: "none", borderBottom: `2px solid ${innerTab === t.id ? c.hex : "transparent"}`, color: innerTab === t.id ? c.hex : "#64748b", cursor: "pointer" }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: 24 }}>

        {/* ── TAB: BRIEF ── */}
        {innerTab === "brief" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
            <div>
              <SectionLabel mt={false}>Misión</SectionLabel>
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, margin: 0 }}>{agent.brief.mision}</p>
              <SectionLabel>Responsabilidades</SectionLabel>
              <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
                {agent.brief.responsabilidades.map((r, i) => (
                  <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "#475569", marginBottom: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.hex, flexShrink: 0, marginTop: 5 }} />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <SectionLabel mt={false}>KPIs Clave</SectionLabel>
              {agent.brief.kpis.map((k, i) => (
                <div key={i} style={{ background: c.hexLight, color: c.hex, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  📊 {k}
                </div>
              ))}
              <SectionLabel>Inputs / Outputs</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Inputs</p>
                  {agent.brief.inputs.map((inp, i) => (
                    <p key={i} style={{ fontSize: 12, color: "#64748b", margin: "0 0 6px 0", display: "flex", gap: 6 }}>
                      <span style={{ color: "#cbd5e1" }}>→</span>{inp}
                    </p>
                  ))}
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Outputs</p>
                  {agent.brief.outputs.map((out, i) => (
                    <p key={i} style={{ fontSize: 12, color: "#64748b", margin: "0 0 6px 0", display: "flex", gap: 6 }}>
                      <span style={{ color: "#cbd5e1" }}>←</span>{out}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: CARPETA ── */}
        {innerTab === "carpeta" && agent.folder && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "12px 16px", background: c.hexLight, borderRadius: 10, border: `1px solid ${c.hexBorder}` }}>
              <span style={{ fontSize: 24 }}>📁</span>
              <div>
                <p style={{ fontWeight: 700, color: c.hex, fontSize: 14, margin: 0 }}>{agent.folder.name}</p>
                <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0 0" }}>{agent.folder.hostPath}</p>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <p style={{ fontWeight: 700, color: c.hex, fontSize: 18, margin: 0 }}>{agent.folder.totalFiles}</p>
                <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>archivos</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {agent.folder.categories.map((cat, ci) => (
                <div key={ci} style={{ background: "#f8fafc", borderRadius: 10, padding: 14, border: "1px solid #e2e8f0" }}>
                  <p style={{ fontWeight: 700, color: "#374151", fontSize: 13, margin: "0 0 10px 0" }}>
                    {cat.icon} {cat.label}
                  </p>
                  {cat.files.map((f, fi) => (
                    <div key={fi} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <p style={{ fontSize: 12, color: "#475569", margin: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {f.name}
                      </p>
                      <FileTag tag={f.tag} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: EQUIPO ── */}
        {innerTab === "equipo" && agent.folder?.team && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <p style={{ fontWeight: 700, color: "#1e293b", fontSize: 15, margin: 0 }}>Equipo weAPES — Abril 2026</p>
              <span style={{ fontSize: 12, background: "#f1f5f9", color: "#64748b", padding: "3px 10px", borderRadius: 20 }}>Soc. Cooperativa de Productores</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {agent.folder.team.map((member, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: member.isYou ? c.hexLight : member.status === "standby" ? "#f8fafc" : "white", borderRadius: 10, border: `1px solid ${member.isYou ? c.hexBorder : "#e2e8f0"}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: member.status === "standby" ? "#e2e8f0" : c.hex, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                    {member.name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <p style={{ fontWeight: 700, color: member.status === "standby" ? "#94a3b8" : "#1e293b", fontSize: 13, margin: 0 }}>{member.name}</p>
                      {member.isYou && <span style={{ fontSize: 10, background: c.hex, color: "white", padding: "1px 6px", borderRadius: 10, fontWeight: 600 }}>Tú</span>}
                      {member.status === "standby" && <span style={{ fontSize: 10, background: "#f1f5f9", color: "#94a3b8", padding: "1px 6px", borderRadius: 10 }}>standby</span>}
                    </div>
                    <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: ESTA SEMANA ── */}
        {innerTab === "semana" && agent.folder?.weeklyPriorities && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <p style={{ fontWeight: 700, color: "#1e293b", fontSize: 15, margin: 0 }}>Plan Semana 3 — 14 al 20 Abr</p>
              <span style={{ fontSize: 12, background: "#fee2e2", color: "#dc2626", padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>Semana activa</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {agent.folder.weeklyPriorities.map((task, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: task.done ? "#f0fdf4" : task.priority === "P1" ? "#fff7f7" : "#fafafa", borderRadius: 10, border: `1px solid ${task.done ? "#bbf7d0" : task.priority === "P1" ? "#fecaca" : "#e2e8f0"}` }}>
                  {task.done
                    ? <span style={{ width: 28, height: 20, background: "#16a34a", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "white", flexShrink: 0 }}>✓</span>
                    : <PriorityBadge p={task.priority} />
                  }
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, color: task.done ? "#15803d" : "#1e293b", fontSize: 13, margin: 0, textDecoration: task.done ? "line-through" : "none", opacity: task.done ? 0.75 : 1 }}>{task.task}</p>
                    <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0 0" }}>{task.area} · {task.who}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// STATUS CONFIG
// ============================================================

const STATUS_CFG = {
  working: { label: "Trabajando", dot: "#4ade80", pulse: "#4ade80", text: "#16a34a" },
  alerta:  { label: "Alerta",     dot: "#f87171", pulse: "#f87171", text: "#dc2626" },
  idle:    { label: "En espera",  dot: "#94a3b8", pulse: null,      text: "#64748b" },
};

// ============================================================
// OFFICE 3D — React Three Fiber
// ============================================================

function hexShade(hex, f) {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgb(${Math.round(((n >> 16) & 255) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`;
}

function FloorTile({ x, z, even }) {
  return (
    <mesh position={[x + 0.5, -0.025, z + 0.5]} receiveShadow>
      <boxGeometry args={[0.97, 0.05, 0.97]} />
      <meshStandardMaterial color={even ? "#f0f4f8" : "#e2eaf2"} />
    </mesh>
  );
}

function Window3D({ x, z }) {
  return (
    <group position={[x, 1.5, z]}>
      <mesh>
        <boxGeometry args={[0.88, 1.1, 0.06]} />
        <meshStandardMaterial color="#bae6fd" transparent opacity={0.75} />
      </mesh>
      <mesh position={[0, 0, 0.04]}>
        <boxGeometry args={[0.88, 0.06, 0.05]} />
        <meshStandardMaterial color="#7dd3fc" />
      </mesh>
      <mesh position={[0, 0, 0.04]}>
        <boxGeometry args={[0.06, 1.1, 0.05]} />
        <meshStandardMaterial color="#7dd3fc" />
      </mesh>
    </group>
  );
}

function Plant3D({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.38, 8]} />
        <meshStandardMaterial color="#92400e" />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <sphereGeometry args={[0.32, 10, 8]} />
        <meshStandardMaterial color="#15803d" />
      </mesh>
      <mesh position={[0.2, 0.72, 0.1]} castShadow>
        <sphereGeometry args={[0.2, 8, 6]} />
        <meshStandardMaterial color="#16a34a" />
      </mesh>
    </group>
  );
}

function CoffeeMug({ position, color = "#7c3aed" }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.075, 0.065, 0.14, 10]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.062, 0.052, 0.10, 10]} />
        <meshStandardMaterial color={color} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0.1, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.04, 0.012, 6, 12, Math.PI]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
    </group>
  );
}

function DeskProp({ uid, color, w }) {
  const cx = w / 2;
  if (uid === "gym") return (
    <group position={[cx + 0.48, 0.47, 0.35]}>
      <mesh castShadow>
        <boxGeometry args={[0.18, 0.14, 0.14]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0.24, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.18, 8]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.8} />
      </mesh>
    </group>
  );
  if (uid === "orchestrator") return (
    <group position={[cx - 0.6, 0.47, 0.25]}>
      <mesh castShadow>
        <boxGeometry args={[0.26, 0.18, 0.03]} />
        <meshStandardMaterial color="#a5b4fc" emissive="#a5b4fc" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, -0.13, 0]}>
        <boxGeometry args={[0.04, 0.12, 0.04]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
    </group>
  );
  if (uid === "ventas") return (
    <group position={[cx + 0.42, 0.47, 0.42]}>
      <mesh castShadow>
        <boxGeometry args={[0.22, 0.15, 0.08]} />
        <meshStandardMaterial color="#92400e" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.09, 0.04, 0.04]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>
    </group>
  );
  if (uid === "finanzas") return (
    <group position={[cx + 0.38, 0.47, 0.42]}>
      {[[-0.09, 0.09], [0, 0.15], [0.09, 0.07]].map(([bx, bh], i) => (
        <mesh key={i} position={[bx, bh / 2, 0]} castShadow>
          <boxGeometry args={[0.055, bh, 0.055]} />
          <meshStandardMaterial color={i === 1 ? color : "#94a3b8"} />
        </mesh>
      ))}
    </group>
  );
  if (uid === "procesos") return (
    <group position={[cx - 0.38, 0.47, 0.48]}>
      <mesh castShadow rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.16, 0.21, 0.02]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[0, 0.11, 0.012]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.08, 0.025, 0.01]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      {[-0.04, 0, 0.04].map((ly, i) => (
        <mesh key={i} position={[0.01, ly, 0.013]} rotation={[0.1, 0, 0]}>
          <boxGeometry args={[0.1, 0.012, 0.008]} />
          <meshStandardMaterial color={i === 0 ? "#059669" : "#cbd5e1"} />
        </mesh>
      ))}
    </group>
  );
  return null;
}

function Desk3D({ position, w = 1.8, d = 1.1, color, isActive, status, selected, onClick, uid }) {
  const dark = hexShade(color, 0.62);
  const monColor = isActive ? (status === "alerta" ? "#fca5a5" : "#bbf7d0") : "#e2e8f0";
  return (
    <group position={position} onClick={onClick}>
      {selected && (
        <mesh position={[w / 2, 0.01, d / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(w, d) * 0.72, Math.max(w, d) * 0.82, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} />
        </mesh>
      )}
      <mesh position={[w / 2, 0.44, d / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.07, d]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {[[0.14, 0.14], [w - 0.14, 0.14], [0.14, d - 0.14], [w - 0.14, d - 0.14]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.22, lz]} castShadow>
          <boxGeometry args={[0.07, 0.44, 0.07]} />
          <meshStandardMaterial color={dark} />
        </mesh>
      ))}
      <mesh position={[w / 2, 0.9, 0.18]} castShadow>
        <boxGeometry args={[w * 0.52, 0.5, 0.05]} />
        <meshStandardMaterial color={monColor} emissive={monColor} emissiveIntensity={isActive ? 0.28 : 0} />
      </mesh>
      <mesh position={[w / 2, 0.59, 0.18]}>
        <boxGeometry args={[0.07, 0.3, 0.07]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      <CoffeeMug position={[w * 0.14, 0.47, d * 0.72]} color={color} />
      <DeskProp uid={uid} color={color} w={w} />
    </group>
  );
}

function ChibiChar({ position, color, name, status, uid, pulse, selected, onClick }) {
  const groupRef = useRef();
  const scfg = STATUS_CFG[status];
  const isActive = status === "working" || status === "alerta";
  const dark = hexShade(color, 0.55);
  const pants = hexShade(color, 0.42);
  const skin = "#FDBCB4";

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const phase = uid.charCodeAt(0) * 0.4;
    if (isActive && pulse) {
      groupRef.current.position.y = position[1] + Math.sin(t * 2.8 + phase) * 0.07 + 0.04;
    } else {
      groupRef.current.position.y = position[1] + Math.sin(t * 0.9 + phase) * 0.018;
    }
  });

  return (
    <group ref={groupRef} position={position} onClick={onClick}>

      {/* Status orb */}
      <mesh position={[0.44, 1.95, 0.1]}>
        <sphereGeometry args={[0.065, 8, 8]} />
        <meshStandardMaterial color={scfg.dot} emissive={scfg.dot} emissiveIntensity={isActive ? 1.2 : 0.4} />
      </mesh>

      {/* LEGS — pants */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.14, 0.21, 0]} castShadow>
            <cylinderGeometry args={[0.096, 0.096, 0.38, 10]} />
            <meshStandardMaterial color={pants} />
          </mesh>
          <mesh position={[s * 0.15, 0.02, 0.1]} castShadow>
            <sphereGeometry args={[0.12, 10, 8]} />
            <meshStandardMaterial color="#1c1210" />
          </mesh>
        </group>
      ))}

      {/* TORSO */}
      <mesh position={[0, 0.70, 0]} castShadow>
        <boxGeometry args={[0.52, 0.52, 0.38]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      {/* Collar */}
      <mesh position={[0, 0.90, 0.18]}>
        <boxGeometry args={[0.16, 0.1, 0.04]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      {/* ARMS + HANDS */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.36, 0.67, 0]} rotation={[0, 0, s * 0.3]} castShadow>
            <cylinderGeometry args={[0.087, 0.087, 0.42, 10]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[s * 0.43, 0.45, 0]}>
            <sphereGeometry args={[0.11, 8, 8]} />
            <meshStandardMaterial color={skin} />
          </mesh>
        </group>
      ))}

      {/* HEAD — bigger chibi */}
      <mesh position={[0, 1.32, 0]} castShadow>
        <sphereGeometry args={[0.37, 16, 14]} />
        <meshStandardMaterial color={skin} roughness={0.72} />
      </mesh>

      {/* Cheeks */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.26, 1.24, 0.3]}>
          <sphereGeometry args={[0.1, 8, 6]} />
          <meshStandardMaterial color="#ffaaaa" transparent opacity={0.5} />
        </mesh>
      ))}

      {/* Eyes */}
      {[[-0.14, 1.36, 0.34], [0.14, 1.36, 0.34]].map(([ex, ey, ez], i) => (
        <group key={i}>
          <mesh position={[ex, ey, ez]}>
            <sphereGeometry args={[0.085, 10, 8]} />
            <meshStandardMaterial color="white" />
          </mesh>
          <mesh position={[ex + (i === 0 ? 0.012 : -0.012), ey - 0.006, ez + 0.062]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#0f0700" />
          </mesh>
          <mesh position={[ex + (i === 0 ? 0.032 : -0.018), ey + 0.022, ez + 0.082]}>
            <sphereGeometry args={[0.019, 6, 6]} />
            <meshStandardMaterial color="white" />
          </mesh>
        </group>
      ))}

      {/* Smile */}
      <mesh position={[0, 1.18, 0.36]} rotation={[0.1, 0, 0]}>
        <torusGeometry args={[0.07, 0.015, 6, 14, Math.PI]} />
        <meshStandardMaterial color="#c07060" />
      </mesh>

      {/* HAIR */}
      <mesh position={[0, 1.51, -0.06]} castShadow>
        <sphereGeometry args={[0.34, 12, 10]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      <mesh position={[0.1, 1.67, 0.23]} rotation={[0.55, 0.3, 0]}>
        <sphereGeometry args={[0.145, 8, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.31, 1.35, 0.06]}>
        <sphereGeometry args={[0.105, 8, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* ── ACCESSORIES ── */}

      {/* ORCHESTRATOR — crown with gems */}
      {uid === "orchestrator" && (
        <group position={[0, 1.69, 0]}>
          <mesh>
            <cylinderGeometry args={[0.28, 0.24, 0.11, 16]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.78} roughness={0.14} />
          </mesh>
          {[0, 72, 144, 216, 288].map((deg, i) => (
            <mesh key={i} position={[Math.cos(deg * Math.PI / 180) * 0.22, 0.16, Math.sin(deg * Math.PI / 180) * 0.22]}>
              <coneGeometry args={[0.062, 0.21, 6]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.78} roughness={0.14} />
            </mesh>
          ))}
          {[0, 120, 240].map((deg, i) => (
            <mesh key={i} position={[Math.cos(deg * Math.PI / 180) * 0.22, 0.065, Math.sin(deg * Math.PI / 180) * 0.22]}>
              <sphereGeometry args={[0.037, 6, 6]} />
              <meshStandardMaterial color={["#ef4444","#3b82f6","#22c55e"][i]} emissive={["#ef4444","#3b82f6","#22c55e"][i]} emissiveIntensity={0.7} />
            </mesh>
          ))}
        </group>
      )}

      {/* GYM — red headband + arm band */}
      {uid === "gym" && (
        <>
          <mesh position={[0, 1.56, 0.08]} rotation={[0.15, 0, 0]}>
            <torusGeometry args={[0.33, 0.052, 8, 32]} />
            <meshStandardMaterial color="#ea5653" />
          </mesh>
          <mesh position={[0.44, 0.66, 0]} rotation={[0, 0, 0.3]}>
            <cylinderGeometry args={[0.093, 0.093, 0.082, 10]} />
            <meshStandardMaterial color="#ea5653" />
          </mesh>
        </>
      )}

      {/* VENTAS — suit lapels + tie */}
      {uid === "ventas" && (
        <>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.13, 0.82, 0.2]} rotation={[0, 0, s * 0.38]}>
              <boxGeometry args={[0.1, 0.2, 0.03]} />
              <meshStandardMaterial color={dark} />
            </mesh>
          ))}
          <mesh position={[0, 0.70, 0.2]}>
            <boxGeometry args={[0.065, 0.28, 0.03]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
          <mesh position={[0, 0.87, 0.2]}>
            <boxGeometry args={[0.1, 0.08, 0.03]} />
            <meshStandardMaterial color="#b91c1c" />
          </mesh>
        </>
      )}

      {/* PROCESOS — hard hat + wrench */}
      {uid === "procesos" && (
        <>
          <mesh position={[0, 1.67, 0]}>
            <sphereGeometry args={[0.29, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.62, 0]}>
            <cylinderGeometry args={[0.33, 0.33, 0.04, 16]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.4} />
          </mesh>
          <mesh position={[0.47, 0.46, 0.08]} rotation={[0.3, 0, -0.5]}>
            <cylinderGeometry args={[0.032, 0.032, 0.32, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0.47, 0.61, 0.08]} rotation={[0.3, 0, -0.5]}>
            <boxGeometry args={[0.13, 0.07, 0.07]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
          </mesh>
        </>
      )}

      {/* FINANZAS — glasses + floating mini chart */}
      {uid === "finanzas" && (
        <>
          <group position={[0, 1.35, 0.39]}>
            {[-0.12, 0.12].map((lx) => (
              <mesh key={lx} position={[lx, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.087, 0.022, 8, 20]} />
                <meshStandardMaterial color="#1c1210" />
              </mesh>
            ))}
            <mesh>
              <boxGeometry args={[0.046, 0.022, 0.012]} />
              <meshStandardMaterial color="#1c1210" />
            </mesh>
            {[-0.12, 0.12].map((lx) => (
              <mesh key={lx + "l"} position={[lx, 0, -0.01]} rotation={[Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.078, 12]} />
                <meshStandardMaterial color="#bae6fd" transparent opacity={0.35} />
              </mesh>
            ))}
          </group>
          {/* Floating bar chart */}
          <group position={[0.52, 2.0, 0]}>
            {[[0, 0.09], [0.07, 0.15], [0.14, 0.07]].map(([bx, bh], i) => (
              <mesh key={i} position={[bx, bh / 2, 0]}>
                <boxGeometry args={[0.05, bh, 0.05]} />
                <meshStandardMaterial color={i === 1 ? "#0891b2" : "#67e8f9"} emissive={i === 1 ? "#0891b2" : "#67e8f9"} emissiveIntensity={0.5} />
              </mesh>
            ))}
          </group>
        </>
      )}

      {/* Floating name */}
      <Text position={[0, 2.1, 0]} fontSize={0.16} color="#1e293b"
        anchorX="center" anchorY="bottom" outlineWidth={0.012} outlineColor="white">
        {name}
      </Text>
    </group>
  );
}

const DESK_CFG = [
  { id: "gym",          x: 0.4,  z: 2.0, w: 1.8, d: 1.1 },
  { id: "orchestrator", x: 3.2,  z: 0.4, w: 2.0, d: 1.1 },
  { id: "procesos",     x: 3.2,  z: 4.3, w: 2.0, d: 1.1 },
  { id: "ventas",       x: 5.8,  z: 2.0, w: 1.8, d: 1.1 },
  { id: "finanzas",     x: 0.4,  z: 4.6, w: 1.8, d: 1.1 },
];

const CHAIR_POSITIONS = [
  [3.1,2.0],[4.0,2.0],[4.9,2.0],
  [3.1,4.0],[4.0,4.0],[4.9,4.0],
  [2.3,3.0],[5.7,3.0],
];

const TABLE_LEG_POSITIONS = [[2.7,2.35],[5.3,2.35],[2.7,3.65],[5.3,3.65]];

function Office3D({ agents, pulse, onSelectAgent, selected }) {
  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a]));

  return (
    <div style={{ width: "100%", height: 560, borderRadius: 16, overflow: "hidden" }}>
      <Canvas shadows camera={{ position: [4, 10, 13], fov: 40 }}
        style={{ background: "linear-gradient(180deg,#c7d9f5 0%,#e8f0fc 60%,#f0f9ff 100%)" }}>

        <ambientLight intensity={0.7} />
        <directionalLight position={[6, 12, 8]} intensity={1.3} castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={1} shadow-camera-far={32}
          shadow-camera-left={-12} shadow-camera-right={12}
          shadow-camera-top={12} shadow-camera-bottom={-12} />
        {/* Warm fill light from front */}
        <pointLight position={[4, 5, 10]} intensity={0.5} color="#fef9e7" />
        {/* Cool accent from left */}
        <pointLight position={[-1, 4, 3]} intensity={0.25} color="#dbeafe" />
        {/* Ceiling lights above desk zones */}
        <pointLight position={[1.3, 3.2, 2.6]} intensity={0.35} color="#fffbeb" />
        <pointLight position={[4.2, 3.2, 0.9]} intensity={0.35} color="#fffbeb" />
        <pointLight position={[6.7, 3.2, 2.6]} intensity={0.35} color="#fffbeb" />
        <pointLight position={[1.3, 3.2, 5.2]} intensity={0.35} color="#fffbeb" />
        <pointLight position={[4.2, 3.2, 4.8]} intensity={0.35} color="#fffbeb" />

        <OrbitControls target={[4, 0.5, 3]}
          minPolarAngle={Math.PI / 7} maxPolarAngle={Math.PI / 2.5}
          minDistance={7} maxDistance={19} enablePan={false} />

        {/* ── FLOOR ── */}
        {Array.from({ length: 8 }, (_, x) =>
          Array.from({ length: 7 }, (_, z) => (
            <FloorTile key={`f${x}-${z}`} x={x} z={z} even={(x + z) % 2 === 0} />
          ))
        )}

        {/* ── BACK WALL ── */}
        <mesh position={[4, 1.6, -0.05]} receiveShadow>
          <boxGeometry args={[8, 3.2, 0.1]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        {[1.4, 3.8, 6.2].map((wx) => <Window3D key={wx} x={wx} z={0.02} />)}

        {/* ── LEFT WALL ── */}
        <mesh position={[-0.05, 1.6, 3.5]} receiveShadow>
          <boxGeometry args={[0.1, 3.2, 7]} />
          <meshStandardMaterial color="#f1f5f9" />
        </mesh>

        {/* ── RIGHT WALL ── */}
        <mesh position={[8.05, 1.6, 3.5]} receiveShadow>
          <boxGeometry args={[0.1, 3.2, 7]} />
          <meshStandardMaterial color="#f1f5f9" />
        </mesh>

        {/* ── CEILING LIGHT PANELS ── */}
        {[[1.8, 3.18, 2.5],[4.0, 3.18, 2.5],[6.2, 3.18, 2.5],[1.8, 3.18, 5.0],[4.0, 3.18, 5.0]].map(([lx, ly, lz], i) => (
          <mesh key={i} position={[lx, ly, lz]}>
            <boxGeometry args={[0.7, 0.04, 0.35]} />
            <meshStandardMaterial color="#fffde7" emissive="#fffde7" emissiveIntensity={0.6} />
          </mesh>
        ))}

        {/* ── WHITEBOARD / SCREEN on back wall ── */}
        <mesh position={[4, 1.85, 0.07]}>
          <boxGeometry args={[2.6, 1.4, 0.04]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[4, 1.85, 0.1]}>
          <boxGeometry args={[2.4, 1.2, 0.02]} />
          <meshStandardMaterial color="#0f172a" emissive="#1e3a5f" emissiveIntensity={0.4} />
        </mesh>
        {/* Screen frame */}
        <mesh position={[4, 1.2, 0.09]}>
          <cylinderGeometry args={[0.04, 0.04, 0.55, 8]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        <mesh position={[4, 0.94, 0.09]}>
          <boxGeometry args={[0.4, 0.04, 0.04]} />
          <meshStandardMaterial color="#475569" />
        </mesh>

        {/* ── MEETING TABLE ── */}
        <mesh position={[4, 0.28, 3.1]} castShadow receiveShadow>
          <boxGeometry args={[3.0, 0.1, 1.6]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.35} metalness={0.1} />
        </mesh>
        {[[2.62, 2.42], [5.38, 2.42], [2.62, 3.78], [5.38, 3.78]].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.14, lz]}>
            <cylinderGeometry args={[0.055, 0.055, 0.28, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.3} />
          </mesh>
        ))}
        {/* Coffee/water on meeting table */}
        <CoffeeMug position={[4.3, 0.33, 2.9]} color="#7c3aed" />
        <CoffeeMug position={[3.7, 0.33, 3.3]} color="#059669" />

        {/* CHAIRS around meeting table */}
        {CHAIR_POSITIONS.map(([cx, cz], i) => (
          <group key={i} position={[cx, 0, cz]}>
            <mesh position={[0, 0.22, 0]}>
              <boxGeometry args={[0.52, 0.06, 0.52]} />
              <meshStandardMaterial color="#cbd5e1" />
            </mesh>
            <mesh position={[0, 0.56, -0.24]}>
              <boxGeometry args={[0.52, 0.54, 0.06]} />
              <meshStandardMaterial color="#cbd5e1" />
            </mesh>
            {/* Chair legs */}
            {[[-0.22,-0.22],[0.22,-0.22],[-0.22,0.22],[0.22,0.22]].map(([lx,lz],j) => (
              <mesh key={j} position={[lx, 0.11, lz + 0.22]}>
                <cylinderGeometry args={[0.022, 0.022, 0.22, 6]} />
                <meshStandardMaterial color="#94a3b8" />
              </mesh>
            ))}
          </group>
        ))}

        {/* ── BOOKSHELF on left wall ── */}
        <group position={[0.06, 0, 1.2]}>
          <mesh position={[0, 0.7, 0.35]} castShadow>
            <boxGeometry args={[0.18, 1.4, 0.7]} />
            <meshStandardMaterial color="#d6b896" roughness={0.6} />
          </mesh>
          {[0.15, 0.52, 0.9].map((by, ri) => (
            <mesh key={ri} position={[0.06, by, 0.35]}>
              <boxGeometry args={[0.04, 0.04, 0.62]} />
              <meshStandardMaterial color="#b8946a" />
            </mesh>
          ))}
          {[["#ef4444",0.22,0.22],["#3b82f6",0.22,0.38],["#22c55e",0.22,0.53],
            ["#f59e0b",0.59,0.25],["#8b5cf6",0.59,0.42],["#06b6d4",0.97,0.28],["#ec4899",0.97,0.46]
          ].map(([bc, by, bz], bi) => (
            <mesh key={bi} position={[0.06, by, bz]} castShadow>
              <boxGeometry args={[0.04, 0.13, 0.075]} />
              <meshStandardMaterial color={bc} roughness={0.5} />
            </mesh>
          ))}
        </group>

        {/* ── PLANTS ── */}
        <Plant3D position={[0.25, 0, 6.0]} />
        <Plant3D position={[7.6, 0, 0.3]} />
        <Plant3D position={[7.6, 0, 6.0]} />

        {/* ── AGENTS: DESKS + CHIBIS ── */}
        {DESK_CFG.map((dc) => {
          const agent = agentMap[dc.id];
          const color = C[agent.colorKey].hex;
          const isActive = agent.status === "working" || agent.status === "alerta";
          const isSel = selected?.id === agent.id;
          return (
            <group key={dc.id}>
              <Desk3D
                position={[dc.x, 0, dc.z]}
                w={dc.w} d={dc.d}
                color={color}
                isActive={isActive}
                status={agent.status}
                selected={isSel}
                uid={dc.id}
                onClick={() => onSelectAgent(agent)}
              />
              <ChibiChar
                position={[dc.x + dc.w / 2, 0, dc.z + dc.d + 0.38]}
                color={color}
                name={agent.name}
                status={agent.status}
                uid={dc.id}
                pulse={pulse}
                selected={isSel}
                onClick={() => onSelectAgent(agent)}
              />
            </group>
          );
        })}
      </Canvas>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================

export default function App() {
  const [tab, setTab] = useState("red");
  const [selected, setSelected] = useState(null);
  const [openBriefs, setOpenBriefs] = useState({});
  const [pulse, setPulse] = useState(false);

  // ── Chat ──
  const CHAT_AGENTS = [
    { id: "orchestrator", name: "Orquestador Maestro", emoji: "🧠", colorKey: "purple" },
    { id: "gym",          name: "Agente Gym PM",       emoji: "🏃", colorKey: "emerald" },
    { id: "ventas",       name: "CEO / Ventas",        emoji: "🪑", colorKey: "amber" },
    { id: "finanzas",     name: "Agente Finanzas",     emoji: "📊", colorKey: "cyan" },
    { id: "procesos",     name: "Agente Procesos",     emoji: "⚙️", colorKey: "blue" },
  ];
  const [chatAgent, setChatAgent]   = useState("gym");
  const [chatHistory, setChatHistory] = useState({}); // { agentId: [{role, text}] }
  const [chatInput, setChatInput]   = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  const sendChatMessage = () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatHistory(h => ({ ...h, [chatAgent]: [...(h[chatAgent] || []), { role: "user", text: msg }] }));
    setChatLoading(true);

    let agentText = "";
    setChatHistory(h => ({ ...h, [chatAgent]: [...(h[chatAgent] || []), { role: "assistant", text: "" }] }));

    fetch(`http://localhost:3001/api/agents/${chatAgent}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    }).then(res => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const pump = ({ done, value }) => {
        if (done) { setChatLoading(false); return; }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.text) {
              agentText += evt.text;
              setChatHistory(h => {
                const hist = [...(h[chatAgent] || [])];
                hist[hist.length - 1] = { role: "assistant", text: agentText };
                return { ...h, [chatAgent]: hist };
              });
            }
            if (evt.done) setChatLoading(false);
            if (evt.error) { setChatLoading(false); }
          } catch (_) {}
        }
        return reader.read().then(pump);
      };
      return reader.read().then(pump);
    }).catch(() => setChatLoading(false));
  };

  const clearChatHistory = () => {
    fetch(`http://localhost:3001/api/agents/${chatAgent}/history`, { method: "DELETE" });
    setChatHistory(h => ({ ...h, [chatAgent]: [] }));
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatAgent]);

  // ── Auditoría Web ──
  const AUDIT_AGENTS = [
    { id: "gym-cro",  label: "Conversiones",    emoji: "🎯", color: "#7c3aed" },
    { id: "gym-copy", label: "Copy",             emoji: "✍️", color: "#0891b2" },
    { id: "gym-seo",  label: "SEO",              emoji: "🔍", color: "#059669" },
    { id: "gym-ux",   label: "UX / Visual",      emoji: "🎨", color: "#d97706" },
  ];
  const [auditStatus, setAuditStatus]   = useState({}); // { agentId: "idle"|"running"|"done"|"error" }
  const [auditReports, setAuditReports] = useState({}); // { agentId: string }
  const [uxReady, setUxReady]           = useState(false); // se activa cuando los 3 terminan
  const [auditLog, setAuditLog]         = useState({}); // { agentId: string[] }  — tool calls log
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditPhase, setAuditPhase]     = useState(0); // 0=idle, 1, 2

  const startAudit = () => {
    const initStatus = {};
    const initReports = {};
    const initLog = {};
    AUDIT_AGENTS.forEach(({ id }) => { initStatus[id] = "idle"; initReports[id] = ""; initLog[id] = []; });
    setAuditStatus(initStatus);
    setAuditReports(initReports);
    setAuditLog(initLog);
    setAuditRunning(true);

    fetch("http://localhost:3001/api/agents/gym/audit", { method: "POST" })
      .then((res) => {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const processChunk = ({ done, value }) => {
          if (done) { setAuditRunning(false); return; }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const evt = JSON.parse(line.slice(6));
              const agentPhase = { "gym-cro": 1, "gym-copy": 1, "gym-seo": 2 };
              if (evt.type === "phase") {
                // ignorado — usamos agent_start para actualizar fase
              } else if (evt.type === "agent_start") {
                if (agentPhase[evt.agent]) setAuditPhase(agentPhase[evt.agent]);
                setAuditStatus(s => ({ ...s, [evt.agent]: "running" }));
              } else if (evt.type === "text") {
                setAuditReports(r => ({ ...r, [evt.agent]: (r[evt.agent] || "") + evt.text }));
              } else if (evt.type === "tool_start") {
                const label = evt.tool === "web_fetch"
                  ? `Fetching ${evt.input?.url}`
                  : `Buscando: "${evt.input?.query}"`;
                setAuditLog(l => ({ ...l, [evt.agent]: [...(l[evt.agent] || []), label] }));
              } else if (evt.type === "agent_done") {
                setAuditStatus(s => ({ ...s, [evt.agent]: "done" }));
              } else if (evt.type === "agent_error") {
                setAuditStatus(s => ({ ...s, [evt.agent]: "error" }));
              } else if (evt.type === "done") {
                setAuditRunning(false);
                if (evt.reportsReady) setUxReady(true);
              }
            } catch (_) { /* ignore malformed */ }
          }
          return reader.read().then(processChunk);
        };
        return reader.read().then(processChunk);
      })
      .catch(() => setAuditRunning(false));
  };

  const startUxAgent = () => {
    setAuditStatus(s => ({ ...s, "gym-ux": "running" }));
    setAuditReports(r => ({ ...r, "gym-ux": "" }));

    fetch("http://localhost:3001/api/agents/gym/audit/ux", { method: "POST" })
      .then((res) => {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const processChunk = ({ done, value }) => {
          if (done) return;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const evt = JSON.parse(line.slice(6));
              if (evt.type === "text") {
                setAuditReports(r => ({ ...r, "gym-ux": (r["gym-ux"] || "") + evt.text }));
              } else if (evt.type === "agent_done") {
                setAuditStatus(s => ({ ...s, "gym-ux": "done" }));
              } else if (evt.type === "agent_error") {
                setAuditStatus(s => ({ ...s, "gym-ux": "error" }));
              }
            } catch (_) {}
          }
          return reader.read().then(processChunk);
        };
        return reader.read().then(processChunk);
      })
      .catch(() => setAuditStatus(s => ({ ...s, "gym-ux": "error" })));
  };


  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 900);
    return () => clearInterval(t);
  }, []);

  const agentMap = Object.fromEntries(AGENTS.map((a) => [a.id, a]));
  const orchestrator = agentMap["orchestrator"];
  const specialists = ["gym", "ventas", "procesos", "finanzas"].map((id) => agentMap[id]);

  const selectAgent = (agent) => setSelected((s) => (s?.id === agent.id ? null : agent));
  const toggleBrief = (id) => setOpenBriefs((p) => ({ ...p, [id]: !p[id] }));

  const TABS = [
    { id: "red", label: "🗺️ Red de Agentes" },
    { id: "oficina", label: "🏢 Oficina 3D" },
    { id: "chat", label: "💬 Chat" },
    { id: "interacciones", label: "📡 Interacciones" },
    { id: "briefs", label: "📋 Briefs" },
    { id: "auditoria", label: "🌐 Auditoría Web" },
    { id: "db", label: "🗄️ DB Alumnos" },
  ];

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", minHeight: "100vh", background: "#f8fafc" }}>

      {/* ── HEADER ── */}
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #4c1d95 100%)", color: "white", padding: "20px 32px" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 26 }}>🤖</span>
              <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Multi-Agent Workspace</h1>
            </div>
            <p style={{ color: "#a5b4fc", fontSize: 13, margin: 0 }}>
              5 agentes coordinados — Semana 3, Abril 2026
            </p>
          </div>
          {/* Connected folder badges */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(5,150,105,0.2)", border: "1px solid rgba(110,231,183,0.4)", borderRadius: 20, padding: "4px 12px", fontSize: 12 }}>
              <span>📁</span> <span style={{ color: "#6ee7b7", fontWeight: 600 }}>weAPES _ai</span> <span style={{ color: "rgba(255,255,255,0.4)"}}>→ Gym PM</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(217,119,6,0.2)", border: "1px solid rgba(252,211,77,0.4)", borderRadius: 20, padding: "4px 12px", fontSize: 12 }}>
              <span>📁</span> <span style={{ color: "#fcd34d", fontWeight: 600 }}>woodspa</span> <span style={{ color: "rgba(255,255,255,0.4)"}}>→ CEO/Ventas</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(8,145,178,0.2)", border: "1px solid rgba(103,232,249,0.4)", borderRadius: 20, padding: "4px 12px", fontSize: 12 }}>
              <span>📁</span> <span style={{ color: "#67e8f9", fontWeight: 600 }}>finanzas_01</span> <span style={{ color: "rgba(255,255,255,0.4)"}}>→ Finanzas</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 32px", display: "flex" }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "14px 20px", fontSize: 14, fontWeight: 500, background: "none", border: "none", borderBottom: `2px solid ${tab === t.id ? "#7c3aed" : "transparent"}`, color: tab === t.id ? "#7c3aed" : "#64748b", cursor: "pointer", transition: "all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "36px 32px" }}>

        {/* ══════════════════ TAB: RED ══════════════════ */}
        {tab === "red" && (
          <div>
            <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, marginBottom: 28 }}>
              Haz clic en cualquier agente para ver su brief, carpeta y equipo. Los agentes con 📁 tienen carpeta conectada.
            </p>

            {/* Orchestrator */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 0 }}>
              <AgentCard agent={orchestrator} isSelected={selected?.id === orchestrator.id} onClick={() => selectAgent(orchestrator)} wide pulse={pulse} />
            </div>

            {/* SVG lines */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <svg viewBox="0 0 860 64" width="860" height="64" style={{ overflow: "visible" }}>
                <line x1="430" y1="0" x2="430" y2="32" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="5,4" />
                <line x1="101" y1="32" x2="759" y2="32" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="5,4" />
                <line x1="101" y1="32" x2="101" y2="64" stroke="#059669" strokeWidth="2" strokeDasharray="5,4" />
                <line x1="319" y1="32" x2="319" y2="64" stroke="#d97706" strokeWidth="2" strokeDasharray="5,4" />
                <line x1="541" y1="32" x2="541" y2="64" stroke="#2563eb" strokeWidth="2" strokeDasharray="5,4" />
                <line x1="759" y1="32" x2="759" y2="64" stroke="#0891b2" strokeWidth="2" strokeDasharray="5,4" />
              </svg>
            </div>

            {/* Specialists */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
              {specialists.map((agent) => (
                <AgentCard key={agent.id} agent={agent} isSelected={selected?.id === agent.id} onClick={() => selectAgent(agent)} pulse={pulse} />
              ))}
            </div>

            {/* Brief panel */}
            {selected && <BriefPanel agent={selected} onClose={() => setSelected(null)} />}

            {/* Legend */}
            <div style={{ marginTop: 28, background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 20px", display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Flujo</span>
              {[{ label: "Delegación", color: "#7c3aed" }, { label: "Reporte", color: "#059669" }, { label: "Colaboración", color: "#2563eb" }, { label: "Alerta", color: "#dc2626" }].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, display: "inline-block" }} />
                  <span style={{ fontSize: 12, color: "#475569" }}>{item.label}</span>
                </div>
              ))}
              <div style={{ marginLeft: "auto", display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>📁 weAPES _ai → 🏃 Gym PM</span>
                <span style={{ fontSize: 12, color: "#d97706", fontWeight: 600 }}>📁 woodspa → 🪑 CEO/Ventas</span>
                <span style={{ fontSize: 12, color: "#0891b2", fontWeight: 600 }}>📁 finanzas_01 → 📊 Finanzas</span>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ TAB: CHAT ══════════════════ */}
        {tab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 220px)", minHeight: 520 }}>

            {/* Agent selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {CHAT_AGENTS.map(({ id, name, emoji, colorKey }) => {
                const c = C[colorKey];
                const active = chatAgent === id;
                return (
                  <button
                    key={id}
                    onClick={() => setChatAgent(id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "7px 14px", borderRadius: 20, border: `2px solid ${active ? c.hex : "#e2e8f0"}`,
                      background: active ? c.hex : "white", color: active ? "white" : "#64748b",
                      fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    <span>{emoji}</span>
                    <span style={{ display: window.innerWidth < 600 ? "none" : "inline" }}>{name}</span>
                  </button>
                );
              })}
              <button
                onClick={clearChatHistory}
                style={{ marginLeft: "auto", padding: "7px 14px", borderRadius: 20, border: "1px solid #e2e8f0", background: "white", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}
              >
                🗑 Limpiar historial
              </button>
            </div>

            {/* Chat window */}
            <div style={{ flex: 1, overflowY: "auto", background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              {!(chatHistory[chatAgent]?.length) && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#94a3b8" }}>
                  <span style={{ fontSize: 36 }}>
                    {CHAT_AGENTS.find(a => a.id === chatAgent)?.emoji}
                  </span>
                  <p style={{ fontSize: 14, margin: 0, fontWeight: 600, color: "#64748b" }}>
                    {CHAT_AGENTS.find(a => a.id === chatAgent)?.name}
                  </p>
                  <p style={{ fontSize: 13, margin: 0 }}>Escribe un mensaje para comenzar la conversación.</p>
                </div>
              )}
              {(chatHistory[chatAgent] || []).map((msg, i) => {
                const isUser = msg.role === "user";
                const agentCfg = CHAT_AGENTS.find(a => a.id === chatAgent);
                const c = C[agentCfg?.colorKey || "purple"];
                return (
                  <div key={i} style={{ display: "flex", gap: 10, flexDirection: isUser ? "row-reverse" : "row", alignItems: "flex-start" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: isUser ? "#e2e8f0" : c.hex, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                      {isUser ? "👤" : agentCfg?.emoji}
                    </div>
                    <div style={{
                      maxWidth: "72%", padding: "10px 14px", borderRadius: isUser ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                      background: isUser ? "#f1f5f9" : c.hexLight,
                      border: `1px solid ${isUser ? "#e2e8f0" : c.hexBorder}`,
                      fontSize: 13, color: "#1e293b", lineHeight: 1.65, whiteSpace: "pre-wrap",
                    }}>
                      {msg.text || (msg.role === "assistant" && chatLoading && i === (chatHistory[chatAgent]?.length ?? 0) - 1
                        ? <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Escribiendo...</span>
                        : null
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Input */}
            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChatMessage()}
                placeholder={`Escribe al ${CHAT_AGENTS.find(a => a.id === chatAgent)?.name}...`}
                disabled={chatLoading}
                style={{
                  flex: 1, padding: "12px 16px", borderRadius: 12, border: "1.5px solid #e2e8f0",
                  fontSize: 14, outline: "none", fontFamily: "inherit",
                  background: chatLoading ? "#f8fafc" : "white",
                  color: "#1e293b",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => e.target.style.borderColor = C[CHAT_AGENTS.find(a => a.id === chatAgent)?.colorKey || "purple"].hex}
                onBlur={e => e.target.style.borderColor = "#e2e8f0"}
              />
              <button
                onClick={sendChatMessage}
                disabled={chatLoading || !chatInput.trim()}
                style={{
                  padding: "12px 20px", borderRadius: 12, border: "none", cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer",
                  background: chatLoading || !chatInput.trim() ? "#e2e8f0" : C[CHAT_AGENTS.find(a => a.id === chatAgent)?.colorKey || "purple"].hex,
                  color: chatLoading || !chatInput.trim() ? "#94a3b8" : "white",
                  fontWeight: 700, fontSize: 14, transition: "all 0.15s",
                }}
              >
                {chatLoading ? "⏳" : "Enviar"}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════ TAB: INTERACCIONES ══════════════════ */}
        {tab === "interacciones" && (
          <div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ fontWeight: 700, color: "#1e293b", fontSize: 18, margin: 0 }}>Log de Interacciones</h2>
                <p style={{ color: "#94a3b8", fontSize: 13, margin: "4px 0 0 0" }}>Semanas 2–3 Abril · {INTERACTIONS.length} comunicaciones registradas</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(MSG).map(([k, v]) => (
                  <span key={k} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }} className={v.badge}>{v.label}</span>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {INTERACTIONS.map((msg) => {
                const from = agentMap[msg.from];
                const to = agentMap[msg.to];
                const mt = MSG[msg.type];
                const cf = C[from.colorKey];
                const ct = C[to.colorKey];
                return (
                  <div key={msg.id} style={{ display: "flex", gap: 14, padding: 14, borderRadius: 12, border: "1px solid" }} className={`${mt.bg} ${mt.border}`}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: cf.hex, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{from.emoji}</div>
                      <span style={{ color: "#cbd5e1" }}>→</span>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: ct.hex, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{to.emoji}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: cf.hex }}>{from.name}</span>
                        <span style={{ color: "#cbd5e1", fontSize: 12 }}>→</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: ct.hex }}>{to.name}</span>
                        <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }} className={mt.badge}>{mt.label}</span>
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>{msg.time}</span>
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.6 }}>{msg.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════ TAB: BRIEFS ══════════════════ */}
        {tab === "briefs" && (
          <div>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 20 }}>Brief completo de cada agente — haz clic para expandir.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {AGENTS.map((agent) => {
                const c = C[agent.colorKey];
                const isOpen = openBriefs[agent.id];
                return (
                  <div key={agent.id} style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    <button onClick={() => toggleBrief(agent.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: c.hex, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{agent.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, color: "#1e293b", fontSize: 15, margin: "0 0 2px 0" }}>{agent.name}</p>
                        <p style={{ fontSize: 12, color: c.hex, fontWeight: 600, margin: 0 }}>{agent.subtitle}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {agent.folder && <FolderBadge folder={agent.folder} colorKey={agent.colorKey} />}
                        <span style={{ color: "#94a3b8", fontSize: 16, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
                      </div>
                    </button>

                    {isOpen && (
                      <div style={{ borderTop: "1px solid #f1f5f9" }}>
                        <BriefPanel agent={agent} onClose={() => toggleBrief(agent.id)} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════ TAB: AUDITORÍA WEB ══════════════════ */}
        {tab === "auditoria" && (
          <div>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
              <div>
                <h2 style={{ fontWeight: 700, color: "#1e293b", fontSize: 18, margin: "0 0 4px 0" }}>Auditoría Web — weapesparkour.com</h2>
                <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
                  4 sub-agentes del Gym PM analizan el sitio en paralelo: CRO, Copy, SEO y UX.
                </p>
              </div>
              <button
                onClick={startAudit}
                disabled={auditRunning}
                style={{
                  padding: "10px 22px", borderRadius: 10, border: "none", cursor: auditRunning ? "not-allowed" : "pointer",
                  background: auditRunning ? "#94a3b8" : "linear-gradient(135deg, #059669, #0891b2)",
                  color: "white", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8,
                  boxShadow: auditRunning ? "none" : "0 2px 8px rgba(5,150,105,0.35)",
                  transition: "all 0.2s",
                }}
              >
                {auditRunning ? "⏳ Auditando..." : "▶ Lanzar Auditoría"}
              </button>
            </div>

            {/* Pipeline phases indicator */}
            {auditRunning && (
              <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 24, background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                {[
                  { n: 1, label: "CRO",  sub: "Conversiones" },
                  { n: 2, label: "Copy", sub: "Textos y mensajes" },
                  { n: 3, label: "SEO",  sub: "Posicionamiento" },
                ].map(({ n, label, sub }, i) => {
                  const active = auditPhase === n;
                  const done = auditPhase > n;
                  return (
                    <div key={n} style={{ flex: 1, padding: "12px 20px", background: active ? "#f0fdf4" : done ? "#f8fafc" : "white", borderRight: i < 2 ? "1px solid #e2e8f0" : "none", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: active ? "#059669" : done ? "#6ee7b7" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: active || done ? "white" : "#94a3b8", flexShrink: 0 }}>
                        {done ? "✓" : n}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 13, color: active ? "#059669" : done ? "#64748b" : "#94a3b8", margin: 0 }}>{label}</p>
                        <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Agent cards grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {AUDIT_AGENTS.map(({ id, label, emoji, color }) => {
                const status = auditStatus[id] || "idle";
                const report = auditReports[id] || "";
                const log    = auditLog[id] || [];
                const statusLabel = { idle: "En espera", running: "Analizando...", done: "Completado", error: "Error" }[status];
                const statusColor = { idle: "#94a3b8", running: "#f59e0b", done: "#059669", error: "#dc2626" }[status];
                const statusDot   = { idle: "#e2e8f0", running: "#fbbf24", done: "#6ee7b7", error: "#fca5a5" }[status];

                return (
                  <div key={id} style={{ background: "white", borderRadius: 16, border: `1px solid ${status === "done" ? color + "40" : "#e2e8f0"}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", transition: "border-color 0.3s" }}>
                    {/* Card header */}
                    <div style={{ padding: "14px 18px", background: status === "done" ? color + "08" : "#f8fafc", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 22 }}>{emoji}</span>
                        <div>
                          <p style={{ fontWeight: 700, color: "#1e293b", fontSize: 14, margin: 0 }}>{label}</p>
                          <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>Agente {id}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusDot, display: "inline-block", boxShadow: status === "running" ? `0 0 6px ${statusDot}` : "none" }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: statusColor }}>{statusLabel}</span>
                      </div>
                    </div>

                    {/* Tool call log */}
                    {log.length > 0 && (
                      <div style={{ padding: "8px 18px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9", maxHeight: 80, overflowY: "auto" }}>
                        {log.map((entry, i) => (
                          <p key={i} style={{ fontSize: 11, color: "#64748b", margin: "2px 0", fontFamily: "monospace" }}>
                            🔧 {entry}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Report */}
                    <div style={{ padding: "14px 18px", minHeight: 100 }}>
                      {/* UX card — botón manual */}
                      {id === "gym-ux" && !report && status !== "running" && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "20px 0" }}>
                          {!uxReady ? (
                            <>
                              <p style={{ color: "#cbd5e1", fontSize: 13, margin: 0, textAlign: "center", fontStyle: "italic" }}>
                                Esperando que CRO, Copy y SEO terminen...
                              </p>
                              <div style={{ display: "flex", gap: 8 }}>
                                {["gym-cro","gym-copy","gym-seo"].map(dep => {
                                  const s = auditStatus[dep] || "idle";
                                  return <span key={dep} style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: s === "done" ? "#dcfce7" : "#f1f5f9", color: s === "done" ? "#059669" : "#94a3b8", fontWeight: 600 }}>{s === "done" ? "✓" : "⏳"} {dep.replace("gym-","")}</span>;
                                })}
                              </div>
                            </>
                          ) : (
                            <>
                              <p style={{ color: "#059669", fontSize: 13, margin: 0, fontWeight: 600, textAlign: "center" }}>
                                ✓ CRO, Copy y SEO completados — listo para generar código
                              </p>
                              <button
                                onClick={startUxAgent}
                                style={{ padding: "10px 24px", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #d97706, #b45309)", color: "white", fontWeight: 700, fontSize: 13, boxShadow: "0 2px 8px rgba(217,119,6,0.4)" }}
                              >
                                🎨 Generar Código UX/UI
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      {/* Otros agentes — idle */}
                      {id !== "gym-ux" && !report && status === "idle" && (
                        <p style={{ color: "#cbd5e1", fontSize: 13, margin: 0, fontStyle: "italic" }}>
                          Esperando inicio de auditoría...
                        </p>
                      )}
                      {!report && status === "running" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 18 }}>⚙️</span>
                          <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>Analizando sitio web...</p>
                        </div>
                      )}
                      {report && (
                        <div style={{ maxHeight: 480, overflowY: "auto" }}>
                          {id === "gym-ux"
                            ? report.split(/(```[\s\S]*?```)/g).map((part, i) => {
                                if (part.startsWith("```")) {
                                  const lang = part.match(/^```(\w+)/)?.[1] || "";
                                  const code = part.replace(/^```\w*\n?/, "").replace(/```$/, "");
                                  return (
                                    <div key={i} style={{ margin: "10px 0" }}>
                                      {lang && <div style={{ background: "#1e293b", color: "#94a3b8", fontSize: 10, padding: "4px 12px", borderRadius: "6px 6px 0 0", fontFamily: "monospace", textTransform: "uppercase" }}>{lang}</div>}
                                      <pre style={{ background: "#0f172a", color: "#e2e8f0", fontSize: 11, margin: 0, padding: "12px 14px", borderRadius: lang ? "0 0 6px 6px" : 6, whiteSpace: "pre-wrap", overflowX: "auto", lineHeight: 1.6, fontFamily: "monospace" }}>
                                        {code}
                                      </pre>
                                    </div>
                                  );
                                }
                                return part ? <p key={i} style={{ fontSize: 12, color: "#334155", margin: "8px 0", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{part}</p> : null;
                              })
                            : <pre style={{ fontSize: 12, color: "#334155", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.7, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{report}</pre>
                          }
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer note */}
            <p style={{ textAlign: "center", color: "#cbd5e1", fontSize: 12, marginTop: 20 }}>
              Pipeline de 2 fases — CRO y Copy primero, luego SEO y UX reciben esos reportes como contexto.
            </p>
          </div>
        )}

        {/* ══════════════════ TAB: OFICINA 3D ══════════════════ */}
        {tab === "oficina" && (
          <div>
            <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, marginBottom: 16 }}>
              Vista isométrica de la oficina — haz clic en un escritorio para ver el brief del agente.
            </p>
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <Office3D agents={AGENTS} pulse={pulse} onSelectAgent={selectAgent} selected={selected} />
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
              {AGENTS.map(a => {
                const scfg = STATUS_CFG[a.status];
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: scfg.dot, display: "inline-block" }} />
                    <span style={{ fontSize: 12, color: "#475569" }}>{a.emoji} {a.name}</span>
                    <span style={{ fontSize: 11, color: scfg.text, fontWeight: 600 }}>· {scfg.label}</span>
                  </div>
                );
              })}
            </div>
            {selected && <BriefPanel agent={selected} onClose={() => setSelected(null)} />}
          </div>
        )}

      </div>

      {/* ══════════════════ TAB: DB ALUMNOS ══════════════════ */}
      {tab === "db" && (
        <div style={{ margin: "0 -32px -36px" }}>
          <WeApesDB />
        </div>
      )}

    </div>
  );
}
