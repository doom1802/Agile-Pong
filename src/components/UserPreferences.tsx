"use client"

import { useEffect, useState } from "react"

export type ThemePreference = "dark" | "light"
export type LanguagePreference = "en" | "it"

type Preferences = {
  theme: ThemePreference
  language: LanguagePreference
}

const defaultPreferences: Preferences = {
  theme: "dark",
  language: "en"
}

const eventName = "agile-pong-preferences"

export function useUiPreferences() {
  const [preferences, setPreferences] = useState<Preferences>(() => {
    if (typeof window === "undefined") return defaultPreferences

    const storedTheme = localStorage.getItem("agile-pong-theme")
    const storedLanguage = localStorage.getItem("agile-pong-language")

    return {
      theme: storedTheme === "light" ? "light" : "dark",
      language: storedLanguage === "it" ? "it" : "en"
    }
  })

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme
    document.documentElement.lang = preferences.language
    localStorage.setItem("agile-pong-theme", preferences.theme)
    localStorage.setItem("agile-pong-language", preferences.language)
    window.dispatchEvent(new CustomEvent(eventName, { detail: preferences }))
  }, [preferences])

  useEffect(() => {
    const onPreferenceChange = (event: Event) => {
      const detail = (event as CustomEvent<Preferences>).detail
      if (detail) {
        setPreferences(detail)
      }
    }

    window.addEventListener(eventName, onPreferenceChange)
    return () => window.removeEventListener(eventName, onPreferenceChange)
  }, [])

  return {
    preferences,
    setTheme: (theme: ThemePreference) => setPreferences((current) => ({ ...current, theme })),
    setLanguage: (language: LanguagePreference) => setPreferences((current) => ({ ...current, language }))
  }
}

export function UserPreferences() {
  const { preferences, setTheme, setLanguage } = useUiPreferences()

  return (
    <div className="preferences" aria-label="Display preferences">
      <select aria-label="Theme" value={preferences.theme} onChange={(event) => setTheme(event.target.value as ThemePreference)}>
        <option value="dark">Dark</option>
        <option value="light">Light</option>
      </select>
      <select aria-label="Language" value={preferences.language} onChange={(event) => setLanguage(event.target.value as LanguagePreference)}>
        <option value="en">EN</option>
        <option value="it">IT</option>
      </select>
    </div>
  )
}
