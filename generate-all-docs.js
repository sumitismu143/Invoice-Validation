const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Create output directories
const dirs = ['sample-invoices', 'sample-purchase-orders', 'sample-contracts'];
dirs.forEach(d => {
  const p = path.join(__dirname, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

function fmt(n) { return n.toLocaleString('en-IN'); }

// ---- VENDORS ----
const VENDORS = {
  "V001": { name: "Rajesh Steel & Alloys Pvt. Ltd.", gstin: "27AABCR1234A1Z5", state: "Maharashtra", address: "Plot 42, MIDC Industrial Area, Nashik, Maharashtra - 422010", contact: "+91 98765 43210", email: "accounts@rajeshsteel.co.in" },
  "V002": { name: "Kumar Logistics Solutions", gstin: "29BBFKL5678B2Z3", state: "Karnataka", address: "No. 18, Peenya Industrial Estate, Bengaluru, Karnataka - 560058", contact: "+91 98234 56789", email: "billing@kumarlogistics.in" },
  "V003": { name: "Patel Industrial Supplies", gstin: "24CDEPQ9012C3Z7", state: "Gujarat", address: "Survey No. 112, Vatva GIDC, Ahmedabad, Gujarat - 382445", contact: "+91 97654 32100", email: "sales@patelindustrial.com" },
  "V004": { name: "Singh Transport & Freight Co.", gstin: "07GHIST3456D4Z1", state: "Delhi", address: "B-34, Okhla Industrial Area Phase-II, New Delhi - 110020", contact: "+91 99887 76655", email: "ops@singhtransport.in" },
  "V005": { name: "Gupta Packaging Materials", gstin: "09JKLMN7890E5Z9", state: "Uttar Pradesh", address: "A-7, Site IV, UPSIDC, Greater Noida, UP - 201306", contact: "+91 98112 33445", email: "orders@guptapackaging.com" },
  "V006": { name: "Sharma Electrical Components", gstin: "33OPQRS2345F6Z2", state: "Tamil Nadu", address: "Door No. 56, Ambattur Industrial Estate, Chennai, TN - 600058", contact: "+91 94433 22110", email: "finance@sharmaelectrical.in" }
};

const BUYER = { name: "AAYS Advisory Private Limited", address: "Tower B, 7th Floor, DLF Cyber City, Gurugram, Haryana - 122002", gstin: "06AAACA1234B1Z5", contact: "+91 124 4567890", email: "procurement@aays.com" };

// ---- CONTRACTS ----
const CONTRACTS = [
  {
    id: "CON-2025-001", vendorId: "V001", startDate: "01-Jan-2025", endDate: "31-Dec-2025",
    items: [
      { code: "STL-001", desc: "MS Round Bar 12mm", unitPrice: 4850, unit: "MT", minQty: 10, maxQty: 500 },
      { code: "STL-002", desc: "SS Flat Bar 25mm", unitPrice: 12200, unit: "MT", minQty: 5, maxQty: 200 },
      { code: "STL-003", desc: "GI Pipe 2 inch", unitPrice: 385, unit: "Pcs", minQty: 100, maxQty: 5000 }
    ],
    paymentTerms: "Net 30", gstRate: 18, priceTolerance: "2%", qtyTolerance: "5%"
  },
  {
    id: "CON-2025-002", vendorId: "V002", startDate: "01-Jan-2025", endDate: "31-Dec-2025",
    items: [
      { code: "LOG-001", desc: "Full Truck Load - Intra-State", unitPrice: 28000, unit: "Trip", minQty: 1, maxQty: 100 },
      { code: "LOG-002", desc: "Part Truck Load - Intra-State", unitPrice: 14500, unit: "Trip", minQty: 1, maxQty: 200 },
      { code: "LOG-003", desc: "Warehouse Handling Charges", unitPrice: 3.50, unit: "Kg", minQty: 500, maxQty: 50000 }
    ],
    paymentTerms: "Net 15", gstRate: 18, priceTolerance: "2%", qtyTolerance: "5%"
  },
  {
    id: "CON-2025-003", vendorId: "V003", startDate: "01-Feb-2025", endDate: "31-Jan-2026",
    items: [
      { code: "IND-001", desc: "Safety Helmets ISI Mark", unitPrice: 420, unit: "Pcs", minQty: 50, maxQty: 2000 },
      { code: "IND-002", desc: "Industrial Gloves (Pair)", unitPrice: 185, unit: "Pair", minQty: 100, maxQty: 5000 },
      { code: "IND-003", desc: "Safety Goggles", unitPrice: 310, unit: "Pcs", minQty: 50, maxQty: 1000 }
    ],
    paymentTerms: "Net 30", gstRate: 12, priceTolerance: "2%", qtyTolerance: "5%"
  },
  {
    id: "CON-2025-004", vendorId: "V004", startDate: "01-Mar-2025", endDate: "28-Feb-2026",
    items: [
      { code: "FRT-001", desc: "Inter-State Freight 20ft Container", unitPrice: 45000, unit: "Container", minQty: 1, maxQty: 50 },
      { code: "FRT-002", desc: "Local Delivery (within 50km)", unitPrice: 3500, unit: "Trip", minQty: 1, maxQty: 300 },
      { code: "FRT-003", desc: "Loading/Unloading Labor", unitPrice: 12, unit: "Kg", minQty: 100, maxQty: 20000 }
    ],
    paymentTerms: "Net 45", gstRate: 18, priceTolerance: "2%", qtyTolerance: "5%"
  },
  {
    id: "CON-2025-005", vendorId: "V005", startDate: "15-Jan-2025", endDate: "31-Dec-2025",
    items: [
      { code: "PKG-001", desc: "Corrugated Box 18x12x10", unitPrice: 42, unit: "Pcs", minQty: 500, maxQty: 20000 },
      { code: "PKG-002", desc: "Bubble Wrap Roll 1m x 100m", unitPrice: 1850, unit: "Roll", minQty: 10, maxQty: 500 },
      { code: "PKG-003", desc: "Stretch Film 18 inch", unitPrice: 680, unit: "Roll", minQty: 20, maxQty: 1000 }
    ],
    paymentTerms: "Net 30", gstRate: 18, priceTolerance: "2%", qtyTolerance: "5%"
  },
  {
    id: "CON-2025-006", vendorId: "V006", startDate: "01-Apr-2025", endDate: "31-Mar-2026",
    items: [
      { code: "ELC-001", desc: "MCB 32A Single Pole", unitPrice: 245, unit: "Pcs", minQty: 20, maxQty: 1000 },
      { code: "ELC-002", desc: "Copper Wire 4 sq mm (90m)", unitPrice: 4800, unit: "Coil", minQty: 5, maxQty: 200 },
      { code: "ELC-003", desc: "LED Panel Light 40W", unitPrice: 1150, unit: "Pcs", minQty: 10, maxQty: 500 }
    ],
    paymentTerms: "Net 30", gstRate: 18, priceTolerance: "2%", qtyTolerance: "5%"
  }
];

// ---- PURCHASE ORDERS ----
const PURCHASE_ORDERS = [
  {
    id: "PO-2025-1001", contractId: "CON-2025-001", vendorId: "V001", date: "10-Jul-2025", deliveryDate: "25-Jul-2025",
    items: [
      { code: "STL-001", desc: "MS Round Bar 12mm", qty: 50, unit: "MT", rate: 4850, amt: 242500 },
      { code: "STL-003", desc: "GI Pipe 2 inch", qty: 500, unit: "Pcs", rate: 385, amt: 192500 }
    ],
    subtotal: 435000, gstRate: 18, gstAmt: 78300, total: 513300
  },
  {
    id: "PO-2025-1002", contractId: "CON-2025-002", vendorId: "V002", date: "01-Aug-2025", deliveryDate: "15-Aug-2025",
    items: [
      { code: "LOG-001", desc: "Full Truck Load - Intra-State", qty: 12, unit: "Trip", rate: 28000, amt: 336000 },
      { code: "LOG-003", desc: "Warehouse Handling Charges", qty: 8000, unit: "Kg", rate: 3.50, amt: 28000 }
    ],
    subtotal: 364000, gstRate: 18, gstAmt: 65520, total: 429520
  },
  {
    id: "PO-2025-1003", contractId: "CON-2025-003", vendorId: "V003", date: "20-Jul-2025", deliveryDate: "05-Aug-2025",
    items: [
      { code: "IND-001", desc: "Safety Helmets ISI Mark", qty: 200, unit: "Pcs", rate: 420, amt: 84000 },
      { code: "IND-002", desc: "Industrial Gloves (Pair)", qty: 500, unit: "Pair", rate: 185, amt: 92500 },
      { code: "IND-003", desc: "Safety Goggles", qty: 150, unit: "Pcs", rate: 310, amt: 46500 }
    ],
    subtotal: 223000, gstRate: 12, gstAmt: 26760, total: 249760
  },
  {
    id: "PO-2025-1004", contractId: "CON-2025-004", vendorId: "V004", date: "05-Aug-2025", deliveryDate: "20-Aug-2025",
    items: [
      { code: "FRT-001", desc: "Inter-State Freight 20ft Container", qty: 8, unit: "Container", rate: 45000, amt: 360000 },
      { code: "FRT-002", desc: "Local Delivery (within 50km)", qty: 25, unit: "Trip", rate: 3500, amt: 87500 }
    ],
    subtotal: 447500, gstRate: 18, gstAmt: 80550, total: 528050
  },
  {
    id: "PO-2025-1005", contractId: "CON-2025-005", vendorId: "V005", date: "15-Jul-2025", deliveryDate: "30-Jul-2025",
    items: [
      { code: "PKG-001", desc: "Corrugated Box 18x12x10", qty: 5000, unit: "Pcs", rate: 42, amt: 210000 },
      { code: "PKG-002", desc: "Bubble Wrap Roll 1m x 100m", qty: 30, unit: "Roll", rate: 1850, amt: 55500 },
      { code: "PKG-003", desc: "Stretch Film 18 inch", qty: 50, unit: "Roll", rate: 680, amt: 34000 }
    ],
    subtotal: 299500, gstRate: 18, gstAmt: 53910, total: 353410
  },
  {
    id: "PO-2025-1006", contractId: "CON-2025-006", vendorId: "V006", date: "10-Aug-2025", deliveryDate: "25-Aug-2025",
    items: [
      { code: "ELC-001", desc: "MCB 32A Single Pole", qty: 100, unit: "Pcs", rate: 245, amt: 24500 },
      { code: "ELC-002", desc: "Copper Wire 4 sq mm (90m)", qty: 20, unit: "Coil", rate: 4800, amt: 96000 },
      { code: "ELC-003", desc: "LED Panel Light 40W", qty: 50, unit: "Pcs", rate: 1150, amt: 57500 }
    ],
    subtotal: 178000, gstRate: 18, gstAmt: 32040, total: 210040
  }
];

// ---- INVOICES ----
const INVOICES = [
  { id: "INV-RS-2025-0451", poId: "PO-2025-1001", vendorId: "V001", invoiceDate: "26-Jul-2025", dueDate: "25-Aug-2025",
    items: [ { code: "STL-001", desc: "MS Round Bar 12mm", qty: 50, unit: "MT", rate: 4850, amt: 242500 }, { code: "STL-003", desc: "GI Pipe 2 inch", qty: 500, unit: "Pcs", rate: 385, amt: 192500 } ],
    subtotal: 435000, gstRate: 18, cgst: 39150, sgst: 39150, total: 513300 },
  { id: "INV-KL-2025-0872", poId: "PO-2025-1002", vendorId: "V002", invoiceDate: "16-Aug-2025", dueDate: "31-Aug-2025",
    items: [ { code: "LOG-001", desc: "Full Truck Load - Intra-State", qty: 12, unit: "Trip", rate: 29500, amt: 354000 }, { code: "LOG-003", desc: "Warehouse Handling Charges", qty: 8000, unit: "Kg", rate: 3.50, amt: 28000 } ],
    subtotal: 382000, gstRate: 18, cgst: 34380, sgst: 34380, total: 450760 },
  { id: "INV-PI-2025-0334", poId: "PO-2025-1003", vendorId: "V003", invoiceDate: "06-Aug-2025", dueDate: "05-Sep-2025",
    items: [ { code: "IND-001", desc: "Safety Helmets ISI Mark", qty: 220, unit: "Pcs", rate: 420, amt: 92400 }, { code: "IND-002", desc: "Industrial Gloves (Pair)", qty: 540, unit: "Pair", rate: 185, amt: 99900 }, { code: "IND-003", desc: "Safety Goggles", qty: 150, unit: "Pcs", rate: 310, amt: 46500 } ],
    subtotal: 238800, gstRate: 12, cgst: 14328, sgst: 14328, total: 267456 },
  { id: "INV-ST-2025-0567", poId: "PO-2025-1004", vendorId: "V004", invoiceDate: "21-Aug-2025", dueDate: "05-Oct-2025",
    items: [ { code: "FRT-001", desc: "Inter-State Freight 20ft Container", qty: 10, unit: "Container", rate: 47500, amt: 475000 }, { code: "FRT-002", desc: "Local Delivery (within 50km)", qty: 25, unit: "Trip", rate: 3500, amt: 87500 } ],
    subtotal: 562500, gstRate: 18, cgst: 50625, sgst: 50625, total: 663750 },
  { id: "INV-GP-2025-0789", poId: "PO-2025-1005", vendorId: "V005", invoiceDate: "31-Jul-2025", dueDate: "30-Aug-2025",
    items: [ { code: "PKG-001", desc: "Corrugated Box 18x12x10", qty: 5000, unit: "Pcs", rate: 42, amt: 210000 }, { code: "PKG-002", desc: "Bubble Wrap Roll 1m x 100m", qty: 30, unit: "Roll", rate: 1850, amt: 55500 }, { code: "PKG-003", desc: "Stretch Film 18 inch", qty: 50, unit: "Roll", rate: 680, amt: 34000 } ],
    subtotal: 299500, gstRate: 28, cgst: 41930, sgst: 41930, total: 383360 },
  { id: "INV-SE-2025-0923", poId: "PO-2025-1006", vendorId: "V006", invoiceDate: "26-Aug-2025", dueDate: "25-Sep-2025",
    items: [ { code: "ELC-001", desc: "MCB 32A Single Pole", qty: 100, unit: "Pcs", rate: 245, amt: 24500 }, { code: "ELC-002", desc: "Copper Wire 4 sq mm (90m)", qty: 20, unit: "Coil", rate: 4800, amt: 96000 }, { code: "ELC-003", desc: "LED Panel Light 40W", qty: 50, unit: "Pcs", rate: 1150, amt: 57500 } ],
    subtotal: 178000, gstRate: 18, cgst: 16020, sgst: 16020, total: 210040 }
];

// ============================================================
// PDF GENERATORS
// ============================================================

function drawHeader(doc, title, color) {
  const pageW = doc.page.width;
  doc.rect(50, 40, pageW - 100, 50).fill(color);
  doc.fontSize(22).font('Helvetica-Bold').fillColor('#FFFFFF').text(title, 50, 53, { width: pageW - 100, align: 'center' });
}

function drawBuyerVendor(doc, vendor, y) {
  // Vendor (left)
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#4F46E5').text('FROM (Vendor):', 50, y);
  y += 12;
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1F2937').text(vendor.name, 50, y);
  y += 15;
  doc.fontSize(8).font('Helvetica').fillColor('#4B5563');
  doc.text(vendor.address, 50, y, { width: 220 }); y += 22;
  doc.text(`GSTIN: ${vendor.gstin}`, 50, y); y += 10;
  doc.text(`Phone: ${vendor.contact}`, 50, y); y += 10;
  doc.text(`Email: ${vendor.email}`, 50, y);

  // Buyer (right)
  const rx = 330;
  let ry = y - 69;
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#4F46E5').text('TO (Buyer):', rx, ry);
  ry += 12;
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1F2937').text(BUYER.name, rx, ry);
  ry += 15;
  doc.fontSize(8).font('Helvetica').fillColor('#4B5563');
  doc.text(BUYER.address, rx, ry, { width: 220 }); ry += 22;
  doc.text(`GSTIN: ${BUYER.gstin}`, rx, ry); ry += 10;
  doc.text(`Phone: ${BUYER.contact}`, rx, ry); ry += 10;
  doc.text(`Email: ${BUYER.email}`, rx, ry);

  return y + 20;
}

function drawItemsTable(doc, items, cols, y, showQty = true) {
  const contentW = doc.page.width - 100;
  // Header
  doc.rect(50, y, contentW, 20).fill('#4F46E5');
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#FFFFFF');
  doc.text('S.No', cols.sno, y + 6);
  doc.text('Item Code', cols.code, y + 6);
  doc.text('Description', cols.desc, y + 6);
  if (showQty) doc.text('Qty', cols.qty, y + 6);
  doc.text('Unit', cols.unit, y + 6);
  doc.text('Rate (Rs.)', cols.rate, y + 6);
  if (showQty) doc.text('Amount (Rs.)', cols.amt, y + 6);
  y += 20;

  items.forEach((item, i) => {
    const rowH = 20;
    if (i % 2 === 0) doc.rect(50, y, contentW, rowH).fill('#F5F3FF');
    doc.fontSize(8).font('Helvetica').fillColor('#374151');
    doc.text(`${i + 1}`, cols.sno, y + 6, { width: 20 });
    doc.font('Helvetica-Bold').text(item.code, cols.code, y + 6, { width: 55 });
    doc.font('Helvetica').text(item.desc, cols.desc, y + 6, { width: 140 });
    if (showQty) doc.text(`${fmt(item.qty)}`, cols.qty, y + 6, { width: 40, align: 'right' });
    doc.text(item.unit, cols.unit, y + 6, { width: 40 });
    doc.text(`${fmt(item.rate || item.unitPrice)}`, cols.rate, y + 6, { width: 65, align: 'right' });
    if (showQty) doc.text(`${fmt(item.amt)}`, cols.amt, y + 6, { width: 75, align: 'right' });
    y += rowH;
  });

  return y + 5;
}

// ===== GENERATE CONTRACT PDF =====
function generateContract(contract) {
  return new Promise((resolve) => {
    const vendor = VENDORS[contract.vendorId];
    const filePath = path.join(__dirname, 'sample-contracts', `${contract.id}.pdf`);
    const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 50, right: 50 } });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const contentW = doc.page.width - 100;

    // Header
    drawHeader(doc, 'SUPPLY CONTRACT AGREEMENT', '#1E40AF');

    // Contract meta
    let y = 105;
    doc.rect(50, y, contentW, 30).fill('#EFF6FF');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1E40AF');
    doc.text(`Contract #: ${contract.id}`, 60, y + 10);
    doc.text(`Valid: ${contract.startDate} to ${contract.endDate}`, 250, y + 10);
    doc.text(`Payment: ${contract.paymentTerms}`, 430, y + 10);
    y += 45;

    // Parties
    y = drawBuyerVendor(doc, vendor, y);
    y += 5;

    // Divider
    doc.moveTo(50, y).lineTo(50 + contentW, y).strokeColor('#D1D5DB').lineWidth(1).stroke();
    y += 15;

    // Terms section
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1E40AF').text('1. SCOPE OF AGREEMENT', 50, y);
    y += 16;
    doc.fontSize(8.5).font('Helvetica').fillColor('#374151');
    doc.text(`This agreement governs the supply of goods/services by ${vendor.name} to ${BUYER.name} for the period ${contract.startDate} to ${contract.endDate}, subject to the terms and conditions set forth herein.`, 50, y, { width: contentW });
    y += 30;

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1E40AF').text('2. CONTRACTED ITEMS & PRICING', 50, y);
    y += 16;

    // Items table (no qty, show min/max range)
    doc.rect(50, y, contentW, 20).fill('#1E40AF');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.text('S.No', 55, y + 6);
    doc.text('Item Code', 75, y + 6);
    doc.text('Description', 130, y + 6);
    doc.text('Unit', 280, y + 6);
    doc.text('Rate (Rs.)', 320, y + 6);
    doc.text('Min Qty', 400, y + 6);
    doc.text('Max Qty', 460, y + 6);
    y += 20;

    contract.items.forEach((item, i) => {
      if (i % 2 === 0) doc.rect(50, y, contentW, 20).fill('#EFF6FF');
      doc.fontSize(8).font('Helvetica').fillColor('#374151');
      doc.text(`${i + 1}`, 55, y + 6);
      doc.font('Helvetica-Bold').text(item.code, 75, y + 6);
      doc.font('Helvetica').text(item.desc, 130, y + 6, { width: 145 });
      doc.text(item.unit, 280, y + 6);
      doc.text(`${fmt(item.unitPrice)}`, 320, y + 6, { width: 65, align: 'right' });
      doc.text(`${fmt(item.minQty)}`, 400, y + 6, { width: 45, align: 'right' });
      doc.text(`${fmt(item.maxQty)}`, 460, y + 6, { width: 45, align: 'right' });
      y += 20;
    });

    y += 10;

    // Tolerance & GST
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1E40AF').text('3. TOLERANCE & TAX', 50, y);
    y += 16;
    doc.fontSize(8.5).font('Helvetica').fillColor('#374151');
    doc.text(`• Price Tolerance: ${contract.priceTolerance} (deviations beyond this require prior approval)`, 60, y); y += 12;
    doc.text(`• Quantity Tolerance: ${contract.qtyTolerance} (deviations beyond this require prior approval)`, 60, y); y += 12;
    doc.text(`• Applicable GST Rate: ${contract.gstRate}% (CGST ${contract.gstRate/2}% + SGST ${contract.gstRate/2}%)`, 60, y); y += 20;

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1E40AF').text('4. PAYMENT TERMS', 50, y);
    y += 16;
    doc.fontSize(8.5).font('Helvetica').fillColor('#374151');
    doc.text(`• Payment to be made within ${contract.paymentTerms} days from date of invoice receipt.`, 60, y); y += 12;
    doc.text('• All payments via NEFT/RTGS to the vendor bank account on file.', 60, y); y += 12;
    doc.text('• Late payment attracts interest @ 18% per annum.', 60, y); y += 20;

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1E40AF').text('5. GENERAL TERMS', 50, y);
    y += 16;
    doc.fontSize(8.5).font('Helvetica').fillColor('#374151');
    doc.text('• Vendor shall maintain quality standards as per ISI/BIS specifications.', 60, y); y += 12;
    doc.text('• Delivery timelines to be adhered as per individual Purchase Orders.', 60, y); y += 12;
    doc.text('• Any disputes shall be subject to arbitration under Indian Arbitration Act.', 60, y); y += 12;
    doc.text('• This contract is governed by the laws of India.', 60, y); y += 30;

    // Signatures
    doc.moveTo(50, y).lineTo(50 + contentW, y).strokeColor('#D1D5DB').lineWidth(0.5).stroke();
    y += 20;

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#374151');
    doc.text(`For ${BUYER.name}`, 50, y, { width: 200, align: 'center' });
    doc.text(`For ${vendor.name}`, 320, y, { width: 200, align: 'center' });
    y += 30;
    doc.moveTo(70, y).lineTo(230, y).stroke();
    doc.moveTo(340, y).lineTo(500, y).stroke();
    y += 5;
    doc.fontSize(7).font('Helvetica').fillColor('#6B7280');
    doc.text('Authorized Signatory', 50, y, { width: 200, align: 'center' });
    doc.text('Authorized Signatory', 320, y, { width: 200, align: 'center' });

    doc.end();
    stream.on('finish', () => { console.log(`  Contract: ${contract.id}.pdf`); resolve(); });
  });
}

// ===== GENERATE PO PDF =====
function generatePO(po) {
  return new Promise((resolve) => {
    const vendor = VENDORS[po.vendorId];
    const filePath = path.join(__dirname, 'sample-purchase-orders', `${po.id}.pdf`);
    const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 50, right: 50 } });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const contentW = doc.page.width - 100;

    // Header
    drawHeader(doc, 'PURCHASE ORDER', '#047857');

    // PO meta
    let y = 105;
    doc.rect(50, y, contentW, 30).fill('#ECFDF5');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#047857');
    doc.text(`PO #: ${po.id}`, 60, y + 10);
    doc.text(`Date: ${po.date}`, 200, y + 10);
    doc.text(`Delivery By: ${po.deliveryDate}`, 330, y + 10);
    y += 45;

    doc.fontSize(8).font('Helvetica').fillColor('#6B7280');
    doc.text(`Contract Ref: ${po.contractId}`, 50, y);
    y += 15;

    // Parties
    y = drawBuyerVendor(doc, vendor, y);
    y += 5;

    doc.moveTo(50, y).lineTo(50 + contentW, y).strokeColor('#D1D5DB').lineWidth(1).stroke();
    y += 15;

    // Items
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#047857').text('ORDER DETAILS', 50, y);
    y += 16;

    const cols = { sno: 55, code: 75, desc: 135, qty: 285, unit: 330, rate: 370, amt: 450 };
    y = drawItemsTable(doc, po.items, cols, y, true);

    y += 5;
    doc.moveTo(50, y).lineTo(50 + contentW, y).strokeColor('#D1D5DB').lineWidth(1).stroke();
    y += 12;

    // Totals
    const tx = 370;
    doc.fontSize(9).font('Helvetica').fillColor('#374151');
    doc.text('Subtotal:', tx, y); doc.text(`Rs. ${fmt(po.subtotal)}`, 470, y, { width: 75, align: 'right' }); y += 15;
    doc.text(`CGST @ ${po.gstRate/2}%:`, tx, y); doc.text(`Rs. ${fmt(po.gstAmt/2)}`, 470, y, { width: 75, align: 'right' }); y += 15;
    doc.text(`SGST @ ${po.gstRate/2}%:`, tx, y); doc.text(`Rs. ${fmt(po.gstAmt/2)}`, 470, y, { width: 75, align: 'right' }); y += 18;

    doc.rect(tx - 10, y - 4, 190, 24).fill('#047857');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.text('TOTAL:', tx, y + 2);
    doc.text(`Rs. ${fmt(po.total)}`, 460, y + 2, { width: 85, align: 'right' });
    y += 35;

    // Terms
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#047857').text('TERMS & CONDITIONS:', 50, y);
    y += 14;
    doc.fontSize(8).font('Helvetica').fillColor('#4B5563');
    doc.text('1. This Purchase Order is subject to the terms of the referenced Contract.', 60, y); y += 11;
    doc.text(`2. Delivery must be completed by ${po.deliveryDate}. Late delivery penalties may apply.`, 60, y); y += 11;
    doc.text('3. Invoice to be submitted with reference to this PO number.', 60, y); y += 11;
    doc.text('4. Quality must conform to specifications mentioned in the Contract.', 60, y); y += 11;
    doc.text('5. AAYS Advisory reserves the right to inspect goods upon delivery.', 60, y); y += 25;

    // Signature
    doc.moveTo(50, y).lineTo(50 + contentW, y).strokeColor('#D1D5DB').lineWidth(0.5).stroke();
    y += 15;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#374151');
    doc.text(`Approved By: Procurement Head`, 50, y);
    doc.text(`For ${BUYER.name}`, 350, y);
    y += 25;
    doc.moveTo(350, y).lineTo(510, y).stroke();
    y += 5;
    doc.fontSize(7).font('Helvetica').fillColor('#6B7280').text('Authorized Signatory', 350, y, { width: 160, align: 'center' });

    doc.end();
    stream.on('finish', () => { console.log(`  PO: ${po.id}.pdf`); resolve(); });
  });
}

// ===== GENERATE INVOICE PDF =====
function generateInvoice(inv) {
  return new Promise((resolve) => {
    const vendor = VENDORS[inv.vendorId];
    const filePath = path.join(__dirname, 'sample-invoices', `${inv.id}.pdf`);
    const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 50, right: 50 } });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const contentW = doc.page.width - 100;

    // Header
    drawHeader(doc, 'TAX INVOICE', '#4F46E5');

    // Invoice meta
    let y = 105;
    doc.rect(50, y, contentW, 30).fill('#F5F3FF');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#4F46E5');
    doc.text(`Invoice #: ${inv.id}`, 60, y + 10);
    doc.text(`Date: ${inv.invoiceDate}`, 220, y + 10);
    doc.text(`Due: ${inv.dueDate}  |  PO Ref: ${inv.poId}`, 350, y + 10);
    y += 45;

    // Parties
    y = drawBuyerVendor(doc, vendor, y);
    y += 5;
    doc.moveTo(50, y).lineTo(50 + contentW, y).strokeColor('#D1D5DB').lineWidth(1).stroke();
    y += 15;

    // Items
    const cols = { sno: 55, code: 75, desc: 135, qty: 285, unit: 330, rate: 370, amt: 450 };
    y = drawItemsTable(doc, inv.items, cols, y, true);

    y += 5;
    doc.moveTo(50, y).lineTo(50 + contentW, y).strokeColor('#D1D5DB').lineWidth(1).stroke();
    y += 12;

    // Totals
    const tx = 370;
    doc.fontSize(9).font('Helvetica').fillColor('#374151');
    doc.text('Subtotal:', tx, y); doc.text(`Rs. ${fmt(inv.subtotal)}`, 470, y, { width: 75, align: 'right' }); y += 15;
    doc.text(`CGST @ ${inv.gstRate/2}%:`, tx, y); doc.text(`Rs. ${fmt(inv.cgst)}`, 470, y, { width: 75, align: 'right' }); y += 15;
    doc.text(`SGST @ ${inv.gstRate/2}%:`, tx, y); doc.text(`Rs. ${fmt(inv.sgst)}`, 470, y, { width: 75, align: 'right' }); y += 18;

    doc.rect(tx - 10, y - 4, 190, 24).fill('#4F46E5');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.text('TOTAL:', tx, y + 2);
    doc.text(`Rs. ${fmt(inv.total)}`, 460, y + 2, { width: 85, align: 'right' });
    y += 35;

    // Terms
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#4B5563').text('Terms & Conditions:', 50, y); y += 12;
    doc.fontSize(7.5).font('Helvetica').fillColor('#6B7280');
    doc.text('1. Payment due as per PO terms.  2. Quote invoice # in correspondence.  3. Subject to local jurisdiction.', 50, y, { width: contentW });
    y += 20;

    // Bank + Signature
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#4F46E5').text('Bank Details:', 50, y); y += 12;
    doc.font('Helvetica').fontSize(7.5).fillColor('#374151');
    doc.text(`Account: ${vendor.name} | Bank: SBI | A/C: XXXX4521 | IFSC: SBIN0001234`, 50, y);

    doc.fontSize(8).font('Helvetica').fillColor('#6B7280').text(`For ${vendor.name}`, 380, y - 12, { width: 165, align: 'center' });
    doc.moveTo(400, y + 15).lineTo(535, y + 15).strokeColor('#9CA3AF').lineWidth(0.5).stroke();
    doc.fontSize(7).text('Authorized Signatory', 380, y + 20, { width: 165, align: 'center' });

    doc.end();
    stream.on('finish', () => { console.log(`  Invoice: ${inv.id}.pdf`); resolve(); });
  });
}

// ===== MAIN =====
async function main() {
  console.log('\n===== Generating All Documents =====\n');
  console.log('--- Contracts ---');
  for (const c of CONTRACTS) await generateContract(c);
  console.log('\n--- Purchase Orders ---');
  for (const p of PURCHASE_ORDERS) await generatePO(p);
  console.log('\n--- Invoices ---');
  for (const i of INVOICES) await generateInvoice(i);
  console.log('\n===== DONE! =====');
  console.log(`Contracts:        ${path.join(__dirname, 'sample-contracts')}`);
  console.log(`Purchase Orders:  ${path.join(__dirname, 'sample-purchase-orders')}`);
  console.log(`Invoices:         ${path.join(__dirname, 'sample-invoices')}\n`);
}

main();
