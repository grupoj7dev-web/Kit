"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy } from "lucide-react"

export function DocumentacaoApiView() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const baseUrl = "https://kitinversores2.vercel.app"

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">API Kit Inversores</h1>
          <p className="text-xl text-gray-600 mb-6">API para cálculo automático de kits fotovoltaicos</p>
          <div className="flex items-center justify-center gap-4">
            <Badge variant="secondary" className="text-sm">
              Base URL: {baseUrl}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="calculator">Calculadora</TabsTrigger>
            <TabsTrigger value="responses">Respostas</TabsTrigger>
            <TabsTrigger value="examples">Exemplos</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Visão Geral da API</CardTitle>
                <CardDescription>
                  A API Kit Inversores permite calcular automaticamente kits fotovoltaicos completos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Funcionalidade Principal</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>
                      • <strong>Cálculo Automático:</strong> Dimensionamento completo de sistemas fotovoltaicos
                    </li>
                    <li>
                      • <strong>Componentes Inclusos:</strong> Módulos, inversores, estruturas, string box e cabos
                    </li>
                    <li>
                      • <strong>Cálculo de Preços:</strong> Valor total do kit com todos os componentes
                    </li>
                    <li>
                      • <strong>Resposta Estruturada:</strong> Dados organizados por categoria de componente
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Endpoint Disponível</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <Badge className="mb-2 bg-green-600">POST</Badge>
                      <p className="font-medium">/api/calcular-kit</p>
                      <p className="text-sm text-gray-600">
                        Calcula kit fotovoltaico completo baseado na potência desejada
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calculator */}
          <TabsContent value="calculator">
            <Card>
              <CardHeader>
                <CardTitle>Endpoint de Cálculo de Kit</CardTitle>
                <CardDescription>
                  <Badge className="mr-2 bg-green-600">POST</Badge>
                  {baseUrl}/api/calcular-kit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Parâmetros de Entrada</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
                      {`{
  "potenciaPico": 12.6,                    // Potência desejada em kWp (obrigatório)
  "potenciaPlaca": 700,                    // Potência da placa: 610 ou 700 (obrigatório)
  "tipoInversor": "string",                // "string" ou "micro" (obrigatório)
  "tipoEstrutura": "telhado",              // "mini-trilho", "telhado", "solo" ou "carport" (obrigatório)
  "condicaoInversor": "calcular",          // "calcular" ou "usuario-define" (obrigatório)
  "tipoRede": "monofasico"                 // "monofasico" ou "trifasico" (obrigatório)
}`}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 bg-transparent"
                      onClick={() =>
                        copyToClipboard(
                          `{
  "potenciaPico": 12.6,
  "potenciaPlaca": 700,
  "tipoInversor": "string",
  "tipoEstrutura": "telhado",
  "condicaoInversor": "calcular",
  "tipoRede": "monofasico"
}`,
                          "calc-request",
                        )
                      }
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {copiedCode === "calc-request" ? "Copiado!" : "Copiar"}
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Descrição dos Parâmetros</h3>
                  <div className="space-y-3 text-gray-600">
                    <div className="p-3 bg-blue-50 rounded">
                      <p>
                        <strong>potenciaPico:</strong> Potência desejada do sistema em kWp (ex: 12.6)
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded">
                      <p>
                        <strong>potenciaPlaca:</strong> Potência da placa fotovoltaica - 610W ou 700W
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded">
                      <p>
                        <strong>tipoInversor:</strong> Tipo do inversor - "string" (String) ou "micro" (Micro Inversor)
                      </p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded">
                      <p>
                        <strong>tipoEstrutura:</strong> Tipo da estrutura - "mini-trilho", "telhado", "solo" ou
                        "carport"
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded">
                      <p>
                        <strong>condicaoInversor:</strong> Como definir o inversor - "calcular" (sistema calcula) ou
                        "usuario-define"
                      </p>
                    </div>
                    <div className="p-3 bg-red-50 rounded">
                      <p>
                        <strong>tipoRede:</strong> Tipo da rede elétrica - "monofasico" ou "trifasico"
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Resposta de Sucesso</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
                      {`{
  "resultado": "Módulos: 18 x Módulo Fotovoltaico 700 Wp → 12.60 kWp\\n\\nInversores:\\n- 2x Inversor 10 kW (Monofásica) → R$ 20.000,00\\n\\nString Box:\\n- 1x String Box 1000V 32A 3E/3S → R$ 799,90 (Subtotal R$ 799,90)\\n\\nEstrutura:\\n- 5x Kit Estrutura Telhado p/ 4 Mód → R$ 400,00 (Subtotal R$ 2.000,00)\\n\\nCabos Solar:\\n- Cabo Solar Vermelho 6mm: 90 m x R$ 6,00 = R$ 540,00\\n- Cabo Solar Preto 6mm: 90 m x R$ 6,00 = R$ 540,00\\n- Cabo Solar Verde 6mm: 54 m x R$ 6,00 = R$ 324,00\\n\\nConectores MC4:\\n- 72x Conector MC4 → R$ 8,00 = R$ 576,00\\n\\nValor Total do Kit Fotovoltaico: R$ 24.985,90",
  "valorTotal": 24985.9,
  "detalhes": {
    "modulos": {
      "quantidade": 18,
      "potencia": 700,
      "potenciaTotal": 12.6
    },
    "componentes": {
      "inversores": { "quantidade": 2, "preco": 20000.0 },
      "stringBox": { "quantidade": 1, "preco": 799.9 },
      "estrutura": { "quantidade": 5, "preco": 2000.0 },
      "cabos": {
        "vermelho": { "metros": 90, "preco": 540.0 },
        "preto": { "metros": 90, "preco": 540.0 },
        "aterramento": { "metros": 54, "preco": 324.0 }
      },
      "conectoresMC4": { "quantidade": 72, "preco": 576.0 }
    }
  }
}`}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 bg-transparent"
                      onClick={() => copyToClipboard("Resposta completa do cálculo", "calc-response")}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {copiedCode === "calc-response" ? "Copiado!" : "Copiar"}
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Formato da Resposta</h3>
                  <div className="space-y-3 text-gray-600">
                    <p>
                      <strong>resultado:</strong> String formatada com o relatório completo do kit, pronta para exibição
                    </p>
                    <p>
                      <strong>valorTotal:</strong> Valor total do kit em reais (número)
                    </p>
                    <p>
                      <strong>detalhes:</strong> Objeto estruturado com dados técnicos para processamento programático
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Lógica de Cálculo</h3>
                  <div className="space-y-3 text-gray-600">
                    <p>
                      <strong>1. Dimensionamento de Módulos:</strong> Calcula quantidade baseada na potência desejada e
                      potência da placa escolhida (610W ou 700W)
                    </p>
                    <p>
                      <strong>2. Inversor:</strong> Varia conforme tipo (String: 10kW mono/15kW tri, Micro: 700W por
                      módulo)
                    </p>
                    <p>
                      <strong>3. String Box:</strong> String Box 1000V 32A 3E/3S padrão
                    </p>
                    <p>
                      <strong>4. Estrutura:</strong> Varia por tipo - Mini Trilho (6 mód), Telhado (4 mód), Solo (8
                      mód), Carport (10 mód)
                    </p>
                    <p>
                      <strong>5. Cabeamento:</strong> 5m de cabo por módulo (vermelho e preto) + 3m de verde por módulo
                    </p>
                    <p>
                      <strong>6. Conectores MC4:</strong> 4 conectores por módulo (R$ 8,00 cada)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Responses */}
          <TabsContent value="responses">
            <Card>
              <CardHeader>
                <CardTitle>Códigos de Resposta</CardTitle>
                <CardDescription>Padrões de resposta da API</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-green-600">Respostas de Sucesso</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 rounded">
                        <Badge className="mb-2 bg-green-600">200 OK</Badge>
                        <p className="text-sm">Operação realizada com sucesso</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded">
                        <Badge className="mb-2 bg-green-600">201 Created</Badge>
                        <p className="text-sm">Recurso criado com sucesso</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-red-600">Respostas de Erro</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-red-50 rounded">
                        <Badge className="mb-2 bg-red-600">400 Bad Request</Badge>
                        <p className="text-sm">Dados inválidos ou ausentes</p>
                      </div>
                      <div className="p-3 bg-red-50 rounded">
                        <Badge className="mb-2 bg-red-600">404 Not Found</Badge>
                        <p className="text-sm">Recurso não encontrado</p>
                      </div>
                      <div className="p-3 bg-red-50 rounded">
                        <Badge className="mb-2 bg-red-600">500 Internal Server Error</Badge>
                        <p className="text-sm">Erro interno do servidor</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Estrutura de Erro</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm">
                      {`{
  "success": false,
  "error": "Descrição do erro",
  "code": "ERROR_CODE",
  "details": {
    "field": "Campo com problema",
    "message": "Mensagem específica"
  }
}`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Examples */}
          <TabsContent value="examples">
            <Card>
              <CardHeader>
                <CardTitle>Exemplos de Integração</CardTitle>
                <CardDescription>Exemplos práticos de uso da API</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">JavaScript/Fetch</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
                      {`// Calcular kit fotovoltaico
const calcularKit = async () => {
  try {
    const response = await fetch('${baseUrl}/api/calcular-kit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        potenciaPico: 12.6,
        potenciaPlaca: 700,
        tipoInversor: "string",
        tipoEstrutura: "telhado",
        condicaoInversor: "calcular",
        tipoRede: "monofasico"
      })
    });
    
    const data = await response.json();
    
    console.log('Resultado:', data.resultado);
    console.log('Valor Total:', data.valorTotal);
    console.log('Detalhes:', data.detalhes);
    
  } catch (error) {
    console.error('Erro na requisição:', error);
  }
};`}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 bg-transparent"
                      onClick={() => copyToClipboard("Exemplo JavaScript", "js-example")}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {copiedCode === "js-example" ? "Copiado!" : "Copiar"}
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Python/Requests</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
                      {`import requests
import json

# Calcular kit fotovoltaico
def calcular_kit():
    url = '${baseUrl}/api/calcular-kit'
    
    payload = {
        'potenciaPico': 12.6,
        'potenciaPlaca': 700,
        'tipoInversor': 'string',
        'tipoEstrutura': 'telhado',
        'condicaoInversor': 'calcular',
        'tipoRede': 'monofasico'
    }
    
    try:
        response = requests.post(url, json=payload)
        data = response.json()
        
        print('Resultado:', data['resultado'])
        print('Valor Total:', data['valorTotal'])
        print('Detalhes:', data['detalhes'])
            
    except requests.exceptions.RequestException as e:
        print('Erro na requisição:', e)

# Executar
calcular_kit()`}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 bg-transparent"
                      onClick={() => copyToClipboard("Exemplo Python", "python-example")}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {copiedCode === "python-example" ? "Copiado!" : "Copiar"}
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">cURL</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
                      {`# Calcular kit fotovoltaico
curl -X POST ${baseUrl}/api/calcular-kit \\
  -H "Content-Type: application/json" \\
  -d '{
    "potenciaPico": 12.6,
    "potenciaPlaca": 700,
    "tipoInversor": "string",
    "tipoEstrutura": "telhado",
    "condicaoInversor": "calcular",
    "tipoRede": "monofasico"
  }'`}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 bg-transparent"
                      onClick={() => copyToClipboard("Exemplos cURL", "curl-example")}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {copiedCode === "curl-example" ? "Copiado!" : "Copiar"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center mt-12 p-6 bg-white rounded-lg shadow-sm">
          <p className="text-gray-600 mb-2">
            Documentação da API Kit Inversores - Sistema de Cálculo de Kits Fotovoltaicos
          </p>
          <p className="text-sm text-gray-500">API simplificada para cálculo automático de kits fotovoltaicos</p>
        </div>
      </div>
    </div>
  )
}
