import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: {
      fetch: (url, options = {}) => {
        console.log("[v0] Supabase fetch to:", url)
        return fetch(url, {
          ...options,
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }).catch((error) => {
          console.log("[v0] Supabase fetch error:", error)
          throw error
        })
      },
    },
  })
}
