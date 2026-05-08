interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

interface CfEmailBinding {
  send: (opts: {
    to: string;
    from: string;
    subject: string;
    html?: string;
    text?: string;
  }) => Promise<void>;
}

function getEmailBinding(): CfEmailBinding | undefined {
  const platformEnv = (globalThis as Record<string, unknown>).__env__ as
    | Record<string, unknown>
    | undefined;
  return platformEnv?.EMAIL as CfEmailBinding | undefined;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  const emailBinding = getEmailBinding();
  const envExists = !!((globalThis as Record<string, unknown>).__env__);
  console.log(
    `[email] to=${to} subject="${subject}" binding=${!!emailBinding} __env__=${envExists}`,
  );

  if (emailBinding) {
    try {
      await emailBinding.send({
        to,
        from: "support@batchlyai.com",
        subject,
        html,
      });
      console.log(`[email] CF Email sent successfully to ${to}`);
      return true;
    } catch (err) {
      console.error("[email] Cloudflare Email Service error:", err);
      // Fall through to MailChannels
    }
  } else {
    console.warn("[email] No EMAIL binding, will try MailChannels fallback");
  }

  // Fallback: MailChannels HTTP API
  try {
    const resp = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: {
          email: "support@batchlyai.com",
          name: "BatchlyAI",
        },
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    });

    if (!resp.ok) {
      console.error("[email] MailChannels error:", resp.status, await resp.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] MailChannels error:", err);
    return false;
  }
}
