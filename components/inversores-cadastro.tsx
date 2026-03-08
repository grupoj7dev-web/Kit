"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Zap, Edit, Trash2, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import MPPTSpecsEditable from "./mppt-specs-editable"

interface InversorData {
  id?: string
  fornecedor_id?: string
  // Dados comerciais
  tipo: "String" | "Micro Inversor"
  fases: "Monofásico" | "Trifásico"
  tensao: "380V" | "220V" | "127V"
  marca: string
  modelo: string
  potencia_kw?: number
  overload?: number
  overload_usado?: number // M9 - may be undefined until user sets it
  potencia_max_entrada_kw?: number
  string_box: boolean
  // Allow multiple string boxes (new): keep array for UI. For backward
  // compatibility we will persist the first selected id into the existing
  // `string_box_vinculada` DB column.
  string_box_vinculada?: string // M4 - String box vinculada (legacy single)
  string_box_vinculadas?: string[] // New: multiple string boxes
  preco_kit?: number
  preco_avulso?: number
  garantia?: number
  rsd_rapid_shutdown: boolean
  // Opções de nomenclatura - M3
  afci_integrado: boolean
  mostrar_marca?: boolean
  mostrar_tipo?: boolean
  mostrar_afci?: boolean
  mostrar_tensao?: boolean
  mostrar_rsd?: boolean
  marca_no_nome: boolean
  tipo_no_nome: boolean
  afci_no_nome: boolean // Fixed type
  tensao_no_nome: boolean // Fixed type
  fases_no_nome?: boolean // M3 - New field
  potencia_no_nome?: boolean // M3 - New field
  fornecedor_no_nome?: boolean // M3 - New field
  // Especificações DC - M5 Enhanced
  dc_tensao_max?: number
  dc_tensao_max_entrada?: number // Novo
  dc_faixa_op_min?: number
  dc_faixa_op_max?: number
  dc_faixa_mppt_min?: number
  dc_faixa_mppt_max?: number
  dc_tensao_nominal?: number
  dc_tensao_nominal_entrada?: number // Novo
  dc_tensao_partida?: number
  dc_imax_mppt?: number
  dc_corrente_max_mppt?: number // Novo
  dc_isc_max_mppt?: number
  dc_isc_max_mppt_a?: number // Novo
  dc_num_mppts?: number
  dc_entradas_mppt?: number
  dc_total_strings?: number // Calculado
  // M5 - Potência do módulo aceita pelo inversor (em W)
  potencia_modulo_aceita_w?: number
  dc_chave_seccionadora?: boolean // Novo
  // Especificações AC - M5 Enhanced
  ac_potencia_nominal?: number
  ac_potencia_max?: number
  ac_topologia?: "monofasico" | "trifasico"
  ac_tensao_nominal?: number
  ac_faixa_tensao_min?: number
  ac_faixa_tensao_max?: number
  ac_frequencia_tipo?: "50hz" | "60hz"
  ac_frequencia_min?: number
  ac_frequencia_max?: number
  ac_corrente_nominal?: number // Changed from ac_corrente_nominal_saida
  ac_eficiencia_max_brasil?: number
  ac_fp_ajustavel_min?: number
  ac_fp_ajustavel_max?: string
  ac_thd_corrente?: string
  ac_unidades_max_conexao?: number // Added from updates
  // Proteções
  prot_sobretensao_dc?: boolean
  prot_polaridade_reversa?: boolean
  prot_sobrecorrente_dc?: boolean
  prot_isolamento?: boolean
  prot_sobretensao_ac?: boolean
  prot_sobrecorrente_ac?: boolean
  prot_sobrefrequencia?: boolean
  prot_subfrequencia?: boolean
  prot_anti_ilhamento?: boolean
  // M6 - New protection specifications
  prot_sobretensao?: boolean
  deteccao_isolamento?: boolean
  monitoramento_dci?: boolean
  monitoramento_gfci?: boolean
  monitoramento_rede?: boolean
  prot_curto_circuito_ca?: boolean
  deteccao_aterramento_ca?: boolean
  prot_surtos_dc?: boolean
  prot_surtos_dc_tipo?: "I" | "II" | "III"
  prot_surtos_ca?: boolean
  prot_surtos_ca_tipo?: "I" | "II" | "III"
  prot_superaquecimento?: boolean
  // M7 - New general data specifications
  conexao_cc?: string
  conexao_ca?: string
  tela?: string[]
  porta_comunicacao?: string[]
  comunicacao?: string[]
  consumo_noite?: string
  consumo_espera?: string
  temp_op_min?: string
  temp_op_max?: string
  temp_reducao_potencia?: string
  ruido?: string
  protecao_entrada?: string
  dimensoes?: string
  peso_geral?: string
  normas?: string[]
  // Dados gerais
  eficiencia_max?: number
  eficiencia_euro?: number
  consumo_noturno?: number
  temperatura_op_min?: number
  temperatura_op_max?: number
  grau_protecao?: string
  dimensoes_comp?: number
  dimensoes_larg?: number
  dimensoes_esp?: number
  peso?: number
  chave_seccionadora_dc?: boolean // M5
}

// M5 - Electrical specifications interfaces
interface StringSpec {
  faixa_tensao_op_min_mppt: number
  faixa_tensao_op_max_mppt: number
  tensao_partida: number
  tensao_nominal: number
  tensao_max_entrada: number
  corrente_max_entrada: number
  corrente_curto_circuito_mppt: number
}

interface MPPTSpec {
  strings: StringSpec[]
}

export function InversoresCadastro() {
  // Função para máscara de moeda
  function maskCurrency(value: string) {
    let v = value.replace(/\D/g, "")
    v = (Number(v) / 100).toFixed(2)
    return v.replace('.', ',')
  }
  const [inversores, setInversores] = useState<InversorData[]>([])
  const [editandoInversor, setEditandoInversor] = useState<InversorData | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()

  // M5 - Electrical specifications state
  const [numMPPTs, setNumMPPTs] = useState(2)
  const [stringsPerMPPT, setStringsPerMPPT] = useState(2)
  const [globalSpecs, setGlobalSpecs] = useState({
    faixa_tensao_op_min: 90,
    faixa_tensao_op_max: 500,
    tensao_partida: 100,
    tensao_nominal: 360,
    tensao_max_entrada: 600,
    corrente_max_entrada: 15,
    corrente_curto_circuito: 21.6,
  })
  const [mpptSpecs, setMPPTSpecs] = useState<MPPTSpec[]>([])

  const [frequencyType, setFrequencyType] = useState<"50hz" | "60hz">("60hz")

  const [fornecedores, setFornecedores] = useState<Array<{ id: string; nome: string; tipos_material: string[] }>>([]) // Changed id type to string
  const [loadingFornecedores, setLoadingFornecedores] = useState(false)

  // Filters for the inversores listing (Falha 14)
  const [filterMarca, setFilterMarca] = useState<string>("")
  const [filterPotencia, setFilterPotencia] = useState<number | "">("")
  const [filterTipo, setFilterTipo] = useState<string>("")
  const [filterFase, setFilterFase] = useState<string>("")
  const [filterTensao, setFilterTensao] = useState<string>("")
  const [showInativos, setShowInativos] = useState<boolean>(false)

  // M4 - String box integration
  const [stringBoxes, setStringBoxes] = useState<Array<{ id: string; nome: string; marca: string }>>([])
  const [loadingStringBoxes, setLoadingStringBoxes] = useState(false)

  const carregarFornecedores = async () => {
    console.log("[v0] Starting to load fornecedores for inversores...")
    setLoadingFornecedores(true)
    try {
      const response = await fetch("/api/fornecedores")
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Fornecedores data received:", data)
        // Keep only fornecedores with UUID-like ids and that supply Kit Fotovoltaico
        const isUUIDLocal = (v: any) => typeof v === 'string' && !!v.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
        const fornecedoresKit = (data || []).filter((f: any) => {
          const suppliesKit = f.tipos_material && f.tipos_material.includes("Kit Fotovoltaico")
          const idIsUuid = isUUIDLocal(f.id) || isUUIDLocal(String(f.id))
          if (!idIsUuid) console.warn('[v0] Ignoring fornecedor with non-UUID id:', f.id)
          return suppliesKit && idIsUuid
        })
        console.log("[v0] Filtered fornecedores for Kit Fotovoltaico:", fornecedoresKit)
        setFornecedores(fornecedoresKit)
      } else {
        console.error("[v0] Failed to fetch fornecedores:", response.status)
      }
    } catch (error) {
      console.error("[v0] Erro ao carregar fornecedores:", error)
    } finally {
      setLoadingFornecedores(false)
    }
  }

  // M4 - String box loading function
  const carregarStringBoxes = async () => {
    console.log("[v0] Starting to load string boxes...")
    setLoadingStringBoxes(true)
    try {
      const response = await fetch("/api/string-boxes")
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] String boxes data received:", data)
        // Normalize different possible DB field names to the shape the component expects
        const isUUIDLocal = (v: any) => typeof v === 'string' && !!v.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
        const normalized = (data || []).map((sb: any) => ({
          id: sb.id !== undefined && sb.id !== null ? String(sb.id) : "",
          nome: sb.nome_comercial || sb.nome || sb.modelo || sb.descricao || "",
          marca: sb.fabricante || sb.marca || "",
        })).filter((s: any) => {
          if (!isUUIDLocal(s.id)) {
            console.warn('[v0] Ignoring string box with non-UUID id:', s.id, s)
            return false
          }
          return true
        })
        console.log("[v0] Normalized string boxes (UUID-only):", normalized)
        setStringBoxes(normalized)
      } else {
        console.error("[v0] Failed to fetch string boxes:", response.status)
      }
    } catch (error) {
      console.error("[v0] Erro ao carregar string boxes:", error)
    } finally {
      setLoadingStringBoxes(false)
    }
  }

  const [formData, setFormData] = useState<InversorData>({
    tipo: "String",
    fases: "Monofásico",
    tensao: "220V",
    marca: "",
    modelo: "",
    potencia_kw: 0,
    overload: 100,
    overload_usado: 100, // M9 - Valor padrão
    potencia_max_entrada_kw: 0,
    string_box: false,
    string_box_vinculada: "",
    string_box_vinculadas: [],
    preco_kit: 0,
    preco_avulso: 0,
    garantia: 0,
    rsd_rapid_shutdown: false,
    afci_integrado: false,
    marca_no_nome: true,
    tipo_no_nome: true,
    afci_no_nome: false,
    tensao_no_nome: false,
    mostrar_rsd: false,
    fases_no_nome: true, // M3 - Default enabled
    potencia_no_nome: true, // M3 - Default enabled
    fornecedor_no_nome: false, // M3 - Default disabled
    dc_tensao_max: 0,
    dc_faixa_op_min: 0,
    dc_faixa_op_max: 0,
    dc_faixa_mppt_min: 0,
    dc_faixa_mppt_max: 0,
    dc_tensao_nominal: 0,
    dc_tensao_partida: 0,
    dc_imax_mppt: 0,
    dc_isc_max_mppt: 0,
    potencia_modulo_aceita_w: undefined,
    dc_num_mppts: 1,
    dc_entradas_mppt: 1,
    ac_potencia_nominal: 0,
    ac_potencia_max: 0,
    ac_topologia: "monofasico",
    ac_tensao_nominal: 0,
    ac_faixa_tensao_min: 0,
    ac_faixa_tensao_max: 0,
    ac_frequencia_tipo: "60hz",
    ac_frequencia_min: 0,
    ac_frequencia_max: 0,
    ac_corrente_nominal: 0,
    ac_eficiencia_max_brasil: 0, // This will be mapped to eficiencia_max in handleSubmit
    ac_fp_ajustavel_min: 0,
    ac_fp_ajustavel_max: "",
    ac_thd_corrente: "",
    ac_unidades_max_conexao: 0,
    prot_sobretensao_dc: true,
    prot_polaridade_reversa: true,
    prot_sobrecorrente_dc: true,
    prot_isolamento: true,
    prot_sobretensao_ac: true,
    prot_sobrecorrente_ac: true,
    prot_sobrefrequencia: true,
    prot_subfrequencia: true,
    prot_anti_ilhamento: true,
    // M6 - Initial values for new protection specifications
    prot_sobretensao: false,
    deteccao_isolamento: false,
    monitoramento_dci: false,
    monitoramento_gfci: false,
    monitoramento_rede: false,
    prot_curto_circuito_ca: false,
    deteccao_aterramento_ca: false,
    prot_surtos_dc: false,
    prot_surtos_dc_tipo: undefined,
    prot_surtos_ca: false,
    prot_surtos_ca_tipo: undefined,
    prot_superaquecimento: false,
    // M7 - Initial values for new general data specifications
    conexao_cc: "",
    conexao_ca: "",
    tela: [],
    porta_comunicacao: [],
    comunicacao: [],
    consumo_noite: "",
    consumo_espera: "",
    temp_op_min: "",
    temp_op_max: "",
    temp_reducao_potencia: "",
    ruido: "",
    protecao_entrada: "",
    dimensoes: "",
    peso_geral: "",
    normas: [],
    // Dados gerais - using correct database field names
    eficiencia_max: 0,
    eficiencia_euro: 0,
    consumo_noturno: 0,
    temperatura_op_min: -25,
    temperatura_op_max: 60,
    grau_protecao: "",
    dimensoes_comp: 0,
    dimensoes_larg: 0,
    dimensoes_esp: 0,
    peso: 0,
    chave_seccionadora_dc: false, // M5
    fornecedor_id: "", // initialize as empty string for consistent Select values
  })

  useEffect(() => {
    carregarInversores()
    carregarFornecedores() // Load suppliers on component mount
    carregarStringBoxes() // M4 - Load string boxes on component mount
  }, [])

  // When the inverter type changes to Micro Inversor, clear any string box selections and overload fields
  useEffect(() => {
    if (formData.tipo === 'Micro Inversor') {
      setFormData((prev) => ({
        ...prev,
        string_box: false,
        string_box_vinculada: '',
        string_box_vinculadas: [],
        overload: undefined,
        overload_usado: undefined
      }))
    }
  }, [formData.tipo])

  // Enforce tension (tensao) rules per user request:
  // - Micro Inversor: always Monofásico; tensions offered 220V and 127V; default 220V
  // - String:
  //    - Monofásico: tensions 220V and 127V; default 220V
  //    - Trifásico: tensions 380V and 220V; default 380V
  useEffect(() => {
    setFormData((prev) => {
      let next = { ...prev }
      if (prev.tipo === 'Micro Inversor') {
        // force fases and default tensao
        next.fases = 'Monofásico'
        if (prev.tensao !== '220V' && prev.tensao !== '127V') next.tensao = '220V'
      } else {
        // tipo === String
        if (prev.fases === 'Monofásico') {
          if (prev.tensao !== '220V') next.tensao = '220V'
        } else {
          // Trifásico
          if (prev.tensao !== '380V') next.tensao = '380V'
        }
      }
      return next
    })
  }, [formData.tipo, formData.fases])

  // Debug: log when the selected string box id changes
  useEffect(() => {
    console.log("[v0] formData.string_box_vinculada changed:", formData.string_box_vinculada)
  }, [formData.string_box_vinculada])

  // M5 - Initialize MPPT specs when numbers change
  useEffect(() => {
    const newMPPTSpecs: MPPTSpec[] = []
    for (let i = 0; i < numMPPTs; i++) {
      const strings: StringSpec[] = []
      for (let j = 0; j < stringsPerMPPT; j++) {
        strings.push({
          faixa_tensao_op_min_mppt: globalSpecs.faixa_tensao_op_min,
          faixa_tensao_op_max_mppt: globalSpecs.faixa_tensao_op_max,
          tensao_partida: globalSpecs.tensao_partida,
          tensao_nominal: globalSpecs.tensao_nominal,
          tensao_max_entrada: globalSpecs.tensao_max_entrada,
          corrente_max_entrada: globalSpecs.corrente_max_entrada,
          corrente_curto_circuito_mppt: globalSpecs.corrente_curto_circuito,
        })
      }
      newMPPTSpecs.push({ strings })
    }
    setMPPTSpecs(newMPPTSpecs)
  }, [numMPPTs, stringsPerMPPT, globalSpecs])

  useEffect(() => {
    // Recalculate potencia_max_entrada_kw whenever potencia or overloads or tipo change
    if (typeof formData.potencia_kw === 'number') {
      // Para Micro Inversor, a potência máxima de entrada é igual à potência nominal
      // Micro Inversores não utilizam overload
      if (formData.tipo === 'Micro Inversor') {
        setFormData((prev) => ({
          ...prev,
          potencia_max_entrada_kw: Number(formData.potencia_kw.toFixed(2)),
        }))
        return
      }

      // Para String Inversores, usar overload se disponível
      let overloadToUse: number
      if (typeof formData.overload_usado === 'number') {
        overloadToUse = formData.overload_usado
      } else if (typeof formData.overload === 'number') {
        overloadToUse = formData.overload
      } else {
        overloadToUse = 100
      }

      const potenciaMaxEntrada = formData.potencia_kw * (1 + overloadToUse / 100)
      console.log("[v0] Calculating potencia max entrada with overload:", {
        potencia_kw: formData.potencia_kw,
        tipo: formData.tipo,
        overload_usado: formData.overload_usado,
        overload: formData.overload,
        overloadToUse: overloadToUse,
        calculated: potenciaMaxEntrada,
      })

      setFormData((prev) => ({
        ...prev,
        potencia_max_entrada_kw: Number(potenciaMaxEntrada.toFixed(2)),
      }))
    }
  }, [formData.potencia_kw, formData.overload_usado, formData.overload, formData.tipo])

  const carregarInversores = async () => {
    try {
      console.log("[v0] Starting to load inversores...")
      console.log("[v0] Supabase client:", supabase)

      // Load inversores ordered by potencia_kw ascending to show smallest power first
      const { data, error } = await supabase
        .from("inversores")
        .select("*")
        .order("potencia_kw", { ascending: true })
        .order("created_at", { ascending: false })

      console.log("[v0] Supabase response:", { data, error })

      if (error) throw error
      setInversores(data || [])
      console.log("[v0] Successfully loaded inversores:", data?.length || 0)
    } catch (error) {
      console.error("[v0] Error loading inversores:", error)
      console.error("Erro ao carregar inversores:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os inversores",
        variant: "destructive",
      })
    } finally {
      setLoadingList(false)
    }
  }

  // M3 - Enhanced nomenclature generation according to specifications
  const gerarNomeProduto = (data: InversorData) => {
    if (data.tipo === "Micro Inversor") {
      // Micro Inversor: "Micro Inversor" + Potência + Marca + "AFCI Integrado" + "e RSD Rapid Shutdown Integrado"
      // Exemplo: "Micro Inversor 2,25kW SAJ AFCI Integrado e RSD Rapid Shutdown Integrado"
      let nome = "Micro Inversor"

      // Include power if available
      if (data.potencia_kw && data.potencia_kw > 0) {
        nome += ` ${data.potencia_kw.toString().replace('.', ',')}kW`
      }

      // Include brand if enabled
      if (data.marca_no_nome && data.marca) {
        nome += ` ${data.marca}`
      }

      // Include AFCI if integrated and enabled
      if (data.afci_integrado && data.afci_no_nome) {
        nome += " AFCI Integrado"
      }

      // Include RSD if enabled
      if (data.rsd_rapid_shutdown && data.mostrar_rsd) {
        nome += " e RSD Rapid Shutdown Integrado"
      }

      return nome

    } else {
      // String Inverter: "Inversor" + Power + Phases + Voltage + Brand + "AFCI Integrado"
      // Exemplo: "Inversor 10kW Monofásico 220V SAJ AFCI Integrado"
      let nome = "Inversor"

      // Include power if available
      if (data.potencia_kw && data.potencia_kw > 0) {
        nome += ` ${data.potencia_kw.toString().replace('.', ',')}kW`
      }

      // Include phases (always for String)
      if (data.fases) {
        nome += ` ${data.fases}`
      }

      // Include voltage (always for String)
      if (data.tensao) {
        nome += ` ${data.tensao}`
      }

      // Include brand if enabled
      if (data.marca_no_nome && data.marca) {
        nome += ` ${data.marca}`
      }

      // Include AFCI if enabled and integrated
      if (data.afci_no_nome && data.afci_integrado) {
        nome += " AFCI Integrado"
      }

      return nome
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Falha 17: ensure fornecedor_id is provided
      if (!formData.fornecedor_id) {
        toast({ title: 'Atenção', description: 'Selecione um fornecedor antes de salvar o inversor.', variant: 'destructive' })
        setLoading(false)
        return
      }
      console.log("[v0] Form data before submit:", formData)

      const updatedFormData = {
        ...formData,
        dc_num_mppts: numMPPTs,
        dc_entradas_mppt: stringsPerMPPT,
        dc_total_strings: formData.dc_total_strings,
        // Map global specs to the existing dc fields for compatibility
        dc_tensao_max: globalSpecs.tensao_max_entrada,
        dc_faixa_op_min: globalSpecs.faixa_tensao_op_min,
        dc_faixa_op_max: globalSpecs.faixa_tensao_op_max,
        dc_tensao_nominal: globalSpecs.tensao_nominal,
        dc_tensao_partida: globalSpecs.tensao_partida,
        dc_imax_mppt: globalSpecs.corrente_max_entrada,
        dc_isc_max_mppt: globalSpecs.corrente_curto_circuito,
      }

      const fieldsToRemove = [
        "ac_corrente_nominal_saida",
        "ac_potencia_nominal_kw",
        "ac_potencia_max_kva",
        "ac_eficiencia_max_brasil", // This field doesn't exist - maps to eficiencia_max
        "ac_topologia",
        "ac_frequencia_tipo",
        "ac_frequencia_min",
        "ac_frequencia_max",
        "ac_fp_ajustavel_min",
        "ac_fp_ajustavel_max",
        "ac_thd_corrente",
        "ac_unidades_max_conexao",
        // Remove new fields that don't exist in database yet

        "fases_no_nome",
        "potencia_no_nome",
        "fornecedor_no_nome",
        "string_box_vinculada",
        "mostrar_marca",
        "mostrar_tipo",
        "mostrar_afci",
        "mostrar_tensao",
        "mostrar_rsd",
        // New protection fields
        "prot_sobretensao",
        "deteccao_isolamento",
        "monitoramento_dci",
        "monitoramento_gfci",
        "monitoramento_rede",
        "prot_curto_circuito_ca",
        "deteccao_aterramento_ca",
        "prot_surtos_dc",
        "prot_surtos_dc_tipo",
        "prot_surtos_ca",
        "prot_surtos_ca_tipo",
        "prot_superaquecimento",
        // New general data fields
        "conexao_cc",
        "conexao_ca",
        "tela",
        "porta_comunicacao",
        "comunicacao",
        "consumo_noite",
        "consumo_espera",
        "temp_op_min",
        "temp_op_max",
        "temp_reducao_potencia",
        "ruido",
        "protecao_entrada",
        "dimensoes",
        "peso_geral",
        "normas",
      ]

      // Create clean data object with only valid database fields
      const cleanFormData = { ...updatedFormData } as any
      fieldsToRemove.forEach((field) => {
        delete cleanFormData[field]
      })

      // Sanitize UUID-like fields to avoid sending invalid values to Postgres (which causes 22P02 errors)
      const isUUID = (v: any) => {
        if (typeof v !== 'string') return false
        return !!v.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      }

      const sanitizedFornecedorId = isUUID(formData.fornecedor_id) ? formData.fornecedor_id : null

      if (!sanitizedFornecedorId) {
        toast({ title: 'Atenção', description: 'Selecione um fornecedor válido antes de salvar o inversor.', variant: 'destructive' })
        setLoading(false)
        return
      }

      const rawArray = Array.isArray(formData.string_box_vinculadas) ? formData.string_box_vinculadas.map(String) : []
      const sanitizedStringBoxVinculadas = rawArray.filter(isUUID)

      const sanitizedStringBoxVinculada = sanitizedStringBoxVinculadas.length > 0
        ? sanitizedStringBoxVinculadas[0]
        : (isUUID(formData.string_box_vinculada) ? String(formData.string_box_vinculada) : null)

      if ((formData.string_box_vinculadas && formData.string_box_vinculadas.length > 0) && sanitizedStringBoxVinculadas.length === 0) {
        // User selected string boxes but none had UUID-like IDs; notify
        toast({ title: 'Aviso', description: 'Algumas String Boxes selecionadas possuem IDs incompatíveis com o formato esperado e serão ignoradas.', variant: 'destructive' })
      }

      const normalizeOverloadToPercent = (v: any) => {
        const s = (v ?? 0).toString().replace(',', '.')
        let n = Number(s) || 0
        if (n > 0 && n <= 1) n = n * 100
        return n
      }

      // Para Micro Inversores, garantir que overload seja 0
      const overloadFinal = formData.tipo === 'Micro Inversor' ? 0 : normalizeOverloadToPercent(formData.overload_usado ?? formData.overload)

      const finalFormData = {
        ...cleanFormData,
        // Map efficiency field correctly
        eficiencia_max: formData.ac_eficiencia_max_brasil || formData.eficiencia_max || 0,
        // Use correct AC field names
        ac_corrente_nominal: formData.ac_corrente_nominal || 0,
        ac_potencia_nominal: formData.ac_potencia_nominal || 0,
        ac_potencia_max: formData.ac_potencia_max || 0,
        // Use sanitized supplier id
        fornecedor_id: sanitizedFornecedorId,
        // Persist sanitized string box ids (legacy single + new array)
        string_box_vinculada: sanitizedStringBoxVinculada,
        string_box_vinculadas: sanitizedStringBoxVinculadas.length > 0 ? sanitizedStringBoxVinculadas : null,
        overload_usado: overloadFinal,
        nome: gerarNomeProduto(updatedFormData),
      }

      console.log("[v0] Final form data to save:", finalFormData)
      console.log("[v0] DEBUG POTENCIA:", {
        original: formData.potencia_modulo_aceita_w,
        final: finalFormData.potencia_modulo_aceita_w,
        inFieldsToRemove: fieldsToRemove.includes('potencia_modulo_aceita_w')
      })

      if (editandoInversor) {
        const { error } = await supabase.from("inversores").update(finalFormData).eq("id", editandoInversor.id)

        if (error) {
          console.error("[v0] Update error:", error)
          throw error
        }

        toast({
          title: "Sucesso",
          description: "Inversor atualizado com sucesso",
        })
      } else {
        const { error } = await supabase.from("inversores").insert([finalFormData])

        if (error) {
          console.error("[v0] Insert error:", error)
          throw error
        }

        toast({
          title: "Sucesso",
          description: "Inversor cadastrado com sucesso",
        })
      }

      await carregarInversores()
      setMostrarFormulario(false)
      setEditandoInversor(null)
      resetForm()
    } catch (error: any) {
      console.error("Erro ao salvar inversor:", error)
      toast({
        title: "Erro",
        description: `Não foi possível salvar o inversor: ${error?.message || 'Erro desconhecido'}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      tipo: "String",
      fases: "Monofásico",
      tensao: "220V",
      marca: "",
      modelo: "",
      potencia_kw: 0,
      overload: 100,
      overload_usado: 100, // M9 - Add overload_usado field
      potencia_max_entrada_kw: 0,
      string_box: false,
      string_box_vinculada: "",
      string_box_vinculadas: [],
      dc_total_strings: undefined,
      preco_kit: 0,
      preco_avulso: 0,
      garantia: 0,
      rsd_rapid_shutdown: false,
      afci_integrado: false,
      marca_no_nome: true,
      tipo_no_nome: true,
      afci_no_nome: false,
      tensao_no_nome: false,
      mostrar_rsd: false,
      fases_no_nome: true, // M3 - Default enabled
      potencia_no_nome: true, // M3 - Default enabled
      fornecedor_no_nome: false, // M3 - Default disabled
      dc_tensao_max: 0,
      dc_faixa_op_min: 0,
      dc_faixa_op_max: 0,
      dc_faixa_mppt_min: 0,
      dc_faixa_mppt_max: 0,
      dc_tensao_nominal: 0,
      dc_tensao_partida: 0,
      dc_imax_mppt: 0,
      dc_isc_max_mppt: 0,
      potencia_modulo_aceita_w: undefined,
      dc_num_mppts: 1,
      dc_entradas_mppt: 1,
      // M5 - AC Specifications reset values
      ac_potencia_nominal: 0, // Changed from ac_potencia_nominal_kw
      ac_potencia_max: 0, // Changed from ac_potencia_max_kva
      ac_topologia: "monofasico",
      ac_tensao_nominal: 0,
      ac_faixa_tensao_min: 0,
      ac_faixa_tensao_max: 0,
      ac_frequencia_tipo: "60hz",
      ac_frequencia_min: 0,
      ac_frequencia_max: 0,
      ac_corrente_nominal: 0, // Changed from ac_corrente_nominal_saida
      ac_eficiencia_max_brasil: 0,
      ac_fp_ajustavel_min: 0,
      ac_fp_ajustavel_max: "",
      ac_thd_corrente: "",
      ac_unidades_max_conexao: 0, // Added from updates
      prot_sobretensao_dc: true,
      prot_polaridade_reversa: true,
      prot_sobrecorrente_dc: true,
      prot_isolamento: true,
      prot_sobretensao_ac: true,
      prot_sobrecorrente_ac: true,
      prot_sobrefrequencia: true,
      prot_subfrequencia: true,
      prot_anti_ilhamento: true,
      // M6 - Reset protection specifications
      prot_sobretensao: false,
      deteccao_isolamento: false,
      monitoramento_dci: false,
      monitoramento_gfci: false,
      monitoramento_rede: false,
      prot_curto_circuito_ca: false,
      deteccao_aterramento_ca: false,
      prot_surtos_dc: false,
      prot_surtos_dc_tipo: undefined,
      prot_surtos_ca: false,
      prot_surtos_ca_tipo: undefined,
      prot_superaquecimento: false,
      // M7 - Reset general data specifications
      conexao_cc: "",
      conexao_ca: "",
      tela: [],
      porta_comunicacao: [],
      comunicacao: [],
      consumo_noite: "",
      consumo_espera: "",
      temp_op_min: "",
      temp_op_max: "",
      temp_reducao_potencia: "",
      ruido: "",
      protecao_entrada: "",
      dimensoes: "",
      peso_geral: "",
      normas: [],
      // Dados gerais
      eficiencia_max: 0,
      eficiencia_euro: 0,
      consumo_noturno: 0,
      temperatura_op_min: -25,
      temperatura_op_max: 60,
      grau_protecao: "",
      dimensoes_comp: 0,
      dimensoes_larg: 0,
      dimensoes_esp: 0,
      peso: 0,
      chave_seccionadora_dc: false, // M5
      // Reset supplier ID
      fornecedor_id: "", // Changed initial value to empty string for Select compatibility
    })
    // M5 - Reset MPPT specific states
    setNumMPPTs(2)
    setStringsPerMPPT(2)
    setGlobalSpecs({
      faixa_tensao_op_min: 90,
      faixa_tensao_op_max: 500,
      tensao_partida: 100,
      tensao_nominal: 360,
      tensao_max_entrada: 600,
      corrente_max_entrada: 15,
      corrente_curto_circuito: 21.6,
    })
    // Reset AC frequency state
    setFrequencyType("60hz")
  }

  const editarInversor = (inversor: InversorData) => {
    // Coerce certain ids to string to match Select expected types
    const normalized = {
      ...inversor,
      fornecedor_id: inversor.fornecedor_id ? String(inversor.fornecedor_id) : "",
      string_box_vinculada: (inversor as any).string_box_vinculada ? String((inversor as any).string_box_vinculada) : "",
      string_box_vinculadas: (inversor as any).string_box_vinculadas
        ? (inversor as any).string_box_vinculadas.map(String)
        : (inversor as any).string_box_vinculada
          ? [String((inversor as any).string_box_vinculada)]
          : [],
      potencia_modulo_aceita_w: (inversor as any).potencia_modulo_aceita_w ?? undefined,
    }
    console.log("[v0] DEBUG EDITAR:", {
      original: (inversor as any).potencia_modulo_aceita_w,
      normalized: normalized.potencia_modulo_aceita_w
    })
    setFormData(normalized)
    setEditandoInversor(inversor)
    setMostrarFormulario(true)
    // M5 - Set MPPT specific states when editing
    setNumMPPTs(inversor.dc_num_mppts || 2)
    setStringsPerMPPT(inversor.dc_entradas_mppt || 2)
    setGlobalSpecs({
      faixa_tensao_op_min: inversor.dc_faixa_op_min || 90,
      faixa_tensao_op_max: inversor.dc_faixa_op_max || 500,
      tensao_partida: inversor.dc_tensao_partida || 100,
      tensao_nominal: inversor.dc_tensao_nominal || 360,
      tensao_max_entrada: inversor.dc_tensao_max || 600,
      corrente_max_entrada: inversor.dc_imax_mppt || 15, // Assuming dc_imax_mppt maps to current_max_entrada
      corrente_curto_circuito: inversor.dc_isc_max_mppt || 21.6, // Assuming dc_isc_max_mppt maps to current_curto_circuito
    })
    // M5 - Set AC frequency state when editing
    setFrequencyType(inversor.ac_frequencia_tipo || "60hz")
  }

  const excluirInversor = async (id: string) => {
    try {
      const { error } = await supabase.from("inversores").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Inversor excluído com sucesso",
      })

      await carregarInversores()
    } catch (error) {
      console.error("Erro ao excluir inversor:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir o inversor",
        variant: "destructive",
      })
    }
  }

  const toggleAtivoInversor = async (inversor: InversorData) => {
    try {
      const newState = !(inversor as any).ativo
      // Optimistic update
      setInversores((prev) => prev.map((i) => (i.id === inversor.id ? { ...i, ativo: newState } : i)))

      const resp = await fetch('/api/inversores/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: inversor.id })
      })
      const data = await resp.json()
      if (!resp.ok) throw data
      toast({ title: 'Sucesso', description: `Inversor ${data.ativo ? 'ativado' : 'inativado'} com sucesso` })
    } catch (e) {
      console.error('Erro toggling inversor ativo:', e)
      toast({ title: 'Erro', description: 'Não foi possível alterar o estado do inversor', variant: 'destructive' })
      await carregarInversores()
    }
  }

  if (mostrarFormulario) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {editandoInversor ? "Editar Inversor" : "Módulo Cadastro de Inversor - Tipo Inversor String"}
            </h2>
            <p className="text-muted-foreground">
              Cadastro de inversores do tipo String
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setMostrarFormulario(false)
              setEditandoInversor(null)
              resetForm()
            }}
          >
            Cancelar
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Tabs defaultValue="comercial" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="comercial">Dados Comerciais</TabsTrigger>
                  <TabsTrigger value="tecnicos">Especificações Técnicas</TabsTrigger>
                  {/* Added Nomenclature tab */}
                  <TabsTrigger value="nomenclatura">Nomenclatura</TabsTrigger>
                </TabsList>

                <TabsContent value="comercial" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Informações Comerciais</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="fornecedor">Fornecedor *</Label>
                          <Select
                            value={formData.fornecedor_id || ""}
                            onValueChange={(value) => {
                              console.log("[v0] Fornecedor selected:", value)
                              console.log("[v0] Current formData.fornecedor_id:", formData.fornecedor_id)
                              setFormData((prev) => {
                                const newData = { ...prev, fornecedor_id: value }
                                console.log("[v0] Updated formData:", newData)
                                return newData
                              })
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  loadingFornecedores ? "Carregando fornecedores..." : "Selecione o fornecedor"
                                } />
                            </SelectTrigger>
                            <SelectContent>
                              {loadingFornecedores ? (
                                <SelectItem value="loading_placeholder" disabled>
                                  Carregando fornecedores...
                                </SelectItem>
                              ) : fornecedores.length === 0 ? (
                                <SelectItem value="no_suppliers_placeholder" disabled>
                                  Nenhum fornecedor encontrado
                                </SelectItem>
                              ) : (
                                fornecedores.map((fornecedor) => (
                                  <SelectItem key={fornecedor.id} value={fornecedor.id || "invalid_id_fallback"}>
                                    {fornecedor.nome}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {/* Removed unnecessary helper text as per Falha 2 */}
                        </div>

                        <div>
                          <Label htmlFor="tipo">Tipo *</Label>
                          <Select
                            value={formData.tipo}
                            onValueChange={(value: "String" | "Micro Inversor") => {
                              setFormData((prev) => ({
                                ...prev,
                                tipo: value,
                                fases: value === "Micro Inversor" ? "Monofásico" : prev.fases,
                              }))
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="String">String</SelectItem>
                              <SelectItem value="Micro Inversor">Micro Inversor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="fases">Fases *</Label>
                          <Select
                            value={formData.fases}
                            onValueChange={(value: "Monofásico" | "Trifásico") =>
                              setFormData((prev) => ({ ...prev, fases: value }))
                            }
                            disabled={formData.tipo === "Micro Inversor"}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione as fases" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Monofásico">Monofásico</SelectItem>
                              {formData.tipo === "String" && <SelectItem value="Trifásico">Trifásico</SelectItem>}
                            </SelectContent>
                          </Select>
                          {/* For Micro Inversores the fases Select is disabled; helper text removed per Falha 12 */}
                        </div>
                        <div>
                          <Label htmlFor="tensao">Tensão *</Label>
                          <Select
                            value={formData.tensao}
                            onValueChange={(value: "380V" | "220V" | "127V") =>
                              setFormData((prev) => ({ ...prev, tensao: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a tensão" />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Global Rule: Monofásico = 220V, Trifásico = 380V */}
                              {formData.fases === 'Monofásico' && (
                                <SelectItem value="220V">220V</SelectItem>
                              )}

                              {formData.fases === 'Trifásico' && (
                                <SelectItem value="380V">380V</SelectItem>
                              )}

                              {/* Fallback for when phase is not selected yet */}
                              {!formData.fases && (
                                <>
                                  <SelectItem value="220V">220V</SelectItem>
                                  <SelectItem value="380V">380V</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="marca">Marca *</Label>
                          <Input
                            id="marca"
                            className="border border-gray-400"
                            value={formData.marca}
                            onChange={(e) => setFormData((prev) => ({ ...prev, marca: e.target.value }))}
                            required />
                        </div>
                        <div>
                          <Label htmlFor="modelo">Modelo/Linha/Série *</Label>
                          <Input
                            id="modelo"
                            className="border border-gray-400"
                            value={formData.modelo}
                            onChange={(e) => setFormData((prev) => ({ ...prev, modelo: e.target.value }))}
                            required />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="potencia">Potência (kW) *</Label>
                          <Input
                            id="potencia"
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            className="border border-gray-400"
                            value={formData.potencia_kw ?? ""}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number.parseFloat(e.target.value)
                              setFormData((prev) => ({ ...prev, potencia_kw: value }))
                            }}
                            required />
                        </div>
                        {formData.tipo !== "Micro Inversor" && (
                          <div>
                            <Label htmlFor="potenciaMaxEntrada">Potência Máx. Entrada (kW)</Label>
                            <Input
                              id="potenciaMaxEntrada"
                              type="number"
                              step="0.1"
                              value={formData.potencia_max_entrada_kw ?? ""}
                              onChange={(e) =>
                                setFormData((prev) => ({ ...prev, potencia_max_entrada_kw: e.target.value === '' ? undefined : Number(e.target.value) }))
                              }

                              className="bg-background" />
                          </div>
                        )}
                      </div>

                      {/* Novos campos para Micro Inversor - Falha 8 Correção */}
                      {formData.tipo === "Micro Inversor" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="qtdEntradaMod">Qtd Entrada de Mód</Label>
                            <Input
                              id="qtdEntradaMod"
                              type="number"
                              min="1"
                              step="1"
                              className="border border-gray-400"
                              value={formData.dc_total_strings ?? ""}
                              onChange={(e) =>
                                setFormData((prev) => ({ ...prev, dc_total_strings: e.target.value === '' ? undefined : Number(e.target.value) }))
                              }
                              required
                            />
                            <p className="text-xs text-muted-foreground mt-1">Quantidade máxima de módulos que o inversor suporta.</p>
                          </div>
                          <div>
                            <Label htmlFor="potenciaMaxMod">Potência Máx do Mód (W)</Label>
                            <Input
                              id="potenciaMaxMod"
                              type="number"
                              min="0"
                              step="1"
                              className="border border-gray-400"
                              value={formData.potencia_modulo_aceita_w ?? ""}
                              onChange={(e) =>
                                setFormData((prev) => ({ ...prev, potencia_modulo_aceita_w: e.target.value === '' ? undefined : Number(e.target.value) }))
                              }
                            />
                            <p className="text-xs text-muted-foreground mt-1">Potência máxima que o inversor suporta de placa.</p>
                          </div>
                        </div>
                      )}

                      {/* Campos de Overload - visíveis apenas para String Inversores */}
                      {formData.tipo !== "Micro Inversor" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="overload">Overload Máx (%)</Label>
                            <Input
                              id="overload"
                              type="number"
                              value={formData.overload ?? ""}
                              onChange={(e) => setFormData((prev) => ({ ...prev, overload: e.target.value === '' ? undefined : Number(e.target.value) }))}
                              min="0"
                              max="200" />
                          </div>
                          <div>
                            <Label htmlFor="overloadUsado">Overload % Usado</Label>
                            <Input
                              id="overloadUsado"
                              type="number"
                              min={0}
                              max={200}
                              step={1}
                              className="border border-gray-400"
                              value={formData.overload_usado ?? ""}
                              onChange={(e) => setFormData((prev) => ({ ...prev, overload_usado: e.target.value === '' ? undefined : Number(e.target.value) }))}
                            />
                            <p className="text-sm text-muted-foreground mt-1">Digite o percentual de overload usado (ex: 100 para 100%).</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="precoKit">Preço no Kit (R$)</Label>
                          <Input
                            id="precoKit"
                            type="text"
                            inputMode="decimal"
                            className="border border-gray-400"
                            value={formData.preco_kit !== undefined && formData.preco_kit !== null ? formData.preco_kit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ""}
                            onChange={(e) => {
                              const masked = maskCurrency(e.target.value)
                              setFormData((prev) => ({ ...prev, preco_kit: masked ? Number(masked.replace(',', '.')) : undefined }))
                            }} />
                        </div>
                        <div>
                          <Label htmlFor="precoAvulso">Preço Avulso (R$)</Label>
                          <Input
                            id="precoAvulso"
                            type="text"
                            inputMode="decimal"
                            className="border border-gray-400"
                            value={formData.preco_avulso !== undefined && formData.preco_avulso !== null ? formData.preco_avulso.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ""}
                            onChange={(e) => {
                              const masked = maskCurrency(e.target.value)
                              setFormData((prev) => ({ ...prev, preco_avulso: masked ? Number(masked.replace(',', '.')) : undefined }))
                            }} />
                        </div>
                        <div>
                          <Label htmlFor="garantia">Garantia (anos)</Label>
                          <Input
                            id="garantia"
                            type="number"
                            min="5"
                            max="25"
                            className="border border-gray-400"
                            value={formData.garantia ?? ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, garantia: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        </div>
                      </div>

                      {/* M4 - Enhanced String Box Section: only show for String inverters */}
                      {formData.tipo === "String" && (
                        <div className="border-t pt-4">
                          <h3 className="text-lg font-semibold mb-4">String Box</h3>
                          <div className="space-y-4">
                            <div className="p-4 border rounded-lg bg-muted/30">
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                  <Label htmlFor="string_box" className="text-base font-medium">
                                    Adicionar String Box
                                  </Label>
                                  <p className="text-sm text-muted-foreground">
                                    Inclui string box no kit do inversor
                                  </p>
                                </div>
                                <Switch
                                  id="string_box"
                                  checked={formData.string_box}
                                  onCheckedChange={(checked) =>
                                    setFormData((prev) => ({ ...prev, string_box: checked as boolean }))
                                  } />
                              </div>
                            </div>

                            {/* M4 - String box selection when enabled (only for String type) */}
                            {formData.string_box && (
                              <div className="p-4 border rounded-lg bg-blue-50">
                                <Label htmlFor="string_box_vinculada" className="text-base font-medium mb-2 block">
                                  Selecionar String Box
                                </Label>
                                <div className="space-y-2">
                                  {loadingStringBoxes ? (
                                    <p>Carregando...</p>
                                  ) : stringBoxes.length > 0 ? (
                                    stringBoxes.map((sb) => (
                                      <div key={sb.id} className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          id={`sb-${sb.id}`}
                                          checked={formData.string_box_vinculadas?.includes(sb.id) || false}
                                          onChange={(e) => {
                                            const checked = e.target.checked
                                            setFormData((prev) => {
                                              const current = prev.string_box_vinculadas || []
                                              const next = checked ? [...current, sb.id] : current.filter((id) => id !== sb.id)
                                              return { ...prev, string_box_vinculadas: next }
                                            })
                                          }}
                                        />
                                        <label htmlFor={`sb-${sb.id}`} className="text-sm">
                                          {sb.marca} - {sb.nome}
                                        </label>
                                      </div>
                                    ))
                                  ) : (
                                    <p>Nenhuma string box disponível</p>
                                  )}
                                  <p className="text-sm text-muted-foreground mt-2">String boxes são aplicáveis apenas a inversores String</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold">Proteções Extras</h4>
                        <div className="p-4 border rounded-lg bg-muted/30">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <Label htmlFor="afciIntegrado" className="text-base font-medium">
                                AFCI Integrado
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Arc Fault Circuit Interrupter integrado
                              </p>
                            </div>
                            <Switch
                              id="afciIntegrado"
                              checked={formData.afci_integrado}
                              onCheckedChange={(checked) =>
                                setFormData((prev) => ({ ...prev, afci_integrado: checked }))
                              } />
                          </div>
                        </div>

                        {formData.tipo === "Micro Inversor" && (
                          <div className="p-4 border rounded-lg bg-muted/30">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <Label htmlFor="rsdIntegrado" className="text-base font-medium">
                                  RSD Rapid Shutdown Integrado
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  Rapid Shutdown Device integrado (Micro Inversores)
                                </p>
                              </div>
                              <Switch
                                id="rsdIntegrado"
                                checked={formData.rsd_rapid_shutdown}
                                onCheckedChange={(checked) =>
                                  setFormData((prev) => ({ ...prev, rsd_rapid_shutdown: checked as boolean }))
                                } />
                            </div>
                          </div>
                        )}

                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="tecnicos" className="space-y-4">
                  <Tabs defaultValue="dc" className="space-y-4">
                    <TabsList>
                      <TabsTrigger value="dc">DC</TabsTrigger>
                      <TabsTrigger value="ac">AC</TabsTrigger>
                      <TabsTrigger value="protecoes">Proteções</TabsTrigger>
                      <TabsTrigger value="gerais">Dados Gerais</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dc">
                      <Card>
                        <CardHeader>
                          <CardTitle>Especificações Elétricas - DC (Entrada FV)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">

                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Especificações por MPPT e Strings</h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                              <div>
                                <Label htmlFor="numMPPTs">Número de MPPTs</Label>
                                <Input
                                  id="numMPPTs"
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={numMPPTs}
                                  onChange={(e) => setNumMPPTs(Number(e.target.value))} />
                              </div>
                              <div>
                                <Label htmlFor="stringsPerMPPT">Qtd. de Strings por MPPT</Label>
                                <Input
                                  id="stringsPerMPPT"
                                  type="number"
                                  min="1"
                                  max="5"
                                  value={stringsPerMPPT}
                                  onChange={(e) => setStringsPerMPPT(Number(e.target.value))} />
                              </div>
                              <div className="flex items-end">
                                <div className="text-sm">
                                  <span className="font-medium">Total de Strings: </span>
                                  <span className="text-lg font-bold">{numMPPTs * stringsPerMPPT}</span>
                                </div>
                              </div>
                            </div>

                            {formData.tipo === 'Micro Inversor' && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <Label htmlFor="modulosPorMicro">Módulos por micro</Label>
                                  <Input
                                    id="modulosPorMicro"
                                    type="number"
                                    min={1}
                                    placeholder="Ex: 4"
                                    value={formData.dc_total_strings ?? ''}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, dc_total_strings: e.target.value === '' ? undefined : Number(e.target.value) }))}
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">Micro não usa overload; informe a quantidade por micro.</p>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="space-y-4">
                            <h4 className="font-medium">Especificações Globais</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label htmlFor="faixaTensaoOpMin">Faixa Tensão Operacional Mínima (Vdc)</Label>
                                <Input
                                  id="faixaTensaoOpMin"
                                  type="number"
                                  value={globalSpecs.faixa_tensao_op_min}
                                  onChange={(e) =>
                                    setGlobalSpecs((prev) => ({ ...prev, faixa_tensao_op_min: Number(e.target.value) }))
                                  } />
                              </div>
                              <div>
                                <Label htmlFor="faixaTensaoOpMax">Faixa Tensão Operacional Máxima (Vdc)</Label>
                                <Input
                                  id="faixaTensaoOpMax"
                                  type="number"
                                  value={globalSpecs.faixa_tensao_op_max}
                                  onChange={(e) =>
                                    setGlobalSpecs((prev) => ({ ...prev, faixa_tensao_op_max: Number(e.target.value) }))
                                  } />
                              </div>
                              <div>
                                <Label htmlFor="tensaoPartidaGlobal">Tensão Partida (Vdc)</Label>
                                <Input
                                  id="tensaoPartidaGlobal"
                                  type="number"
                                  value={globalSpecs.tensao_partida}
                                  onChange={(e) =>
                                    setGlobalSpecs((prev) => ({ ...prev, tensao_partida: Number(e.target.value) }))
                                  } />
                              </div>
                              <div>
                                <Label htmlFor="tensaoNominalGlobal">Tensão Nominal (Vdc)</Label>
                                <Input
                                  id="tensaoNominalGlobal"
                                  type="number"
                                  value={globalSpecs.tensao_nominal}
                                  onChange={(e) =>
                                    setGlobalSpecs((prev) => ({ ...prev, tensao_nominal: Number(e.target.value) }))
                                  } />
                              </div>
                              <div>
                                <Label htmlFor="tensaoMaxEntradaGlobal">Tensão Máxima de Entrada (Vdc)</Label>
                                <Input
                                  id="tensaoMaxEntradaGlobal"
                                  type="number"
                                  value={globalSpecs.tensao_max_entrada}
                                  onChange={(e) =>
                                    setGlobalSpecs((prev) => ({ ...prev, tensao_max_entrada: Number(e.target.value) }))
                                  } />
                              </div>
                              <div>
                                <Label htmlFor="correnteMaxEntradaGlobal">Corrente máx. por Entrada (A)</Label>
                                <Input
                                  id="correnteMaxEntradaGlobal"
                                  type="number"
                                  step="0.1"
                                  value={globalSpecs.corrente_max_entrada}
                                  onChange={(e) =>
                                    setGlobalSpecs((prev) => ({
                                      ...prev,
                                      corrente_max_entrada: Number(e.target.value),
                                    }))
                                  } />
                              </div>
                              <div>
                                <Label htmlFor="correnteCurtoCircuitoGlobal">Corrente de curto-circuito MPPT (A)</Label>
                                <Input
                                  id="correnteCurtoCircuitoGlobal"
                                  type="number"
                                  step="0.1"
                                  value={globalSpecs.corrente_curto_circuito}
                                  onChange={(e) =>
                                    setGlobalSpecs((prev) => ({
                                      ...prev,
                                      corrente_curto_circuito: Number(e.target.value),
                                    }))
                                  } />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-6">
                            {mpptSpecs.map((mppt, mpptIndex) => (
                              <Card key={mpptIndex} className="border-2">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base">MPPT - {mpptIndex + 1}</CardTitle>
                                  <p className="text-sm text-muted-foreground">{stringsPerMPPT} Strings</p>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  {mppt.strings.map((string, stringIndex) => (
                                    <Card key={stringIndex} className="bg-muted/50">
                                      <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">String {stringIndex + 1}</CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-sm">
                                            <thead>
                                              <tr className="border-b">
                                                <th className="text-left py-2 font-medium text-muted-foreground">
                                                  Parâmetro
                                                </th>
                                                <th className="text-center py-2 font-medium text-muted-foreground">
                                                  Valor
                                                </th>
                                                <th className="text-center py-2 font-medium text-muted-foreground">
                                                  Un.
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody className="space-y-1">
                                              <tr className="border-b border-muted">
                                                <td className="py-2">Faixa Tensão Operacional Mínima MPPT</td>
                                                <td className="text-center py-2 font-medium">
                                                  {string.faixa_tensao_op_min_mppt}
                                                </td>
                                                <td className="text-center py-2 text-muted-foreground">Vdc</td>
                                              </tr>
                                              <tr className="border-b border-muted">
                                                <td className="py-2">Faixa Tensão Operacional Máxima MPPT</td>
                                                <td className="text-center py-2 font-medium">
                                                  {string.faixa_tensao_op_max_mppt}
                                                </td>
                                                <td className="text-center py-2 text-muted-foreground">Vdc</td>
                                              </tr>
                                              <tr className="border-b border-muted">
                                                <td className="py-2">Tensão Partida</td>
                                                <td className="text-center py-2 font-medium">
                                                  {string.tensao_partida}
                                                </td>
                                                <td className="text-center py-2 text-muted-foreground">Vdc</td>
                                              </tr>
                                              <tr className="border-b border-muted">
                                                <td className="py-2">Tensão Nominal</td>
                                                <td className="text-center py-2 font-medium">
                                                  {string.tensao_nominal}
                                                </td>
                                                <td className="text-center py-2 text-muted-foreground">Vdc</td>
                                              </tr>
                                              <tr className="border-b border-muted">
                                                <td className="py-2">Tensão Máxima de Entrada</td>
                                                <td className="text-center py-2 font-medium">
                                                  {string.tensao_max_entrada}
                                                </td>
                                                <td className="text-center py-2 text-muted-foreground">Vdc</td>
                                              </tr>
                                              <tr className="border-b border-muted">
                                                <td className="py-2">Corrente máx. por Entrada</td>
                                                <td className="text-center py-2 font-medium">
                                                  {string.corrente_max_entrada}
                                                </td>
                                                <td className="text-center py-2 text-muted-foreground">A</td>
                                              </tr>
                                              <tr>
                                                <td className="py-2">Corrente de curto-circuito MPPT</td>
                                                <td className="text-center py-2 font-medium">
                                                  {string.corrente_curto_circuito_mppt}
                                                </td>
                                                <td className="text-center py-2 text-muted-foreground">A</td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </CardContent>
                              </Card>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="chaveSeccionadoraDc"
                                checked={formData.chave_seccionadora_dc || false}
                                onCheckedChange={(checked) =>
                                  setFormData((prev) => ({ ...prev, chave_seccionadora_dc: checked }))
                                } />
                              <Label htmlFor="chaveSeccionadoraDc">Chave seccionadora DC integrada</Label>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="ac">
                      <Card>
                        <CardHeader>
                          <CardTitle>Especificações Elétricas - AC (Saída / Rede)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">

                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="potenciaNominalKw">Potência nominal (kW)</Label>
                                <Input
                                  id="potenciaNominalKw"
                                  type="number"
                                  step="0.01"
                                  value={formData.ac_potencia_nominal || ""}
                                  onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, ac_potencia_nominal: Number(e.target.value) }))
                                  } />
                              </div>
                              <div>
                                <Label htmlFor="potenciaMaxKva">Potência máx. (kVA)</Label>
                                <Input
                                  id="potenciaMaxKva"
                                  type="number"
                                  step="0.01"
                                  value={formData.ac_potencia_max || ""}
                                  onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, ac_potencia_max: Number(e.target.value) }))
                                  } />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label htmlFor="tensaoNominalAc">Tensão nominal AC (V)</Label>
                                <Input
                                  id="tensaoNominalAc"
                                  type="number"
                                  step="0.1"
                                  value={formData.ac_tensao_nominal || ""}
                                  onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, ac_tensao_nominal: Number(e.target.value) }))
                                  } />
                              </div>
                              <div>
                                <Label htmlFor="faixaTensaoMin">Faixa tensão AC permitida mín. (V)</Label>
                                <Input
                                  id="faixaTensaoMin"
                                  type="number"
                                  step="0.1"
                                  value={formData.ac_faixa_tensao_min || ""}
                                  onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, ac_faixa_tensao_min: Number(e.target.value) }))
                                  } />
                              </div>
                              <div>
                                <Label htmlFor="faixaTensaoMax">Faixa tensão AC permitida máx. (V)</Label>
                                <Input
                                  id="faixaTensaoMax"
                                  type="number"
                                  step="0.1"
                                  value={formData.ac_faixa_tensao_max || ""}
                                  onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, ac_faixa_tensao_max: Number(e.target.value) }))
                                  } />
                              </div>
                            </div>

                            <div>
                              <Label>Frequência Hz</Label>
                              <div className="flex gap-4 mt-2 mb-4">
                                <Button
                                  type="button"
                                  variant={frequencyType === "50hz" ? "default" : "outline"}
                                  onClick={() => {
                                    setFrequencyType("50hz")
                                    setFormData((prev) => ({
                                      ...prev,
                                      ac_frequencia_tipo: "50hz",
                                      ac_frequencia_min: 44,
                                      ac_frequencia_max: 55,
                                    }))
                                  }}
                                >
                                  50 Hz
                                </Button>
                                <Button
                                  type="button"
                                  variant={frequencyType === "60hz" ? "default" : "outline"}
                                  onClick={() => {
                                    setFrequencyType("60hz")
                                    setFormData((prev) => ({
                                      ...prev,
                                      ac_frequencia_tipo: "60hz",
                                      ac_frequencia_min: 55,
                                      ac_frequencia_max: 65,
                                    }))
                                  }}
                                >
                                  60 Hz
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="frequenciaMin">Frequência mín. (Hz)</Label>
                                  <Input
                                    id="frequenciaMin"
                                    type="number"
                                    step="0.1"
                                    value={formData.ac_frequencia_min || ""}
                                    onChange={(e) =>
                                      setFormData((prev) => ({ ...prev, ac_frequencia_min: Number(e.target.value) }))
                                    } />
                                </div>
                                <div>
                                  <Label htmlFor="frequenciaMax">Frequência máx. (Hz)</Label>
                                  <Input
                                    id="frequenciaMax"
                                    type="number"
                                    step="0.1"
                                    value={formData.ac_frequencia_max || ""}
                                    onChange={(e) =>
                                      setFormData((prev) => ({ ...prev, ac_frequencia_max: Number(e.target.value) }))
                                    } />
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label htmlFor="correnteNominalSaida">Corrente nominal saída (A)</Label>
                                <Input
                                  id="correnteNominalSaida"
                                  type="number"
                                  step="0.01"
                                  value={formData.ac_corrente_nominal || ""}
                                  onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, ac_corrente_nominal: Number(e.target.value) }))
                                  } />
                              </div>
                              <div>
                                <Label htmlFor="eficienciaMaxBrasil">Eficiência máx. Brasil (%)</Label>
                                <Input
                                  id="eficienciaMaxBrasil"
                                  type="number"
                                  step="0.1"
                                  value={formData.ac_eficiencia_max_brasil || ""}
                                  onChange={(e) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      ac_eficiencia_max_brasil: Number(e.target.value),
                                    }))
                                  } />
                              </div>
                              <div>
                                <Label htmlFor="unidadesMaxConexao">Unidades máximas por Conexão</Label>
                                <Input
                                  id="unidadesMaxConexao"
                                  type="number"
                                  value={formData.ac_unidades_max_conexao || ""}
                                  onChange={(e) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      ac_unidades_max_conexao: Number(e.target.value),
                                    }))
                                  } />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="fpAjustavel">FP ajustável - faixas de cos φ</Label>
                                <Input
                                  id="fpAjustavel"
                                  type="text"
                                  value={formData.ac_fp_ajustavel_max || ""}
                                  onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, ac_fp_ajustavel_max: e.target.value }))
                                  } />
                              </div>
                              <div>
                                <Label htmlFor="thdCorrente">Distorção harmônica total THD corrente</Label>
                                <Input
                                  id="thdCorrente"
                                  type="text"
                                  value={formData.ac_thd_corrente || ""}
                                  onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, ac_thd_corrente: e.target.value }))
                                  } />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="protecoes">
                      <Card>
                        <CardHeader>
                          <CardTitle>Especificações Elétricas - Proteções</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">

                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="protSobretensao">Proteção contra sobretensão</Label>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant={formData.prot_sobretensao ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFormData((prev) => ({ ...prev, prot_sobretensao: true }))}
                                  >
                                    Sim
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={!formData.prot_sobretensao ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFormData((prev) => ({ ...prev, prot_sobretensao: false }))}
                                  >
                                    Não
                                  </Button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <Label htmlFor="deteccaoIsolamento">Detecção de resistência de isolamento de CC</Label>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant={formData.deteccao_isolamento ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFormData((prev) => ({ ...prev, deteccao_isolamento: true }))}
                                  >
                                    Sim
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={!formData.deteccao_isolamento ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFormData((prev) => ({ ...prev, deteccao_isolamento: false }))}
                                  >
                                    Não
                                  </Button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <Label htmlFor="monitoramentoDci">Monitoramento DCI</Label>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant={formData.monitoramento_dci ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFormData((prev) => ({ ...prev, monitoramento_dci: true }))}
                                  >
                                    Sim
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={!formData.monitoramento_dci ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFormData((prev) => ({ ...prev, monitoramento_dci: false }))}
                                  >
                                    Não
                                  </Button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <Label htmlFor="monitoramentoGfci">Monitoramento GFCI</Label>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant={formData.monitoramento_gfci ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFormData((prev) => ({ ...prev, monitoramento_gfci: true }))}
                                  >
                                    Sim
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={!formData.monitoramento_gfci ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFormData((prev) => ({ ...prev, monitoramento_gfci: false }))}
                                  >
                                    Não
                                  </Button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <Label htmlFor="monitoramentoRede">Monitoramento de rede</Label>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant={formData.monitoramento_rede ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFormData((prev) => ({ ...prev, monitoramento_rede: true }))}
                                  >
                                    Sim
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={!formData.monitoramento_rede ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFormData((prev) => ({ ...prev, monitoramento_rede: false }))}
                                  >
                                    Não
                                  </Button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <Label htmlFor="protCurtoCircuitoCa">Proteção de curto-circuito CA</Label>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant={formData.prot_curto_circuito_ca ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFormData((prev) => ({ ...prev, prot_curto_circuito_ca: true }))}
                                  >
                                    Sim
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={!formData.prot_curto_circuito_ca ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFormData((prev) => ({ ...prev, prot_curto_circuito_ca: false }))}
                                  >
                                    Não
                                  </Button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <Label htmlFor="deteccaoAterramentoCa">Detecção de aterramento CA</Label>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant={formData.deteccao_aterramento_ca ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFormData((prev) => ({ ...prev, deteccao_aterramento_ca: true }))}
                                  >
                                    Sim
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={!formData.deteccao_aterramento_ca ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFormData((prev) => ({ ...prev, deteccao_aterramento_ca: false }))}
                                  >
                                    Não
                                  </Button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <Label htmlFor="protSuperaquecimento">Proteção contra superaquecimento</Label>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant={formData.prot_superaquecimento ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFormData((prev) => ({ ...prev, prot_superaquecimento: true }))}
                                  >
                                    Sim
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={!formData.prot_superaquecimento ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFormData((prev) => ({ ...prev, prot_superaquecimento: false }))}
                                  >
                                    Não
                                  </Button>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="protSurtosDc">Proteção contra surtos de CC</Label>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant={formData.prot_surtos_dc ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFormData((prev) => ({ ...prev, prot_surtos_dc: true }))}
                                  >
                                    Sim
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={!formData.prot_surtos_dc ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFormData((prev) => ({ ...prev, prot_surtos_dc: false }))}
                                  >
                                    Não
                                  </Button>
                                </div>
                              </div>
                              {formData.prot_surtos_dc && (
                                <div className="ml-4">
                                  <Label>Tipo</Label>
                                  <div className="flex gap-2 mt-2">
                                    {["I", "II", "III"].map((tipo) => (
                                      <Button
                                        key={tipo}
                                        type="button"
                                        variant={formData.prot_surtos_dc_tipo === tipo ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setFormData((prev) => ({ ...prev, prot_surtos_dc_tipo: tipo as "I" | "II" | "III" }))}
                                      >
                                        Tipo {tipo}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-between">
                                <Label htmlFor="protSurtosCa">Proteção contra surtos de CA</Label>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant={formData.prot_surtos_ca ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFormData((prev) => ({ ...prev, prot_surtos_ca: true }))}
                                  >
                                    Sim
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={!formData.prot_surtos_ca ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFormData((prev) => ({ ...prev, prot_surtos_ca: false }))}
                                  >
                                    Não
                                  </Button>
                                </div>
                              </div>
                              {formData.prot_surtos_ca && (
                                <div className="ml-4">
                                  <Label>Tipo</Label>
                                  <div className="flex gap-2 mt-2">
                                    {["I", "II", "III"].map((tipo) => (
                                      <Button
                                        key={tipo}
                                        type="button"
                                        variant={formData.prot_surtos_ca_tipo === tipo ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setFormData((prev) => ({ ...prev, prot_surtos_ca_tipo: tipo as "I" | "II" | "III" }))}
                                      >
                                        Tipo {tipo}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="gerais">
                      <Card>
                        <CardHeader>
                          <CardTitle>Especificações Elétricas - Dados Gerais</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">

                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="conexaoCc">Conexão CC</Label>
                                <Input
                                  id="conexaoCc"
                                  type="text"
                                  value={formData.conexao_cc || ""}
                                  onChange={(e) => setFormData((prev) => ({ ...prev, conexao_cc: e.target.value }))} />
                              </div>
                              <div>
                                <Label>Comunicação</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {["Wi-Fi", "4G", "PLC"].map((option) => (
                                    <Button
                                      key={option}
                                      type="button"
                                      variant={formData.comunicacao?.includes(option) ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => {
                                        const current = formData.comunicacao || []
                                        const updated = current.includes(option)
                                          ? current.filter((item) => item !== option)
                                          : [...current, option]
                                        setFormData((prev) => ({ ...prev, comunicacao: updated }))
                                      }}
                                    >
                                      {option}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="consumoNoite">Consumo à noite [W]</Label>
                                <Input
                                  id="consumoNoite"
                                  type="text"
                                  value={formData.consumo_noite || ""}
                                  onChange={(e) => setFormData((prev) => ({ ...prev, consumo_noite: e.target.value }))} />
                              </div>
                              <div>
                                <Label htmlFor="consumoEspera">Consumo em espera [W]</Label>
                                <Input
                                  id="consumoEspera"
                                  type="text"
                                  value={formData.consumo_espera || ""}
                                  onChange={(e) => setFormData((prev) => ({ ...prev, consumo_espera: e.target.value }))} />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="tempOpMin">Temperatura operacional mínima (°C)</Label>
                                <Input
                                  id="tempOpMin"
                                  type="text"
                                  value={formData.temp_op_min || ""}
                                  onChange={(e) => setFormData((prev) => ({ ...prev, temp_op_min: e.target.value }))} />
                              </div>
                              <div>
                                <Label htmlFor="tempOpMax">Temperatura operacional máxima (°C)</Label>
                                <Input
                                  id="tempOpMax"
                                  type="text"
                                  value={formData.temp_op_max || ""}
                                  onChange={(e) => setFormData((prev) => ({ ...prev, temp_op_max: e.target.value }))} />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label htmlFor="tempReducaoPotencia">Temperatura redução de potência</Label>
                                <Input
                                  id="tempReducaoPotencia"
                                  type="text"
                                  value={formData.temp_reducao_potencia || ""}
                                  onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, temp_reducao_potencia: e.target.value }))
                                  } />
                              </div>
                              <div>
                                <Label htmlFor="ruido">Ruído [dBA]</Label>
                                <Input
                                  id="ruido"
                                  type="text"
                                  value={formData.ruido || ""}
                                  onChange={(e) => setFormData((prev) => ({ ...prev, ruido: e.target.value }))} />
                              </div>
                              <div>
                                <Label htmlFor="protecaoEntrada">Proteção de entrada</Label>
                                <Input
                                  id="protecaoEntrada"
                                  type="text"
                                  value={formData.protecao_entrada || ""}
                                  onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, protecao_entrada: e.target.value }))
                                  } />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="dimensoes">Dimensões (A x L x P)</Label>
                                <Input
                                  id="dimensoes"
                                  type="text"
                                  value={formData.dimensoes || ""}
                                  onChange={(e) => setFormData((prev) => ({ ...prev, dimensoes: e.target.value }))} />
                              </div>
                              <div>
                                <Label htmlFor="pesoGeral">Peso</Label>
                                <Input
                                  id="pesoGeral"
                                  type="text"
                                  value={formData.peso_geral || ""}
                                  onChange={(e) => setFormData((prev) => ({ ...prev, peso_geral: e.target.value }))} />
                              </div>
                            </div>

                            <div>
                              <Label>Atende os Padrões e Normas</Label>
                              <div className="mt-2 p-4 bg-muted rounded-lg">
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    "IEC/EN62109-1/2",
                                    "EN61000-6-1/2/3/4",
                                    "IEC61683",
                                    "IEC60068-2",
                                    "IEC62116",
                                    "IEC61727",
                                    "EA/MEA",
                                    "VDE0126-1-1/A1",
                                    "CEI 0-21",
                                    "VDE-AR-N 4105",
                                    "AS/NZ54777.2",
                                    "CQC NBT 32004",
                                    "G98/G99",
                                    "NBR 16149",
                                    "NBR 16150",
                                    "C10/11",
                                    "RD1699",
                                    "UNE206006",
                                    "UNE206007",
                                    "EN50438",
                                  ].map((norma) => (
                                    <Button
                                      key={norma}
                                      type="button"
                                      variant={formData.normas?.includes(norma) ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => {
                                        const current = formData.normas || []
                                        const updated = current.includes(norma)
                                          ? current.filter((item) => item !== norma)
                                          : [...current, norma]
                                        setFormData((prev) => ({ ...prev, normas: updated }))
                                      }}
                                    >
                                      {norma}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </TabsContent>

                <TabsContent value="dc" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Especificações Elétricas – DC (Entrada FV)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {formData.tipo === "Micro Inversor" ? (
                        <div className="space-y-4">
                          <h4 className="font-medium">Especificações para Micro Inversor</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Potência do módulo fotovoltaico (Wp)</Label>
                              <Input
                                placeholder="Ex: 450"
                                type="number"
                                value={formData.potencia_modulo_aceita_w ?? ""}
                                onChange={(e) => setFormData((prev) => ({ ...prev, potencia_modulo_aceita_w: e.target.value === '' ? undefined : Number(e.target.value) }))}
                              />
                            </div>
                            <div>
                              <Label>Módulos por micro</Label>
                              <Input
                                placeholder="Ex: 4"
                                type="number"
                                min={1}
                                value={formData.dc_total_strings ?? ""}
                                onChange={(e) => setFormData((prev) => ({ ...prev, dc_total_strings: e.target.value === '' ? undefined : Number(e.target.value) }))}
                              />
                            </div>
                            <div>
                              <Label>Faixa de tensão operacional</Label>
                              <Input placeholder="Digite a faixa de tensão MPPT" />
                            </div>
                            <div>
                              <Label>Faixa de tensão MPPT (Vdc)</Label>
                              <Input placeholder="Digite a faixa de tensão ótima" />
                            </div>
                            <div>
                              <Label>Tensão máx. DC (Vdc)</Label>
                              <Input placeholder="Digite a tensão máxima" />
                            </div>
                            <div>
                              <Label>Tensão de Nominal (Vdc)</Label>
                              <Input placeholder="Digite a tensão de circuito aberto" />
                            </div>
                            <div>
                              <Label>Tensão de partida (Vdc)</Label>
                              <Input placeholder="Digite a tensão de inicialização" />
                            </div>
                            <div>
                              <Label>Corrente máx. por MPPT (A)</Label>
                              <Input placeholder="Digite a corrente máxima" />
                            </div>
                            <div>
                              <Label>Corrente de curto-circuito máx. por MPPT (A, Isc máx.)</Label>
                              <Input placeholder="Digite a corrente de curto-circuito" />
                            </div>
                            <div>
                              <Label>Número de MPPTs</Label>
                              <Input placeholder="Digite o número de MPPTs" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <h4 className="font-medium">Especificações para Inversor String</h4>
                          <p className="text-sm text-muted-foreground">
                            A partir das Informações acima, criar string conforme o número de MPPTs e Strings por MPPT.
                          </p>

                          <div className="border rounded-lg p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div>
                                <Label>Potência do módulo aceita pelo inversor (Wp)</Label>
                                <Input
                                  placeholder="Ex: 540"
                                  type="number"
                                  value={formData.potencia_modulo_aceita_w ?? ""}
                                  onChange={(e) => setFormData((prev) => ({ ...prev, potencia_modulo_aceita_w: e.target.value === '' ? undefined : Number(e.target.value) }))}
                                />
                              </div>
                            </div>
                            <MPPTSpecsEditable />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Added Nomenclature tab content */}
                <TabsContent value="nomenclatura" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Proteções Extras</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-4">
                        {formData.tipo === "Micro Inversor" ? (
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground mb-4">
                              Configure as proteções e opções de nomenclatura para Micro Inversores:
                            </p>

                            <div className="p-4 border rounded-lg bg-muted/30">
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                  <Label htmlFor="marca_no_nome_micro" className="text-base font-medium">
                                    Mostrar Marca
                                  </Label>
                                  <p className="text-sm text-muted-foreground">
                                    Incluir marca no nome do produto
                                  </p>
                                </div>
                                <Switch
                                  id="marca_no_nome_micro"
                                  checked={formData.marca_no_nome}
                                  onCheckedChange={(checked) =>
                                    setFormData((prev) => ({ ...prev, marca_no_nome: checked as boolean }))
                                  } />
                              </div>
                            </div>

                            <div className="p-4 border rounded-lg bg-muted/30">
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                  <Label htmlFor="afci_integrado_micro" className="text-base font-medium">
                                    Mostrar AFCI Integrado
                                  </Label>
                                  <p className="text-sm text-muted-foreground">
                                    Habilitar AFCI e incluir no nome do produto
                                  </p>
                                </div>
                                <Switch
                                  id="afci_integrado_micro"
                                  checked={formData.afci_integrado && formData.afci_no_nome}
                                  onCheckedChange={(checked) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      afci_integrado: checked as boolean,
                                      afci_no_nome: checked as boolean
                                    }))
                                  } />
                              </div>
                            </div>

                            <div className="p-4 border rounded-lg bg-muted/30">
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                  <Label htmlFor="rsd_integrado_micro" className="text-base font-medium">
                                    Mostrar Rapid Shutdown Integrado
                                  </Label>
                                  <p className="text-sm text-muted-foreground">
                                    Habilitar RSD e incluir no nome do produto
                                  </p>
                                </div>
                                <Switch
                                  id="rsd_integrado_micro"
                                  checked={formData.rsd_rapid_shutdown && formData.mostrar_rsd}
                                  onCheckedChange={(checked) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      rsd_rapid_shutdown: checked as boolean,
                                      mostrar_rsd: checked as boolean
                                    }))
                                  } />
                              </div>
                            </div>
                          </div>
                        ) : (
                          // String inverter options - M3 Enhanced nomenclature controls
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground mb-4">
                              Configure quais elementos aparecerão no nome do produto:
                            </p>

                            <div className="p-4 border rounded-lg bg-muted/30">
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                  <Label htmlFor="marca_no_nome" className="text-base font-medium">
                                    Mostrar Marca
                                  </Label>
                                  <p className="text-sm text-muted-foreground">
                                    Incluir marca no nome do produto
                                  </p>
                                </div>
                                <Switch
                                  id="marca_no_nome"
                                  checked={formData.marca_no_nome}
                                  onCheckedChange={(checked) =>
                                    setFormData((prev) => ({ ...prev, marca_no_nome: checked as boolean }))
                                  } />
                              </div>
                            </div>

                            <div className="p-4 border rounded-lg bg-muted/30">
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                  <Label htmlFor="afci_no_nome" className="text-base font-medium">
                                    Mostrar AFCI Integrado
                                  </Label>
                                  <p className="text-sm text-muted-foreground">
                                    Habilitar AFCI e incluir "AFCI Integrado" no nome
                                  </p>
                                </div>
                                <Switch
                                  id="afci_no_nome"
                                  checked={formData.afci_integrado && formData.afci_no_nome}
                                  onCheckedChange={(checked) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      afci_integrado: checked as boolean,
                                      afci_no_nome: checked as boolean
                                    }))
                                  } />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Preview do nome do produto */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Pré-visualização</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Nome do Produto</Label>
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <p className="font-medium text-sm">
                        {gerarNomeProduto(formData) || (formData.potencia_no_nome ? ((formData.potencia_kw ?? 0) > 0 ? `${formData.potencia_kw}kW` : "Nome do produto") : "Nome do produto")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>P DC máx: {formData.potencia_max_entrada_kw || 0} kW</div>
                    <div>Tipo: {formData.tipo}</div>
                    <div>
                      {formData.fases} • {formData.tensao}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {formData.afci_integrado && <Badge variant="secondary">AFCI</Badge>}
                    {formData.string_box && <Badge variant="secondary">String Box</Badge>}
                    {/* Added RSD badge for Micro Inverters */}
                    {formData.tipo === "Micro Inversor" && formData.rsd_rapid_shutdown && (
                      <Badge variant="secondary">RSD</Badge>
                    )}
                    <Badge variant="outline">{formData.tipo}</Badge>
                  </div>

                  <div className="pt-4 space-y-2">
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editandoInversor ? "Atualizar" : "Salvar"} Inversor
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    )
  }

  // Render loading state or main list view
  if (loadingList) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Apply list filters (Falha 14) - compute filtered array once
  const filteredInversores = inversores
    .filter((inv) => {
      if (!showInativos && (inv as any).ativo === false) return false
      // global search across marca and modelo
      if (filterMarca) {
        const q = String(filterMarca).toLowerCase()
        const matchesMarca = (inv.marca || '').toLowerCase().includes(q)
        const matchesModelo = (inv.modelo || '').toLowerCase().includes(q)
        if (!matchesMarca && !matchesModelo) return false
      }
      if (filterPotencia !== "" && Number(inv.potencia_kw) !== Number(filterPotencia)) return false
      if (filterTipo && inv.tipo !== filterTipo) return false
      if (filterFase && inv.fases !== filterFase) return false
      if (filterTensao && inv.tensao !== filterTensao) return false
      return true
    })
    .sort((a, b) => {
      const pa = Number(a.potencia_kw || 0)
      const pb = Number(b.potencia_kw || 0)
      return pa - pb
    })

  // Render main list view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Inversores Fotovoltaicos</h2>
          <p className="text-muted-foreground">Gerencie o catálogo de inversores fotovoltaicos</p>
        </div>
        <Button onClick={() => setMostrarFormulario(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Inversor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Inversores Cadastrados ({inversores.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters - Falha 14 */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-2 mb-2">
              <input
                placeholder="Busca (Marca ou Modelo)"
                className="input w-full"
                value={filterMarca}
                onChange={(e) => setFilterMarca(e.target.value)}
              />
              <select
                className="input w-full"
                value={filterPotencia}
                onChange={(e) => setFilterPotencia(e.target.value === "" ? "" : Number(e.target.value))}
              >
                <option value="">Todas potências</option>
                {Array.from(new Set(inversores.map((i) => i.potencia_kw))).sort((a: any, b: any) => a - b).map((p: any) => (
                  <option key={String(p)} value={String(p)}>{p} kW</option>
                ))}
              </select>
              <select className="input w-full" value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}>
                <option value="">Todos Tipos</option>
                <option value="String">String</option>
                <option value="Micro Inversor">Micro Inversor</option>
              </select>
              <select className="input w-full" value={filterFase} onChange={(e) => { setFilterFase(e.target.value); setFilterTensao(""); }}>
                <option value="">Todas Fases</option>
                <option value="Monofásico">Monofásico</option>
                <option value="Trifásico">Trifásico</option>
              </select>
              <select className="input w-full" value={filterTensao} onChange={(e) => setFilterTensao(e.target.value)}>
                <option value="">Todas Tensões</option>
                {/* Filter tensoes available by fase selection */}
                {(() => {
                  const tensoes = new Set<string>()
                  inversores.forEach((i) => {
                    if (!filterFase || i.fases === filterFase) tensoes.add(i.tensao)
                  })
                  return Array.from(tensoes)
                    .sort()
                    .map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))
                })()}
              </select>
              <div className="flex items-center space-x-2">
                <input id="showInativos" type="checkbox" checked={showInativos} onChange={(e) => setShowInativos(e.target.checked)} />
                <label htmlFor="showInativos" className="text-sm">Mostrar Inativos</label>
              </div>
            </div>

            {inversores.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum inversor cadastrado ainda. Clique em "Novo Inversor" para começar.
              </div>
            ) : filteredInversores.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum inversor corresponde aos filtros.</div>
            ) : (
              filteredInversores.map((inversor: any) => (
                <div key={inversor.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold">{gerarNomeProduto(inversor)}</h3>
                      <div className="flex space-x-2">
                        {inversor.afci_integrado && <Badge variant="secondary">AFCI Integrado</Badge>}
                        {inversor.string_box && <Badge variant="secondary">String Box</Badge>}
                        {/* Added RSD badge for Micro Inverters */}
                        {inversor.tipo === "Micro Inversor" && inversor.rsd_rapid_shutdown && (
                          <Badge variant="secondary">RSD</Badge>
                        )}
                        <Badge variant="outline">{inversor.tipo}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {inversor.marca} • {inversor.modelo} • {inversor.potencia_kw}kW • {inversor.fases} •{" "}
                      {inversor.tensao}
                    </p>
                    {inversor.potencia_modulo_aceita_w !== undefined && (
                      <div className="mt-2 text-sm text-muted-foreground">Potência módulo aceita: {inversor.potencia_modulo_aceita_w} W</div>
                    )}
                    <div className="flex space-x-4 mt-2 text-sm">
                      <span>Kit: R$ {inversor.preco_kit?.toFixed(2) || "0.00"}</span>
                      <span>Avulso: R$ {inversor.preco_avulso?.toFixed(2) || "0.00"}</span>
                      <span>Garantia: {inversor.garantia} anos</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => editarInversor(inversor)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => excluirInversor(inversor.id!)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={(inversor as any).ativo ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => toggleAtivoInversor(inversor)}
                    >
                      {(inversor as any).ativo ? 'Ativo' : 'Inativo'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function InversoresCadastroPage() {
  return <InversoresCadastro />
}
