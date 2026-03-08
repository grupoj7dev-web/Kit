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
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(),
  })
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      },
    )

    const { data: inversores, error } = await supabase
      .from("inversores")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: "Erro ao buscar inversores", details: error.message },
        { status: 500, headers: corsHeaders() },
      )
    }

    return NextResponse.json({ data: inversores, count: inversores?.length || 0 }, { headers: corsHeaders() })
  } catch (error) {
    console.error("[v0] API Error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500, headers: corsHeaders() })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      },
    )

    // Server-side validation: fornecedor_id is required and must exist
    const fornecedorId = body.fornecedor_id
    if (!fornecedorId) {
      return NextResponse.json({ error: 'fornecedor_id is required' }, { status: 400, headers: corsHeaders() })
    }
    // Basic UUID-like check
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

    const { data: inversor, error } = await supabase.from("inversores").insert([body]).select().single()

    if (error) {
      return NextResponse.json(
        { error: "Erro ao criar inversor", details: error.message },
        { status: 400, headers: corsHeaders() },
      )
    }

    return NextResponse.json(
      { data: inversor, message: "Inversor criado com sucesso" },
      { status: 201, headers: corsHeaders() },
    )
  } catch (error) {
    console.error("[v0] API Error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500, headers: corsHeaders() })
  }
}
