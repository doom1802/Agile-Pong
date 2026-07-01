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
      <div className="preference-control" role="group" aria-label="Theme">
        <button aria-pressed={preferences.theme === "dark"} className={preferences.theme === "dark" ? "active" : ""} type="button" onClick={() => setTheme("dark")}>Dark</button>
        <button aria-pressed={preferences.theme === "light"} className={preferences.theme === "light" ? "active" : ""} type="button" onClick={() => setTheme("light")}>Light</button>
      </div>
      <div className="preference-control" role="group" aria-label="Language">
        <button aria-pressed={preferences.language === "en"} className={preferences.language === "en" ? "active" : ""} type="button" onClick={() => setLanguage("en")}>EN</button>
        <button aria-pressed={preferences.language === "it"} className={preferences.language === "it" ? "active" : ""} type="button" onClick={() => setLanguage("it")}>IT</button>
      </div>
    </div>
  )
}
