import { NextResponse } from 'next/server'
import { validateRequest } from 'twilio'

function mustEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

function firstUrl(text: string) {
  const m = text.match(/https?:\/\/\S+/i)
  return m ? m[0] : null
}

function redactSecrets(s: string) {
  // avoid logging full webhook URLs etc.
  if (!s) return s
  return s.replace(/https:\/\/hooks\.slack\.com\/services\/[^\s]+/g, 'https://hooks.slack.com/services/REDACTED')
}

async function postToSlack(webhookUrl: string, payload: any) {
  const r = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const text = await r.text().catch(() => '')
  if (!r.ok) {
    throw new Error(`Slack webhook failed: ${r.status} ${redactSecrets(text)}`)
  }
}

export async function POST(req: Request) {
  try {
    const slackWebhookUrl = mustEnv('SLACK_WEBHOOK_URL')
    const twilioAuthToken = mustEnv('TWILIO_AUTH_TOKEN')

    // Twilio sends application/x-www-form-urlencoded by default.
    const form = await req.formData()
    const body: Record<string, string> = {}
    for (const [k, v] of form.entries()) body[k] = String(v)

    const from = body.From || ''
    const to = body.To || ''
    const text = body.Body || ''
    const sid = body.MessageSid || ''

    // Validate Twilio signature (prevents random spam into Slack).
    // Requires your Vercel URL to be configured in Twilio exactly (including path).
    const signature = req.headers.get('x-twilio-signature') || ''

    // IMPORTANT: Twilio signature validation depends on the *exact* URL Twilio requested.
    // On Vercel, `req.url` may reflect an internal hostname. Reconstruct from forwarded headers.
    const u = new URL(req.url)
    const proto = req.headers.get('x-forwarded-proto') || u.protocol.replace(':', '') || 'https'
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || u.host
    const publicUrl = `${proto}://${host}${u.pathname}${u.search}`

    const ok = validateRequest(twilioAuthToken, signature, publicUrl, body)
    if (!ok) {
      // Log enough to debug signature mismatches (no secrets).
      console.warn('twilio_signature_invalid', {
        reqUrl: req.url,
        publicUrl,
        host: req.headers.get('host'),
        xfHost: req.headers.get('x-forwarded-host'),
        xfProto: req.headers.get('x-forwarded-proto'),
        hasSig: Boolean(signature),
        sid,
        from,
        to,
      })
      return NextResponse.json({ ok: false, error: 'Invalid Twilio signature' }, { status: 401 })
    }

    const extracted = firstUrl(text)
    const lines = [
      '*Inbound SMS*',
      from ? `*From:* \`${from}\`` : null,
      to ? `*To:* \`${to}\`` : null,
      sid ? `*Sid:* \`${sid}\`` : null,
      '',
      text || '(empty body)',
      extracted ? `\n*Link:* ${extracted}` : null,
    ].filter(Boolean)

    await postToSlack(slackWebhookUrl, {
      text: lines.join('\n'),
      unfurl_links: false,
      unfurl_media: false,
    })

    // Twilio is happy with any 2xx; return JSON for debuggability.
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}

// Optional: quick health check
export async function GET() {
  return NextResponse.json({ ok: true, name: 'sms-forwarder' })
}
