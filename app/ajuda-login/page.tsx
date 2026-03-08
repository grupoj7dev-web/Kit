"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, User, Mail, Key, AlertCircle, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function AjudaLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Solar Kit Pro</h1>
          <p className="mt-2 text-lg text-gray-600">Ajuda com Login e Cadastro</p>
        </div>

        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Problema comum:</strong> Erro 400 (Bad Request) ao tentar fazer login significa que ainda não há
            usuários cadastrados no sistema.
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Como Criar o Primeiro Usuário
              </CardTitle>
              <CardDescription>Siga estes passos para criar sua primeira conta no sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Acesse a página de cadastro</p>
                    <p className="text-sm text-gray-600">Clique no link "Criar conta" na tela de login</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Preencha seus dados</p>
                    <p className="text-sm text-gray-600">Email válido e senha com pelo menos 6 caracteres</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Confirme o cadastro</p>
                    <p className="text-sm text-gray-600">Verifique seu email se necessário</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium text-green-600">
                    4
                  </div>
                  <div>
                    <p className="font-medium">Faça login</p>
                    <p className="text-sm text-gray-600">Use as credenciais criadas para acessar o sistema</p>
                  </div>
                </div>
              </div>

              <Link href="/cadastro">
                <Button className="w-full">
                  <User className="mr-2 h-4 w-4" />
                  Ir para Cadastro
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-green-600" />
                Usuário de Teste
              </CardTitle>
              <CardDescription>Use estas credenciais para testar o sistema rapidamente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Credenciais de teste:</strong>
                  <br />
                  Email: <code className="bg-white px-1 rounded">teste@sistema.com</code>
                  <br />
                  Senha: <code className="bg-white px-1 rounded">123456</code>
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <p className="text-sm text-gray-600">Se você quiser criar este usuário de teste automaticamente:</p>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-2">1. Vá para a página de cadastro</p>
                  <p className="text-sm font-medium mb-2">2. Use o email: teste@sistema.com</p>
                  <p className="text-sm font-medium mb-2">3. Use a senha: 123456</p>
                  <p className="text-sm font-medium">4. Confirme o cadastro</p>
                </div>
              </div>

              <Link href="/">
                <Button variant="outline" className="w-full bg-transparent">
                  <Mail className="mr-2 h-4 w-4" />
                  Ir para Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Problemas Comuns e Soluções</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="border-l-4 border-red-400 pl-4">
                <h4 className="font-medium text-red-800">Erro 400 - Bad Request</h4>
                <p className="text-sm text-red-600">
                  <strong>Causa:</strong> Credenciais inválidas ou usuário não existe
                  <br />
                  <strong>Solução:</strong> Certifique-se de que o usuário foi cadastrado corretamente
                </p>
              </div>

              <div className="border-l-4 border-yellow-400 pl-4">
                <h4 className="font-medium text-yellow-800">Email não confirmado</h4>
                <p className="text-sm text-yellow-600">
                  <strong>Causa:</strong> Email de confirmação não foi verificado
                  <br />
                  <strong>Solução:</strong> Verifique sua caixa de entrada e spam
                </p>
              </div>

              <div className="border-l-4 border-blue-400 pl-4">
                <h4 className="font-medium text-blue-800">Senha muito fraca</h4>
                <p className="text-sm text-blue-600">
                  <strong>Causa:</strong> Senha com menos de 6 caracteres
                  <br />
                  <strong>Solução:</strong> Use uma senha com pelo menos 6 caracteres
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o Login
          </Link>
        </div>
      </div>
    </div>
  )
}
