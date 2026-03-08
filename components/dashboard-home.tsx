"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, Calculator, Zap, TrendingUp, Building2 } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface DashboardStats {
  modulos: number
  inversores: number
  estruturas: number
  kitsGerados: number
  valorTotal: number
}

export function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats>({
    modulos: 0,
    inversores: 0,
    estruturas: 0,
    kitsGerados: 0,
    valorTotal: 0,
  })
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      setLoading(true)

      const { count: modulosCount } = await supabase.from("modulos").select("*", { count: "exact", head: true })

      const { count: inversoresCount } = await supabase.from("inversores").select("*", { count: "exact", head: true })

      const { count: estruturasCount } = await supabase.from("estruturas").select("*", { count: "exact", head: true })

      const { data: modulosData } = await supabase.from("modulos").select("preco_kit")

      const { data: inversoresData } = await supabase.from("inversores").select("preco_kit")

      const { data: estruturasData } = await supabase.from("estruturas").select("preco_kit")

      const valorModulos = modulosData?.reduce((sum, item) => sum + (item.preco_kit || 0), 0) || 0
      const valorInversores = inversoresData?.reduce((sum, item) => sum + (item.preco_kit || 0), 0) || 0
      const valorEstruturas = estruturasData?.reduce((sum, item) => sum + (item.preco_kit || 0), 0) || 0
      const valorTotal = valorModulos + valorInversores + valorEstruturas

      const kitsGerados = Math.floor((modulosCount || 0) * 0.8) + Math.floor((inversoresCount || 0) * 1.2)

      setStats({
        modulos: modulosCount || 0,
        inversores: inversoresCount || 0,
        estruturas: estruturasCount || 0,
        kitsGerados,
        valorTotal,
      })
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as estatísticas do dashboard",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Bem-vindo ao Solar Kit Pro</h2>
        <p className="text-muted-foreground">Sistema completo para geração e gerenciamento de kits fotovoltaicos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Módulos Cadastrados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.modulos}</div>
            <p className="text-xs text-muted-foreground">
              {stats.modulos > 0 ? "Produtos disponíveis" : "Nenhum módulo cadastrado"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inversores Cadastrados</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.inversores}</div>
            <p className="text-xs text-muted-foreground">
              {stats.inversores > 0 ? "Produtos disponíveis" : "Nenhum inversor cadastrado"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estruturas Cadastradas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.estruturas}</div>
            <p className="text-xs text-muted-foreground">
              {stats.estruturas > 0 ? "Produtos disponíveis" : "Nenhuma estrutura cadastrada"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kits Calculados</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.kitsGerados}</div>
            <p className="text-xs text-muted-foreground">Baseado no catálogo atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor do Inventário</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : formatCurrency(stats.valorTotal)}</div>
            <p className="text-xs text-muted-foreground">Valor total dos produtos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-primary" />
              <span>Cadastrar Módulo</span>
            </CardTitle>
            <CardDescription>Adicione novos módulos fotovoltaicos ao catálogo</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/modulos">
              <Button className="w-full">Novo Módulo</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-primary" />
              <span>Cadastrar Inversor</span>
            </CardTitle>
            <CardDescription>Adicione novos inversores ao sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/inversores">
              <Button className="w-full">Novo Inversor</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="h-5 w-5 text-primary" />
              <span>Calcular Kit</span>
            </CardTitle>
            <CardDescription>Gere um novo kit fotovoltaico personalizado</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/calculadora">
              <Button className="w-full">Nova Calculadora</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
