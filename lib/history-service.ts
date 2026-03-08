import { createClient } from '@/lib/supabase/server'

export async function getNextKitNumber(supabase: any): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('kit_historico')
      .select('kit_data')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.warn("Erro ao buscar último kit_data:", error)
      return 10001
    }

    if (!data || data.length === 0 || !data[0].kit_data?.kit_id) {
      return 10001
    }

    // Extract kit_id from nested JSON
    const lastId = parseInt(data[0].kit_data.kit_id)
    if (isNaN(lastId)) return 10001

    return lastId + 1
  } catch (error) {
    console.error("Erro ao obter próximo número de kit:", error)
    return 10001
  }
}

export async function saveKitToHistory(kitData: any) {
  try {
    const supabase = await createClient()

    const kitNumber = await getNextKitNumber(supabase)

    const kitToSave = {
      kit_data: {
        kit_id: kitNumber.toString(),
        resultado_texto: kitData.resultado || "",
        valor_total: kitData.valorTotal || 0,
        detalhes: kitData.detalhes || {},
        itens: kitData.itens || [],
        meta: kitData // Store full data in meta just in case
      }
    }

    const { data, error } = await supabase
      .from('kit_historico')
      .insert([kitToSave])
      .select()
      .single()

    if (error) {
      console.error("Erro ao salvar kit no histórico Supabase:", error)
      // If table doesn't exist or other error, we might want to fail gracefully or throw
      // For now, let's throw to be consistent with previous behavior, but maybe we should just log and return a dummy ID if it's not critical?
      // The previous code threw error.
      throw error
    }

    return { id: data.id, kitNumber }
  } catch (error) {
    console.error("Erro fatal ao salvar kit no histórico:", error)
    // Return a fallback so the main flow doesn't crash if history fails
    return { id: 'error-saving-history', kitNumber: 0 }
  }
}
