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
          set() { },
          remove() { },
        },
      },
    )

    const { data: modulos, error } = await supabase
      .from("modulos")
      .select("*")
      .not('modelo', 'ilike', '[DESATIVADO]%')
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: "Erro ao buscar módulos", details: error.message },
        { status: 500, headers: corsHeaders() },
      )
    }

    return NextResponse.json({ data: modulos, count: modulos?.length || 0 }, { headers: corsHeaders() })
  } catch (error) {
    console.error("[v0] API Error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500, headers: corsHeaders() })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Normalize fornecedor_id: allow frontend to send empty string when no supplier
    // was selected — in that case remove the field so DB gets NULL.
    if (body && Object.prototype.hasOwnProperty.call(body, 'fornecedor_id')) {
      const val = body.fornecedor_id
      if (val === "" || val === null) {
        delete body.fornecedor_id
      }
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() { },
          remove() { },
        },
      },
    )

    // If a fornecedor_id was provided, validate it's a UUID and that the
    // fornecedor exists in the database before attempting to insert the module.
    if (body && body.fornecedor_id) {
      const fornecedorId = String(body.fornecedor_id)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(fornecedorId)) {
        return NextResponse.json(
          { error: "fornecedor_id inválido. Deve ser um UUID." },
          { status: 400, headers: corsHeaders() },
        )
      }

      const { data: fornecedorData, error: fornecedorError } = await supabase
        .from("fornecedores")
        .select("id")
        .eq("id", fornecedorId)
        .limit(1)

      if (fornecedorError) {
        console.error("Erro ao validar fornecedor:", fornecedorError)
        return NextResponse.json(
          { error: "Erro ao validar fornecedor" },
          { status: 500, headers: corsHeaders() },
        )
      }

      if (!fornecedorData || (Array.isArray(fornecedorData) && fornecedorData.length === 0)) {
        return NextResponse.json(
          { error: "Fornecedor não encontrado" },
          { status: 400, headers: corsHeaders() },
        )
      }
    }

    const { data: modulo, error } = await supabase.from("modulos").insert([body]).select().single()

    if (error) {
      return NextResponse.json(
        { error: "Erro ao criar módulo", details: error.message },
        { status: 400, headers: corsHeaders() },
      )
    }

    return NextResponse.json(
      { data: modulo, message: "Módulo criado com sucesso" },
      { status: 201, headers: corsHeaders() },
    )
  } catch (error) {
    console.error("[v0] API Error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500, headers: corsHeaders() })
  }
}
