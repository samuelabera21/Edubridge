import nodemailer from "nodemailer";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const APP_URL = process.env.FRONTEND_URL || "http://localhost:3001";

function getSmtpTransporter() {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
            service: process.env.SMTP_SERVICE || "gmail",
            auth: {
                user: process.env.SMTP_USER,
                // Clean up any copied whitespace in the 16-character app password
                pass: process.env.SMTP_PASS.replace(/\s+/g, ""),
            },
        });
    }
    return null;
}

export interface InvitationEmailPayload {
    recipientName: string;
    recipientEmail: string;
    assignedRole: string;
    organizationName: string;
    organizationType: string;
    issuingAuthority: string;
    activationToken: string;
    expiryDays?: number;
}

/**
 * Sends a professional government-style invitation email to an assigned administrator.
 */
export async function sendAdminInvitationEmail(payload: InvitationEmailPayload): Promise<void> {
    const {
        recipientName,
        recipientEmail,
        assignedRole,
        organizationName,
        organizationType,
        issuingAuthority,
        activationToken,
        expiryDays = 7
    } = payload;

    const activationUrl = `${APP_URL}/activate?token=${activationToken}`;
    const currentYear = new Date().getFullYear();
    const expiryDate = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
    const sentDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Account Activation — EduBridge</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:4px;border:1px solid #dde3ea;overflow:hidden;max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#1a3a5c;padding:0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:20px 32px;border-bottom:3px solid #d4a017;">
                    <p style="margin:0;color:#d4a017;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">
                      Federal Democratic Republic of Ethiopia
                    </p>
                    <p style="margin:4px 0 0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.5px;">
                      Ministry of Education — EduBridge
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Classification Banner -->
          <tr>
            <td style="background-color:#eaf0f6;padding:10px 32px;border-bottom:1px solid #dde3ea;">
              <p style="margin:0;color:#1a3a5c;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">
                Official Communication · Administrative System Notification
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 28px;">
              <p style="margin:0 0 24px;color:#8a9ab0;font-size:12px;">
                Ref: EDB/ADMIN-INV/${currentYear} &nbsp;|&nbsp; ${sentDate}
              </p>

              <p style="margin:0 0 16px;color:#1a2533;font-size:15px;line-height:1.6;">
                Dear <strong>${recipientName}</strong>,
              </p>

              <p style="margin:0 0 16px;color:#3d4f62;font-size:15px;line-height:1.7;">
                On behalf of the <strong>${issuingAuthority}</strong>, you have been formally designated as the
                <strong>${assignedRole}</strong> for <strong>${organizationName}</strong>
                in the EduBridge Administrative Management System.
              </p>

              <p style="margin:0 0 28px;color:#3d4f62;font-size:15px;line-height:1.7;">
                To complete your account setup and gain access to the
                <strong>${organizationType} Administration Dashboard</strong>,
                you are required to activate your account and establish a secure password.
              </p>

              <!-- Assignment Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;border-left:4px solid #1a3a5c;border-radius:2px;margin-bottom:28px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 12px;color:#1a3a5c;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Assignment Details</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#8a9ab0;font-size:13px;padding:4px 0;min-width:150px;">Designated Role</td>
                        <td style="color:#1a2533;font-size:13px;font-weight:600;padding:4px 0;">${assignedRole}</td>
                      </tr>
                      <tr>
                        <td style="color:#8a9ab0;font-size:13px;padding:4px 0;">Administrative Unit</td>
                        <td style="color:#1a2533;font-size:13px;font-weight:600;padding:4px 0;">${organizationName}</td>
                      </tr>
                      <tr>
                        <td style="color:#8a9ab0;font-size:13px;padding:4px 0;">Issuing Authority</td>
                        <td style="color:#1a2533;font-size:13px;font-weight:600;padding:4px 0;">${issuingAuthority}</td>
                      </tr>
                      <tr>
                        <td style="color:#8a9ab0;font-size:13px;padding:4px 0;">Invitation Expires</td>
                        <td style="color:#c0392b;font-size:13px;font-weight:600;padding:4px 0;">${expiryDate}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td style="background-color:#1a3a5c;border-radius:3px;">
                    <a href="${activationUrl}"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.5px;">
                      Activate Account &amp; Set Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 4px;color:#8a9ab0;font-size:12px;">If the button does not work, copy and paste this link into your browser:</p>
              <p style="margin:0 0 28px;word-break:break-all;">
                <a href="${activationUrl}" style="color:#1a6bb5;font-size:12px;">${activationUrl}</a>
              </p>

              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff8e1;border:1px solid #f0c040;border-radius:2px;margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;color:#7a5c00;font-size:12px;line-height:1.6;">
                      <strong>Security Notice:</strong> This invitation is strictly personal and must not be shared or forwarded.
                      If you did not expect this communication or believe it was sent in error,
                      please contact the Federal Education Bureau immediately.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 4px;color:#3d4f62;font-size:14px;">Sincerely,</p>
              <p style="margin:0;color:#1a2533;font-size:14px;font-weight:600;">${issuingAuthority}</p>
              <p style="margin:2px 0 0;color:#8a9ab0;font-size:13px;">via EduBridge Administrative System</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f0f4f8;border-top:1px solid #dde3ea;padding:18px 32px;">
              <p style="margin:0;color:#8a9ab0;font-size:11px;line-height:1.6;text-align:center;">
                This is an official automated notification from EduBridge — Ethiopian Education Administration System.<br />
                Do not reply to this email. For support, contact your system administrator.<br />
                &copy; ${currentYear} Federal Ministry of Education, Federal Democratic Republic of Ethiopia.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    console.log(`\n======================================================`);
    console.log(`✉️  ADMIN INVITATION LINK GENERATED:`);
    console.log(`👤 Recipient : ${recipientName} (${recipientEmail})`);
    console.log(`🏛️  Role/Org  : ${assignedRole} - ${organizationName} (${issuingAuthority})`);
    console.log(`🔗 Link      : ${activationUrl}`);
    console.log(`======================================================\n`);

    const transporter = getSmtpTransporter();
    const fromAddress = process.env.EMAIL_FROM || (process.env.SMTP_USER ? `EduBridge <${process.env.SMTP_USER}>` : "EduBridge <onboarding@resend.dev>");
    const subject = `Account Activation — ${assignedRole}, ${organizationName} | EduBridge`;

    if (transporter) {
        try {
            console.log(`[EmailService] Sending invitation via Gmail SMTP (${process.env.SMTP_USER}) to ${recipientEmail}...`);
            await transporter.sendMail({
                from: fromAddress,
                to: recipientEmail,
                subject,
                html,
            });
            console.log(`[EmailService] Invitation email successfully dispatched via SMTP to ${recipientEmail} for ${organizationName}`);
            return;
        } catch (smtpError: any) {
            console.error("[EmailService] Failed to send invitation email via SMTP:", smtpError);
            throw new Error(`Failed to send invitation email via SMTP: ${smtpError.message}`);
        }
    }

    // Fallback to Resend if SMTP is not configured
    if (!resend) {
        console.warn(`[EmailService] Neither SMTP nor RESEND_API_KEY is configured. Skipping email dispatch to ${recipientEmail}.`);
        return;
    }

    console.log(`[EmailService] Sending invitation via Resend to ${recipientEmail}...`);
    const { error } = await resend.emails.send({
        from: fromAddress,
        to: recipientEmail,
        subject,
        html,
    });

    if (error) {
        console.error("[EmailService] Failed to send invitation email via Resend:", error);
        throw new Error(`Failed to send invitation email: ${error.message}`);
    }

    console.log(`[EmailService] Invitation email successfully dispatched via Resend to ${recipientEmail} for ${organizationName}`);
}
