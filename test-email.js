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
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto">
    <div style="background:#1a1a2e;color:white;padding:20px 24px;border-radius:8px 8px 0 0">
      <div style="font-size:20px;font-weight:bold">🤖 weAPES Office Agent</div>
      <div style="opacity:.75;font-size:13px;margin-top:4px">Confirmación de sistema</div>
    </div>
    <div style="background:white;padding:24px;border:1px solid #ddd;border-radius:0 0 8px 8px;line-height:1.8;color:#333">
      <p>✅ El sistema de correos está <strong>funcionando correctamente</strong>.</p>
      <p>Funciones activas:</p>
      <ul>
        <li>📧 Minuta semanal — todos los viernes 6pm (hora Monterrey)</li>
        <li>📬 Inbox inteligente — polling IMAP cada 5 minutos</li>
        <li>🪑 Alertas de leads Woodspa — en tiempo real cuando el agente detecta un prospecto</li>
      </ul>
      <p style="color:#888;font-size:13px">Enviado desde: ${process.env.EMAIL_USER}<br>Destino: alejandrogctu@gmail.com<br>Fecha: ${new Date().toLocaleString("es-MX")}</p>
    </div>
  </div>
</body></html>`;

try {
  await mailer.sendMail({
    from: `"weAPES Admin" <${process.env.EMAIL_USER}>`,
    to: "alejandrogctu@gmail.com",
    subject: "✅ Sistema de correos activo — weAPES Office Agent",
    html,
    text: "El sistema de correos está funcionando correctamente.\n\nFunciones activas:\n- Minuta semanal (viernes 6pm)\n- Inbox inteligente (cada 5 min)\n- Alertas de leads Woodspa (tiempo real)",
  });
  console.log("✅ Correo enviado a alejandrogctu@gmail.com");
} catch (err) {
  console.error("❌ Error:", err.message);
}
