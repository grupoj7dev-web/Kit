import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    const { data: row, error: selError } = await supabase.from('inversores').select('id, ativo').eq('id', id).limit(1).maybeSingle()
    if (selError) return NextResponse.json({ error: selError.message }, { status: 500 })
    const current = row ? row.ativo : false
    const newState = !current
    const { error: updError } = await supabase.from('inversores').update({ ativo: newState }).eq('id', id)
    if (updError) return NextResponse.json({ error: updError.message }, { status: 500 })
    return NextResponse.json({ id, ativo: newState })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 })
  }
}
