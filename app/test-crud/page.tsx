"use client"

import { useState } from "react"

export default function TestCRUD() {
  const [results, setResults] = useState("")
  const [loading, setLoading] = useState(false)
  const [createdItems, setCreatedItems] = useState({})

  const log = (message: string) => {
    setResults(prev => prev + message + "\n")
    console.log(message)
  }

  const testAPI = async (method: string, endpoint: string, data: any = null, description: string) => {
    try {
      log(`⏳ ${description}...`)
      
      const config: any = {
        method,
        headers: { 'Content-Type': 'application/json' }
      }
      
      if (data) {
        config.body = JSON.stringify(data)
      }
      
      const response = await fetch(endpoint, config)
      const result = await response.json()
      
      if (response.ok) {
        log(`✅ ${description} - Status: ${response.status}`)
        if (Array.isArray(result)) {
          log(`   📦 Retornou ${result.length} itens`)
        } else if (result.id) {
          log(`   🆔 ID: ${result.id}`)
        }
        return result
      } else {
        log(`❌ ${description} - Status: ${response.status}`)
        log(`   ⚠️ Erro: ${JSON.stringify(result)}`)
        return null
      }
    } catch (error: any) {
      log(`❌ ${description} - Erro: ${error.message}`)
      return null
    }
  }

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const runAllTests = async () => {
    setLoading(true)
    setResults("")
    setCreatedItems({})
    
    log("🧪 INICIANDO TESTES COMPLETOS DE CRUD\n")
    
    // 1. TESTES GET
    log("📚 1. TESTANDO OPERAÇÕES READ (GET):\n")
    
    await testAPI('GET', '/api/fornecedores', null, 'GET Fornecedores')
    await sleep(300)
    
    await testAPI('GET', '/api/modulos', null, 'GET Módulos')
    await sleep(300)
    
    await testAPI('GET', '/api/inversores', null, 'GET Inversores')
    await sleep(300)
    
    await testAPI('GET', '/api/estruturas', null, 'GET Estruturas')
    await sleep(300)
    
    await testAPI('GET', '/api/string-boxes', null, 'GET String Boxes')
    await sleep(300)
    
    await testAPI('GET', '/api/cabos', null, 'GET Cabos')
    await sleep(300)
    
    await testAPI('GET', '/api/concessionarias', null, 'GET Concessionárias')
    await sleep(500)
    
    // 2. TESTES POST
    log("\n📝 2. TESTANDO OPERAÇÕES CREATE (POST):\n")
    
    // Criar fornecedor
    const fornecedor = await testAPI('POST', '/api/fornecedores', {
      nome: 'Fornecedor Teste CRUD',
      contato: 'teste@crud.com',
      telefone: '11999887766',
      ativo: true
    }, 'CREATE Fornecedor')
    
    if (fornecedor?.id) {
      setCreatedItems(prev => ({ ...prev, fornecedor: fornecedor.id }))
    }
    await sleep(300)
    
    // Criar módulo
    const modulo = await testAPI('POST', '/api/modulos', {
      fornecedor_id: fornecedor?.id || '1',
      marca: 'SolarTech Teste',
      modelo: 'ST-500W-CRUD',
      potencia_w: 500,
      preco_kit: 380.00,
      preco_avulso: 480.00,
      garantia_fabricacao: 12,
      garantia_potencia: 25
    }, 'CREATE Módulo')
    
    if (modulo?.id) {
      setCreatedItems(prev => ({ ...prev, modulo: modulo.id }))
    }
    await sleep(300)
    
    // Criar inversor
    const inversor = await testAPI('POST', '/api/inversores', {
      fornecedor_id: fornecedor?.id || '1',
      tipo: 'String',
      fases: 'Trifásico',
      tensao: '380V',
      marca: 'InverterTech Teste',
      modelo: 'IT-10kW-CRUD',
      potencia_kw: 10.0,
      preco_kit: 8500.00,
      preco_avulso: 10500.00,
      garantia: 10
    }, 'CREATE Inversor')
    
    if (inversor?.id) {
      setCreatedItems(prev => ({ ...prev, inversor: inversor.id }))
    }
    await sleep(500)
    
    // 3. TESTES PUT
    log("\n✏️ 3. TESTANDO OPERAÇÕES UPDATE (PUT):\n")
    
    if (fornecedor?.id) {
      await testAPI('PUT', `/api/fornecedores/${fornecedor.id}`, {
        nome: 'Fornecedor Teste CRUD - EDITADO',
        contato: 'editado@crud.com',
        telefone: '11999887799',
        ativo: true
      }, 'UPDATE Fornecedor')
      await sleep(300)
    }
    
    if (modulo?.id) {
      await testAPI('PUT', `/api/modulos/${modulo.id}`, {
        fornecedor_id: fornecedor?.id || '1',
        marca: 'SolarTech Teste',
        modelo: 'ST-500W-CRUD-EDITADO',
        potencia_w: 550,
        preco_kit: 420.00,
        preco_avulso: 520.00,
        garantia_fabricacao: 12,
        garantia_potencia: 25
      }, 'UPDATE Módulo')
      await sleep(300)
    }
    
    await sleep(500)
    
    // 4. TESTES DELETE
    log("\n🗑️ 4. TESTANDO OPERAÇÕES DELETE:\n")
    
    if (inversor?.id) {
      await testAPI('DELETE', `/api/inversores/${inversor.id}`, null, 'DELETE Inversor')
      await sleep(300)
    }
    
    if (modulo?.id) {
      await testAPI('DELETE', `/api/modulos/${modulo.id}`, null, 'DELETE Módulo')
      await sleep(300)
    }
    
    if (fornecedor?.id) {
      await testAPI('DELETE', `/api/fornecedores/${fornecedor.id}`, null, 'DELETE Fornecedor')
      await sleep(300)
    }
    
    log("\n🏁 TESTES DE CRUD CONCLUÍDOS!")
    setLoading(false)
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🧪 Teste Completo de CRUD - Todas as Entidades</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runAllTests} 
          disabled={loading}
          style={{ 
            padding: '15px 30px', 
            fontSize: '16px',
            backgroundColor: loading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳ Executando Testes...' : '🚀 Executar Todos os Testes CRUD'}
        </button>
      </div>
      
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '15px', 
        borderRadius: '5px',
        whiteSpace: 'pre-wrap',
        fontFamily: 'monospace',
        fontSize: '12px',
        maxHeight: '600px',
        overflow: 'auto',
        border: '1px solid #ddd'
      }}>
        {results || "Clique no botão acima para executar todos os testes de CRUD"}
      </div>
      
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        <p>Este teste irá:</p>
        <ul>
          <li>✅ Testar GET em todas as entidades</li>
          <li>📝 Criar registros (POST) em fornecedores, módulos, inversores</li>
          <li>✏️ Editar registros (PUT)</li>
          <li>🗑️ Excluir registros (DELETE)</li>
        </ul>
      </div>
    </div>
  )
}