TE.PDF = (function () {
  const cur = (n) => 'Rs. ' + n.toFixed(2);

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

    const tableHead = [['#', 'Product', 'HSN', 'Qty', 'Rate (Rs.)', 'Taxable']];
    if (isIntra) {
      tableHead[0].push('CGST', 'SGST', 'Total (Rs.)');
    } else {
      tableHead[0].push('IGST', 'Total (Rs.)');
    }

    const tableBody = details.map((d, i) => {
      const row = [
        i + 1,
        d.product_name,
        d.hsn_code || '',
        d.quantity,
        d.rate.toFixed(2),
        d.taxable_value.toFixed(2),
      ];
      if (isIntra) {
        row.push(d.cgst_amount.toFixed(2), d.sgst_amount.toFixed(2), d.line_total.toFixed(2));
      } else {
        row.push(d.igst_amount.toFixed(2), d.line_total.toFixed(2));
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

    y = doc.lastAutoTable.finalY + 2;

    // --- Totals (using autoTable for perfect alignment) ---
    const summaryRows = [];
    summaryRows.push(['Subtotal', cur(header.subtotal)]);
    if (header.discount_amount > 0) {
      summaryRows.push(['Discount', '- ' + cur(header.discount_amount)]);
    }
    summaryRows.push(['Taxable Amount', cur(header.taxable_amount)]);
    if (isIntra) {
      summaryRows.push(['CGST', cur(header.cgst_amount)]);
      summaryRows.push(['SGST', cur(header.sgst_amount)]);
    } else {
      summaryRows.push(['IGST', cur(header.igst_amount)]);
    }

    const summaryW = 65;
    const summaryX = pw - m - summaryW;

    doc.autoTable({
      startY: y,
      body: summaryRows,
      margin: { left: summaryX, right: m },
      theme: 'plain',
      bodyStyles: { fontSize: 7, cellPadding: { top: 1, bottom: 1, left: 2, right: 2 } },
      columnStyles: {
        0: { halign: 'left', cellWidth: summaryW - 28, fontStyle: 'normal' },
        1: { halign: 'right', cellWidth: 28 },
      },
      didParseCell: function (data) {
        data.cell.styles.textColor = [30, 41, 59];
      },
    });

    y = doc.lastAutoTable.finalY;

    // Grand total row with line separator
    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(0.5);
    doc.line(summaryX, y, pw - m, y);
    y += 1;

    doc.autoTable({
      startY: y,
      body: [['Grand Total', cur(header.total_amount)]],
      margin: { left: summaryX, right: m },
      theme: 'plain',
      bodyStyles: { fontSize: 9, fontStyle: 'bold', cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 } },
      columnStyles: {
        0: { halign: 'left', cellWidth: summaryW - 28 },
        1: { halign: 'right', cellWidth: 28 },
      },
      didParseCell: function (data) {
        data.cell.styles.textColor = [30, 58, 95];
      },
    });

    y = doc.lastAutoTable.finalY + 2;

    // --- Amount in words ---
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
