import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-dump-token, Authorization",
    "Access-Control-Max-Age": "86400",
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders() })
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dumpToken = process.env.DUMP_TOKEN

    if (!serviceKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server misconfiguration: missing Supabase credentials' }, { status: 500, headers: corsHeaders() })
    }

    // Simple token-based protection: if DUMP_TOKEN is set, require header x-dump-token to match
    if (dumpToken) {
      const provided = request.headers.get('x-dump-token') || url.searchParams.get('token')
      if (!provided || provided !== dumpToken) {
        return NextResponse.json({ error: 'Unauthorized: missing or invalid dump token' }, { status: 401, headers: corsHeaders() })
      }
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    // Query main tables in parallel
    const [modulosRes, inversoresRes, fornecedoresRes, stringBoxesRes, cabosRes, concessionariasRes, estruturasRes] = await Promise.all([
      supabase.from('modulos').select('*').not('modelo', 'ilike', '[DESATIVADO]%').order('created_at', { ascending: false }),
      supabase.from('inversores').select('*').order('created_at', { ascending: false }),
      supabase.from('fornecedores').select('*').order('nome', { ascending: true }),
      supabase.from('string_boxes').select('*').order('created_at', { ascending: false }),
      supabase.from('cabos').select('*, fornecedores(id, nome)').order('created_at', { ascending: false }),
      supabase.from('concessionarias').select('*').order('created_at', { ascending: false }),
      supabase.from('estruturas').select('*').order('created_at', { ascending: false }),
    ])

    const errors = [modulosRes, inversoresRes, fornecedoresRes, stringBoxesRes, cabosRes, concessionariasRes, estruturasRes]
      .map(r => (r.error ? r.error.message : null)).filter(Boolean)

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Erro ao buscar alguns recursos', details: errors }, { status: 500, headers: corsHeaders() })
    }

    const payload = {
      modulos: modulosRes.data || [],
      inversores: inversoresRes.data || [],
      fornecedores: fornecedoresRes.data || [],
      string_boxes: stringBoxesRes.data || [],
      cabos: cabosRes.data || [],
      concessionarias: concessionariasRes.data || [],
      estruturas: estruturasRes.data || [],
    }

    return NextResponse.json(payload, { headers: corsHeaders() })
  } catch (error) {
    console.error('API /api/dump error:', error)
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500, headers: corsHeaders() })
  }
}
