window.TE = window.TE || {};

TE.Store = (function () {
  const DB_NAME = 'TradeEaseDB';
  const DB_VERSION = 1;
  let db = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        const d = e.target.result;

        const products = d.createObjectStore('products', { keyPath: 'sku_code' });
        products.createIndex('category', 'category', { unique: false });
        products.createIndex('brand', 'brand', { unique: false });
        products.createIndex('status', 'status', { unique: false });
        products.createIndex('product_name', 'product_name', { unique: false });

        d.createObjectStore('categories', { keyPath: 'id' });

        const customers = d.createObjectStore('customers', { keyPath: 'customer_id' });
        customers.createIndex('customer_name', 'customer_name', { unique: false });
        customers.createIndex('mobile', 'mobile', { unique: false });

        const salesH = d.createObjectStore('sales_header', { keyPath: 'invoice_number' });
        salesH.createIndex('invoice_date', 'invoice_date', { unique: false });
        salesH.createIndex('customer_id', 'customer_id', { unique: false });
        salesH.createIndex('status', 'status', { unique: false });

        const salesD = d.createObjectStore('sales_details', { keyPath: 'id' });
        salesD.createIndex('invoice_number', 'invoice_number', { unique: false });

        const stock = d.createObjectStore('stock_ledger', { keyPath: 'id' });
        stock.createIndex('sku_code', 'sku_code', { unique: false });
        stock.createIndex('date', 'date', { unique: false });

        d.createObjectStore('settings', { keyPath: 'key' });
      };
      req.onsuccess = function (e) {
        db = e.target.result;
        resolve(db);
      };
      req.onerror = function (e) { reject(e.target.error); };
    });
  }

  function tx(storeName, mode) {
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  function promisify(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getAll(storeName) {
    await open();
    return promisify(tx(storeName, 'readonly').getAll());
  }

  async function get(storeName, key) {
    await open();
    return promisify(tx(storeName, 'readonly').get(key));
  }

  async function put(storeName, data) {
    await open();
    return promisify(tx(storeName, 'readwrite').put(data));
  }

  async function add(storeName, data) {
    await open();
    return promisify(tx(storeName, 'readwrite').add(data));
  }

  async function del(storeName, key) {
    await open();
    return promisify(tx(storeName, 'readwrite').delete(key));
  }

  async function getByIndex(storeName, indexName, value) {
    await open();
    return promisify(tx(storeName, 'readonly').index(indexName).getAll(value));
  }

  async function count(storeName) {
    await open();
    return promisify(tx(storeName, 'readonly').count());
  }

  async function clear(storeName) {
    await open();
    return promisify(tx(storeName, 'readwrite').clear());
  }

  async function getSetting(key) {
    const row = await get('settings', key);
    return row ? row.value : null;
  }

  async function setSetting(key, value) {
    return put('settings', { key, value });
  }

  async function getNextInvoiceNumber() {
    const prefix = (await getSetting('invoice_prefix')) || 'INV';
    const next = (await getSetting('next_invoice_number')) || 1;
    const padded = String(next).padStart(5, '0');
    return `${prefix}-${padded}`;
  }

  async function incrementInvoiceNumber() {
    const current = (await getSetting('next_invoice_number')) || 1;
    await setSetting('next_invoice_number', current + 1);
  }

  async function getStockBalance(skuCode) {
    const entries = await getByIndex('stock_ledger', 'sku_code', skuCode);
    let balance = 0;
    for (const e of entries) {
      balance += (e.quantity_in || 0) - (e.quantity_out || 0);
    }
    return balance;
  }

  async function addStockEntry(entry) {
    entry.id = entry.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    return put('stock_ledger', entry);
  }

  async function seed() {
    const pCount = await count('products');
    if (pCount > 0) return;

    const defaultCategories = [
      { id: 'CAT001', name: 'Cardamom (Elaichi)' },
      { id: 'CAT002', name: 'Fennel Seeds (Saunf)' },
      { id: 'CAT003', name: 'Mouth Fresheners (Mukhwas)' },
      { id: 'CAT004', name: 'Mixed Mouth Freshener' },
      { id: 'CAT005', name: 'Flavoured Seeds' },
      { id: 'CAT006', name: 'Traditional Indian Mouth Fresheners' },
      { id: 'CAT007', name: 'Packaged Food Products' },
    ];
    for (const c of defaultCategories) await put('categories', c);

    const sampleProducts = [
      { sku_code: 'ELA-GRN-100', product_name: 'Green Cardamom 100g', category: 'CAT001', brand: 'TradeEase', description: 'Premium Green Cardamom 100g Pack', hsn_code: '0908', gst_rate: 5, purchase_price: 180, selling_price: 220, mrp: 250, unit: 'Pcs', packaging_size: '100g', min_stock_level: 20, status: 'active' },
      { sku_code: 'ELA-GRN-250', product_name: 'Green Cardamom 250g', category: 'CAT001', brand: 'TradeEase', description: 'Premium Green Cardamom 250g Pack', hsn_code: '0908', gst_rate: 5, purchase_price: 420, selling_price: 520, mrp: 580, unit: 'Pcs', packaging_size: '250g', min_stock_level: 15, status: 'active' },
      { sku_code: 'SNF-PLN-100', product_name: 'Plain Saunf 100g', category: 'CAT002', brand: 'TradeEase', description: 'Natural Fennel Seeds 100g', hsn_code: '0909', gst_rate: 5, purchase_price: 30, selling_price: 45, mrp: 50, unit: 'Pcs', packaging_size: '100g', min_stock_level: 50, status: 'active' },
      { sku_code: 'SNF-SGR-200', product_name: 'Sugar Coated Saunf 200g', category: 'CAT002', brand: 'TradeEase', description: 'Sugar Coated Fennel Seeds 200g', hsn_code: '0909', gst_rate: 12, purchase_price: 55, selling_price: 80, mrp: 90, unit: 'Pcs', packaging_size: '200g', min_stock_level: 40, status: 'active' },
      { sku_code: 'MKW-MIX-100', product_name: 'Mixed Mukhwas 100g', category: 'CAT003', brand: 'TradeEase', description: 'Assorted Mouth Freshener Mix 100g', hsn_code: '2008', gst_rate: 12, purchase_price: 40, selling_price: 60, mrp: 70, unit: 'Pcs', packaging_size: '100g', min_stock_level: 60, status: 'active' },
      { sku_code: 'MKW-PAN-50', product_name: 'Pan Mukhwas 50g', category: 'CAT003', brand: 'TradeEase', description: 'Pan Flavoured Mouth Freshener 50g', hsn_code: '2008', gst_rate: 12, purchase_price: 25, selling_price: 40, mrp: 45, unit: 'Pcs', packaging_size: '50g', min_stock_level: 80, status: 'active' },
      { sku_code: 'MIX-DLX-250', product_name: 'Deluxe Mix Mukhwas 250g', category: 'CAT004', brand: 'TradeEase', description: 'Premium Mixed Mouth Freshener 250g', hsn_code: '2008', gst_rate: 12, purchase_price: 90, selling_price: 140, mrp: 160, unit: 'Pcs', packaging_size: '250g', min_stock_level: 30, status: 'active' },
      { sku_code: 'FLV-WTM-100', product_name: 'Watermelon Seeds Flavoured 100g', category: 'CAT005', brand: 'TradeEase', description: 'Flavoured Watermelon Seeds 100g', hsn_code: '1207', gst_rate: 5, purchase_price: 60, selling_price: 90, mrp: 100, unit: 'Pcs', packaging_size: '100g', min_stock_level: 40, status: 'active' },
      { sku_code: 'TRD-SPL-200', product_name: 'Special Meetha Paan 200g', category: 'CAT006', brand: 'TradeEase', description: 'Traditional Sweet Paan Mix 200g', hsn_code: '2106', gst_rate: 18, purchase_price: 70, selling_price: 110, mrp: 130, unit: 'Pcs', packaging_size: '200g', min_stock_level: 25, status: 'active' },
      { sku_code: 'PKD-CHW-30', product_name: 'Chewable Mint Strips 30pcs', category: 'CAT007', brand: 'TradeEase', description: 'Mint Flavoured Chewable Strips', hsn_code: '1704', gst_rate: 18, purchase_price: 15, selling_price: 25, mrp: 30, unit: 'Pcs', packaging_size: '30 Strips', min_stock_level: 100, status: 'active' },
    ];
    for (const p of sampleProducts) await put('products', p);

    for (const p of sampleProducts) {
      const qty = Math.floor(Math.random() * 100) + 20;
      await addStockEntry({
        date: new Date().toISOString().split('T')[0],
        sku_code: p.sku_code,
        type: 'opening',
        reference_number: 'OPENING',
        quantity_in: qty,
        quantity_out: 0,
        notes: 'Opening stock',
      });
    }

    const sampleCustomers = [
      { customer_id: 'CUST001', customer_name: 'Sharma General Store', mobile: '9876543210', billing_address: '12, MG Road, Ahmedabad, Gujarat – 380001', shipping_address: '12, MG Road, Ahmedabad, Gujarat – 380001', gstin: '24AABCS1234A1Z5', state: 'Gujarat', state_code: '24', customer_type: 'Retail', opening_balance: 0, payment_terms: '15 days' },
      { customer_id: 'CUST002', customer_name: 'Patel Traders', mobile: '9898765432', billing_address: '45, Ring Road, Rajkot, Gujarat – 360001', shipping_address: '45, Ring Road, Rajkot, Gujarat – 360001', gstin: '24AABCP5678B2Z3', state: 'Gujarat', state_code: '24', customer_type: 'Wholesale', opening_balance: 5000, payment_terms: '30 days' },
      { customer_id: 'CUST003', customer_name: 'Mumbai Mart', mobile: '9823456789', billing_address: '78, Linking Road, Mumbai, Maharashtra – 400050', shipping_address: '78, Linking Road, Mumbai, Maharashtra – 400050', gstin: '27AABCM9012C3Z1', state: 'Maharashtra', state_code: '27', customer_type: 'Distributor', opening_balance: 12000, payment_terms: '30 days' },
    ];
    for (const c of sampleCustomers) await put('customers', c);

    await setSetting('invoice_title', 'Quotation');
    await setSetting('invoice_prefix', 'INV');
    await setSetting('next_invoice_number', 1);
    await setSetting('business_name', 'TradeEase FMCG Trading');
    await setSetting('business_address', '123, Business Park, Ahmedabad, Gujarat – 380015');
    await setSetting('business_gstin', '24AAAAA0000A1Z5');
    await setSetting('business_state', 'Gujarat');
    await setSetting('business_state_code', '24');
    await setSetting('business_phone', '9876543210');
    await setSetting('business_email', 'info@tradeease.in');
    await setSetting('business_bank_name', 'State Bank of India');
    await setSetting('business_account_number', '12345678901234');
    await setSetting('business_ifsc', 'SBIN0001234');
    await setSetting('business_upi', 'tradeease@upi');
    await setSetting('payment_discount_master', {
      Cash: 10, UPI: 5, 'Bank Transfer': 0, Credit: 0, Cheque: 0
    });
  }

  return {
    open, getAll, get, put, add, del, getByIndex, count, clear,
    getSetting, setSetting, getNextInvoiceNumber, incrementInvoiceNumber,
    getStockBalance, addStockEntry, seed,
  };
})();
