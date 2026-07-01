"use client"

import { useEffect, useState } from "react"

const COOLDOWN_SECONDS = 30

const secondsLeft = (sentAt: number) => Math.max(0, COOLDOWN_SECONDS - Math.floor((Date.now() - sentAt) / 1000))

export function ResendCodeButton({ sentAt }: { sentAt: number }) {
  const [prevSentAt, setPrevSentAt] = useState(sentAt)
  const [remaining, setRemaining] = useState(() => secondsLeft(sentAt))

  if (sentAt !== prevSentAt) {
    setPrevSentAt(sentAt)
    setRemaining(secondsLeft(sentAt))
  }

  useEffect(() => {
    const interval = setInterval(() => setRemaining(secondsLeft(sentAt)), 1000)
    return () => clearInterval(interval)
  }, [sentAt])

  return (
    <button className="button secondary full" disabled={remaining > 0} type="submit">
      {remaining > 0 ? `Resend code (${remaining}s)` : "Resend code"}
    </button>
  )
}
