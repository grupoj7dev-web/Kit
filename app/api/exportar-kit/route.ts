export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server"
// pdfkit será carregado dinamicamente para evitar falha caso dependência não esteja instalada em build preview
let PDFKit: any
async function getPDF() {
  if (!PDFKit) {
    try {
      PDFKit = (await import('pdfkit')).default
    } catch (e) {
      throw new Error('Dependência pdfkit não encontrada. Instale para gerar PDF.')
    }
  }
  return PDFKit
}

// Espera receber via POST o objeto retornado de /api/calcular-kit (ou ao menos { itens, valorTotal, detalhes })
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { itens = [], valorTotal, detalhes, projeto } = body

  const PDFDocument = await getPDF()
  const buffers: Buffer[] = []
  const doc = new PDFDocument({ size: 'A4', margin: 40 })
  doc.on('data', (chunk: any) => buffers.push(chunk as Buffer))
    doc.on('end', () => {})

    doc.fontSize(18).text('Relatório do Kit Fotovoltaico', { align: 'center' })
    doc.moveDown(0.5)
    if (projeto?.cliente) {
      doc.fontSize(10).text(`Cliente: ${projeto.cliente}`)
    }
    if (projeto?.referencia) {
      doc.fontSize(10).text(`Referência: ${projeto.referencia}`)
    }
    doc.moveDown()

    // Resumo de módulos
    if (detalhes?.modulos) {
      const m = detalhes.modulos
      doc.fontSize(12).text(`Módulos: ${m.quantidade} x ${m.potencia} Wp (Total ${m.potenciaTotal} kWp)`)   
      doc.moveDown(0.5)
    }

    // Tabela de itens
    doc.fontSize(14).text('Itens do Kit', { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(10)
    itens.forEach((item: any) => {
      doc.text(`${item.categoria} - ${item.descricao}`)
      doc.text(`Quantidade: ${item.quantidade}`)
      if (item.precoUnit) doc.text(`Preço Unitário: R$ ${item.precoUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
      doc.text(`Subtotal: R$ ${item.precoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
      doc.moveDown(0.3)
    })

    doc.moveDown(0.5)
    doc.fontSize(12).text(`Valor Total: R$ ${Number(valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, { align: 'right' })

    if (detalhes?.observacoes?.length) {
      doc.addPage()
      doc.fontSize(14).text('Observações', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(10)
      detalhes.observacoes.forEach((o: string) => doc.text(`• ${o}`))
    }

    doc.end()

    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      const finalize = () => resolve(Buffer.concat(buffers as any))
      doc.on('end', finalize)
    })

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="kit-fotovoltaico.pdf"'
      }
    })
  } catch (e) {
    console.error('Erro ao gerar PDF', e)
    return NextResponse.json({ error: 'Erro ao gerar PDF' }, { status: 500 })
  }
}
