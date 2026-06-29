import { requestLoginCode, verifyLoginCode } from "@/server/actions"

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ email?: string; sent?: string; error?: string }> }) {
  const params = await searchParams
  const email = params.email ?? ""
  const codeSent = Boolean(params.sent && email)

  return (
    <main className="auth-page">
      <section className="auth-panel panel">
        <p className="eyebrow">Agile Lab</p>
        <h1>Agile Pong</h1>
        <p className="subtle">{codeSent ? `We sent a one-time code to ${email}.` : "Sign in with your company email."}</p>

        {params.error === "domain" ? <p className="pill gold">Use an @agilelab.it email.</p> : null}
        {params.error === "code" ? <p className="pill gold">The code is invalid or expired.</p> : null}
        {params.error === "send" ? <p className="pill gold">We could not send the code. Please try again shortly.</p> : null}
        {params.error === "rate-limit" ? <p className="pill gold">Too many codes requested. Please wait before trying again.</p> : null}

        {!codeSent ? (
          <form action={requestLoginCode} className="form" style={{ marginTop: 18 }}>
            <label className="field">
              <span>Company email</span>
              <input className="input" defaultValue={email} name="email" placeholder="name@agilelab.it" type="email" />
            </label>
            <button className="button full" type="submit">
              Send code
            </button>
          </form>
        ) : null}

        {codeSent ? (
          <form action={verifyLoginCode} className="form" style={{ marginTop: 18 }}>
            <input name="email" type="hidden" value={email} />
            <label className="field">
              <span>One-time code</span>
              <input autoComplete="one-time-code" className="input" inputMode="numeric" maxLength={10} minLength={6} name="code" pattern="[0-9]{6,10}" placeholder="12345678" required />
            </label>
            <button className="button success full" type="submit">
              Enter
            </button>
            <a className="button secondary full" href="/login">
              Use another email
            </a>
          </form>
        ) : null}
      </section>
    </main>
  )
}
