import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function withCors(res: Response) {
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return res
}

export async function OPTIONS() {
  return withCors(new Response(null, { status: 204 }))
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    // Expect body to contain the object returned by /api/calcular-kit (id, resultado, valorTotal, detalhes, itens)
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get() { return undefined },
        set() { },
        remove() { }
      }
    })

    const payload = {
      kit_data: {
        kit_id: body.id || null,
        resultado_texto: body.resultado || null,
        valor_total: body.valorTotal || null,
        detalhes: body.detalhes ? body.detalhes : null,
        itens: body.itens ? body.itens : null,
        meta: body.meta ? body.meta : null
      }
    }

    const { data, error, status } = await supabase.from('kit_historico').insert([payload]).select().maybeSingle()
    if (error) {
      console.error('[api/kit-historico] insert error:', error)
      return withCors(new Response(JSON.stringify({ error: error.message || 'DB insert failed', details: error }), { status: status || 500 }))
    }
    return withCors(new Response(JSON.stringify(data), { status: 200 }))
  } catch (e) {
    console.error('[api/kit-historico] error:', e)
    return withCors(new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 }))
  }
}

export async function GET() {
  try {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: { get() { return undefined }, set() { }, remove() { } }
    })
    // Return recent history (limit 200)
    const { data, error } = await supabase.from('kit_historico').select('*').order('created_at', { ascending: false }).limit(200)
    if (error) {
      console.error('[api/kit-historico] select error:', error)
      // If PostgREST reports missing table in schema cache (PGRST204), return an empty list with a friendly hint
      const msg = (error as any)?.details?.message || (error as any)?.message || ''
      if (typeof msg === 'string' && /Could not find the .*kit_historico/.test(msg)) {
        return withCors(new Response(JSON.stringify({ data: [], warning: "Tabela 'kit_historico' não encontrada no banco. Crie a tabela ou execute a migration para habilitar o histórico." }), { status: 200 }))
      }
      return withCors(new Response(JSON.stringify({ error: error.message || 'DB select failed' }), { status: 500 }))
    }
    return withCors(new Response(JSON.stringify(data), { status: 200 }))
  } catch (e) {
    console.error('[api/kit-historico] error:', e)
    return withCors(new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 }))
  }
}
