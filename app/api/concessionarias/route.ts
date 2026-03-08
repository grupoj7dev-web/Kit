import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET() {
  try {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        getAll() {
          return []
        },
        setAll() {},
      },
    })

    const { data, error } = await supabase.from("concessionarias").select("*").order("nome")

    if (error) {
      console.error("Error fetching concessionarias:", error)
      return NextResponse.json({ error: "Failed to fetch concessionarias" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in GET /api/concessionarias:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nome, uf, estado, tabela_grupo_b, potencia_max_monofasica_kw, potencia_max_trifasica_kw } = body

    const finalUF = uf || estado
    if (!nome || !finalUF) {
      return NextResponse.json({ error: "Nome and UF are required" }, { status: 400 })
    }

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        getAll() {
          return []
        },
        setAll() {},
      },
    })

    const { data, error, status } = await supabase
      .from("concessionarias")
      .insert({
        nome,
        uf: finalUF,
        tabela_grupo_b: tabela_grupo_b || [],
        potencia_max_monofasica_kw: potencia_max_monofasica_kw ?? 12,
        potencia_max_trifasica_kw: potencia_max_trifasica_kw ?? 75,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating concessionaria:", error)
      return NextResponse.json({ error: error.message || 'Failed to create concessionaria', details: error }, { status: status || 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/concessionarias:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
