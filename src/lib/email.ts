import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendClientPortalEmail({
  clientName,
  clientEmail,
  projectName,
  engineerName,
  portalUrl,
}: {
  clientName: string;
  clientEmail: string;
  projectName: string;
  engineerName: string;
  portalUrl: string;
}) {
  const { error } = await getResend().emails.send({
    from: "Furniche <noreply@teqniads.com>",
    to: clientEmail,
    subject: `Your project portal is ready — ${projectName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1f3a73;padding:32px;text-align:center;">
              <div style="width:48px;height:48px;background:rgba(255,255,255,0.15);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                <span style="color:white;font-size:24px;">🪑</span>
              </div>
              <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0;">Furniche</h1>
              <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0;">Engineer Project Documentation</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="color:#45403a;font-size:15px;margin:0 0 8px;">Hi ${clientName},</p>
              <p style="color:#45403a;font-size:15px;line-height:1.6;margin:0 0 24px;">
                <strong>${engineerName}</strong> has set up a live project portal for your furnishing project:
              </p>

              <!-- Project Name -->
              <div style="background:#f3f6fb;border:1px solid #c9d5eb;border-radius:12px;padding:16px;margin-bottom:24px;">
                <p style="color:#172d5c;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">Project</p>
                <p style="color:#122349;font-size:18px;font-weight:700;margin:0;">${projectName}</p>
              </div>

              <p style="color:#746c61;font-size:14px;line-height:1.6;margin:0 0 24px;">
                You can track progress, view photos, and leave comments directly from your portal — no account required.
              </p>

              <!-- CTA Button -->
              <div style="text-align:center;margin:0 0 24px;">
                <a href="${portalUrl}"
                   style="display:inline-block;background:#1f3a73;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:12px;">
                  View Your Project Portal →
                </a>
              </div>

              <!-- Security note -->
              <div style="background:#faf8f5;border-radius:10px;padding:14px;margin-bottom:24px;">
                <p style="color:#746c61;font-size:12px;margin:0;line-height:1.5;">
                  🔒 <strong>Secure link</strong> — This link is unique to you. Bookmark it for easy access. Your session stays active for 90 days.
                </p>
              </div>

              <p style="color:#998f82;font-size:13px;margin:0;">
                Or copy this link into your browser:<br>
                <span style="color:#1f3a73;word-break:break-all;">${portalUrl}</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#faf8f5;padding:20px 32px;border-top:1px solid #f3f0eb;">
              <p style="color:#998f82;font-size:12px;text-align:center;margin:0;">
                Powered by Furniche · Secure Project Documentation
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });

  if (error) throw error;
}

export async function sendCompanyInviteEmail({
  inviteEmail,
  inviterName,
  companyName,
  inviteUrl,
}: {
  inviteEmail: string;
  inviterName: string;
  companyName: string;
  inviteUrl: string;
}) {
  const { error } = await getResend().emails.send({
    from: "Furniche <noreply@teqniads.com>",
    to: inviteEmail,
    subject: `${inviterName} invited you to join ${companyName} on Furniche`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#1f3a73;padding:24px 32px;">
              <h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:0;">🪑 Furniche</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="color:#45403a;font-size:15px;margin:0 0 8px;">Hi,</p>
              <p style="color:#45403a;font-size:15px;line-height:1.6;margin:0 0 20px;">
                <strong>${inviterName}</strong> invited you to join <strong>${companyName}</strong>'s team on Furniche.
              </p>
              <div style="text-align:center;">
                <a href="${inviteUrl}"
                   style="display:inline-block;background:#1f3a73;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:10px;">
                  Accept Invite →
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#faf8f5;padding:16px 32px;border-top:1px solid #f3f0eb;">
              <p style="color:#998f82;font-size:12px;text-align:center;margin:0;">Powered by Furniche · Secure Project Documentation</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });

  if (error) throw error;
}

export async function sendNewCommentEmail({
  engineerEmail,
  engineerName,
  clientName,
  projectName,
  projectId,
  commentBody,
}: {
  engineerEmail: string;
  engineerName: string;
  clientName: string;
  projectName: string;
  projectId: string;
  commentBody: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const projectUrl = `${appUrl}/projects/${projectId}`;

  const { error } = await getResend().emails.send({
    from: "Furniche <noreply@teqniads.com>",
    to: engineerEmail,
    subject: `New comment from ${clientName} — ${projectName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#1f3a73;padding:24px 32px;">
              <h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:0;">🪑 Furniche</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="color:#45403a;font-size:15px;margin:0 0 8px;">Hi ${engineerName},</p>
              <p style="color:#45403a;font-size:15px;line-height:1.6;margin:0 0 20px;">
                Your client <strong>${clientName}</strong> left a comment on <strong>${projectName}</strong>:
              </p>
              <div style="background:#f3f0eb;border-left:4px solid #1f3a73;border-radius:8px;padding:16px;margin-bottom:24px;">
                <p style="color:#2e2a26;font-size:14px;line-height:1.6;margin:0;">"${commentBody}"</p>
              </div>
              <div style="text-align:center;">
                <a href="${projectUrl}"
                   style="display:inline-block;background:#1f3a73;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:10px;">
                  View Project →
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#faf8f5;padding:16px 32px;border-top:1px solid #f3f0eb;">
              <p style="color:#998f82;font-size:12px;text-align:center;margin:0;">Powered by Furniche · Secure Project Documentation</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });

  if (error) throw error;
}

export async function sendUpdatePublishedEmail({
  clientEmail,
  clientName,
  projectName,
  engineerName,
  updateTitle,
  portalUrl,
}: {
  clientEmail: string;
  clientName: string;
  projectName: string;
  engineerName: string;
  updateTitle: string;
  portalUrl: string;
}) {
  const { error } = await getResend().emails.send({
    from: "Furniche <noreply@teqniads.com>",
    to: clientEmail,
    subject: `New update on your project — ${projectName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#1f3a73;padding:24px 32px;">
              <h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:0;">🪑 Furniche</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="color:#45403a;font-size:15px;margin:0 0 8px;">Hi ${clientName},</p>
              <p style="color:#45403a;font-size:15px;line-height:1.6;margin:0 0 20px;">
                <strong>${engineerName}</strong> just posted a new update on your project:
              </p>
              <div style="background:#f3f6fb;border:1px solid #c9d5eb;border-radius:12px;padding:16px;margin-bottom:24px;">
                <p style="color:#172d5c;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">Project</p>
                <p style="color:#122349;font-size:17px;font-weight:700;margin:0 0 8px;">${projectName}</p>
                <p style="color:#172d5c;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">Update</p>
                <p style="color:#122349;font-size:15px;margin:0;">${updateTitle}</p>
              </div>
              <div style="text-align:center;">
                <a href="${portalUrl}"
                   style="display:inline-block;background:#1f3a73;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:10px;">
                  View Update →
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#faf8f5;padding:16px 32px;border-top:1px solid #f3f0eb;">
              <p style="color:#998f82;font-size:12px;text-align:center;margin:0;">Powered by Furniche · Secure Project Documentation</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });

  if (error) throw error;
}
