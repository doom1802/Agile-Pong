import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Agile Pong",
  description: "Agile Lab ping pong ranking MVP"
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
