import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/database.types"
import { db } from "./db"
import type { User } from "./db/types"

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? "agilelab.it"
const MOCK_COOKIE_NAME = "agile_pong_mock_session"

export const isMockAuthEnabled = process.env.NODE_ENV !== "production" && process.env.AUTH_BACKEND === "mock"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export const validateEmail = (email: string) => {
  const normalized = email.trim().toLowerCase()
  return normalized.endsWith(`@${ALLOWED_DOMAIN}`) ? normalized : null
}

export const validateMockCode = (code: string) => code.trim() === (process.env.MOCK_LOGIN_CODE ?? "123456")

export const setMockSessionCookie = async (token: string) => {
  const cookieStore = await cookies()
  cookieStore.set(MOCK_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 60 * 60 * 24 * 30,
    path: "/"
  })
}

export const clearMockSessionCookie = async () => {
  const cookieStore = await cookies()
  cookieStore.delete(MOCK_COOKIE_NAME)
}

const toUser = (profile: Profile): User => ({
  id: profile.id,
  email: profile.email,
  firstName: profile.first_name,
  lastName: profile.last_name,
  nickname: profile.nickname,
  avatarUrl: profile.avatar_url,
  officeLocation: profile.office_location,
  isAdmin: false,
  createdAt: profile.created_at,
  updatedAt: profile.updated_at,
  lastLoginAt: profile.last_login_at
})

export const getCurrentUser = async () => {
  if (isMockAuthEnabled) {
    const cookieStore = await cookies()
    const token = cookieStore.get(MOCK_COOKIE_NAME)?.value
    const session = token ? await db.getSessionByToken(token) : null
    return session ? db.getUserById(session.userId) : null
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub

  if (error || !userId) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()

  if (profileError || !profile) {
    return null
  }

  return toUser(profile)
}

export const requireUser = async () => {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  return user
}
