"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { isOfflineMode, OFFLINE_USER } from "@/lib/supabase/offline-fallback"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOfflineMode()) {
  console.log("[v0] Using offline mode in useAuth")
  setUser(OFFLINE_USER as unknown as User)
      setLoading(false)
      return
    }

    const supabase = createClient()

    const getUser = async () => {
      try {
        console.log("[v0] Getting user session...")

        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Auth timeout")), 5000))

        const authPromise = supabase.auth.getUser()

        const {
          data: { user },
          error,
        } = (await Promise.race([authPromise, timeoutPromise])) as any

        if (error) {
          console.log("[v0] Auth error:", error)
          setError(error.message)
          setUser(null)
        } else {
          console.log("[v0] User found:", user?.email)
          setUser(user)
          setError(null)
        }
      } catch (err) {
  console.log("[v0] Auth timeout or error, using offline mode:", err)
  setUser(OFFLINE_USER as unknown as User)
        setError("Using offline mode")
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Listen for auth changes with error handling
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        console.log("[v0] Auth state changed:", event, session?.user?.email)
        setUser(session?.user ?? null)
        setError(null)
        setLoading(false)
      } catch (err) {
        console.log("[v0] Auth state change error:", err)
        setUser(OFFLINE_USER as unknown as User)
        setError("Using offline mode")
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading, error }
}
