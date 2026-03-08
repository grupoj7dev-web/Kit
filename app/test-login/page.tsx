"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function LoginTest() {
  const [email, setEmail] = useState("jheferson@gmail.com")
  const [password, setPassword] = useState("Info@123")
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)

  const testLogin = async () => {
    setLoading(true)
    setResult("Iniciando teste de login...")
    
    try {
      console.log("🔐 TESTE DE LOGIN DIRETO")
      console.log("📧 Email:", email)
      console.log("🔑 Password:", password)
      
      setResult(prev => prev + "\n🔗 Criando cliente Supabase...")
      const supabase = createClient()
      
      setResult(prev => prev + "\n⏳ Fazendo login...")
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error("❌ Erro:", error)
        setResult(prev => prev + `\n❌ ERRO: ${error.message}`)
        return
      }
      
      if (data.user) {
        console.log("✅ Sucesso:", data.user)
        setResult(prev => prev + `\n✅ LOGIN REALIZADO COM SUCESSO!`)
        setResult(prev => prev + `\n👤 Usuário: ${data.user.email}`)
        setResult(prev => prev + `\n🆔 ID: ${data.user.id}`)
        setResult(prev => prev + `\n📧 Email confirmado: ${data.user.email_confirmed_at ? 'Sim' : 'Não'}`)
        
        // Testar se consegue acessar dados do usuário
        setResult(prev => prev + `\n\n🔍 Verificando sessão atual...`)
        const { data: sessionData } = await supabase.auth.getSession()
        
        if (sessionData.session) {
          setResult(prev => prev + `\n✅ Sessão ativa encontrada!`)
          setResult(prev => prev + `\n🕒 Expira em: ${sessionData.session.expires_at}`)
        } else {
          setResult(prev => prev + `\n⚠️ Nenhuma sessão ativa encontrada`)
        }
        
      } else {
        setResult(prev => prev + "\n⚠️ Login sem erro, mas sem usuário retornado")
      }
      
    } catch (error: any) {
      console.error("💥 Erro inesperado:", error)
      setResult(prev => prev + `\n💥 ERRO INESPERADO: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testEnvironment = () => {
    setResult("🌍 TESTE DE AMBIENTE:")
    setResult(prev => prev + `\nURL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
    setResult(prev => prev + `\nKEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}...`)
    setResult(prev => prev + `\nNode ENV: ${process.env.NODE_ENV}`)
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🧪 Teste de Login Supabase</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>Email:</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
          />
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label>Senha:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
          />
        </div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testLogin} 
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: loading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳ Testando...' : '🔐 Testar Login'}
        </button>
        
        <button 
          onClick={testEnvironment}
          style={{ 
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🌍 Testar Ambiente
        </button>
      </div>
      
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '15px', 
        borderRadius: '5px',
        whiteSpace: 'pre-wrap',
        fontFamily: 'monospace',
        fontSize: '12px',
        maxHeight: '400px',
        overflow: 'auto'
      }}>
        {result || "Clique em 'Testar Login' para iniciar o teste"}
      </div>
    </div>
  )
}