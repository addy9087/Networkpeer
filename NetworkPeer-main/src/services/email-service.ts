import { config } from "../config.js";

export interface SendOtpEmailParams {
  to: string;
  code: string;
  clientIp?: string;
  role?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
}

export class EmailService {
  private formatHtml(code: string, ip?: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NetworkPeers Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#0B0F17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F3F4F6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0B0F17;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background-color:#111827;border:1px solid #1F2937;border-radius:24px;padding:40px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <div style="background-color:#F9C933;color:#111827;display:inline-block;padding:8px 18px;border-radius:12px;font-weight:800;font-size:16px;letter-spacing:1px;text-transform:uppercase;">
                NetworkPeer
              </div>
            </td>
          </tr>
          <!-- Title -->
          <tr>
            <td align="center" style="padding-bottom:12px;">
              <h1 style="margin:0;color:#FFFFFF;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Verification Code</h1>
            </td>
          </tr>
          <!-- Subtitle -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <p style="margin:0;color:#9CA3AF;font-size:14px;line-height:1.6;">
                Use the one-time password below to complete your passwordless login to the NetworkPeers marketplace.
              </p>
            </td>
          </tr>
          <!-- Code Box -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="background-color:#1F2937;border:2px solid #F9C933;border-radius:16px;padding:20px 36px;display:inline-block;">
                <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace;color:#F9C933;font-size:36px;font-weight:800;letter-spacing:10px;text-align:center;">
                  ${code}
                </span>
              </div>
            </td>
          </tr>
          <!-- Security Notice -->
          <tr>
            <td style="background-color:#182234;border:1px solid #27354A;border-radius:12px;padding:16px;margin-bottom:24px;">
              <p style="margin:0;color:#93C5FD;font-size:12px;line-height:1.5;">
                ⏱ <strong>Expires in 10 minutes.</strong><br>
                🔒 For your security, never forward or share this code. NetworkPeers administrators will never ask for your verification code.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:32px;border-top:1px solid #1F2937;">
              <p style="margin:0;color:#6B7280;font-size:11px;line-height:1.5;">
                Requested${ip ? ` from IP ${ip}` : ""} on ${new Date().toUTCString()}.<br>
                NetworkPeers Physical Field Operations & Verification Infrastructure.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async sendOtpEmail(params: SendOtpEmailParams): Promise<EmailSendResult> {
    const { to, code, clientIp } = params;
    const provider = config.EMAIL_PROVIDER;

    // Resend Delivery (Mass Scale Production)
    if (provider === "resend" || (config.RESEND_API_KEY && provider !== "log")) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: config.EMAIL_FROM,
            to: [to],
            subject: `${code} is your NetworkPeers verification code`,
            html: this.formatHtml(code, clientIp),
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          console.error("[EmailService] Resend API error:", response.status, errBody);
          return { success: false, provider: "resend", error: `Resend HTTP ${response.status}: ${errBody}` };
        }

        const data = (await response.json()) as { id?: string };
        console.log(`[EmailService] OTP email dispatched via Resend to ${to} (Message ID: ${data.id})`);
        return { success: true, messageId: data.id, provider: "resend" };
      } catch (err) {
        console.error("[EmailService] Resend dispatch failure:", err);
        return { success: false, provider: "resend", error: String(err) };
      }
    }

    // Default / Log Provider (Development / Staging Simulation)
    console.log(`\n========================================================\n[EmailService:SIMULATED] OTP EMAIL DISPATCH\nTo: ${to}\nSubject: ${code} is your NetworkPeers verification code\nCode: ${code}\nExpires: 10 minutes\n========================================================\n`);
    return {
      success: true,
      provider: "log",
      messageId: `sim_${Date.now()}`,
    };
  }
}

export const emailService = new EmailService();
