export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>sms-forwarder</h1>
      <p>Twilio inbound SMS → Slack channel forwarder.</p>
      <p>Endpoint: <code>/api/twilio/inbound-sms</code></p>
    </main>
  )
}
