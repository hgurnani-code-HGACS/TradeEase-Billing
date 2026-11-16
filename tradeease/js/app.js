TE.App = (function () {
  const pageContent = () => document.getElementById('pageContent');
  const pageTitle = () => document.getElementById('pageTitle');
  const sidebarNav = () => document.getElementById('sidebarNav');

  const pageTitles = {
    dashboard: 'Dashboard',
    billing: 'New Sales Invoice',
    invoices: 'Invoice History',
    products: 'Product Master',
    customers: 'Customer Master',
    reports: 'Reports & MIS',
    settings: 'Business Settings',
  };

  let billingDraft = null;

  function navigate(page, data) {
    if (page === 'billing' && data) billingDraft = data;
    else if (page !== 'billing') billingDraft = null;

    const current = window.location.hash.replace('#', '') || 'dashboard';
    if (current === page) {
      renderPage(page);
    } else {
      window.location.hash = page;
    }
  }

  async function renderPage(page) {
    const container = pageContent();
    if (!container) return;

    pageTitle().textContent = pageTitles[page] || 'TradeEase';

    sidebarNav().querySelectorAll('a').forEach(a => {
      a.classList.toggle('active', a.dataset.page === page);
    });

    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">Loading...</div>';

    try {
      switch (page) {
        case 'dashboard':
          await TE.Dashboard.render(container);
          break;
        case 'billing':
          await TE.Billing.render(container, billingDraft);
          billingDraft = null;
          break;
        case 'invoices':
          await TE.Invoices.render(container);
          break;
        case 'products':
          await TE.Products.render(container);
          break;
        case 'customers':
          await TE.Customers.render(container);
          break;
        case 'reports':
          await TE.Reports.render(container);
          break;
        case 'settings':
          await TE.Settings.render(container);
          break;
        default:
          await TE.Dashboard.render(container);
      }
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><p>Error loading page: ${err.message}</p></div>`;
      console.error(err);
    }
  }

  function handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    renderPage(hash);
  }

  async function init() {
    await TE.Store.open();
    await TE.Store.seed();

    window.addEventListener('hashchange', handleRoute);
    handleRoute();

    document.getElementById('newInvoiceBtn')?.addEventListener('click', () => {
      TE.Billing.reset();
      navigate('billing');
    });

    document.getElementById('syncIndicator')?.addEventListener('click', () => navigate('settings'));
    if (TE.Settings.updateSyncIndicator) TE.Settings.updateSyncIndicator();

    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    if (hamburger && sidebar) {
      hamburger.addEventListener('click', () => sidebar.classList.toggle('open'));
      document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== hamburger) {
          sidebar.classList.remove('open');
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { navigate, renderPage };
})();
