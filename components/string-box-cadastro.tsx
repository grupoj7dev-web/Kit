"use client"

import type React from "react"
import { useMemo, useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createBrowserClient } from "@supabase/ssr"
import { useToast } from "@/hooks/use-toast"

interface Fornecedor {
  id: string // Changed from number to string for UUID
  nome: string
}

interface StringBox {
  id?: string
  nome?: string
  fornecedor_id?: string
  fornecedores?: { id: string; nome: string } | null

  // possible DB/camelCase variants returned from API
  fabricante?: string
  modelo?: string
  descricao?: string

  // different naming variants
  tensao_maxima?: number
  tensao_max_vdc?: number
  corrente_maxima?: number
  corrente_max_a?: number

  entradas?: number
  saidas?: number
  num_entradas?: number
  num_saidas?: number

  mppt_compartilhado?: boolean
  mpptCompartilhado?: boolean

  // protections
  isolador_cc?: boolean
  tem_isolador_cc?: boolean
  temIsoladorCC?: boolean
  isolador_corrente_a?: number
  isoladorCorrenteA?: number
  isolador_norma?: string
  isoladorNorma?: string

  fusivel_por_entrada?: boolean
  tem_fusivel_por_entrada?: boolean
  temFusivelPorEntrada?: boolean
  fusivel_corrente_a?: number
  fusivelCorrenteA?: number
  fusivel_norma?: string
  fusivelNorma?: string

  spd_classe?: string
  spd_tensao_uc_v?: number
  spd_corrente_imax_ka?: number
  spd_norma?: string

  tem_diodo_bloqueio?: boolean
  tem_protecao_polaridade?: boolean
  tem_afci?: boolean

  tipo_conector?: string
  tipoConector?: string
  bitolas_entrada?: string
  bitolasSaida?: string
  bitolas_saida?: string
  prensa_cabos?: string
  prensaCabos?: string
  aterramento_interno?: boolean
  aterramentoInterno?: boolean
  ip_grau?: string
  ipGrau?: string
  material_carcaca?: string
  materialCarcaca?: string
  cor_carcaca?: string
  corCarcaca?: string
  dimensoes?: string
  peso_kg?: number
  pesoKg?: number
  temp_operacao?: string
  tempOperacao?: string
  montagem?: string

  t_voc_max_string?: number
  tVocMaxString?: number
  isc_max_string_a?: number
  iscMaxStringA?: number

  norma_montagem?: string
  garantia_anos?: number
  garantiaAnos?: number

  preco_no_kit?: number
  preco_no_kit_formatted?: string
  precoAvulso?: number
  preco_avulso?: number

  spd_integrado?: boolean
  afci_integrado?: boolean

  codigos_normas?: string
  url_datasheet?: string
  url_manual?: string
  url_certificado?: string
  observacoes?: string

  created_at?: string
}

// Tela de Cadastro de String Box para compor o kit fotovoltaico
// ----------------------------------------------------------------------------
// 📖 DOCUMENTAÇÃO (atualizada)
// Objetivo
//   Cadastrar uma String Box CC padronizada para composição de kits fotovoltaicos
//   e vinculação a inversores por faixa (3 kW, 8–10 kW etc.).
// Escopo
//   • Identificação (fabricante, modelo, descrição)
//   • Especificações elétricas (tensão/corrente máximas, entradas/saídas, MPPT compartilhado)
//   • Proteções (isolador CC, fusível por entrada, SPD, diodo, polaridade, AFCI)
//   • Conexões & construção (conector, bitolas, IP, material, dimensões, peso, montagem)
//   • Compatibilidade & aplicação (Voc/Isc máximos por string, normas, tabela por inversor)
//   • Comerciais essenciais (Preço no Kit, Preço Avulso, Garantia)
//   • Documentos & Normas (datasheet, manual, certificados)
// Campos REMOVIDOS (solicitação do usuário)
//   • Lead time (dias), Moeda, Estoque atual (un), País de origem, SKU interno
// Renomeações
//   • "Preço de Custo" → "Preço no Kit" | "Preço de Venda" → "Preço Avulso"
// Validações
//   • fabricante e modelo obrigatórios
//   • 600 Vdc ≤ tensão máxima ≤ 1500 Vdc; corrente máxima > 0
//   • entradas ≥ 1 e saídas ≥ 1; SPD classe em {II, I+II, III}; IP iniciando por "IP"
//   • Preços não negativos e Preço Avulso ≥ Preço no Kit
// Geração automática
//   • Nome comercial: String Box {tensão}V {corrente}A {entradas}E/{saídas}S
// Integração
//   • Ao salvar, enviar objeto completo "form" + "nomeComercial" ao backend/ERP/CRM.
//   • Em tela de Kit, filtrar recomendações por faixasInversor.
// Normas sugeridas
//   • NBR 16690 (FV), NBR 5410 (BT), NR-10; IEC 61439-2 (quadros), IEC 61643-31 (SPD FV),
//     IEC 60947-3 (seccionamento CC), IEC 60269-6 (fusíveis FV)
// UX
//   • Preview resume características e preços (avulso/kit) para conferência rápida.
// ----------------------------------------------------------------------------
// 1) Cadastrar dados técnicos, comerciais e de compatibilidade.
// 2) Gerar automaticamente o nome comercial a partir de tensão, corrente e entradas/saídas.
// 3) Validar campos críticos (tensão, corrente, número de entradas/saídas, SPD, isolador, IP).
// 4) Prever um resumo (preview) do cadastro antes de salvar.
// 5) Permitir mapear compatibilidade com faixas de inversores e preços sugeridos.

export default function CadastroStringBox() {
  // Função para máscara de moeda
  function maskCurrency(value: string) {
    let v = value.replace(/\D/g, "")
    v = (Number(v) / 100).toFixed(2)
    return v.replace('.', ',')
  }
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { toast } = useToast()
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [stringBoxes, setStringBoxes] = useState<StringBox[]>([])
  const [loading, setLoading] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  const [form, setForm] = useState({
    fabricante: "",
    modelo: "",
    descricao: "",

    // Identificação elétrica geral
    tensaoMaxVdc: 1000,
    correnteMaxA: 32,
    entradas: 1,
    saidas: 1,
    mpptCompartilhado: false,

    // Proteções
    temIsoladorCC: true,
    isoladorCorrenteA: 32,
    isoladorNorma: "IEC 60947-3",
    temFusivelPorEntrada: true,
    fusivelCorrenteA: 15,
    fusivelNorma: "IEC 60269-6",
    spdClasse: "II",
    spdTensaoUcV: 1000,
    spdCorrenteImaxkA: 40,
    spdNorma: "IEC 61643-31",
    temDiodoBloqueio: false,
    temProtecaoPolaridade: true,
    temAFCI: false,

    // Conexões & construção
    tipoConector: "MC4/Compatível",
    bitolasEntrada: "4 a 10 mm²",
    bitolasSaida: "6 a 16 mm²",
    prensaCabos: "M20/M25",
    aterramentoInterno: true,
    ipGrau: "IP65",
    materialCarcaca: "Policarbonato UV (autoextinguível)",
    corCarcaca: "Cinza RAL7035",
    dimensoes: "260 x 200 x 120 mm",
    pesoKg: 1.8,
    tempOperacao: "-25°C a +60°C",
    montagem: "Parede / Trilho DIN interno",

  // Compatibilidade e aplicação
    tVocMaxString: 1000, // Voc máx por string (soma módulos)
    iscMaxStringA: 15,
    normaMontagem: "NBR 16690 / NBR 5410 / NR-10",

    // Comerciais
    garantiaAnos: 2,
    precoNoKit: 0,
    precoAvulso: 0,

  // Nomenclatura - flags to control preview composition
  showFabricante: true,
  showTensao: true,
  showCorrente: true,

    // Documentos
    codigosNormas: "IEC 61439-2; IEC 61643-31; IEC 60947-3; NBR 5410; NBR 16690",
    urlDatasheet: "",
    urlManual: "",
    urlCertificado: "",

    // Observações
    observacoes: "Inclui etiquetação padrão: PERIGO DC, polaridade, SPD e aterramento.",
  })

  const [erros, setErros] = useState<string[]>([])

  useEffect(() => {
    carregarFornecedores()
    carregarStringBoxes()
  }, [])

  const carregarFornecedores = async () => {
    try {
      console.log("[v0] Loading fornecedores...")
      const { data, error } = await supabase.from("fornecedores").select("id, nome").eq("ativo", true).order("nome")

      if (error) {
        console.error("[v0] Error loading fornecedores:", error)
        toast({
          title: "Erro ao carregar fornecedores",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      console.log("[v0] Fornecedores loaded:", data?.length || 0)
      setFornecedores(data || [])
    } catch (error) {
      console.error("[v0] Error loading fornecedores:", error)
      toast({
        title: "Erro ao carregar fornecedores",
        description: "Erro inesperado ao carregar dados",
        variant: "destructive",
      })
    }
  }

  const carregarStringBoxes = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/string-boxes")
      if (response.ok) {
        const data = await response.json()
        setStringBoxes(data)
      }
    } catch (error) {
      console.error("Error fetching string-boxes:", error)
      toast({
        title: "Erro ao carregar string-boxes",
        description: "Erro inesperado ao carregar dados",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const editarStringBox = (stringBox: StringBox) => {
    // enter edit mode and populate form with existing values
    setEditando(stringBox.id ?? null)
    setForm((prev) => ({
      ...prev,
      fabricante: stringBox.fabricante || "",
      modelo: stringBox.modelo || "",
      descricao: stringBox.descricao || "",
      tensaoMaxVdc: stringBox.tensao_max_vdc ?? prev.tensaoMaxVdc,
      correnteMaxA: stringBox.corrente_max_a ?? prev.correnteMaxA,
      entradas: stringBox.entradas ?? prev.entradas,
      saidas: stringBox.saidas ?? prev.saidas,
      mpptCompartilhado: !!stringBox.mppt_compartilhado,
      temIsoladorCC: !!stringBox.tem_isolador_cc,
      isoladorCorrenteA: stringBox.isolador_corrente_a ?? prev.isoladorCorrenteA,
      isoladorNorma: stringBox.isolador_norma ?? prev.isoladorNorma,
      temFusivelPorEntrada: !!stringBox.tem_fusivel_por_entrada,
      fusivelCorrenteA: stringBox.fusivel_corrente_a ?? prev.fusivelCorrenteA,
      fusivelNorma: stringBox.fusivel_norma ?? prev.fusivelNorma,
      spdClasse: stringBox.spd_classe ?? prev.spdClasse,
      spdTensaoUcV: stringBox.spd_tensao_uc_v ?? prev.spdTensaoUcV,
      spdCorrenteImaxkA: stringBox.spd_corrente_imax_ka ?? prev.spdCorrenteImaxkA,
      spdNorma: stringBox.spd_norma ?? prev.spdNorma,
      temDiodoBloqueio: !!stringBox.tem_diodo_bloqueio,
      temProtecaoPolaridade: !!stringBox.tem_protecao_polaridade,
      temAFCI: !!stringBox.tem_afci,
      tipoConector: stringBox.tipo_conector ?? prev.tipoConector,
      bitolasEntrada: stringBox.bitolas_entrada ?? prev.bitolasEntrada,
      bitolasSaida: stringBox.bitolas_saida ?? prev.bitolasSaida,
      prensaCabos: stringBox.prensa_cabos ?? prev.prensaCabos,
      aterramentoInterno: !!stringBox.aterramento_interno,
      ipGrau: stringBox.ip_grau ?? prev.ipGrau,
      materialCarcaca: stringBox.material_carcaca ?? prev.materialCarcaca,
      corCarcaca: stringBox.cor_carcaca ?? prev.corCarcaca,
      dimensoes: stringBox.dimensoes ?? prev.dimensoes,
      pesoKg: stringBox.peso_kg ?? prev.pesoKg,
      tempOperacao: stringBox.temp_operacao ?? prev.tempOperacao,
      montagem: stringBox.montagem ?? prev.montagem,
      tVocMaxString: stringBox.t_voc_max_string ?? prev.tVocMaxString,
      iscMaxStringA: stringBox.isc_max_string_a ?? prev.iscMaxStringA,
      normaMontagem: stringBox.norma_montagem ?? prev.normaMontagem,
      garantiaAnos: stringBox.garantia_anos ?? prev.garantiaAnos,
      precoNoKit: stringBox.preco_no_kit ?? prev.precoNoKit,
      precoAvulso: stringBox.preco_avulso ?? prev.precoAvulso,
      codigosNormas: stringBox.codigos_normas ?? prev.codigosNormas,
      urlDatasheet: stringBox.url_datasheet ?? prev.urlDatasheet,
      urlManual: stringBox.url_manual ?? prev.urlManual,
      urlCertificado: stringBox.url_certificado ?? prev.urlCertificado,
      observacoes: stringBox.observacoes ?? prev.observacoes,
    }))
    setMostrarFormulario(true)
  }

  const excluirStringBox = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta string-box?')) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/string-boxes/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "String-Box excluída",
          description: "String-Box excluída com sucesso!",
        })
        carregarStringBoxes()
      } else {
        toast({
          title: "Erro ao excluir String-Box",
          description: "Erro inesperado",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting string-box:", error)
      toast({
        title: "Erro ao excluir String-Box",
        description: "Erro inesperado",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const nomeComercial = useMemo(() => {
    const parts: string[] = []
    parts.push('String Box')
    if (form.showFabricante && form.fabricante) parts.push(form.fabricante)
    const e = `${form.entradas}E/${form.saidas}S`
    parts.push(e)
    if (form.showTensao) parts.push(`${form.tensaoMaxVdc}V`)
    if (form.showCorrente) parts.push(`${form.correnteMaxA}A`)
    return parts.join(' ')
  }, [form.tensaoMaxVdc, form.correnteMaxA, form.entradas, form.saidas])

  const handleChange = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleArrayChange = (idx: number, key: string, value: any) => {
  // suggestions per inverter were removed (Falha 20) — nothing to do here
  return
  }

  const validar = () => {
    const e: string[] = []
    if (!form.fabricante) e.push("Informe o fabricante.")
    if (!form.modelo) e.push("Informe o modelo.")
    if (form.tensaoMaxVdc < 600 || form.tensaoMaxVdc > 1500) e.push("Tensão máx. típica entre 600 e 1500 Vdc.")
    if (form.correnteMaxA <= 0) e.push("Corrente máxima inválida.")
    if (form.entradas < 1 || form.saidas < 1) e.push("Mínimo 1 entrada e 1 saída.")
    if (form.spdClasse !== "II" && form.spdClasse !== "I+II" && form.spdClasse !== "III")
      e.push("Classe SPD inválida (use II ou I+II ou III).")
    if (!form.ipGrau.startsWith("IP")) e.push("Grau de proteção IP inválido.")
    if (form.precoAvulso < 0 || form.precoNoKit < 0) e.push("Preço não pode ser negativo.")
    if (form.precoAvulso && form.precoNoKit && form.precoAvulso < form.precoNoKit)
      e.push("Preço avulso abaixo do preço no kit.")
    setErros(e)
    return e.length === 0
  }

  const salvar = async () => {
    if (!validar()) return

    setLoading(true)
    try {
      console.log("[v0] Saving string box...")

      const stringBoxData = {
        fabricante: form.fabricante,
        modelo: form.modelo,
        descricao: form.descricao,
        nome_comercial: nomeComercial,
        tensao_max_vdc: form.tensaoMaxVdc,
        corrente_max_a: form.correnteMaxA,
        entradas: form.entradas,
        saidas: form.saidas,
        mppt_compartilhado: form.mpptCompartilhado,
        tem_isolador_cc: form.temIsoladorCC,
        isolador_corrente_a: form.isoladorCorrenteA,
        isolador_norma: form.isoladorNorma,
        tem_fusivel_por_entrada: form.temFusivelPorEntrada,
        fusivel_corrente_a: form.fusivelCorrenteA,
        fusivel_norma: form.fusivelNorma,
        spd_classe: form.spdClasse,
        spd_tensao_uc_v: form.spdTensaoUcV,
        spd_corrente_imax_ka: form.spdCorrenteImaxkA,
        spd_norma: form.spdNorma,
        tem_diodo_bloqueio: form.temDiodoBloqueio,
        tem_protecao_polaridade: form.temProtecaoPolaridade,
        tem_afci: form.temAFCI,
        tipo_conector: form.tipoConector,
        bitolas_entrada: form.bitolasEntrada,
        bitolas_saida: form.bitolasSaida,
        prensa_cabos: form.prensaCabos,
        aterramento_interno: form.aterramentoInterno,
        ip_grau: form.ipGrau,
        material_carcaca: form.materialCarcaca,
        cor_carcaca: form.corCarcaca,
        dimensoes: form.dimensoes,
        peso_kg: form.pesoKg,
        temp_operacao: form.tempOperacao,
        montagem: form.montagem,
  // faixas_inversor removed (Falha 20)
        t_voc_max_string: form.tVocMaxString,
        isc_max_string_a: form.iscMaxStringA,
        norma_montagem: form.normaMontagem,
        garantia_anos: form.garantiaAnos,
        preco_no_kit: form.precoNoKit,
        preco_avulso: form.precoAvulso,
        codigos_normas: form.codigosNormas,
        url_datasheet: form.urlDatasheet,
        url_manual: form.urlManual,
        url_certificado: form.urlCertificado,
        observacoes: form.observacoes,
      }

      if (editando) {
        // update existing
        const { data, error } = await supabase
          .from("string_boxes")
          .update(stringBoxData)
          .eq("id", editando)
          .select()
          .single()

        if (error) {
          console.error("[v0] Error updating string box:", error)
          throw error
        }

        console.log("[v0] String box updated successfully")
        toast({ title: "String Box atualizada", description: "Atualização concluída." })
        setEditando(null)
        carregarStringBoxes()
      } else {
        const { error } = await supabase.from("string_boxes").insert([stringBoxData])

        if (error) {
          console.error("[v0] Error saving string box:", error)
          throw error
        }

        console.log("[v0] String box saved successfully")
        toast({ title: "String Box cadastrada", description: "String Box cadastrada com sucesso!" })
        // Recarregar a lista de string-boxes
        carregarStringBoxes()
      }
      setMostrarFormulario(false)
    } catch (error: any) {
      console.error("[v0] Error saving string box:", error)
      toast({
        title: "Erro ao salvar String Box",
        description: error.message || "Erro inesperado",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const currency = (v: number) =>
    isNaN(v as any) ? "" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cadastro de String Box</h1>
            <p className="text-sm text-neutral-600">
              Registre especificações elétricas, proteções, compatibilidades e dados comerciais.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!mostrarFormulario ? (
              <button
                onClick={() => { setMostrarFormulario(true); setEditando(null) }}
                className="rounded-2xl bg-black px-4 py-2 text-white hover:opacity-90"
              >
                Nova String Box
              </button>
            ) : (
              <button
                onClick={() => { setEditando(null); setMostrarFormulario(false) }}
                className="rounded-2xl bg-gray-600 px-4 py-2 text-white hover:opacity-90"
              >
                Cancelar
              </button>
            )}
          </div>
        </header>

        {erros.length > 0 && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <div className="mb-2 font-semibold">Ajustes necessários</div>
            <ul className="list-disc pl-5">
              {erros.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {mostrarFormulario && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Tabs defaultValue="comercial" className="space-y-4">
              <TabsList>
                <TabsTrigger value="comercial">Dados Comerciais</TabsTrigger>
                <TabsTrigger value="tecnicos">Especificações Técnicas</TabsTrigger>
                <TabsTrigger value="nomenclatura">Nomenclatura</TabsTrigger>
              </TabsList>

              <TabsContent value="comercial">
                <Card title="Dados Comerciais">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Fabricante">
                      <input
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.fabricante}
                        onChange={(e) => handleChange("fabricante", e.target.value)} />
                    </Field>
                    <Field label="Modelo / Linha / Série">
                      <input
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.modelo}
                        onChange={(e) => handleChange("modelo", e.target.value)} />
                    </Field>

                    <Field label="Tensão Máx. (Vdc)">
                      <input
                        type="number"
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.tensaoMaxVdc}
                        onChange={(e) => handleChange("tensaoMaxVdc", Number.parseInt(e.target.value))} />
                    </Field>
                    <Field label="Corrente Máx. (A)">
                      <input
                        type="number"
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.correnteMaxA}
                        onChange={(e) => handleChange("correnteMaxA", Number.parseInt(e.target.value))} />
                    </Field>

                    <Field label="Entradas (E)">
                      <input
                        type="number"
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.entradas}
                        onChange={(e) => handleChange("entradas", Number.parseInt(e.target.value))} />
                    </Field>
                    <Field label="Saídas (S)">
                      <input
                        type="number"
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.saidas}
                        onChange={(e) => handleChange("saidas", Number.parseInt(e.target.value))} />
                    </Field>

                    <Field label="Preço no Kit (R$)">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full rounded-xl border border-gray-400 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.precoNoKit !== 0 ? form.precoNoKit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ""}
                        onChange={(e) => {
                          const masked = maskCurrency(e.target.value)
                          handleChange("precoNoKit", masked ? Number(masked.replace(',', '.')) : 0)
                        }} />
                    </Field>
                    <Field label="Preço Avulso (R$)">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full rounded-xl border border-gray-400 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.precoAvulso !== 0 ? form.precoAvulso.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ""}
                        onChange={(e) => {
                          const masked = maskCurrency(e.target.value)
                          handleChange("precoAvulso", masked ? Number(masked.replace(',', '.')) : 0)
                        }} />
                    </Field>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="tecnicos">
                {/* Especificações Técnicas and other cards */}
                <Card title="Especificações Elétricas">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Tensão Máx. (Vdc)">
                      <input
                        type="number"
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.tensaoMaxVdc}
                        onChange={(e) => handleChange("tensaoMaxVdc", Number.parseInt(e.target.value))} />
                    </Field>
                    <Field label="Corrente Máx. (A)">
                      <input
                        type="number"
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.correnteMaxA}
                        onChange={(e) => handleChange("correnteMaxA", Number.parseInt(e.target.value))} />
                    </Field>
                    <Field label="Entradas (E)">
                      <input
                        type="number"
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.entradas}
                        onChange={(e) => handleChange("entradas", Number.parseInt(e.target.value))} />
                    </Field>
                    <Field label="Saídas (S)">
                      <input
                        type="number"
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.saidas}
                        onChange={(e) => handleChange("saidas", Number.parseInt(e.target.value))} />
                    </Field>
                    <Field label="MPPT compartilhado?">
                      <Toggle checked={form.mpptCompartilhado} onChange={(v) => handleChange("mpptCompartilhado", v)} />
                    </Field>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Isolador CC (tem?)">
                      <Toggle checked={form.temIsoladorCC} onChange={(v) => handleChange("temIsoladorCC", v)} />
                    </Field>
                    <Field label="Isolador Corrente (A)">
                      <input
                        type="number"
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.isoladorCorrenteA}
                        onChange={(e) => handleChange("isoladorCorrenteA", Number.parseInt(e.target.value))} />
                    </Field>
                    <Field label="Norma Isolador">
                      <input
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.isoladorNorma}
                        onChange={(e) => handleChange("isoladorNorma", e.target.value)} />
                    </Field>

                    <Field label="Fusível por entrada?">
                      <Toggle
                        checked={form.temFusivelPorEntrada}
                        onChange={(v) => handleChange("temFusivelPorEntrada", v)} />
                    </Field>
                    <Field label="Fusível (A)">
                      <input
                        type="number"
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.fusivelCorrenteA}
                        onChange={(e) => handleChange("fusivelCorrenteA", Number.parseInt(e.target.value))} />
                    </Field>
                    <Field label="Norma Fusível">
                      <input
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.fusivelNorma}
                        onChange={(e) => handleChange("fusivelNorma", e.target.value)} />
                    </Field>

                    <Field label="SPD (classe)">
                      <select
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.spdClasse}
                        onChange={(e) => handleChange("spdClasse", e.target.value)}
                      >
                        <option>II</option>
                        <option>I+II</option>
                        <option>III</option>
                      </select>
                    </Field>
                    <Field label="SPD Uc (V)">
                      <input
                        type="number"
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.spdTensaoUcV}
                        onChange={(e) => handleChange("spdTensaoUcV", Number.parseInt(e.target.value))} />
                    </Field>
                    <Field label="SPD Imax (kA)">
                      <input
                        type="number"
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.spdCorrenteImaxkA}
                        onChange={(e) => handleChange("spdCorrenteImaxkA", Number.parseInt(e.target.value))} />
                    </Field>
                    <Field label="Norma SPD">
                      <input
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.spdNorma}
                        onChange={(e) => handleChange("spdNorma", e.target.value)} />
                    </Field>

                    <Field label="Diodo de bloqueio">
                      <Toggle checked={form.temDiodoBloqueio} onChange={(v) => handleChange("temDiodoBloqueio", v)} />
                    </Field>
                    <Field label="Proteção de polaridade">
                      <Toggle
                        checked={form.temProtecaoPolaridade}
                        onChange={(v) => handleChange("temProtecaoPolaridade", v)} />
                    </Field>
                    <Field label="AFCI (anti-arco)">
                      <Toggle checked={form.temAFCI} onChange={(v) => handleChange("temAFCI", v)} />
                    </Field>
                  </div>
                </Card>

                <Card title="Compatibilidade & Aplicação">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Voc máx por string (V)">
                      <input
                        type="number"
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.tVocMaxString}
                        onChange={(e) => handleChange("tVocMaxString", Number.parseInt(e.target.value))} />
                    </Field>
                    <Field label="Isc máx por string (A)">
                      <input
                        type="number"
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.iscMaxStringA}
                        onChange={(e) => handleChange("iscMaxStringA", Number.parseInt(e.target.value))} />
                    </Field>
                    <Field label="Normas de montagem">
                      <input
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.normaMontagem}
                        onChange={(e) => handleChange("normaMontagem", e.target.value)} />
                    </Field>
                  </div>
                </Card>

                <Card title="Conexões & Construção">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Conector">
                      <input
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.tipoConector}
                        onChange={(e) => handleChange("tipoConector", e.target.value)} />
                    </Field>
                    <Field label="Bitolas entrada">
                      <input
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.bitolasEntrada}
                        onChange={(e) => handleChange("bitolasEntrada", e.target.value)} />
                    </Field>
                    <Field label="Bitolas saída">
                      <input
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.bitolasSaida}
                        onChange={(e) => handleChange("bitolasSaida", e.target.value)} />
                    </Field>
                    <Field label="Prensa-cabos">
                      <input
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.prensaCabos}
                        onChange={(e) => handleChange("prensaCabos", e.target.value)} />
                    </Field>
                    <Field label="Aterramento interno">
                      <Toggle checked={form.aterramentoInterno} onChange={(v) => handleChange("aterramentoInterno", v)} />
                    </Field>
                    <Field label="Grau de proteção (IP)">
                      <input
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.ipGrau}
                        onChange={(e) => handleChange("ipGrau", e.target.value)} />
                    </Field>
                    <Field label="Material da carcaça">
                      <input
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.materialCarcaca}
                        onChange={(e) => handleChange("materialCarcaca", e.target.value)} />
                    </Field>
                    <Field label="Cor">
                      <input
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.corCarcaca}
                        onChange={(e) => handleChange("corCarcaca", e.target.value)} />
                    </Field>
                    <Field label="Dimensões (mm)">
                      <input
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.dimensoes}
                        onChange={(e) => handleChange("dimensoes", e.target.value)} />
                    </Field>
                    <Field label="Peso (kg)">
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.pesoKg}
                        onChange={(e) => handleChange("pesoKg", Number.parseFloat(e.target.value))} />
                    </Field>
                    <Field label="Temperatura de operação">
                      <input
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.tempOperacao}
                        onChange={(e) => handleChange("tempOperacao", e.target.value)} />
                    </Field>
                    <Field label="Montagem">
                      <input
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.montagem}
                        onChange={(e) => handleChange("montagem", e.target.value)} />
                    </Field>
                  </div>
                </Card>

                <Card title="Documentos & Normas">
                  <Field label="Normas aplicáveis">
                    <input
                      className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                      value={form.codigosNormas}
                      onChange={(e) => handleChange("codigosNormas", e.target.value)} />
                  </Field>
                  <div className="grid grid-cols-1 gap-3">
                    <Field label="URL Datasheet">
                      <input
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.urlDatasheet}
                        onChange={(e) => handleChange("urlDatasheet", e.target.value)}
                      />
                    </Field>
                    <Field label="URL Manual">
                      <input
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.urlManual}
                        onChange={(e) => handleChange("urlManual", e.target.value)}
                      />
                    </Field>
                    <Field label="URL Certificado/Laudo">
                      <input
                        className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
                        value={form.urlCertificado}
                        onChange={(e) => handleChange("urlCertificado", e.target.value)}
                      />
                    </Field>
                  </div>
                </Card>

                <Card title="Observações">
                  <textarea
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black min-h-[100px]"
                    value={form.observacoes}
                    onChange={(e) => handleChange("observacoes", e.target.value)} />
                </Card>
              </TabsContent>

              <TabsContent value="nomenclatura">
                <Card title="Nomenclatura">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" checked={!!form.showFabricante} onChange={(e) => handleChange('showFabricante', e.target.checked)} />
                      <label className="text-sm">Mostrar Fabricante</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" checked={!!form.showTensao} onChange={(e) => handleChange('showTensao', e.target.checked)} />
                      <label className="text-sm">Mostrar Tensão Máx. (Vdc)</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" checked={!!form.showCorrente} onChange={(e) => handleChange('showCorrente', e.target.checked)} />
                      <label className="text-sm">Mostrar Corrente Máx. (A)</label>
                    </div>
                    <div className="pt-2 text-sm">
                      <div className="font-medium">Preview exemplo</div>
                      <div className="text-neutral-700 mt-1">{nomeComercial}</div>
                      <div className="text-xs text-neutral-500 mt-1">Ex: String Box Clamper 3E/3S 1000V 32A</div>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview / Actions column */}
          <div className="lg:col-span-1">
            {/* keep the existing preview & actions column below (no change) */}
          </div>
        </div>
        )}

        {/* Preview */}
        {mostrarFormulario && (
        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card title="Preview do Produto">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Info label="Nome Comercial" value={nomeComercial} />{" "}
                <Info label="Fabricante" value={form.fabricante || "—"} />
                <Info label="Modelo" value={form.modelo || "—"} />
                <Info
                  label="Especificação"
                  value={`${form.tensaoMaxVdc} Vdc, ${form.correnteMaxA} A, ${form.entradas}E/${form.saidas}S`} />
                <Info
                  label="Proteções"
                  value={`Isolador ${form.temIsoladorCC ? form.isoladorCorrenteA + "A" : "não"}, Fusível ${form.temFusivelPorEntrada ? form.fusivelCorrenteA + "A/entrada" : "não"}, SPD ${form.spdClasse} Uc ${form.spdTensaoUcV}V Imax ${form.spdCorrenteImaxkA}kA`} />
                <Info label="Grau de Proteção" value={form.ipGrau} />
                <Info
                  label="Conexões"
                  value={`${form.tipoConector}, prensa ${form.prensaCabos}, bitolas E ${form.bitolasEntrada} / S ${form.bitolasSaida}`} />
                <Info label="Dimensões" value={`${form.dimensoes} • ${form.pesoKg} kg`} />
                <Info label="Operação" value={`${form.tempOperacao} • ${form.montagem}`} />
                <Info
                  label="Comerciais"
                  value={`${currency(form.precoAvulso)} (avulso) • ${currency(form.precoNoKit)} (no kit) • Garantia ${form.garantiaAnos} anos`} />
                <Info label="Normas" value={form.codigosNormas} />
              </div>
              {form.descricao && (
                <div className="mt-3 text-sm text-neutral-700">
                  <span className="font-semibold">Descrição: </span>
                  {form.descricao}
                </div>
              )}
            </Card>
          </div>
          <div>
            <Card title="Ações">
              <div className="space-y-2">
                <button
                  onClick={salvar}
                  disabled={loading}
                  className="w-full rounded-2xl bg-black px-4 py-3 text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? (editando ? "Atualizando..." : "Salvando...") : editando ? "Atualizar String Box" : "Salvar String Box"}
                </button>
                {editando && (
                  <button
                    onClick={() => {
                      setEditando(null)
                      // optionally reload to reset form
                      carregarStringBoxes()
                    }}
                    className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-800 shadow-sm"
                  >
                    Cancelar edição
                  </button>
                )}
              </div>
              <div className="mt-3 text-xs text-neutral-500">
                O cadastro será validado e, se estiver tudo certo, será emitido o registro para uso no kit fotovoltaico.
              </div>
            </Card>
          </div>
        </section>
        )}

        {/* Seção de String-Boxes Cadastradas */}
        <section className="mt-8">
          <Card title={`String-Boxes Cadastradas (${stringBoxes.length})`}>
            {loading ? (
              <div className="py-8 text-center text-neutral-500">
                Carregando string-boxes...
              </div>
            ) : stringBoxes.length === 0 ? (
              <div className="py-8 text-center text-neutral-500">
                Nenhuma string-box cadastrada ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {stringBoxes.map((stringBox) => (
                  <div key={stringBox.id} className="rounded-lg border p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{stringBox.nome}</h3>
                        <div className="mt-1 text-sm text-gray-600">
                          <span className="inline-flex items-center gap-4">
                            <span>Modelo: {stringBox.modelo}</span>
                            <span>{stringBox.tensao_maxima}V • {stringBox.corrente_maxima}A</span>
                            <span>{stringBox.num_entradas}E/{stringBox.num_saidas}S</span>
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-4">
                            <span>Isolador CC: {stringBox.isolador_cc ? 'Sim' : 'Não'}</span>
                            <span>SPD: {stringBox.spd_integrado ? 'Sim' : 'Não'}</span>
                            <span>AFCI: {stringBox.afci_integrado ? 'Sim' : 'Não'}</span>
                            {stringBox.fornecedores && stringBox.fornecedores.nome && (
                              <span>Fornecedor: {stringBox.fornecedores.nome}</span>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {((stringBox.preco_avulso ?? 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </div>
                          <div className="text-xs text-gray-500">
                            Kit: {((stringBox.preco_no_kit ?? 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </div>
                          <div className="mt-1 text-xs text-gray-400">
                            {stringBox.created_at ? new Date(stringBox.created_at).toLocaleDateString('pt-BR') : "-"}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => editarStringBox(stringBox)}
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => stringBox.id && excluirStringBox(stringBox.id)}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-neutral-600">{label}</div>
      {children}
    </label>
  )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="font-medium text-neutral-800">{value}</div>
    </div>
  )
}

function Separator() {
  return <div className="my-4 h-px w-full bg-neutral-200" />
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "bg-black" : "bg-neutral-300"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  )
}
