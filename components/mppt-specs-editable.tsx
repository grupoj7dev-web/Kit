"use client"

import { useMemo, useState, useEffect } from "react"

// ===== Util =====
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

// ===== Modelo dos parâmetros por String =====
const DEFAULT_PARAMS = [
  { key: "v_min", label: "Faixa Tensão Operacional Mínima MPPT", unit: "Vdc", value: 90 },
  { key: "v_max", label: "Faixa Tensão Operacional Máxima MPPT", unit: "Vdc", value: 500 },
  { key: "v_start", label: "Tensão Partida", unit: "Vdc", value: 100 },
  { key: "v_nom", label: "Tensão Nominal", unit: "Vdc", value: 360 },
  { key: "v_in_max", label: "Tensão Máxima de Entrada", unit: "Vdc", value: 600 },
  { key: "i_max", label: "Corrente máx. por Entrada", unit: "A", value: 15 },
  { key: "i_sc", label: "Corrente de curto-circuito MPPT", unit: "A", value: 21.6 },
]

const numberOrEmpty = (v: string | number | undefined | null): number => {
  if (v === "" || v === null || v === undefined) return 0
  const n = Number(String(v).replace(",", "."))
  return Number.isFinite(n) ? n : 0
}

// ===== Fábricas =====
type ParamDef = { key: string; label: string; unit?: string; value: number }
type StringSpec = { id: string; nome: string; params: ParamDef[] }
type MpptSpec = { id: string; titulo: string; strings: StringSpec[] }

const makeString = (index = 0, defaults?: { byKey?: Record<string, number> }): StringSpec => {
  const byKey = defaults && defaults.byKey ? defaults.byKey : {}
  return {
    id: uid(),
    nome: `String ${index + 1}`,
    params: DEFAULT_PARAMS.map((p) => ({
      ...p,
      value: byKey[p.key] !== undefined ? byKey[p.key] : p.value,
    })),
  }
}

const makeMppt = (index = 0, nStrings = 1, defaults?: { byKey?: Record<string, number> }): MpptSpec => ({
  id: uid(),
  titulo: `MPPT - ${index + 1}`,
  // Sempre inicialize "strings" (evita TypeError em .map)
  strings: Array.from({ length: nStrings }, (_, s) => makeString(s, defaults)),
})

// ===== UI Atômicos =====
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl shadow-sm border border-zinc-200 bg-white ${className}`}>{children}</div>
}

// ===== Componente Principal =====
export default function MPPTSpecsEditable() {
  // Controles
  const [mpptCount, setMpptCount] = useState<number>(2)
  const [stringsPerMppt, setStringsPerMppt] = useState<number>(2)

  // Especificações globais (alimentam TODAS as strings automaticamente)
  const [globals, setGlobals] = useState<{ v_min: number; v_max: number; v_start: number; v_nom: number; v_in_max: number; i_max: number; i_sc: number }>({
    v_min: 90,
    v_max: 500,
    v_start: 100,
    v_nom: 360,
    v_in_max: 600,
    i_max: 15,
    i_sc: 21.6,
  })

  const globalsByKey = useMemo((): Record<string, number> => ({
    v_min: globals.v_min,
    v_max: globals.v_max,
    v_start: globals.v_start,
    v_nom: globals.v_nom,
    v_in_max: globals.v_in_max,
    i_max: globals.i_max,
    i_sc: globals.i_sc,
  }), [globals])

  // Estado dos dados — começa vazio para não renderizar nada inconsistente antes do ensureShape
  const [specs, setSpecs] = useState<MpptSpec[]>([])
  const [showHtmlPreview, setShowHtmlPreview] = useState(false)

  // Garante a estrutura specs = mpptCount x stringsPerMppt (descarta excedentes ao reduzir)
  const ensureShape = (nextMpptCount = mpptCount, nextStringsPerMppt = stringsPerMppt) => {
    setSpecs((prev) => {
      let mppts: MpptSpec[] = [...prev]

      // 1) Ajusta quantidade de MPPTs
      if (mppts.length < nextMpptCount) {
        for (let i = mppts.length; i < nextMpptCount; i++) {
          mppts.push(makeMppt(i, nextStringsPerMppt, { byKey: globalsByKey }))
        }
      } else if (mppts.length > nextMpptCount) {
        mppts = mppts.slice(0, nextMpptCount)
      }

      // 2) Garante que cada MPPT tenha o array "strings" e na quantidade certa
      mppts = mppts.map((m: MpptSpec, i: number) => {
        let strings: StringSpec[] = Array.isArray(m.strings) ? [...m.strings] : []
        if (strings.length < nextStringsPerMppt) {
          for (let s = strings.length; s < nextStringsPerMppt; s++) strings.push(makeString(s, { byKey: globalsByKey }))
        } else if (strings.length > nextStringsPerMppt) {
          strings = strings.slice(0, nextStringsPerMppt)
        }
        return { ...m, titulo: `MPPT - ${i + 1}`, strings }
      })

      return mppts
    })
  }

  // Inicializa forma ao montar
  useEffect(() => {
    ensureShape(2, 2)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handlers dos controles
  const onChangeCounts = (kind: "mppt" | "strings", value: string | number) => {
    const n = Math.max(1, Number(value || 1))
    if (kind === "mppt") {
      setMpptCount(n)
      ensureShape(n, stringsPerMppt)
    } else {
      setStringsPerMppt(n)
      ensureShape(mpptCount, n)
    }
  }

  // Atualiza um valor de parâmetro (edição local)
  const updateParam = (mpptIdx: number, strIdx: number, pIdx: number, value: number | "") => {
    setSpecs((arr) =>
      arr.map((m, i) =>
        i !== mpptIdx
          ? m
          : {
              ...m,
              strings: (m.strings ?? []).map((st, j) =>
                j !== strIdx ? st : { ...st, params: st.params.map((p, k) => (k === pIdx ? { ...p, value: value === "" ? 0 : (value as number) } : p)) },
              ),
            },
      ),
    )
  }

  const updateStringName = (mpptIdx: number, strIdx: number, nome: string) => {
    setSpecs((arr) =>
      arr.map((m, i) =>
        i !== mpptIdx ? m : { ...m, strings: (m.strings ?? []).map((st, j) => (j === strIdx ? { ...st, nome } : st)) },
      ),
    )
  }

  // ===== Aplicar Globais em todas as Strings =====
  const applyGlobalsToAll = () => {
    const map = globalsByKey
    setSpecs((arr) =>
      arr.map((m) => ({
        ...m,
        strings: (m.strings ?? []).map((st) => ({
          ...st,
          params: st.params.map((p) => ({ ...p, value: map[(p as ParamDef).key] !== undefined ? map[(p as ParamDef).key] : p.value })),
        })),
      })),
    )
  }

  // Auto-aplica sempre que globais mudarem
  useEffect(() => {
    applyGlobalsToAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalsByKey])

  // ===== Exportações =====
  const jsonData = useMemo(
    () =>
      (specs ?? []).map((m) => ({
        titulo: m.titulo,
        strings: (m.strings ?? []).map((st) => ({
          nome: st.nome,
          params: st.params.map(({ key, label, unit, value }) => ({ key, label, unit, value })),
        })),
      })),
    [specs],
  )

  const downloadJSON = () => {
    const blob = new Blob(
      [JSON.stringify({ mpptCount, stringsPerMppt, globals: globalsByKey, data: jsonData }, null, 2)],
      { type: "application/json" },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "mppt-strings-specs.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyJSON = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify({ mpptCount, stringsPerMppt, globals: globalsByKey, data: jsonData }),
      )
      alert("JSON copiado!")
    } catch (e) {
      console.error(e)
      alert("Falha ao copiar JSON")
    }
  }

  const htmlString = useMemo(() => {
    const sections = (jsonData ?? [])
      .map(
        (mppt) => `
        <section style="border:1px solid #e5e5e5;border-radius:12px;margin:12px;padding:16px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif">
          <div style="border-bottom:1px solid #eee;padding-bottom:8px;margin-bottom:8px">
            <div style="color:#6b7280;font-size:12px;text-transform:uppercase">${mppt.titulo}</div>
          </div>
          ${(mppt.strings ?? [])
            .map(
              (st) => `
            <div style="border:1px solid #f3f4f6;border-radius:10px;padding:12px;margin:10px 0;">
              <div style="font-weight:600;margin-bottom:6px">${st.nome}</div>
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <thead>
                  <tr>
                    <th style="text-align:left;color:#6b7280;font-weight:500;padding:6px">Parâmetro</th>
                    <th style="text-align:right;color:#6b7280;font-weight:500;padding:6px">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${st.params
                    .map(
                      (p) => `
                    <tr>
                      <td style="padding:6px;border-top:1px solid #f3f4f6">${p.label}</td>
                      <td style="padding:6px;border-top:1px solid #f3f4f6;text-align:right">${p.value} ${p.unit || ""}</td>
                    </tr>`,
                    )
                    .join("")}
                </tbody>
              </table>
            </div>`,
            )
            .join("")}
        </section>`,
      )
      .join("")

    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MPPT x Strings</title></head><body style="background:#fafafa;margin:0;padding:12px">${sections}</body></html>`
  }, [jsonData])

  const downloadHTML = () => {
    const blob = new Blob([htmlString], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "mppt-strings-specs.html"
    a.click()
    URL.revokeObjectURL(url)
  }

  // ===== Testes (sanidade) =====
  const runTests = () => {
    const errors = []
    // T1: quantidade de MPPTs
    if (specs.length !== mpptCount) errors.push(`Esperado ${mpptCount} MPPTs, obtido ${specs.length}`)
    // T2: cada MPPT tem strings na contagem certa
    specs.forEach((m, i) => {
      if (!Array.isArray(m.strings)) errors.push(`MPPT ${i + 1} sem array 'strings'`)
      else if (m.strings.length !== stringsPerMppt)
        errors.push(`MPPT ${i + 1} deveria ter ${stringsPerMppt} strings, mas tem ${m.strings.length}`)
        // T3: cada string tem 7 parâmetros
      ;(m.strings ?? []).forEach((st, j) => {
        if (!Array.isArray(st.params) || st.params.length !== DEFAULT_PARAMS.length)
          errors.push(`MPPT ${i + 1} / String ${j + 1} deveria ter ${DEFAULT_PARAMS.length} parâmetros.`)
        // T4: globais foram aplicados (exemplo: v_max)
        const g = globalsByKey
        const vmax = st.params.find((p) => p.key === "v_max")
        if (!vmax || vmax.value !== g.v_max)
          errors.push(`Globais não aplicados a v_max em MPPT ${i + 1} / String ${j + 1}`)
      })
    })

    if (errors.length) alert("Falharam os testes:\n" + errors.join("\n"))
    else alert("Todos os testes passaram! ✅")
  }

  // ===== Render =====
  return (
    <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Especificações por MPPT e Strings</h1>
            <p className="text-sm text-zinc-600">
              Defina quantidade de MPPTs e Strings por MPPT. Parâmetros são alimentados pelos campos globais abaixo.
            </p>
          </div>

          {/* Ações */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-100 active:scale-[0.99]"
              onClick={downloadJSON}
            >
              Exportar JSON
            </button>
            <button
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-100 active:scale-[0.99]"
              onClick={copyJSON}
            >
              Copiar JSON
            </button>
            <button
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-100 active:scale-[0.99]"
              onClick={downloadHTML}
            >
              Gerar HTML
            </button>
            <button
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-100 active:scale-[0.99]"
              onClick={runTests}
            >
              Rodar Testes
            </button>
          </div>
        </div>

        {/* Controles de quantidade */}
        <div className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-4">
          <div>
            <label className="text-xs text-zinc-600">Número de MPPTs</label>
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-300"
              value={mpptCount}
              onChange={(e) => onChangeCounts("mppt", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-600">Qtd. de Strings por MPPT</label>
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-300"
              value={stringsPerMppt}
              onChange={(e) => onChangeCounts("strings", e.target.value)}
            />
          </div>
          <div className="self-end text-xs text-zinc-500">Total de Strings: {mpptCount * stringsPerMppt}</div>
        </div>

        {/* Especificações Globais (alimentam todas as strings) */}
        <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="mb-3 text-sm font-medium text-zinc-700">Especificações Globais</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs text-zinc-600">Faixa Tensão Operacional Mínima (Vdc)</label>
              <input
                type="number"
                step="any"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                value={globals.v_min}
                onChange={(e) => setGlobals({ ...globals, v_min: numberOrEmpty(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-600">Faixa Tensão Operacional Máxima (Vdc)</label>
              <input
                type="number"
                step="any"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                value={globals.v_max}
                onChange={(e) => setGlobals({ ...globals, v_max: numberOrEmpty(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-600">Tensão Partida (Vdc)</label>
              <input
                type="number"
                step="any"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                value={globals.v_start}
                onChange={(e) => setGlobals({ ...globals, v_start: numberOrEmpty(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-600">Tensão Nominal (Vdc)</label>
              <input
                type="number"
                step="any"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                value={globals.v_nom}
                onChange={(e) => setGlobals({ ...globals, v_nom: numberOrEmpty(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-600">Tensão Máxima de Entrada (Vdc)</label>
              <input
                type="number"
                step="any"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                value={globals.v_in_max}
                onChange={(e) => setGlobals({ ...globals, v_in_max: numberOrEmpty(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-600">Corrente máx. por Entrada (A)</label>
              <input
                type="number"
                step="any"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none"
                value={globals.i_max}
                onChange={(e) => setGlobals({ ...globals, i_max: numberOrEmpty(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-600">Corrente de curto-circuito MPPT (A)</label>
              <input
                type="number"
                step="any"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none"
                value={globals.i_sc}
                onChange={(e) => setGlobals({ ...globals, i_sc: numberOrEmpty(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* Grid de MPPTs */}
        <div className="grid gap-6 md:grid-cols-2">
          {(specs ?? []).map((mppt, mIdx) => (
            <Card key={mppt.id}>
              <div className="border-b border-zinc-200 p-5">
                <div className="text-xs uppercase tracking-wide text-zinc-500">{mppt.titulo}</div>
                <div className="text-sm text-zinc-500">{stringsPerMppt} Strings</div>
              </div>
              <div className="divide-y divide-zinc-100">
                {(mppt.strings ?? []).map((st, sIdx) => (
                  <div key={st.id} className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <input
                        className="w-full max-w-xs rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none"
                        value={st.nome}
                        onChange={(e) => updateStringName(mIdx, sIdx, e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-12 pb-2 text-xs text-zinc-500">
                      <div className="col-span-7">Parâmetro</div>
                      <div className="col-span-4">Valor</div>
                      <div className="col-span-1">Un.</div>
                    </div>
                    <div className="divide-y divide-zinc-100">
                      {st.params.map((p, pIdx) => (
                        <div key={p.key ?? pIdx} className="grid grid-cols-12 items-center py-2">
                          <div className="col-span-7 pr-3 text-sm text-zinc-700">{p.label}</div>
                          <div className="col-span-4">
                            <input
                              type="number"
                              step="any"
                              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-300"
                              value={p.value}
                              onChange={(e) => updateParam(mIdx, sIdx, pIdx, numberOrEmpty(e.target.value))}
                            />
                          </div>
                          <div className="col-span-1 text-xs text-zinc-500">{p.unit}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
