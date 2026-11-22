TE.PDF = (function () {
  const cur = (n) => '₹' + n.toFixed(2);

  async function generateInvoice(header, details) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a5');
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const m = 8;
    let y = m;

    const bizName = await TE.Store.getSetting('business_name') || 'TradeEase FMCG Trading';
    const bizAddr = await TE.Store.getSetting('business_address') || '';
    const bizGstin = await TE.Store.getSetting('business_gstin') || '';
    const bizPhone = await TE.Store.getSetting('business_phone') || '';
    const bizEmail = await TE.Store.getSetting('business_email') || '';
    const bizBank = await TE.Store.getSetting('business_bank_name') || '';
    const bizAcct = await TE.Store.getSetting('business_account_number') || '';
    const bizIfsc = await TE.Store.getSetting('business_ifsc') || '';
    const bizUpi = await TE.Store.getSetting('business_upi') || '';
    const invoiceTitle = (await TE.Store.getSetting('invoice_title')) || 'Quotation';

    // --- Header band ---
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pw, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(bizName, m, 10);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    if (bizAddr) doc.text(bizAddr, m, 15);
    const contactLine = [bizPhone ? 'Ph: ' + bizPhone : '', bizEmail ? bizEmail : ''].filter(Boolean).join(' | ');
    if (contactLine) doc.text(contactLine, m, 19);
    if (bizGstin) doc.text('GSTIN: ' + bizGstin, m, 23);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(invoiceTitle.toUpperCase(), pw - m, 11, { align: 'right' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('#: ' + header.invoice_number, pw - m, 17, { align: 'right' });
    doc.text('Date: ' + TE.Utils.dateStr(header.invoice_date), pw - m, 22, { align: 'right' });

    y = 32;

    // --- Bill To / Payment ---
    doc.setFillColor(235, 241, 253);
    doc.rect(m, y - 2, pw - 2 * m, 20, 'F');

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO', m + 3, y + 1);
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(header.customer_name || '', m + 3, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    if (header.customer_address) {
      const lines = doc.splitTextToSize(header.customer_address, 60);
      doc.text(lines, m + 3, y + 9.5);
    }
    if (header.customer_gstin) doc.text('GSTIN: ' + header.customer_gstin, m + 3, y + 16);

    const midX = pw / 2 + 6;
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT', midX, y + 1);
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Mode: ' + (header.payment_mode || 'Cash'), midX, y + 5.5);
    doc.text('State: ' + (header.customer_state || ''), midX, y + 10);
    if (header.customer_state_code) doc.text('Code: ' + header.customer_state_code, midX, y + 14.5);

    y += 22;

    // --- Items table ---
    const isIntra = header.is_intra_state !== false;

    const tableHead = [['#', 'Product', 'HSN', 'Qty', 'Rate (₹)', 'Tax. (₹)']];
    if (isIntra) {
      tableHead[0].push('CGST', 'SGST', 'Total (₹)');
    } else {
      tableHead[0].push('IGST', 'Total (₹)');
    }

    const tableBody = details.map((d, i) => {
      const row = [
        i + 1,
        d.product_name,
        d.hsn_code || '',
        d.quantity,
        cur(d.rate),
        cur(d.taxable_value),
      ];
      if (isIntra) {
        row.push(cur(d.cgst_amount), cur(d.sgst_amount), cur(d.line_total));
      } else {
        row.push(cur(d.igst_amount), cur(d.line_total));
      }
      return row;
    });

    doc.autoTable({
      startY: y,
      head: tableHead,
      body: tableBody,
      margin: { left: m, right: m },
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 95], fontSize: 6, fontStyle: 'bold', halign: 'center', cellPadding: 1.5 },
      bodyStyles: { fontSize: 6, cellPadding: 1.5 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 6 },
        1: { cellWidth: 'auto' },
        2: { halign: 'center', cellWidth: 12 },
        3: { halign: 'center', cellWidth: 8 },
        4: { halign: 'right', cellWidth: 16 },
        5: { halign: 'right', cellWidth: 16 },
        6: { halign: 'right', cellWidth: 14 },
        7: { halign: 'right', cellWidth: 14 },
        8: { halign: 'right', cellWidth: 16 },
      },
    });

    y = doc.lastAutoTable.finalY + 4;

    // --- Totals ---
    const totW = 60;
    const totX = pw - m - totW;
    doc.setFontSize(7);

    function tLine(label, value, bold) {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(label, totX, y);
      doc.text(value, pw - m, y, { align: 'right' });
      y += 4;
    }

    tLine('Subtotal', cur(header.subtotal));
    if (header.discount_amount > 0) {
      tLine('Discount', '- ' + cur(header.discount_amount));
    }
    tLine('Taxable Amount', cur(header.taxable_amount));
    if (isIntra) {
      tLine('CGST', cur(header.cgst_amount));
      tLine('SGST', cur(header.sgst_amount));
    } else {
      tLine('IGST', cur(header.igst_amount));
    }
    doc.setDrawColor(30, 58, 95);
    doc.line(totX, y - 2, pw - m, y - 2);
    y += 1;
    doc.setFontSize(9);
    tLine('Grand Total', cur(header.total_amount), true);

    // --- Amount in words ---
    y += 1;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    const inWords = TE.Utils.numberToWords(header.total_amount);
    const wordLines = doc.splitTextToSize('Amount in words: ' + inWords, pw - 2 * m);
    doc.text(wordLines, m, y);
    y += wordLines.length * 3.5 + 4;

    // --- Bank details & signature ---
    if (bizBank || bizUpi) {
      doc.setFillColor(248, 250, 252);
      doc.rect(m, y - 2, (pw - 2 * m) / 2, 18, 'F');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text('BANK DETAILS', m + 3, y + 1);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      let bY = y + 4.5;
      if (bizBank) { doc.text('Bank: ' + bizBank, m + 3, bY); bY += 3.5; }
      if (bizAcct) { doc.text('A/c: ' + bizAcct, m + 3, bY); bY += 3.5; }
      if (bizIfsc) { doc.text('IFSC: ' + bizIfsc, m + 3, bY); bY += 3.5; }
      if (bizUpi) { doc.text('UPI: ' + bizUpi, m + 3, bY); }
    }

    doc.setTextColor(30, 58, 95);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('For ' + bizName, pw - m, y + 1, { align: 'right' });
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('Authorized Signatory', pw - m, y + 12, { align: 'right' });

    // --- Footer ---
    doc.setFillColor(30, 58, 95);
    doc.rect(0, ph - 8, pw, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5.5);
    doc.text('This is a computer-generated document and does not require a physical signature.', pw / 2, ph - 3.5, { align: 'center' });

    doc.save(header.invoice_number + '.pdf');
  }

  return { generateInvoice };
})();
