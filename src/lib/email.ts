import nodemailer from "nodemailer";

let cachedTransport: nodemailer.Transporter | null = null;

function transport() {
  if (cachedTransport) return cachedTransport;
  const host = process.env["SMTP_HOST"];
  if (!host) {
    throw new Error("SMTP_HOST is not set");
  }
  const port = Number(process.env["SMTP_PORT"] ?? 1025);
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];
  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
  return cachedTransport;
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const from = process.env["SMTP_FROM"];
  if (!from) {
    throw new Error("SMTP_FROM is not set");
  }
  await transport().sendMail({
    from,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
  });
}
