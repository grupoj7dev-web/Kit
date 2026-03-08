"use client"

import type React from "react"
import Link from "next/link"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, Loader2, HelpCircle, User } from "lucide-react"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const fillTestCredentials = () => {
    setEmail("jheferson@gmail.com")
    setPassword("Info@123")
    toast({
      title: "Credenciais de teste preenchidas",
      description: "Agora clique em 'Entrar' para fazer login",
    })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    console.log("[v0] Attempting login with email:", email)
    console.log("[v0] Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log("[v0] Supabase Key:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + "...")

    try {
      console.log("[v0] Creating Supabase client...")
      const client = createClient()
      console.log("[v0] Supabase client created successfully")
      
      console.log("[v0] Calling signInWithPassword...")
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      })

      console.log("[v0] Login response:", { data, error })

      if (error) {
        console.log("[v0] Login error:", error)
        let errorMessage = "Erro desconhecido"

        switch (error.message) {
          case "Invalid login credentials":
            errorMessage = "Email ou senha incorretos"
            break
          case "Email not confirmed":
            errorMessage = "Email não confirmado. Execute o script SQL para criar o usuário confirmado."
            toast({
              title: "Email não confirmado",
              description: "Execute o script 012_create_confirmed_user.sql para resolver este problema.",
              variant: "destructive",
            })
            return
          case "Too many requests":
            errorMessage = "Muitas tentativas. Tente novamente em alguns minutos."
            break
          default:
            errorMessage = error.message
        }

        toast({
          title: "Erro no login",
          description: errorMessage,
          variant: "destructive",
        })
        return
      }

      if (data.user) {
        console.log("[v0] Login successful, user:", data.user.email)
        
        // Aguardar um pouco para o cookie ser definido
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Verificar se a sessão foi realmente criada
        const { data: sessionCheck } = await client.auth.getSession()
        console.log("[v0] Session check after login:", sessionCheck)
        
        toast({
          title: "Login realizado com sucesso",
          description: "Redirecionando para o dashboard...",
        })
        
        // Usar window.location ao invés de router.push para forçar refresh completo
        window.location.href = "/dashboard"
      }
    } catch (error) {
      console.log("[v0] Unexpected error:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Entrar no Sistema</CardTitle>
        <CardDescription>Digite suas credenciais para acessar o sistema</CardDescription>
      </CardHeader>
      <CardContent>
        

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Digite seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          <div className="text-center">
            <Link href="/cadastro" className="text-sm text-blue-600 hover:text-blue-800">
              Não tem conta? Criar nova conta
            </Link>
          </div>

          <div className="text-center">
            
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
