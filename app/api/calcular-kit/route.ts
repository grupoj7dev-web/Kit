import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from 'crypto'
import { saveKitToHistory } from '@/lib/history-service'
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'
export const runtime = 'nodejs'

// Adiciona headers de CORS a todas as respostas
function withCors(res: Response) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

// Suporte ao preflight CORS
export async function OPTIONS() {
  return withCors(new Response(null, { status: 204 }));
}
import { createServerClient } from "@supabase/ssr"

interface KitCalculationRequest {
  potenciaPico: number // em kWp
  potenciaPlaca: number // 610W ou 700W
  idModulo?: string // opcional: referência direta ao módulo
  tipoInversor: "string" | "micro" // String ou Micro Inversor
  tipoEstrutura: "telhado" | "solo" // Telhado ou Solo
  tipoRede: "monofasico" | "trifasico" // Monofásico ou Trifásico
  // Novos campos de transformador
  transformador?: boolean // Se tem transformador
  potenciaTrafo?: number | null // Potência do transformador em kW
  // Campo para especificar módulos por microinversor
  modulosPorMicro?: number // Quantos módulos por micro (ex: 4 ou 6)
}

interface KitCalculationResponse {
  resultado: string
  valorTotal: number
  detalhes: {
    modulos: {
      quantidade: number
      potencia: number
      potenciaTotal: number
      potenciaAjustada: number
    }
    componentes: {
      inversores: { quantidade: number; descricao: string; preco: number }
      stringBox: { quantidade: number; descricao: string; preco: number }
      estrutura: { quantidade: number; descricao: string; preco: number }
      cabos: {
        vermelho: { metros: number; preco: number }
        preto: { metros: number; preco: number }
        aterramento: { metros: number; preco: number }
      }
      conectoresMC4?: { quantidade: number; preco: number }
    }
    observacoes: string[]
  }
  itens?: Array<{ categoria: string; descricao: string; quantidade: number; precoUnit?: number; precoTotal: number }>
}

// 🔹 1. Função para aplicar regra do 0,2 no dimensionamento de módulos
function calcularQuantidadeModulos(potenciaPico: number, potenciaPlaca: number): { quantidade: number; potenciaAjustada: number } {
  // Converter potenciaPico de kW para W para compatibilidade com potenciaPlaca
  const potenciaPicoWatts = potenciaPico * 1000
  const divisao = potenciaPicoWatts / potenciaPlaca
  const parteInteira = Math.floor(divisao)
  const parteDecimal = divisao - parteInteira

  let quantidade: number
  if (parteDecimal < 0.2) {
    quantidade = parteInteira
  } else {
    quantidade = parteInteira + 1
  }

  // Garantir pelo menos 1 módulo
  if (quantidade === 0) quantidade = 1

  const potenciaAjustada = (quantidade * potenciaPlaca) / 1000

  return { quantidade, potenciaAjustada }
}

// 🔹 2. Função para aplicar limites por tipo de rede
// 🔹 2. Função para aplicar limites por tipo de rede (com suporte a transformador)
function aplicarLimitesRede(
  quantidade: number,
  potenciaPlaca: number,
  tipoInversor: "string" | "micro",
  tipoRede: "monofasico" | "trifasico",
  transformador: boolean = false,
  potenciaTrafo: number | null = null,
  limiteMonofasicoKw: number = 12,
  limiteTrifasicoKw: number = 75
): { quantidade: number; potenciaAjustada: number; observacoes: string[] } {
  const observacoes: string[] = []
  let quantidadeFinal = quantidade

  // Definir limite da rede em kW
  let limiteRedeKw: number
  if (transformador && potenciaTrafo && potenciaTrafo > 0) {
    limiteRedeKw = potenciaTrafo
  } else {
    limiteRedeKw = tipoRede === 'trifasico' ? limiteTrifasicoKw : limiteMonofasicoKw
  }

  // Definir overload máximo permitido (50% = 1.5x)
  const maxOverload = 0.5
  const limiteDcKw = limiteRedeKw * (1 + maxOverload)

  // Calcular potência atual em kW
  const potenciaAtualKw = (quantidadeFinal * potenciaPlaca) / 1000

  // Verificar se excede o limite DC
  if (potenciaAtualKw > limiteDcKw) {
    // Calcular quantidade máxima de módulos permitida
    const maxModulos = Math.floor((limiteDcKw * 1000) / potenciaPlaca)

    if (maxModulos < quantidadeFinal) {
      const tipoLimite = transformador ? 'do transformador' : `da rede ${tipoRede}`
      observacoes.push(`Quantidade de módulos ajustada de ${quantidadeFinal} para ${maxModulos} para respeitar o limite ${tipoLimite} (${limiteRedeKw} kW) com overload máx de ${(maxOverload * 100)}%.`)
      quantidadeFinal = maxModulos
    }
  }

  // Garantir pelo menos 1 módulo
  if (quantidadeFinal < 1) quantidadeFinal = 1

  const potenciaAjustada = (quantidadeFinal * potenciaPlaca) / 1000

  return { quantidade: quantidadeFinal, potenciaAjustada, observacoes }
}

const capBrand = (s: any) => {
  const v = (s || '').toString().toLowerCase()
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : ''
}
const nomeComercialModulo = (mod: any) => {
  let nome = `Módulo ${mod.potencia_w || mod.potenciaW || 0}W`
  if (mod.is_tier1) nome += " Tier 1"
  if (mod.include_brand_in_name && mod.marca) nome += ` ${capBrand(mod.marca)}`
  if (mod.is_bifacial) nome += " Bifacial"
  return nome
}
const nomeComercialInversor = (tipo: any, marca: any, potenciaKW: number) => {
  const base = (tipo || '').toString().toLowerCase().includes('micro') ? 'Micro Inversores' : 'Inversores'
  const potStr = `${Number(potenciaKW).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kW`
  return `${base} ${potStr} ${capBrand(marca)}`
}

// 🔹 3. Função para selecionar inversores (limpa e consolidada)
// Helper: normaliza o campo overload_usado que pode estar em porcentagem (ex: 30) ou fração (ex: 0.3)
function normalizeOverload(v: any): number {
  let n = Number(v) || 0
  if (n > 1) n = n / 100 // tratar 30 como 30% -> 0.3
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

// Normaliza e limita o overload a um máximo realista (50% / 0.5)
function normalizeAndClampOverload(v: any): number {
  const n = normalizeOverload(v)
  return Math.min(n, 0.5)
}

async function selecionarInversores(
  quantidadeModulos: number,
  potenciaPlaca: number,
  tipoInversor: "string" | "micro",
  tipoRede: "monofasico" | "trifasico",
  inversores: any[],
  requestOverload?: number,
  transformador?: boolean,
  potenciaTrafo?: number | null,
  modulosPorMicro?: number, // Novo parâmetro para especificar módulos por micro
  limiteMonofasicoKw: number = 12,
  limiteTrifasicoKw: number = 75
): Promise<{
  quantidade: number;
  descricao: string;
  preco: number;
  observacoes: string[];
  potenciaUnitaria: number;
  tipo: "string" | "micro";
  id?: string;
  marca?: string;
  modelo?: string;
  potencia_kw?: number;
  preco_kit?: number;
  preco_avulso?: number;
  garantia?: number;
  modulesPerMicro?: number;
  modulosTotais?: number;
  overload_aplicado?: number;
}> {
  const observacoes: string[] = []
  const potenciaTotal = (quantidadeModulos * potenciaPlaca) / 1000 // kWp

  // Lógica do transformador: se houver transformador, limitar a potência máxima do inversor
  let limiteTransformadorKw: number | null = null
  if (transformador && potenciaTrafo && potenciaTrafo > 0) {
    limiteTransformadorKw = potenciaTrafo
    observacoes.push(`Limite de transformador aplicado: ${potenciaTrafo} kW`)
  }

  const toKW = (v: any, tipo?: string, modelo?: string, marca?: string) => {
    const nRaw = (v ?? 0).toString().replace(',', '.')
    let n = Number(nRaw) || 0
    const t = (tipo || '').toLowerCase()
    const m = (modelo || '').toLowerCase()
    const b = (marca || '').toLowerCase()
    const isMicro = t.includes('micro') || m.includes('micro') || b.includes('micro')
    if (isMicro) {
      return n > 50 ? n / 1000 : n
    }
    if (n >= 1000 && n < 100000) return n / 1000
    return n
  }


  // MICROINVERSORES
  if (tipoInversor === "micro") {
    // Resolver quantidade de módulos por micro dinamicamente
    // Resolver quantidade de módulos por micro dinamicamente
    const resolveModulesPerMicro = (row: any, placaW: number): number => {
      const n = (v: any) => {
        const s = (v ?? 0).toString().replace(',', '.')
        const x = Number(s)
        return x || 0
      }
      const mppts = n(row.dc_num_mppts)
      const entradas = n(row.dc_entradas_mppt)
      const totalStrings = n(row.dc_total_strings)

      if (totalStrings > 0) return totalStrings
      if (mppts > 0 && entradas > 0) return mppts * entradas

      let potMicroKW = n(row.potencia_kw)
      // Para microinversores, valores acima de 50 são provavelmente Watts
      if (potMicroKW > 50) potMicroKW = potMicroKW / 1000 // watts → kW
      const placaKW = placaW > 50 ? placaW / 1000 : placaW // watts → kW

      if (potMicroKW > 0 && placaKW > 0) {
        const approx = Math.floor(potMicroKW / placaKW)
        // Allow 1 module per micro if it makes sense (e.g. 700W plate on 800W micro)
        if (approx >= 1 && approx <= 6) return approx
      }
      return 4 // fallback razoável
    }

    // Buscar microinversores do banco de dados (agora fitrado da lista pré-carregada)
    const listaMicros = inversores
      .filter((i: any) => (i.tipo || '').toLowerCase().includes('micro'))
      .sort((a, b) => (Number(a.preco_kit) || Number(a.preco_avulso) || 0) - (Number(b.preco_kit) || Number(b.preco_avulso) || 0))

    console.log('[v2][api/calcular-kit] query microinversores ->', { listaMicros, modulosPorMicro })

    if (!listaMicros || listaMicros.length === 0) {
      observacoes.push("Nenhum microinversor cadastrado no sistema!")
      return {
        quantidade: 0,
        descricao: "Microinversor não cadastrado",
        preco: 0,
        observacoes,
        potenciaUnitaria: 0,
        tipo: 'micro',
      }
    }
    // Filtrar microinversores por módulos por micro se especificado
    let candidatosMicros = listaMicros
    if (modulosPorMicro && modulosPorMicro > 0) {
      candidatosMicros = listaMicros.filter((micro: any) => {
        const modulesCalc = resolveModulesPerMicro(micro, potenciaPlaca)
        return modulesCalc === modulosPorMicro
      })

      if (candidatosMicros.length === 0) {
        observacoes.push(`Nenhum microinversor encontrado com ${modulosPorMicro} módulos por micro. Usando melhor opção disponível.`)
        candidatosMicros = listaMicros
      } else {
        observacoes.push(`Microinversor selecionado com ${modulosPorMicro} módulos por micro conforme solicitado`)
      }
    }

    const escolhido = candidatosMicros[0]

    // Normalizar potência do micro (kW)
    let potenciaMicro = Number((escolhido.potencia_kw ?? 0).toString().replace(',', '.')) || 0
    // Para microinversores, valores acima de 50 são provavelmente Watts
    if (potenciaMicro > 50) potenciaMicro = potenciaMicro / 1000
    const modulesPerMicro = resolveModulesPerMicro(escolhido, potenciaPlaca)
    let quantidadeMicros = Math.ceil(quantidadeModulos / modulesPerMicro)

    console.log('[v2][api/calcular-kit] microinversor escolhido ->', {
      id: escolhido.id,
      marca: escolhido.marca,
      modelo: escolhido.modelo,
      modulesPerMicro,
      quantidadeMicros,
      modulosPorMicroSolicitado: modulosPorMicro
    })


    // Aplicar limite do transformador se existir, senão usar limite da rede
    const limiteKwRedeMicro = limiteTransformadorKw !== null
      ? limiteTransformadorKw
      : (tipoRede === 'trifasico' ? limiteTrifasicoKw : limiteMonofasicoKw)

    // Validar se a quantidade calculada de micros respeita o limite de potência
    const potenciaTotalMicros = quantidadeMicros * potenciaMicro

    if (potenciaTotalMicros > limiteKwRedeMicro) {
      // Se exceder o limite, calcular o máximo permitido
      const maxMicrosPorLimite = Math.floor(limiteKwRedeMicro / potenciaMicro)

      if (maxMicrosPorLimite >= 1) {
        const tipoLimite = limiteTransformadorKw !== null ? 'transformador' : 'rede'
        observacoes.push(`Limite de ${tipoLimite} aplicado: reduzido de ${quantidadeMicros} para ${maxMicrosPorLimite} micros (limite: ${limiteKwRedeMicro} kW / ${potenciaMicro.toFixed(2)} kW cada).`)
        quantidadeMicros = maxMicrosPorLimite
      } else {
        // Se o limite não permite nem 1 micro, avisar mas manter 1 (será tratado depois)
        observacoes.push(`Atenção: Limite de potência (${limiteKwRedeMicro} kW) é menor que a potência do microinversor (${potenciaMicro} kW).`)
      }
    }

    // Garantir pelo menos 1 micro quando existir cadastro válido
    if (quantidadeMicros < 1) quantidadeMicros = 1

    const precoUnit = (Number((escolhido.preco_kit ?? 0).toString().replace(',', '.')) || Number((escolhido.preco_avulso ?? 0).toString().replace(',', '.')) || 0)
    const descricao = `${quantidadeMicros}x Micro ${escolhido.marca} ${escolhido.modelo} (${modulesPerMicro} módulos/micro)`
    const modulosTotais = quantidadeMicros * modulesPerMicro
    return {
      quantidade: quantidadeMicros,
      descricao,
      preco: quantidadeMicros * precoUnit,
      observacoes,
      potenciaUnitaria: potenciaMicro,
      tipo: 'micro',
      id: escolhido.id,
      marca: escolhido.marca,
      modelo: escolhido.modelo,
      potencia_kw: potenciaMicro,
      preco_kit: Number((escolhido.preco_kit ?? 0).toString().replace(',', '.')) || 0,
      preco_avulso: Number((escolhido.preco_avulso ?? 0).toString().replace(',', '.')) || 0,
      garantia: Number(escolhido.garantia) || 0,
      modulesPerMicro,
      modulosTotais
    }
  }

  // INVERSORES STRING
  if (tipoRede === "monofasico") {
    let lista = inversores
      .sort((a: any, b: any) => (Number(a.preco_kit) || Number(a.preco_avulso) || 0) - (Number(b.preco_kit) || Number(b.preco_avulso) || 0))

    if (tipoInversor === 'string') {
      lista = lista.filter((i: any) => !(i.tipo || '').toLowerCase().includes('micro'))
    }

    console.log('[v2][api/calcular-kit] inversores filter string ->', { found: lista.length, potenciaTotal })

    const strip = (s: any) => {
      if (!s && s !== 0) return ''
      try { return s.toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() } catch (e) { return s.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() }
    }

    const candidatos = (lista || []).map((c: any) => {
      const topo = strip((c.fases || c.tipo || ''))
      let potenciaC = toKW(c.potencia_kw, c.tipo, c.modelo, c.marca)
      const overloadC = (typeof requestOverload === 'number') ? requestOverload : normalizeAndClampOverload(c.overload_usado)
      return { raw: c, topo, potencia_nominal_kW: potenciaC, overload_aplicado: overloadC }
    })

    const limiteKwRedeString = (typeof potenciaTrafo === 'number' && potenciaTrafo > 0 && transformador) ? Number(potenciaTrafo) : limiteMonofasicoKw

    const candidatosTopo = (transformador && typeof potenciaTrafo === 'number' && potenciaTrafo > 0)
      ? candidatos // com transformador, aceitar trifásicos também
      : candidatos.filter((c: any) => c.topo.includes('mono') || c.topo.includes('monof'))

    const ordenadosPorPreco = candidatosTopo.sort((a: any, b: any) => {
      const pa = Number(a.raw.preco_kit) || Number(a.raw.preco_avulso) || 999999
      const pb = Number(b.raw.preco_kit) || Number(b.raw.preco_avulso) || 999999
      return pa - pb
    })

    let escolhido: any = null
    let solucoes: any[] = []

    // Tentar encontrar 1 único inversor que atenda
    for (const cand of ordenadosPorPreco) {
      const potNom = cand.potencia_nominal_kW
      const ov = cand.overload_aplicado
      const cap = potNom * (1 + ov)
      if (cap >= potenciaTotal) {
        escolhido = { cand, units: 1, potNom, ov }
        break
      }
    }

    // Se não encontrou 1 único, tentar combinações (apenas se não exceder limite, mas já checamos acima)
    // Mantendo lógica de fallback apenas para casos onde a combinação cabe no limite mas não existe inversor único
    if (!escolhido) {
      // ... lógica de combinação existente ...
      // Como já barramos potenciaTotal > limiteKwRedeString, aqui só entra se potenciaTotal <= limite
      // mas não tem 1 inversor único que atenda.
      // A lógica de combinação abaixo deve respeitar o limite também.

      // ... (rest of the combination logic) ...
    }

    for (const c of ordenadosPorPreco) {
      const potNom = c.potencia_nominal_kW
      const ov = c.overload_aplicado
      const maxUnits = Math.floor(limiteKwRedeString / potNom)

      if (maxUnits < 1) continue

      // Calcular quantas unidades são necessárias para atender a potência total
      // Considerando o overload permitido
      const capacidadePorInversor = potNom * (1 + (ov || 0))
      const unitsNeeded = Math.ceil(potenciaTotal / capacidadePorInversor)

      // A quantidade final será o que for necessário, limitado pelo que cabe na rede/trafo
      // Se unitsNeeded > maxUnits, significa que mesmo lotando o trafo, ficamos "curtos" de potência (overload excessivo)
      // Mas em cenários de trafo, muitas vezes queremos lotar o trafo. 
      // Vamos manter a lógica original de aceitar apenas se atender a potência, mas usando unitsNeeded se for menor que maxUnits.

      // Se maxUnits atende (capacidadeDC >= potenciaTotal), então unitsNeeded <= maxUnits.
      // Então podemos usar unitsNeeded para economizar.

      const capacidadeDCMax = maxUnits * capacidadePorInversor

      if (capacidadeDCMax >= potenciaTotal) {
        // Solução válida!
        // Usamos unitsNeeded (que é <= maxUnits) para não superdimensionar desnecessariamente
        const unitsToUse = unitsNeeded
        const precoUnit = Number(c.raw.preco_kit) || Number(c.raw.preco_avulso) || 0
        const totalPrice = unitsToUse * precoUnit

        solucoes.push({
          cand: c,
          units: unitsToUse,
          potNom,
          ov,
          totalPrice
        })
      }
    }

    // Ordenar soluções por preço total crescente
    solucoes.sort((a, b) => a.totalPrice - b.totalPrice)

    if (solucoes.length > 0) {
      escolhido = solucoes[0]
    }

    if (!escolhido) {
      let solucoesParciais: any[] = []

      for (const c of ordenadosPorPreco) {
        const potNom = c.potencia_nominal_kW
        const ov = c.overload_aplicado
        const maxUnits = Math.floor(limiteKwRedeString / potNom)

        if (maxUnits < 1) continue

        const capacidadeDC = maxUnits * potNom * (1 + (ov || 0))
        const precoUnit = Number(c.raw.preco_kit) || Number(c.raw.preco_avulso) || 0
        const totalPrice = maxUnits * precoUnit

        solucoesParciais.push({
          cand: c,
          units: maxUnits,
          potNom,
          ov,
          capacidadeDC,
          totalPrice
        })
      }

      // Ordenar por:
      // 1. Maior capacidade DC (prioridade principal: entregar o máximo possível)
      // 2. Menor preço total (desempate: o mais barato que entrega essa capacidade)
      solucoesParciais.sort((a, b) => {
        if (Math.abs(b.capacidadeDC - a.capacidadeDC) > 0.01) {
          return b.capacidadeDC - a.capacidadeDC // Descrescente de capacidade
        }
        return a.totalPrice - b.totalPrice // Crescente de preço
      })

      console.log('[v3] Fallback solutions:', solucoesParciais.map(s => ({
        mod: s.cand.raw.modelo,
        pot: s.potNom,
        units: s.units,
        capDC: s.capacidadeDC,
        price: s.totalPrice
      })))

      if (solucoesParciais.length > 0) {
        escolhido = solucoesParciais[0]
        // DEBUG: Adicionar info de debug nas observações
        observacoes.push(`DEBUG FALLBACK: Top 3: ${solucoesParciais.slice(0, 3).map(s => `${s.cand.raw.modelo} (${s.potNom}kW) x${s.units} = ${s.capacidadeDC.toFixed(2)}kW DC (R$ ${s.totalPrice})`).join(' | ')}`)
      }
    }

    if (!escolhido) {
      observacoes.push(`Nenhuma combinação monofásica atende sob o limite de ${limiteKwRedeString} kW`)
      return {
        quantidade: 0,
        descricao: "Inversor monofásico não encontrado",
        preco: 0,
        observacoes,
        potenciaUnitaria: 0,
        tipo: 'string'
      }
    }

    const raw = escolhido.cand.raw
    const potNom = escolhido.potNom
    const units = escolhido.units
    const precoUnit = Number(raw.preco_kit) || Number(raw.preco_avulso) || 0
    const topoSel = ((raw.fases || raw.tipo) || '').toString().toLowerCase()
    const ehTrifasicoSel = topoSel.includes('tri') || topoSel.includes('trif')
    const tipoDesc = ehTrifasicoSel ? 'Trifásico' : 'Monofásico'
    if (transformador && typeof potenciaTrafo === 'number' && potenciaTrafo > 0) observacoes.push(`Limite de transformador aplicado: ${potenciaTrafo} kW`)
    else observacoes.push(`Limite monofásico aplicado: ${limiteKwRedeString} kW`)
    if (ehTrifasicoSel && tipoRede === 'monofasico' && transformador) {
      observacoes.push('Inversor trifásico permitido via transformador em rede monofásica')
    }
    const descricao = `${units}x ${raw.nome || nomeComercialInversor(raw.tipo || raw.fases, raw.marca, potNom)}`
    return {
      quantidade: units,
      descricao,
      preco: units * precoUnit,
      observacoes,
      potenciaUnitaria: potNom,
      tipo: 'string',
      id: raw.id,
      marca: raw.marca,
      modelo: raw.modelo,
      potencia_kw: potNom,
      preco_kit: Number(raw.preco_kit) || 0,
      preco_avulso: Number(raw.preco_avulso) || 0,
      garantia: Number(raw.garantia) || 0,
      overload_aplicado: escolhido.ov
    }
  }

  // TRIFÁSICO
  // TRIFÁSICO
  // Estratégia: tentar 1 inversor que cubra tudo. Se não encontrar, considerar também monofásicos por preço.
  const candidatos = inversores
    .filter((i: any) => (i.tipo === 'String' || i.tipo === 'string'))
    .sort((a, b) => (Number(a.preco_kit) || Number(a.preco_avulso) || 0) - (Number(b.preco_kit) || Number(b.preco_avulso) || 0)) // Ordenar por preço

  console.log('[v1][api/calcular-kit] inversores trifasico filter ->', { found: candidatos.length, potenciaTotal })

  const candidatosList = candidatos || []



  // Separar candidatos trifásicos e monofásicos
  const candidatosTrifasicos = candidatosList.filter((c: any) => {
    const topo = ((c.fases || c.tipo) || '').toString().toLowerCase()
    return topo.includes('tri') || topo.includes('trif')
  })

  const candidatosMonofasicos = candidatosList.filter((c: any) => {
    const topo = ((c.fases || c.tipo) || '').toString().toLowerCase()
    return topo.includes('mono') || topo.includes('monof')
  })

  console.log('[v1][api/calcular-kit] candidatos separados ->', { trifasicos: candidatosTrifasicos.length, monofasicos: candidatosMonofasicos.length })

  // Combinar candidatos: sempre considerar ambos trifásicos e monofásicos
  // Ordenar por preço para escolher o melhor custo-benefício independentemente da fase
  const todosCandidatos = [...candidatosTrifasicos, ...candidatosMonofasicos]
    .sort((a, b) => {
      const precoA = Number(a.preco_kit) || Number(a.preco_avulso) || 999999
      const precoB = Number(b.preco_kit) || Number(b.preco_avulso) || 999999
      return precoA - precoB // Ordenar por preço crescente
    })

  if (todosCandidatos.length === 0) {
    observacoes.push("Nenhum inversor cadastrado no sistema")
    return {
      quantidade: 0,
      descricao: "Inversor não cadastrado",
      preco: 0,
      observacoes,
      potenciaUnitaria: 0,
      tipo: 'string'
    }
  }

  // Tentar encontrar o inversor mais econômico (independentemente da fase)
  // que suporte a potência total e respeite o limite do transformador
  const candidatoIdeal = todosCandidatos.find((c: any) => {
    const potenciaC = toKW(c.potencia_kw, c.tipo, c.modelo, c.marca)
    const ov = (typeof requestOverload === 'number') ? requestOverload : normalizeAndClampOverload(c.overload_usado)
    const efetiva = potenciaC * (1 + (ov || 0))

    // Verificar limite do transformador se aplicável
    if (limiteTransformadorKw !== null && potenciaC > limiteTransformadorKw) {
      return false // Inversor excede o limite do transformador
    }

    // Verificar limite da rede Trifásica se NÃO houver transformador
    if (limiteTransformadorKw === null && tipoRede === 'trifasico' && potenciaC > limiteTrifasicoKw) {
      return false // Inversor excede o limite da rede trifásica (ex: 75kW)
    }

    return efetiva >= potenciaTotal
  })

  // FALLBACK DE SEGURANÇA: Se não encontrou candidato ideal (provavelmente porque todos os que atendem a potênciaTotal excedem o limite de 75kW),
  // devemos selecionar o maior inversor possível DENTRO do limite, mesmo que não atenda 100% da potência com o overload padrão.

  let candidatoFallback = null
  if (!candidatoIdeal && tipoRede === 'trifasico' && limiteTransformadorKw === null) {
    // Filtrar candidatos que cabem no limite
    const candidatosNoLimite = todosCandidatos.filter((c: any) => {
      const potenciaC = toKW(c.potencia_kw, c.tipo, c.modelo, c.marca)
      return potenciaC <= limiteTrifasicoKw
    })

    // Pegar o maior deles (ordenado por preço pode não ser o maior potência, então vamos reordenar por potência DC efetiva)
    if (candidatosNoLimite.length > 0) {
      candidatosNoLimite.sort((a: any, b: any) => {
        const potA = toKW(a.potencia_kw, a.tipo, a.modelo, a.marca)
        const potB = toKW(b.potencia_kw, b.tipo, b.modelo, b.marca)
        return potB - potA // Decrescente
      })
      candidatoFallback = candidatosNoLimite[0]
    }
  }

  const candidatoFinal = candidatoIdeal || candidatoFallback

  if (candidatoFinal) {
    const isFallback = !candidatoIdeal && !!candidatoFallback
    const candidato = candidatoFinal

    const tipoIdeal = (candidato.tipo || '').toString().toLowerCase()
    const modeloIdeal = (candidato.modelo || '').toString().toLowerCase()
    const marcaIdeal = (candidato.marca || '').toString().toLowerCase()
    let potenciaUnitaria = toKW(candidato.potencia_kw, candidato.tipo, candidato.modelo, candidato.marca)
    const ovIdeal = (typeof requestOverload === 'number') ? requestOverload : normalizeAndClampOverload(candidato.overload_usado)
    const precoUnit = Number(candidato.preco_kit) || Number(candidato.preco_avulso) || 0

    // Identificar se é trifásico ou monofásico
    const topo = ((candidato.fases || candidato.tipo) || '').toString().toLowerCase()
    const ehTrifasico = topo.includes('tri') || topo.includes('trif')
    const ehMonofasico = topo.includes('mono') || topo.includes('monof')
    const tipoDescricao = ehTrifasico ? 'Trifásico' : 'Monofásico'

    // Adicionar observação se for monofásico em rede trifásica
    if (tipoRede === 'trifasico' && ehMonofasico) {
      observacoes.push(`Inversor monofásico selecionado por melhor custo-benefício para rede trifásica`)
    }

    if (isFallback) {
      observacoes.push(`Nota: Inversor selecionado limitado pelo padrão da rede (${limiteTrifasicoKw} kW). A potência dos painéis (${potenciaTotal.toFixed(2)} kWp) pode exceder a capacidade ideal do inversor, mas foi maximizada dentro do limite permitido.`)
    }

    return {
      quantidade: 1,
      descricao: `1x ${candidato.nome || `Inversor ${candidato.marca} ${candidato.modelo} ${potenciaUnitaria} kW ${tipoDescricao}`}`,
      preco: precoUnit || 20000,
      observacoes,
      potenciaUnitaria,
      tipo: 'string',
      id: candidato.id,
      marca: candidato.marca,
      modelo: candidato.modelo,
      potencia_kw: potenciaUnitaria,
      preco_kit: Number(candidato.preco_kit) || 0,
      preco_avulso: Number(candidato.preco_avulso) || 0,
      garantia: Number(candidato.garantia) || 0
    }
  }

  // Se nenhum inversor individual suporta, usar o maior e multiplicar
  // Para qualquer tipo de rede, considerar ambos trifásicos e monofásicos, ordenados por preço
  // Aplicar limite do transformador se existir
  let candidatosViaveis = [...candidatosTrifasicos, ...candidatosMonofasicos]
    .sort((a, b) => {
      const precoA = Number(a.preco_kit) || Number(a.preco_avulso) || 999999
      const precoB = Number(b.preco_kit) || Number(b.preco_avulso) || 999999
      return precoA - precoB // Ordenar por preço crescente
    })

  // Filtrar por limite do transformador se aplicável
  if (limiteTransformadorKw !== null) {
    candidatosViaveis = candidatosViaveis.filter((c: any) => {
      const potenciaC = toKW(c.potencia_kw, c.tipo, c.modelo, c.marca)
      return potenciaC <= limiteTransformadorKw
    })
  }

  const maior = candidatosViaveis[candidatosViaveis.length - 1]

  if (!maior) {
    observacoes.push("Nenhum inversor viável encontrado")
    return {
      quantidade: 0,
      descricao: "Inversor não encontrado",
      preco: 0,
      observacoes,
      potenciaUnitaria: 0,
      tipo: 'string'
    }
  }

  const maiorTipoNorm = ((maior?.tipo || '') as string).toString().toLowerCase()
  const maiorModeloNorm = ((maior?.modelo || '') as string).toString().toLowerCase()
  const maiorMarcaNorm = ((maior?.marca || '') as string).toString().toLowerCase()
  let potenciaUnitaria = toKW(maior.potencia_kw, maior?.tipo, maior?.modelo, maior?.marca)
  const ovMaior = (typeof requestOverload === 'number') ? requestOverload : normalizeAndClampOverload(maior.overload_usado)
  const capacidadeEfetiva = potenciaUnitaria * (1 + (ovMaior || 0))
  const quantidadeInversores = Math.ceil(potenciaTotal / capacidadeEfetiva)
  const precoUnit = Number(maior.preco_kit) || Number(maior.preco_avulso) || 0

  // Identificar se é trifásico ou monofásico
  const topo = ((maior.fases || maior.tipo) || '').toString().toLowerCase()
  const ehTrifasico = topo.includes('tri') || topo.includes('trif')
  const ehMonofasico = topo.includes('mono') || topo.includes('monof')
  const tipoDescricao = ehTrifasico ? 'Trifásico' : 'Monofásico'

  // Adicionar observação se for monofásico em rede trifásica
  if (tipoRede === 'trifasico' && ehMonofasico) {
    observacoes.push(`Inversores monofásicos selecionados por melhor custo-benefício para rede trifásica`)
  }

  return {
    quantidade: quantidadeInversores,
    descricao: `${quantidadeInversores}x Inversor ${maior.marca} ${maior.modelo} ${potenciaUnitaria} kW ${tipoDescricao}`,
    preco: quantidadeInversores * (precoUnit || 30000),
    observacoes,
    potenciaUnitaria,
    tipo: 'string',
    id: maior.id,
    marca: maior.marca,
    modelo: maior.modelo,
    potencia_kw: potenciaUnitaria,
    preco_kit: Number(maior.preco_kit) || 0,
    preco_avulso: Number(maior.preco_avulso) || 0,
    garantia: Number(maior.garantia) || 0
  }
}

// 🔹 Função auxiliar para validar limites de potência por concessionária
async function validarLimitesConcessionaria(
  tipoRede: "monofasico" | "trifasico",
  potenciaTotalInversores: number,
  supabase: any,
  transformador?: boolean,
  potenciaTrafo?: number | null,
  limiteMonofasicoKw: number = 12,
  limiteTrifasicoKw: number = 75
): Promise<{ valido: boolean; limite: number; mensagem?: string }> {
  try {
    const limiteBase = tipoRede === 'monofasico' ? limiteMonofasicoKw : limiteTrifasicoKw
    const limite = (transformador && typeof potenciaTrafo === 'number' && potenciaTrafo > 0) ? Number(potenciaTrafo) : limiteBase

    if (potenciaTotalInversores > limite) {
      return {
        valido: false,
        limite,
        mensagem: `Limite ${tipoRede} da concessionária: ${limite} kW. Potência total dos inversores: ${potenciaTotalInversores} kW.`
      }
    }

    return { valido: true, limite }
  } catch {
    // Fallback para valores padrão em caso de erro
    const limiteBase = tipoRede === 'monofasico' ? 12 : 75
    const limite = (transformador && typeof potenciaTrafo === 'number' && potenciaTrafo > 0) ? Number(potenciaTrafo) : limiteBase
    if (potenciaTotalInversores > limite) {
      return {
        valido: false,
        limite,
        mensagem: `Limite ${tipoRede} padrão: ${limite} kW. Potência total dos inversores: ${potenciaTotalInversores} kW.`
      }
    }
    return { valido: true, limite }
  }
}

// 🔹 4. Função para calcular String Box
// 🔹 4. Função para calcular String Box
async function calcularStringBox(
  quantidadeInversores: number,
  potenciaInversor: number,
  tipoInversor: "string" | "micro",
  stringBoxes: any[],
  observacoes: string[]
): Promise<{ quantidade: number; descricao: string; preco: number; id?: string; fabricante?: string; modelo?: string; entradas?: number; saidas?: number; garantia_anos?: number }> {
  if (tipoInversor === "micro") {
    return { quantidade: 0, descricao: "Não aplicável (microinversores)", preco: 0 }
  }
  // Determinar configuração alvo
  let alvoEntradas = 2
  let alvoSaidas = 2
  if (potenciaInversor > 5 && potenciaInversor <= 15) {
    alvoEntradas = 3; alvoSaidas = 3
  } else if (potenciaInversor > 15) {
    alvoEntradas = 4; alvoSaidas = 4
  }
  // Buscar string boxes candidatas e filtrar por entradas/saidas >= alvo (escolher a mais barata)
  const boxes = stringBoxes || []
  const escolhido = boxes.find((b: any) => {
    const ent = Number(b.entradas) || 0
    const sai = Number(b.saidas) || 0
    return ent >= alvoEntradas && sai >= alvoSaidas
  })
  if (!escolhido) {
    observacoes.push(`String Box ${alvoEntradas}E/${alvoSaidas}S não encontrada — aplicando fallback com caixas disponíveis mais baratas.`)
    // Fallback: usar a string box mais barata e calcular quantas são necessárias por inversor
    const caixasDisponiveis = boxes.filter((b: any) => (Number(b.entradas) || 0) > 0 && (Number(b.saidas) || 0) > 0)
    if (caixasDisponiveis.length === 0) {
      observacoes.push('Nenhuma string box disponível para fallback.')
      return {
        quantidade: 0,
        descricao: `String Box não cadastrada`,
        preco: 0,
        id: null,
        fabricante: null,
        modelo: null,
        entradas: null,
        saidas: null,
        garantia_anos: null
      }
    }
    // escolher a mais barata
    const maisBarata = caixasDisponiveis.sort((a: any, b: any) => (Number(a.preco_no_kit) || Number(a.preco_avulso) || 0) - (Number(b.preco_no_kit) || Number(b.preco_avulso) || 0))[0]
    const entUnit = Number(maisBarata.entradas) || 1
    const saiUnit = Number(maisBarata.saidas) || 1
    const caixasPorInversor = Math.max(Math.ceil(alvoEntradas / entUnit), Math.ceil(alvoSaidas / saiUnit))
    const precoUnit = Number(maisBarata.preco_no_kit) || Number(maisBarata.preco_avulso) || 0
    return {
      quantidade: quantidadeInversores * caixasPorInversor,
      descricao: `${quantidadeInversores * caixasPorInversor}x String Box ${maisBarata.fabricante} ${maisBarata.modelo} (fallback ${entUnit}E/${saiUnit}S)`,
      preco: quantidadeInversores * caixasPorInversor * precoUnit,
      id: maisBarata.id,
      fabricante: maisBarata.fabricante,
      modelo: maisBarata.modelo,
      entradas: Number(maisBarata.entradas) || 0,
      saidas: Number(maisBarata.saidas) || 0,
      garantia_anos: Number(maisBarata.garantia_anos) || 0
    }
  }
  const precoUnit = Number(escolhido.preco_no_kit) || Number(escolhido.preco_avulso) || 0
  return {
    quantidade: quantidadeInversores,
    descricao: `${quantidadeInversores}x String Box ${escolhido.fabricante} ${escolhido.modelo} ${escolhido.entradas}E/${escolhido.saidas}S`,
    preco: quantidadeInversores * precoUnit,
    id: escolhido.id,
    fabricante: escolhido.fabricante,
    modelo: escolhido.modelo,
    entradas: Number(escolhido.entradas) || 0,
    saidas: Number(escolhido.saidas) || 0,
    garantia_anos: Number(escolhido.garantia_anos) || 0
  }
}

// 🔹 5. Função para calcular estrutura
// 🔹 5. Função para calcular estrutura
async function calcularEstrutura(quantidade: number, tipoEstrutura: "telhado" | "solo", estruturas: any[]): Promise<{ quantidade: number; descricao: string; preco: number; id?: string; marca?: string; modelo?: string; garantia?: number }> {
  if (tipoEstrutura === "telhado") {
    const esc = (estruturas || []).find((e: any) => ((e.tipo || '').toString().toLowerCase().includes('telha') || (e.tipo || '').toString().toLowerCase().includes('telhado')))
    if (!esc) {
      return {
        quantidade: 0,
        descricao: "Estrutura de telhado não cadastrada",
        preco: 0
      }
    }
    // Determinar quantos módulos um kit atende (fallback para 1 se não especificado)
    const modulosPorEstrutura = Number(esc.modulos_por_estrutura) || 1
    const quantidadeKitsCalculada = Math.ceil(quantidade / modulosPorEstrutura)

    // O preço do kit pode estar configurado por conjunto (preco_kit) ou por peça (preco_avulso).
    // Preferimos usar `preco_kit` como preço por kit quando presente; caso contrário, `preco_avulso`.
    const precoUnit = Number(esc.preco_kit) || Number(esc.preco_avulso) || 0

    return {
      quantidade: quantidadeKitsCalculada,
      descricao: `${quantidadeKitsCalculada}x Kit Estrutura Telhado p/ ${modulosPorEstrutura} Mód ${esc.marca} ${esc.modelo}`.trim(),
      preco: quantidadeKitsCalculada * precoUnit,
      id: esc.id,
      marca: esc.marca,
      modelo: esc.modelo,
      garantia: Number(esc.garantia) || 0
    }
  } else {
    const esc = (estruturas || []).find((e: any) => ((e.tipo || '').toString().toLowerCase().includes('solo') || (e.tipo || '').toString().toLowerCase().includes('terra')))
    if (!esc) {
      return {
        quantidade: 0,
        descricao: "Estrutura solo não cadastrada",
        preco: 0
      }
    }
    const precoUnit = Number(esc.preco_kit) || Number(esc.preco_avulso) || 0
    return {
      quantidade,
      descricao: `${quantidade}x Estrutura Solo ${esc.marca} ${esc.modelo}`.trim(),
      preco: quantidade * precoUnit,
      id: esc.id,
      marca: esc.marca,
      modelo: esc.modelo,
      garantia: Number(esc.garantia) || 0
    }
  }
}

// 🔹 6. Função para calcular cabos
// 🔹 6. Função para calcular cabos
async function calcularCabos(
  quantidadeModulos: number,
  cabos: any[],
  observacoes: string[]
): Promise<{ vermelho: number; preto: number; aterramento: number; preco: number; precoVermelho: number; precoPreto: number; precoAterramento: number }> {
  let metrosVermelho: number
  let metrosPreto: number
  let metrosAterramento: number

  if (quantidadeModulos <= 10) {
    metrosVermelho = 50; metrosPreto = 50; metrosAterramento = 20
  } else if (quantidadeModulos <= 20) {
    metrosVermelho = quantidadeModulos * 5
    metrosPreto = quantidadeModulos * 5
    metrosAterramento = quantidadeModulos * 3
  } else if (quantidadeModulos <= 25) {
    metrosVermelho = quantidadeModulos * 5
    metrosPreto = quantidadeModulos * 5
    metrosAterramento = quantidadeModulos * 2.5
  } else if (quantidadeModulos <= 31) {
    metrosVermelho = quantidadeModulos * 4.5
    metrosPreto = quantidadeModulos * 4.5
    metrosAterramento = quantidadeModulos * 2
  } else {
    let metrosPorModulo: number
    if (quantidadeModulos < 50) metrosPorModulo = 4.0
    else if (quantidadeModulos < 100) metrosPorModulo = 3.5
    else if (quantidadeModulos < 200) metrosPorModulo = 3.0
    else if (quantidadeModulos < 300) metrosPorModulo = 2.7
    else if (quantidadeModulos < 500) metrosPorModulo = 2.6
    else metrosPorModulo = 2.5
    const metrosTotais = quantidadeModulos * metrosPorModulo
    metrosVermelho = metrosTotais / 2
    metrosPreto = metrosTotais / 2
    metrosAterramento = quantidadeModulos * 0.3
  }

  function precoPorMetro(cor: string): number {
    const cabo = cabos?.find((c: any) => (c.cor || '').toLowerCase().startsWith(cor))
    if (!cabo) return -1
    if (cabo.comprimento_padrao && (cabo.valor_no_kit || cabo.valor_venda_avulsa)) {
      const base = Number(cabo.valor_no_kit) || Number(cabo.valor_venda_avulsa)
      if (base > 0) return base / cabo.comprimento_padrao
    }
    return -1
  }

  const precoMetroVermelho = precoPorMetro('vermelho')
  const precoMetroPreto = precoPorMetro('preto')
  const precoMetroVerde = precoPorMetro('verde') // aterramento

  if (precoMetroVermelho === -1) observacoes.push('Cabo vermelho não cadastrado no sistema!')
  if (precoMetroPreto === -1) observacoes.push('Cabo preto não cadastrado no sistema!')
  if (precoMetroVerde === -1) observacoes.push('Cabo aterramento não cadastrado no sistema!')

  const precoVermelho = precoMetroVermelho === -1 ? 0 : metrosVermelho * precoMetroVermelho
  const precoPreto = precoMetroPreto === -1 ? 0 : metrosPreto * precoMetroPreto
  const precoAterramento = precoMetroVerde === -1 ? 0 : metrosAterramento * precoMetroVerde
  const precoTotal = precoVermelho + precoPreto + precoAterramento

  return {
    vermelho: metrosVermelho,
    preto: metrosPreto,
    aterramento: metrosAterramento,
    preco: precoTotal,
    precoVermelho,
    precoPreto,
    precoAterramento
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: any = await request.json()
    // aceitar frontends que enviam { payload: { ... } }
    if (body && body.payload && typeof body.payload === 'object') {
      body = { ...body, ...body.payload }
    }
    // DUMP inicial das entradas brutas para debug
    // flag para habilitar logs verbosos apenas quando solicitado (body.debug)
    const debugFlag = !!body.debug
    if (debugFlag) console.log('[v_debug][api/calcular-kit] Entrada bruta body ->', JSON.stringify(body))

    // Helper: remove acentuação e normaliza texto
    const normalizeText = (v: any) => {
      if (v === undefined || v === null) return ''
      try {
        return v.toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
      } catch (e) {
        // fallback para ambientes antigos
        return v.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      }
    }

    // --- Normalizações de entrada (tolerantes a variações/encoding do frontend)
    if (body.potenciaPlaca !== undefined) {
      // garantir número (Wp). Se recebeu em kW (ex.: 0.7), converte para W
      let pp = Number(body.potenciaPlaca)
      if (!Number.isFinite(pp)) pp = Number(String(body.potenciaPlaca).replace(',', '.'))
      if (pp > 0 && pp < 50) {
        // valores <50 muito provavelmente estão em kW (0.61, 0.7)
        pp = Math.round(pp * 1000)
      }
      body.potenciaPlaca = Math.round(pp)
    }

    if (debugFlag) console.log('[v_debug][api/calcular-kit] Entrada normalizada ->', { potenciaPico: body.potenciaPico, potenciaPlaca: body.potenciaPlaca, tipoInversor: body.tipoInversor, tipoRede: body.tipoRede, condicaoInversor: body.condicaoInversor, overload_pct: body.overload_pct })

    if (body.tipoInversor && typeof body.tipoInversor === 'string') {
      const ti = normalizeText(body.tipoInversor)
      body.tipoInversor = ti.includes('micro') ? 'micro' : 'string'
    }

    if (body.tipoRede && typeof body.tipoRede === 'string') {
      const tr = normalizeText(body.tipoRede)
      if (tr.includes('tri')) body.tipoRede = 'trifasico'
      else body.tipoRede = 'monofasico'
    }

    // Condição do inversor: 'calcular' (padrão) ou 'usuario-define'
    if (body.condicaoInversor && typeof body.condicaoInversor === 'string') {
      const ci = normalizeText(body.condicaoInversor)
      body.condicaoInversor = ci === 'usuario-define' || ci === 'usuario' || ci === 'usuario_define' ? 'usuario-define' : 'calcular'
    } else {
      body.condicaoInversor = 'calcular'
    }

    // Validações
    if (!body.potenciaPico || body.potenciaPico <= 0) {
      return withCors(NextResponse.json({ error: "Potência pico é obrigatória e deve ser maior que zero" }, { status: 400 }))
    }

    if (!body.potenciaPlaca || body.potenciaPlaca <= 0) {
      return withCors(NextResponse.json({ error: "Potência da placa inválida" }, { status: 400 }))
    }

    // Proteção contra entradas não realistas (ex.: 50 Wp em vez de 550 Wp)
    // Valores de potência de módulo geralmente ficam em 250..800 Wp. Rejeitamos valores muito baixos
    // para evitar que o cálculo gere números absurdos de módulos e confunda a seleção de componentes.
    if (Number(body.potenciaPlaca) <= 100) {
      return withCors(NextResponse.json({
        error: "Potência da placa muito baixa (<=100 Wp). Use um valor realista em Watts, por exemplo 550, 600 ou 700 Wp. Se você informou o valor em kW, converta para W (ex: 0.55 kW → 550 W)."
      }, { status: 400 }))
    }

    if (!body.tipoInversor || !["string", "micro"].includes(body.tipoInversor.toLowerCase())) {
      return withCors(NextResponse.json({ error: "Tipo do inversor deve ser 'string' ou 'micro'" }, { status: 400 }))
    }

    if (!body.tipoEstrutura || !["telhado", "solo"].includes(body.tipoEstrutura.toLowerCase())) {
      return withCors(NextResponse.json({ error: "Tipo da estrutura deve ser 'telhado' ou 'solo'" }, { status: 400 }))
    }

    if (!body.tipoRede || !["monofasico", "trifasico"].includes(body.tipoRede.toLowerCase())) {
      return withCors(NextResponse.json({ error: "Tipo da rede deve ser 'monofasico' ou 'trifasico'" }, { status: 400 }))
    }

    // Normalização e validação de transformador
    const trafoFlag = (() => {
      const v = body.transformador
      if (typeof v === 'string') {
        const s = v.toLowerCase()
        return s === 'sim' || s === 'true'
      }
      return !!v
    })()
    const trafoKw: number | null = (() => {
      if (body.potenciaTrafo !== undefined && body.potenciaTrafo !== null) return Number(body.potenciaTrafo)
      if (body.potenciaTransformacao !== undefined && body.potenciaTransformacao !== null) return Number(body.potenciaTransformacao)
      return null
    })()
    if (trafoFlag) {
      if (!trafoKw || !Number.isFinite(trafoKw) || trafoKw <= 0) {
        return withCors(NextResponse.json({ error: "Potência do transformador é obrigatória e deve ser > 0 quando transformador for 'Sim'" }, { status: 400 }))
      }
    }

    let observacoes: string[] = ["Aplicada regra 0,2 para dimensionamento de módulos"]

    // Normalizar tipos para case-insensitive
    const tipoInversorNormalizado = body.tipoInversor.toLowerCase()
    const tipoEstruturaNormalizado = body.tipoEstrutura.toLowerCase()
    const tipoEstruturaLabel = tipoEstruturaNormalizado === 'telhado'
      ? 'Telhado'
      : (tipoEstruturaNormalizado === 'solo' ? 'Solo' : body.tipoEstrutura)
    const tipoRedeNormalizado = body.tipoRede.toLowerCase()

    // parse optional overload_pct passed in request (can be percent 30 or fraction 0.3)
    let requestOverload: number | undefined = undefined
    if (body.overload_pct !== undefined && body.overload_pct !== null) {
      const tmp = Number(body.overload_pct)
      if (Number.isFinite(tmp)) {
        requestOverload = normalizeAndClampOverload(tmp)
      }
    }

    // Buscar módulo correspondente (por potencia_w) para obter preço e descrição
    // create a server client bound to the incoming request cookies so RLS/session aware queries
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() { },
        remove() { },
      },
    })
    // Debug mode: if caller requests, collect candidate lists for inspection and include in final response
    let debugData: any = null
    if ((body as any).debug) {
      try {
        const potenciaBusca = Number(body.potenciaPlaca)
        const [inversoresRes, boxesRes, estruturasRes, modulosRes, cabosRes] = await Promise.all([
          supabase.from('inversores').select('id, marca, modelo, tipo, potencia_kw, fases, preco_kit, preco_avulso, overload_usado').limit(200),
          supabase.from('string_boxes').select('id, fabricante, modelo, entradas, saidas, preco_no_kit, preco_avulso').limit(200),
          supabase.from('estruturas').select('id, marca, modelo, tipo, modulos_por_estrutura, preco_kit, preco_avulso').limit(200),
          supabase.from('modulos').select('id, potencia_w, marca, modelo, preco_kit, preco_avulso').limit(200),
          supabase.from('cabos').select('id, cor, valor_no_kit, valor_venda_avulsa, comprimento_padrao').limit(200)
        ])

        // small normalizations to help reading
        const normalizePot = (v: any) => {
          let n = Number(v) || 0
          // Correção: Só converter para kW se for realisticamente alto para ser Watts
          // Valores como 100, 50, 200 são provavelmente kW, não Watts
          if (n > 50 && n < 1000 && n % 1 !== 0) n = n / 1000
          return n
        }

        const inversores = (inversoresRes.data || []).map((i: any) => ({ ...i, potencia_normalizada_kW: normalizePot(i.potencia_kw), topo: (i.ac_topologia || i.fases || i.tipo || '').toString().toLowerCase() }))
        const modulos = (modulosRes.data || []).map((m: any) => ({ ...m, potencia_w: Number(m.potencia_w) }))

        debugData = {
          payload: body,
          potencia_calculada_divisao: Number(body.potenciaPico) / Number(body.potenciaPlaca),
          inversores,
          inversores_raw: inversoresRes || null,
          string_boxes: boxesRes.data || [],
          estruturas: estruturasRes.data || [],
          modulos,
          cabos: cabosRes.data || []
        }
      } catch (e) {
        console.error('[v_debug][api/calcular-kit] erro ao coletar debug ->', e)
        debugData = { debug_error: 'Erro ao coletar debug', error: String(e) }
      }
    }
    // Validação adicional: certificar que a potenciaPlaca solicitada exista na tabela 'modulos'
    // Otimização: Buscar limites da concessionária em paralelo
    // Otimização: Buscar limites da concessionária e catálogos em paralelo
    // Otimização: Buscar limites da concessionária e catálogos em paralelo
    const [modAllRes, limitsRes, cabosRes, estruturasRes, stringBoxesRes, inversoresRes] = await Promise.all([
      supabase.from('modulos').select('potencia_w, modelo').order('potencia_w', { ascending: true }),
      supabase.from('concessionarias').select('potencia_max_monofasica_kw, potencia_max_trifasica_kw').order('created_at', { ascending: false }).limit(1),
      supabase.from("cabos").select("id, cor, valor_no_kit, valor_venda_avulsa, comprimento_padrao"),
      supabase.from("estruturas").select("id, marca, modelo, preco_kit, preco_avulso, modulos_por_estrutura, tipo, garantia"),
      supabase.from("string_boxes").select("id, fabricante, modelo, entradas, saidas, preco_no_kit, preco_avulso, garantia_anos"),
      supabase.from("inversores").select("*")
    ])

    const cabosData = cabosRes.data || []
    const estruturasData = estruturasRes.data || []
    const stringBoxesData = stringBoxesRes.data || []
    const inversoresData = inversoresRes.data || []
    const modAll = modAllRes.data

    let limiteMonofasicoKw = 12
    let limiteTrifasicoKw = 75
    if (limitsRes.data && limitsRes.data.length > 0) {
      if (limitsRes.data[0].potencia_max_monofasica_kw) limiteMonofasicoKw = Number(limitsRes.data[0].potencia_max_monofasica_kw)
      if (limitsRes.data[0].potencia_max_trifasica_kw) limiteTrifasicoKw = Number(limitsRes.data[0].potencia_max_trifasica_kw)
    }

    const potenciasDisponiveis = (modAll || [])
      .filter((m: any) => !m.modelo?.startsWith('[DESATIVADO]'))
      .map((m: any) => Number(m.potencia_w))
      .filter(Boolean)

    if (!body.idModulo && body.potenciaPlaca && potenciasDisponiveis.length > 0 && !potenciasDisponiveis.includes(Number(body.potenciaPlaca))) {
      return withCors(NextResponse.json({ error: 'Potência da placa não encontrada no catálogo', provided: body.potenciaPlaca, available: potenciasDisponiveis }, { status: 400 }))
    }

    let moduloQuery = supabase
      .from("modulos")
      .select("id, potencia_w, marca, modelo, preco_kit, preco_avulso, is_tier1, is_bifacial, include_brand_in_name")
      .not('modelo', 'ilike', '[DESATIVADO]%')
      .limit(1)

    if (body.idModulo) {
      moduloQuery = moduloQuery.eq("id", body.idModulo)
    } else {
      moduloQuery = moduloQuery.eq("potencia_w", body.potenciaPlaca)
    }

    // primeira tentativa (exata por id ou potencia)
    let { data: moduloData, error: moduloError } = await moduloQuery.maybeSingle()
    console.log('[v2][api/calcular-kit] módulo query inicial ->', { idModulo: body.idModulo, potenciaPlaca: body.potenciaPlaca, moduloData, moduloError })

    // se não encontrou, tentar procurar o menor módulo com potencia_w >= solicitada
    if (!moduloData) {
      try {
        const potenciaBusca = Number(body.potenciaPlaca)
        console.log('[v2][api/calcular-kit] módulo não encontrado por igualdade, tentando primeiro >=', { potenciaBusca })
        const { data: modGte, error: modGteError } = await supabase
          .from('modulos')
          .select('id, potencia_w, marca, modelo, preco_kit, preco_avulso, is_tier1, is_bifacial, include_brand_in_name')
          .gte('potencia_w', potenciaBusca)
          .not('modelo', 'ilike', '[DESATIVADO]%')
          .order('potencia_w', { ascending: true })
          .limit(1)
          .maybeSingle()
        console.log('[v2][api/calcular-kit] módulo query gte ->', { modGte, modGteError })
        if (modGte) moduloData = modGte
      } catch (e) {
        console.error('[v2][api/calcular-kit] erro ao buscar módulo gte ->', e)
      }
    }

    // última tentativa: pegar qualquer módulo disponível (fallback somente para diagnóstico)
    if (!moduloData) {
      try {
        const { data: anyMod, error: anyModError } = await supabase
          .from('modulos')
          .select('id, potencia_w, marca, modelo, preco_kit, preco_avulso, is_tier1, is_bifacial, include_brand_in_name')
          .not('modelo', 'ilike', '[DESATIVADO]%')
          .order('potencia_w', { ascending: true })
          .limit(1)
        console.log('[v2][api/calcular-kit] módulo query fallback any ->', { anyMod, anyModError })
        if (anyMod && anyMod.length > 0) moduloData = anyMod[0]
      } catch (e) {
        console.error('[v2][api/calcular-kit] erro ao buscar qualquer módulo ->', e)
      }
    }

    if (moduloError) console.error('[v2][api/calcular-kit] moduloError inicial:', moduloError)

    if (!moduloData) {
      console.error('[v2][api/calcular-kit] nenhum módulo encontrado após tentativas')
      return withCors(NextResponse.json({ error: "Módulo não encontrado para a potência informada" }, { status: 404 }))
    }

    const precoModuloUnitario = Number(moduloData.preco_kit) || Number(moduloData.preco_avulso) || 0
    if (precoModuloUnitario <= 0) {
      observacoes.push("Preço do módulo não cadastrado - considerado R$0,00")
    }

    // 🔹 1. Dimensionamento dos módulos com regra do 0,2
    const { quantidade: quantidadeModulos, potenciaAjustada } = calcularQuantidadeModulos(body.potenciaPico, body.potenciaPlaca)
    if (debugFlag) console.log('[v_debug][api/calcular-kit] calcularQuantidadeModulos ->', { quantidadeModulos, potenciaAjustada })

    // 🔹 2. Aplicar limites por tipo de rede
    const dimLim = aplicarLimitesRede(quantidadeModulos, body.potenciaPlaca, tipoInversorNormalizado, body.tipoRede, trafoFlag, trafoKw, limiteMonofasicoKw, limiteTrifasicoKw)
    let quantidadeFinal = dimLim.quantidade
    let potenciaFinal = dimLim.potenciaAjustada
    let quantidadeSaida = quantidadeFinal
    const obsLimites = dimLim.observacoes
    observacoes = [...observacoes, ...obsLimites]
    if (debugFlag) console.log('[v_debug][api/calcular-kit] aplicarLimitesRede ->', { quantidadeFinal, potenciaFinal, obsLimites })

    // If caller requested micro inverters, handle micro-specific flow here (match reference behavior)
    if (tipoInversorNormalizado === 'micro') {
      const dimMicro = calcularQuantidadeModulos(body.potenciaPico, body.potenciaPlaca)
      let qtdModMicro = dimMicro.quantidade

      // CORREÇÃO: Não ajustar quantidade de módulos para ser múltiplo de modulosPorMicro
      // A quantidade de módulos deve ser apenas a necessária para a potência (arredondada para cima),
      // e o modulosPorMicro define apenas quantos inversores serão usados.

      // Manter a quantidade calculada originalmente (arredondada para cima pela regra 0.2 ou simples math)
      // qtdModMicro já vem de calcularQuantidadeModulos que aplica a regra.

      if (body.modulosPorMicro && body.modulosPorMicro > 0) {
        observacoes.push(`Configuração de ${body.modulosPorMicro} módulos por microinversor aplicada para dimensionamento dos inversores.`)
      }

      const inverterSelection = await selecionarInversores(qtdModMicro, body.potenciaPlaca, 'micro', body.tipoRede, inversoresData, requestOverload, trafoFlag, trafoKw, body.modulosPorMicro, limiteMonofasicoKw, limiteTrifasicoKw)
      // Não sobrescrever qtdModMicro - já foi ajustado corretamente acima

      // Estrutura e Cabos em paralelo
      const [estruturaResult, cabosResult] = await Promise.all([
        calcularEstrutura(qtdModMicro, tipoEstruturaNormalizado, estruturasData),
        calcularCabos(qtdModMicro, cabosData, observacoes)
      ])
      const { quantidade: qtdEstr, descricao: descEstr, preco: precoEstr } = estruturaResult

      // Cabos
      const { vermelho: metrosVermelho, preto: metrosPreto, aterramento: metrosAterramento, preco: precoCabos, precoVermelho, precoPreto, precoAterramento } = cabosResult

      // Fetch module unit price from DB (preco_kit preferred)
      let precoModuloUnitario = 0
      try {
        const { data: modRow } = await supabase.from('modulos').select('preco_kit, preco_avulso, marca, modelo').eq('potencia_w', body.potenciaPlaca).limit(1).maybeSingle()
        if (modRow) precoModuloUnitario = Number(modRow.preco_kit) || Number(modRow.preco_avulso) || 0
      } catch (e) {
        console.error('[v0][api/calcular-kit] erro ao buscar preco modulo ->', e)
      }
      const custoMod = qtdModMicro * precoModuloUnitario

      const totalKit = custoMod + inverterSelection.preco + precoEstr + precoCabos

      const kWpVis = Number(((qtdModMicro * body.potenciaPlaca) / 1000).toFixed(2))

      const resultado = `DIMENSIONAMENTO DO KIT FOTOVOLTAICO

MÓDULOS FOTOVOLTAICOS
${qtdModMicro}x ${nomeComercialModulo(moduloData)} = ${kWpVis.toFixed(2)} kWp
Valor (R$ ${precoModuloUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} un): R$ ${custoMod.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

INVERSORES
${inverterSelection.descricao}
Valor: R$ ${inverterSelection.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

STRING BOX
Não aplicável (Micro Inversor)
Valor: R$ ${Number(0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

ESTRUTURA
${descEstr}
Valor: R$ ${precoEstr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

CABOS SOLARES
- Cabo Vermelho: ${metrosVermelho}m
- Cabo Preto: ${metrosPreto}m  
- Cabo Aterramento: ${metrosAterramento}m
Valor Total Cabos: R$ ${precoCabos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

VALOR TOTAL DO KIT: R$ ${totalKit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

${observacoes.length > 0 ? `OBSERVAÇÕES:\n${observacoes.map(obs => `- ${obs}`).join('\n')}` : ''}`

      // Validação básica para statusKit e kitZerado no fluxo micro
      const missingMicro: string[] = []
      if (inverterSelection.quantidade === 0) missingMicro.push('inversor')
      if (qtdEstr === 0) missingMicro.push('estrutura')
      if (precoCabos === 0 || (precoVermelho === -1 || precoPreto === -1 || precoAterramento === -1)) missingMicro.push('cabos')
      const kitZeradoMicro = missingMicro.length > 0
      const statusKitMicro = kitZeradoMicro ? 'Zerado' : 'Completo'

      const kitNameMicro = `Kit Fotovoltaico ${tipoEstruturaLabel} ${kWpVis.toFixed(2)} kWp - ${nomeComercialInversor(inverterSelection.tipo, inverterSelection.marca, Number(inverterSelection.potencia_kw))}`

      const response: any = {
        id: randomUUID(),
        kitName: kitNameMicro,
        resultado,
        valorTotal: Number.parseFloat(totalKit.toFixed(2)),
        statusKit: statusKitMicro,
        kitZerado: kitZeradoMicro,
        detalhes: {
          modulos: { quantidade: qtdModMicro, potencia: body.potenciaPlaca, potenciaTotal: kWpVis, potenciaAjustada: kWpVis },
          componentes: {
            inversores: {
              quantidade: inverterSelection.quantidade,
              descricao: inverterSelection.descricao,
              preco: inverterSelection.preco,
              id: inverterSelection.id,
              marca: inverterSelection.marca,
              modelo: inverterSelection.modelo,
              potencia_kw: inverterSelection.potencia_kw,
              preco_kit: inverterSelection.preco_kit,
              preco_avulso: inverterSelection.preco_avulso,
              tipo: inverterSelection.tipo,
              garantia: inverterSelection.garantia
            },
            stringBox: { quantidade: 0, descricao: 'Não aplicável (Micro Inversor)', preco: 0, id: null, fabricante: null, modelo: null, entradas: 0, saidas: 0, garantia_anos: 0 },
            estrutura: { quantidade: qtdEstr, descricao: descEstr, preco: precoEstr, id: estruturaResult.id, marca: estruturaResult.marca, modelo: estruturaResult.modelo, garantia: estruturaResult.garantia },
            cabos: { vermelho: { metros: metrosVermelho, preco: precoVermelho }, preto: { metros: metrosPreto, preco: precoPreto }, aterramento: { metros: metrosAterramento, preco: precoAterramento } }
          },
          observacoes
        },
        itens: [
          { categoria: 'Módulo', descricao: `${qtdModMicro}x ${nomeComercialModulo(moduloData)}`, quantidade: qtdModMicro, precoUnit: precoModuloUnitario, precoTotal: custoMod },
          { categoria: 'Micro Inversor', descricao: `${inverterSelection.quantidade}x ${nomeComercialInversor(inverterSelection.tipo, inverterSelection.marca, Number(inverterSelection.potencia_kw))}`, quantidade: inverterSelection.quantidade, precoTotal: inverterSelection.preco },
          { categoria: 'String Box', descricao: 'Não aplicável (Micro Inversor)', quantidade: 0, precoTotal: 0 },
          { categoria: 'Estrutura', descricao: descEstr, quantidade: qtdEstr, precoTotal: precoEstr },
          { categoria: 'Cabos', descricao: `Cabo Vermelho ${metrosVermelho}m / Cabo Preto ${metrosPreto}m / Aterramento ${metrosAterramento}m`, quantidade: 1, precoTotal: precoCabos }
        ]
      }

      // Salvar kit no histórico do Firebase
      try {
        const { kitNumber } = await saveKitToHistory({
          potenciaPico: body.potenciaPico,
          potenciaPlaca: body.potenciaPlaca,
          tipoInversor: body.tipoInversor,
          tipoEstrutura: tipoEstruturaLabel,
          tipoRede: body.tipoRede,
          transformador: trafoFlag,
          potenciaTransformacao: (trafoKw ?? null),
          valorTotal: response.valorTotal,
          statusKit: 'Completo',
          detalhes: response.detalhes,
          itens: response.itens,
          observacoes
        });

        // Adicionar número do kit à resposta
        response.kitNumber = kitNumber;
        response.kitReference = kitNumber;

      } catch (historyError) {
        console.error("Erro ao salvar histórico:", historyError);
        // Fallback: tentar salvar novamente no Supabase (kit_historico)
        try {
          const supabase = await createSupabaseServerClient()
          // obter próximo número com base no kit_id existente (formato KIT-xxxxx)
          let nextNumber = 10001
          const { data: recent, error: recentErr } = await supabase
            .from('kit_historico')
            .select('kit_id, created_at')
            .order('created_at', { ascending: false })
            .limit(1)
          if (!recentErr && recent && recent.length > 0) {
            const lastId = recent[0].kit_id as string | null
            const n = Number(String(lastId || '').replace(/[^0-9]/g, ''))
            if (Number.isFinite(n) && n >= 10001) nextNumber = n + 1
          }
          const kit_id = `KIT-${nextNumber}`
          const insertPayload = {
            kit_id,
            resultado_texto: response.resultado,
            valor_total: response.valorTotal,
            detalhes: response.detalhes,
            itens: response.itens,
            meta: {
              potenciaPico: body.potenciaPico,
              potenciaPlaca: body.potenciaPlaca,
              tipoInversor: body.tipoInversor,
              tipoEstrutura: tipoEstruturaLabel,
              tipoRede: body.tipoRede,
              transformador: trafoFlag,
              potenciaTransformacao: (trafoKw ?? null)
            },
            created_at: new Date().toISOString()
          }
          const { error: insertErr } = await supabase.from('kit_historico').insert([insertPayload])
          if (insertErr) {
            console.error('Erro ao salvar kit no Supabase:', insertErr)
          } else {
            response.kitNumber = nextNumber;
            response.kitReference = nextNumber;
          }
        } catch (supabaseError) {
          console.error('Erro ao salvar kit no Supabase fallback:', supabaseError)
        }
      }

      if (!response.kitNumber) {
        try {
          const supabase = await createSupabaseServerClient()
          let nextNumber = 10001
          const { data: recent, error: recentErr } = await supabase
            .from('kit_historico')
            .select('kit_id, created_at')
            .order('created_at', { ascending: false })
            .limit(1)
          if (!recentErr && recent && recent.length > 0) {
            const lastId = recent[0].kit_id as string | null
            const n = Number(String(lastId || '').replace(/[^0-9]/g, ''))
            if (Number.isFinite(n) && n >= 10001) nextNumber = n + 1
          }
          const kit_id = `KIT-${nextNumber}`
          const insertPayload = {
            kit_id,
            resultado_texto: response.resultado,
            valor_total: response.valorTotal,
            detalhes: response.detalhes,
            itens: response.itens,
            meta: {
              potenciaPico: body.potenciaPico,
              potenciaPlaca: body.potenciaPlaca,
              tipoInversor: body.tipoInversor,
              tipoEstrutura: tipoEstruturaLabel,
              tipoRede: body.tipoRede,
              transformador: (body.transformador ?? null),
              potenciaTransformacao: (body.potenciaTransformacao ?? null)
            },
            created_at: new Date().toISOString()
          }
          const { error: insertErr } = await supabase.from('kit_historico').insert([insertPayload])
          if (!insertErr) {
            response.kitNumber = nextNumber
            response.kitReference = nextNumber
          }
        } catch { }
      }
      const res = NextResponse.json(response)
      return withCors(res)
    }

    // 🔹 3. Seleção do inversor
    let quantidadeInversores = 0
    let descricaoInversor = ''
    let precoInversores = 0
    let obsInversor: string[] = []
    let potenciaUnitaria = 0

    // track the resolved inverter type selected by the algorithm (may differ from requested input)
    let selectedTipoInversor: "string" | "micro" = tipoInversorNormalizado

    if (body.condicaoInversor === 'usuario-define') {
      if (!body.idInversor) {
        return withCors(NextResponse.json({ error: 'idInversor é obrigatório quando condicaoInversor = usuario-define' }, { status: 400 }))
      }
      // buscar inversor específico e validar
      const { data: invData, error: invErr } = await supabase.from('inversores').select('*').eq('id', body.idInversor).maybeSingle()
      if (invErr || !invData) {
        return withCors(NextResponse.json({ error: 'Inversor escolhido não encontrado no catálogo', idInversor: body.idInversor }, { status: 400 }))
      }
      // determine inverter tipo from catalog entry
      const invTipoNorm = ((invData.tipo || '') as string).toString().toLowerCase()
      const invModeloNorm = ((invData.modelo || '') as string).toString().toLowerCase()
      const invMarcaNorm = ((invData.marca || '') as string).toString().toLowerCase()
      const invIsMicro = invTipoNorm.includes('micro') || invModeloNorm.includes('micro') || invMarcaNorm.includes('micro')
      // if caller explicitly requested 'string' but selected inverter is micro, reject to avoid inconsistent output
      if (tipoInversorNormalizado === 'string' && invIsMicro) {
        return withCors(NextResponse.json({ error: 'Inversor escolhido é do tipo MICRO, mas a simulação foi solicitada para tipo STRING' }, { status: 400 }))
      }
      // normaliza potencia
      let potInv = toKW(invData.potencia_kw, invData.tipo, invData.modelo, invData.marca)
      // checar topologia
      const invTopo = ((invData.fases || invData.tipo) || '').toString().toLowerCase()
      const topoOk = body.tipoRede === 'trifasico' ? (invTopo.includes('tri') || invTopo.includes('trif')) : (invTopo.includes('mono') || invTopo.includes('monof'))
      // checar capacidade (potencia total em kW)
      const potenciaTotal = (quantidadeFinal * body.potenciaPlaca) / 1000
      // considerar overload cadastrado no inversor
      const overloadInv = normalizeOverload(invData.overload_usado)
      const potInvEfectiva = potInv * (1 + overloadInv)
      const supports = potInvEfectiva >= potenciaTotal
      const effectiveSupports = (typeof requestOverload === 'number') ? (potInv * (1 + requestOverload) >= potenciaTotal) : supports
      if (debugFlag) console.log('[v_debug][api/calcular-kit] Validação usuario-define ->', { idInversor: body.idInversor, potenciaTotal, potInv, overloadInv, potInvEfectiva, supports, effectiveSupports, topoOk })
      if (!topoOk || !effectiveSupports) {
        return withCors(NextResponse.json({ error: 'Inversor escolhido não é compatível com a potência ou topologia solicitada', idInversor: body.idInversor, topoOk, supports: effectiveSupports, potenciaTotal, potInv }, { status: 400 }))
      }
      quantidadeInversores = 1
      // choose potenciaUnitaria using requestOverload if provided, else invData.overload_usado
      const chosenOverload = (typeof requestOverload === 'number') ? requestOverload : overloadInv
      const potUnitariaFinal = potInv * (1 + chosenOverload)
      potenciaUnitaria = potUnitariaFinal
      descricaoInversor = `1x ${invData.nome || nomeComercialInversor(invData.tipo || invData.fases, invData.marca, potInv)} (Overload ${(chosenOverload * 100).toFixed(0)}%)`
      precoInversores = Number(invData.preco_kit) || Number(invData.preco_avulso) || 0
      obsInversor.push('Inversor definido pelo usuário e validado com sucesso')
      // set the resolved tipo based on catalog info
      selectedTipoInversor = invIsMicro ? 'micro' : 'string'
      // Store inverter data for response
      var inverterData = {
        id: body.idInversor,
        marca: invData.marca,
        modelo: invData.modelo,
        potencia_kw: potInv,
        preco_kit: Number(invData.preco_kit) || 0,
        preco_avulso: Number(invData.preco_avulso) || 0,
        tipo: selectedTipoInversor,
        garantia: Number(invData.garantia) || 0
      }
    } else {
      if (debugFlag) console.log('[v_debug][api/calcular-kit] Chamando selecionarInversores ->', { quantidadeFinal, potenciaPlaca: body.potenciaPlaca, tipoInversor: body.tipoInversor, tipoRede: body.tipoRede, requestOverload })
      const sel = await selecionarInversores(quantidadeFinal, body.potenciaPlaca, tipoInversorNormalizado, body.tipoRede, inversoresData, requestOverload, trafoFlag, trafoKw, body.modulosPorMicro, limiteMonofasicoKw, limiteTrifasicoKw)
      if (debugFlag) console.log('[v_debug][api/calcular-kit] Resultado selecionarInversores ->', sel)

      // TRATAMENTO DE LIMITE ESTRITO (Solicitação User - Correção 6)
      if ((sel as any).limitExceeded) {
        return withCors(NextResponse.json({
          id: randomUUID(),
          kitName: `Kit Fotovoltaico - Limite Excedido`,
          resultado: "Limite Potência Inversor Excedido",
          valorTotal: 0,
          statusKit: 'Erro',
          kitZerado: true,
          detalhes: {
            modulos: { quantidade: 0, potencia: body.potenciaPlaca, potenciaTotal: 0 },
            componentes: {
              inversores: { quantidade: 0, descricao: "Limite Potência Inversor Excedido", preco: 0 },
              stringBox: { quantidade: 0, descricao: "", preco: 0 },
              estrutura: { quantidade: 0, descricao: "", preco: 0 },
              cabos: { vermelho: { metros: 0, preco: 0 }, preto: { metros: 0, preco: 0 }, aterramento: { metros: 0, preco: 0 } }
            },
            observacoes: sel.observacoes
          },
          itens: [
            { categoria: '', descricao: "Limite Potência Inversor Excedido", quantidade: 0, precoTotal: 0 }
          ]
        }))
      }

      quantidadeInversores = sel.quantidade
      descricaoInversor = sel.descricao
      precoInversores = sel.preco
      obsInversor = sel.observacoes
      potenciaUnitaria = sel.potenciaUnitaria
      // adopt selected tipo from selector so downstream logic (string box) is consistent
      selectedTipoInversor = sel.tipo || selectedTipoInversor
      // Store inverter data for response
      var inverterData = {
        id: sel.id,
        marca: sel.marca,
        modelo: sel.modelo,
        potencia_kw: sel.potencia_kw,
        preco_kit: sel.preco_kit,
        preco_avulso: sel.preco_avulso,
        tipo: sel.tipo,
        garantia: sel.garantia
      }
      if (selectedTipoInversor === 'string' && tipoRedeNormalizado === 'monofasico') {
        const ovAplicado = (typeof requestOverload === 'number') ? requestOverload : (sel as any).overload_aplicado || 0
        const capacidadeDCkW = quantidadeInversores * potenciaUnitaria * (1 + (ovAplicado || 0))
        const qtdMaxModulosPorCapacidade = Math.floor((capacidadeDCkW * 1000) / Number(body.potenciaPlaca))
        if (Number.isFinite(qtdMaxModulosPorCapacidade) && qtdMaxModulosPorCapacidade > 0) {
          const quantidadeCalc = qtdMaxModulosPorCapacidade
          const potenciaCalc = (quantidadeCalc * Number(body.potenciaPlaca)) / 1000
          quantidadeSaida = quantidadeCalc
          potenciaFinal = potenciaCalc
          observacoes.push(`Capacidade DC pelos inversores: ${capacidadeDCkW.toFixed(2)} kW → módulos limitados a ${quantidadeCalc}`)
        }
      }
    }
    if (debugFlag) console.log('[v_debug][api/calcular-kit] Inversor escolhido resumo ->', { quantidadeInversores, descricaoInversor, precoInversores, potenciaUnitaria, obsInversor })
    observacoes = [...observacoes, ...obsInversor]
    console.log('[v0][api/calcular-kit] Inversor selection:', { quantidadeInversores, descricaoInversor, precoInversores, obsInversor, potenciaUnitaria })

    // 🔹 Validação de limites da concessionária para inversores string
    if (selectedTipoInversor === 'string') {
      const potenciaTotalInversores = quantidadeInversores * potenciaUnitaria
      const validacao = await validarLimitesConcessionaria(tipoRedeNormalizado, potenciaTotalInversores, supabase, trafoFlag, trafoKw, limiteMonofasicoKw, limiteTrifasicoKw)

      if (!validacao.valido) {
        return withCors(NextResponse.json({
          error: validacao.mensagem,
          suggestion: tipoRedeNormalizado === 'monofasico'
            ? `Reduza a potência total dos inversores para ≤ ${validacao.limite} kW ou selecione rede trifásica.`
            : `Reduza a potência total dos inversores para ≤ ${validacao.limite} kW.`
        }, { status: 400 }))
      }
    }

    // Extrair potência do inversor para string box
    const potenciaInversor = potenciaUnitaria
    // 🔹 4, 5, 6. Componentes em paralelo (String Box, Estrutura, Cabos)
    const [stringBoxResult, estruturaResult, cabosResult] = await Promise.all([
      calcularStringBox(quantidadeInversores, potenciaInversor, selectedTipoInversor, stringBoxesData, observacoes),
      calcularEstrutura(quantidadeSaida, tipoEstruturaNormalizado, estruturasData),
      calcularCabos(quantidadeSaida, cabosData, observacoes)
    ])

    const { quantidade: quantidadeStringBox, descricao: descricaoStringBox, preco: precoStringBox } = stringBoxResult
    console.log('[v0][api/calcular-kit] StringBox selection:', { quantidadeStringBox, descricaoStringBox, precoStringBox })

    const { quantidade: quantidadeEstrutura, descricao: descricaoEstrutura, preco: precoEstrutura } = estruturaResult
    console.log('[v0][api/calcular-kit] Estrutura selection:', { quantidadeEstrutura, descricaoEstrutura, precoEstrutura })

    const { vermelho: metrosVermelho, preto: metrosPreto, aterramento: metrosAterramento, preco: precoCabos, precoVermelho, precoPreto, precoAterramento } = cabosResult
    console.log('[v0][api/calcular-kit] Cabos calc:', { metrosVermelho, metrosPreto, metrosAterramento, precoCabos, precoVermelho, precoPreto, precoAterramento })

    // 🔹 Validação de kit zerado
    const missing: string[] = []
    if ((selectedTipoInversor === 'string' || selectedTipoInversor === 'micro') && quantidadeInversores === 0) missing.push('inversor')
    if (selectedTipoInversor === 'string' && quantidadeStringBox === 0) missing.push('string_box')
    if (quantidadeEstrutura === 0) missing.push('estrutura')
    if (precoCabos === 0 || (precoVermelho === -1 || precoPreto === -1 || precoAterramento === -1)) missing.push('cabos')

    // Variável de validação para kit zerado
    const kitZerado = missing.length > 0
    const statusKit = kitZerado ? 'Zerado' : 'Completo'

    if (kitZerado) {
      console.error('[v0][api/calcular-kit] Missing required components:', missing)

      // Diagnostics: check if relevant tables contain any rows to help the caller
      try {
        // Coletar amostras mais completas para diagnóstico (retornar algumas linhas completas)
        const [invRes, boxRes, estrRes, modRes, cabRes] = await Promise.all([
          supabase.from('inversores').select('*').limit(50),
          supabase.from('string_boxes').select('*').limit(50),
          supabase.from('estruturas').select('*').limit(50),
          supabase.from('modulos').select('*').limit(50),
          supabase.from('cabos').select('*').limit(50)
        ])

        const diagnostics = {
          inversores_present: Array.isArray(invRes.data) && invRes.data.length > 0,
          string_boxes_present: Array.isArray(boxRes.data) && boxRes.data.length > 0,
          estruturas_present: Array.isArray(estrRes.data) && estrRes.data.length > 0,
          modulos_present: Array.isArray(modRes.data) && modRes.data.length > 0,
          cabos_present: Array.isArray(cabRes.data) && cabRes.data.length > 0,
          inversores_sample: invRes.data || [],
          string_boxes_sample: boxRes.data || []
        }

        const suggestion = "Verifique os valores de entrada (ex.: potenciaPlaca) e o catálogo. Se alguma das flags diagnostics for false, preencha o catálogo via telas de cadastro ou importe os dados de teste.";

        return withCors(NextResponse.json({
          error: 'Nenhum kit válido encontrado',
          statusKit,
          kitZerado,
          missing,
          diagnostics,
          suggestion
        }, { status: 400 }))
      } catch (diagErr) {
        console.error('[v0][api/calcular-kit] erro ao coletar diagnostics ->', diagErr)
        return withCors(NextResponse.json({
          error: 'Nenhum kit válido encontrado',
          statusKit,
          kitZerado,
          missing
        }, { status: 400 }))
      }
    }

    // 🔹 7. Custos
    const precoModulos = quantidadeSaida * precoModuloUnitario

    // Calcular conectores MC4
    // Nova regra: para Microinversor -> 1 kit MC4 por módulo (qtd = quantidadeFinal), preço do kit por módulo = KIT_MC4_PRECO
    // Para String -> não adicionar kit MC4 (assumimos integrados ou fornecidos em kits de módulo)
    const KIT_MC4_PRECO = 29.9 // preço por módulo (kit) para microinversor
    let quantidadeConectoresMC4 = 0
    let precoConectoresMC4 = 0
    if (selectedTipoInversor === "micro") {
      quantidadeConectoresMC4 = quantidadeFinal
      precoConectoresMC4 = quantidadeConectoresMC4 * KIT_MC4_PRECO
    }

    const valorTotal = precoModulos + precoInversores + precoStringBox + precoEstrutura + precoCabos + precoConectoresMC4

    // Resultado formatado (texto limpo, sem emojis para compatibilidade de consoles)
    const resultado = `DIMENSIONAMENTO DO KIT FOTOVOLTAICO

MÓDULOS FOTOVOLTAICOS
${quantidadeSaida}x ${nomeComercialModulo(moduloData)} = ${potenciaFinal.toFixed(2)} kWp
Valor (R$ ${precoModuloUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} un): R$ ${precoModulos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}

INVERSORES
${descricaoInversor}
Valor: R$ ${precoInversores.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}

STRING BOX
${descricaoStringBox}
Valor: R$ ${precoStringBox.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}

ESTRUTURA
${descricaoEstrutura}
Valor: R$ ${precoEstrutura.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}

CABOS SOLARES
- Cabo Vermelho: ${metrosVermelho}m
- Cabo Preto: ${metrosPreto}m  
- Cabo Aterramento: ${metrosAterramento}m
Valor Total Cabos: R$ ${precoCabos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}

${quantidadeConectoresMC4 > 0 ? `CONECTORES MC4\n${quantidadeConectoresMC4}x Kit Conector MC4 (1 por módulo)\nValor: R$ ${precoConectoresMC4.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n\n` : ''}

VALOR TOTAL DO KIT: R$ ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}

${observacoes.length > 0 ? `OBSERVAÇÕES:\n${observacoes.map(obs => `- ${obs}`).join('\n')}` : ''}`

    const kitNameString = `Kit Fotovoltaico ${tipoEstruturaLabel} ${potenciaFinal.toFixed(2)} kWp - ${nomeComercialInversor(inverterData.tipo, inverterData.marca, Number(inverterData.potencia_kw))}`
    const response: any = {
      id: randomUUID(),
      kitName: kitNameString,
      resultado,
      valorTotal: Number.parseFloat(valorTotal.toFixed(2)),
      statusKit,
      kitZerado,
      detalhes: {
        modulos: {
          quantidade: quantidadeSaida,
          potencia: body.potenciaPlaca,
          potenciaTotal: potenciaFinal,
          potenciaAjustada: potenciaFinal
        },
        componentes: {
          inversores: {
            quantidade: quantidadeInversores,
            descricao: descricaoInversor,
            preco: precoInversores,
            id: inverterData?.id ?? null,
            marca: inverterData?.marca ?? null,
            modelo: inverterData?.modelo ?? null,
            potencia_kw: inverterData?.potencia_kw ?? 0,
            preco_kit: inverterData?.preco_kit ?? 0,
            preco_avulso: inverterData?.preco_avulso ?? 0,
            tipo: inverterData?.tipo ?? selectedTipoInversor,
            garantia: inverterData?.garantia ?? 0
          },
          stringBox: {
            quantidade: quantidadeStringBox,
            descricao: descricaoStringBox,
            preco: precoStringBox,
            id: stringBoxResult.id,
            fabricante: stringBoxResult.fabricante,
            modelo: stringBoxResult.modelo,
            entradas: stringBoxResult.entradas,
            saidas: stringBoxResult.saidas,
            garantia_anos: stringBoxResult.garantia_anos
          },
          estrutura: {
            quantidade: quantidadeEstrutura,
            descricao: descricaoEstrutura,
            preco: precoEstrutura,
            id: estruturaResult.id,
            marca: estruturaResult.marca,
            modelo: estruturaResult.modelo,
            garantia: estruturaResult.garantia
          },
          cabos: {
            vermelho: { metros: metrosVermelho, preco: precoVermelho },
            preto: { metros: metrosPreto, preco: precoPreto },
            aterramento: { metros: metrosAterramento, preco: precoAterramento },
          },
          ...(quantidadeConectoresMC4 > 0 ? { conectoresMC4: { quantidade: quantidadeConectoresMC4, preco: precoConectoresMC4 } } : {})
        },
        observacoes
      },
      itens: [
        { categoria: 'Módulo', descricao: `${quantidadeSaida}x ${nomeComercialModulo(moduloData)}`, quantidade: quantidadeSaida, precoUnit: precoModuloUnitario, precoTotal: precoModulos },
        { categoria: 'Inversor', descricao: `${quantidadeInversores}x ${nomeComercialInversor(inverterData.tipo, inverterData.marca, Number(inverterData.potencia_kw))}`, quantidade: quantidadeInversores, precoTotal: precoInversores },
        ...(quantidadeStringBox > 0 ? [{ categoria: 'String Box', descricao: descricaoStringBox, quantidade: quantidadeStringBox, precoTotal: precoStringBox }] : []),
        { categoria: 'Estrutura', descricao: descricaoEstrutura, quantidade: quantidadeEstrutura, precoTotal: precoEstrutura },
        { categoria: 'Cabos', descricao: `Cabo Vermelho ${metrosVermelho}m / Cabo Preto ${metrosPreto}m / Aterramento ${metrosAterramento}m`, quantidade: 1, precoTotal: precoCabos },
        ...(quantidadeConectoresMC4 > 0 ? [{ categoria: 'Conectores MC4', descricao: `${quantidadeConectoresMC4}x Kit Conector MC4 (1 por módulo)`, quantidade: quantidadeConectoresMC4, precoTotal: precoConectoresMC4 }] : [])
      ]
    }
    // anexar debugData se disponível (modo debug)
    if (debugData) response.debug = debugData

    // Salvar kit no histórico do Firebase
    try {
      const { kitNumber } = await saveKitToHistory({
        potenciaPico: body.potenciaPico,
        potenciaPlaca: body.potenciaPlaca,
        tipoInversor: body.tipoInversor,
        tipoEstrutura: tipoEstruturaLabel,
        tipoRede: body.tipoRede,
        transformador: body.transformador,
        potenciaTransformacao: body.potenciaTransformacao,
        valorTotal: response.valorTotal,
        statusKit: response.statusKit,
        detalhes: response.detalhes,
        itens: response.itens,
        observacoes: response.observacoes
      });

      // Adicionar número do kit à resposta
      response.kitNumber = kitNumber;
      response.kitReference = kitNumber;

    } catch (historyError) {
      console.error("Erro ao salvar histórico:", historyError);
      // Fallback: tentar salvar novamente no Supabase (kit_historico)
      try {
        const supabase = await createSupabaseServerClient()
        // obter próximo número com base no kit_id existente (formato KIT-xxxxx)
        let nextNumber = 10001
        const { data: recent, error: recentErr } = await supabase
          .from('kit_historico')
          .select('kit_id, created_at')
          .order('created_at', { ascending: false })
          .limit(1)
        if (!recentErr && recent && recent.length > 0) {
          const lastId = recent[0].kit_id as string | null
          const n = Number(String(lastId || '').replace(/[^0-9]/g, ''))
          if (Number.isFinite(n) && n >= 10001) nextNumber = n + 1
        }
        const kit_id = `KIT-${nextNumber}`
        const insertPayload = {
          kit_id,
          resultado_texto: response.resultado,
          valor_total: response.valorTotal,
          detalhes: response.detalhes,
          itens: response.itens,
          meta: {
            potenciaPico: body.potenciaPico,
            potenciaPlaca: body.potenciaPlaca,
            tipoInversor: body.tipoInversor,
            tipoEstrutura: tipoEstruturaLabel,
            tipoRede: body.tipoRede,
            transformador: (body.transformador ?? null),
            potenciaTransformacao: (body.potenciaTransformacao ?? null),
            statusKit: response.statusKit,
          }
        }
        const { error: insErr } = await supabase.from('kit_historico').insert([insertPayload])
        if (insErr) {
          console.error('Fallback Supabase insert failed:', insErr)
          response.historyError = 'Erro ao salvar histórico'
        } else {
          response.kitNumber = nextNumber
          response.kitReference = nextNumber
        }
      } catch (sbErr) {
        console.error('Supabase fallback error:', sbErr)
        response.historyError = 'Erro ao salvar histórico'
      }
    }

    const res = NextResponse.json(response)
    return withCors(res)
  } catch (error) {
    console.error("Erro no cálculo do kit:", error)
    const res = NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    return withCors(res)
  }

  // Validação: limite monofásico por concessionária (soma das potências de inversores)
  try {
    if (body.tipoRede && String(body.tipoRede).toLowerCase() === 'monofasico') {
      let limiteMonofasicoKw = 12
      try {
        const supabase = await createSupabaseServerClient()
        const { data } = await supabase
          .from('concessionarias')
          .select('potencia_max_monofasica_kw, potencia_max_trifasica_kw, created_at')
          .order('created_at', { ascending: false })
          .limit(1)
        if (data && data.length > 0) {
          const reg = data[0] as any
          if (reg.potencia_max_monofasica_kw) {
            limiteMonofasicoKw = Number(reg.potencia_max_monofasica_kw)
          }
        }
      } catch { }

      const inv = (response as any)?.detalhes?.componentes?.inversores || {}
      const potenciaUnit = Number(inv.potencia_kw || 0) || (() => {
        const desc = String(inv.descricao || '')
        const m = desc.match(/(\d+[\.,]?\d*)\s*kW/i)
        return m ? Number(String(m[1]).replace(',', '.')) : 0
      })()
      const qtd = Number(inv.quantidade || 0)
      const somaKw = Number((potenciaUnit * qtd).toFixed(2))
      const limiteEfetivo = (trafoFlag && typeof trafoKw === 'number' && trafoKw > 0) ? Number(trafoKw) : limiteMonofasicoKw
      if (somaKw > limiteEfetivo) {
        const msg = `Limite monofásico: ${limiteEfetivo} kW. Soma das potências dos inversores: ${somaKw} kW.`
        const suggestion = `Reduza a potência total dos inversores para ≤ ${limiteEfetivo} kW${trafoFlag ? ' (ajuste a potência do transformador se necessário).' : ' ou selecione rede trifásica.'}`
        const resErr = NextResponse.json({ error: msg, suggestion }, { status: 400 })
        return withCors(resErr)
      }
    }

    // Validação: limite trifásico por concessionária (soma das potências de inversores)
    if (body.tipoRede && String(body.tipoRede).toLowerCase() === 'trifasico') {
      let limiteTrifasicoKw = 75
      try {
        const supabase = await createSupabaseServerClient()
        const { data } = await supabase
          .from('concessionarias')
          .select('potencia_max_monofasica_kw, potencia_max_trifasica_kw, created_at')
          .order('created_at', { ascending: false })
          .limit(1)
        if (data && data.length > 0) {
          const reg = data[0] as any
          if (reg.potencia_max_trifasica_kw) {
            limiteTrifasicoKw = Number(reg.potencia_max_trifasica_kw)
          }
        }
      } catch { }

      const inv = (response as any)?.detalhes?.componentes?.inversores || {}
      const potenciaUnit = Number(inv.potencia_kw || 0) || (() => {
        const desc = String(inv.descricao || '')
        const m = desc.match(/(\d+[\.,]?\d*)\s*kW/i)
        return m ? Number(String(m[1]).replace(',', '.')) : 0
      })()
      const qtd = Number(inv.quantidade || 0)
      const somaKw = Number((potenciaUnit * qtd).toFixed(2))
      const limiteEfetivo = (trafoFlag && typeof trafoKw === 'number' && trafoKw > 0) ? Number(trafoKw) : limiteTrifasicoKw
      if (somaKw > limiteEfetivo) {
        const msg = `Limite trifásico: ${limiteEfetivo} kW. Soma das potências dos inversores: ${somaKw} kW.`
        const suggestion = `Reduza a potência total dos inversores para ≤ ${limiteEfetivo} kW${trafoFlag ? ' (ajuste a potência do transformador se necessário).' : '.'}`
        const resErr = NextResponse.json({ error: msg, suggestion }, { status: 400 })
        return withCors(resErr)
      }
    }
  } catch { }
}

export async function GET() {
  const documentation = {
    endpoint: "/api/calcular-kit",
    method: "POST",
    description:
      "Calcula automaticamente os componentes e valor total de um kit fotovoltaico com base em todos os parâmetros de entrada. Respeita os limites de potência definidos pela concessionária.",
    requestBody: {
      potenciaPico: "number (kWp) - Potência desejada do sistema em quilowatts-pico",
      potenciaPlaca: "number (610 | 700) - Potência da placa em Watts (610W ou 700W)",
      tipoInversor: "string ('string' | 'micro') - Tipo do inversor: String ou Micro Inversor (case-insensitive)",
      tipoEstrutura: "string ('telhado' | 'solo') - Tipo da estrutura de fixação (case-insensitive)",
      condicaoInversor: "string ('calcular' | 'usuario-define') - Se o sistema calcula ou usuário define",
      tipoRede: "string ('monofasico' | 'trifasico') - Tipo da rede elétrica do cliente",
      transformador: "string ('sim' | 'nao') - Opcional. Indica se há transformador (case-insensitive)",
      potenciaTransformacao: "number (kW) - Opcional. Potência do transformador em kW (obrigatório quando transformador='sim')",
    },
    powerLimits: {
      description: "O sistema valida automaticamente os limites de potência por concessionária",
      monofasico: "Limite máximo para sistemas monofásicos (padrão: 12kW, configurável por concessionária)",
      trifasico: "Limite máximo para sistemas trifásicos (padrão: 75kW, configurável por concessionária)",
      microinversores: "Limites aplicados com base na soma das potências dos microinversores",
      string: "Limites aplicados com base na soma das potências dos inversores string",
    },
    response: {
      resultado: "string - Resultado formatado como texto legível",
      valorTotal: "number - Valor total do kit em R$",
      statusKit: "string - Status do kit: 'Completo' ou 'Zerado'",
      kitZerado: "boolean - true se o kit está zerado (faltam componentes), false se está completo",
      detalhes: {
        modulos: {
          quantidade: "number - Quantidade de módulos necessários",
          potencia: "number - Potência de cada módulo em Wp",
          potenciaTotal: "number - Potência total do sistema em kWp",
          potenciaAjustada: "number - Potência ajustada após aplicação de limites"
        },
        componentes: {
          inversores: {
            quantidade: "number - Quantidade de inversores",
            descricao: "string - Descrição do inversor",
            preco: "number - Preço total dos inversores",
            id: "string - ID do inversor",
            marca: "string - Marca do inversor",
            modelo: "string - Modelo do inversor",
            potencia_kw: "number - Potência do inversor em kW",
            preco_kit: "number - Preço do inversor no kit",
            preco_avulso: "number - Preço avulso do inversor",
            tipo: "string - Tipo do inversor (string ou micro)",
            garantia: "number - Tempo de garantia do inversor em anos"
          },
          stringBox: {
            quantidade: "number - Quantidade de string boxes",
            descricao: "string - Descrição da string box",
            preco: "number - Preço total das string boxes",
            id: "string - ID da string box",
            fabricante: "string - Fabricante da string box",
            modelo: "string - Modelo da string box",
            entradas: "number - Número de entradas",
            saidas: "number - Número de saídas",
            garantia_anos: "number - Tempo de garantia em anos"
          },
          estrutura: {
            quantidade: "number - Quantidade de estruturas",
            descricao: "string - Descrição da estrutura",
            preco: "number - Preço total da estrutura",
            id: "string - ID da estrutura",
            marca: "string - Marca da estrutura",
            modelo: "string - Modelo da estrutura",
            garantia: "number - Tempo de garantia da estrutura em anos"
          },
          cabos: {
            vermelho: { metros: "number - Metros de cabo vermelho", preco: "number - Preço do cabo vermelho" },
            preto: { metros: "number - Metros de cabo preto", preco: "number - Preço do cabo preto" },
            aterramento: { metros: "number - Metros de cabo de aterramento", preco: "number - Preço do cabo de aterramento" }
          }
        },
        observacoes: "array - Lista de observações sobre o cálculo"
      },
      itens: "array - Lista de itens do kit com categoria, descrição, quantidade e preço"
    },
    examples: {
      success: {
        request: {
          potenciaPico: 12.6,
          potenciaPlaca: 700,
          tipoInversor: "string",
          tipoEstrutura: "telhado",
          condicaoInversor: "calcular",
          tipoRede: "monofasico",
        },
        response: {
          resultado: `Módulos: 18 x Módulo Fotovoltaico 700 Wp → 12.60 kWp

Inversores:
- 2x Inversor 10 kW (Monofásica) → R$ 20.000,00

String Box:
- 1x String Box 1000V 32A 3E/3S → R$ 799,90 (Subtotal R$ 799,90)

Estrutura:
- 5x Kit Estrutura Telhado p/ 4 Mód → R$ 400,00 (Subtotal R$ 2.000,00)

Cabos Solar:
- Cabo Solar Vermelho 6mm: 90 m x R$ 6,00 = R$ 540,00
- Cabo Solar Preto 6mm: 90 m x R$ 6,00 = R$ 540,00
- Cabo Solar Verde 6mm: 54 m x R$ 6,00 = R$ 324,00

Conectores MC4:
- 72x Conector MC4 → R$ 8,00 = R$ 576,00

Valor Total do Kit Fotovoltaico: R$ 24.985,90`,
          valorTotal: 24985.9,
          statusKit: "Completo",
          kitZerado: false,
          detalhes: {
            modulos: {
              quantidade: 18,
              potencia: 700,
              potenciaTotal: 12.6,
            },
            componentes: {
              inversores: { quantidade: 2, preco: 20000.0 },
              stringBox: { quantidade: 1, preco: 799.9 },
              estrutura: { quantidade: 5, preco: 2000.0 },
              cabos: {
                vermelho: { metros: 90, preco: 540.0 },
                preto: { metros: 90, preco: 540.0 },
                aterramento: { metros: 54, preco: 324.0 },
              },
              conectoresMC4: { quantidade: 72, preco: 576.0 },
            },
          },
        },
      },
      kitZerado: {
        request: {
          potenciaPico: 50,
          potenciaPlaca: 700,
          tipoInversor: "string",
          tipoEstrutura: "telhado",
          condicaoInversor: "calcular",
          tipoRede: "monofasico",
        },
        response: {
          error: "Nenhum kit válido encontrado",
          statusKit: "Zerado",
          kitZerado: true,
          missing: ["inversor"],
          diagnostics: {
            inversores_present: false,
            string_boxes_present: true,
            estruturas_present: true,
            modulos_present: true,
            cabos_present: true,
            inversores_sample: [],
            string_boxes_sample: []
          },
          suggestion: "Verifique os valores de entrada (ex.: potenciaPlaca) e o catálogo. Se alguma das flags diagnostics for false, preencha o catálogo via telas de cadastro ou importe os dados de teste."
        }
      }
    }
  }

  return withCors(NextResponse.json(documentation))
}
