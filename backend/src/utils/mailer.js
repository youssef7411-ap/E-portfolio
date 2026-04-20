import nodemailer from 'nodemailer';

const hasValue = (value) => String(value ?? '').trim().length > 0;

export const getMailerStatus = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  return {
    configured: hasValue(host) && hasValue(user) && hasValue(pass),
    host: hasValue(host) ? String(host).trim() : '',
  };
};

let transport;

const getTransport = () => {
  const status = getMailerStatus();
  if (!status.configured) {
    throw new Error('SMTP is not configured. Add SMTP_HOST, SMTP_USER, and SMTP_PASS in backend/.env.');
  }

  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;

    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transport;
};

export const sendAppEmail = async ({
  to,
  subject,
  text,
  fromEmail,
  fromName,
  replyTo,
  notificationEmail,
}) => {
  const transporter = getTransport();
  const senderAddress = String(fromEmail || process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();

  if (!senderAddress) {
    throw new Error('Sender email is not configured. Add a sender email in Emailing settings or set SMTP_FROM.');
  }

  const senderLabel = String(fromName || 'E-Portfolio').trim();
  const bcc = String(notificationEmail || '').trim();

  const info = await transporter.sendMail({
    from: senderLabel ? `"${senderLabel.replace(/"/g, '')}" <${senderAddress}>` : senderAddress,
    to,
    subject,
    text,
    replyTo: replyTo || undefined,
    bcc: bcc || undefined,
  });

  return info;
};
