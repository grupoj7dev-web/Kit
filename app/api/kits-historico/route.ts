import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Adiciona headers de CORS
function withCors(res: Response) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get() { return undefined },
        set() { },
        remove() { }
      }
    })

    const { data: sbKits, error: sbErr } = await supabase
      .from("kit_historico")
      .select("*")
      .order("created_at", { ascending: false })

    if (sbErr) {
      console.error("Erro Supabase:", sbErr);
      return withCors(NextResponse.json({ success: false, error: sbErr.message }, { status: 500 }));
    }

    const kits = (sbKits || []).map((row: any) => {
      const data = row.kit_data || {};
      const meta = data.meta || data || {}; // Try to find meta in kit_data or use kit_data as meta fallback

      return {
        id: row.id,
        kitNumber: Number(String(data.kit_id || row.kit_id || '').replace(/[^0-9]/g, '')) || undefined,
        kitReference: data.kit_id || row.kit_id || undefined,
        potenciaPico: meta.potenciaPico,
        potenciaPlaca: meta.potenciaPlaca,
        tipoInversor: meta.tipoInversor,
        tipoEstrutura: meta.tipoEstrutura,
        tipoRede: meta.tipoRede,
        valorTotal: data.valor_total || row.valor_total || data.valorTotal,
        statusKit: meta.statusKit,
        createdAt: row.created_at,
        detalhes: data.detalhes || row.detalhes,
        itens: data.itens || row.itens,
        origin: "supabase"
      };
    });

    return withCors(NextResponse.json({ success: true, kits }));
  } catch (error: any) {
    console.error("Erro ao buscar histórico de kits:", error);
    return withCors(NextResponse.json({
      success: false,
      error: error?.message || "Erro ao buscar histórico de kits"
    }, { status: 500 }));
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 200 }));
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get("id")
    if (!id) {
      return withCors(NextResponse.json({ success: false, error: "Missing id" }, { status: 400 }))
    }

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get() { return undefined },
        set() { },
        remove() { }
      }
    })
    const { error } = await supabase.from("kit_historico").delete().eq("id", id)
    if (error) {
      return withCors(NextResponse.json({ success: false, error: error.message }, { status: 500 }))
    }
    return withCors(NextResponse.json({ success: true }))
  } catch (error: any) {
    return withCors(NextResponse.json({ success: false, error: error?.message || "Delete failed" }, { status: 500 }))
  }
}