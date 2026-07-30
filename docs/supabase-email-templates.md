# Supabase Auth email templates

Supabase Auth owns signup-confirmation delivery. Marketra application code supplies the recipient
metadata and callback URL, but it must not attempt to change hosted templates.

## Confirm Signup

Exact subject:

```text
Confirm your Marketra account
```

Production HTML:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Confirm your Marketra account</title>
  </head>
  <body style="margin:0;background:#f5f6f8;color:#18181b;font-family:Arial,sans-serif;">
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      style="background:#f5f6f8;"
    >
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            style="max-width:560px;background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;"
          >
            <tr>
              <td style="padding:32px 32px 12px;">
                <img
                  src="https://marketra-psi.vercel.app/brand/marketra-email-logo.png"
                  width="180"
                  alt="Marketra"
                  style="display:block;width:180px;max-width:100%;height:auto;border:0;"
                />
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 32px;">
                <h1 style="margin:0 0 16px;font-size:26px;line-height:34px;color:#18181b;">
                  Confirm your email
                </h1>
                <p style="margin:0 0 16px;font-size:16px;line-height:25px;color:#52525b;">
                  Hello {{ if .Data.display_name }}{{ .Data.display_name }}{{ else }}there{{ end }},
                </p>
                <p style="margin:0 0 24px;font-size:16px;line-height:25px;color:#52525b;">
                  Confirm your email address to finish creating your Marketra account.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="border-radius:8px;background:#18181b;">
                      <a
                        href="{{ .ConfirmationURL }}"
                        style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;"
                      >
                        Confirm email
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 8px;font-size:13px;line-height:21px;color:#71717a;">
                  If the button does not work, copy and paste this link into your browser:
                </p>
                <p style="margin:0;word-break:break-all;font-size:13px;line-height:21px;">
                  <a href="{{ .ConfirmationURL }}" style="color:#2563eb;">{{ .ConfirmationURL }}</a>
                </p>
                <p style="margin:24px 0 0;font-size:13px;line-height:21px;color:#71717a;">
                  If you did not request this account, you can ignore this email. Need help? Contact
                  <a href="mailto:hello@getmarketra.com" style="color:#2563eb;"
                    >hello@getmarketra.com</a
                  >.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

The visible `{{ .ConfirmationURL }}` URL is the plain fallback link. The template contains no
tracking pixels, analytics, remote fonts, marketing content, or embedded data. The only remote
asset is the first-party Marketra logo.

## Dashboard configuration

In Supabase Dashboard:

1. Open **Authentication → Email Templates → Confirm signup**.
2. Set the subject and HTML exactly as shown above.
3. Configure the production Site URL and allow
   `https://marketra-psi.vercel.app/auth/callback` as a redirect URL.
4. Send a test signup to an operator-controlled inbox and verify desktop, mobile, spam-folder,
   confirmation, reused-link, expired-link, and resend-rate-limit behavior.

If the production application domain changes, update both the allowed redirect and hosted logo URL.
Template changes are operator-controlled and are not deployed by this repository.
