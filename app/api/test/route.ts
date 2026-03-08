import { NextResponse } from "next/server"

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(),
  })
}

export async function GET() {
  return NextResponse.json(
    {
      message: "API funcionando perfeitamente!",
      cors: "Habilitado para todas as origens",
      timestamp: new Date().toISOString(),
      endpoints: [
        "GET /api/inversores - Lista todos os inversores",
        "POST /api/inversores - Cria um novo inversor",
        "GET /api/modulos - Lista todos os módulos",
        "POST /api/modulos - Cria um novo módulo",
        "GET /api/estruturas - Lista todas as estruturas",
        "POST /api/estruturas - Cria uma nova estrutura",
        "GET /api/fornecedores - Lista todos os fornecedores",
        "POST /api/fornecedores - Cria um novo fornecedor",
        "GET /api/string-boxes - Lista todas as string boxes",
        "POST /api/string-boxes - Cria uma nova string box",
      ],
    },
    { headers: corsHeaders() },
  )
}
