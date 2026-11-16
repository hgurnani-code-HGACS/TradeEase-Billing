TE.Invoices = (function () {
  const { el, currency, dateStr, toast, modal, confirm } = TE.Utils;

  async function render(container) {
    const invoices = await TE.Store.getAll('sales_header');
    invoices.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

    container.innerHTML = '';

    const header = el('div', { className: 'flex-between mb-16' }, [
      el('h3', { className: 'section-title', style: { margin: 0 } }, `All Invoices (${invoices.length})`),
      el('button', { className: 'btn btn-primary', onClick: () => TE.App.navigate('billing') }, '+ New Invoice'),
    ]);
    container.appendChild(header);

    const card = el('div', { className: 'card' });
    const tableWrap = el('div', { className: 'card-body no-pad table-wrap' });

    if (invoices.length === 0) {
      tableWrap.innerHTML = '<div class="empty-state"><p>No invoices yet. Create your first invoice!</p></div>';
    } else {
      const t = el('table');
      t.innerHTML = `<thead><tr>
        <th>Invoice #</th><th>Date</th><th>Customer</th><th>Payment</th>
        <th class="text-right">Amount</th><th>Status</th><th>Actions</th>
      </tr></thead>`;
      const tbody = el('tbody');

      for (const inv of invoices) {
        const tr = el('tr');
        const statusBadge = inv.status === 'posted'
          ? '<span class="badge badge-success">Posted</span>'
          : inv.status === 'cancelled'
          ? '<span class="badge badge-danger">Cancelled</span>'
          : '<span class="badge badge-warning">Draft</span>';

        tr.innerHTML = `
          <td class="fw-600">${inv.invoice_number}</td>
          <td>${dateStr(inv.invoice_date)}</td>
          <td>${inv.customer_name}</td>
          <td>${inv.payment_mode || 'Cash'}</td>
          <td class="text-right fw-600">${currency(inv.total_amount)}</td>
          <td>${statusBadge}</td>
          <td></td>`;

        const actCell = tr.lastElementChild;
        const btnRow = el('div', { className: 'btn-row' });

        if (inv.status === 'posted') {
          btnRow.appendChild(el('button', { className: 'btn btn-ghost btn-sm', onClick: () => viewInvoice(inv) }, 'View'));
          btnRow.appendChild(el('button', { className: 'btn btn-ghost btn-sm', onClick: () => reprintInvoice(inv) }, 'PDF'));
          btnRow.appendChild(el('button', { className: 'btn btn-ghost btn-sm text-danger', onClick: () => cancelInvoice(inv) }, 'Cancel'));
        } else if (inv.status === 'draft') {
          btnRow.appendChild(el('button', { className: 'btn btn-ghost btn-sm', onClick: () => editDraft(inv) }, 'Edit'));
          btnRow.appendChild(el('button', { className: 'btn btn-ghost btn-sm text-danger', onClick: () => deleteDraft(inv) }, 'Delete'));
        }

        actCell.appendChild(btnRow);
        tbody.appendChild(tr);
      }
      t.appendChild(tbody);
      tableWrap.appendChild(t);
    }

    card.appendChild(tableWrap);
    container.appendChild(card);
  }

  async function viewInvoice(inv) {
    const details = await TE.Store.getByIndex('sales_details', 'invoice_number', inv.invoice_number);
    const content = el('div');

    let detailRows = '';
    details.forEach((d, i) => {
      detailRows += `<tr>
        <td>${i + 1}</td><td>${d.product_name}</td><td>${d.hsn_code || ''}</td>
        <td class="text-center">${d.quantity}</td><td>${d.unit || ''}</td>
        <td class="text-right">${currency(d.rate)}</td>
        <td class="text-right">${currency(d.taxable_value)}</td>
        <td class="text-right">${currency(d.line_total)}</td>
      </tr>`;
    });

    content.innerHTML = `
      <div class="form-row mb-16">
        <div><strong>Invoice:</strong> ${inv.invoice_number}</div>
        <div><strong>Date:</strong> ${dateStr(inv.invoice_date)}</div>
      </div>
      <div class="mb-16"><strong>Customer:</strong> ${inv.customer_name} ${inv.customer_gstin ? '(GSTIN: ' + inv.customer_gstin + ')' : ''}</div>
      <div class="table-wrap mb-16">
        <table>
          <thead><tr><th>#</th><th>Product</th><th>HSN</th><th class="text-center">Qty</th><th>Unit</th><th class="text-right">Rate</th><th class="text-right">Taxable</th><th class="text-right">Total</th></tr></thead>
          <tbody>${detailRows}</tbody>
        </table>
      </div>
      <div style="text-align:right">
        <div class="mb-4"><strong>Subtotal:</strong> ${currency(inv.subtotal)}</div>
        ${inv.discount_amount > 0 ? '<div class="mb-4">Discount: -' + currency(inv.discount_amount) + '</div>' : ''}
        <div class="mb-4">Taxable: ${currency(inv.taxable_amount)}</div>
        ${inv.cgst_amount > 0 ? '<div class="mb-4">CGST: ' + currency(inv.cgst_amount) + '</div>' : ''}
        ${inv.sgst_amount > 0 ? '<div class="mb-4">SGST: ' + currency(inv.sgst_amount) + '</div>' : ''}
        ${inv.igst_amount > 0 ? '<div class="mb-4">IGST: ' + currency(inv.igst_amount) + '</div>' : ''}
        <div class="fw-600" style="font-size:1.1rem;border-top:2px solid var(--primary);padding-top:8px;display:inline-block">Grand Total: ${currency(inv.total_amount)}</div>
      </div>`;

    const footer = el('div', { className: 'btn-row btn-row-right' }, [
      el('button', { className: 'btn btn-primary', onClick: () => { reprintInvoice(inv); m.remove(); } }, 'Download PDF'),
      el('button', { className: 'btn btn-outline', onClick: () => m.remove() }, 'Close'),
    ]);
    const m = modal('Invoice ' + inv.invoice_number, content, { footer, wide: true });
  }

  async function reprintInvoice(inv) {
    const details = await TE.Store.getByIndex('sales_details', 'invoice_number', inv.invoice_number);
    TE.PDF.generateInvoice(inv, details);
    toast('PDF generated', 'success');
  }

  function cancelInvoice(inv) {
    confirm('Cancel invoice ' + inv.invoice_number + '? This will create a reversal entry.', async () => {
      inv.status = 'cancelled';
      await TE.Store.put('sales_header', inv);

      const details = await TE.Store.getByIndex('sales_details', 'invoice_number', inv.invoice_number);
      for (const d of details) {
        await TE.Store.addStockEntry({
          date: new Date().toISOString().split('T')[0],
          sku_code: d.sku_code,
          type: 'sale_cancel',
          reference_number: inv.invoice_number,
          quantity_in: d.quantity,
          quantity_out: 0,
          notes: 'Cancellation reversal of ' + inv.invoice_number,
        });
      }

      toast('Invoice cancelled and stock reversed', 'success');
      TE.App.navigate('invoices');
    });
  }

  function editDraft(inv) {
    TE.App.navigate('billing', inv);
  }

  function deleteDraft(inv) {
    confirm('Delete this draft invoice?', async () => {
      await TE.Store.del('sales_header', inv.invoice_number);
      const details = await TE.Store.getByIndex('sales_details', 'invoice_number', inv.invoice_number);
      for (const d of details) await TE.Store.del('sales_details', d.id);
      toast('Draft deleted', 'success');
      TE.App.navigate('invoices');
    });
  }

  return { render };
})();
