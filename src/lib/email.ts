import nodemailer from "nodemailer";
import { Resend } from "resend";

type Sender = (args: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}) => Promise<void>;

let cachedSender: Sender | null = null;

function buildSender(): Sender {
  const resendKey = process.env["RESEND_API_KEY"];
  if (resendKey) {
    const resend = new Resend(resendKey);
    return async ({ from, to, subject, html, text }) => {
      const { error } = await resend.emails.send({ from, to, subject, html, text });
      if (error) throw new Error(`Resend send failed: ${error.message}`);
    };
  }

  const host = process.env["SMTP_HOST"];
  if (!host) {
    throw new Error("Email transport not configured: set RESEND_API_KEY or SMTP_HOST");
  }
  const port = Number(process.env["SMTP_PORT"] ?? 1025);
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
  return async (args) => {
    await transport.sendMail(args);
  };
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const from = process.env["EMAIL_FROM"] ?? process.env["SMTP_FROM"];
  if (!from) {
    throw new Error("EMAIL_FROM (or SMTP_FROM) is not set");
  }
  if (!cachedSender) cachedSender = buildSender();
  await cachedSender({ from, ...args });
}
