"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Plus, Package, Edit, Trash2, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Fornecedor {
  id: string
  nome: string
}

interface ModuloData {
  id?: string
  marca: string
  modelo: string
  potencia_w?: number
  is_bifacial: boolean
  is_tier1: boolean
  preco_kit?: number
  preco_avulso?: number
  garantia_fabricacao?: number
  garantia_potencia?: number
  include_brand_in_name: boolean
  // Novos campos
  fornecedor_id?: string
  degradacao_anual?: number
  secao_cabo_mm2?: number
  comprimento_cabo_metros?: number
  // Dados técnicos STC
  stc_pmax?: number
  stc_vmp?: number
  stc_imp?: number
  stc_voc?: number
  stc_isc?: number
  stc_eficiencia?: number
  // Dados técnicos NOCT
  noct_pmax?: number
  noct_vmp?: number
  noct_imp?: number
  noct_voc?: number
  noct_isc?: number
  // Dados mecânicos
  mec_celulas?: number
  mec_dimensoes_comp?: number
  mec_dimensoes_larg?: number
  mec_dimensoes_esp?: number
  mec_peso?: number
}

export function ModulosCadastro() {
  // Função para máscara de moeda
  function maskCurrency(value: string) {
    let v = value.replace(/\D/g, "")
    v = (Number(v) / 100).toFixed(2)
    return v.replace('.', ',')
  }
  const [modulos, setModulos] = useState<ModuloData[]>([])
  const [hasAtivoColumn, setHasAtivoColumn] = useState<boolean | null>(null)
  const [hasFornecedorColumn, setHasFornecedorColumn] = useState<boolean | null>(null)
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [editandoModulo, setEditandoModulo] = useState<ModuloData | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingFornecedores, setLoadingFornecedores] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const [formData, setFormData] = useState<ModuloData>({
    marca: "",
    modelo: "",
    potencia_w: 0,
    is_bifacial: false,
    is_tier1: false,
    preco_kit: 0,
    preco_avulso: 0,
    garantia_fabricacao: 12,
    garantia_potencia: 30,
    include_brand_in_name: true,
    // Novos campos
    fornecedor_id: "",
    degradacao_anual: 0.8,
    secao_cabo_mm2: 4.0,
    comprimento_cabo_metros: 1.2,
    stc_pmax: 0,
    stc_vmp: 0,
    stc_imp: 0,
    stc_voc: 0,
    stc_isc: 0,
    stc_eficiencia: 0,
    noct_pmax: 0,
    noct_vmp: 0,
    noct_imp: 0,
    noct_voc: 0,
    noct_isc: 0,
    mec_celulas: 0,
    mec_dimensoes_comp: 0,
    mec_dimensoes_larg: 0,
    mec_dimensoes_esp: 0,
    mec_peso: 0,
  })

  // Local string state to allow typing decimals with comma (e.g. '0,8') and partial inputs like '0.'
  const [degradacaoInput, setDegradacaoInput] = useState<string>(
    formData.degradacao_anual !== undefined ? String(formData.degradacao_anual) : '0.8'
  )

  // Keep the string input in sync when formData.degradacao_anual changes from elsewhere
  useEffect(() => {
    setDegradacaoInput(formData.degradacao_anual !== undefined ? String(formData.degradacao_anual) : '')
  }, [formData.degradacao_anual])

  useEffect(() => {
    carregarModulos()
    carregarFornecedores()
  }, [])

  const carregarModulos = async () => {
    try {
      const { data, error } = await supabase
        .from("modulos")
        .select("*")
        .not('modelo', 'ilike', '[DESATIVADO]%')
        .order("created_at", { ascending: false })

      if (error) throw error
      // Normalize possível relacionamento fornecedor -> set fornecedor_id
      const normalized = (data || []).map((m: any) => {
        const row = { ...m }
        if (!row.fornecedor_id) {
          if (row.fornecedor && typeof row.fornecedor === 'string') row.fornecedor_id = row.fornecedor
          else if (row.fornecedor && typeof row.fornecedor === 'object') row.fornecedor_id = row.fornecedor.id || row.fornecedor.value
        }
        return row
      })
      setModulos(normalized)

      // If some modules reference a fornecedor_id that isn't in the fornecedores state,
      // fetch those fornecedores so the edit form can display the supplier name.
      try {
        const referencedIds = Array.from(new Set((normalized as any[])
          .map(m => m.fornecedor_id)
          .filter(Boolean))) as string[]

        const missingIds = referencedIds.filter(id => !fornecedores.some(f => f.id === id))
        if (missingIds.length > 0) {
          const { data: fetched, error: fetchErr } = await supabase
            .from('fornecedores')
            .select('id, nome')
            .in('id', missingIds)

          if (!fetchErr && fetched && fetched.length > 0) {
            setFornecedores((prev) => {
              const merged = [...prev]
              fetched.forEach((f: any) => {
                if (!merged.some(m => m.id === f.id)) merged.push(f)
              })
              return merged
            })
          }
        }
      } catch (err) {
        console.error('Erro ao buscar fornecedores referenciados:', err)
      }

      // Detect whether the 'ativo' and 'fornecedor_id' columns exist in the returned rows
      if (normalized.length > 0) {
        const sample = normalized[0] as any
        setHasAtivoColumn(Object.prototype.hasOwnProperty.call(sample, 'ativo'))
        setHasFornecedorColumn(Object.prototype.hasOwnProperty.call(sample, 'fornecedor_id'))
      } else {
        // no rows -> we can't be sure; assume false to be safe
        setHasAtivoColumn(false)
        setHasFornecedorColumn(false)
      }
    } catch (error) {
      console.error("Erro ao carregar módulos:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os módulos",
        variant: "destructive",
      })
    } finally {
      setLoadingList(false)
    }
  }

  const toggleAtivoModulo = async (modulo: ModuloData) => {
    // Toggle 'ativo' if the DB supports the column. If the column is missing (PGRST204),
    // revert optimistic update and show a clear message.
    try {
      const newState = !(modulo as any).ativo
      // Optimistic update
      setModulos((prev) => prev.map((m) => (m.id === modulo.id ? { ...m, ativo: newState } : m)))
      const { error } = await supabase.from('modulos').update({ ativo: newState }).eq('id', modulo.id)
      if (error) {
        throw error
      }
      toast({ title: 'Sucesso', description: `Módulo ${newState ? 'ativado' : 'inativado'} com sucesso` })
    } catch (err: any) {
      console.error('Erro toggling modulo ativo:', err)
      // Detect PostgREST missing column error
      if (err && err.code === 'PGRST204' && /ativo/.test(String(err.message || ''))) {
        toast({
          title: 'Coluna ausente no banco',
          description: "A coluna 'ativo' não existe na tabela 'modulos' do banco. Não é possível alternar o estado. Para habilitar essa funcionalidade adicione a coluna 'ativo boolean DEFAULT true'.",
          variant: 'destructive',
        })
      } else {
        toast({ title: 'Erro', description: 'Não foi possível alterar o estado do módulo', variant: 'destructive' })
      }
      // Revert optimistic update
      await carregarModulos()
    }
  }

  const carregarFornecedores = async () => {
    try {
      setLoadingFornecedores(true)
      const { data, error } = await supabase
        .from("fornecedores")
        .select("id, nome")
        .order("nome")

      if (error) throw error
      setFornecedores(data || [])

      console.log('Fornecedores carregados:', data?.length || 0)
    } catch (error) {
      console.error("Erro ao carregar fornecedores:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os fornecedores",
        variant: "destructive",
      })
    } finally {
      setLoadingFornecedores(false)
    }
  }

  const gerarNomeProduto = (data: ModuloData) => {
    let nome = `Módulo ${data.potencia_w}W`
    if (data.is_tier1) nome += " Tier 1"
    if (data.include_brand_in_name && data.marca) nome += ` ${data.marca}`
    if (data.is_bifacial) nome += " Bifacial"
    return nome
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Enforce fornecedor is present
    if (!formData.fornecedor_id) {
      setLoading(false)
      toast({ title: 'Fornecedor obrigatório', description: 'Informe um fornecedor antes de salvar o módulo', variant: 'destructive' })
      return
    }

    try {
      // Campos que não existem no banco atual - remover antes do envio
      // Nota: remover 'fornecedor_id' aqui fazia com que o frontend nunca enviasse
      // o fornecedor ao backend. O campo já existe no banco, então não deve ser
      // removido antes do envio.
      const fieldsToRemove = ['degradacao_anual', 'secao_cabo_mm2', 'comprimento_cabo_metros']
      const dataToSubmit = { ...formData }

      // Remove campos que não existem no banco atual
      fieldsToRemove.forEach(field => {
        delete (dataToSubmit as any)[field]
      })

      if (editandoModulo) {
        try {
          const { error } = await supabase.from("modulos").update(dataToSubmit).eq("id", editandoModulo.id)
          if (error) throw error
          toast({ title: "Sucesso", description: "Módulo atualizado com sucesso" })
        } catch (err: any) {
          // PostgREST returns PGRST204 when a column is not found in the schema cache
          if (err && err.code === 'PGRST204' && /fornecedor_id/.test(String(err.message || ''))) {
            // retry without fornecedor_id
            const fallback = { ...dataToSubmit }
            delete (fallback as any).fornecedor_id
            const { error: retryErr } = await supabase.from('modulos').update(fallback).eq('id', editandoModulo.id)
            if (retryErr) throw retryErr
            toast({ title: 'Sucesso (fallback)', description: 'Módulo atualizado sem o campo fornecedor (coluna não presente no banco).' })
          } else {
            throw err
          }
        }
      } else {
        try {
          const { error } = await supabase.from("modulos").insert([dataToSubmit])
          if (error) throw error
          toast({ title: "Sucesso", description: "Módulo cadastrado com sucesso" })
        } catch (err: any) {
          if (err && err.code === 'PGRST204' && /fornecedor_id/.test(String(err.message || ''))) {
            const fallback = { ...dataToSubmit }
            delete (fallback as any).fornecedor_id
            const { error: retryErr } = await supabase.from('modulos').insert([fallback])
            if (retryErr) throw retryErr
            toast({ title: 'Sucesso (fallback)', description: 'Módulo cadastrado sem o campo fornecedor (coluna não presente no banco).' })
          } else {
            throw err
          }
        }
      }

      await carregarModulos()
      setMostrarFormulario(false)
      setEditandoModulo(null)
      resetForm()
    } catch (error) {
      console.error("Erro ao salvar módulo:", error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar o módulo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      marca: "",
      modelo: "",
      potencia_w: 0,
      is_bifacial: false,
      is_tier1: false,
      preco_kit: 0,
      preco_avulso: 0,
      garantia_fabricacao: 12,
      garantia_potencia: 30,
      include_brand_in_name: true,
      // Novos campos
      fornecedor_id: "",
      degradacao_anual: 0.8,
      secao_cabo_mm2: 4.0,
      comprimento_cabo_metros: 1.2,
      stc_pmax: 0,
      stc_vmp: 0,
      stc_imp: 0,
      stc_voc: 0,
      stc_isc: 0,
      stc_eficiencia: 0,
      noct_pmax: 0,
      noct_vmp: 0,
      noct_imp: 0,
      noct_voc: 0,
      noct_isc: 0,
      mec_celulas: 0,
      mec_dimensoes_comp: 0,
      mec_dimensoes_larg: 0,
      mec_dimensoes_esp: 0,
      mec_peso: 0,
    })
  }

  const editarModulo = async (modulo: ModuloData) => {
    // Normalize fornecedor id from possible shapes returned by Supabase
    const resolveFornecedorId = (m: any): string | undefined => {
      if (!m) return undefined
      if (m.fornecedor_id) return m.fornecedor_id
      if (m.fornecedorId) return m.fornecedorId
      if (m.fornecedor && typeof m.fornecedor === 'string') return m.fornecedor
      if (m.fornecedor && typeof m.fornecedor === 'object') return m.fornecedor.id || m.fornecedor.value || undefined
      return undefined
    }

    const fornecedorId = resolveFornecedorId(modulo as any)
    setFormData((prev) => ({ ...prev, ...(modulo || {}), fornecedor_id: fornecedorId || "" }))
    setEditandoModulo(modulo)
    setMostrarFormulario(true)

    // If the fornecedor for this module isn't present in the loaded fornecedores list,
    // try to fetch it and append so the <select> can display the supplier name.
    try {
      if (fornecedorId && !fornecedores.some(f => f.id === fornecedorId)) {
        const { data: fetched, error } = await supabase
          .from('fornecedores')
          .select('id, nome')
          .eq('id', fornecedorId)
          .maybeSingle()

        if (!error && fetched) {
          setFornecedores((prev) => {
            // avoid duplicates
            if (prev.some(p => p.id === fetched.id)) return prev
            return [...prev, fetched as Fornecedor]
          })
        }
      }
    } catch (err) {
      console.error('Erro ao buscar fornecedor ao editar módulo:', err)
      toast({ title: 'Aviso', description: 'Não foi possível carregar o fornecedor associado ao módulo', variant: 'destructive' })
    }
  }

  const excluirModulo = async (id: string) => {
    try {
      const { error } = await supabase.from("modulos").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Módulo excluído com sucesso",
      })

      await carregarModulos()
    } catch (error) {
      console.error("Erro ao excluir módulo:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir o módulo",
        variant: "destructive",
      })
    }
  }

  if (mostrarFormulario) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {editandoModulo ? "Editar Módulo" : "Cadastrar Módulo Fotovoltaico"}
            </h2>
            <p className="text-muted-foreground">Preencha os dados comerciais e técnicos do módulo</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setMostrarFormulario(false)
              setEditandoModulo(null)
              resetForm()
            }}
          >
            Cancelar
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Tabs defaultValue="comercial" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="comercial">Dados Comerciais</TabsTrigger>
                  <TabsTrigger value="tecnicos">Dados Técnicos</TabsTrigger>
                </TabsList>

                <TabsContent value="comercial" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Informações Comerciais</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="fornecedor">Fornecedor {fornecedores.length > 0 ? '*' : '(opcional)'}</Label>
                          <select
                            id="fornecedor"
                            value={formData.fornecedor_id || ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, fornecedor_id: e.target.value }))}
                            className="flex h-10 w-full rounded-md border border-gray-400 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            required={true}
                          >
                            <option value="">
                              {loadingFornecedores
                                ? "Carregando..."
                                : fornecedores.length === 0
                                  ? "Nenhum fornecedor cadastrado"
                                  : "Selecione um fornecedor"
                              }
                            </option>
                            {fornecedores.map((fornecedor) => (
                              <option key={fornecedor.id} value={fornecedor.id}>
                                {fornecedor.nome}
                              </option>
                            ))}
                            {/* If currently editing a module and its fornecedor_id is not in the loaded fornecedores list,
                                  include a fallback option so the select shows the current supplier. */}
                            {formData.fornecedor_id && !fornecedores.some(f => f.id === formData.fornecedor_id) && (
                              <option value={formData.fornecedor_id}>
                                {(editandoModulo && (editandoModulo as any).fornecedor && (editandoModulo as any).fornecedor.nome) ? (editandoModulo as any).fornecedor.nome : `Selecionado (${formData.fornecedor_id})`}
                              </option>
                            )}
                          </select>
                          {fornecedores.length === 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                              💡 Cadastre fornecedores primeiro em Cadastros → Fornecedores
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="degradacao">Degradação Anual (%)</Label>
                          <Input
                            className="border border-gray-400"
                            id="degradacao"
                            type="text"
                            inputMode="decimal"
                            placeholder="ex: 0,8"
                            value={degradacaoInput}
                            onChange={(e) => {
                              const raw = e.target.value
                              // Allow comma as decimal separator and also dot; normalize to dot for Number parsing
                              const normalizedForParsing = raw.replace(',', '.')
                              // Update the visible input as-is so user can type '0,' or '0,8'
                              setDegradacaoInput(raw)
                              // Only update formData when the value is a valid number
                              const parsed = Number(normalizedForParsing)
                              if (!Number.isNaN(parsed)) {
                                setFormData((prev) => ({ ...prev, degradacao_anual: parsed }))
                              } else if (raw === '') {
                                // allow clearing the input
                                setFormData((prev) => ({ ...prev, degradacao_anual: undefined }))
                              }
                            }} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="marca">Marca do Módulo *</Label>
                          <Input
                            className="border border-gray-400"
                            id="marca"
                            value={formData.marca}
                            onChange={(e) => setFormData((prev) => ({ ...prev, marca: e.target.value }))}

                            required />
                        </div>
                        <div>
                          <Label htmlFor="modelo">Modelo *</Label>
                          <Input
                            className="border border-gray-400"
                            id="modelo"
                            value={formData.modelo}
                            onChange={(e) => setFormData((prev) => ({ ...prev, modelo: e.target.value }))}

                            required />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="potencia">Potência (W) *</Label>
                          <Input
                            className="border border-gray-400"
                            id="potencia"
                            type="number"
                            min="50"
                            max="1000"
                            value={formData.potencia_w ?? ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, potencia_w: e.target.value === '' ? undefined : Number(e.target.value) }))}

                            required />
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                          <Switch
                            id="bifacial"
                            checked={formData.is_bifacial}
                            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_bifacial: checked }))} />
                          <Label htmlFor="bifacial">Bifacial</Label>
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                          <Switch
                            id="tier1"
                            checked={formData.is_tier1}
                            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_tier1: checked }))} />
                          <Label htmlFor="tier1">Tier 1</Label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="precoKit">Preço no Kit (R$)</Label>
                          <Input
                            className="border border-gray-400"
                            id="precoKit"
                            type="text"
                            inputMode="decimal"
                            value={formData.preco_kit !== undefined && formData.preco_kit !== null ? formData.preco_kit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ""}
                            onChange={(e) => {
                              const masked = maskCurrency(e.target.value)
                              setFormData((prev) => ({ ...prev, preco_kit: masked ? Number(masked.replace(',', '.')) : 0 }))
                            }} />
                        </div>
                        <div>
                          <Label htmlFor="precoAvulso">Preço Avulso (R$)</Label>
                          <Input
                            className="border border-gray-400"
                            id="precoAvulso"
                            type="text"
                            inputMode="decimal"
                            value={formData.preco_avulso !== undefined && formData.preco_avulso !== null ? formData.preco_avulso.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ""}
                            onChange={(e) => {
                              const masked = maskCurrency(e.target.value)
                              setFormData((prev) => ({ ...prev, preco_avulso: masked ? Number(masked.replace(',', '.')) : 0 }))
                            }} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="garantiaFabricacao">Garantia de Fabricação (anos)</Label>
                          <Input
                            className="border border-gray-400"
                            id="garantiaFabricacao"
                            type="number"
                            min="1"
                            max="40"
                            value={formData.garantia_fabricacao ?? ""}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, garantia_fabricacao: e.target.value === '' ? undefined : Number(e.target.value) }))
                            } />
                        </div>
                        <div>
                          <Label htmlFor="garantiaPotencia">Garantia de Potência (anos)</Label>
                          <Input
                            className="border border-gray-400"
                            id="garantiaPotencia"
                            type="number"
                            min="10"
                            max="40"
                            value={formData.garantia_potencia ?? ""}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, garantia_potencia: e.target.value === '' ? undefined : Number(e.target.value) }))
                            } />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="incluirMarca"
                          checked={formData.include_brand_in_name}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({ ...prev, include_brand_in_name: checked }))
                          } />
                        <Label htmlFor="incluirMarca">Incluir marca no nome do produto</Label>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="tecnicos" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Especificação Elétrica STC</CardTitle>
                      <CardDescription>Standard Test Conditions (1000 W/m², 25°C célula, AM 1.5)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="stcPmax">Pmax (W)</Label>
                          <Input
                            className="border border-gray-400"
                            id="stcPmax"
                            type="number"
                            step="0.01"
                            value={formData.stc_pmax ?? ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, stc_pmax: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        </div>
                        <div>
                          <Label htmlFor="stcVmp">Vmp (V)</Label>
                          <Input
                            className="border border-gray-400"
                            id="stcVmp"
                            type="number"
                            step="0.01"
                            value={formData.stc_vmp ?? ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, stc_vmp: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        </div>
                        <div>
                          <Label htmlFor="stcImp">Imp (A)</Label>
                          <Input
                            className="border border-gray-400"
                            id="stcImp"
                            type="number"
                            step="0.01"
                            value={formData.stc_imp ?? ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, stc_imp: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="stcVoc">Voc (V)</Label>
                          <Input
                            className="border border-gray-400"
                            id="stcVoc"
                            type="number"
                            step="0.01"
                            value={formData.stc_voc ?? ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, stc_voc: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        </div>
                        <div>
                          <Label htmlFor="stcIsc">Isc (A)</Label>
                          <Input
                            className="border border-gray-400"
                            id="stcIsc"
                            type="number"
                            step="0.01"
                            value={formData.stc_isc ?? ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, stc_isc: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        </div>
                        <div>
                          <Label htmlFor="stcEficiencia">Eficiência (%)</Label>
                          <Input
                            className="border border-gray-400"
                            id="stcEficiencia"
                            type="number"
                            step="0.1"
                            min="10"
                            max="26"
                            value={formData.stc_eficiencia ?? ""}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, stc_eficiencia: e.target.value === '' ? undefined : Number(e.target.value) }))
                            } />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Especificação Elétrica NOCT</CardTitle>
                      <CardDescription>
                        Nominal Operating Cell Temperature (≈800 W/m², 20°C ambiente, 1 m/s vento, AM 1.5)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="noctPmax">Pmax (W)</Label>
                          <Input
                            className="border border-gray-400"
                            id="noctPmax"
                            type="number"
                            step="0.01"
                            value={formData.noct_pmax ?? ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, noct_pmax: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        </div>
                        <div>
                          <Label htmlFor="noctVmp">Vmp (V)</Label>
                          <Input
                            className="border border-gray-400"
                            id="noctVmp"
                            type="number"
                            step="0.01"
                            value={formData.noct_vmp ?? ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, noct_vmp: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        </div>
                        <div>
                          <Label htmlFor="noctImp">Imp (A)</Label>
                          <Input
                            className="border border-gray-400"
                            id="noctImp"
                            type="number"
                            step="0.01"
                            value={formData.noct_imp ?? ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, noct_imp: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="noctVoc">Voc (V)</Label>
                          <Input
                            className="border border-gray-400"
                            id="noctVoc"
                            type="number"
                            step="0.01"
                            value={formData.noct_voc ?? ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, noct_voc: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        </div>
                        <div>
                          <Label htmlFor="noctIsc">Isc (A)</Label>
                          <Input
                            id="noctIsc"
                            type="number"
                            step="0.01"
                            value={formData.noct_isc ?? ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, noct_isc: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Dados Mecânicos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="numeroCelulas">Número de Células</Label>
                          <Input
                            id="numeroCelulas"
                            type="number"
                            className="border border-gray-400"
                            value={formData.mec_celulas ?? ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, mec_celulas: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        </div>
                        <div>
                          <Label htmlFor="peso">Peso (kg)</Label>
                          <Input
                            id="peso"
                            type="number"
                            step="0.1"
                            className="border border-gray-400"
                            value={formData.mec_peso ?? ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, mec_peso: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="dimensoesComp">Comprimento (mm)</Label>
                          <Input
                            id="dimensoesComp"
                            type="number"
                            step="0.1"
                            className="border border-gray-400"
                            value={formData.mec_dimensoes_comp ?? ""}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, mec_dimensoes_comp: e.target.value === '' ? undefined : Number(e.target.value) }))
                            } />
                        </div>
                        <div>
                          <Label htmlFor="dimensoesLarg">Largura (mm)</Label>
                          <Input
                            id="dimensoesLarg"
                            type="number"
                            step="0.1"
                            className="border border-gray-400"
                            value={formData.mec_dimensoes_larg ?? ""}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, mec_dimensoes_larg: e.target.value === '' ? undefined : Number(e.target.value) }))
                            } />
                        </div>
                        <div>
                          <Label htmlFor="dimensoesEsp">Espessura (mm)</Label>
                          <Input
                            id="dimensoesEsp"
                            type="number"
                            step="0.1"
                            className="border border-gray-400"
                            value={formData.mec_dimensoes_esp ?? ""}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, mec_dimensoes_esp: e.target.value === '' ? undefined : Number(e.target.value) }))
                            } />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="secaoCabo">Seção do Cabo (mm²)</Label>
                          <Input
                            id="secaoCabo"
                            type="number"
                            step="0.1"
                            className="border border-gray-400"
                            value={formData.secao_cabo_mm2 ?? ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, secao_cabo_mm2: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        </div>
                        <div>
                          <Label htmlFor="comprimentoCabo">Comprimento do Cabo (metros)</Label>
                          <Input
                            id="comprimentoCabo"
                            type="number"
                            step="0.1"
                            className="border border-gray-400"
                            value={formData.comprimento_cabo_metros ?? ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, comprimento_cabo_metros: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        </div>
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
                      <p className="font-medium text-sm">{gerarNomeProduto(formData) || "Módulo 0W"}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {formData.is_tier1 && <Badge variant="secondary">Tier 1</Badge>}
                    {formData.is_bifacial && <Badge variant="outline">Bifacial</Badge>}
                  </div>

                  <div className="pt-4 space-y-2">
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editandoModulo ? "Atualizar" : "Salvar"} Módulo
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

  if (loadingList) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Módulos Fotovoltaicos</h2>
          <p className="text-muted-foreground">Gerencie o catálogo de módulos fotovoltaicos</p>
        </div>
        <Button onClick={() => setMostrarFormulario(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Módulo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Módulos Cadastrados ({modulos.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {modulos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum módulo cadastrado ainda. Clique em "Novo Módulo" para começar.
              </div>
            ) : (
              modulos.map((modulo) => (
                <div key={modulo.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold">{gerarNomeProduto(modulo)}</h3>
                      <div className="flex space-x-2">
                        {modulo.is_tier1 && <Badge variant="secondary">Tier 1</Badge>}
                        {modulo.is_bifacial && <Badge variant="outline">Bifacial</Badge>}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {modulo.marca} • {modulo.modelo} • {modulo.potencia_w}W
                    </p>
                    <div className="flex space-x-4 mt-2 text-sm">
                      <span>Kit: R$ {modulo.preco_kit?.toFixed(2) || "0.00"}</span>
                      <span>Avulso: R$ {modulo.preco_avulso?.toFixed(2) || "0.00"}</span>
                      <span>
                        Garantia: {modulo.garantia_fabricacao}/{modulo.garantia_potencia} anos
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2 items-center">
                    <Button variant="outline" size="sm" onClick={() => editarModulo(modulo)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => excluirModulo(modulo.id!)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {hasAtivoColumn ? (
                      <Button
                        variant={(modulo as any).ativo ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => toggleAtivoModulo(modulo)}
                      >
                        {(modulo as any).ativo ? 'Ativo' : 'Inativo'}
                      </Button>
                    ) : (
                      <Badge variant="outline">Ativo não suportado</Badge>
                    )}
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
