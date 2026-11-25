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

const KOFI_URL = 'https://ko-fi.com/matthews26633';

const BTN = 'background:#78c0e0;color:#1a1d2e;padding:0.5rem 1.2rem;border-radius:6px;text-decoration:none;font-family:sans-serif;font-weight:600';

// Sent when a supporter is recorded in the admin panel. The AI Dungeon Master is
// tip-supported now, so this is a thank-you — it no longer states a price or
// promises access until a date.
export async function sendMembershipConfirmation({ email, displayName }) {
  if (!transporter) return;

  await transporter.sendMail({
    from: `"PB & Jay" <${GMAIL_USER}>`,
    to: email,
    subject: 'Thanks for supporting PB & Jay',
    text: [
      `Hi ${displayName},`,
      '',
      'Thank you for supporting PB & Jay! Your support helps cover hosting and AI costs and lets me keep building new games.',
      '',
      `Play now: ${APP_URL}/pbj`,
    ].join('\n'),
    html: `
      <p style="font-family:sans-serif;color:#333">Hi ${displayName},</p>
      <p style="font-family:sans-serif;color:#333">
        Thank you for supporting <strong>PB &amp; Jay</strong>! Your support helps cover hosting and AI costs
        and lets me keep building new games.
      </p>
      <p style="margin-top:1.5rem">
        <a href="${APP_URL}/pbj" style="${BTN}">Play now →</a>
      </p>
    `,
  });
}

// Kept for the existing expiry check. Wording no longer implies access will be
// cut off: the AI Dungeon Master is open and supported by optional tips.
export async function sendMembershipExpiringReminder({ email, displayName }) {
  if (!transporter) return;

  await transporter.sendMail({
    from: `"PB & Jay" <${GMAIL_USER}>`,
    to: email,
    subject: 'A note from PB & Jay',
    text: [
      `Hi ${displayName},`,
      '',
      'Thanks again for supporting PB & Jay. The AI Dungeon Master is now open to everyone and runs on optional tips, so there is nothing you need to renew.',
      '',
      `If you would like to keep supporting the lab, you can do it on Ko-fi: ${KOFI_URL}`,
      '',
      `${APP_URL}/pbj`,
    ].join('\n'),
    html: `
      <p style="font-family:sans-serif;color:#333">Hi ${displayName},</p>
      <p style="font-family:sans-serif;color:#333">
        Thanks again for supporting PB &amp; Jay. The AI Dungeon Master is now open to everyone and runs on
        optional tips, so there is nothing you need to renew.
      </p>
      <p style="font-family:sans-serif;color:#333">
        If you would like to keep supporting the lab, you can do it on <a href="${KOFI_URL}">Ko-fi</a>.
      </p>
      <p style="margin-top:1.5rem">
        <a href="${APP_URL}/pbj" style="${BTN}">Go to PB &amp; Jay →</a>
      </p>
    `,
  });
}

export async function sendPasswordResetEmail({ email, displayName, resetUrl }) {
  if (!transporter) return;

  await transporter.sendMail({
    from: `"PB & Jay" <${GMAIL_USER}>`,
    to: email,
    subject: 'Reset your PB & Jay password',
    text: [
      `Hi ${displayName},`,
      '',
      'Someone (hopefully you) requested a password reset for your PB & Jay account.',
      '',
      `Reset your password: ${resetUrl}`,
      '',
      'This link expires in 1 hour. If you didn’t request this, you can ignore this email.',
    ].join('\n'),
    html: `
      <p style="font-family:sans-serif;color:#333">Hi ${displayName},</p>
      <p style="font-family:sans-serif;color:#333">
        Someone (hopefully you) requested a password reset for your PB & Jay account.
      </p>
      <p style="margin-top:1.5rem">
        <a href="${resetUrl}" style="background:#78c0e0;color:#1a1d2e;padding:0.5rem 1.2rem;border-radius:6px;text-decoration:none;font-family:sans-serif;font-weight:600">Reset password →</a>
      </p>
      <p style="font-family:sans-serif;color:#888;font-size:0.85rem;margin-top:1.5rem">
        This link expires in 1 hour. If you didn't request this, you can ignore this email.
      </p>
    `,
  });
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
