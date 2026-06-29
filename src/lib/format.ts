import type { CSSProperties } from "react"
import type { User } from "@/server/db/types"

export const displayName = (user: User | undefined | null) => {
  if (!user) {
    return "Unknown player"
  }

  return user.nickname || `${user.firstName} ${user.lastName}`.trim() || user.email.split("@")[0]
}

export const initials = (user: User | undefined | null) => {
  if (user?.firstName || user?.lastName) {
    return `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
  }

  return displayName(user)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

const avatarPalettes = [
  ["#083d77", "#00a6fb"],
  ["#7b2cbf", "#ff9e00"],
  ["#0b6e4f", "#8fd694"],
  ["#1d3557", "#e63946"],
  ["#2b2d42", "#f4d35e"],
  ["#005f73", "#94d2bd"],
  ["#6a040f", "#ffba08"],
  ["#3a0ca3", "#4cc9f0"]
]

export const avatarTheme = (user: User | undefined | null) => {
  const seed = user?.email || displayName(user)
  const hash = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const [from, to] = avatarPalettes[hash % avatarPalettes.length]

  return {
    "--avatar-from": from,
    "--avatar-to": to
  } as CSSProperties
}

export const signed = (value: number) => `${value >= 0 ? "+" : ""}${Math.round(value)}`
