TE.Customers = (function () {
  const { el, currency, toast, modal, debounce, INDIAN_STATES } = TE.Utils;

  async function render(container) {
    const t = TE.Lang.t;
    const customers = await TE.Store.getAll('customers');
    container.innerHTML = '';

    const header = el('div', { className: 'flex-between mb-16' }, [
      el('div', { className: 'search-box' }, [
        el('svg', { innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' }),
        el('input', { type: 'text', className: 'form-input', placeholder: t('search_customers'), id: 'customerSearch' }),
      ]),
      el('button', { className: 'btn btn-primary', onClick: () => showCustomerForm() }, [
        el('span', { innerHTML: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' }),
        t('add_customer'),
      ]),
    ]);

    const card = el('div', { className: 'card' });
    const tableWrap = el('div', { className: 'card-body no-pad' });
    const table = el('div', { className: 'table-wrap' });

    function buildTable(items) {
      table.innerHTML = '';
      if (items.length === 0) {
        table.innerHTML = '<div class="empty-state"><p>No customers found</p></div>';
        return;
      }
      const tbl = el('table');
      tbl.innerHTML = `<thead><tr>
        <th>ID</th><th>${t('customer')}</th><th>${t('mobile')}</th><th>GSTIN</th>
        <th>State</th><th>${t('type')}</th><th class="text-right">${t('balance')}</th><th>${t('actions')}</th>
      </tr></thead>`;
      const tbody = el('tbody');
      for (const c of items) {
        const tr = el('tr');
        tr.innerHTML = `
          <td class="fw-600">${c.customer_id}</td>
          <td>${c.customer_name}${c.customer_name_hi ? '<div class="text-sm text-secondary">' + c.customer_name_hi + '</div>' : ''}</td>
          <td>${c.mobile || ''}</td>
          <td class="text-sm">${c.gstin || '—'}</td>
          <td>${c.state || ''}</td>
          <td><span class="badge badge-info">${c.customer_type || 'Retail'}</span></td>
          <td class="text-right ${(c.opening_balance || 0) > 0 ? 'text-danger' : ''}">${currency(c.opening_balance || 0)}</td>
          <td></td>`;
        const actCell = tr.lastElementChild;
        actCell.appendChild(el('button', { className: 'btn btn-ghost btn-sm', onClick: () => showCustomerForm(c) }, t('edit')));
        tbody.appendChild(tr);
      }
      tbl.appendChild(tbody);
      table.appendChild(tbl);
    }

    buildTable(customers);
    tableWrap.appendChild(table);
    card.appendChild(tableWrap);
    container.appendChild(header);
    container.appendChild(card);

    const searchInput = document.getElementById('customerSearch');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(() => {
        const q = searchInput.value.toLowerCase();
        const filtered = customers.filter(c =>
          c.customer_name.toLowerCase().includes(q) ||
          c.customer_id.toLowerCase().includes(q) ||
          (c.mobile || '').includes(q) ||
          (c.gstin || '').toLowerCase().includes(q)
        );
        buildTable(filtered);
      }, 200));
    }
  }

  function showCustomerForm(customer) {
    const t = TE.Lang.t;
    const isEdit = !!customer;
    const stateOptions = INDIAN_STATES.map(s =>
      `<option value="${s.name}" data-code="${s.code}" ${customer?.state === s.name ? 'selected' : ''}>${s.name} (${s.code})</option>`
    ).join('');

    const form = el('div');
    form.innerHTML = `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Customer ID</label>
          <input type="text" class="form-input" id="cId" value="${customer?.customer_id || ''}" ${isEdit ? 'readonly style="background:#f1f5f9"' : 'placeholder="Auto-generated if blank"'}>
        </div>
        <div class="form-group">
          <label class="form-label">Customer Name *</label>
          <input type="text" class="form-input" id="cName" value="${customer?.customer_name || ''}" placeholder="Business or individual name">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Customer Name (Hindi) <span class="text-secondary">ग्राहक का नाम</span></label>
        <input type="text" class="form-input" id="cNameHi" value="${customer?.customer_name_hi || ''}" placeholder="ग्राहक का नाम हिंदी में">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('mobile')}</label>
          <input type="tel" class="form-input" id="cMobile" value="${customer?.mobile || ''}" placeholder="10-digit mobile">
        </div>
        <div class="form-group">
          <label class="form-label">GSTIN</label>
          <input type="text" class="form-input" id="cGstin" value="${customer?.gstin || ''}" placeholder="22AAAAA0000A1Z5" maxlength="15">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${t('address')}</label>
        <textarea class="form-input form-textarea" id="cBillAddr" rows="2">${customer?.billing_address || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Shipping Address</label>
        <textarea class="form-input form-textarea" id="cShipAddr" rows="2">${customer?.shipping_address || ''}</textarea>
        <span class="form-hint">Leave blank to use billing address</span>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">State *</label>
          <select class="form-select" id="cState">
            <option value="">Select State</option>
            ${stateOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">State Code</label>
          <input type="text" class="form-input" id="cStateCode" value="${customer?.state_code || ''}" readonly style="background:#f1f5f9">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('type')}</label>
          <select class="form-select" id="cType">
            ${['Retail','Wholesale','Distributor','Institutional'].map(tp =>
              `<option ${customer?.customer_type === tp ? 'selected' : ''}>${tp}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Payment Terms</label>
          <select class="form-select" id="cTerms">
            ${['Cash','7 days','15 days','30 days','45 days','60 days'].map(tp =>
              `<option ${customer?.payment_terms === tp ? 'selected' : ''}>${tp}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${t('balance')}</label>
          <input type="number" class="form-input" id="cBalance" value="${customer?.opening_balance || 0}" step="0.01" min="0">
        </div>
      </div>`;

    const footer = el('div', { className: 'btn-row btn-row-right' }, [
      el('button', { className: 'btn btn-outline', onClick: () => m.remove() }, t('cancel')),
      el('button', { className: 'btn btn-primary', onClick: saveCustomer }, isEdit ? 'Update Customer' : t('save')),
    ]);
    const m = modal(isEdit ? 'Edit Customer' : t('add_customer'), form, { footer, wide: true });

    const stateSelect = document.getElementById('cState');
    stateSelect.addEventListener('change', () => {
      const opt = stateSelect.selectedOptions[0];
      document.getElementById('cStateCode').value = opt?.dataset.code || '';
    });

    async function saveCustomer() {
      const name = document.getElementById('cName').value.trim();
      if (!name) { toast('Customer name is required', 'error'); return; }

      let cid = document.getElementById('cId').value.trim();
      if (!cid) {
        const count = await TE.Store.count('customers');
        cid = 'CUST' + String(count + 1).padStart(3, '0');
      }

      const stateSelect = document.getElementById('cState');
      const stateCode = document.getElementById('cStateCode').value || (stateSelect.selectedOptions[0]?.dataset.code || '');

      const data = {
        customer_id: cid,
        customer_name: name,
        customer_name_hi: document.getElementById('cNameHi').value.trim(),
        mobile: document.getElementById('cMobile').value.trim(),
        billing_address: document.getElementById('cBillAddr').value.trim(),
        shipping_address: document.getElementById('cShipAddr').value.trim(),
        gstin: document.getElementById('cGstin').value.trim().toUpperCase(),
        state: stateSelect.value,
        state_code: stateCode,
        customer_type: document.getElementById('cType').value,
        payment_terms: document.getElementById('cTerms').value,
        opening_balance: Number(document.getElementById('cBalance').value) || 0,
      };
      if (!data.shipping_address) data.shipping_address = data.billing_address;

      await TE.Store.put('customers', data);
      m.remove();
      toast(isEdit ? 'Customer updated' : 'Customer added', 'success');
      TE.App.navigate('customers');
    }
  }

  return { render, showCustomerForm };
})();
