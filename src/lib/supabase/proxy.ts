import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseConfig, isSupabaseConfigured } from "./config"
import type { Database } from "./database.types"

export const refreshSupabaseSession = async (request: NextRequest) => {
  if (!isSupabaseConfigured) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })
  const { url, publishableKey } = getSupabaseConfig()
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      }
    }
  })

  // getClaims verifies/refreshes the token; do not insert logic before it.
  await supabase.auth.getClaims()
  return response
}
