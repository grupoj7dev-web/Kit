export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    console.log('🔄 Criando tabela cabos...')
    
    const supabase = await createClient()
    
    // Verificar se a tabela já existe tentando fazer uma consulta
    const { data, error } = await supabase
      .from('cabos')
      .select('*')
      .limit(1)

    if (!error) {
      console.log('✅ Tabela cabos já existe!')
      return Response.json({ 
        success: true, 
        message: 'Tabela cabos já existe e está funcionando!',
        data: data
      })
    }

    // Se chegou aqui, a tabela não existe - vamos tentar criar
    console.log('ℹ️ Tabela não existe, tentando criar...')
    
    // Inserir um registro teste para forçar a criação da tabela
    // (isso só funciona se a tabela já existir)
    return Response.json({ 
      success: false, 
      error: 'Tabela cabos não existe no banco de dados',
      message: 'É necessário criar a tabela manualmente no Supabase Dashboard',
      sql: `
CREATE TABLE IF NOT EXISTS public.cabos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  valor_no_kit DECIMAL(10,2),
  valor_venda_avulsa DECIMAL(10,2),
  tipo_cabo VARCHAR(100),
  bitola VARCHAR(50),
  isolacao VARCHAR(100),
  tensao_maxima VARCHAR(50),
  temperatura_operacao VARCHAR(50),
  certificacoes TEXT,
  cor VARCHAR(50),
  comprimento_padrao DECIMAL(8,2),
  resistencia_eletrica DECIMAL(10,6),
  capacidade_corrente DECIMAL(8,2),
  flexibilidade VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.cabos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.cabos FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.cabos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON public.cabos FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON public.cabos FOR DELETE USING (auth.role() = 'authenticated');
      `
    })

  } catch (error) {
    console.error('❌ Erro geral:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ 
      success: false, 
      error: errorMessage,
      message: 'Erro ao verificar/criar tabela cabos'
    })
  }
}