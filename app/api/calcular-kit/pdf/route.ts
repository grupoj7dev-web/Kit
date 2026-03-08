// @ts-nocheck
import PDFDocument from 'pdfkit'
import { NextRequest } from 'next/server'

// Helper to stream PDFDocument into a Buffer
function renderPdfBuffer(doc: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', (err: any) => reject(err))
    doc.end()
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const doc = new PDFDocument({ margin: 40, size: 'A4' })

    // Simple header
    doc.fontSize(18).text('Relatório do Kit Fotovoltaico', { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(10).text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' })
    doc.moveDown(1)

    // Resumo técnico
    doc.fontSize(12).text('Resumo Técnico', { underline: true })
    doc.moveDown(0.3)
    doc.fontSize(10)
    doc.text(`Potência total (kWp): ${body?.detalhes?.modulos?.potenciaTotal ?? ''}`)
    doc.text(`Módulos: ${body?.detalhes?.modulos?.quantidade} x ${body?.detalhes?.modulos?.potencia} W`)
    doc.text(`Inversores: ${body?.detalhes?.componentes?.inversores?.descricao || ''}`)
    doc.text(`Valor estimado: R$ ${Number(body?.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    doc.moveDown(0.8)

    // Lista de Materiais
    doc.fontSize(12).text('Lista de Materiais', { underline: true })
    doc.moveDown(0.3)
    const itens = body?.itens || []
    itens.forEach((it: any) => {
      doc.fontSize(10).text(`${it.categoria}: ${it.descricao} — Qtde: ${it.quantidade}`)
    })

    doc.moveDown(0.6)
    if (body?.detalhes?.observacoes && body.detalhes.observacoes.length > 0) {
      doc.fontSize(12).text('Observações', { underline: true })
      doc.moveDown(0.2)
      body.detalhes.observacoes.forEach((o: string) => doc.fontSize(10).text('- ' + o))
    }

    doc.moveDown(0.8)
    doc.fontSize(12).text('Resumo de Custos', { underline: true })
    doc.moveDown(0.2)
    doc.fontSize(10).text(`Valor Total do Kit: R$ ${Number(body?.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)

    const buffer = await renderPdfBuffer(doc)

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="kit-fotovoltaico-${Date.now()}.pdf"`
      }
    })
  } catch (err) {
    console.error('Erro ao gerar PDF', err)
    return new Response(JSON.stringify({ error: 'Erro ao gerar PDF' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
