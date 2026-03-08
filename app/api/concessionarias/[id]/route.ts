import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { nome, uf, estados_atuacao, tabela_grupo_b, potencia_max_monofasica_kw, potencia_max_trifasica_kw } = body

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        getAll() {
          return []
        },
        setAll() {},
      },
    })

    const { data, error } = await supabase
      .from("concessionarias")
      .update({
        nome,
        uf,
        estados_atuacao,
        tabela_grupo_b,
        potencia_max_monofasica_kw: potencia_max_monofasica_kw ?? 12,
        potencia_max_trifasica_kw: potencia_max_trifasica_kw ?? 75,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating concessionaria:", error)
      return NextResponse.json({ error: "Failed to update concessionaria" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in PUT /api/concessionarias/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        getAll() {
          return []
        },
        setAll() {},
      },
    })

    const { error } = await supabase.from("concessionarias").delete().eq("id", params.id)

    if (error) {
      console.error("Error deleting concessionaria:", error)
      return NextResponse.json({ error: "Failed to delete concessionaria" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/concessionarias/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
