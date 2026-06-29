import { requestLoginCode, verifyLoginCode } from "@/server/actions"

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ email?: string; sent?: string; error?: string }> }) {
  const params = await searchParams
  const email = params.email ?? "domenico.bulfamante@agilelab.it"
  const codeSent = Boolean(params.sent && email)

  return (
    <main className="auth-page">
      <section className="auth-panel panel">
        <p className="eyebrow">Agile Lab</p>
        <h1>Agile Pong</h1>
        <p className="subtle">{codeSent ? `Code sent to ${email}. For the MVP, use 123456.` : "Sign in with your company email. For the MVP the code is mocked as 123456."}</p>

        {params.error === "domain" ? <p className="pill gold">Use an @agilelab.it email.</p> : null}
        {params.error === "code" ? <p className="pill gold">Wrong code. Try 123456.</p> : null}

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
              <input className="input" defaultValue="123456" inputMode="numeric" name="code" placeholder="123456" />
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
