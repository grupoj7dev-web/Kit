"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Fornecedor {
  id: string // Changed from number to string for UUID
  nome: string
}

interface Cabo {
  id: string
  nome: string
  fornecedor_id: string
  valor_no_kit: number
  valor_venda_avulsa: number
  tipo_cabo: string
  bitola: string
  isolacao: string
  tensao_maxima: string
  temperatura_operacao: string
  certificacoes: string
  cor: string
  comprimento_padrao: number
  resistencia_eletrica: number
  capacidade_corrente: number
  flexibilidade: string
  created_at: string
  fornecedores?: {
    id: string
    nome: string
  }
}

export default function CabosCadastro() {
  const [form, setForm] = useState({
    nome: "",
    fornecedor_id: "",
    // keep monetary inputs as strings so the user can clear the field (empty string)
    valor_no_kit: "",
    valor_venda_avulsa: "",
    tipo_cabo: "CC",
    bitola: "4mm²",
    isolacao: "XLPE",
    tensao_nominal: "1kV",
    temperatura_operacao: "-40°C a +90°C",
    temperatura_operacao_custom: "",
    cor: "Preto",
    comprimento_padrao: 100,
    condutor: "Cobre estanhado",
    formacao: "Flexível",
    capa_externa: "XLPE",
    resistencia_uv: true,
    normas_aplicaveis: "NBR 16690, IEC 62930",
    certificacoes: "",
    regras_kit_string: "Para Kit com Inversor String usar: bitola mínima 4mm² para CC, 6mm² para CA",
    observacoes: "",
    // Nomenclatura toggles
    showCor: true,
    showBitola: true,
    showComprimento: true,
  })

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [cabos, setCabos] = useState<Cabo[]>([])
  const [erros, setErros] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  

  useEffect(() => {
    fetchFornecedores()
    fetchCabos()
  }, [])

  const fetchFornecedores = async () => {
    try {
      const response = await fetch("/api/fornecedores")
      if (response.ok) {
        const data = await response.json()
        setFornecedores(data)
      }
    } catch (error) {
      console.error("Error fetching fornecedores:", error)
    }
  }

  const fetchCabos = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/cabos")
      if (response.ok) {
        const data = await response.json()
        setCabos(data)
      }
    } catch (error) {
      console.error("Error fetching cabos:", error)
    } finally {
      setLoading(false)
    }
  }

  const editarCabo = (cabo: Cabo) => {
    setForm({
      nome: cabo.nome,
      fornecedor_id: cabo.fornecedor_id,
      // keep as string to allow clearing in the UI
      valor_no_kit: (cabo.valor_no_kit !== undefined && cabo.valor_no_kit !== null) ? String(cabo.valor_no_kit) : "",
      valor_venda_avulsa: (cabo.valor_venda_avulsa !== undefined && cabo.valor_venda_avulsa !== null) ? String(cabo.valor_venda_avulsa) : "",
      tipo_cabo: cabo.tipo_cabo || "CC",
      bitola: cabo.bitola || "4mm²",
      isolacao: cabo.isolacao || "XLPE",
      tensao_nominal: cabo.tensao_maxima || "1kV",
      temperatura_operacao: cabo.temperatura_operacao || "-40°C a +90°C",
      temperatura_operacao_custom: "",
      cor: cabo.cor || "Preto",
      comprimento_padrao: cabo.comprimento_padrao || 100,
      condutor: "Cobre estanhado",
      formacao: "Flexível",
      capa_externa: "XLPE",
      resistencia_uv: true,
      normas_aplicaveis: "NBR 16690, IEC 62930",
      certificacoes: cabo.certificacoes || "",
      regras_kit_string: "Para Kit com Inversor String usar: bitola mínima 4mm² para CC, 6mm² para CA",
      observacoes: "",
      showCor: true,
      showBitola: true,
      showComprimento: true,
    })
    setEditando(cabo.id)
    setMostrarFormulario(true)
  }

  const cancelarEdicao = () => {
    setForm({
      nome: "",
      fornecedor_id: "",
      valor_no_kit: "",
      valor_venda_avulsa: "",
      tipo_cabo: "CC",
      bitola: "4mm²",
      isolacao: "XLPE",
      tensao_nominal: "1kV",
      temperatura_operacao: "-40°C a +90°C",
      temperatura_operacao_custom: "",
      cor: "Preto",
      comprimento_padrao: 100,
      condutor: "Cobre estanhado",
      formacao: "Flexível",
      capa_externa: "XLPE",
      resistencia_uv: true,
      normas_aplicaveis: "NBR 16690, IEC 62930",
      certificacoes: "",
      regras_kit_string: "Para Kit com Inversor String usar: bitola mínima 4mm² para CC, 6mm² para CA",
      observacoes: "",
      showCor: true,
      showBitola: true,
      showComprimento: true,
    })
    setEditando(null)
    setMostrarFormulario(false)
  }

  const excluirCabo = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cabo?')) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/cabos/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        alert("Cabo excluído com sucesso!")
        fetchCabos()
      } else {
        const errorData = await response.json()
        alert(`Erro ao excluir cabo: ${errorData.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error("Error deleting cabo:", error)
      alert("Erro ao excluir cabo.")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const validar = () => {
    const erros: string[] = [];
    const okCampos: string[] = [];
    const toNum = (v: any) => {
      if (v === "" || v === null || v === undefined) return null
      const s = String(v).replace(',', '.')
      const n = Number(s)
      return isNaN(n) ? null : n
    }

    if (!form.nome) erros.push("Informe o nome do cabo."); else okCampos.push("Nome do cabo preenchido");
    if (!form.fornecedor_id) erros.push("Selecione um fornecedor."); else okCampos.push("Fornecedor selecionado");

    const vn = toNum((form as any).valor_no_kit)
    const vv = toNum((form as any).valor_venda_avulsa)

    if (vn !== null && vn < 0) erros.push("Valor no kit não pode ser negativo."); else okCampos.push("Valor no kit válido");
    if (vv !== null && vv < 0) erros.push("Valor venda avulsa não pode ser negativo."); else okCampos.push("Valor venda avulsa válido");
    if (vn !== null && vv !== null && vv < vn) {
      erros.push("Valor de venda avulsa deve ser maior ou igual ao valor no kit.");
    } else okCampos.push("Valor venda avulsa maior ou igual ao valor no kit");

    if (form.comprimento_padrao <= 0) erros.push("Comprimento padrão deve ser maior que zero."); else okCampos.push("Comprimento padrão válido");
    // Adicione outras validações conforme necessário
    setErros(erros);
    return { ok: erros.length === 0, erros, okCampos };
  }

  const salvar = async () => {
    const validacao = validar();
    if (!validacao.ok) {
      setErros(validacao.erros);
      alert("Não foi possível cadastrar.\n\nCampos válidos:\n" + validacao.okCampos.join("\n") + "\n\nCampos com erro:\n" + validacao.erros.join("\n"));
      return;
    }

    try {
      setLoading(true)
      const url = editando ? `/api/cabos/${editando}` : "/api/cabos"
      const method = editando ? "PUT" : "POST"

      // Prepara dados para envio
      const parseCurrency = (v: unknown) => {
        // empty string means user cleared the field -> send null
        if (v === '' || v === null || v === undefined) return null
        if (typeof v === 'string') {
          const cleaned = v.replace(/[^0-9.,-]/g, '').replace(',', '.')
          const n = Number(cleaned)
          return isNaN(n) ? null : n
        }
        if (typeof v === 'number') {
          return isNaN(v) ? null : v;
        }
        return null;
      };
      const payload = {
        ...form,
        // normalize monetary fields to number or null before sending
        valor_no_kit: parseCurrency((form as any).valor_no_kit),
        valor_venda_avulsa: parseCurrency((form as any).valor_venda_avulsa),
        temperatura_operacao: form.temperatura_operacao === 'custom' && form.temperatura_operacao_custom ? form.temperatura_operacao_custom : form.temperatura_operacao,
      }
      // Remove transient UI-only fields that are not in DB schema
      const finalPayload: any = { ...payload }
      if ('temperatura_operacao_custom' in finalPayload) delete finalPayload.temperatura_operacao_custom
      // Remove UI-only fields that are not part of the DB schema
      const uiOnly = ["showCor", "showBitola", "showComprimento"]
      uiOnly.forEach((k) => {
        if (k in finalPayload) {
          delete finalPayload[k]
        }
      })
      // Ensure fornecedor_id is a UUID (Postgres expects uuid for foreign key)
      const isUUID = (v: any) => typeof v === 'string' && !!v.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      if (!isUUID(finalPayload.fornecedor_id)) {
        // defensive: stop and inform the user rather than sending invalid payload to server
        alert('Fornecedor selecionado inválido. Selecione um fornecedor válido antes de salvar. (ID inválido)')
        setLoading(false)
        return
      }

      console.log("[CABOS] Payload final (DB):", finalPayload);
      console.log("[CABOS] Payload enviado:", payload);
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalPayload),
      });
      const respText = await response.text();
      let respJson = null;
      try { respJson = JSON.parse(respText) } catch (e) { respJson = respText }
      console.log("[CABOS] Status resposta:", response.status);
      console.log("[CABOS] Body resposta:", respJson);

    if (response.ok) {
  console.log("[CABOS] Cadastro OK:", respJson);
  alert((editando ? "Cabo atualizado com sucesso!" : "Cabo cadastrado com sucesso!") + "\n\nCampos válidos:\n" + validacao.okCampos.join("\n"));
        // Reset form
        setForm({
          nome: "",
          fornecedor_id: "",
          valor_no_kit: "",
          valor_venda_avulsa: "",
          tipo_cabo: "CC",
          bitola: "4mm²",
          isolacao: "XLPE",
          tensao_nominal: "1kV",
          temperatura_operacao: "-40°C a +90°C",
          temperatura_operacao_custom: "",
          cor: "Preto",
          comprimento_padrao: 100,
          condutor: "Cobre estanhado",
          formacao: "Flexível",
          capa_externa: "XLPE",
          resistencia_uv: true,
          normas_aplicaveis: "NBR 16690, IEC 62930",
          certificacoes: "",
          regras_kit_string: "Para Kit com Inversor String usar: bitola mínima 4mm² para CC, 6mm² para CA",
          observacoes: "",
          showCor: true,
          showBitola: true,
          showComprimento: true,
        })
        setEditando(null)
        setMostrarFormulario(false)
        // Refresh the list
        fetchCabos()
      } else {
  const errorData = respJson;
  console.error("[CABOS] Erro ao cadastrar:", errorData);
  // If PostgREST schema cache reports a missing column (PGRST204), show a clearer message
  const pgrstMsg = errorData?.details?.message || errorData?.error
  if (typeof pgrstMsg === 'string' && /PGRST204|Could not find the/.test(pgrstMsg)) {
    alert(`Erro no banco: uma coluna esperada não existe no esquema. Mensagem: ${pgrstMsg}.\n\nVerifique o esquema da tabela 'cabos' ou remova campos de interface (ex: showBitola) antes de enviar.`)
  } else {
    let msg = `Erro ao ${editando ? 'atualizar' : 'cadastrar'} cabo: ${errorData?.error || 'Erro desconhecido'}`;
    if (errorData?.details) msg += "\n\nDetalhes: " + JSON.stringify(errorData.details, null, 2)
    msg += "\n\nCampos válidos:\n" + validacao.okCampos.join("\n");
    msg += "\n\nCampos com erro:\n" + validacao.erros.join("\n");
    alert(msg);
  }
      }
    } catch (error) {
      console.error("Error saving cabo:", error)
      alert(`Erro ao ${editando ? 'atualizar' : 'cadastrar'} cabo.`)
    } finally {
      setLoading(false)
    }
  }

  const currency = (v: unknown) => {
    if (v === null || v === undefined || v === "") return ""
    let n: number | null = null
    if (typeof v === 'number') n = v
    else if (typeof v === 'string') {
      const cleaned = v.replace(/[^0-9.,-]/g, '').replace(',', '.')
      const parsed = Number(cleaned)
      if (!isNaN(parsed)) n = parsed
    }
    if (n === null) return ""
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  const nomeComercial = useMemo(() => {
    const parts: string[] = []
    // Use explicit name if provided
    if (form.nome) parts.push(form.nome)
    else parts.push('Cabo')
    if (form.showBitola && form.bitola) parts.push(form.bitola)
    if (form.showCor && form.cor) parts.push(form.cor)
    if (form.showComprimento && form.comprimento_padrao) parts.push(`${form.comprimento_padrao}m`)
    return parts.join(' ')
  }, [form.nome, form.bitola, form.cor, form.comprimento_padrao, form.showBitola, form.showCor, form.showComprimento])

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Cadastro de Cabos</h1>
          <p className="text-sm text-neutral-600">
            Registre cabos para composição de kits fotovoltaicos com especificações técnicas e comerciais.
          </p>
          <div className="mt-4 flex justify-end">
            {!mostrarFormulario ? (
              <button
                onClick={() => { setMostrarFormulario(true); setEditando(null) }}
                className="rounded-2xl bg-black px-4 py-2 text-white hover:opacity-90"
              >
                Novo Cabo
              </button>
            ) : (
              <button
                onClick={cancelarEdicao}
                className="rounded-2xl bg-gray-600 px-4 py-2 text-white hover:opacity-90"
              >
                Cancelar
              </button>
            )}
          </div>
        </header>
        {erros.length > 0 && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <div className="mb-2 font-semibold">Ajustes necessários</div>
            <ul className="list-disc pl-5">
              {erros.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {mostrarFormulario && (
          <div className="grid grid-cols-1 gap-6">
            <div>
              <Tabs defaultValue="comercial" className="space-y-4">
              <TabsList>
                <TabsTrigger value="comercial">Dados Comerciais</TabsTrigger>
                <TabsTrigger value="tecnicos">Especificações Técnicas</TabsTrigger>
                <TabsTrigger value="nomenclatura">Nomenclatura</TabsTrigger>
              </TabsList>

              <TabsContent value="comercial">
                <Card title="Identificação">
                  <div className="space-y-3">
                    <Field label="Nome do Cabo">
                      <input
                        className="input border border-gray-400"
                        value={form.nome}
                        onChange={(e) => handleChange("nome", e.target.value)} />
                    </Field>
                    <Field label="Fornecedor">
                      <select
                        className="input border border-gray-400"
                        value={form.fornecedor_id}
                        onChange={(e) => handleChange("fornecedor_id", e.target.value)}
                      >
                        <option value="">Selecione um fornecedor</option>
                        {fornecedores.map((fornecedor) => (
                          <option key={fornecedor.id} value={fornecedor.id}>
                            {fornecedor.nome}
                          </option>
                        ))}
                        {/* Fallback: se o fornecedor atual do cabo não está na lista (ex: fornecedor inativo),
                            inclui uma opção para mostrar o fornecedor selecionado ao editar */}
                        {form.fornecedor_id && !fornecedores.some(f => f.id === form.fornecedor_id) && (
                          <option value={form.fornecedor_id}>
                            { /* tenta mostrar o nome se disponível na entidade editando */ }
                            { (editando && typeof editando === 'string') ? `Selecionado (${form.fornecedor_id})` : `Selecionado (${form.fornecedor_id})` }
                          </option>
                        )}
                      </select>
                    </Field>
                  </div>
                </Card>

                <Card title="Dados Comerciais">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Valor no Kit (R$)">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="input border border-gray-400"
                        value={(form as any).valor_no_kit}
                        onChange={(e) => handleChange('valor_no_kit', e.target.value)}
                        placeholder="0.00"
                      />
                    </Field>
                    <Field label="Valor Venda Avulsa (R$)">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="input border border-gray-400"
                        value={(form as any).valor_venda_avulsa}
                        onChange={(e) => handleChange('valor_venda_avulsa', e.target.value)}
                        placeholder="0.00"
                      />
                    </Field>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="tecnicos">
                <Card title="Especificações Técnicas">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Tipo de Cabo">
                      <select
                        className="input"
                        value={form.tipo_cabo}
                        onChange={(e) => handleChange("tipo_cabo", e.target.value)}
                      >
                        <option value="CC">CC (Corrente Contínua)</option>
                        <option value="CA">CA (Corrente Alternada)</option>
                        <option value="Aterramento">Aterramento</option>
                        <option value="Sinalização">Sinalização</option>
                      </select>
                    </Field>

                    <Field label="Bitola">
                      <select
                        className="input"
                        value={form.bitola}
                        onChange={(e) => handleChange("bitola", e.target.value)}
                      >
                        <option value="1.5mm²">1.5mm²</option>
                        <option value="2.5mm²">2.5mm²</option>
                        <option value="4mm²">4mm²</option>
                        <option value="6mm²">6mm²</option>
                        <option value="10mm²">10mm²</option>
                        <option value="16mm²">16mm²</option>
                        <option value="25mm²">25mm²</option>
                        <option value="35mm²">35mm²</option>
                      </select>
                    </Field>

                    <Field label="Isolação">
                      <select
                        className="input"
                        value={form.isolacao}
                        onChange={(e) => handleChange("isolacao", e.target.value)}
                      >
                        <option value="XLPE">XLPE</option>
                        <option value="EPR">EPR</option>
                        <option value="PVC">PVC</option>
                      </select>
                    </Field>

                    <Field label="Tensão Nominal">
                      <select
                        className="input"
                        value={form.tensao_nominal}
                        onChange={(e) => handleChange("tensao_nominal", e.target.value)}
                      >
                        <option value="0.6/1kV">0.6/1kV</option>
                        <option value="1kV">1kV</option>
                        <option value="1.8kV">1.8kV</option>
                      </select>
                    </Field>

                    <Field label="Cor">
                      <select className="input" value={form.cor} onChange={(e) => handleChange("cor", e.target.value)}>
                        <option value="Preto">Preto</option>
                        <option value="Vermelho">Vermelho</option>
                        <option value="Azul">Azul</option>
                        <option value="Verde/Amarelo">Verde/Amarelo</option>
                        <option value="Branco">Branco</option>
                      </select>
                    </Field>

                    <Field label="Comprimento Padrão (m)">
                      <input
                        type="number"
                        className="input border border-gray-400"
                        value={form.comprimento_padrao}
                        onChange={(e) => handleChange("comprimento_padrao", Number.parseInt(e.target.value) || 0)} />
                    </Field>
                  </div>
                </Card>

                <Card title="Construção">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Condutor">
                      <select
                        className="input"
                        value={form.condutor}
                        onChange={(e) => handleChange("condutor", e.target.value)}
                      >
                        <option value="Cobre nu">Cobre nu</option>
                        <option value="Cobre estanhado">Cobre estanhado</option>
                        <option value="Alumínio">Alumínio</option>
                      </select>
                    </Field>

                    <Field label="Formação">
                      <select
                        className="input"
                        value={form.formacao}
                        onChange={(e) => handleChange("formacao", e.target.value)}
                      >
                        <option value="Flexível">Flexível</option>
                        <option value="Rígido">Rígido</option>
                      </select>
                    </Field>

                    <Field label="Capa Externa">
                      <select
                        className="input"
                        value={form.capa_externa}
                        onChange={(e) => handleChange("capa_externa", e.target.value)}
                      >
                        <option value="XLPE">XLPE</option>
                        <option value="PVC">PVC</option>
                        <option value="Halogen-free">Halogen-free</option>
                      </select>
                    </Field>

                    <Field label="Temperatura de Operação">
                      <div className="flex gap-2">
                        <select
                          className="input border border-gray-400"
                          value={form.temperatura_operacao}
                          onChange={(e) => handleChange("temperatura_operacao", e.target.value)}
                        >
                          <option value="-40°C a +90°C">-40°C a +90°C</option>
                          <option value="-20°C a +70°C">-20°C a +70°C</option>
                          <option value="-10°C a +60°C">-10°C a +60°C</option>
                          <option value="custom">Outro...</option>
                        </select>
                        {form.temperatura_operacao === "custom" && (
                          <input
                            className="input border border-gray-400"
                            placeholder="Ex: -30°C a +80°C"
                            value={form.temperatura_operacao_custom || ""}
                            onChange={(e) => handleChange("temperatura_operacao_custom", e.target.value)}
                          />
                        )}
                      </div>
                    </Field>

                    <Field label="Resistência UV">
                      <Toggle checked={form.resistencia_uv} onChange={(v) => handleChange("resistencia_uv", v)} />
                    </Field>
                  </div>
                </Card>

                <Card title="Regras para Kit com Inversor String">
                  <Field label="Regras Específicas">
                    <textarea
                      className="input min-h-[100px] border border-gray-400"
                      value={form.regras_kit_string}
                      onChange={(e) => handleChange("regras_kit_string", e.target.value)} />
                  </Field>
                </Card>

                <Card title="Certificações e Normas">
                  <Field label="Normas Aplicáveis">
                    <input
                      className="input border border-gray-400"
                      value={form.normas_aplicaveis}
                      onChange={(e) => handleChange("normas_aplicaveis", e.target.value)} />
                  </Field>

                  <Field label="Certificações">
                    <input
                      className="input border border-gray-400"
                      value={form.certificacoes}
                      onChange={(e) => handleChange("certificacoes", e.target.value)} />
                  </Field>
                </Card>

                <Card title="Observações">
                  <textarea
                    className="input min-h-[100px] border border-gray-400"
                    value={form.observacoes}
                    onChange={(e) => handleChange("observacoes", e.target.value)} />
                </Card>
              </TabsContent>

              <TabsContent value="nomenclatura">
                <Card title="Nomenclatura">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" checked={!!form.showBitola} onChange={(e) => handleChange('showBitola', e.target.checked)} />
                      <label className="text-sm">Mostrar Bitola</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" checked={!!form.showCor} onChange={(e) => handleChange('showCor', e.target.checked)} />
                      <label className="text-sm">Mostrar Cor</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" checked={!!form.showComprimento} onChange={(e) => handleChange('showComprimento', e.target.checked)} />
                      <label className="text-sm">Mostrar Comprimento Padrão</label>
                    </div>
                    <div className="pt-2 text-sm">
                      <div className="font-medium">Preview exemplo</div>
                      <div className="text-neutral-700 mt-1">{nomeComercial}</div>
                      <div className="text-xs text-neutral-500 mt-1">Ex: Cabo 4mm² Preto 100m</div>
                    </div>
                  </div>
                </Card>
              </TabsContent>
              </Tabs>
            </div>

            {/* Preview e Ações */}
            <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
              <Card title="Preview do Cabo">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <Info label="Nome" value={form.nome || "—"} />
                  <Info
                    label="Especificação"
                    value={`${form.tipo_cabo} ${form.bitola} ${form.cor} - ${form.comprimento_padrao}m`} />
                  <Info label="Construção" value={`${form.condutor}, ${form.formacao}, ${form.capa_externa}`} />
                  <Info label="Isolação" value={`${form.isolacao} - ${form.tensao_nominal}`} />
                  <Info label="Temperatura" value={form.temperatura_operacao} />
                  <Info
                    label="Comerciais"
                    value={`${currency((form as any).valor_venda_avulsa)} (avulsa) • ${currency((form as any).valor_no_kit)} (no kit)`} />
                  <Info label="Normas" value={form.normas_aplicaveis} />
                </div>
              </Card>
              </div>
              <div>
              <Card title="Ações">
                <div className="space-y-3">
                  <button
                    onClick={salvar}
                    disabled={loading}
                    className="w-full rounded-2xl bg-black px-4 py-3 text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? (editando ? 'Atualizando...' : 'Salvando...') : (editando ? 'Atualizar Cabo' : 'Salvar Cabo')}
                  </button>
                  {editando && (
                    <button
                      onClick={cancelarEdicao}
                      disabled={loading}
                      className="w-full rounded-2xl bg-gray-500 px-4 py-3 text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
                    >
                      Cancelar Edição
                    </button>
                  )}
                </div>
                <div className="mt-3 text-xs text-neutral-500">
                  {editando ? 'As alterações serão salvas no cabo selecionado.' : 'O cabo será validado e registrado para uso em kits fotovoltaicos.'}
                </div>
              </Card>
              </div>
            </section>
          </div>
        )}

          {/* Seção de Cabos Cadastrados */}
          <section className="mt-8">
            <Card title={`Cabos Cadastrados (${cabos.length})`}>
              {loading ? (
                <div className="py-8 text-center text-neutral-500">
                  Carregando cabos...
                </div>
              ) : cabos.length === 0 ? (
                <div className="py-8 text-center text-neutral-500">
                  Nenhum cabo cadastrado ainda.
                </div>
              ) : (
                <div className="space-y-3">
                  {cabos.map((cabo) => (
                    <div key={cabo.id} className="rounded-lg border p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{cabo.nome}</h3>
                          <div className="mt-1 text-sm text-gray-600">
                            <span className="inline-flex items-center gap-4">
                              <span>{cabo.tipo_cabo} • {cabo.bitola}</span>
                              <span>{cabo.cor}</span>
                              <span>{cabo.comprimento_padrao}m</span>
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-4">
                              <span>Isolação: {cabo.isolacao}</span>
                              <span>Temperatura: {cabo.temperatura_operacao}</span>
                              {cabo.fornecedores && <span>Fornecedor: {cabo.fornecedores.nome}</span>}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {currency(cabo.valor_venda_avulsa || 0)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Kit: {currency(cabo.valor_no_kit || 0)}
                            </div>
                            <div className="mt-1 text-xs text-gray-400">
                              {new Date(cabo.created_at).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => editarCabo(cabo)}
                              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => excluirCabo(cabo.id)}
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
            </Card>
          </section>
        
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-neutral-600">{label}</div>
      {children}
    </label>
  )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="font-medium text-neutral-800">{value}</div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        checked ? "bg-black" : "bg-neutral-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`} />
    </button>
  )
}
