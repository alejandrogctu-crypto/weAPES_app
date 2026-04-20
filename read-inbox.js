import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { ImapFlow } from "imapflow";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dirname, ".env"), "utf8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const imap = new ImapFlow({
  host: "imap.hostinger.com",
  port: 993,
  secure: true,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  logger: false,
});

await imap.connect();
const lock = await imap.getMailboxLock("INBOX");

try {
  const since = new Date();
  since.setDate(since.getDate() - 14);

  const emails = [];
  for await (const msg of imap.fetch({ since }, { envelope: true, source: true })) {
    const from = msg.envelope?.from?.[0]?.address ?? "";
    const name = msg.envelope?.from?.[0]?.name ?? "";
    // Filtrar solo emails de Flavio
    if (!from.toLowerCase().includes("flavio") && !name.toLowerCase().includes("flavio")) continue;

    const raw = msg.source?.toString() ?? "";
    const body = raw.split(/\r?\n\r?\n/).slice(1).join("\n")
      .replace(/=\r?\n/g, "")
      .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "")
      .trim()
      .slice(0, 3000);

    emails.push({
      uid: msg.uid,
      from: `${name} <${from}>`,
      subject: msg.envelope?.subject ?? "(sin asunto)",
      date: msg.envelope?.date,
      body,
    });
  }

  if (emails.length === 0) {
    console.log("No se encontraron emails de Flavio en los últimos 14 días.");
  } else {
    for (const e of emails) {
      console.log("═".repeat(60));
      console.log(`De:      ${e.from}`);
      console.log(`Asunto:  ${e.subject}`);
      console.log(`Fecha:   ${e.date}`);
      console.log(`─`.repeat(60));
      console.log(e.body);
    }
  }
} finally {
  lock.release();
  await imap.logout();
}
