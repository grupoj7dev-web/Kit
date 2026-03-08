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

    const { data: estruturas, error } = await supabase
      .from("estruturas")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: "Erro ao buscar estruturas", details: error.message },
        { status: 500, headers: corsHeaders() },
      )
    }

    return NextResponse.json({ data: estruturas, count: estruturas?.length || 0 }, { headers: corsHeaders() })
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

    const { data: estrutura, error } = await supabase.from("estruturas").insert([body]).select().single()

    if (error) {
      return NextResponse.json(
        { error: "Erro ao criar estrutura", details: error.message },
        { status: 400, headers: corsHeaders() },
      )
    }

    return NextResponse.json(
      { data: estrutura, message: "Estrutura criada com sucesso" },
      { status: 201, headers: corsHeaders() },
    )
  } catch (error) {
    console.error("[v0] API Error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500, headers: corsHeaders() })
  }
}
