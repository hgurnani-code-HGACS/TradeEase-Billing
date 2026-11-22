window.TE = window.TE || {};

TE.Lang = (function () {
  let currentLang = 'en';

  const dict = {
    en: {
      // Sidebar
      app_name: 'TradeEase',
      dashboard: 'Dashboard',
      sales_billing: 'Sales Billing',
      invoice_history: 'Invoice History',
      products: 'Products',
      customers: 'Customers',
      reports: 'Reports',
      settings: 'Settings',

      // Topbar
      new_invoice: 'New Invoice',

      // Billing page
      new_sales_invoice: 'New Sales Invoice',
      quick_billing: 'Quick Billing',
      invoice_number: 'Invoice Number',
      invoice_date: 'Invoice Date',
      customer: 'Customer',
      select_customer: 'Select customer...',
      type_customer: 'Type customer name or mobile...',
      add_new_customer: '+ Add New Customer',
      change: 'Change',
      no_customer: 'No mobile',
      no_gstin: 'No GSTIN',

      // Categories & Products
      all_products: 'All',
      search_products: 'Search products...',
      stock: 'Stock',
      out_of_stock: 'Out of stock',
      add: 'Add',
      no_products_in_category: 'No products in this category',

      // Cart
      cart: 'Cart',
      cart_empty: 'Cart is empty',
      cart_empty_hint: 'Tap products to add them',
      items: 'items',
      item: 'item',
      clear_cart: 'Clear',
      subtotal: 'Subtotal',
      discount: 'Discount',
      taxable_amount: 'Taxable Amount',
      cgst: 'CGST',
      sgst: 'SGST',
      igst: 'IGST',
      grand_total: 'Grand Total',

      // Checkout
      payment_mode: 'Payment Mode',
      invoice_discount: 'Invoice Discount',
      notes: 'Notes',
      optional_notes: 'Optional notes',
      save_draft: 'Save Draft',
      post_invoice: 'Post & Generate Invoice',
      clear_bill: 'Clear',

      // Payment modes
      cash: 'Cash',
      upi: 'UPI',
      bank_transfer: 'Bank Transfer',
      credit: 'Credit',
      cheque: 'Cheque',

      // Invoice Items (table view)
      invoice_items: 'Invoice Items',
      product: 'Product',
      hsn: 'HSN',
      qty: 'Qty',
      unit: 'Unit',
      rate: 'Rate',
      disc_pct: 'Disc%',
      gst_pct: 'GST%',
      amount: 'Amount',
      type_sku: 'Type SKU or product name to add...',

      // Toasts
      select_customer_first: 'Please select a customer',
      add_items_first: 'Please add at least one item',
      invoice_posted: 'Invoice posted successfully!',
      draft_saved: 'Draft saved',

      // Dashboard
      todays_sales: "Today's Sales",
      this_month: 'This Month',
      total_revenue: 'Total Revenue',
      low_stock_alerts: 'Low Stock Alerts',
      invoices: 'invoice(s)',
      total_invoices: 'total invoices',
      of_active: 'of {n} active products',
      recent_invoices: 'Recent Invoices',
      low_stock_products: 'Low Stock Products',
      no_invoices_yet: 'No invoices yet',
      sku: 'SKU',
      min: 'Min',

      // Product Master
      product_master: 'Product Master',
      search_products_master: 'Search products...',
      categories: 'Categories',
      add_product: 'Add Product',
      edit: 'Edit',
      active: 'Active',
      inactive: 'Inactive',
      purchase: 'Purchase',
      selling: 'Selling',
      mrp: 'MRP',
      status: 'Status',
      actions: 'Actions',
      no_products_found: 'No products found',

      // Customer Master
      customer_master: 'Customer Master',
      search_customers: 'Search customers...',
      add_customer: 'Add Customer',
      mobile: 'Mobile',
      address: 'Address',
      type: 'Type',
      balance: 'Balance',

      // Reports
      reports_mis: 'Reports & MIS',

      // Settings
      business_settings: 'Business Settings',

      // Payment Discount Master
      payment_discount_config: 'Payment Discount Configuration',
      payment_discount_hint: 'Set default discount % for each payment mode. Auto-applies when payment mode is selected during billing.',
      default_discount_pct: 'Default Discount %',
      save_discount_config: 'Save Discount Config',
      discount_config_saved: 'Discount configuration saved',

      // Invoice History KPIs
      sold: 'Sold',
      avg_rate: 'Avg Rate',
      showing_invoices_for: 'Showing invoices for',
      clear_filter: 'Clear Filter',

      // General
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      confirm: 'Confirm',
      loading: 'Loading...',
      error_loading: 'Error loading page',
      no_matches: 'No matches found',
      no_results: 'No products found',
    },

    hi: {
      // Sidebar
      app_name: 'ट्रेडईज़',
      dashboard: 'डैशबोर्ड',
      sales_billing: 'बिक्री बिलिंग',
      invoice_history: 'बिल इतिहास',
      products: 'उत्पाद',
      customers: 'ग्राहक',
      reports: 'रिपोर्ट',
      settings: 'सेटिंग्स',

      // Topbar
      new_invoice: 'नया बिल',

      // Billing page
      new_sales_invoice: 'नया बिक्री बिल',
      quick_billing: 'क्विक बिलिंग',
      invoice_number: 'बिल नंबर',
      invoice_date: 'बिल की तारीख',
      customer: 'ग्राहक',
      select_customer: 'ग्राहक चुनें...',
      type_customer: 'ग्राहक का नाम या मोबाइल टाइप करें...',
      add_new_customer: '+ नया ग्राहक जोड़ें',
      change: 'बदलें',
      no_customer: 'मोबाइल नहीं',
      no_gstin: 'GSTIN नहीं',

      // Categories & Products
      all_products: 'सभी',
      search_products: 'उत्पाद खोजें...',
      stock: 'स्टॉक',
      out_of_stock: 'स्टॉक नहीं',
      add: 'जोड़ें',
      no_products_in_category: 'इस श्रेणी में कोई उत्पाद नहीं',

      // Cart
      cart: 'कार्ट',
      cart_empty: 'कार्ट खाली है',
      cart_empty_hint: 'उत्पाद जोड़ने के लिए टैप करें',
      items: 'आइटम',
      item: 'आइटम',
      clear_cart: 'खाली करें',
      subtotal: 'उपयोग',
      discount: 'छूट',
      taxable_amount: 'कर योग्य राशि',
      cgst: 'CGST',
      sgst: 'SGST',
      igst: 'IGST',
      grand_total: 'कुल योग',

      // Checkout
      payment_mode: 'भुगतान का तरीका',
      invoice_discount: 'बिल छूट',
      notes: 'नोट्स',
      optional_notes: 'वैकल्पिक नोट्स',
      save_draft: 'ड्राफ्ट सहेजें',
      post_invoice: 'बिल बनाएं और सहेजें',
      clear_bill: 'खाली करें',

      // Payment modes
      cash: 'नकद',
      upi: 'UPI',
      bank_transfer: 'बैंक ट्रांसफर',
      credit: 'उधार',
      cheque: 'चेक',

      // Invoice Items (table view)
      invoice_items: 'बिल आइटम',
      product: 'उत्पाद',
      hsn: 'HSN',
      qty: 'मात्रा',
      unit: 'इकाई',
      rate: 'दर',
      disc_pct: 'छूट%',
      gst_pct: 'GST%',
      amount: 'राशि',
      type_sku: 'SKU या उत्पाद का नाम टाइप करें...',

      // Toasts
      select_customer_first: 'कृपया ग्राहक चुनें',
      add_items_first: 'कृपया कम से कम एक आइटम जोड़ें',
      invoice_posted: 'बिल सफलतापूर्वक बनाया गया!',
      draft_saved: 'ड्राफ्ट सहेजा गया',

      // Dashboard
      todays_sales: 'आज की बिक्री',
      this_month: 'इस महीने',
      total_revenue: 'कुल आय',
      low_stock_alerts: 'कम स्टॉक अलर्ट',
      invoices: 'बिल',
      total_invoices: 'कुल बिल',
      of_active: '{n} सक्रिय उत्पादों में से',
      recent_invoices: 'हाल के बिल',
      low_stock_products: 'कम स्टॉक उत्पाद',
      no_invoices_yet: 'अभी तक कोई बिल नहीं',
      sku: 'SKU',
      min: 'न्यूनतम',

      // Product Master
      product_master: 'उत्पाद मास्टर',
      search_products_master: 'उत्पाद खोजें...',
      categories: 'श्रेणियाँ',
      add_product: 'उत्पाद जोड़ें',
      edit: 'संपादन',
      active: 'सक्रिय',
      inactive: 'निष्क्रिय',
      purchase: 'खरीद',
      selling: 'बिक्री',
      mrp: 'MRP',
      status: 'स्थिति',
      actions: 'कार्रवाई',
      no_products_found: 'कोई उत्पाद नहीं मिला',

      // Customer Master
      customer_master: 'ग्राहक मास्टर',
      search_customers: 'ग्राहक खोजें...',
      add_customer: 'ग्राहक जोड़ें',
      mobile: 'मोबाइल',
      address: 'पता',
      type: 'प्रकार',
      balance: 'बकाया',

      // Reports
      reports_mis: 'रिपोर्ट और MIS',

      // Settings
      business_settings: 'व्यवसाय सेटिंग्स',

      // Payment Discount Master
      payment_discount_config: 'भुगतान छूट कॉन्फ़िगरेशन',
      payment_discount_hint: 'प्रत्येक भुगतान मोड के लिए डिफ़ॉल्ट छूट % सेट करें। बिलिंग में भुगतान मोड चुनने पर स्वत: लागू होता है।',
      default_discount_pct: 'डिफ़ॉल्ट छूट %',
      save_discount_config: 'छूट कॉन्फ़िग सहेजें',
      discount_config_saved: 'छूट कॉन्फ़िगरेशन सहेजा गया',

      // Invoice History KPIs
      sold: 'बिक्री',
      avg_rate: 'औसत दर',
      showing_invoices_for: 'के लिए बिल दिखा रहे हैं',
      clear_filter: 'फ़िल्टर हटाएं',

      // General
      save: 'सहेजें',
      cancel: 'रद्द करें',
      delete: 'हटाएं',
      confirm: 'पुष्टि करें',
      loading: 'लोड हो रहा है...',
      error_loading: 'पेज लोड करने में त्रुटि',
      no_matches: 'कोई मिलान नहीं मिला',
      no_results: 'कोई उत्पाद नहीं मिला',
    }
  };

  function t(key) {
    return (dict[currentLang] && dict[currentLang][key]) || dict.en[key] || key;
  }

  function getLang() { return currentLang; }

  async function setLang(code) {
    if (code !== 'en' && code !== 'hi') return;
    currentLang = code;
    await TE.Store.setSetting('language', code);
    document.documentElement.lang = code === 'hi' ? 'hi' : 'en';
  }

  async function init() {
    const saved = await TE.Store.getSetting('language');
    if (saved === 'hi' || saved === 'en') currentLang = saved;
    document.documentElement.lang = currentLang === 'hi' ? 'hi' : 'en';
  }

  return { t, getLang, setLang, init, dict };
})();
