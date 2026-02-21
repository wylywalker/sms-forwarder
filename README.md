# sms-forwarder

Twilio inbound SMS → Slack channel forwarder (Vercel/Next.js).

## Endpoint
- `POST /api/twilio/inbound-sms`

Twilio should be configured to send **Incoming Messages** to this URL.

## Environment variables
Set these in Vercel (Project → Settings → Environment Variables):
- `SLACK_WEBHOOK_URL` – Slack Incoming Webhook URL (secret)
- `TWILIO_AUTH_TOKEN` – from Twilio Console (secret)

## Slack setup
Create a Slack Incoming Webhook for the channel you want.

## Twilio setup
Twilio Console → Phone Numbers → (your number) → Messaging:
- A message comes in: **Webhook**
- URL: `https://<your-domain>/api/twilio/inbound-sms`
- Method: **POST**

## Local dev
```bash
npm install
export SLACK_WEBHOOK_URL='...'
export TWILIO_AUTH_TOKEN='...'
npm run dev
```

### Testing
Twilio signature validation requires the public URL to match what Twilio calls.
Easiest: deploy to Vercel first, then test by texting the number.

## Notes
- This MVP extracts the first URL in the SMS and includes it as a separate line.
- Link-unshortening can be added later.
