import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET() {
  try {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get(name: string) {
          return undefined
        },
        set(name: string, value: string, options: any) {
          // No-op for server-side
        },
        remove(name: string, options: any) {
          // No-op for server-side
        },
      },
    })

    const { data, error } = await supabase.from("fornecedores").select("*").eq("ativo", true).order("nome")

    if (error) {
      console.error("Error fetching fornecedores:", error)
      return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get(name: string) {
          return undefined
        },
        set(name: string, value: string, options: any) {
          // No-op for server-side
        },
        remove(name: string, options: any) {
          // No-op for server-side
        },
      },
    })

    const { data, error } = await supabase
      .from("fornecedores")
      .insert([
        {
          nome: body.nome,
          cnpj: body.cnpj,
          cidade: body.cidade,
          estado: body.estado,
          vendedor_nome: body.vendedor_nome,
          vendedor_telefone: body.vendedor_telefone,
          vendedor_email: body.vendedor_email,
          telefone_geral: body.telefone_geral,
          site_distribuidor: body.site_distribuidor,
          login_email: body.login_email,
          login_senha: body.login_senha,
          observacoes: body.observacoes,
          tipos_material: body.tipos_material || [],
          ativo: true,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Error creating fornecedor:", error)
      return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
