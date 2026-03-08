"use client"

import { useState, useEffect } from "react"

interface Concessionaria {
  id: string
  nome: string
  estado?: string
  uf?: string
  potencia_max_monofasica_kw?: number
  potencia_max_trifasica_kw?: number
  created_at: string
}

// -----------------------------------------------------------------------------
// CADASTRO DE CONCESSIONÁRIA — Tela de Sistema
// - Campos: Nome da Concessionária, Estado de Atuação (UF)
// - Aba "Tabela Grupo B - Ramal de Conexão" com tabela EDITÁVEL baseada na planilha
// - Permite adicionar/remover linhas e salvar (callback fake)
// - Design simples usando TailwindCSS (sem dependências externas)
// -----------------------------------------------------------------------------

// Lista de UFs do Brasil
const UFs = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
]

// Colunas da tabela conforme sua planilha
const COLS = [
  { key: "tipoFornecimento", label: "Tipo de Fornecimento" },
  { key: "faixaCarga", label: "Faixa de Carga (kW)" },
  { key: "disjuntor", label: "Disjuntor Termomagnético (A)" },
  { key: "tipoDisjuntor", label: "Tipo de Disjuntor (A)" },
  { key: "cobreConc", label: "Ramal — Cobre Concêntrico (mm²)" },
  { key: "cobreMultiplex", label: "Ramal — Cobre Multiplexado (mm²)" },
  { key: "aluMultiplex1", label: "Ramal — Alumínio Multiplexado (mm²)" },
  { key: "aluMultiplex2", label: "Ramal — Alumínio Multiplexado (mm²)" },
  { key: "eletrodutoAco", label: "Ø Eletroduto Aço Galv. (pol.)" },
  { key: "condEntrada", label: "Cond. Entrada Fase/Neutro (mm²)" },
  { key: "condAterr", label: "Condutor de Aterramento (mm²)" },
  { key: "eletrodutoAterr", label: "Ø Eletroduto Aterramento (pol.)" },
] as const

type Row = {
  [K in (typeof COLS)[number]["key"]]: string | number | "" | null
}

const initialRows: Row[] = [
  {
    tipoFornecimento: "Monofásico",
    faixaCarga: "Até 5",
    disjuntor: 25,
    tipoDisjuntor: "Monofásico",
    cobreConc: 4,
    cobreMultiplex: 6,
    aluMultiplex1: 10,
    aluMultiplex2: "",
    eletrodutoAco: "3/4",
    condEntrada: 4,
    condAterr: 4,
    eletrodutoAterr: "1/2",
  },
  {
    tipoFornecimento: "Monofásico",
    faixaCarga: "De 5,1 a 8",
    disjuntor: 40,
    tipoDisjuntor: "Monofásico",
    cobreConc: 6,
    cobreMultiplex: 6,
    aluMultiplex1: 10,
    aluMultiplex2: "",
    eletrodutoAco: "3/4",
    condEntrada: 6,
    condAterr: 6,
    eletrodutoAterr: "1/2",
  },
  {
    tipoFornecimento: "Monofásico",
    faixaCarga: "De 8,1 a 12",
    disjuntor: 63,
    tipoDisjuntor: "Monofásico",
    cobreConc: 10,
    cobreMultiplex: 10,
    aluMultiplex1: 10,
    aluMultiplex2: "",
    eletrodutoAco: "3/4",
    condEntrada: 10,
    condAterr: 6,
    eletrodutoAterr: "1/2",
  },
  {
    tipoFornecimento: "Trifásico",
    faixaCarga: "De 12,1 a 24",
    disjuntor: 40,
    tipoDisjuntor: "Trifásico",
    cobreConc: "",
    cobreMultiplex: 6,
    aluMultiplex1: "",
    aluMultiplex2: 10,
    eletrodutoAco: "1 1/2",
    condEntrada: 6,
    condAterr: 6,
    eletrodutoAterr: "1/2",
  },
  {
    tipoFornecimento: "Trifásico",
    faixaCarga: "De 24,1 a 38",
    disjuntor: 63,
    tipoDisjuntor: "Trifásico",
    cobreConc: "",
    cobreMultiplex: 16,
    aluMultiplex1: "",
    aluMultiplex2: 25,
    eletrodutoAco: "1 1/2",
    condEntrada: 10,
    condAterr: 10,
    eletrodutoAterr: "1",
  },
  {
    tipoFornecimento: "Trifásico",
    faixaCarga: "De 38,1 a 48",
    disjuntor: 80,
    tipoDisjuntor: "Trifásico",
    cobreConc: "",
    cobreMultiplex: 25,
    aluMultiplex1: "",
    aluMultiplex2: 35,
    eletrodutoAco: "2",
    condEntrada: 16,
    condAterr: 16,
    eletrodutoAterr: "1",
  },
  {
    tipoFornecimento: "Trifásico",
    faixaCarga: "De 48,1 a 60",
    disjuntor: 100,
    tipoDisjuntor: "Trifásico",
    cobreConc: "",
    cobreMultiplex: 25,
    aluMultiplex1: "",
    aluMultiplex2: 50,
    eletrodutoAco: "2",
    condEntrada: 25,
    condAterr: 25,
    eletrodutoAterr: "1",
  },
  {
    tipoFornecimento: "Trifásico",
    faixaCarga: "De 60,1 a 75",
    disjuntor: 125,
    tipoDisjuntor: "Trifásico",
    cobreConc: "",
    cobreMultiplex: 35,
    aluMultiplex1: "",
    aluMultiplex2: 70,
    eletrodutoAco: "1 1/2",
    condEntrada: 35,
    condAterr: 35,
    eletrodutoAterr: "1",
  },
]

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string
  value: string
  placeholder?: string
  required?: boolean
  onChange: (v: string) => void
}) {
  return (
    <label className="block w-full">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </span>
      <input
        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm outline-none focus:ring-2 focus:ring-sky-500"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function SelectUF({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block w-full">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm outline-none focus:ring-2 focus:ring-sky-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Selecione o(s) estado(s) de atuação</option>
        {UFs.map((uf) => (
          <option key={uf} value={uf}>
            {uf}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-slate-500">Dica: use vírgulas para múltiplos estados, ex.: GO, DF, MT.</p>
    </label>
  )
}

function Tabs({
  active,
  onChange,
  tabs,
}: { active: string; onChange: (k: string) => void; tabs: { key: string; label: string }[] }) {
  return (
    <div className="border-b border-slate-200">
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 rounded-t-xl transition-colors ${active === t.key ? "bg-white border-x border-t border-slate-200 text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
            onClick={() => onChange(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function EditableTable({ rows, setRows }: { rows: Row[]; setRows: (r: Row[]) => void }) {
  const addRow = () => {
    const empty: Row = Object.fromEntries(COLS.map((c) => [c.key, ""])) as Row
    setRows([...rows, empty])
  }
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx))

  return (
    <div className="mt-4 overflow-auto rounded-2xl border border-slate-200">
      <table className="min-w-[1200px] w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            {COLS.map((col) => (
              <th key={col.key} className="whitespace-pre-wrap px-3 py-2 text-left font-semibold text-slate-700">
                {col.label}
              </th>
            ))}
            <th className="px-3 py-2 text-left font-semibold text-slate-700">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 ? "bg-white" : "bg-slate-50/40"}>
              {COLS.map((col) => (
                <td key={col.key} className="px-3 py-1">
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 outline-none focus:ring-2 focus:ring-sky-500"
                    value={(row[col.key] ?? "") as string}
                    onChange={(e) => {
                      const next = [...rows]
                      next[ri] = { ...row, [col.key]: e.target.value }
                      setRows(next)
                    }} />
                </td>
              ))}
              <td className="px-3 py-1">
                <button
                  onClick={() => removeRow(ri)}
                  className="rounded-lg bg-rose-50 px-3 py-1 text-rose-700 hover:bg-rose-100"
                >
                  Remover
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white p-3">
        <button onClick={addRow} className="rounded-xl bg-sky-600 px-4 py-2 text-white shadow hover:bg-sky-700">
          Adicionar Linha
        </button>
        <span className="text-xs text-slate-500">Linhas: {rows.length}</span>
      </div>
    </div>
  )
}

export function ConcessionariasCadastro() {
  const [activeTab, setActiveTab] = useState("dados")
  const [nome, setNome] = useState("")
  const [uf, setUF] = useState("")
  const [potenciaMaxMonofasica, setPotenciaMaxMonofasica] = useState<number>(12)
  const [potenciaMaxTrifasica, setPotenciaMaxTrifasica] = useState<number>(75)
  const [rows, setRows] = useState<Row[]>(initialRows)
  const [concessionarias, setConcessionarias] = useState<Concessionaria[]>([])
  const [loading, setLoading] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(true)

  useEffect(() => {
    carregarConcessionarias()
  }, [])

  const carregarConcessionarias = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/concessionarias")
      if (response.ok) {
        const data = await response.json()
        setConcessionarias(data)
      }
    } catch (error) {
      console.error("Error fetching concessionarias:", error)
    } finally {
      setLoading(false)
    }
  }

  const editarConcessionaria = (concessionaria: Concessionaria) => {
  setNome(concessionaria.nome)
  setUF(concessionaria.uf || concessionaria.estado || "")
  setPotenciaMaxMonofasica(concessionaria.potencia_max_monofasica_kw ?? 12)
  setPotenciaMaxTrifasica(concessionaria.potencia_max_trifasica_kw ?? 75)
  setEditando(concessionaria.id)
  setMostrarFormulario(true)
  }

  const cancelarEdicao = () => {
    setNome("")
    setUF("")
    setPotenciaMaxMonofasica(12)
    setPotenciaMaxTrifasica(75)
    setEditando(null)
    setMostrarFormulario(false)
  }

  const excluirConcessionaria = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta concessionária?')) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/concessionarias/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        alert("Concessionária excluída com sucesso!")
        carregarConcessionarias()
      } else {
        alert("Erro ao excluir concessionária")
      }
    } catch (error) {
      console.error("Error deleting concessionaria:", error)
      alert("Erro ao excluir concessionária")
    } finally {
      setLoading(false)
    }
  }

  const handleSalvar = async () => {
    if (!nome || !uf) {
      alert("Nome e UF são obrigatórios")
      return
    }

    try {
      setLoading(true)
      const url = editando ? `/api/concessionarias/${editando}` : "/api/concessionarias"
      const method = editando ? "PUT" : "POST"

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          nome, 
          uf, 
          tabela_grupo_b: rows, 
          potencia_max_monofasica_kw: potenciaMaxMonofasica,
          potencia_max_trifasica_kw: potenciaMaxTrifasica
        }),
      })

      const text = await response.text()
      let json = null
      try { json = JSON.parse(text) } catch (e) { json = text }
      console.log('[CONCESSIONARIAS] response status', response.status, json)
      if (!response.ok) {
        const errMsg = (json && json.error) ? json.error : 'Failed to save concessionaria'
        throw new Error(errMsg)
      }

      alert(editando ? "Concessionária atualizada com sucesso!" : "Concessionária salva com sucesso!")

      // Reset form
      setNome("")
      setUF("")
      setPotenciaMaxMonofasica(12)
      setPotenciaMaxTrifasica(75)
      setRows(initialRows)
      setEditando(null)
      setMostrarFormulario(false)

      // Recarregar lista
      carregarConcessionarias()
    } catch (error) {
      console.error("Error saving concessionaria:", error)
      alert("Erro ao salvar concessionária")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cadastro de Concessionária</h1>
          <p className="text-sm text-slate-600">
            Registre os metadados da concessionária e a tabela de referência do Grupo B (Ramal de Conexão) com edição
            direta nas células.
          </p>
        </div>
        <div className="flex gap-2">
          {!mostrarFormulario ? (
            <button
              onClick={() => { setMostrarFormulario(true); setEditando(null) }}
              className="rounded-xl bg-sky-600 px-4 py-2 text-white shadow hover:bg-sky-700"
            >
              Nova Concessionária
            </button>
          ) : (
            <>
              <button
                onClick={handleSalvar}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-white shadow hover:bg-emerald-700"
              >
                Salvar
              </button>
              <button
                onClick={cancelarEdicao}
                className="rounded-xl bg-gray-600 px-4 py-2 text-white shadow hover:bg-gray-700"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </header>
      {mostrarFormulario && (
        <>
          <Tabs
            active={activeTab}
            onChange={setActiveTab}
            tabs={[
              { key: "dados", label: "Dados da Concessionária" },
              { key: "grupoB", label: "Tabela Grupo B - Ramal de Conexão" },
            ]}
          />

          {activeTab === "dados" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TextField
                  label="Nome da Concessionária"
                  value={nome}
                  onChange={setNome}
                  required
                />
                <SelectUF label="Estado de Atuação" value={uf} onChange={setUF} />
              </div>
              
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block w-full">
                    <span className="text-sm font-medium text-slate-700">
                      Potência Máxima Monofásica (kW)
                    </span>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm outline-none focus:ring-2 focus:ring-sky-500"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={potenciaMaxMonofasica}
                      onChange={(e) => setPotenciaMaxMonofasica(Number(e.target.value) || 12)}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Limite máximo de potência para sistemas monofásicos (padrão: 12kW)
                    </p>
                  </label>
                </div>
                
                <div>
                  <label className="block w-full">
                    <span className="text-sm font-medium text-slate-700">
                      Potência Máxima Trifásica (kW)
                    </span>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm outline-none focus:ring-2 focus:ring-sky-500"
                      type="number"
                      step="0.1"
                      min="0"
                      max="500"
                      value={potenciaMaxTrifasica}
                      onChange={(e) => setPotenciaMaxTrifasica(Number(e.target.value) || 75)}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Limite máximo de potência para sistemas trifásicos (padrão: 75kW)
                    </p>
                  </label>
                </div>
              </div>
            </section>
          )}

          {activeTab === "grupoB" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-lg font-semibold text-slate-900">Tabela Grupo B — Ramal de Conexão</h2>
              <p className="mb-4 text-sm text-slate-600">
                Edite os campos conforme necessidade. Utilize o botão "Adicionar Linha" para expandir a tabela.
              </p>
              <EditableTable rows={rows} setRows={setRows} />
            </section>
          )}
        </>
      )}

      {/* Seção de Concessionárias Cadastradas */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Concessionárias Cadastradas ({concessionarias.length})
        </h2>
        {loading ? (
          <div className="py-8 text-center text-slate-500">
            Carregando concessionárias...
          </div>
        ) : concessionarias.length === 0 ? (
          <div className="py-8 text-center text-slate-500">
            Nenhuma concessionária cadastrada ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {concessionarias.map((concessionaria) => (
              <div key={concessionaria.id} className="rounded-lg border p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{concessionaria.nome}</h3>
                    <div className="mt-1 text-sm text-gray-600">
                      <span>Estado: {concessionaria.uf || concessionaria.estado}</span>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-xs text-gray-400">
                        {new Date(concessionaria.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => editarConcessionaria(concessionaria)}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => excluirConcessionaria(concessionaria.id)}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
