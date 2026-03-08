import React from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import KitHistorico from '@/components/kit-historico'

export default function HistoricoKitsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4">Histórico de Kits</h2>
        <KitHistorico />
      </div>
    </DashboardLayout>
  )
}
