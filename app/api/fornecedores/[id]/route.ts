import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    const { data, error } = await supabase.from("fornecedores").select("*").eq("id", params.id).single()

    if (error) {
      console.error("Error fetching fornecedor:", error)
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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
      .update({
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating fornecedor:", error)
      return NextResponse.json({ error: "Failed to update supplier" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    const { error } = await supabase.from("fornecedores").update({ ativo: false }).eq("id", params.id)

    if (error) {
      console.error("Error deactivating fornecedor:", error)
      return NextResponse.json({ error: "Failed to deactivate supplier" }, { status: 500 })
    }

    return NextResponse.json({ message: "Supplier deactivated successfully" })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
