"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calculator, Zap, Package, Cable, Box } from "lucide-react"
import { jsPDF } from 'jspdf'
import { createClient } from "@/lib/supabase/client"
import { formatEstrutura, formatInversor, formatRede, formatCurrency, formatPotencia, formatDateTime, formatStatus } from '@/src/utils/formatters'
import { MicroSelectorField } from '@/components/micro-selector-field'

interface KitCalculationInput {
  potenciaPico: number
  potenciaPlaca: number
  idModulo?: string
  tipoInversor: "string" | "micro"
  tipoEstrutura: "telhado" | "solo"
  condicaoInversor?: "calcular" | "usuario-define"
  idInversor?: string
  tipoRede: "monofasico" | "trifasico"
  transformador?: boolean
  potenciaTrafo?: number | null
  modulosPorMicro?: number // Quantos módulos por microinversor (4 ou 6)
}

interface KitResult {
  resultado: string
  valorTotal: number
  kitNumber?: number
  kitReference?: string
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

export function CalculadoraKits() {
  // Máscara para campo de potência pico (decimal, sufixo kWp)
  function maskDecimal(value: string) {
    // Remove tudo que não é número ou vírgula/ponto
    let v = value.replace(/[^\d.,]/g, "").replace(/,/g, ".")
    // Permite apenas um ponto
    v = v.replace(/(\..*)\./g, "$1")
    // Limita a 2 casas decimais
    const parts = v.split('.')
    if (parts.length > 1) {
      v = parts[0] + '.' + parts[1].slice(0, 2)
    }
    return v
  }
  const [inputData, setInputData] = useState<KitCalculationInput>({
    potenciaPico: 0,
    potenciaPlaca: 0,
    tipoInversor: "string",
    tipoEstrutura: "telhado",
    tipoRede: "monofasico",
    transformador: false,
    potenciaTrafo: null,
  })

  const [modulos, setModulos] = useState<any[]>([])
  const [inversores, setInversores] = useState<any[]>([])
  const [carregandoDados, setCarregandoDados] = useState(true)
  const [modoInversor, setModoInversor] = useState<'calcular' | 'usuario-define'>('calcular')

  const [resultado, setResultado] = useState<KitResult | null>(null)
  const [calculando, setCalculando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const carregarDados = async () => {
      try {
        console.log('[v0] Calculadora: iniciando carregamento de dados')
        const supabase = createClient()

        const [modulosRes, inversoresRes] = await Promise.all([
          supabase.from("modulos").select("id, marca, modelo, potencia_w").not('modelo', 'ilike', '[DESATIVADO]%'),
          supabase.from("inversores").select("id, marca, modelo, potencia_kw")
        ])

        console.log('[v0] Calculadora: modulosRes=', modulosRes)
        if (modulosRes.data && modulosRes.data.length > 0) {
          setModulos(modulosRes.data)
          // Define automaticamente o primeiro módulo válido (com potencia_w)
          const primeiroModulo = modulosRes.data.find(m => m.potencia_w != null)
          if (primeiroModulo && inputData.potenciaPlaca === 0) {
            setInputData(prev => ({ ...prev, potenciaPlaca: primeiroModulo.potencia_w, idModulo: primeiroModulo.id }))
          }
        }
        if (inversoresRes.data && inversoresRes.data.length > 0) {
          setInversores(inversoresRes.data)
          // default idInversor when user chooses manual mode later
          setInputData(prev => ({ ...prev, idInversor: prev.idInversor || inversoresRes.data[0].id }))
        }
      } catch (error) {
        console.error("[v0] Erro ao carregar dados da calculadora:", error)
      } finally {
        setCarregandoDados(false)
      }
    }

    carregarDados()
  }, [])

  const calcularKit = async () => {
    setCalculando(true)
    setErro(null)

    try {
      console.log('[v0] Calculadora: enviando payload ->', inputData)
      // Compor payload incluindo modo de inversor / id (se aplicável)
      const payload: any = { ...inputData }
      payload.condicaoInversor = modoInversor === 'usuario-define' ? 'usuario-define' : 'calcular'
      if (modoInversor === 'usuario-define') payload.idInversor = inputData.idInversor

      // Garantir que os campos de transformador sejam enviados corretamente
      if (inputData.transformador && inputData.potenciaTrafo) {
        payload.transformador = true
        payload.potenciaTrafo = inputData.potenciaTrafo
      } else {
        payload.transformador = false
        payload.potenciaTrafo = null
      }

      const response = await fetch("/api/calcular-kit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[v0] Calculadora: resposta de erro da API ->', errorData)
        throw new Error(errorData.error || "Erro ao calcular kit")
      }

      const result: KitResult = await response.json()
      console.log('[v0] Calculadora: resultado recebido ->', result)
      setResultado(result)
    } catch (error) {
      console.error("[v0] Erro ao calcular kit:", error)
      let msg = "Erro desconhecido"
      if (error instanceof Error) {
        msg = error.message
      } else if (typeof error === 'object' && error !== null) {
        // Tenta extrair mensagem de objetos de erro genéricos ou Eventos
        const rawMsg = (error as any).message || (error as any).error || JSON.stringify(error)
        // [object Event] geralmente indica erro de rede/timeout no fetch que não retornou detalhes
        if (rawMsg === '{}' || rawMsg === '[object Object]' || rawMsg === '[object Event]' || rawMsg.includes('Event')) {
          msg = "Erro de conexão ao calcular. O servidor pode estar lento ou indisponível. Tente novamente."
        } else {
          msg = rawMsg
        }
      } else if (typeof error === 'string') {
        msg = error
      }
      setErro(msg)
    } finally {
      setCalculando(false)
    }
  }

  const resetCalculadora = () => {
    const primeiroModulo = modulos.find(m => m.potencia_w != null)
    setInputData({
      potenciaPico: 0,
      potenciaPlaca: primeiroModulo ? primeiroModulo.potencia_w : 0,
      idModulo: primeiroModulo?.id,
      tipoInversor: "string",
      tipoEstrutura: "telhado",
      tipoRede: "monofasico",
      transformador: false,
      potenciaTrafo: null,
    })
    setResultado(null)
    setErro(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Calculadora de Kits Fotovoltaicos</h2>
          <p className="text-muted-foreground">Gere automaticamente a lista de materiais para seu projeto</p>
        </div>
        {resultado && (
          <Button variant="outline" onClick={resetCalculadora}>
            Nova Calculação
          </Button>
        )}
      </div>

      {erro && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-destructive">
              <span className="font-semibold">Erro:</span>
              <span>{erro}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!resultado ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="h-5 w-5" />
              <span>Dados de Entrada</span>
            </CardTitle>
            <CardDescription>Preencha os dados do projeto para gerar o kit fotovoltaico</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label>Modo do Inversor</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="modoInversor" checked={modoInversor === 'calcular'} onChange={() => setModoInversor('calcular')} />
                      Calcular automaticamente
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="modoInversor" checked={modoInversor === 'usuario-define'} onChange={() => setModoInversor('usuario-define')} />
                      Definir inversor manualmente
                    </label>
                  </div>
                </div>

                {modoInversor === 'usuario-define' && (
                  <div>
                    <Label htmlFor="idInversor">Escolha o Inversor (opcional)</Label>
                    <Select
                      value={inputData.idInversor || ""}
                      onValueChange={(value) => setInputData(prev => ({ ...prev, idInversor: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um inversor" />
                      </SelectTrigger>
                      <SelectContent>
                        {inversores.map(inv => (
                          <SelectItem key={inv.id} value={inv.id}>{inv.marca} {inv.modelo} {inv.potencia_kw ? `(${inv.potencia_kw} kW)` : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Se escolher, o sistema validará se o inversor é compatível; caso contrário, informe o modo 'Calcular automaticamente'.</p>
                  </div>
                )}

                <div>
                  <Label htmlFor="potenciaPico">Potência Pico da Usina (kWp) *</Label>
                  <Input
                    id="potenciaPico"
                    type="number"
                    step="0.01"
                    min="0"
                    value={inputData.potenciaPico || ""}
                    onChange={(e) => setInputData((prev) => ({ ...prev, potenciaPico: Number(e.target.value) }))}
                    required
                    className="border border-gray-400"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Potência total desejada para o sistema</p>
                </div>

                <div>
                  <Label htmlFor="potenciaPlaca">Potência da Placa (W) *</Label>
                  <Select
                    value={inputData.idModulo || ""}
                    onValueChange={(value) => {
                      const mod = modulos.find(m => m.id === value)
                      if (mod) {
                        setInputData(prev => ({ ...prev, idModulo: mod.id, potenciaPlaca: mod.potencia_w }))
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um módulo" />
                    </SelectTrigger>
                    <SelectContent>
                      {modulos
                        .filter((modulo) => modulo.potencia_w != null)
                        .map((modulo) => (
                          <SelectItem key={modulo.id} value={modulo.id}>
                            {modulo.potencia_w}W - {modulo.marca} {modulo.modelo}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Selecione um módulo dos cadastrados no sistema</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="tipoInversor">Tipo do Inversor *</Label>
                  <Select
                    value={inputData.tipoInversor}
                    onValueChange={(value: "string" | "micro") =>
                      setInputData((prev) => ({ ...prev, tipoInversor: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um inversor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">Inversor String</SelectItem>
                      <SelectItem value="micro">Micro Inversor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {inputData.tipoInversor === "micro" && (
                  <MicroSelectorField
                    value={inputData.modulosPorMicro}
                    onChange={(value) => setInputData((prev) => ({ ...prev, modulosPorMicro: value }))}
                  />
                )}

                <div>
                  <Label htmlFor="tipoEstrutura">Tipo da Estrutura *</Label>
                  <Select
                    value={inputData.tipoEstrutura}
                    onValueChange={(value: "telhado" | "solo") => setInputData((prev) => ({ ...prev, tipoEstrutura: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma estrutura" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="telhado">Telhado</SelectItem>
                      <SelectItem value="solo">Solo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tipoRede">Tipo da Rede *</Label>
                  <Select
                    value={inputData.tipoRede}
                    onValueChange={(value: "monofasico" | "trifasico") => setInputData((prev) => ({ ...prev, tipoRede: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a rede" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monofasico">Monofásico</SelectItem>
                      <SelectItem value="trifasico">Trifásico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="transformador">Transformador</Label>
                  <Select
                    value={inputData.transformador ? "Sim" : "Não"}
                    onValueChange={(value) => setInputData((prev) => ({
                      ...prev,
                      transformador: value === "Sim",
                      potenciaTrafo: value === "Sim" ? (prev.potenciaTrafo || 15) : null
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Possui transformador?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Não">Não</SelectItem>
                      <SelectItem value="Sim">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Indique se há transformador no sistema</p>
                </div>

                {inputData.transformador && (
                  <div>
                    <Label htmlFor="potenciaTrafo">Potência do Transformador (kW)</Label>
                    <Input
                      id="potenciaTrafo"
                      type="number"
                      step="0.1"
                      min="1"
                      value={inputData.potenciaTrafo || ""}
                      onChange={(e) => setInputData((prev) => ({ ...prev, potenciaTrafo: Number(e.target.value) }))}
                      className="border border-gray-400"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Potência máxima do transformador (limitará a potência do inversor)</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={calcularKit}
                disabled={!inputData.potenciaPico || !inputData.potenciaPlaca || !inputData.idModulo || calculando || carregandoDados}
                className="px-8"
              >
                {calculando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Calculando...
                  </>
                ) : carregandoDados ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Carregando dados...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Calcular Kit
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Resumo do Kit */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Kit Fotovoltaico Gerado</span>
                </span>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {formatCurrency(resultado.valorTotal)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {resultado.kitReference && (
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-sm">
                    Referência: <span className="font-semibold">{resultado.kitReference}</span>
                  </div>
                  <a href="/historico-kits" className="text-sm text-blue-600 hover:underline">Ver Histórico</a>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Observações do Projeto:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {resultado.detalhes.observacoes.map((obs: string, index: number) => (
                      <li key={index}>• {obs}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      {formatCurrency(resultado.valorTotal)}
                    </div>
                    <p className="text-sm text-muted-foreground">Valor Total do Kit</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Itens */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Materiais</CardTitle>
              <CardDescription>Itens inclusos no kit fotovoltaico</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Módulos */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">
                        Módulos Fotovoltaicos - {resultado.detalhes.modulos.potencia}W
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {resultado.detalhes.modulos.quantidade} unidades - Potência Total: {resultado.detalhes.modulos.potenciaTotal}kWp
                      </p>
                    </div>
                  </div>
                </div>

                {/* Inversores */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <Box className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">
                        Inversores - {resultado.detalhes.componentes.inversores.descricao}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {resultado.detalhes.componentes.inversores.quantidade} unidades
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(resultado.detalhes.componentes.inversores.preco)}
                    </div>
                  </div>
                </div>

                {/* String Box */}
                {resultado.detalhes.componentes.stringBox.quantidade > 0 && (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">
                          String Box - {resultado.detalhes.componentes.stringBox.descricao}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {resultado.detalhes.componentes.stringBox.quantidade} unidades
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(resultado.detalhes.componentes.stringBox.preco)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Estrutura */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">
                        Estrutura - {resultado.detalhes.componentes.estrutura.descricao}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {resultado.detalhes.componentes.estrutura.quantidade} kits
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(resultado.detalhes.componentes.estrutura.preco)}
                    </div>
                  </div>
                </div>

                {/* Cabos - renderiza apenas se existir e preço > 0 */}
                <div className="space-y-2">
                  {resultado.detalhes.componentes.cabos.vermelho && resultado.detalhes.componentes.cabos.vermelho.preco > 0 && (
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Cable className="h-5 w-5 text-red-500" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Cabo Vermelho</h4>
                          <p className="text-sm text-muted-foreground">
                            {resultado.detalhes.componentes.cabos.vermelho.metros} metros
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatCurrency(resultado.detalhes.componentes.cabos.vermelho.preco)}
                        </div>
                      </div>
                    </div>
                  )}
                  {resultado.detalhes.componentes.cabos.preto && resultado.detalhes.componentes.cabos.preto.preco > 0 && (
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Cable className="h-5 w-5 text-gray-800" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Cabo Preto</h4>
                          <p className="text-sm text-muted-foreground">
                            {resultado.detalhes.componentes.cabos.preto.metros} metros
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatCurrency(resultado.detalhes.componentes.cabos.preto.preco)}
                        </div>
                      </div>
                    </div>
                  )}
                  {resultado.detalhes.componentes.cabos.aterramento && resultado.detalhes.componentes.cabos.aterramento.preco > 0 && (
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Cable className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Cabo de Aterramento</h4>
                          <p className="text-sm text-muted-foreground">
                            {resultado.detalhes.componentes.cabos.aterramento.metros} metros
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatCurrency(resultado.detalhes.componentes.cabos.aterramento.preco)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Conectores MC4 */}
                {resultado.detalhes.componentes.conectoresMC4 && (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Conectores MC4</h4>
                        <p className="text-sm text-muted-foreground">
                          {resultado.detalhes.componentes.conectoresMC4.quantidade} unidades
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(resultado.detalhes.componentes.conectoresMC4.preco)}
                      </div>
                    </div>
                  </div>
                )}
                {resultado.itens && resultado.itens.length > 0 && (
                  <div className="mt-6 border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Resumo Estruturado</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      {resultado.itens.map((item, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>{item.categoria}: {item.descricao}</span>
                          <span>{formatCurrency(item.precoTotal)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Valor Total do Kit:</span>
                  <span className="text-primary">
                    {formatCurrency(resultado.valorTotal)}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={() => {
                    try {
                      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
                      const pageWidth = doc.internal.pageSize.getWidth()
                      const pageHeight = doc.internal.pageSize.getHeight()
                      const margin = 48
                      const contentWidth = pageWidth - margin * 2

                      // layout constants
                      const headerHeight = 72
                      const summaryHeight = 96
                      const tableHeaderHeight = 26
                      const rowPaddingV = 6
                      const lineHeight = 14
                      const bottomReserve = 48 // reserve for totals/footer
                      const usableBottom = pageHeight - margin - bottomReserve

                      // Green palette
                      const brand = { r: 16, g: 185, b: 129 } // emerald-500
                      const brandDark = { r: 6, g: 95, b: 70 }

                      // Header banner (first page)
                      const drawMainHeader = () => {
                        doc.setFillColor(brand.r, brand.g, brand.b)
                        doc.rect(0, 0, pageWidth, headerHeight, 'F')
                        doc.setTextColor('#ffffff')
                        doc.setFontSize(18)
                        doc.text('NovoKit • Relatório do Kit Fotovoltaico', margin, 44)
                        doc.setFontSize(9)
                        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - margin, 44, { align: 'right' })
                      }

                      drawMainHeader()

                      // Start content under header
                      let y = margin + headerHeight - 24 // small overlap for breathing

                      // Summary card (light green)
                      doc.setFillColor(237, 253, 245)
                      doc.rect(margin, y, contentWidth, summaryHeight, 'F')
                      doc.setTextColor('#0f172a')
                      doc.setFontSize(13)
                      const summaryPad = 12
                      doc.text('Resumo Técnico', margin + summaryPad, y + 22)
                      doc.setFontSize(10)
                      doc.text(`Potência total: ${resultado.detalhes.modulos.potenciaTotal} kWp`, margin + summaryPad, y + 40)
                      doc.text(`Módulos: ${resultado.detalhes.modulos.quantidade} × ${resultado.detalhes.modulos.potencia} W`, margin + summaryPad, y + 56)
                      doc.text(`Inversores: ${resultado.detalhes.componentes.inversores.descricao}`, margin + contentWidth / 2, y + 40)
                      doc.text(`Valor estimado: R$ ${resultado.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + contentWidth / 2, y + 56)

                      y += summaryHeight + 12

                      // Table columns (positions calculated from contentWidth so they never exceed margins)
                      const col = {
                        categoria: margin + 6,
                        descricao: margin + 110,
                        quantidade: margin + Math.round(contentWidth * 0.75),
                        precoUnit: margin + Math.round(contentWidth * 0.86),
                        precoTotal: margin + contentWidth - 6,
                      }
                      const descricaoColWidth = col.quantidade - col.descricao - 8

                      const drawTableHeader = (yPos: number) => {
                        doc.setFillColor(6, 95, 70)
                        doc.rect(margin, yPos, contentWidth, tableHeaderHeight, 'F')
                        doc.setTextColor('#ffffff')
                        doc.setFontSize(11)
                        const textY = yPos + tableHeaderHeight / 2 + 4
                        doc.text('Categoria', col.categoria, textY)
                        doc.text('Descrição', col.descricao, textY)
                        doc.text('Qtde', col.quantidade, textY, { align: 'right' })
                        doc.text('Preço Un.', col.precoUnit, textY, { align: 'right' })
                        doc.text('Preço Total', col.precoTotal, textY, { align: 'right' })
                        return yPos + tableHeaderHeight + 6
                      }

                      // draw first table header
                      y = drawTableHeader(y)

                      // rows
                      doc.setFontSize(10)
                      doc.setTextColor('#0f172a')

                      resultado.itens && resultado.itens.forEach((it, idx) => {
                        const descLines = doc.splitTextToSize(it.descricao || '-', descricaoColWidth)
                        const lines = Math.max(1, descLines.length)
                        const rowHeight = lines * lineHeight + rowPaddingV * 2

                        // page break check
                        if (y + rowHeight > usableBottom) {
                          doc.addPage()
                          // draw small header on subsequent pages
                          doc.setFillColor(brand.r, brand.g, brand.b)
                          doc.rect(0, 0, pageWidth, 28, 'F')
                          doc.setTextColor('#ffffff')
                          doc.setFontSize(12)
                          doc.text('NovoKit • Relatório do Kit Fotovoltaico', margin, 20)
                          doc.setFontSize(9)
                          doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - margin, 20, { align: 'right' })
                          y = margin + 28
                          y = drawTableHeader(y)
                        }

                        // alternating background for row
                        if (idx % 2 === 0) {
                          doc.setFillColor(245, 253, 250)
                          doc.rect(margin, y, contentWidth, rowHeight, 'F')
                        }

                        // write cells (use vertical padding)
                        const textBase = y + rowPaddingV + 2
                        doc.setTextColor('#0f172a')
                        doc.text(it.categoria || '-', col.categoria, textBase)
                        doc.text(descLines, col.descricao, textBase)
                        doc.text(String(it.quantidade ?? '-'), col.quantidade, textBase, { align: 'right' })
                        const precoUnit = it.precoUnit ? `R$ ${Number(it.precoUnit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'
                        doc.text(precoUnit, col.precoUnit, textBase, { align: 'right' })
                        const precoTotal = it.precoTotal ? `R$ ${Number(it.precoTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'
                        doc.text(precoTotal, col.precoTotal, textBase, { align: 'right' })

                        // advance y
                        y += rowHeight + 6
                      })

                      // Totals area (ensure space)
                      if (y + 80 > usableBottom) { doc.addPage(); y = margin }
                      doc.setFillColor(16, 185, 129)
                      doc.rect(margin, y, contentWidth, 56, 'F')
                      doc.setTextColor('#ffffff')
                      doc.setFontSize(12)
                      doc.text('Valor Total do Kit', margin + 12, y + 34)
                      doc.setFontSize(14)
                      doc.text(`R$ ${resultado.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - margin - 12, y + 34, { align: 'right' })

                      // Footer (place above bottom margin)
                      const footerY = pageHeight - margin + 8
                      doc.setFontSize(9)
                      doc.setTextColor('#6b7280')
                      doc.text('NovoKit • Relatório gerado automaticamente', margin, footerY)

                      doc.save(`kit-fotovoltaico-${Date.now()}.pdf`)
                    } catch (e: any) {
                      console.error('Erro ao gerar PDF client-side', e)
                      setErro(e?.message || 'Erro ao gerar PDF')
                    }
                  }}>Baixar PDF</Button>
                  <a href="/historico-kits" className="px-4 py-2 border rounded-md text-sm">Ver Histórico</a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
