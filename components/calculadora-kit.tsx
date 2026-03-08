"use client"
import { useState, useEffect } from "react"


const tiposInversor = ["String", "Micro Inversor"]
const tiposEstrutura = ["Telhado", "Solo"]
const redes = ["Monofásica", "Trifásica"]

export default function CalculadoraKit() {
  // Estados dos campos de entrada
  const [potenciaPico, setPotenciaPico] = useState(12.9)
  const [placas, setPlacas] = useState<any[]>([])
  const [placa, setPlaca] = useState<any>(null)
  const [inversores, setInversores] = useState<any[]>([])
  const [stringBoxes, setStringBoxes] = useState<any[]>([])
  const [estruturas, setEstruturas] = useState<any[]>([])
  const [cabos, setCabos] = useState<any[]>([])
  const [tipoInversor, setTipoInversor] = useState(tiposInversor[0])
  const [tipoEstrutura, setTipoEstrutura] = useState(tiposEstrutura[0])
  const [rede, setRede] = useState(redes[0])
  const [resultado, setResultado] = useState<string>("")
  const [loading, setLoading] = useState(true)
  // Novos campos de transformador
  const [transformador, setTransformador] = useState<string>("Não")
  const [potenciaTrafo, setPotenciaTrafo] = useState<number>(15)
  // modo: 'calcular' (auto) | 'usuario-define' (o usuário escolhe id do inversor)
  const [modoInversor, setModoInversor] = useState<'calcular' | 'usuario-define'>('calcular')
  const [inversorEscolhido, setInversorEscolhido] = useState<string | null>(null)

  // Buscar todos os materiais do banco ao carregar
  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      try {
        const [modulosRes, inversoresRes, stringBoxesRes, estruturasRes, cabosRes] = await Promise.all([
          fetch("/api/modulos").then(r => r.json()),
          fetch("/api/inversores").then(r => r.json()),
          fetch("/api/string-boxes").then(r => r.json()),
          fetch("/api/estruturas").then(r => r.json()),
          fetch("/api/cabos").then(r => r.json()),
        ])

        // Modulos
        const modulos = modulosRes.data || modulosRes
        setPlacas(modulos)
        setPlaca(modulos[0] || null)
        // Inversores
        const invs = inversoresRes.data || inversoresRes
        setInversores(invs)
        setInversorEscolhido(invs && invs[0] ? invs[0].id : null)
        // String Boxes
        setStringBoxes(stringBoxesRes.data || stringBoxesRes)
        // Estruturas
        setEstruturas(estruturasRes.data || estruturasRes)
        // Cabos
        setCabos(cabosRes)
      } catch (err) {
        console.error('Erro ao buscar catálogos na calculadora:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  // helpers de mapeamento para a API
  const mapTipoInversorToApi = (v: string) => (v.toLowerCase().includes('micro') ? 'micro' : 'string')
  const mapTipoRedeToApi = (v: string) => (v.toLowerCase().includes('tri') ? 'trifasico' : 'monofasico')
  const mapTipoEstruturaToApi = (v: string) => (v.toLowerCase().includes('telha') || v.toLowerCase().includes('telhado') ? 'telhado' : 'solo')

  // Função principal de cálculo (usando o endpoint de servidor para consistência)
  async function calcular() {
    if (!placa) return
    setResultado('')
    setLoading(true)
    try {
      const potenciaPlaca = placa.potencia || placa.potencia_w || placa.potenciaWp || placa.potenciaWp || placa.potencia_w || placa.potencia

      const payload: any = {
        potenciaPico: Number(potenciaPico),
        potenciaPlaca: Number(potenciaPlaca),
        tipoInversor: mapTipoInversorToApi(tipoInversor),
        tipoEstrutura: mapTipoEstruturaToApi(tipoEstrutura),
        tipoRede: mapTipoRedeToApi(rede),
        condicaoInversor: modoInversor === 'usuario-define' ? 'usuario-define' : 'calcular'
      }

      if (modoInversor === 'usuario-define' && inversorEscolhido) {
        payload.idInversor = inversorEscolhido
      }

      const resp = await fetch('/api/calcular-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await resp.json()
      if (!resp.ok) {
        // Mensagem de erro do servidor
        const errMsg = data?.error || 'Erro desconhecido ao calcular'
        setResultado(`Erro: ${errMsg}${data?.suggestion ? '\n' + data.suggestion : ''}`)
        return
      }

      // Preferir usar o texto formatado vindo do servidor quando disponível
      if (data.resultado) {
        setResultado(data.resultado)
      } else {
        setResultado(JSON.stringify(data, null, 2))
      }
    } catch (err: any) {
      console.error('Erro ao chamar /api/calcular-kit:', err)
      setResultado('Erro interno ao calcular (ver console)')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Calculadora de Kit Fotovoltaico</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Potência Pico (kWp)</label>
          <input type="number" value={potenciaPico} onChange={e => setPotenciaPico(Number(e.target.value))} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium">Placa</label>
          <select value={placa?.id || ""} onChange={e => setPlaca(placas.find(p => p.id === e.target.value) || placas[0])} className="input">
            {placas.map(p => <option key={p.id} value={p.id}>{p.nome || p.modelo || `${p.potencia || p.potencia_w} W`}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Modo do Inversor</label>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2">
              <input type="radio" name="modoInversor" checked={modoInversor === 'calcular'} onChange={() => setModoInversor('calcular')} />
              Calcular automaticamente
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="modoInversor" checked={modoInversor === 'usuario-define'} onChange={() => setModoInversor('usuario-define')} />
              Definir inversor manualmente
            </label>
          </div>
        </div>

        {modoInversor === 'usuario-define' && (
          <div>
            <label className="block text-sm font-medium">Escolha o Inversor</label>
            <select value={inversorEscolhido || ""} onChange={e => setInversorEscolhido(e.target.value)} className="input">
              {inversores.map((inv: any) => <option key={inv.id} value={inv.id}>{inv.marca ? `${inv.marca} ${inv.modelo} (${inv.potencia_kw} kW)` : inv.modelo || inv.id}</option>)}
            </select>
            {inversorEscolhido && (
              <div className="text-xs text-neutral-600 mt-2">
                Inversor selecionado: {inversores.find(i => i.id === inversorEscolhido)?.marca || ''} {inversores.find(i => i.id === inversorEscolhido)?.modelo || ''}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium">Tipo de Inversor</label>
          <select value={tipoInversor} onChange={e => setTipoInversor(e.target.value)} className="input">
            {tiposInversor.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Tipo de Estrutura</label>
          <select value={tipoEstrutura} onChange={e => setTipoEstrutura(e.target.value)} className="input">
            {tiposEstrutura.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Rede do Cliente</label>
          <select value={rede} onChange={e => setRede(e.target.value)} className="input">
            {redes.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Transformador</label>
          <select value={transformador} onChange={e => setTransformador(e.target.value)} className="input">
            <option value="Não">Não</option>
            <option value="Sim">Sim</option>
          </select>
        </div>

        {transformador === "Sim" && (
          <div>
            <label className="block text-sm font-medium">Potência do Transformador (kW)</label>
            <input 
              type="number" 
              value={potenciaTrafo} 
              onChange={e => setPotenciaTrafo(Number(e.target.value))} 
              className="input"
              min="1"
              step="0.1"
            />
          </div>
        )}
        <button onClick={calcular} className="mt-4 w-full bg-black text-white py-2 rounded-xl font-bold" disabled={loading || !placa}>Calcular</button>
      </div>
      {resultado && (
        <div className="mt-8 p-4 rounded-xl bg-neutral-50 border text-sm whitespace-pre-line">
          <strong>Resumo Técnico:</strong>
          <br />
          {resultado}
        </div>
      )}
    </div>
  )
}
