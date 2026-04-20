import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dirname, ".env"), "utf8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const mailer = nodemailer.createTransport({
  host: "smtp.hostinger.com", port: 465, secure: true,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const fecha = new Date().toLocaleDateString("es-MX", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
});

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#f5f5f5;font-family:Arial,sans-serif">
<div style="max-width:620px;margin:0 auto">

  <div style="background:#1a1a2e;color:white;padding:20px 24px;border-radius:8px 8px 0 0">
    <div style="font-size:20px;font-weight:bold">🏃 weAPES Parkour Center</div>
    <div style="opacity:.75;font-size:13px;margin-top:4px">Minuta de Pendientes — Semana 4 · Abril 2026</div>
  </div>

  <div style="background:white;padding:24px;border:1px solid #ddd;border-radius:0 0 8px 8px;color:#333;line-height:1.7">
    <p style="color:#888;font-size:13px;margin-top:0">${fecha}</p>
    <p>Esta minuta resume los pendientes críticos al cierre de la Semana 3. Se requiere atención inmediata en los puntos marcados <strong>antes del 30 de abril</strong>.</p>

    <h3 style="background:#fff3cd;padding:10px 14px;border-radius:6px;color:#856404;margin:20px 0 10px">
      🔴 Urgentes — antes del 30 de abril
    </h3>

    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="background:#1a1a2e;color:white">
          <th style="padding:8px 12px;text-align:left">Tarea</th>
          <th style="padding:8px 12px;text-align:left">Responsable</th>
          <th style="padding:8px 12px;text-align:left">Detalle</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background:#fff5f5">
          <td style="padding:8px 12px;border-bottom:1px solid #eee"><strong>Liquidar a Adrián Pantoja</strong></td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">Flavio / Pinky</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">Se le deben <strong>$12,560</strong> (nómina dic–abr + Easter Camp + Consejo Técnico). Último día: 30 abril.</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee"><strong>Cobro David Ramón Rodríguez</strong></td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">Jesús</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">Deuda acumulada: <strong>$6,233</strong> (8 meses). Mayor deuda individual de clientes.</td>
        </tr>
        <tr style="background:#fff5f5">
          <td style="padding:8px 12px;border-bottom:1px solid #eee"><strong>Entrega buzón QR / quejas</strong></td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">Adrián → Jesús</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">Adrián debe entregarlo antes de su baja. Si no se completa, Jesús lo retoma.</td>
        </tr>
      </tbody>
    </table>

    <h3 style="background:#e8f4f8;padding:10px 14px;border-radius:6px;color:#0c5460;margin:24px 0 10px">
      🟡 Esta semana
    </h3>

    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="background:#1a1a2e;color:white">
          <th style="padding:8px 12px;text-align:left">Tarea</th>
          <th style="padding:8px 12px;text-align:left">Responsable</th>
          <th style="padding:8px 12px;text-align:left">Detalle</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee"><strong>Confirmar renta actual exacta</strong></td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">Flavio</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">Variable crítica para decidir cambio de local en junio (checkpoint: 15 mayo).</td>
        </tr>
        <tr style="background:#f9f9f9">
          <td style="padding:8px 12px;border-bottom:1px solid #eee"><strong>Activar template Fiestas Infantiles</strong></td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">Jesús</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">Confirmar que el template de cotización está en uso. Meta: cerrar al menos 1 fiesta antes del 30 abril.</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee"><strong>Cobro general — deuda clientes $11,442</strong></td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">Jesús</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">Ver tabla detallada abajo. Prioridad: David Rodríguez ($6,233).</td>
        </tr>
        <tr style="background:#f9f9f9">
          <td style="padding:8px 12px;border-bottom:1px solid #eee"><strong>MercadoPago — activación</strong></td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">Flavio</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">Pendiente de configuración. Priorizar sobre Clip (2.9% vs 3.5% comisión).</td>
        </tr>
        <tr>
          <td style="padding:8px 12px"><strong>Constitución cooperativa</strong></td>
          <td style="padding:8px 12px">Jesús + Berenice</td>
          <td style="padding:8px 12px">Acta al 90% — cerrar en abril para no perder ventana fondos INDE/CONADE 2026.</td>
        </tr>
      </tbody>
    </table>

    <h3 style="margin:24px 0 10px;color:#1a1a2e">📋 Deuda clientes — detalle</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#f0f0f0">
          <th style="padding:6px 10px;text-align:left">Cliente</th>
          <th style="padding:6px 10px;text-align:left">Categoría</th>
          <th style="padding:6px 10px;text-align:right">Monto</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">David Ramón Rodríguez</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">Niños</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;color:#c00;font-weight:bold">$6,233</td>
        </tr>
        <tr style="background:#f9f9f9">
          <td style="padding:6px 10px;border-bottom:1px solid #eee">Roberto Elian Gómez Ramos</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">Niños</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">$1,650</td>
        </tr>
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">Daniel Abdias Reyes Estrada</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">Adultos</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">$1,475</td>
        </tr>
        <tr style="background:#f9f9f9">
          <td style="padding:6px 10px;border-bottom:1px solid #eee">Humberto Javier de la Rosa</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">Adultos</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">$1,100</td>
        </tr>
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">Alejandra Estefanía Garza</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">Adultos</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">$983</td>
        </tr>
        <tr style="background:#f0f0f0;font-weight:bold">
          <td style="padding:6px 10px" colspan="2">TOTAL</td>
          <td style="padding:6px 10px;text-align:right;color:#c00">$11,442</td>
        </tr>
      </tbody>
    </table>

    <h3 style="margin:24px 0 10px;color:#1a1a2e">💼 Tabla de compensaciones — Jesús (en negociación)</h3>
    <p style="font-size:13px;color:#555;margin:0 0 12px">Salario base: <strong>$5,520/mes</strong> · 23 hrs/semana · $60/hr · Lun–Jue 3:30–8:15pm + Vie 3:30–6:15pm</p>

    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#1a1a2e;color:white">
          <th style="padding:8px 12px;text-align:left">Concepto</th>
          <th style="padding:8px 12px;text-align:center">Propuesta Flavio</th>
          <th style="padding:8px 12px;text-align:center">Contrapropuesta Jesús</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background:#f9f9f9">
          <td style="padding:8px 12px;border-bottom:1px solid #eee">Bono cumplimiento 1</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">Recepción +15% ($828/mes)</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">Administración +10% ($552/mes)</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">Bono cumplimiento 2</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">Limpieza +15% ($828/mes)</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">Atención al cliente +10% ($552/mes)</td>
        </tr>
        <tr style="background:#f9f9f9">
          <td style="padding:8px 12px;border-bottom:1px solid #eee">Umbral ventas nivel 1</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">> $45,000 → +20%</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">> $78,000 → +25%</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">Umbral ventas nivel 2</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">> $55,000 → +20%</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">> $90,000 → +35%</td>
        </tr>
        <tr style="background:#f9f9f9">
          <td style="padding:8px 12px;border-bottom:1px solid #eee">Umbral ventas nivel 3</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">> $68,000 → +30%</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">> $110,000 → +45%</td>
        </tr>
        <tr style="background:#e8f4f8;font-weight:bold">
          <td style="padding:8px 12px">Techo salarial total</td>
          <td style="padding:8px 12px;text-align:center">$11,040/mes</td>
          <td style="padding:8px 12px;text-align:center;color:#2a7a3b">$12,420/mes</td>
        </tr>
      </tbody>
    </table>
    <p style="font-size:12px;color:#888;margin-top:8px">⚠️ Pendiente de resolución por Pinky. Los umbrales de la contrapropuesta de Jesús son 14–62% más altos, lo que reduce el riesgo para el gym.</p>

    <p style="margin-top:24px;font-size:12px;color:#aaa;border-top:1px solid #eee;padding-top:12px">
      Generado por weAPES Office Agent · ${fecha}<br>
      Fuente: Deuda Revision.xlsx (recibido 16 abril 2026)
    </p>
  </div>
</div>
</body></html>`;

const destinatarios = [
  { name: "Jesús",  email: "jes.escareno@gmail.com" },
  { name: "Flavio", email: "flaviopadilla9@gmail.com" },
];

for (const d of destinatarios) {
  await mailer.sendMail({
    from: `"weAPES Admin" <${process.env.EMAIL_USER}>`,
    to: d.email,
    bcc: "alejandrogctu@gmail.com",
    subject: "weAPES — Pendientes Semana 4 Abril 2026",
    html,
    text: `Pendientes weAPES — Semana 4 Abril 2026\n\n🔴 URGENTE antes del 30 abril:\n- Liquidar Adrián Pantoja: $12,560 (Flavio/Pinky)\n- Cobro David Rodríguez: $6,233 (Jesús)\n- Entrega buzón QR (Adrián → Jesús)\n\n🟡 Esta semana:\n- Confirmar renta actual (Flavio)\n- Activar template Fiestas Infantiles (Jesús)\n- Cobro clientes $11,442 (Jesús)\n- MercadoPago configuración (Flavio)\n- Constitución cooperativa (Jesús + Berenice)`,
  });
  console.log(`✅ Enviado a ${d.name} <${d.email}> (BCC: Pinky)`);
}
