import jsPDF from 'jspdf'

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

