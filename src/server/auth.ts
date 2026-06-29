import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/database.types"
import type { User } from "./db/types"

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? "agilelab.it"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export const validateEmail = (email: string) => {
  const normalized = email.trim().toLowerCase()
  return normalized.endsWith(`@${ALLOWED_DOMAIN}`) ? normalized : null
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
