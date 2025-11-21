import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function printWindow() {
  window.print()
}

export function exportInvoicePdf(opts: {
  shopName: string
  invoiceNumber: string
  datetime: string
  items: { name: string; quantity: number; unitPrice: number; lineDiscount: number; lineTotal: number }[]
  subtotal: number
  productDiscountTotal: number
  invoiceDiscountMode: 'flat' | 'percent'
  invoiceDiscountValue: number
  invoiceDiscountAmount: number
  total: number
  paymentType: string
  cashier: string
  customerName?: string
  barcodeDataUrl?: string
}) {
  const doc = new jsPDF()
  let y = 10

  doc.setFontSize(16)
  doc.text(opts.shopName || 'Shop POS', 10, y)
  y += 8

  doc.setFontSize(11)
  doc.text(`Invoice: ${opts.invoiceNumber}`, 10, y)
  y += 6
  doc.text(`Date: ${new Date(opts.datetime).toLocaleString()}`, 10, y)
  y += 6
  if (opts.customerName) {
    doc.text(`Customer: ${opts.customerName}`, 10, y)
    y += 6
  }
  doc.text(`Cashier: ${opts.cashier}`, 10, y)
  y += 10

  if (opts.barcodeDataUrl) {
    try {
      doc.addImage(opts.barcodeDataUrl, 'PNG', 140, 10, 60, 20)
    } catch {
      // ignore barcode image errors
    }
  }

  doc.setFontSize(12)
  doc.text('Items', 10, y)
  y += 6
  doc.setFontSize(10)
  doc.text('Name', 10, y)
  doc.text('Qty', 65, y)
  doc.text('Price', 100, y)
  doc.text('Discount', 130, y)
  doc.text('Subtotal', 170, y)
  y += 4
  doc.line(10, y, 200, y)
  y += 5

  opts.items.forEach((it) => {
    doc.text(it.name, 10, y)
    doc.text(String(it.quantity), 65, y)
    doc.text(`₹${it.unitPrice.toFixed(2)}`, 100, y)
    doc.text(`₹${it.lineDiscount.toFixed(2)}`, 130, y)
    doc.text(`₹${it.lineTotal.toFixed(2)}`, 170, y)
    y += 6
  })

  y += 2
  doc.line(10, y, 200, y)
  y += 8
  doc.setFontSize(12)
  doc.text(`Payment: ${opts.paymentType}`, 10, y)
  y += 6
  doc.setFontSize(11)
  doc.text(`Subtotal: ₹${opts.subtotal.toFixed(2)}`, 10, y)
  y += 6
  doc.text(`Product Discounts: ₹${opts.productDiscountTotal.toFixed(2)}`, 10, y)
  y += 6
  doc.text(
    `Invoice Discount (${opts.invoiceDiscountMode === 'percent' ? opts.invoiceDiscountValue + '%' : '₹' + opts.invoiceDiscountValue.toFixed(2)}): ₹${opts.invoiceDiscountAmount.toFixed(2)}`,
    10,
    y,
  )
  y += 6
  doc.setFontSize(12)
  doc.text(`Grand Total: ₹${opts.total.toFixed(2)}`, 10, y)
  y += 10
  doc.setFontSize(11)
  doc.text('Thank you for your purchase!', 10, y)

  doc.save(`${opts.invoiceNumber}.pdf`)
}

function getLastAutoTableFinalY(doc: jsPDF, fallback: number) {
  const tableInfo = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable
  if (tableInfo && typeof tableInfo.finalY === 'number') {
    return tableInfo.finalY
  }
  return fallback
}

export function exportRefundPdf(opts: {
  storeName: string
  refundId: string
  invoiceNumber: string
  refundType: string
  refundMethod: string
  refundReason?: string
  cashier: string
  refundDate: string
  refundedItems: { name: string; quantity: number; unitPrice: number; lineTotal: number }[]
  exchangedItems?: { name: string; quantity: number; unitPrice: number; lineTotal: number }[]
  totalRefund: number
  exchangeDifference?: number
}) {
  const doc = new jsPDF()
  let cursorY = 12

  doc.setFontSize(16)
  doc.text(opts.storeName || 'Store POS', 10, cursorY)
  cursorY += 8

  doc.setFontSize(12)
  doc.text(`Refund Receipt`, 10, cursorY)
  cursorY += 6
  doc.setFontSize(10)
  doc.text(`Refund ID: ${opts.refundId}`, 10, cursorY)
  cursorY += 5
  doc.text(`Invoice: ${opts.invoiceNumber}`, 10, cursorY)
  cursorY += 5
  doc.text(`Type: ${opts.refundType}`, 10, cursorY)
  cursorY += 5
  doc.text(`Method: ${opts.refundMethod}`, 10, cursorY)
  cursorY += 5
  doc.text(`Cashier: ${opts.cashier}`, 10, cursorY)
  cursorY += 5
  doc.text(`Date: ${new Date(opts.refundDate).toLocaleString()}`, 10, cursorY)
  cursorY += 5
  if (opts.refundReason) {
    doc.text(`Reason: ${opts.refundReason}`, 10, cursorY)
    cursorY += 5
  }

  cursorY += 3

  autoTable(doc, {
    startY: cursorY,
    head: [['Item', 'Qty', 'Unit Price', 'Subtotal']],
    body: opts.refundedItems.map((item) => [
      item.name,
      String(item.quantity),
      `₹${item.unitPrice.toFixed(2)}`,
      `₹${item.lineTotal.toFixed(2)}`,
    ]),
    styles: { fontSize: 9 },
    theme: 'grid',
    headStyles: { fillColor: [255, 102, 0] },
  })

  cursorY = getLastAutoTableFinalY(doc, cursorY) + 6

  if (opts.exchangedItems && opts.exchangedItems.length) {
    doc.setFontSize(11)
    doc.text('Replacement Items', 10, cursorY)
    cursorY += 3

    autoTable(doc, {
      startY: cursorY,
      head: [['Item', 'Qty', 'Unit Price', 'Subtotal']],
      body: opts.exchangedItems.map((item) => [
        item.name,
        String(item.quantity),
        `₹${item.unitPrice.toFixed(2)}`,
        `₹${item.lineTotal.toFixed(2)}`,
      ]),
      styles: { fontSize: 9 },
      theme: 'grid',
      headStyles: { fillColor: [54, 162, 235] },
    })

    cursorY = getLastAutoTableFinalY(doc, cursorY) + 6
  }

  doc.setFontSize(12)
  doc.text(`Total Refund: ₹${opts.totalRefund.toFixed(2)}`, 10, cursorY)
  cursorY += 6

  if (typeof opts.exchangeDifference === 'number' && opts.exchangeDifference !== 0) {
    const label =
      opts.exchangeDifference > 0
        ? `Balance to Customer: ₹${opts.exchangeDifference.toFixed(2)}`
        : `Customer Pays: ₹${Math.abs(opts.exchangeDifference).toFixed(2)}`
    doc.text(label, 10, cursorY)
    cursorY += 6
  }

  doc.setFontSize(10)
  doc.text('Thank you for shopping with us.', 10, cursorY)

  doc.save(`${opts.refundId}.pdf`)
}

