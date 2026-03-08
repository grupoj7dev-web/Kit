"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ChevronDown,
  ChevronRight,
  Home,
  Package,
  Calculator,
  Settings,
  Zap,
  Menu,
  X,
  FileText,
  Cable,
  Building2,
  LogOut,
  Loader2,
  WifiOff,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useAuthFallback } from "@/hooks/use-auth-fallback"

interface SidebarItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  children?: SidebarItem[]
}

const sidebarItems: SidebarItem[] = [
  {
    id: "home",
    label: "Dashboard",
    icon: Home,
    href: "/",
  },
  {
    id: "cadastros",
    label: "Cadastros",
    icon: Package,
    children: [
      {
        id: "modulos",
        label: "Módulos Fotovoltaicos",
        icon: Zap,
        href: "/cadastros/modulos",
      },
      {
        id: "inversores",
        label: "Inversores",
        icon: Zap,
        href: "/cadastros/inversores",
      },
      {
        id: "estruturas",
        label: "Estruturas",
        icon: Package,
        href: "/cadastros/estruturas",
      },
      {
        id: "string-boxes",
        label: "String Boxes",
        icon: Building2,
        href: "/cadastros/string-boxes",
      },
      {
        id: "cabos",
        label: "Cabos",
        icon: Cable,
        href: "/cadastros/cabos",
      },
      {
        id: "concessionarias",
        label: "Concessionárias",
        icon: Zap,
        href: "/cadastros/concessionarias",
      },
      {
        id: "fornecedores",
        label: "Fornecedores",
        icon: Package,
        href: "/cadastros/fornecedores",
      },
    ],
  },
  {
    id: "calculadora",
    label: "Calculadora de Kits",
    icon: Calculator,
    href: "/calculadora",
  },
  {
    id: "historico",
    label: "Histórico de Kits",
    icon: FileText,
    href: "/historico-kits",
  },
  {
    id: "documentacao",
    label: "Documentação",
    icon: FileText,
    href: "/documentacao",
  },
  {
    id: "configuracoes",
    label: "Configurações",
    icon: Settings,
    href: "/configuracoes",
  },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>(["cadastros"])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  const { user, loading, error, signOut, isOffline } = useAuthFallback()

  useEffect(() => {
    if (!loading && !user && !isOffline) {
      router.push("/")
    }
  }, [loading, user, isOffline, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando...</span>
        </div>
      </div>
    )
  }

  if (error && !isOffline) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Erro de autenticação: {error}</p>
          <Button onClick={() => router.push("/")}>Voltar ao Login</Button>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const handleLogout = async () => {
    try {
      console.log("[v0] Attempting logout...")
      await signOut()

      console.log("[v0] Logout successful")
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso",
      })
      router.push("/")
      router.refresh()
    } catch (error) {
      console.log("[v0] Unexpected logout error:", error)
      toast({
        title: "Erro",
        description: "Erro inesperado ao fazer logout",
        variant: "destructive",
      })
    }
  }

  const renderSidebarItem = (item: SidebarItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.id)
    const Icon = item.icon
    const isActive = pathname === item.href

    return (
      <div key={item.id}>
        {item.href ? (
          <Link href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                level > 0 && "ml-4 text-sm",
                isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <Icon className="mr-2 h-4 w-4" />
              <span className="flex-1 text-left">{item.label}</span>
            </Button>
          </Link>
        ) : (
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              level > 0 && "ml-4 text-sm",
            )}
            onClick={() => (hasChildren ? toggleExpanded(item.id) : undefined)}
          >
            <Icon className="mr-2 h-4 w-4" />
            <span className="flex-1 text-left">{item.label}</span>
            {hasChildren && (isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
          </Button>
        )}

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">{item.children?.map((child) => renderSidebarItem(child, level + 1))}</div>
        )}
      </div>
    )
  }

  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <div className="flex items-center space-x-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-semibold text-sidebar-foreground">Solar Kit Pro</span>
            {isOffline && (
              <div className="flex items-center space-x-1 text-xs text-orange-500">
                <WifiOff className="h-3 w-3" />
                <span>Offline</span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4">
          <nav className="space-y-2">{sidebarItems.map((item) => renderSidebarItem(item))}</nav>

          {/* Histórico de Kits (sidebar) */}
          <div className="mt-6">
            {/* KitHistorico removed per request */}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold text-card-foreground">Sistema de Geração de Kits Fotovoltaicos</h1>
            {isOffline && (
              <div className="flex items-center space-x-1 text-sm text-orange-500 bg-orange-50 px-2 py-1 rounded">
                <WifiOff className="h-4 w-4" />
                <span>Modo Offline</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
