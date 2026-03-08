import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders() })
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { id } = params

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get: () => null,
          set: () => {},
          remove: () => {},
        },
      },
    )

    // Validate fornecedor_id if present
    const fornecedorId = body.fornecedor_id
    if (!fornecedorId) {
      return NextResponse.json({ error: 'fornecedor_id is required' }, { status: 400, headers: corsHeaders() })
    }
    const isUUID = (v: any) => typeof v === 'string' && !!v.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    if (!isUUID(fornecedorId)) {
      return NextResponse.json({ error: 'fornecedor_id must be a valid UUID' }, { status: 400, headers: corsHeaders() })
    }

    const { data: fornecedorRow, error: fErr } = await supabase.from('fornecedores').select('id').eq('id', fornecedorId).limit(1).maybeSingle()
    if (fErr) {
      return NextResponse.json({ error: 'Erro ao validar fornecedor', details: fErr.message }, { status: 500, headers: corsHeaders() })
    }
    if (!fornecedorRow) {
      return NextResponse.json({ error: 'fornecedor_id not found' }, { status: 400, headers: corsHeaders() })
    }

    const { data, error } = await supabase.from('inversores').update(body).eq('id', id).select().single()
    if (error) {
      return NextResponse.json({ error: 'Erro ao atualizar inversor', details: error.message }, { status: 400, headers: corsHeaders() })
    }

    return NextResponse.json({ data }, { status: 200, headers: corsHeaders() })
  } catch (error) {
    console.error('[v0] Error updating inversor:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500, headers: corsHeaders() })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get: () => null,
          set: () => {},
          remove: () => {},
        },
      },
    )

    const { error } = await supabase.from('inversores').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ error: 'Erro ao deletar inversor', details: error.message }, { status: 400, headers: corsHeaders() })
    }

    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders() })
  } catch (error) {
    console.error('[v0] Error deleting inversor:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500, headers: corsHeaders() })
  }
}
