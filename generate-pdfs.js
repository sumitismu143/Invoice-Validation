const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'sample-invoices');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// ---- Invoice Data (mirrors data.js) ----
const VENDORS = {
  "V001": { name: "Rajesh Steel & Alloys Pvt. Ltd.", gstin: "27AABCR1234A1Z5", state: "Maharashtra", address: "Plot 42, MIDC Industrial Area, Nashik, Maharashtra - 422010" },
  "V002": { name: "Kumar Logistics Solutions", gstin: "29BBFKL5678B2Z3", state: "Karnataka", address: "No. 18, Peenya Industrial Estate, Bengaluru, Karnataka - 560058" },
  "V003": { name: "Patel Industrial Supplies", gstin: "24CDEPQ9012C3Z7", state: "Gujarat", address: "Survey No. 112, Vatva GIDC, Ahmedabad, Gujarat - 382445" },
  "V004": { name: "Singh Transport & Freight Co.", gstin: "07GHIST3456D4Z1", state: "Delhi", address: "B-34, Okhla Industrial Area Phase-II, New Delhi - 110020" },
  "V005": { name: "Gupta Packaging Materials", gstin: "09JKLMN7890E5Z9", state: "Uttar Pradesh", address: "A-7, Site IV, UPSIDC, Greater Noida, UP - 201306" },
  "V006": { name: "Sharma Electrical Components", gstin: "33OPQRS2345F6Z2", state: "Tamil Nadu", address: "Door No. 56, Ambattur Industrial Estate, Chennai, TN - 600058" }
};

const INVOICES = [
  {
    id: "INV-RS-2025-0451", poId: "PO-2025-1001", vendorId: "V001",
    invoiceDate: "26-Jul-2025", dueDate: "25-Aug-2025",
    items: [
      { code: "STL-001", desc: "MS Round Bar 12mm", qty: 50, unit: "MT", rate: 4850, amt: 242500 },
      { code: "STL-003", desc: "GI Pipe 2 inch", qty: 500, unit: "Pcs", rate: 385, amt: 192500 }
    ],
    subtotal: 435000, gstRate: 18, cgst: 39150, sgst: 39150, total: 513300
  },
  {
    id: "INV-KL-2025-0872", poId: "PO-2025-1002", vendorId: "V002",
    invoiceDate: "16-Aug-2025", dueDate: "31-Aug-2025",
    items: [
      { code: "LOG-001", desc: "Full Truck Load - Intra-State", qty: 12, unit: "Trip", rate: 29500, amt: 354000 },
      { code: "LOG-003", desc: "Warehouse Handling Charges", qty: 8000, unit: "Kg", rate: 3.50, amt: 28000 }
    ],
    subtotal: 382000, gstRate: 18, cgst: 34380, sgst: 34380, total: 450760
  },
  {
    id: "INV-PI-2025-0334", poId: "PO-2025-1003", vendorId: "V003",
    invoiceDate: "06-Aug-2025", dueDate: "05-Sep-2025",
    items: [
      { code: "IND-001", desc: "Safety Helmets ISI Mark", qty: 220, unit: "Pcs", rate: 420, amt: 92400 },
      { code: "IND-002", desc: "Industrial Gloves (Pair)", qty: 540, unit: "Pair", rate: 185, amt: 99900 },
      { code: "IND-003", desc: "Safety Goggles", qty: 150, unit: "Pcs", rate: 310, amt: 46500 }
    ],
    subtotal: 238800, gstRate: 12, cgst: 14328, sgst: 14328, total: 267456
  },
  {
    id: "INV-ST-2025-0567", poId: "PO-2025-1004", vendorId: "V004",
    invoiceDate: "21-Aug-2025", dueDate: "05-Oct-2025",
    items: [
      { code: "FRT-001", desc: "Inter-State Freight 20ft Container", qty: 10, unit: "Container", rate: 47500, amt: 475000 },
      { code: "FRT-002", desc: "Local Delivery (within 50km)", qty: 25, unit: "Trip", rate: 3500, amt: 87500 }
    ],
    subtotal: 562500, gstRate: 18, cgst: 50625, sgst: 50625, total: 663750
  },
  {
    id: "INV-GP-2025-0789", poId: "PO-2025-1005", vendorId: "V005",
    invoiceDate: "31-Jul-2025", dueDate: "30-Aug-2025",
    items: [
      { code: "PKG-001", desc: "Corrugated Box 18x12x10", qty: 5000, unit: "Pcs", rate: 42, amt: 210000 },
      { code: "PKG-002", desc: "Bubble Wrap Roll 1m x 100m", qty: 30, unit: "Roll", rate: 1850, amt: 55500 },
      { code: "PKG-003", desc: "Stretch Film 18 inch", qty: 50, unit: "Roll", rate: 680, amt: 34000 }
    ],
    subtotal: 299500, gstRate: 28, cgst: 41930, sgst: 41930, total: 383360
  },
  {
    id: "INV-SE-2025-0923", poId: "PO-2025-1006", vendorId: "V006",
    invoiceDate: "26-Aug-2025", dueDate: "25-Sep-2025",
    items: [
      { code: "ELC-001", desc: "MCB 32A Single Pole", qty: 100, unit: "Pcs", rate: 245, amt: 24500 },
      { code: "ELC-002", desc: "Copper Wire 4 sq mm (90m)", qty: 20, unit: "Coil", rate: 4800, amt: 96000 },
      { code: "ELC-003", desc: "LED Panel Light 40W", qty: 50, unit: "Pcs", rate: 1150, amt: 57500 }
    ],
    subtotal: 178000, gstRate: 18, cgst: 16020, sgst: 16020, total: 210040
  }
];

function fmt(n) {
  return n.toLocaleString('en-IN');
}

function generateInvoice(inv) {
  return new Promise((resolve) => {
    const vendor = VENDORS[inv.vendorId];
    const filePath = path.join(outputDir, `${inv.id}.pdf`);
    const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 50, right: 50 } });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const pageW = doc.page.width;
    const contentW = pageW - 100; // 50 margin each side

    // ===== HEADER BAR =====
    doc.rect(50, 40, contentW, 50).fill('#4F46E5');
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#FFFFFF').text('TAX INVOICE', 50, 53, { width: contentW, align: 'center' });

    // ===== VENDOR INFO =====
    let y = 110;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1F2937').text(vendor.name, 50, y);
    y += 20;
    doc.fontSize(9).font('Helvetica').fillColor('#4B5563').text(vendor.address, 50, y);
    y += 14;
    doc.text(`GSTIN: ${vendor.gstin}  |  State: ${vendor.state}`, 50, y);

    // ===== INVOICE META (right side) =====
    const metaX = 350;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#4F46E5').text('Invoice Details', metaX, 110);
    doc.moveTo(metaX, 122).lineTo(545, 122).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
    doc.fontSize(9).font('Helvetica').fillColor('#374151');
    doc.text(`Invoice #:`, metaX, 128);     doc.text(inv.id, metaX + 80, 128);
    doc.text(`Date:`, metaX, 142);           doc.text(inv.invoiceDate, metaX + 80, 142);
    doc.text(`Due Date:`, metaX, 156);       doc.text(inv.dueDate, metaX + 80, 156);
    doc.text(`PO Ref:`, metaX, 170);         doc.font('Helvetica-Bold').text(inv.poId, metaX + 80, 170);

    // ===== DIVIDER =====
    y = 195;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#D1D5DB').lineWidth(1).stroke();
    y += 12;

    // ===== BILL TO =====
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#4F46E5').text('Bill To:', 50, y);
    y += 14;
    doc.font('Helvetica-Bold').fillColor('#1F2937').fontSize(10).text('AAYS Advisory Private Limited', 50, y);
    y += 14;
    doc.font('Helvetica').fillColor('#4B5563').fontSize(9);
    doc.text('Tower B, 7th Floor, DLF Cyber City', 50, y); y += 12;
    doc.text('Gurugram, Haryana - 122002', 50, y); y += 12;
    doc.text('GSTIN: 06AAACA1234B1Z5', 50, y);
    y += 25;

    // ===== ITEMS TABLE HEADER =====
    const cols = { sno: 50, code: 75, desc: 135, qty: 290, unit: 335, rate: 380, amt: 460 };
    const colR = 545;

    doc.rect(50, y, contentW, 22).fill('#4F46E5');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.text('S.No', cols.sno + 4, y + 7);
    doc.text('Item Code', cols.code + 4, y + 7);
    doc.text('Description', cols.desc + 4, y + 7);
    doc.text('Qty', cols.qty + 4, y + 7);
    doc.text('Unit', cols.unit + 4, y + 7);
    doc.text('Rate (Rs.)', cols.rate + 4, y + 7);
    doc.text('Amount (Rs.)', cols.amt + 4, y + 7);
    y += 22;

    // ===== ITEMS ROWS =====
    inv.items.forEach((item, i) => {
      const rowH = 22;
      if (i % 2 === 0) {
        doc.rect(50, y, contentW, rowH).fill('#F5F3FF');
      }
      doc.fontSize(8.5).font('Helvetica').fillColor('#374151');
      doc.text(`${i + 1}`, cols.sno + 4, y + 7, { width: 20 });
      doc.font('Helvetica-Bold').text(item.code, cols.code + 4, y + 7, { width: 55 });
      doc.font('Helvetica').text(item.desc, cols.desc + 4, y + 7, { width: 150 });
      doc.text(`${fmt(item.qty)}`, cols.qty + 4, y + 7, { width: 40, align: 'right' });
      doc.text(item.unit, cols.unit + 4, y + 7, { width: 40 });
      doc.text(`${fmt(item.rate)}`, cols.rate + 4, y + 7, { width: 70, align: 'right' });
      doc.text(`${fmt(item.amt)}`, cols.amt + 4, y + 7, { width: 80, align: 'right' });
      y += rowH;
    });

    // ===== TABLE BOTTOM LINE =====
    y += 4;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#D1D5DB').lineWidth(1).stroke();
    y += 15;

    // ===== TOTALS =====
    const totalX = 370;
    const valX = 480;

    doc.fontSize(9).font('Helvetica').fillColor('#374151');
    doc.text('Subtotal:', totalX, y);
    doc.text(`Rs. ${fmt(inv.subtotal)}`, valX, y, { width: 65, align: 'right' });
    y += 16;

    doc.text(`CGST @ ${inv.gstRate / 2}%:`, totalX, y);
    doc.text(`Rs. ${fmt(inv.cgst)}`, valX, y, { width: 65, align: 'right' });
    y += 16;

    doc.text(`SGST @ ${inv.gstRate / 2}%:`, totalX, y);
    doc.text(`Rs. ${fmt(inv.sgst)}`, valX, y, { width: 65, align: 'right' });
    y += 20;

    // Grand total bar
    doc.rect(totalX - 10, y - 4, 200, 26).fill('#4F46E5');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.text('GRAND TOTAL:', totalX, y + 3);
    doc.text(`Rs. ${fmt(inv.total)}`, valX - 10, y + 3, { width: 85, align: 'right' });
    y += 40;

    // ===== AMOUNT IN WORDS =====
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#4F46E5').text('Amount in Words:', 50, y);
    doc.font('Helvetica').fillColor('#374151').text(numberToWords(inv.total) + ' Only', 140, y, { width: 400 });
    y += 25;

    // ===== TERMS =====
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
    y += 10;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#4B5563').text('Terms & Conditions:', 50, y);
    y += 12;
    doc.font('Helvetica').fontSize(7.5).fillColor('#6B7280');
    doc.text('1. Payment is due as per the agreed terms mentioned in the Purchase Order.', 50, y); y += 10;
    doc.text('2. Please quote the invoice number in all correspondence and payments.', 50, y); y += 10;
    doc.text('3. Goods once sold will not be taken back or exchanged.', 50, y); y += 10;
    doc.text('4. Interest @ 18% p.a. will be charged on overdue payments.', 50, y); y += 10;
    doc.text('5. Subject to jurisdiction of local courts.', 50, y);
    y += 25;

    // ===== BANK DETAILS =====
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#4F46E5').text('Bank Details:', 50, y);
    y += 12;
    doc.font('Helvetica').fontSize(7.5).fillColor('#374151');
    doc.text(`Account Name: ${vendor.name}`, 50, y); y += 10;
    doc.text('Bank: State Bank of India', 50, y); y += 10;
    doc.text('Account No: XXXX XXXX 4521', 50, y); y += 10;
    doc.text('IFSC: SBIN0001234', 50, y);

    // ===== SIGNATURE =====
    const sigY = y - 30;
    doc.fontSize(8).font('Helvetica').fillColor('#6B7280').text('For ' + vendor.name, 380, sigY, { width: 165, align: 'center' });
    doc.moveTo(400, sigY + 30).lineTo(535, sigY + 30).strokeColor('#9CA3AF').lineWidth(0.5).stroke();
    doc.text('Authorized Signatory', 380, sigY + 35, { width: 165, align: 'center' });

    // ===== FOOTER =====
    doc.fontSize(7).fillColor('#9CA3AF').text('This is a computer-generated invoice. No signature is required.', 50, doc.page.height - 50, { width: contentW, align: 'center' });

    doc.end();
    stream.on('finish', () => {
      console.log(`  Generated: ${inv.id}.pdf`);
      resolve(filePath);
    });
  });
}

// Simple number to words (for Indian amounts)
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero Rupees';

  let n = Math.floor(num);
  let result = '';

  if (n >= 10000000) { result += numberToWords(Math.floor(n / 10000000)).replace(' Rupees', '') + ' Crore '; n %= 10000000; }
  if (n >= 100000) { result += numberToWords(Math.floor(n / 100000)).replace(' Rupees', '') + ' Lakh '; n %= 100000; }
  if (n >= 1000) { result += numberToWords(Math.floor(n / 1000)).replace(' Rupees', '') + ' Thousand '; n %= 1000; }
  if (n >= 100) { result += ones[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
  if (n >= 20) { result += tens[Math.floor(n / 10)] + ' '; n %= 10; }
  if (n > 0) { result += ones[n] + ' '; }

  return 'Rupees ' + result.trim();
}

// ===== MAIN =====
async function main() {
  console.log('\nGenerating 6 sample invoice PDFs...\n');
  for (const inv of INVOICES) {
    await generateInvoice(inv);
  }
  console.log(`\nAll PDFs saved to: ${outputDir}\n`);
}

main();
