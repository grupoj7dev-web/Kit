"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { OFFLINE_USER } from "@/lib/supabase/offline-fallback"

export function useAuthFallback() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    console.log("[v0] Auth initializing...")

    const supabase = createClient()

    // Get initial session with timeout and error handling
    const getInitialSession = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Auth timeout")), 10000))

        const sessionPromise = supabase.auth.getSession()

        const {
          data: { session },
          error,
        } = (await Promise.race([sessionPromise, timeoutPromise])) as any

        if (error) {
          console.log("[v0] Auth error:", error.message)
          // Only use offline mode if it's a network error
          if (error.message.includes("fetch") || error.message.includes("network")) {
            console.log("[v0] Network error detected, using offline mode")
            setUser(OFFLINE_USER)
            setIsOffline(true)
            setError("Modo offline - problemas de rede")
          } else {
            setUser(null)
            setError(error.message)
          }
        } else {
          console.log("[v0] Session loaded:", session?.user?.email || "no user")
          setUser(session?.user || null)
          setIsOffline(false)
          setError(null)
        }
      } catch (err: any) {
        console.log("[v0] Auth failed:", err.message)
        // Only use offline mode for network/fetch errors
        if (err.message.includes("fetch") || err.message.includes("timeout") || err.message.includes("network")) {
          console.log("[v0] Using offline mode due to network error")
          setUser(OFFLINE_USER)
          setIsOffline(true)
          setError("Modo offline - problemas de rede")
        } else {
          setUser(null)
          setError(err.message)
        }
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes with error handling
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        console.log("[v0] Auth state changed:", event, session?.user?.email || "no user")
        setUser(session?.user || null)
        setIsOffline(false)
        setError(null)
      } catch (err: any) {
        console.log("[v0] Auth state change error:", err)
        // Only use offline mode for network errors
        if (err.message?.includes("fetch") || err.message?.includes("network")) {
          setUser(OFFLINE_USER)
          setIsOffline(true)
          setError("Modo offline - problemas de rede")
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    if (isOffline) {
      setUser(null)
      setIsOffline(false)
      return
    }

    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch (err: any) {
      console.log("[v0] Sign out error:", err)
      setUser(null)
    }
  }

  return {
    user,
    loading,
    error,
    signOut,
    isOffline,
  }
}
