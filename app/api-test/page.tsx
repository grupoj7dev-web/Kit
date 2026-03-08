"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function ApiTestPage() {
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testApi = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/test")
      const data = await response.json()
      setTestResult({
        status: response.status,
        data,
        success: response.ok,
      })
    } catch (error) {
      setTestResult({
        status: 0,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        success: false,
      })
    } finally {
      setLoading(false)
    }
  }

  const testExternalApi = async () => {
    setLoading(true)
    try {
      // Simula uma requisição externa usando fetch direto
      const response = await fetch(`${window.location.origin}/api/test`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      const data = await response.json()
      setTestResult({
        status: response.status,
        data,
        success: response.ok,
        external: true,
      })
    } catch (error) {
      setTestResult({
        status: 0,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        success: false,
        external: true,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Teste da API</h1>
        <p className="text-muted-foreground">
          Teste se a API está funcionando corretamente e se o CORS está habilitado.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Teste Interno</CardTitle>
            <CardDescription>Testa a API a partir do próprio domínio</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testApi} disabled={loading} className="w-full">
              {loading ? "Testando..." : "Testar API"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teste Externo (CORS)</CardTitle>
            <CardDescription>Simula uma requisição externa para testar CORS</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testExternalApi} disabled={loading} className="w-full">
              {loading ? "Testando..." : "Testar CORS"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Resultado do Teste
              <Badge variant={testResult.success ? "default" : "destructive"}>
                {testResult.success ? "Sucesso" : "Erro"}
              </Badge>
              {testResult.external && <Badge variant="outline">Externo</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <strong>Status:</strong> {testResult.status}
              </div>
              {testResult.data && (
                <div>
                  <strong>Resposta:</strong>
                  <pre className="mt-2 p-4 bg-muted rounded-lg overflow-auto text-sm">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </div>
              )}
              {testResult.error && (
                <div>
                  <strong>Erro:</strong>
                  <p className="mt-2 p-4 bg-destructive/10 text-destructive rounded-lg">{testResult.error}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Endpoints Disponíveis</CardTitle>
          <CardDescription>APIs que você pode usar externamente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm font-mono">
              <div>GET /api/test</div>
              <div>GET /api/inversores</div>
              <div>POST /api/inversores</div>
              <div>GET /api/modulos</div>
              <div>POST /api/modulos</div>
              <div>GET /api/estruturas</div>
              <div>POST /api/estruturas</div>
              <div>GET /api/fornecedores</div>
              <div>POST /api/fornecedores</div>
              <div>GET /api/string-boxes</div>
              <div>POST /api/string-boxes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como Testar Externamente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <strong>JavaScript/Fetch:</strong>
              <pre className="mt-2 p-4 bg-muted rounded-lg overflow-auto text-sm">
                {`fetch('${typeof window !== "undefined" ? window.location.origin : "https://seu-dominio.com"}/api/test')
  .then(response => response.json())
  .then(data => console.log(data))`}
              </pre>
            </div>
            <div>
              <strong>cURL:</strong>
              <pre className="mt-2 p-4 bg-muted rounded-lg overflow-auto text-sm">
                {`curl -X GET "${typeof window !== "undefined" ? window.location.origin : "https://seu-dominio.com"}/api/test" \\
  -H "Content-Type: application/json"`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
