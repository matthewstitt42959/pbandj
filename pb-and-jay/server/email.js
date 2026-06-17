import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

function createTransport() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
}

const transporter = createTransport();

export function isEmailEnabled() {
  return !!transporter;
}

export async function sendDmPostNotification({ campaignName, dmName, postContent, playerEmails }) {
  if (!transporter || playerEmails.length === 0) return;

  const snippet = postContent.length > 300
    ? postContent.slice(0, 297) + '…'
    : postContent;

  await transporter.sendMail({
    from: `"PB & Jay" <${GMAIL_USER}>`,
    bcc: playerEmails,
    subject: `[${campaignName}] The DM has posted`,
    text: [
      `${dmName} just posted in ${campaignName}:`,
      '',
      snippet,
      '',
      `Jump in: ${APP_URL}/game`,
    ].join('\n'),
    html: `
      <p style="font-family:sans-serif;color:#333">
        <strong>${dmName}</strong> just posted in <strong>${campaignName}</strong>:
      </p>
      <blockquote style="border-left:3px solid #78c0e0;margin:0;padding:0.5rem 1rem;color:#555;font-family:serif;white-space:pre-wrap">${snippet}</blockquote>
      <p style="margin-top:1.5rem">
        <a href="${APP_URL}/game" style="background:#78c0e0;color:#1a1d2e;padding:0.5rem 1.2rem;border-radius:6px;text-decoration:none;font-family:sans-serif;font-weight:600">Jump in →</a>
      </p>
    `,
  });
}
