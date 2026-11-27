TE.PDF = (function () {
  const cur = (n) => 'Rs. ' + n.toFixed(2);

  async function generateInvoice(header, details) {
    const { jsPDF } = window.jspdf;

    const printLang = (await TE.Store.getSetting('print_language')) || 'en';
    const useHindi = printLang === 'hi' || printLang === 'both';
    const isBilingual = printLang === 'both';

    if (useHindi) await TE.HindiFont.load();

    const doc = new jsPDF('p', 'mm', 'a5');
    if (useHindi) TE.HindiFont.register(doc);
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const m = 8;
    let y = m;

    const hiFont = 'NotoSansDevanagari';
    const enFont = 'helvetica';
    const font = useHindi ? hiFont : enFont;

    function setF(style) { doc.setFont(font, style || 'normal'); }

    const L = {
      bill_to: isBilingual ? 'बिल प्राप्तकर्ता / BILL TO' : useHindi ? 'बिल प्राप्तकर्ता' : 'BILL TO',
      payment: isBilingual ? 'भुगतान / PAYMENT' : useHindi ? 'भुगतान' : 'PAYMENT',
      mode: useHindi ? 'मोड' : 'Mode',
      state: useHindi ? 'राज्य' : 'State',
      code: useHindi ? 'कोड' : 'Code',
      product: useHindi ? 'उत्पाद' : 'Product',
      hsn: 'HSN',
      qty: useHindi ? 'मात्रा' : 'Qty',
      rate: useHindi ? 'दर (Rs.)' : 'Rate (Rs.)',
      taxable: useHindi ? 'कर योग्य' : 'Taxable',
      total_col: useHindi ? 'कुल (Rs.)' : 'Total (Rs.)',
      subtotal: useHindi ? 'उपयोग' : 'Subtotal',
      discount: useHindi ? 'छूट' : 'Discount',
      taxable_amount: useHindi ? 'कर योग्य राशि' : 'Taxable Amount',
      cgst: 'CGST', sgst: 'SGST', igst: 'IGST',
      grand_total: useHindi ? 'कुल योग' : 'Grand Total',
      amt_words: useHindi ? 'शब्दों में राशि' : 'Amount in words',
      bank_details: isBilingual ? 'बैंक विवरण / BANK DETAILS' : useHindi ? 'बैंक विवरण' : 'BANK DETAILS',
      bank: useHindi ? 'बैंक' : 'Bank',
      auth_sign: useHindi ? 'अधिकृत हस्ताक्षरकर्ता' : 'Authorized Signatory',
      footer: useHindi
        ? 'यह कंप्यूटर जनित दस्तावेज़ है, भौतिक हस्ताक्षर की आवश्यकता नहीं है।'
        : 'This is a computer-generated document and does not require a physical signature.',
    };

    function prodName(d) {
      if (useHindi && d.product_name_hi) {
        return isBilingual ? d.product_name_hi + '\n' + d.product_name : d.product_name_hi;
      }
      return d.product_name;
    }
    function custName() {
      if (useHindi && header.customer_name_hi) {
        return isBilingual ? header.customer_name_hi + ' / ' + header.customer_name : header.customer_name_hi;
      }
      return header.customer_name || '';
    }

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
    setF('bold');
    doc.text(bizName, m, 10);

    doc.setFontSize(6.5);
    setF('normal');
    if (bizAddr) doc.text(bizAddr, m, 15);
    const contactLine = [bizPhone ? 'Ph: ' + bizPhone : '', bizEmail || ''].filter(Boolean).join(' | ');
    if (contactLine) doc.text(contactLine, m, 19);
    if (bizGstin) doc.text('GSTIN: ' + bizGstin, m, 23);

    doc.setFontSize(11);
    setF('bold');
    doc.text(invoiceTitle.toUpperCase(), pw - m, 11, { align: 'right' });
    doc.setFontSize(7);
    setF('normal');
    doc.text('#: ' + header.invoice_number, pw - m, 17, { align: 'right' });
    doc.text('Date: ' + TE.Utils.dateStr(header.invoice_date), pw - m, 22, { align: 'right' });

    y = 32;

    // --- Bill To / Payment ---
    doc.setFillColor(235, 241, 253);
    doc.rect(m, y - 2, pw - 2 * m, 20, 'F');

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6);
    setF('bold');
    doc.text(L.bill_to, m + 3, y + 1);
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8);
    setF('bold');
    doc.text(custName(), m + 3, y + 5.5);
    setF('normal');
    doc.setFontSize(6.5);
    if (header.customer_address) {
      const lines = doc.splitTextToSize(header.customer_address, 60);
      doc.text(lines, m + 3, y + 9.5);
    }
    if (header.customer_gstin) doc.text('GSTIN: ' + header.customer_gstin, m + 3, y + 16);

    const midX = pw / 2 + 6;
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6);
    setF('bold');
    doc.text(L.payment, midX, y + 1);
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(7);
    setF('normal');
    doc.text(L.mode + ': ' + (header.payment_mode || 'Cash'), midX, y + 5.5);
    doc.text(L.state + ': ' + (header.customer_state || ''), midX, y + 10);
    if (header.customer_state_code) doc.text(L.code + ': ' + header.customer_state_code, midX, y + 14.5);

    y += 22;

    // --- Items table ---
    const isIntra = header.is_intra_state !== false;

    const tableHead = [['#', L.product, L.hsn, L.qty, L.rate, L.taxable]];
    if (isIntra) {
      tableHead[0].push(L.cgst, L.sgst, L.total_col);
    } else {
      tableHead[0].push(L.igst, L.total_col);
    }

    const tableBody = details.map((d, i) => {
      const row = [
        i + 1, prodName(d), d.hsn_code || '', d.quantity,
        d.rate.toFixed(2), d.taxable_value.toFixed(2),
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
      headStyles: { fillColor: [30, 58, 95], fontSize: 6, fontStyle: 'bold', halign: 'center', cellPadding: 1.5, font: font },
      bodyStyles: { fontSize: 6, cellPadding: 1.5, font: font },
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

    // --- Totals ---
    const summaryRows = [];
    summaryRows.push([L.subtotal, cur(header.subtotal)]);
    if (header.discount_amount > 0) summaryRows.push([L.discount, '- ' + cur(header.discount_amount)]);
    summaryRows.push([L.taxable_amount, cur(header.taxable_amount)]);
    if (isIntra) {
      summaryRows.push([L.cgst, cur(header.cgst_amount)]);
      summaryRows.push([L.sgst, cur(header.sgst_amount)]);
    } else {
      summaryRows.push([L.igst, cur(header.igst_amount)]);
    }

    const summaryW = 65;
    const summaryX = pw - m - summaryW;

    doc.autoTable({
      startY: y,
      body: summaryRows,
      margin: { left: summaryX, right: m },
      theme: 'plain',
      bodyStyles: { fontSize: 7, cellPadding: { top: 1, bottom: 1, left: 2, right: 2 }, font: font },
      columnStyles: {
        0: { halign: 'left', cellWidth: summaryW - 28, fontStyle: 'normal' },
        1: { halign: 'right', cellWidth: 28 },
      },
      didParseCell: function (data) { data.cell.styles.textColor = [30, 41, 59]; },
    });

    y = doc.lastAutoTable.finalY;

    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(0.5);
    doc.line(summaryX, y, pw - m, y);
    y += 1;

    doc.autoTable({
      startY: y,
      body: [[L.grand_total, cur(header.total_amount)]],
      margin: { left: summaryX, right: m },
      theme: 'plain',
      bodyStyles: { fontSize: 9, fontStyle: 'bold', cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 }, font: font },
      columnStyles: {
        0: { halign: 'left', cellWidth: summaryW - 28 },
        1: { halign: 'right', cellWidth: 28 },
      },
      didParseCell: function (data) { data.cell.styles.textColor = [30, 58, 95]; },
    });

    y = doc.lastAutoTable.finalY + 2;

    // --- Amount in words ---
    doc.setFontSize(6.5);
    setF('normal');
    doc.setTextColor(100, 116, 139);
    const inWords = TE.Utils.numberToWords(header.total_amount);
    const wordLines = doc.splitTextToSize(L.amt_words + ': ' + inWords, pw - 2 * m);
    doc.text(wordLines, m, y);
    y += wordLines.length * 3.5 + 4;

    // --- Bank details & signature ---
    if (bizBank || bizUpi) {
      doc.setFillColor(248, 250, 252);
      doc.rect(m, y - 2, (pw - 2 * m) / 2, 18, 'F');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(6);
      setF('bold');
      doc.text(L.bank_details, m + 3, y + 1);
      doc.setTextColor(30, 41, 59);
      setF('normal');
      doc.setFontSize(6.5);
      let bY = y + 4.5;
      if (bizBank) { doc.text(L.bank + ': ' + bizBank, m + 3, bY); bY += 3.5; }
      if (bizAcct) { doc.text('A/c: ' + bizAcct, m + 3, bY); bY += 3.5; }
      if (bizIfsc) { doc.text('IFSC: ' + bizIfsc, m + 3, bY); bY += 3.5; }
      if (bizUpi) { doc.text('UPI: ' + bizUpi, m + 3, bY); }
    }

    doc.setTextColor(30, 58, 95);
    doc.setFontSize(7);
    setF('bold');
    doc.text('For ' + bizName, pw - m, y + 1, { align: 'right' });
    doc.setFontSize(6);
    setF('normal');
    doc.text(L.auth_sign, pw - m, y + 12, { align: 'right' });

    // --- Footer ---
    doc.setFillColor(30, 58, 95);
    doc.rect(0, ph - 8, pw, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5.5);
    setF('normal');
    doc.text(L.footer, pw / 2, ph - 3.5, { align: 'center' });

    doc.save(header.invoice_number + '.pdf');
  }

  return { generateInvoice };
})();
