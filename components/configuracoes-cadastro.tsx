"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Loader2 } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { useToast } from "@/hooks/use-toast"

interface ConfiguracoesData {
  id?: number
  // Preços dos componentes auxiliares
  stringBoxPreco: number
  caboSolarPretoPreco: number
  caboSolarVermelhoPreco: number
  caboSolarVerdePreco: number
  conectorMc4Preco: number

  // Configurações de cálculo
  margemLucro: number
  descontoKit: number

  // Dados da empresa
  nomeEmpresa: string
  cnpj: string
  endereco: string
  telefone: string
  email: string

  // Configurações do sistema
  moedaPadrao: string
  formatoData: string
  fusoHorario: string
}

export function ConfiguracoesCadastro() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { toast } = useToast()

  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesData>({
    stringBoxPreco: 150.0,
    caboSolarPretoPreco: 8.5,
    caboSolarVermelhoPreco: 8.5,
    caboSolarVerdePreco: 8.5,
    conectorMc4Preco: 12.0,
    margemLucro: 30,
    descontoKit: 15,
    nomeEmpresa: "Solar Kit Pro Ltda",
    cnpj: "12.345.678/0001-90",
    endereco: "Rua das Energias, 123 - Centro",
    telefone: "(11) 99999-9999",
    email: "contato@solarkitpro.com.br",
    moedaPadrao: "BRL",
    formatoData: "DD/MM/AAAA",
    fusoHorario: "America/Sao_Paulo",
  })

  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregarConfiguracoes()
  }, [])

  const carregarConfiguracoes = async () => {
    try {
      const { data, error } = await supabase.from("configuracoes").select("*").single()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      if (data) {
        setConfiguracoes(data)
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações do sistema",
        variant: "destructive",
      })
    } finally {
      setCarregando(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)

    try {
      const { error } = await supabase.from("configuracoes").upsert(configuracoes, {
        onConflict: "id",
      })

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!",
      })
    } catch (error) {
      console.error("Erro ao salvar configurações:", error)
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações",
        variant: "destructive",
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleInputChange = (field: keyof ConfiguracoesData, value: string | number) => {
    setConfiguracoes((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  if (carregando) {
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
          <h2 className="text-2xl font-bold text-foreground">Configurações do Sistema</h2>
          <p className="text-muted-foreground">Configure preços, dados da empresa e parâmetros do sistema</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="precos" className="space-y-4">
          <TabsList>
            <TabsTrigger value="precos">Preços Componentes</TabsTrigger>
            <TabsTrigger value="calculo">Cálculos</TabsTrigger>
            <TabsTrigger value="empresa">Dados da Empresa</TabsTrigger>
            <TabsTrigger value="sistema">Sistema</TabsTrigger>
          </TabsList>

          <TabsContent value="precos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Preços dos Componentes Auxiliares</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stringBoxPreco">String Box (R$)</Label>
                    <Input
                      id="stringBoxPreco"
                      type="number"
                      step="0.01"
                      min="0"
                      value={configuracoes.stringBoxPreco}
                      onChange={(e) => handleInputChange("stringBoxPreco", Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="conectorMc4Preco">Conector MC4 (R$ por par)</Label>
                    <Input
                      id="conectorMc4Preco"
                      type="number"
                      step="0.01"
                      min="0"
                      value={configuracoes.conectorMc4Preco}
                      onChange={(e) => handleInputChange("conectorMc4Preco", Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="caboSolarPretoPreco">Cabo Solar Preto (R$ por metro)</Label>
                    <Input
                      id="caboSolarPretoPreco"
                      type="number"
                      step="0.01"
                      min="0"
                      value={configuracoes.caboSolarPretoPreco}
                      onChange={(e) => handleInputChange("caboSolarPretoPreco", Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="caboSolarVermelhoPreco">Cabo Solar Vermelho (R$ por metro)</Label>
                    <Input
                      id="caboSolarVermelhoPreco"
                      type="number"
                      step="0.01"
                      min="0"
                      value={configuracoes.caboSolarVermelhoPreco}
                      onChange={(e) => handleInputChange("caboSolarVermelhoPreco", Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="caboSolarVerdePreco">Cabo Solar Verde (R$ por metro)</Label>
                    <Input
                      id="caboSolarVerdePreco"
                      type="number"
                      step="0.01"
                      min="0"
                      value={configuracoes.caboSolarVerdePreco}
                      onChange={(e) => handleInputChange("caboSolarVerdePreco", Number(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calculo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Cálculo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="margemLucro">Margem de Lucro Padrão (%)</Label>
                    <Input
                      id="margemLucro"
                      type="number"
                      min="0"
                      max="100"
                      value={configuracoes.margemLucro}
                      onChange={(e) => handleInputChange("margemLucro", Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="descontoKit">Desconto Kit vs Avulso (%)</Label>
                    <Input
                      id="descontoKit"
                      type="number"
                      min="0"
                      max="50"
                      value={configuracoes.descontoKit}
                      onChange={(e) => handleInputChange("descontoKit", Number(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="empresa" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dados da Empresa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
                    <Input
                      id="nomeEmpresa"
                      value={configuracoes.nomeEmpresa}
                      onChange={(e) => handleInputChange("nomeEmpresa", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={configuracoes.cnpj}
                      onChange={(e) => handleInputChange("cnpj", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={configuracoes.endereco}
                    onChange={(e) => handleInputChange("endereco", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={configuracoes.telefone}
                      onChange={(e) => handleInputChange("telefone", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={configuracoes.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sistema" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="moedaPadrao">Moeda Padrão</Label>
                    <Input
                      id="moedaPadrao"
                      value={configuracoes.moedaPadrao}
                      onChange={(e) => handleInputChange("moedaPadrao", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="formatoData">Formato de Data</Label>
                    <Input
                      id="formatoData"
                      value={configuracoes.formatoData}
                      onChange={(e) => handleInputChange("formatoData", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fusoHorario">Fuso Horário</Label>
                    <Input
                      id="fusoHorario"
                      value={configuracoes.fusoHorario}
                      onChange={(e) => handleInputChange("fusoHorario", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-6">
          <Button type="submit" disabled={salvando} className="min-w-32">
            {salvando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
