TE.Products = (function () {
  const { el, currency, toast, modal, debounce } = TE.Utils;

  async function render(container) {
    const t = TE.Lang.t;
    const products = await TE.Store.getAll('products');
    const categories = await TE.Store.getAll('categories');
    const catMap = {};
    categories.forEach(c => catMap[c.id] = c.name);

    container.innerHTML = '';

    const header = el('div', { className: 'flex-between mb-16' }, [
      el('div', { className: 'search-box' }, [
        el('svg', { innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' }),
        el('input', { type: 'text', className: 'form-input', placeholder: t('search_products_master'), id: 'productSearch' }),
      ]),
      el('div', { className: 'btn-row' }, [
        el('button', { className: 'btn btn-outline', onClick: () => showCategoryModal(categories) }, [
          el('span', { innerHTML: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>' }),
          t('categories'),
        ]),
        el('button', { className: 'btn btn-primary', onClick: () => showProductForm(null, categories) }, [
          el('span', { innerHTML: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' }),
          t('add_product'),
        ]),
      ]),
    ]);

    const card = el('div', { className: 'card' });
    const tableWrap = el('div', { className: 'card-body no-pad' });
    const table = el('div', { className: 'table-wrap' });

    function buildTable(items) {
      table.innerHTML = '';
      if (items.length === 0) {
        table.innerHTML = `<div class="empty-state"><p>${t('no_products_found')}</p></div>`;
        return;
      }
      const tbl = el('table');
      tbl.innerHTML = `<thead><tr>
        <th>${t('sku')}</th><th>${t('product')}</th><th>${t('categories')}</th><th>${t('hsn')}</th>
        <th class="text-right">${t('purchase')}</th><th class="text-right">${t('selling')}</th><th class="text-right">${t('mrp')}</th>
        <th class="text-right">${t('gst_pct')}</th><th>${t('unit')}</th><th>${t('status')}</th><th>${t('actions')}</th>
      </tr></thead>`;
      const tbody = el('tbody');
      for (const p of items) {
        const tr = el('tr');
        tr.innerHTML = `
          <td class="text-nowrap fw-600">${p.sku_code}</td>
          <td>${p.product_name}</td>
          <td>${catMap[p.category] || p.category}</td>
          <td>${p.hsn_code || ''}</td>
          <td class="text-right">${currency(p.purchase_price)}</td>
          <td class="text-right">${currency(p.selling_price)}</td>
          <td class="text-right">${currency(p.mrp)}</td>
          <td class="text-right">${p.gst_rate}%</td>
          <td>${p.unit || ''}</td>
          <td>${p.status === 'active' ? `<span class="badge badge-success">${t('active')}</span>` : `<span class="badge badge-muted">${t('inactive')}</span>`}</td>
          <td></td>`;
        const actCell = tr.lastElementChild;
        const editBtn = el('button', { className: 'btn btn-ghost btn-sm', onClick: () => showProductForm(p, categories) }, t('edit'));
        actCell.appendChild(editBtn);
        tbody.appendChild(tr);
      }
      tbl.appendChild(tbody);
      table.appendChild(tbl);
    }

    buildTable(products);
    tableWrap.appendChild(table);
    card.appendChild(tableWrap);
    container.appendChild(header);
    container.appendChild(card);

    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(() => {
        const q = searchInput.value.toLowerCase();
        const filtered = products.filter(p =>
          p.sku_code.toLowerCase().includes(q) ||
          p.product_name.toLowerCase().includes(q) ||
          (catMap[p.category] || '').toLowerCase().includes(q) ||
          (p.brand || '').toLowerCase().includes(q)
        );
        buildTable(filtered);
      }, 200));
    }
  }

  function showProductForm(product, categories) {
    const t = TE.Lang.t;
    const isEdit = !!product;
    const form = el('div');
    form.innerHTML = `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">SKU Code *</label>
          <input type="text" class="form-input" id="pSku" value="${product?.sku_code || ''}" ${isEdit ? 'readonly style="background:#f1f5f9"' : ''} placeholder="e.g. ELA-GRN-100">
        </div>
        <div class="form-group">
          <label class="form-label">Product Name *</label>
          <input type="text" class="form-input" id="pName" value="${product?.product_name || ''}" placeholder="Green Cardamom 100g">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Category *</label>
          <select class="form-select" id="pCategory">
            <option value="">Select Category</option>
            ${categories.map(c => `<option value="${c.id}" ${product?.category === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Brand</label>
          <input type="text" class="form-input" id="pBrand" value="${product?.brand || ''}" placeholder="Brand name">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input type="text" class="form-input" id="pDesc" value="${product?.description || ''}" placeholder="Short description">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">HSN Code *</label>
          <input type="text" class="form-input" id="pHsn" value="${product?.hsn_code || ''}" placeholder="0908">
        </div>
        <div class="form-group">
          <label class="form-label">GST Rate % *</label>
          <select class="form-select" id="pGst">
            ${[0,5,12,18,28].map(r => `<option value="${r}" ${product?.gst_rate === r ? 'selected' : ''}>${r}%</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Purchase Price *</label>
          <input type="number" class="form-input" id="pPurchase" value="${product?.purchase_price || ''}" step="0.01" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">Selling Price *</label>
          <input type="number" class="form-input" id="pSelling" value="${product?.selling_price || ''}" step="0.01" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">MRP *</label>
          <input type="number" class="form-input" id="pMrp" value="${product?.mrp || ''}" step="0.01" min="0">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Unit of Measurement</label>
          <select class="form-select" id="pUnit">
            ${['Pcs','Kg','Gm','Ltr','Ml','Box','Carton','Dozen','Pack'].map(u => `<option ${product?.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Packaging Size</label>
          <input type="text" class="form-input" id="pPkg" value="${product?.packaging_size || ''}" placeholder="100g, 250g, 1kg">
        </div>
        <div class="form-group">
          <label class="form-label">Min Stock Level</label>
          <input type="number" class="form-input" id="pMinStock" value="${product?.min_stock_level || 0}" min="0">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${t('status')}</label>
        <select class="form-select" id="pStatus">
          <option value="active" ${product?.status === 'active' || !product ? 'selected' : ''}>${t('active')}</option>
          <option value="inactive" ${product?.status === 'inactive' ? 'selected' : ''}>${t('inactive')}</option>
        </select>
      </div>`;

    const footer = el('div', { className: 'btn-row btn-row-right' }, [
      el('button', { className: 'btn btn-outline', onClick: () => m.remove() }, t('cancel')),
      el('button', { className: 'btn btn-primary', onClick: saveProduct }, isEdit ? 'Update Product' : t('save')),
    ]);
    const m = modal(isEdit ? 'Edit Product' : t('add_product'), form, { footer, wide: true });

    async function saveProduct() {
      const data = {
        sku_code: document.getElementById('pSku').value.trim(),
        product_name: document.getElementById('pName').value.trim(),
        category: document.getElementById('pCategory').value,
        brand: document.getElementById('pBrand').value.trim(),
        description: document.getElementById('pDesc').value.trim(),
        hsn_code: document.getElementById('pHsn').value.trim(),
        gst_rate: Number(document.getElementById('pGst').value),
        purchase_price: Number(document.getElementById('pPurchase').value),
        selling_price: Number(document.getElementById('pSelling').value),
        mrp: Number(document.getElementById('pMrp').value),
        unit: document.getElementById('pUnit').value,
        packaging_size: document.getElementById('pPkg').value.trim(),
        min_stock_level: Number(document.getElementById('pMinStock').value),
        status: document.getElementById('pStatus').value,
      };
      if (!data.sku_code || !data.product_name || !data.category) {
        toast('Please fill all required fields', 'error');
        return;
      }
      if (!isEdit) {
        const existing = await TE.Store.get('products', data.sku_code);
        if (existing) { toast('SKU code already exists', 'error'); return; }
      }
      await TE.Store.put('products', data);
      m.remove();
      toast(isEdit ? 'Product updated' : 'Product added', 'success');
      TE.App.navigate('products');
    }
  }

  function showCategoryModal(categories) {
    const t = TE.Lang.t;
    const form = el('div');
    function renderList() {
      form.innerHTML = '';
      const list = el('div', { className: 'mb-16' });
      categories.forEach(c => {
        const row = el('div', { className: 'flex-between', style: { padding: '8px 0', borderBottom: '1px solid var(--border)' } }, [
          el('span', {}, c.name),
          el('button', { className: 'btn btn-ghost btn-sm text-danger', onClick: async () => {
            categories = categories.filter(x => x.id !== c.id);
            await TE.Store.del('categories', c.id);
            renderList();
          }}, t('delete')),
        ]);
        list.appendChild(row);
      });
      form.appendChild(list);
      const addRow = el('div', { className: 'form-inline' }, [
        el('input', { type: 'text', className: 'form-input', id: 'newCatName', placeholder: 'New category name' }),
        el('button', { className: 'btn btn-primary', onClick: async () => {
          const name = document.getElementById('newCatName').value.trim();
          if (!name) return;
          const cat = { id: 'CAT' + String(categories.length + 1).padStart(3, '0'), name };
          await TE.Store.put('categories', cat);
          categories.push(cat);
          renderList();
        }}, t('add')),
      ]);
      form.appendChild(addRow);
    }
    renderList();
    modal(t('categories'), form);
  }

  return { render };
})();
