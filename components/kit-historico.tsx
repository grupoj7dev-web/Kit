"use client"

import React, { useEffect, useState } from 'react'
import { X, Trash2, Copy, Package, Zap } from 'lucide-react'
import { formatEstrutura, formatInversor, formatRede, formatCurrency, formatPotencia, formatDateTime, formatStatus } from '@/src/utils/formatters'

interface KitEntry {
  id: string
  kitNumber?: number
  kitReference?: string
  potenciaPico?: number
  potenciaPlaca?: number
  tipoInversor?: string
  tipoEstrutura?: string
  tipoRede?: string
  valorTotal?: number
  statusKit?: string
  detalhes?: any
  itens?: any
  created_at?: any
  observacoes?: string[]
}

export default function KitHistorico() {
  const [list, setList] = useState<KitEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<KitEntry | null>(null)
  useEffect(() => {
    if (!selected) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selected])

  useEffect(() => { fetchList() }, [])

  async function fetchList() {
    try {
      setLoading(true)
      const r = await fetch('/api/kits-historico')
      if (r.ok) {
        const data = await r.json()
        if (data.success && Array.isArray(data.kits)) {
          setList(data.kits)
          setWarning(null)
        } else {
          console.warn('kits-historico: unexpected response shape', data)
          setList([])
          setWarning(data.error || 'Erro ao carregar histórico')
        }
      } else {
        console.error('Failed to fetch kits historico', await r.text())
        setWarning('Erro ao conectar com o servidor')
      }
    } catch (e) {
      console.error('Error fetching kits historico', e)
      setWarning('Erro ao carregar histórico')
    } finally { setLoading(false) }
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Histórico de Kits</h3>
        <button 
          onClick={fetchList}
          className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          disabled={loading}
        >
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>
      
      {loading && <div className="text-center py-4">Carregando...</div>}
      {!loading && (!Array.isArray(list) || list.length === 0) && <div className="text-sm text-neutral-500 text-center py-4">Nenhum kit encontrado no histórico.</div>}
      {warning && <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 p-2 rounded">{warning}</div>}
      
      <div className="space-y-4">
        {Array.isArray(list) && list.map((item) => (
          <div key={item.id} className="border rounded-lg p-4 bg-white hover:shadow-sm transition">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold text-blue-600">{item.kitReference}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    item.statusKit === 'Completo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {formatStatus(item.statusKit || '')}
                  </span>
                  {((item as any).origin) && (
                    <span className="px-2 py-1 text-xs rounded-full bg-neutral-100 text-neutral-700">{(item as any).origin}</span>
                  )}
                </div>
                <div className="text-xs text-neutral-500 mb-2">
                  {item.createdAt ? formatDateTime(item.createdAt) : (item.created_at ? formatDateTime(item.created_at) : '—')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">
                  {item.valorTotal ? formatCurrency(item.valorTotal) : '—'}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
              <div>
                <div className="text-xs text-neutral-500">Potência</div>
                <div className="font-medium">{formatPotencia(item.potenciaPico || 0)}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500">Placa</div>
                <div className="font-medium">{formatPotencia(item.potenciaPlaca || 0, 'W')}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500">Inversor</div>
                <div className="font-medium">{formatInversor(item.tipoInversor || '')}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500">Estrutura</div>
                <div className="font-medium">{formatEstrutura(item.tipoEstrutura || '')}</div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                className="text-xs px-3 py-1 border rounded hover:bg-blue-50 text-blue-700"
                onClick={() => setSelected(item)}
              >
                Ver Detalhes
              </button>
              <button
                className="text-xs px-3 py-1 border rounded hover:bg-red-50 text-red-700"
                onClick={async () => {
                  try {
                    const origin = (item as any).origin || undefined
                    const r = await fetch(`/api/kits-historico?id=${encodeURIComponent(item.id)}${origin ? `&origin=${origin}` : ''}`, { method: 'DELETE' })
                    if (r.ok) { fetchList() } else { setWarning('Falha ao excluir registro') }
                  } catch { setWarning('Erro ao excluir registro') }
                }}
              >
                Excluir
              </button>
            </div>
            
            {selected && selected.id === item.id && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)}></div>
                <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl border">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-sm text-neutral-500">{item.kitReference}</div>
                      <div className="text-xs text-neutral-400">{item.createdAt ? formatDateTime(item.createdAt) : (item.created_at ? formatDateTime(item.created_at) : '—')}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-2">
                        <div className="text-xs text-neutral-500">Valor Total</div>
                        <div className="text-lg font-bold text-green-600">{item.valorTotal ? formatCurrency(item.valorTotal) : '—'}</div>
                      </div>
                      <button className="p-2 rounded-md border hover:bg-neutral-50" onClick={() => navigator.clipboard.writeText(String(item.kitReference || ''))}><Copy className="h-4 w-4" /></button>
                      <button className="p-2 rounded-md border hover:bg-neutral-50" onClick={() => setSelected(null)}><X className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <div className="text-xs text-neutral-500">Potência</div>
                      <div className="font-medium">{formatPotencia(item.potenciaPico || 0)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-neutral-500">Placa</div>
                      <div className="font-medium">{formatPotencia(item.potenciaPlaca || 0, 'W')}</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500">Inversor</div>
                      <div className="font-medium">{formatInversor(item.tipoInversor || '')}</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500">Estrutura</div>
                      <div className="font-medium">{formatEstrutura(item.tipoEstrutura || '')}</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="font-semibold mb-2">Itens</div>
                    <div className="divide-y rounded-md border">
                      {item.itens?.map((ic: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-2">
                          <div className="text-sm">
                            <div className="font-medium">{ic.categoria}</div>
                            <div className="text-neutral-600">{ic.descricao}</div>
                          </div>
                          <div className="text-sm font-semibold">{ic.precoTotal ? formatCurrency(ic.precoTotal) : ''}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {item.observacoes && item.observacoes.length > 0 && (
                    <div className="mt-3">
                      <div className="font-semibold mb-2">Observações</div>
                      <div className="space-y-1 text-sm">
                        {item.observacoes.map((obs: string, idx: number) => (
                          <div key={idx} className="text-neutral-700">• {obs}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      className="px-3 py-2 rounded-md border text-red-700 hover:bg-red-50 flex items-center gap-1"
                      onClick={async () => {
                        try {
                          const origin = (item as any).origin || undefined
                          const r = await fetch(`/api/kits-historico?id=${encodeURIComponent(item.id)}${origin ? `&origin=${origin}` : ''}`, { method: 'DELETE' })
                          if (r.ok) { setSelected(null); fetchList() } else { setWarning('Falha ao excluir registro') }
                        } catch { setWarning('Erro ao excluir registro') }
                      }}
                    >
                      <Trash2 className="h-4 w-4" /> Excluir
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
