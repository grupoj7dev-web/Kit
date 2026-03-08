"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Package, Edit, Trash2, Loader2 } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { useToast } from "@/hooks/use-toast"

interface EstruturaData {
  id?: string
  tipo: "Telhado" | "Solo"
  nome?: string
  marca: string
  modelo: string
  material: string
  cor?: string
  modulos_por_estrutura: number
  preco_kit: number
  preco_avulso: number
  peso_por_modulo: number
  garantia: number
  inclui_grampos: boolean
  inclui_parafusos: boolean
  inclui_trilhos: boolean
  inclui_terminais: boolean
  inclinacao_min?: number
  inclinacao_max?: number
  carga_vento_max?: number
  carga_neve_max?: number
  created_at?: string
  updated_at?: string
}

export function EstruturasCadastro() {
  const [estruturas, setEstruturas] = useState<EstruturaData[]>([])
  const [editandoEstrutura, setEditandoEstrutura] = useState<EstruturaData | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const [formData, setFormData] = useState<EstruturaData>({
    tipo: "Telhado",
    nome: "",
    marca: "",
    modelo: "",
    material: "",
    cor: "",
    modulos_por_estrutura: 0,
    preco_kit: 0,
    preco_avulso: 0,
    peso_por_modulo: 0,
    garantia: 10,
    inclui_grampos: false,
    inclui_parafusos: false,
    inclui_trilhos: false,
    inclui_terminais: false,
    inclinacao_min: 0,
    inclinacao_max: 60,
    carga_vento_max: 0,
    carga_neve_max: 0,
  })

  // Local display strings for currency inputs to avoid caret/formatting issues
  const [precoKitDisplay, setPrecoKitDisplay] = useState<string>("")
  const [precoAvulsoDisplay, setPrecoAvulsoDisplay] = useState<string>("")

  // helpers to parse and format currency strings (support both 1234.56 and 1.234,56)
  const parseCurrencyToNumber = (s: string): number => {
    if (!s) return 0
    // remove currency symbol and spaces
    let v = s.toString().trim()
    v = v.replace(/[^0-9,\.\-]/g, '')
    // If contains comma and dot, assume dot thousands and comma decimals (pt-BR)
    if (v.indexOf(',') > -1 && v.indexOf('.') > -1) {
      v = v.replace(/\./g, '').replace(/,/g, '.')
    } else if (v.indexOf(',') > -1 && v.indexOf('.') === -1) {
      // only comma present -> decimal separator
      v = v.replace(/,/g, '.')
    } else {
      // only dot or no separator -> keep
    }
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }

  const formatNumberToDisplay = (n: number) => {
    if (n === null || n === undefined) return ''
    return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  useEffect(() => {
    carregarEstruturas()
  }, [])

  const carregarEstruturas = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("estruturas").select("*").order("created_at", { ascending: false })

      if (error) {
        console.error("[v0] Erro ao carregar estruturas:", error)
        toast({
          title: "Erro ao carregar estruturas",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      setEstruturas(data || [])
    } catch (error) {
      console.error("[v0] Erro ao carregar estruturas:", error)
      toast({
        title: "Erro ao carregar estruturas",
        description: "Erro inesperado ao carregar dados",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!formData.marca || !formData.modelo) {
        toast({
          title: "Campos obrigatórios",
          description: "Marca e modelo são obrigatórios",
          variant: "destructive",
        })
        setSaving(false)
        return
      }

      const estruturaData = {
        tipo: formData.tipo,
        marca: formData.marca,
        modelo: formData.modelo,
        material: formData.material,
        cor: formData.cor,
        modulos_por_estrutura: formData.modulos_por_estrutura,
        preco_kit: formData.preco_kit,
        preco_avulso: formData.preco_avulso,
        peso_por_modulo: formData.peso_por_modulo,
        garantia: formData.garantia,
        inclui_grampos: formData.inclui_grampos,
        inclui_parafusos: formData.inclui_parafusos,
        inclui_trilhos: formData.inclui_trilhos,
        inclui_terminais: formData.inclui_terminais,
        inclinacao_min: formData.inclinacao_min,
        inclinacao_max: formData.inclinacao_max,
        carga_vento_max: formData.carga_vento_max,
        carga_neve_max: formData.carga_neve_max,
      }

      if (editandoEstrutura) {
        const { error } = await supabase
          .from("estruturas")
          .update({
            ...estruturaData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editandoEstrutura.id)

        if (error) throw error

        toast({
          title: "Estrutura atualizada",
          description: "Estrutura atualizada com sucesso!",
        })
      } else {
        const { error } = await supabase.from("estruturas").insert([estruturaData])

        if (error) {
          console.error("[v0] Erro detalhado ao inserir estrutura:", error)
          throw error
        }

        toast({
          title: "Estrutura cadastrada",
          description: "Estrutura cadastrada com sucesso!",
        })
      }

      await carregarEstruturas()
      setMostrarFormulario(false)
      setEditandoEstrutura(null)
      resetForm()
    } catch (error: any) {
      console.error("[v0] Erro ao salvar estrutura:", error)
      toast({
        title: "Erro ao salvar estrutura",
        description: error.message || "Erro inesperado",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      tipo: "Telhado",
      nome: "",
      marca: "",
      modelo: "",
      material: "",
      cor: "",
      modulos_por_estrutura: 0,
      preco_kit: 0,
      preco_avulso: 0,
      peso_por_modulo: 0,
      garantia: 10,
      inclui_grampos: false,
      inclui_parafusos: false,
      inclui_trilhos: false,
      inclui_terminais: false,
      inclinacao_min: 0,
      inclinacao_max: 60,
      carga_vento_max: 0,
      carga_neve_max: 0,
    })
    setPrecoKitDisplay('')
    setPrecoAvulsoDisplay('')
  }

  const editarEstrutura = (estrutura: EstruturaData) => {
    setFormData({
      tipo: estrutura.tipo,
      nome: estrutura.nome,
      marca: estrutura.marca,
      modelo: estrutura.modelo,
      material: estrutura.material,
      cor: estrutura.cor,
      modulos_por_estrutura: estrutura.modulos_por_estrutura,
      preco_kit: estrutura.preco_kit,
      preco_avulso: estrutura.preco_avulso,
      peso_por_modulo: estrutura.peso_por_modulo,
      garantia: estrutura.garantia,
      inclui_grampos: estrutura.inclui_grampos,
      inclui_parafusos: estrutura.inclui_parafusos,
      inclui_trilhos: estrutura.inclui_trilhos,
      inclui_terminais: estrutura.inclui_terminais,
      inclinacao_min: estrutura.inclinacao_min,
      inclinacao_max: estrutura.inclinacao_max,
      carga_vento_max: estrutura.carga_vento_max,
      carga_neve_max: estrutura.carga_neve_max,
    })
    setEditandoEstrutura(estrutura)
    setMostrarFormulario(true)
    // populate display strings for currency
    setPrecoKitDisplay(estrutura.preco_kit ? formatNumberToDisplay(Number(estrutura.preco_kit)) : '')
    setPrecoAvulsoDisplay(estrutura.preco_avulso ? formatNumberToDisplay(Number(estrutura.preco_avulso)) : '')
  }

  const excluirEstrutura = async (id: string) => {
    try {
      const { error } = await supabase.from("estruturas").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Estrutura excluída",
        description: "Estrutura excluída com sucesso!",
      })

      await carregarEstruturas()
    } catch (error: any) {
      console.error("[v0] Erro ao excluir estrutura:", error)
      toast({
        title: "Erro ao excluir estrutura",
        description: error.message || "Erro inesperado",
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
              {editandoEstrutura ? "Editar Estrutura" : "Cadastrar Estrutura de Fixação"}
            </h2>
            <p className="text-muted-foreground">Preencha os dados da estrutura de fixação</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setMostrarFormulario(false)
              setEditandoEstrutura(null)
              resetForm()
            }}
          >
            Cancelar
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Informações da Estrutura</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tipo">Tipo de Estrutura *</Label>
                      <Select
                        value={formData.tipo}
                        onValueChange={(value: "Telhado" | "Solo") => setFormData((prev) => ({ ...prev, tipo: value }))}
                      >
                        <SelectTrigger className="border border-gray-400">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Telhado">Telhado</SelectItem>
                          <SelectItem value="Solo">Solo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="marca">Marca *</Label>
                      <Input
                        id="marca"
                        value={formData.marca}
                        onChange={(e) => setFormData((prev) => ({ ...prev, marca: e.target.value }))}
                        required
                        className="border border-gray-400" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="modelo">Modelo *</Label>
                    <Input
                      id="modelo"
                      value={formData.modelo}
                      onChange={(e) => setFormData((prev) => ({ ...prev, modelo: e.target.value }))}
                      required
                      className="border border-gray-400" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="material">Material</Label>
                      <Input
                        id="material"
                        value={formData.material}
                        onChange={(e) => setFormData((prev) => ({ ...prev, material: e.target.value }))}
                        className="border border-gray-400" />
                    </div>
                    <div>
                      <Label htmlFor="cor">Cor</Label>
                      <Input
                        id="cor"
                        value={formData.cor}
                        onChange={(e) => setFormData((prev) => ({ ...prev, cor: e.target.value }))}
                        className="border border-gray-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="modulos_por_estrutura">Módulos por Estrutura</Label>
                      <Input
                        id="modulos_por_estrutura"
                        type="number"
                        min="1"
                        max="100"
                        value={formData.modulos_por_estrutura || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, modulos_por_estrutura: Number(e.target.value) }))}
                        className="border border-gray-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="peso_por_modulo">Peso por Módulo (kg)</Label>
                      <Input
                        id="peso_por_modulo"
                        type="number"
                        step="0.1"
                        value={formData.peso_por_modulo || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, peso_por_modulo: Number(e.target.value) }))}
                        className="border border-gray-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="preco_kit">Preço no Kit (R$)</Label>
                      <Input
                        id="preco_kit"
                        type="text"
                        inputMode="decimal"
                        className="border border-gray-400"
                        value={precoKitDisplay}
                        onChange={(e) => {
                          const txt = e.target.value
                          setPrecoKitDisplay(txt)
                          const n = parseCurrencyToNumber(txt)
                          setFormData((prev) => ({ ...prev, preco_kit: n }))
                        }}
                        onBlur={() => {
                          setPrecoKitDisplay(formatNumberToDisplay(Number(formData.preco_kit)))
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="preco_avulso">Preço Avulso (R$)</Label>
                      <Input
                        id="preco_avulso"
                        type="text"
                        inputMode="decimal"
                        className="border border-gray-400"
                        value={precoAvulsoDisplay}
                        onChange={(e) => {
                          const txt = e.target.value
                          setPrecoAvulsoDisplay(txt)
                          const n = parseCurrencyToNumber(txt)
                          setFormData((prev) => ({ ...prev, preco_avulso: n }))
                        }}
                        onBlur={() => {
                          setPrecoAvulsoDisplay(formatNumberToDisplay(Number(formData.preco_avulso)))
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="inclinacao_min">Inclinação Mín. (°)</Label>
                      <Input
                        id="inclinacao_min"
                        type="number"
                        min="0"
                        max="90"
                        value={formData.inclinacao_min || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, inclinacao_min: Number(e.target.value) }))}
                        className="border border-gray-400" />
                    </div>
                    <div>
                      <Label htmlFor="inclinacao_max">Inclinação Máx. (°)</Label>
                      <Input
                        id="inclinacao_max"
                        type="number"
                        min="0"
                        max="90"
                        value={formData.inclinacao_max || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, inclinacao_max: Number(e.target.value) }))}
                        className="border border-gray-400" />
                    </div>
                    <div>
                      <Label htmlFor="garantia">Garantia (anos)</Label>
                      <Input
                        id="garantia"
                        type="number"
                        min="1"
                        max="25"
                        value={formData.garantia || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, garantia: Number(e.target.value) }))}
                        className="border border-gray-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="carga_vento_max">Carga Vento Máx. (N/m²)</Label>
                      <Input
                        id="carga_vento_max"
                        type="number"
                        step="0.1"
                        value={formData.carga_vento_max || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, carga_vento_max: Number(e.target.value) }))}
                        className="border border-gray-400" />
                    </div>
                    <div>
                      <Label htmlFor="carga_neve_max">Carga Neve Máx. (N/m²)</Label>
                      <Input
                        id="carga_neve_max"
                        type="number"
                        step="0.1"
                        value={formData.carga_neve_max || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, carga_neve_max: Number(e.target.value) }))} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Componentes Inclusos</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="inclui_grampos"
                          checked={formData.inclui_grampos}
                          onChange={(e) => setFormData((prev) => ({ ...prev, inclui_grampos: e.target.checked }))}
                          className="rounded" />
                        <Label htmlFor="inclui_grampos" className="text-sm">
                          Grampos
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="inclui_parafusos"
                          checked={formData.inclui_parafusos}
                          onChange={(e) => setFormData((prev) => ({ ...prev, inclui_parafusos: e.target.checked }))}
                          className="rounded" />
                        <Label htmlFor="inclui_parafusos" className="text-sm">
                          Parafusos
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="inclui_trilhos"
                          checked={formData.inclui_trilhos}
                          onChange={(e) => setFormData((prev) => ({ ...prev, inclui_trilhos: e.target.checked }))}
                          className="rounded" />
                        <Label htmlFor="inclui_trilhos" className="text-sm">
                          Trilhos
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="inclui_terminais"
                          checked={formData.inclui_terminais}
                          onChange={(e) => setFormData((prev) => ({ ...prev, inclui_terminais: e.target.checked }))}
                          className="rounded" />
                        <Label htmlFor="inclui_terminais" className="text-sm">
                          Terminais
                        </Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Pré-visualização</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Modelo</Label>
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <p className="font-medium text-sm">{formData.modelo || "Modelo da estrutura"}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Tipo: {formData.tipo}</p>
                    <p>Marca: {formData.marca}</p>
                    <p>Módulos: {formData.modulos_por_estrutura}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{formData.tipo}</Badge>
                    {formData.material && <Badge variant="secondary">{formData.material}</Badge>}
                  </div>

                  <div className="pt-4 space-y-2">
                    <Button type="submit" className="w-full" disabled={saving}>
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editandoEstrutura ? "Atualizar" : "Salvar"} Estrutura
                    </Button>
                    <Button type="button" variant="outline" className="w-full bg-transparent">
                      Salvar e Nova
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Estruturas de Fixação</h2>
          <p className="text-muted-foreground">Gerencie o catálogo de estruturas de fixação</p>
        </div>
        <Button onClick={() => setMostrarFormulario(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Estrutura
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Estruturas Cadastradas</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Carregando estruturas...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {estruturas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma estrutura cadastrada ainda.</p>
                  <p className="text-sm">Clique em "Nova Estrutura" para começar.</p>
                </div>
              ) : (
                estruturas.map((estrutura) => (
                  <div key={estrutura.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold">{estrutura.modelo}</h3>
                        <div className="flex space-x-2">
                          <Badge variant="outline">{estrutura.tipo}</Badge>
                          {estrutura.material && <Badge variant="secondary">{estrutura.material}</Badge>}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {estrutura.marca} • {estrutura.modulos_por_estrutura} módulos • {estrutura.peso_por_modulo}
                        kg/módulo
                      </p>
                      <div className="flex space-x-4 mt-2 text-sm">
                        <span>Kit: R$ {(Number(estrutura.preco_kit) || 0).toFixed(2)}</span>
                        <span>Avulso: R$ {(Number(estrutura.preco_avulso) || 0).toFixed(2)}</span>
                        <span>Garantia: {estrutura.garantia} anos</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => editarEstrutura(estrutura)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => excluirEstrutura(estrutura.id!)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
