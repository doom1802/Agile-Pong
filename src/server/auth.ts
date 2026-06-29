import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { db } from "./db"

const COOKIE_NAME = "agile_pong_session"
const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? "agilelab.it"
const MOCK_CODE = process.env.MOCK_LOGIN_CODE ?? "123456"

export const validateEmail = (email: string) => {
  const normalized = email.trim().toLowerCase()
  return normalized.endsWith(`@${ALLOWED_DOMAIN}`) ? normalized : null
}

export const validateCode = (code: string) => code.trim() === MOCK_CODE

export const setSessionCookie = async (token: string) => {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/"
  })
}

export const clearSessionCookie = async () => {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export const getCurrentUser = async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) {
    return null
  }

  const session = await db.getSessionByToken(token)
  if (!session) {
    return null
  }

  return db.getUserById(session.userId)
}

export const requireUser = async () => {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  return user
}
