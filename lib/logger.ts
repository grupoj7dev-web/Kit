import { headers } from "next/headers"
import { createClient } from "./supabase/server"

export interface LogEntry {
    action: string
    entity_type?: string
    entity_id?: string
    details?: any
}

/**
 * Logs a system action to the database.
 * This should be called from Server Components or API routes.
 */
export async function logAction({ action, entity_type, entity_id, details = {} }: LogEntry) {
    try {
        const headerList = await headers()
        const ip = headerList.get("x-forwarded-for")?.split(",")[0] || headerList.get("x-real-ip") || "unknown"

        const supabase = await createClient()

        // Get user_id if authenticated
        const { data: { user } } = await supabase.auth.getUser()

        const { error } = await supabase.from("logs").insert({
            ip_address: ip,
            user_id: user?.id,
            action,
            entity_type,
            entity_id,
            details
        })

        if (error) {
            console.error("[Logger Error] Failed to insert log:", error.message)
        }
    } catch (error) {
        console.error("[Logger Error] Unexpected error during logging:", error)
    }
}
