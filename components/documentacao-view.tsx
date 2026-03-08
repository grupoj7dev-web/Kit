"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Zap, Code, AlertCircle } from "lucide-react"

export function DocumentacaoView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Documentação da API</h1>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="examples">Exemplos</TabsTrigger>
          <TabsTrigger value="errors">Códigos de Erro</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>API de Cálculo de Kits Fotovoltaicos</span>
              </CardTitle>
              <CardDescription>
                API REST para calcular automaticamente os componentes e preços de kits fotovoltaicos baseado em
                parâmetros de entrada como potência, tipo de inversor e estrutura.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Base URL</h3>
                <code className="bg-muted px-3 py-2 rounded text-sm block">https://kitinversores2.vercel.app/api</code>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Autenticação</h3>
                <p className="text-sm text-muted-foreground">Atualmente não requer autenticação</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Formato de Resposta</h3>
                <p className="text-sm text-muted-foreground">
                  Todas as respostas são em formato JSON com encoding UTF-8
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Rate Limiting</h3>
                <p className="text-sm text-muted-foreground">100 requisições por minuto por IP</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Code className="h-5 w-5" />
                <span>POST /api/calcular-kit</span>
              </CardTitle>
              <CardDescription>Calcula os componentes e preço total de um kit fotovoltaico</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">Parâmetros de Entrada (Body JSON)</h4>
                <div className="space-y-3">
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant="outline">potenciaPico</Badge>
                      <Badge variant="secondary">required</Badge>
                      <Badge variant="outline">number</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Potência pico da usina em kW (ex: 5, 10, 15). Deve ser maior que 0.
                    </p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant="outline">potenciaPlaca</Badge>
                      <Badge variant="secondary">required</Badge>
                      <Badge variant="outline">number</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Potência da placa em Watts (ex: 610, 700, 550). Deve corresponder a um módulo cadastrado.
                    </p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant="outline">tipoInversor</Badge>
                      <Badge variant="secondary">required</Badge>
                      <Badge variant="outline">string</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tipo do inversor: <code>"String"</code> ou <code>"Micro Inversor"</code>
                    </p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant="outline">tipoEstrutura</Badge>
                      <Badge variant="secondary">required</Badge>
                      <Badge variant="outline">string</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tipo da estrutura: <code>"Mini Trilho"</code>, <code>"Telhado"</code>, <code>"Solo"</code> ou{" "}
                      <code>"Carport"</code>
                    </p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant="outline">inversorDefinido</Badge>
                      <Badge variant="secondary">optional</Badge>
                      <Badge variant="outline">boolean</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Se o inversor já está pré-definido. Default: <code>false</code>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Exemplo de Requisição</h4>
                <ScrollArea className="h-48 w-full rounded-md border">
                  <pre className="p-4 text-sm">
                    {`POST /api/calcular-kit
Content-Type: application/json

{
  "potenciaPico": 10.5,
  "potenciaPlaca": 610,
  "tipoInversor": "String",
  "tipoEstrutura": "Mini Trilho",
  "inversorDefinido": true
}`}
                  </pre>
                </ScrollArea>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Resposta de Sucesso (200 OK)</h4>
                <ScrollArea className="h-96 w-full rounded-md border">
                  <pre className="p-4 text-sm">
                    {`{
  "success": true,
  "kit": {
    "resumo": {
      "potenciaPico": 10.5,
      "quantidadeModulos": 17,
      "potenciaReal": 10.37,
      "eficiencia": 98.8
    },
    "itens": [
      {
        "item": 1,
        "nome": "Placas Fotovoltaicas",
        "descricao": "Módulo 610W Tier 1 GCL Bifacial",
        "codigo": "GCL-NT12R/66GDF",
        "quantidade": 17,
        "unidade": "pç",
        "precoUnitario": 449.00,
        "precoTotal": 7633.00,
        "categoria": "modulo"
      },
      {
        "item": 2,
        "nome": "Inversor Fotovoltaico",
        "descricao": "Inversor 10kW Monofásico 220V SAJ String AFCI Integrado",
        "codigo": "R6-10K-S3-18",
        "quantidade": 1,
        "unidade": "pç",
        "precoUnitario": 8999.00,
        "precoTotal": 8999.00,
        "categoria": "inversor"
      },
      {
        "item": 3,
        "nome": "Estrutura de Fixação dos Módulos",
        "descricao": "Estrutura Mini Trilho Alumínio Anodizado",
        "codigo": "EST-MT-ALU-001",
        "quantidade": 1,
        "unidade": "kit",
        "precoUnitario": 1200.00,
        "precoTotal": 1200.00,
        "categoria": "estrutura"
      },
      {
        "item": 4,
        "nome": "String Box",
        "descricao": "String Box CC 2 Entradas 32A com Fusíveis",
        "codigo": "SB-CC-2E-32A",
        "quantidade": 1,
        "unidade": "pç",
        "precoUnitario": 350.00,
        "precoTotal": 350.00,
        "categoria": "protecao"
      },
      {
        "item": 5,
        "nome": "Cabo Solar Preto",
        "descricao": "Cabo Solar 4mm² Preto 1kV Dupla Isolação",
        "codigo": "CS-4MM-PT-1KV",
        "quantidade": 85,
        "unidade": "m",
        "precoUnitario": 8.50,
        "precoTotal": 722.50,
        "categoria": "cabo"
      },
      {
        "item": 6,
        "nome": "Cabo Solar Vermelho",
        "descricao": "Cabo Solar 4mm² Vermelho 1kV Dupla Isolação",
        "codigo": "CS-4MM-VM-1KV",
        "quantidade": 85,
        "unidade": "m",
        "precoUnitario": 8.50,
        "precoTotal": 722.50,
        "categoria": "cabo"
      },
      {
        "item": 7,
        "nome": "Cabo Solar Verde",
        "descricao": "Cabo Solar 4mm² Verde Aterramento",
        "codigo": "CS-4MM-VD-ATR",
        "quantidade": 17,
        "unidade": "m",
        "precoUnitario": 8.50,
        "precoTotal": 144.50,
        "categoria": "cabo"
      },
      {
        "item": 8,
        "nome": "Conector MC4",
        "descricao": "Conector MC4 Macho/Fêmea IP67 1000V",
        "codigo": "MC4-MF-IP67-1KV",
        "quantidade": 34,
        "unidade": "par",
        "precoUnitario": 12.00,
        "precoTotal": 408.00,
        "categoria": "conector"
      }
    ],
    "totais": {
      "subtotal": 20179.50,
      "desconto": 0.00,
      "impostos": 0.00,
      "valorTotal": 20179.50,
      "valorTotalFormatado": "R$ 20.179,50"
    },
    "observacoes": [
      "Cálculo baseado em módulos de 610W",
      "Inversor String com AFCI integrado",
      "Estrutura adequada para instalação em Mini Trilho",
      "Cabos dimensionados com 20% de margem de segurança"
    ]
  },
  "timestamp": "2024-12-09T15:30:45.123Z",
  "versaoAPI": "1.0.0"
}`}
                  </pre>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Code className="h-5 w-5" />
                <span>Exemplos Práticos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">1. Exemplo com cURL</h4>
                <ScrollArea className="h-40 w-full rounded-md border">
                  <pre className="p-4 text-sm">
                    {`# Exemplo básico - Kit residencial 10kW
curl -X POST https://kitinversores2.vercel.app/api/calcular-kit \\\\
  -H "Content-Type: application/json" \\\\
  -H "Accept: application/json" \\\\
  -d '{
    "potenciaPico": 10.5,
    "potenciaPlaca": 610,
    "tipoInversor": "String",
    "tipoEstrutura": "Mini Trilho",
    "inversorDefinido": true
  }'

# Exemplo com micro inversor
curl -X POST https://kitinversores2.vercel.app/api/calcular-kit \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "potenciaPico": 5.25,
    "potenciaPlaca": 700,
    "tipoInversor": "Micro Inversor",
    "tipoEstrutura": "Telhado",
    "inversorDefinido": false
  }'`}
                  </pre>
                </ScrollArea>
              </div>

              <div>
                <h4 className="font-semibold mb-3">2. JavaScript/Fetch</h4>
                <ScrollArea className="h-48 w-full rounded-md border">
                  <pre className="p-4 text-sm">
                    {`// Função para calcular kit
async function calcularKit(parametros) {
  try {
    const response = await fetch('https://kitinversores2.vercel.app/api/calcular-kit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(parametros)
    });

    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao calcular kit:', error);
    throw error;
  }
}

// Uso da função
const resultado = await calcularKit({
  potenciaPico: 15.0,
  potenciaPlaca: 610,
  tipoInversor: "String",
  tipoEstrutura: "Solo",
  inversorDefinido: true
});

console.log('Kit calculado:', resultado.kit);
console.log('Valor total:', resultado.kit.totais.valorTotalFormatado);`}
                  </pre>
                </ScrollArea>
              </div>

              <div>
                <h4 className="font-semibold mb-3">3. Python/Requests</h4>
                <ScrollArea className="h-40 w-full rounded-md border">
                  <pre className="p-4 text-sm">
                    {`import requests
import json

def calcular_kit(parametros):
    url = "https://kitinversores2.vercel.app/api/calcular-kit"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    response = requests.post(url, json=parametros, headers=headers)
    response.raise_for_status()
    
    return response.json()

# Exemplo de uso
parametros = {
    "potenciaPico": 20.0,
    "potenciaPlaca": 700,
    "tipoInversor": "String",
    "tipoEstrutura": "Carport",
    "inversorDefinido": False
}

resultado = calcular_kit(parametros)
print(f"Valor total: {resultado['kit']['totais']['valorTotalFormatado']}")
print(f"Quantidade de módulos: {resultado['kit']['resumo']['quantidadeModulos']}")`}
                  </pre>
                </ScrollArea>
              </div>

              <div>
                <h4 className="font-semibold mb-3">4. Node.js/Axios</h4>
                <ScrollArea className="h-36 w-full rounded-md border">
                  <pre className="p-4 text-sm">
                    {`const axios = require('axios');

async function calcularKit(parametros) {
  try {
    const response = await axios.post(
      'https://kitinversores2.vercel.app/api/calcular-kit',
      parametros,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Erro:', error.response?.data || error.message);
    throw error;
  }
}

// Uso
const kit = await calcularKit({
  potenciaPico: 8.5,
  potenciaPlaca: 550,
  tipoInversor: "Micro Inversor",
  tipoEstrutura: "Telhado"
});`}
                  </pre>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5" />
                <span>Códigos de Erro e Tratamento</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Badge variant="destructive">400</Badge>
                    <h4 className="font-semibold">Bad Request</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Parâmetros obrigatórios ausentes, inválidos ou fora do range permitido.
                  </p>
                  <ScrollArea className="h-32 w-full rounded-md border">
                    <pre className="p-3 text-sm">
                      {`{
  "success": false,
  "error": "Parâmetros inválidos",
  "details": {
    "potenciaPico": "Deve ser maior que 0",
    "tipoInversor": "Deve ser 'String' ou 'Micro Inversor'"
  },
  "code": "INVALID_PARAMETERS"
}`}
                    </pre>
                  </ScrollArea>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Badge variant="destructive">404</Badge>
                    <h4 className="font-semibold">Not Found</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Módulo, inversor ou estrutura não encontrados no banco de dados.
                  </p>
                  <ScrollArea className="h-28 w-full rounded-md border">
                    <pre className="p-3 text-sm">
                      {`{
  "success": false,
  "error": "Produto não encontrado",
  "details": "Nenhum módulo encontrado com potência 610W",
  "code": "PRODUCT_NOT_FOUND"
}`}
                    </pre>
                  </ScrollArea>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Badge variant="destructive">422</Badge>
                    <h4 className="font-semibold">Unprocessable Entity</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Combinação de parâmetros inválida ou incompatível.
                  </p>
                  <ScrollArea className="h-28 w-full rounded-md border">
                    <pre className="p-3 text-sm">
                      {`{
  "success": false,
  "error": "Combinação inválida",
  "details": "Micro Inversor não compatível com estrutura Solo",
  "code": "INCOMPATIBLE_COMBINATION"
}`}
                    </pre>
                  </ScrollArea>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Badge variant="destructive">500</Badge>
                    <h4 className="font-semibold">Internal Server Error</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Erro interno do servidor ou problema de conexão com banco de dados.
                  </p>
                  <ScrollArea className="h-24 w-full rounded-md border">
                    <pre className="p-3 text-sm">
                      {`{
  "success": false,
  "error": "Erro interno do servidor",
  "details": "Falha na conexão com banco de dados",
  "code": "INTERNAL_ERROR"
}`}
                    </pre>
                  </ScrollArea>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Badge variant="destructive">429</Badge>
                    <h4 className="font-semibold">Too Many Requests</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">Limite de requisições excedido (100 por minuto).</p>
                  <ScrollArea className="h-28 w-full rounded-md border">
                    <pre className="p-3 text-sm">
                      {`{
  "success": false,
  "error": "Limite de requisições excedido",
  "details": "Máximo 100 requisições por minuto",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}`}
                    </pre>
                  </ScrollArea>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Tratamento de Erros Recomendado</h4>
                <ScrollArea className="h-48 w-full rounded-md border">
                  <pre className="p-4 text-sm">
                    {`// JavaScript - Tratamento completo de erros
async function calcularKitComTratamento(parametros) {
  try {
    const response = await fetch('https://kitinversores2.vercel.app/api/calcular-kit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parametros)
    });

    const data = await response.json();

    if (!response.ok) {
      switch (response.status) {
        case 400:
          throw new Error(\`Parâmetros inválidos: \${data.details}\`);
        case 404:
          throw new Error(\`Produto não encontrado: \${data.details}\`);
        case 422:
          throw new Error(\`Combinação inválida: \${data.details}\`);
        case 429:
          throw new Error(\`Muitas requisições. Tente novamente em \${data.retryAfter}s\`);
        case 500:
          throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
        default:
          throw new Error(\`Erro \${response.status}: \${data.error}\`);
      }
    }

    return data;
  } catch (error) {
    console.error('Erro ao calcular kit:', error.message);
    throw error;
  }
}`}
                  </pre>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
