TE.PDF = (function () {
  async function generateInvoice(header, details) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pw = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = margin;

    const bizName = await TE.Store.getSetting('business_name') || 'TradeEase FMCG Trading';
    const bizAddr = await TE.Store.getSetting('business_address') || '';
    const bizGstin = await TE.Store.getSetting('business_gstin') || '';
    const bizPhone = await TE.Store.getSetting('business_phone') || '';
    const bizEmail = await TE.Store.getSetting('business_email') || '';
    const bizBank = await TE.Store.getSetting('business_bank_name') || '';
    const bizAcct = await TE.Store.getSetting('business_account_number') || '';
    const bizIfsc = await TE.Store.getSetting('business_ifsc') || '';
    const bizUpi = await TE.Store.getSetting('business_upi') || '';

    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pw, 36, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(bizName, margin, 14);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    if (bizAddr) doc.text(bizAddr, margin, 20);
    const contactLine = [bizPhone ? 'Ph: ' + bizPhone : '', bizEmail ? 'Email: ' + bizEmail : ''].filter(Boolean).join(' | ');
    if (contactLine) doc.text(contactLine, margin, 25);
    if (bizGstin) doc.text('GSTIN: ' + bizGstin, margin, 30);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TAX INVOICE', pw - margin, 16, { align: 'right' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Invoice #: ' + header.invoice_number, pw - margin, 24, { align: 'right' });
    doc.text('Date: ' + TE.Utils.dateStr(header.invoice_date), pw - margin, 30, { align: 'right' });

    y = 44;
    doc.setTextColor(30, 58, 95);

    doc.setFillColor(232, 240, 254);
    doc.rect(margin, y - 4, pw - 2 * margin, 28, 'F');

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO', margin + 4, y);
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(header.customer_name || '', margin + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (header.customer_address) {
      const lines = doc.splitTextToSize(header.customer_address, 80);
      doc.text(lines, margin + 4, y + 11);
    }
    if (header.customer_gstin) doc.text('GSTIN: ' + header.customer_gstin, margin + 4, y + 20);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT', pw / 2 + 10, y);
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Mode: ' + (header.payment_mode || 'Cash'), pw / 2 + 10, y + 6);
    doc.text('State: ' + (header.customer_state || ''), pw / 2 + 10, y + 12);
    if (header.customer_state_code) doc.text('State Code: ' + header.customer_state_code, pw / 2 + 10, y + 18);

    y += 32;

    const isIntra = header.is_intra_state !== false;

    const tableHead = [['#', 'Product', 'HSN', 'Qty', 'Unit', 'Rate', 'Disc%', 'Taxable']];
    if (isIntra) {
      tableHead[0].push('CGST', 'SGST', 'Total');
    } else {
      tableHead[0].push('IGST', 'Total');
    }

    const tableBody = details.map((d, i) => {
      const row = [
        i + 1,
        d.product_name,
        d.hsn_code || '',
        d.quantity,
        d.unit || '',
        d.rate.toFixed(2),
        (d.discount || 0) + '%',
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
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 95], fontSize: 7, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 'auto' },
        3: { halign: 'center' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right' },
        9: { halign: 'right' },
        10: { halign: 'right' },
      },
      styles: { cellPadding: 2 },
    });

    y = doc.lastAutoTable.finalY + 6;

    const totalsX = pw - margin - 70;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    function totalsLine(label, value, bold) {
      if (bold) doc.setFont('helvetica', 'bold');
      else doc.setFont('helvetica', 'normal');
      doc.text(label, totalsX, y);
      doc.text(value, pw - margin, y, { align: 'right' });
      y += 5;
    }

    totalsLine('Subtotal', '₹ ' + header.subtotal.toFixed(2));
    if (header.discount_amount > 0) {
      totalsLine('Discount', '- ₹ ' + header.discount_amount.toFixed(2));
    }
    totalsLine('Taxable Amount', '₹ ' + header.taxable_amount.toFixed(2));
    if (isIntra) {
      totalsLine('CGST', '₹ ' + header.cgst_amount.toFixed(2));
      totalsLine('SGST', '₹ ' + header.sgst_amount.toFixed(2));
    } else {
      totalsLine('IGST', '₹ ' + header.igst_amount.toFixed(2));
    }
    doc.setDrawColor(30, 58, 95);
    doc.line(totalsX, y - 2, pw - margin, y - 2);
    y += 1;
    doc.setFontSize(10);
    totalsLine('Grand Total', '₹ ' + header.total_amount.toFixed(2), true);

    y += 2;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    const inWords = TE.Utils.numberToWords(header.total_amount);
    doc.text('Amount in words: ' + inWords, margin, y);

    y += 10;
    if (bizBank || bizUpi) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 3, (pw - 2 * margin) / 2, 22, 'F');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('BANK DETAILS', margin + 4, y);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      let bankY = y + 5;
      if (bizBank) { doc.text('Bank: ' + bizBank, margin + 4, bankY); bankY += 4; }
      if (bizAcct) { doc.text('A/c: ' + bizAcct, margin + 4, bankY); bankY += 4; }
      if (bizIfsc) { doc.text('IFSC: ' + bizIfsc, margin + 4, bankY); bankY += 4; }
      if (bizUpi) { doc.text('UPI: ' + bizUpi, margin + 4, bankY); }
    }

    doc.setTextColor(30, 58, 95);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('For ' + bizName, pw - margin, y + 2, { align: 'right' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Authorized Signatory', pw - margin, y + 14, { align: 'right' });

    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(30, 58, 95);
    doc.rect(0, pageH - 10, pw, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);
    doc.text('This is a computer-generated invoice and does not require a physical signature.', pw / 2, pageH - 4, { align: 'center' });

    doc.save(header.invoice_number + '.pdf');
  }

  return { generateInvoice };
})();
