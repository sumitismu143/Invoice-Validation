// ============================================================
// MATCHING ENGINE — Invoice vs PO vs Contract Validation
// ============================================================

class MatchingEngine {
  constructor(tolerance) {
    this.tolerance = tolerance || TOLERANCE;
  }

  /**
   * Run the full 3-way match: Invoice <-> PO <-> Contract
   * Returns a detailed report object.
   */
  validate(invoice) {
    const report = {
      invoiceId: invoice.id,
      vendorName: invoice.vendorName,
      vendorGstin: invoice.vendorGstin,
      invoiceDate: invoice.invoiceDate,
      invoiceTotal: invoice.total,
      poId: invoice.poId,
      po: null,
      contract: null,
      overallStatus: 'matched', // 'matched' or 'mismatched'
      deviations: [],
      itemResults: [],
      summary: {}
    };

    // Step 1: Find PO
    const po = PURCHASE_ORDERS[invoice.poId];
    if (!po) {
      report.overallStatus = 'mismatched';
      report.deviations.push({
        type: 'missing_po',
        severity: 'critical',
        message: `Purchase Order ${invoice.poId} not found in the system.`
      });
      return report;
    }
    report.po = po;

    // Step 2: Find Contract
    const contract = CONTRACTS[po.contractId];
    if (!contract) {
      report.overallStatus = 'mismatched';
      report.deviations.push({
        type: 'missing_contract',
        severity: 'critical',
        message: `Contract ${po.contractId} not found in the system.`
      });
      return report;
    }
    report.contract = contract;

    // Step 3: Vendor GSTIN check
    if (invoice.vendorGstin !== VENDORS[invoice.vendorId].gstin) {
      report.deviations.push({
        type: 'gstin_mismatch',
        severity: 'critical',
        message: `Vendor GSTIN mismatch. Invoice: ${invoice.vendorGstin}, Master: ${VENDORS[invoice.vendorId].gstin}`
      });
      report.overallStatus = 'mismatched';
    }

    // Step 4: GST rate check
    if (invoice.gstRate !== po.gstRate) {
      const taxDev = Math.abs(invoice.gstRate - po.gstRate);
      report.deviations.push({
        type: 'tax_mismatch',
        severity: 'critical',
        message: `GST Rate mismatch. Invoice: ${invoice.gstRate}%, PO/Contract: ${po.gstRate}%. Deviation: ${taxDev}%`,
        invoiceValue: invoice.gstRate,
        poValue: po.gstRate,
        deviation: taxDev
      });
      report.overallStatus = 'mismatched';
    }

    // Step 5: Line item comparison
    let totalInvoiceAmt = 0;
    let totalPOAmt = 0;

    invoice.items.forEach(invItem => {
      const poItem = po.items.find(p => p.code === invItem.code);
      const contractItem = contract.items.find(c => c.code === invItem.code);

      const result = {
        code: invItem.code,
        description: invItem.description,
        unit: invItem.unit,
        invoice: { qty: invItem.quantity, price: invItem.unitPrice, amount: invItem.amount },
        po: poItem ? { qty: poItem.quantity, price: poItem.unitPrice, amount: poItem.amount } : null,
        contract: contractItem ? { price: contractItem.unitPrice, minQty: contractItem.minQty, maxQty: contractItem.maxQty } : null,
        priceStatus: 'match',
        qtyStatus: 'match',
        priceDeviation: 0,
        qtyDeviation: 0
      };

      if (!poItem) {
        result.priceStatus = 'missing';
        result.qtyStatus = 'missing';
        report.deviations.push({
          type: 'item_missing_in_po',
          severity: 'high',
          message: `Item ${invItem.code} (${invItem.description}) not found in PO ${po.id}.`,
          itemCode: invItem.code
        });
        report.overallStatus = 'mismatched';
      } else {
        totalInvoiceAmt += invItem.amount;
        totalPOAmt += poItem.amount;

        // Price check
        const priceDev = ((invItem.unitPrice - poItem.unitPrice) / poItem.unitPrice) * 100;
        result.priceDeviation = priceDev;

        if (Math.abs(priceDev) > this.tolerance.price) {
          result.priceStatus = 'deviation';
          report.deviations.push({
            type: 'price_deviation',
            severity: 'high',
            message: `Price deviation on ${invItem.code}: Invoice Rs.${invItem.unitPrice.toLocaleString('en-IN')}/${invItem.unit} vs PO Rs.${poItem.unitPrice.toLocaleString('en-IN')}/${invItem.unit} (${priceDev > 0 ? '+' : ''}${priceDev.toFixed(1)}%, tolerance: +/-${this.tolerance.price}%)`,
            itemCode: invItem.code,
            invoiceValue: invItem.unitPrice,
            poValue: poItem.unitPrice,
            deviation: priceDev
          });
          report.overallStatus = 'mismatched';
        }

        // Quantity check
        const qtyDev = ((invItem.quantity - poItem.quantity) / poItem.quantity) * 100;
        result.qtyDeviation = qtyDev;

        if (Math.abs(qtyDev) > this.tolerance.quantity) {
          result.qtyStatus = 'deviation';
          report.deviations.push({
            type: 'quantity_deviation',
            severity: 'high',
            message: `Quantity deviation on ${invItem.code}: Invoice ${invItem.quantity} ${invItem.unit} vs PO ${poItem.quantity} ${invItem.unit} (${qtyDev > 0 ? '+' : ''}${qtyDev.toFixed(1)}%, tolerance: +/-${this.tolerance.quantity}%)`,
            itemCode: invItem.code,
            invoiceValue: invItem.quantity,
            poValue: poItem.quantity,
            deviation: qtyDev
          });
          report.overallStatus = 'mismatched';
        }
      }

      report.itemResults.push(result);
    });

    // Step 6: Total amount comparison
    const totalDev = invoice.total - po.total;
    report.summary = {
      invoiceSubtotal: invoice.subtotal,
      poSubtotal: po.subtotal,
      invoiceGST: invoice.cgst + invoice.sgst,
      poGST: po.gstAmount,
      invoiceTotal: invoice.total,
      poTotal: po.total,
      totalDeviation: totalDev,
      totalDeviationPct: ((totalDev / po.total) * 100).toFixed(2)
    };

    return report;
  }

  /**
   * Generate a plain-text email alert for mismatched invoices
   */
  generateEmailAlert(report) {
    if (report.overallStatus === 'matched') return null;

    const deviationLines = report.deviations.map((d, i) =>
      `  ${i + 1}. [${d.severity.toUpperCase()}] ${d.message}`
    ).join('\n');

    const email = {
      to: 'accounts-payable@company.com, procurement@company.com',
      cc: 'finance-head@company.com',
      subject: `[ALERT] Invoice Deviation Detected — ${report.invoiceId} | ${report.vendorName}`,
      body: `INVOICE VALIDATION ALERT
════════════════════════════════════════

Invoice #:     ${report.invoiceId}
Vendor:        ${report.vendorName}
GSTIN:         ${report.vendorGstin}
Invoice Date:  ${report.invoiceDate}
PO #:          ${report.poId}
Contract #:    ${report.contract ? report.contract.id : 'N/A'}

STATUS:        MISMATCH DETECTED

────────────────────────────────────────
DEVIATIONS FOUND (${report.deviations.length}):
────────────────────────────────────────
${deviationLines}

────────────────────────────────────────
FINANCIAL SUMMARY:
────────────────────────────────────────
  Invoice Total:   Rs. ${report.summary.invoiceTotal?.toLocaleString('en-IN') || 'N/A'}
  PO Total:        Rs. ${report.summary.poTotal?.toLocaleString('en-IN') || 'N/A'}
  Deviation:       Rs. ${report.summary.totalDeviation?.toLocaleString('en-IN') || 'N/A'} (${report.summary.totalDeviationPct || 'N/A'}%)

────────────────────────────────────────
ACTION REQUIRED:
  Please review the above deviations and
  take corrective action within 48 hours.

  - If approved, update the PO/Contract.
  - If rejected, contact the vendor for
    a revised invoice.
────────────────────────────────────────

This is an automated alert from InvoiceAI.
Do not reply to this email.`
    };

    return email;
  }
}
