import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
    try {
        const supabase = await createClient()

        // Execute the ALTER TABLE command
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: `
        ALTER TABLE inversores 
        ADD COLUMN IF NOT EXISTS potencia_modulo_aceita_w INTEGER;
        
        COMMENT ON COLUMN inversores.potencia_modulo_aceita_w 
        IS 'Potência máxima do módulo que o microinversor aceita (em Watts)';
      `
        })

        if (error) {
            console.error('Migration error:', error)
            return NextResponse.json({
                success: false,
                error: error.message,
                hint: 'You may need to run this SQL manually in Supabase SQL Editor'
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Column potencia_modulo_aceita_w added successfully!'
        })

    } catch (err: any) {
        console.error('Migration error:', err)
        return NextResponse.json({
            success: false,
            error: err.message,
            sql: `
ALTER TABLE inversores 
ADD COLUMN IF NOT EXISTS potencia_modulo_aceita_w INTEGER;

COMMENT ON COLUMN inversores.potencia_modulo_aceita_w 
IS 'Potência máxima do módulo que o microinversor aceita (em Watts)';
      `.trim(),
            hint: 'Please run the SQL above manually in Supabase SQL Editor: https://supabase.com/dashboard/project/bjbqjsqmawlxylpziopa/sql'
        }, { status: 500 })
    }
}
