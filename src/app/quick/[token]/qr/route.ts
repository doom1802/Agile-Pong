import QRCode from "qrcode"
import { isQuickInsertTokenValid } from "@/server/quick-insert"

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!isQuickInsertTokenValid(token)) return new Response("Not found", { status: 404 })

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  const quickInsertUrl = `${origin.replace(/\/$/, "")}/quick/${encodeURIComponent(token)}`
  const svg = await QRCode.toString(quickInsertUrl, {
    type: "svg",
    margin: 2,
    width: 640,
    color: { dark: "#07100a", light: "#ffffff" }
  })

  return new Response(svg, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline; filename=agile-pong-quick-insert.svg",
      "Content-Type": "image/svg+xml; charset=utf-8"
    }
  })
}
