import { useState } from "react";

const COLORS = {
  bg: "#0a0a0a",
  surface: "#111111",
  card: "#161616",
  border: "#222222",
  accent: "#c8f025",
  accentDim: "#a3c81e",
  text: "#f0f0f0",
  muted: "#888888",
  danger: "#ff4d4d",
  warning: "#ffaa00",
  success: "#25f07e",
};

const alumnos = [
  { id: 1, nombre: "Rodrigo Garza", edad: 24, categoria: "Adulto", plan: "Membresía Ilimitada", costo: 700, status: "Activo", nivel: "Intermedio", asistencia: 14, metaAsistencia: 16, ingreso: "2024-03-01", coach: "Marco A.", hitos: ["Caída técnica", "Kong básico", "Precision jump", "Wall run"], notas: "Buen progreso. Enfocarse en aterrizajes." },
  { id: 2, nombre: "Sofía Ramírez", edad: 16, categoria: "Teen", plan: "2× semana 60min", costo: 1750, status: "Activo", nivel: "Básico", asistencia: 7, metaAsistencia: 8, ingreso: "2025-01-10", coach: "Ana L.", hitos: ["Caída técnica", "Balance básico"], notas: "Excelente actitud. Lista para nivel 2." },
  { id: 3, nombre: "Cédric Torres", edad: 8, categoria: "Kids", plan: "3× semana 60min", costo: 1950, status: "Activo", nivel: "Básico", asistencia: 10, metaAsistencia: 12, ingreso: "2024-09-15", coach: "Ana L.", hitos: ["Caída técnica", "Balance básico", "Salto de precisión"], notas: "Muy ágil para su edad." },
  { id: 4, nombre: "Diego Mendoza", edad: 29, categoria: "Adulto", plan: "Personalizado", costo: 1800, status: "Activo", nivel: "Avanzado", asistencia: 16, metaAsistencia: 16, ingreso: "2023-06-01", coach: "Marco A.", hitos: ["Caída técnica", "Kong básico", "Precision jump", "Wall run", "Gainer", "Doble kong"], notas: "Competidor potencial. Preparar rutina avanzada." },
  { id: 5, nombre: "Valentina Cruz", edad: 12, categoria: "Kids", plan: "1× semana 90min", costo: 1300, status: "Congelado", nivel: "Básico", asistencia: 0, metaAsistencia: 4, ingreso: "2024-11-20", coach: "Ana L.", hitos: ["Caída técnica"], notas: "Membresía congelada por vacaciones escolares." },
  { id: 6, nombre: "Emilio Soto", edad: 21, categoria: "Adulto", plan: "Membresía Ilimitada", costo: 700, status: "Inactivo", nivel: "Intermedio", asistencia: 2, metaAsistencia: 16, ingreso: "2024-07-01", coach: "Marco A.", hitos: ["Caída técnica", "Kong básico", "Wall run"], notas: "Baja asistencia. Contactar para reactivar." },
  { id: 7, nombre: "Lucía Hernández", edad: 15, categoria: "Teen", plan: "2× semana 90min", costo: 1950, status: "Activo", nivel: "Intermedio", asistencia: 8, metaAsistencia: 8, ingreso: "2024-05-10", coach: "Ana L.", hitos: ["Caída técnica", "Kong básico", "Balance avanzado", "Precision jump"], notas: "100% de asistencia este mes." },
  { id: 8, nombre: "Andrés Villanueva", edad: 33, categoria: "Adulto", plan: "Clase Prueba", costo: 0, status: "Prueba", nivel: "Básico", asistencia: 1, metaAsistencia: 1, ingreso: "2026-04-10", coach: "Marco A.", hitos: [], notas: "Primera clase. Seguimiento por WhatsApp." },
];

const coaches = [
  { id: 1, nombre: "Marco Alcántara", especialidad: ["Parkour", "Personalizado"], status: "Activo", grupos: ["Adultos Lun-Jue 7pm", "Adultos Sab 11am", "Personalizado"], certificaciones: [{ nombre: "ParkourEDU Level 2", vence: "2027-01-01" }, { nombre: "Primeros Auxilios", vence: "2026-09-01" }], alumnosActivos: 5, clasesEste_mes: 22, retencion: 91 },
  { id: 2, nombre: "Ana López", especialidad: ["Kids", "Teen", "Acrobacia"], status: "Activo", grupos: ["Kids Lun/Mar/Jue 4-5pm", "Kids Lun/Mar/Jue 5-6pm", "Teen"], certificaciones: [{ nombre: "ParkourEDU Level 1", vence: "2026-11-01" }, { nombre: "Pedagogía Deportiva Infantil", vence: "2028-03-01" }], alumnosActivos: 4, clasesEste_mes: 28, retencion: 95 },
];

const HITOS_TOTALES = ["Caída técnica", "Balance básico", "Salto de precisión", "Kong básico", "Wall run", "Balance avanzado", "Precision jump", "Gainer", "Doble kong"];

const statusColor = (s) => ({ "Activo": COLORS.success, "Inactivo": COLORS.danger, "Congelado": COLORS.warning, "Prueba": "#a855f7" }[s] || COLORS.muted);
const nivelColor = (n) => ({ "Básico": "#60a5fa", "Intermedio": COLORS.warning, "Avanzado": COLORS.accent }[n] || COLORS.muted);

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "18px 22px", flex: 1, minWidth: 140 }}>
      <div style={{ color: COLORS.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>{label}</div>
      <div style={{ color: color || COLORS.accent, fontSize: 32, fontWeight: 800, fontFamily: "monospace", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: COLORS.muted, fontSize: 12, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function AttendanceBar({ actual, meta }) {
  const pct = Math.min(100, Math.round((actual / meta) * 100));
  const color = pct >= 80 ? COLORS.success : pct >= 50 ? COLORS.warning : COLORS.danger;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, background: COLORS.border, borderRadius: 4, height: 6 }}>
        <div style={{ width: `${pct}%`, background: color, height: 6, borderRadius: 4, transition: "width 0.5s" }} />
      </div>
      <span style={{ color: COLORS.muted, fontSize: 11, whiteSpace: "nowrap" }}>{actual}/{meta}</span>
    </div>
  );
}

function Badge({ text, color }) {
  return (
    <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      {text}
    </span>
  );
}

function AlumnoRow({ a, onClick }) {
  return (
    <tr
      onClick={() => onClick(a)}
      style={{ borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer", transition: "background 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.background = COLORS.surface}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <td style={{ padding: "12px 16px" }}>
        <div style={{ color: COLORS.text, fontWeight: 600, fontSize: 14 }}>{a.nombre}</div>
        <div style={{ color: COLORS.muted, fontSize: 12 }}>{a.edad} años · {a.coach}</div>
      </td>
      <td style={{ padding: "12px 16px" }}><Badge text={a.categoria} color="#60a5fa" /></td>
      <td style={{ padding: "12px 16px" }}><Badge text={a.nivel} color={nivelColor(a.nivel)} /></td>
      <td style={{ padding: "12px 16px" }}><Badge text={a.status} color={statusColor(a.status)} /></td>
      <td style={{ padding: "12px 16px", minWidth: 140 }}><AttendanceBar actual={a.asistencia} meta={a.metaAsistencia} /></td>
      <td style={{ padding: "12px 16px", color: COLORS.muted, fontSize: 12 }}>{a.hitos.length}/{HITOS_TOTALES.length} hitos</td>
    </tr>
  );
}

function CoachRow({ c, onClick }) {
  const certVencePronto = c.certificaciones.some(cert => {
    const dias = (new Date(cert.vence) - new Date()) / 86400000;
    return dias < 120;
  });
  return (
    <tr
      onClick={() => onClick(c)}
      style={{ borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer", transition: "background 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.background = COLORS.surface}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <td style={{ padding: "12px 16px" }}>
        <div style={{ color: COLORS.text, fontWeight: 600, fontSize: 14 }}>{c.nombre}</div>
        {certVencePronto && <div style={{ color: COLORS.warning, fontSize: 11, marginTop: 2 }}>⚠ Cert. por vencer</div>}
      </td>
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {c.especialidad.map(e => <Badge key={e} text={e} color={COLORS.accent} />)}
        </div>
      </td>
      <td style={{ padding: "12px 16px" }}><Badge text={c.status} color={statusColor(c.status)} /></td>
      <td style={{ padding: "12px 16px", color: COLORS.text, fontWeight: 700 }}>{c.alumnosActivos}</td>
      <td style={{ padding: "12px 16px", color: COLORS.text }}>{c.clasesEste_mes} clases</td>
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: `conic-gradient(${COLORS.success} 0% ${c.retencion}%, ${COLORS.border} ${c.retencion}% 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: COLORS.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: COLORS.success, fontWeight: 700 }}>{c.retencion}%</div>
          </div>
          <span style={{ color: COLORS.muted, fontSize: 11 }}>retención</span>
        </div>
      </td>
    </tr>
  );
}

function AlumnoModal({ a, onClose }) {
  const pct = Math.round((a.asistencia / a.metaAsistencia) * 100);
  const mesesEnGym = Math.max(1, Math.round((new Date() - new Date(a.ingreso)) / (1000 * 60 * 60 * 24 * 30)));
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto", padding: 28 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ color: COLORS.text, fontWeight: 800, fontSize: 20 }}>{a.nombre}</div>
            <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 2 }}>{a.edad} años · {a.categoria} · Coach: {a.coach}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Badge text={a.status} color={statusColor(a.status)} />
            <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ background: COLORS.surface, borderRadius: 10, padding: "12px 16px", flex: 1, minWidth: 100 }}>
            <div style={{ color: COLORS.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>Asistencia</div>
            <div style={{ color: pct >= 80 ? COLORS.success : COLORS.warning, fontSize: 24, fontWeight: 800, fontFamily: "monospace" }}>{pct}%</div>
            <div style={{ color: COLORS.muted, fontSize: 11 }}>{a.asistencia}/{a.metaAsistencia} clases</div>
          </div>
          <div style={{ background: COLORS.surface, borderRadius: 10, padding: "12px 16px", flex: 1, minWidth: 100 }}>
            <div style={{ color: COLORS.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>En el gym</div>
            <div style={{ color: COLORS.accent, fontSize: 24, fontWeight: 800, fontFamily: "monospace" }}>{mesesEnGym}</div>
            <div style={{ color: COLORS.muted, fontSize: 11 }}>meses</div>
          </div>
          <div style={{ background: COLORS.surface, borderRadius: 10, padding: "12px 16px", flex: 1, minWidth: 100 }}>
            <div style={{ color: COLORS.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>Nivel</div>
            <div style={{ color: nivelColor(a.nivel), fontSize: 18, fontWeight: 800, marginTop: 2 }}>{a.nivel}</div>
            <div style={{ color: COLORS.muted, fontSize: 11 }}>${a.costo}/mes</div>
          </div>
        </div>

        {/* Hitos */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: COLORS.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Progresión técnica — {a.hitos.length}/{HITOS_TOTALES.length} hitos</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {HITOS_TOTALES.map(h => {
              const done = a.hitos.includes(h);
              return (
                <div key={h} style={{ display: "flex", alignItems: "center", gap: 10, opacity: done ? 1 : 0.35 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: done ? COLORS.accent : COLORS.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>
                    {done ? "✓" : "○"}
                  </div>
                  <span style={{ color: done ? COLORS.text : COLORS.muted, fontSize: 13 }}>{h}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notas */}
        {a.notas && (
          <div style={{ background: COLORS.surface, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ color: COLORS.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Notas del coach</div>
            <div style={{ color: COLORS.text, fontSize: 13, lineHeight: 1.6 }}>{a.notas}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function CoachModal({ c, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, width: "100%", maxWidth: 500, maxHeight: "85vh", overflowY: "auto", padding: 28 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ color: COLORS.text, fontWeight: 800, fontSize: 20 }}>{c.nombre}</div>
            <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 2 }}>Coach · {c.especialidad.join(", ")}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Badge text={c.status} color={statusColor(c.status)} />
            <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 20 }}>✕</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ background: COLORS.surface, borderRadius: 10, padding: "12px 16px", flex: 1 }}>
            <div style={{ color: COLORS.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>Alumnos activos</div>
            <div style={{ color: COLORS.accent, fontSize: 28, fontWeight: 800, fontFamily: "monospace" }}>{c.alumnosActivos}</div>
          </div>
          <div style={{ background: COLORS.surface, borderRadius: 10, padding: "12px 16px", flex: 1 }}>
            <div style={{ color: COLORS.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>Clases este mes</div>
            <div style={{ color: COLORS.text, fontSize: 28, fontWeight: 800, fontFamily: "monospace" }}>{c.clasesEste_mes}</div>
          </div>
          <div style={{ background: COLORS.surface, borderRadius: 10, padding: "12px 16px", flex: 1 }}>
            <div style={{ color: COLORS.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>Retención</div>
            <div style={{ color: COLORS.success, fontSize: 28, fontWeight: 800, fontFamily: "monospace" }}>{c.retencion}%</div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ color: COLORS.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Grupos asignados</div>
          {c.grupos.map(g => (
            <div key={g} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ color: COLORS.accent, fontSize: 12 }}>▸</span>
              <span style={{ color: COLORS.text, fontSize: 13 }}>{g}</span>
            </div>
          ))}
        </div>

        <div>
          <div style={{ color: COLORS.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Certificaciones</div>
          {c.certificaciones.map(cert => {
            const dias = Math.round((new Date(cert.vence) - new Date()) / 86400000);
            const alerta = dias < 120;
            return (
              <div key={cert.nombre} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: COLORS.surface, borderRadius: 8, marginBottom: 8 }}>
                <span style={{ color: COLORS.text, fontSize: 13 }}>{cert.nombre}</span>
                <span style={{ color: alerta ? COLORS.warning : COLORS.success, fontSize: 11, fontWeight: 600 }}>
                  {alerta ? `⚠ Vence en ${dias}d` : `✓ Vigente`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function WeApesDB() {
  const [tab, setTab] = useState("alumnos");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
  const [coachSeleccionado, setCoachSeleccionado] = useState(null);

  const alumnosFiltrados = alumnos.filter(a => {
    const matchStatus = filtroStatus === "Todos" || a.status === filtroStatus;
    const matchCat = filtroCategoria === "Todos" || a.categoria === filtroCategoria;
    const matchBusq = a.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return matchStatus && matchCat && matchBusq;
  });

  const activos = alumnos.filter(a => a.status === "Activo").length;
  const ingresoMes = alumnos.filter(a => a.status === "Activo").reduce((s, a) => s + a.costo, 0);
  const bajaAsist = alumnos.filter(a => a.status === "Activo" && (a.asistencia / a.metaAsistencia) < 0.5).length;

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", color: COLORS.text }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ background: COLORS.accent, color: "#000", fontWeight: 900, fontSize: 13, padding: "4px 10px", borderRadius: 6, letterSpacing: 2 }}>weAPES</div>
          <div style={{ color: COLORS.muted, fontSize: 13 }}>Panel interno</div>
        </div>
        <div style={{ color: COLORS.muted, fontSize: 12 }}>Monterrey, NL · {new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</div>
      </div>

      <div style={{ padding: "28px 28px 0" }}>
        {/* Stats */}
        <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
          <StatCard label="Alumnos activos" value={activos} sub={`de ${alumnos.length} registrados`} color={COLORS.accent} />
          <StatCard label="Ingreso estimado" value={`$${ingresoMes.toLocaleString()}`} sub="membresías activas" color={COLORS.success} />
          <StatCard label="Baja asistencia" value={bajaAsist} sub="requieren seguimiento" color={bajaAsist > 0 ? COLORS.danger : COLORS.success} />
          <StatCard label="Coaches activos" value={coaches.filter(c => c.status === "Activo").length} sub="certificados" color="#a855f7" />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
          {["alumnos", "coaches"].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? COLORS.accent : "transparent",
                color: tab === t ? "#000" : COLORS.muted,
                border: `1px solid ${tab === t ? COLORS.accent : COLORS.border}`,
                borderRadius: 8,
                padding: "8px 20px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13,
                textTransform: "capitalize",
                letterSpacing: 0.5,
                transition: "all 0.15s",
              }}
            >
              {t === "alumnos" ? `Alumnos (${alumnos.length})` : `Coaches (${coaches.length})`}
            </button>
          ))}
        </div>

        {/* Alumnos tab */}
        {tab === "alumnos" && (
          <>
            {/* Filtros */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <input
                placeholder="Buscar alumno..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 14px", color: COLORS.text, fontSize: 13, outline: "none", width: 200 }}
              />
              {["Todos", "Activo", "Inactivo", "Congelado", "Prueba"].map(s => (
                <button
                  key={s}
                  onClick={() => setFiltroStatus(s)}
                  style={{
                    background: filtroStatus === s ? COLORS.surface : "transparent",
                    border: `1px solid ${filtroStatus === s ? COLORS.accent : COLORS.border}`,
                    color: filtroStatus === s ? COLORS.accent : COLORS.muted,
                    borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600
                  }}
                >{s}</button>
              ))}
              <div style={{ width: 1, height: 24, background: COLORS.border }} />
              {["Todos", "Kids", "Teen", "Adulto"].map(c => (
                <button
                  key={c}
                  onClick={() => setFiltroCategoria(c)}
                  style={{
                    background: filtroCategoria === c ? COLORS.surface : "transparent",
                    border: `1px solid ${filtroCategoria === c ? "#60a5fa" : COLORS.border}`,
                    color: filtroCategoria === c ? "#60a5fa" : COLORS.muted,
                    borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600
                  }}
                >{c}</button>
              ))}
            </div>

            {/* Tabla */}
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 28 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    {["Alumno", "Categoría", "Nivel", "Status", "Asistencia", "Hitos"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "12px 16px", color: COLORS.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alumnosFiltrados.length === 0
                    ? <tr><td colSpan={6} style={{ padding: "28px 16px", textAlign: "center", color: COLORS.muted }}>Sin resultados</td></tr>
                    : alumnosFiltrados.map(a => <AlumnoRow key={a.id} a={a} onClick={setAlumnoSeleccionado} />)
                  }
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Coaches tab */}
        {tab === "coaches" && (
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 28 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  {["Coach", "Especialidad", "Status", "Alumnos", "Clases mes", "Retención"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 16px", color: COLORS.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coaches.map(c => <CoachRow key={c.id} c={c} onClick={setCoachSeleccionado} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {alumnoSeleccionado && <AlumnoModal a={alumnoSeleccionado} onClose={() => setAlumnoSeleccionado(null)} />}
      {coachSeleccionado && <CoachModal c={coachSeleccionado} onClose={() => setCoachSeleccionado(null)} />}
    </div>
  );
}
