"use client"

import type { ReactNode } from "react"
import { useFormStatus } from "react-dom"

export function FormSubmitButton({
  children,
  className,
  pendingLabel
}: {
  children: ReactNode
  className?: string
  pendingLabel: string
}) {
  const { pending } = useFormStatus()

  return (
    <button aria-busy={pending} className={className ?? "button"} disabled={pending} type="submit">
      {pending ? pendingLabel : children}
    </button>
  )
}
