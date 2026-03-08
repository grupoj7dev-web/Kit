import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!hasServiceKey) {
      console.error('API /api/cabos/[id] PUT - missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ error: 'Server misconfiguration: missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
    }
    const body = await request.json()
    const { id } = params

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid id. Must be a UUID' }, { status: 400 })
    }

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get: () => null,
        set: () => {},
        remove: () => {},
      },
    })

    // If the body contains a fornecedor_id, validate it is a UUID
    if (body && body.fornecedor_id) {
      const isUUID = (v: any) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
      if (!isUUID(body.fornecedor_id)) {
        return NextResponse.json({ error: 'fornecedor_id inválido. Deve ser um UUID.' }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from("cabos")
      .update(body)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error for cabos:', JSON.stringify(error))
      return NextResponse.json({ error: error.message || 'Failed to update cabo', details: error }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating cabo:", error)
    return NextResponse.json({ error: "Failed to update cabo", details: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!hasServiceKey) {
      console.error('API /api/cabos/[id] DELETE - missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ error: 'Server misconfiguration: missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
    }
    const { id } = params

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid id. Must be a UUID' }, { status: 400 })
    }

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get: () => null,
        set: () => {},
        remove: () => {},
      },
    })

    const { error } = await supabase
      .from("cabos")
      .delete()
      .eq("id", id)

    if (error) {
      console.error('Supabase delete error for cabos:', JSON.stringify(error))
      return NextResponse.json({ error: error.message || 'Failed to delete cabo', details: error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting cabo:", error)
    return NextResponse.json({ error: "Failed to delete cabo", details: String(error) }, { status: 500 })
  }
}