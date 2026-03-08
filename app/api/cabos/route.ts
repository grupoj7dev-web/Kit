import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    console.log('API /api/cabos - SUPABASE_SERVICE_ROLE_KEY present:', hasServiceKey)
    if (!hasServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set in server environment')
      return NextResponse.json({ error: 'Server misconfiguration: missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
    }
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data, error } = await supabase
      .from("cabos")
      .select(`
        *,
        fornecedores (
          id,
          nome
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching cabos:", error)
    return NextResponse.json({ error: "Failed to fetch cabos" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Ensure service role key is available on the server
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!hasServiceKey) {
      console.error('API /api/cabos POST - missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ error: 'Server misconfiguration: missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    console.log('API /api/cabos POST payload:', JSON.stringify(body))

    // Basic server-side validation: fornecedor_id should be a UUID (foreign key expects uuid)
    const isUUID = (v: any) => typeof v === 'string' && !!v.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    if (body.fornecedor_id && !isUUID(body.fornecedor_id)) {
      console.warn('API /api/cabos POST - invalid fornecedor_id:', body.fornecedor_id)
      return NextResponse.json({ error: 'fornecedor_id inválido. Fornecedor deve ser um UUID.' }, { status: 400 })
    }

    const { data, error, status } = await supabase.from("cabos").insert([body]).select().single()

    if (error) {
      console.error('Supabase insert error:', JSON.stringify(error))
      return NextResponse.json({ error: error.message || 'Failed to create cabo', details: error }, { status: status || 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error creating cabo:", error)
    // Try to extract useful info if it's an object
    let details = null
    try { details = JSON.parse(JSON.stringify(error)) } catch (e) { details = String(error) }
    return NextResponse.json({ error: "Failed to create cabo", details }, { status: 500 })
  }
}
