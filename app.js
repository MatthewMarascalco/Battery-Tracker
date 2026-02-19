// ===== State Store =====
const store = {
  deals: [],
  currentDeal: null,
  filters: {
    search: '',
    status: 'all'
  },
  pagination: {
    page: 1,
    pageSize: 20,
    hasMore: true
  },
  isLoading: false,

  subscribe(callback) {
    if (!this.listeners) this.listeners = [];
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  },

  notify() {
    if (this.listeners) {
      this.listeners.forEach(cb => cb(this));
    }
  },

  setState(updates) {
    Object.assign(this, updates);
    this.notify();
  }
};

// ===== Supabase Client =====
let supabaseClient;

function initSupabase() {
  console.log('Checking Supabase config...');
  console.log('SUPABASE_URL:', typeof SUPABASE_URL !== 'undefined' ? 'defined' : 'undefined');
  console.log('SUPABASE_ANON_KEY:', typeof SUPABASE_ANON_KEY !== 'undefined' ? 'defined' : 'undefined');
  console.log('window.supabase:', typeof window.supabase);

  // Check if Supabase library loaded
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase library not loaded. Check the CDN script tag.');
    alert('Error: Supabase library failed to load. Please check your internet connection.');
    return false;
  }

  if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
    console.error('Supabase credentials not configured. Please fill in config.js');
    alert('Configuration error: Please check that config.js exists and contains your Supabase credentials');
    return false;
  }

  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client created');
    return true;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    alert('Failed to connect to database: ' + err.message);
    return false;
  }
}

// ===== API Functions =====
const api = {
  async createDeal(dealData) {
    const { data, error } = await supabaseClient
      .from('deals')
      .insert([{
        deal_date: dealData.deal_date,
        seller_name: dealData.seller_name,
        seller_contact: dealData.seller_contact || null,
        purchase_type: dealData.purchase_type,
        quantity: dealData.purchase_type === 'by_piece' ? dealData.quantity : null,
        weight_lbs: dealData.purchase_type === 'by_weight' ? dealData.weight_lbs : null,
        purchase_price: dealData.purchase_price,
        sell_price: dealData.sell_price || null,
        notes: dealData.notes || null,
        status: dealData.sell_price ? 'sold' : 'purchased'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getDeals(options = {}) {
    const { page = 1, pageSize = 20, search = '', status = 'all' } = options;

    let query = supabaseClient
      .from('deals')
      .select('*', { count: 'exact' })
      .order('deal_date', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.ilike('seller_name', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data || [], count, hasMore: data && data.length === pageSize };
  },

  async getDeal(id) {
    const { data, error } = await supabaseClient
      .from('deals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async updateDeal(id, updates) {
    const updateData = {
      ...updates,
      status: updates.sell_price ? 'sold' : 'purchased'
    };

    const { data, error } = await supabaseClient
      .from('deals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteDeal(id) {
    const { error } = await supabaseClient
      .from('deals')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async getStats() {
    const { data: allDeals, error } = await supabaseClient
      .from('deals')
      .select('*');

    if (error) throw error;

    const totalDeals = allDeals.length;
    const totalSpent = allDeals.reduce((sum, d) => sum + (d.purchase_price || 0), 0);
    const soldDeals = allDeals.filter(d => d.sell_price !== null);
    const totalRevenue = soldDeals.reduce((sum, d) => sum + (d.sell_price || 0), 0);
    const unsoldCount = allDeals.filter(d => d.status === 'purchased').length;

    return {
      totalDeals,
      totalSpent,
      totalRevenue,
      profit: totalRevenue - totalSpent,
      unsoldCount
    };
  },

  async getDetailedStats() {
    const { data: deals, error } = await supabaseClient
      .from('deals')
      .select('*');

    if (error) throw error;

    // Best seller
    const sellerTotals = {};
    deals.forEach(d => {
      sellerTotals[d.seller_name] = (sellerTotals[d.seller_name] || 0) + d.purchase_price;
    });
    const sortedSellers = Object.entries(sellerTotals).sort((a, b) => b[1] - a[1]);
    const bestSeller = sortedSellers.length > 0 ? { name: sortedSellers[0][0], total: sortedSellers[0][1] } : null;

    // Average profit per deal (only sold deals)
    const soldDeals = deals.filter(d => d.sell_price !== null);
    const avgProfit = soldDeals.length > 0
      ? soldDeals.reduce((sum, d) => sum + ((d.sell_price || 0) - d.purchase_price), 0) / soldDeals.length
      : 0;

    // Total batteries by piece
    const pieceDeals = deals.filter(d => d.purchase_type === 'by_piece');
    const totalPieces = pieceDeals.reduce((sum, d) => sum + (d.quantity || 0), 0);

    // Total weight
    const weightDeals = deals.filter(d => d.purchase_type === 'by_weight');
    const totalWeight = weightDeals.reduce((sum, d) => sum + (d.weight_lbs || 0), 0);

    // Monthly breakdown
    const monthlyData = {};
    deals.forEach(d => {
      const month = d.deal_date.substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { deals: 0, spent: 0, revenue: 0 };
      }
      monthlyData[month].deals++;
      monthlyData[month].spent += d.purchase_price;
      if (d.sell_price) {
        monthlyData[month].revenue += d.sell_price;
      }
    });

    return {
      bestSeller,
      avgProfit,
      totalPieces,
      totalWeight,
      monthlyBreakdown: monthlyData
    };
  }
};

// ===== Router =====
const router = window.router = {
  currentView: 'dashboard',
  params: {},

  navigate(viewId, params = {}) {
    console.log('Navigating to:', viewId, params);
    this.currentView = viewId;
    this.params = params;

    // Update view visibility
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    const viewEl = document.getElementById(`view-${viewId}`);
    if (viewEl) {
      viewEl.classList.add('active');
    } else {
      console.error('View element not found:', `view-${viewId}`);
    }

    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewId);
    });

    // Update page title
    const titles = {
      dashboard: 'Dashboard',
      'new-deal': 'New Deal',
      history: 'Deal History',
      edit: 'Edit Deal',
      stats: 'Statistics'
    };
    document.getElementById('page-title').textContent = titles[viewId] || 'Battery Tracker';

    // Initialize view
    this.initView(viewId, params);

    window.scrollTo(0, 0);
  },

  initView(viewId, params) {
    switch(viewId) {
      case 'dashboard':
        loadDashboard();
        break;
      case 'new-deal':
        initNewDealForm();
        break;
      case 'history':
        loadDealsHistory();
        break;
      case 'edit':
        loadEditDeal(params.id);
        break;
      case 'stats':
        loadStats();
        break;
    }
  }
};

// ===== Dashboard View =====
async function loadDashboard() {
  try {
    const stats = await api.getStats();

    // Update stats display
    document.getElementById('stat-total-deals').textContent = stats.totalDeals;
    document.getElementById('stat-total-spent').textContent = formatCurrency(stats.totalSpent);
    document.getElementById('stat-total-revenue').textContent = formatCurrency(stats.totalRevenue);
    document.getElementById('stat-profit').textContent = formatCurrency(stats.profit);

    // Update unsold alert
    document.getElementById('unsold-count').textContent = stats.unsoldCount;

    // Load recent deals (last 5)
    const { data: recentDeals } = await api.getDeals({ page: 1, pageSize: 5 });
    renderRecentDeals(recentDeals);
  } catch (err) {
    console.error('Failed to load dashboard:', err);
    showError('Failed to load dashboard data');
  }
}

function renderRecentDeals(deals) {
  const container = document.getElementById('recent-deals-list');

  if (!deals || deals.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No deals yet. Create your first deal!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = deals.map(deal => {
    const isSold = deal.status === 'sold';
    const profit = (deal.sell_price || 0) - deal.purchase_price;

    return `
      <div class="deal-card ${isSold ? 'sold' : ''}" onclick="router.navigate('edit', { id: '${deal.id}' })" style="margin-bottom: var(--space-md);">
        <div class="deal-header">
          <span class="deal-seller">${escapeHtml(deal.seller_name)}</span>
          <span class="deal-date">${formatDate(deal.deal_date)}</span>
        </div>
        <div class="deal-details" style="grid-template-columns: repeat(2, 1fr); margin-top: var(--space-sm);">
          <div class="deal-detail">
            <span class="deal-detail-value">${formatCurrency(deal.purchase_price)}</span>
            <span class="deal-detail-label">Paid</span>
          </div>
          <div class="deal-detail">
            <span class="deal-detail-value deal-profit ${profit < 0 ? 'negative' : ''}">${isSold ? formatCurrency(profit) : '--'}</span>
            <span class="deal-detail-label">Profit</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== New Deal Form =====
function initNewDealForm() {
  const form = document.getElementById('new-deal-form');
  const dateInput = document.getElementById('deal-date');

  // Set default date to today
  dateInput.valueAsDate = new Date();

  // Purchase type toggle
  const toggleBtns = form.querySelectorAll('.toggle-btn');
  const typeInput = document.getElementById('purchase-type');
  const pieceField = document.getElementById('piece-field');
  const weightField = document.getElementById('weight-field');

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const type = btn.dataset.type;
      typeInput.value = type;

      if (type === 'by_piece') {
        pieceField.classList.remove('hidden');
        weightField.classList.add('hidden');
        document.getElementById('quantity').required = true;
        document.getElementById('weight-lbs').required = false;
      } else {
        pieceField.classList.add('hidden');
        weightField.classList.remove('hidden');
        document.getElementById('quantity').required = false;
        document.getElementById('weight-lbs').required = true;
      }
    });
  });

  // Form submission
  form.onsubmit = async (e) => {
    e.preventDefault();

    const purchaseType = typeInput.value;
    const formData = {
      deal_date: document.getElementById('deal-date').value,
      seller_name: document.getElementById('seller-name').value.trim(),
      seller_contact: document.getElementById('seller-contact').value.trim() || null,
      purchase_type: purchaseType,
      quantity: purchaseType === 'by_piece' ? parseInt(document.getElementById('quantity').value) || null : null,
      weight_lbs: purchaseType === 'by_weight' ? parseFloat(document.getElementById('weight-lbs').value) || null : null,
      purchase_price: parseFloat(document.getElementById('purchase-price').value),
      sell_price: parseFloat(document.getElementById('sell-price').value) || null,
      notes: document.getElementById('notes').value.trim() || null
    };

    try {
      await api.createDeal(formData);
      showToast('Deal logged successfully!');
      form.reset();
      dateInput.valueAsDate = new Date();
      // Reset toggle to default
      toggleBtns[0].click();
      router.navigate('dashboard');
    } catch (err) {
      console.error('Failed to create deal:', err);
      showError('Failed to save deal: ' + err.message);
    }
  };
}

// ===== Deals History View =====
function loadDealsHistory() {
  // Reset state
  store.setState({
    deals: [],
    pagination: { page: 1, pageSize: 20, hasMore: true },
    filters: { search: '', status: 'all' }
  });

  // Initialize search/filter handlers
  initSearchAndFilter();

  // Load initial deals
  loadDealsList(true);
}

function initSearchAndFilter() {
  const searchInput = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');

  // Remove old listeners by cloning and replacing
  const newSearchInput = searchInput.cloneNode(true);
  const newStatusFilter = statusFilter.cloneNode(true);
  searchInput.parentNode.replaceChild(newSearchInput, searchInput);
  statusFilter.parentNode.replaceChild(newStatusFilter, statusFilter);

  // Debounced search
  let searchTimeout;
  newSearchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      store.setState({
        filters: { ...store.filters, search: e.target.value },
        pagination: { ...store.pagination, page: 1, hasMore: true }
      });
      loadDealsList(true);
    }, 300);
  });

  // Status filter
  newStatusFilter.addEventListener('change', (e) => {
    store.setState({
      filters: { ...store.filters, status: e.target.value },
      pagination: { ...store.pagination, page: 1, hasMore: true }
    });
    loadDealsList(true);
  });
}

async function loadDealsList(reset = false) {
  if (store.isLoading) return;
  if (!reset && !store.pagination.hasMore) return;

  store.setState({ isLoading: true });

  try {
    const { data, hasMore } = await api.getDeals({
      page: store.pagination.page,
      pageSize: store.pagination.pageSize,
      search: store.filters.search,
      status: store.filters.status
    });

    store.setState({
      deals: reset ? data : [...store.deals, ...data],
      pagination: {
        ...store.pagination,
        page: store.pagination.page + 1,
        hasMore
      },
      isLoading: false
    });

    renderDealsList();
  } catch (err) {
    console.error('Failed to load deals:', err);
    store.setState({ isLoading: false });
    showError('Failed to load deals: ' + err.message);
  }
}

function renderDealsList() {
  const container = document.getElementById('deals-list');
  const deals = store.deals;

  if (deals.length === 0 && !store.isLoading) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">&#128196;</div>
        <p>No deals found</p>
      </div>
    `;
    return;
  }

  container.innerHTML = deals.map(deal => {
    const profit = (deal.sell_price || 0) - deal.purchase_price;
    const isSold = deal.status === 'sold';

    return `
      <div class="deal-card ${isSold ? 'sold' : ''}" onclick="router.navigate('edit', { id: '${deal.id}' })">
        <div class="deal-header">
          <span class="deal-seller">${escapeHtml(deal.seller_name)}</span>
          <span class="deal-date">${formatDate(deal.deal_date)}</span>
        </div>
        <span class="deal-type">${deal.purchase_type === 'by_piece' ? 'By Piece' : 'By Weight'}</span>
        <div class="deal-details">
          <div class="deal-detail">
            <span class="deal-detail-value">
              ${deal.purchase_type === 'by_piece'
                ? (deal.quantity || '-') + ' pcs'
                : (deal.weight_lbs || '-') + ' lbs'}
            </span>
            <span class="deal-detail-label">Quantity</span>
          </div>
          <div class="deal-detail">
            <span class="deal-detail-value">${formatCurrency(deal.purchase_price)}</span>
            <span class="deal-detail-label">Paid</span>
          </div>
          <div class="deal-detail">
            <span class="deal-detail-value deal-profit ${profit < 0 ? 'negative' : ''}">
              ${isSold ? formatCurrency(profit) : '--'}
            </span>
            <span class="deal-detail-label">Profit</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Add load more button if there are more results
  if (store.pagination.hasMore) {
    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.className = 'btn-secondary';
    loadMoreBtn.style.marginTop = 'var(--space-md)';
    loadMoreBtn.textContent = store.isLoading ? 'Loading...' : 'Load More';
    loadMoreBtn.onclick = () => loadDealsList(false);
    loadMoreBtn.disabled = store.isLoading;
    container.appendChild(loadMoreBtn);
  }
}

// ===== Edit Deal View =====
async function loadEditDeal(id) {
  try {
    const deal = await api.getDeal(id);
    store.setState({ currentDeal: deal });

    // Populate form
    document.getElementById('edit-deal-id').value = deal.id;
    document.getElementById('edit-deal-date').value = deal.deal_date;
    document.getElementById('edit-seller-name').value = deal.seller_name;
    document.getElementById('edit-seller-contact').value = deal.seller_contact || '';
    document.getElementById('edit-purchase-type').value = deal.purchase_type;
    document.getElementById('edit-purchase-type-display').value = deal.purchase_type === 'by_piece' ? 'By Piece' : 'By Weight';

    // Show/hide appropriate quantity field
    const pieceField = document.getElementById('edit-piece-field');
    const weightField = document.getElementById('edit-weight-field');

    if (deal.purchase_type === 'by_piece') {
      pieceField.classList.remove('hidden');
      weightField.classList.add('hidden');
      document.getElementById('edit-quantity').value = deal.quantity || '';
      document.getElementById('edit-weight-lbs').value = '';
    } else {
      pieceField.classList.add('hidden');
      weightField.classList.remove('hidden');
      document.getElementById('edit-quantity').value = '';
      document.getElementById('edit-weight-lbs').value = deal.weight_lbs || '';
    }

    document.getElementById('edit-purchase-price').value = deal.purchase_price;
    document.getElementById('edit-sell-price').value = deal.sell_price || '';
    document.getElementById('edit-notes').value = deal.notes || '';

    // Setup form submission
    const form = document.getElementById('edit-deal-form');
    form.onsubmit = async (e) => {
      e.preventDefault();

      const purchaseType = document.getElementById('edit-purchase-type').value;
      const updates = {
        deal_date: document.getElementById('edit-deal-date').value,
        seller_name: document.getElementById('edit-seller-name').value.trim(),
        seller_contact: document.getElementById('edit-seller-contact').value.trim() || null,
        purchase_type: purchaseType,
        quantity: purchaseType === 'by_piece' ? parseInt(document.getElementById('edit-quantity').value) || null : null,
        weight_lbs: purchaseType === 'by_weight' ? parseFloat(document.getElementById('edit-weight-lbs').value) || null : null,
        purchase_price: parseFloat(document.getElementById('edit-purchase-price').value),
        sell_price: parseFloat(document.getElementById('edit-sell-price').value) || null,
        notes: document.getElementById('edit-notes').value.trim() || null
      };

      try {
        await api.updateDeal(id, updates);
        showToast('Deal updated successfully!');
        router.navigate('history');
      } catch (err) {
        console.error('Failed to update deal:', err);
        showError('Failed to update deal: ' + err.message);
      }
    };

    // Setup delete button
    const deleteBtn = document.getElementById('delete-btn');
    deleteBtn.onclick = () => {
      showDeleteConfirmation(id);
    };

  } catch (err) {
    console.error('Failed to load deal:', err);
    showError('Failed to load deal: ' + err.message);
    router.navigate('history');
  }
}

function showDeleteConfirmation(id) {
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h3>Delete Deal?</h3>
      <p>This action cannot be undone. Are you sure you want to delete this deal?</p>
      <div class="modal-actions">
        <button class="btn-secondary" id="cancel-delete">Cancel</button>
        <button class="btn-danger" id="confirm-delete">Delete</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Handle cancel
  modal.querySelector('#cancel-delete').onclick = () => {
    modal.remove();
  };

  // Handle confirm
  modal.querySelector('#confirm-delete').onclick = async () => {
    try {
      await api.deleteDeal(id);
      modal.remove();
      showToast('Deal deleted successfully!');
      router.navigate('history');
    } catch (err) {
      console.error('Failed to delete deal:', err);
      modal.remove();
      showError('Failed to delete deal: ' + err.message);
    }
  };

  // Close on overlay click
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
}

// ===== Stats View =====
async function loadStats() {
  try {
    const stats = await api.getDetailedStats();

    // Best seller
    document.getElementById('stat-best-seller').textContent = stats.bestSeller
      ? `${escapeHtml(stats.bestSeller.name)} ($${stats.bestSeller.total.toFixed(0)})`
      : '--';

    // Average profit
    document.getElementById('stat-avg-profit').textContent = formatCurrency(stats.avgProfit);

    // Total pieces
    document.getElementById('stat-total-pieces').textContent = stats.totalPieces.toLocaleString();

    // Total weight
    document.getElementById('stat-total-weight').textContent = stats.totalWeight.toLocaleString();

    // Monthly breakdown
    renderMonthlyStats(stats.monthlyBreakdown);

  } catch (err) {
    console.error('Failed to load stats:', err);
    showError('Failed to load statistics: ' + err.message);
  }
}

function renderMonthlyStats(monthlyData) {
  const tbody = document.getElementById('monthly-stats-body');

  const months = Object.keys(monthlyData).sort().reverse();

  if (months.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">No data available</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = months.map(month => {
    const data = monthlyData[month];
    const profit = data.revenue - data.spent;
    const [year, monthNum] = month.split('-');
    const monthName = new Date(year, monthNum - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    return `
      <tr>
        <td>${monthName}</td>
        <td>${data.deals}</td>
        <td class="text-right">${formatCurrency(data.spent)}</td>
        <td class="text-right">${formatCurrency(data.revenue)}</td>
        <td class="text-right ${profit < 0 ? 'text-danger' : 'text-success'}">${formatCurrency(profit)}</td>
      </tr>
    `;
  }).join('');
}

// ===== Helper Functions =====
function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return '--';
  return '$' + Math.abs(value).toFixed(2);
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showError(message) {
  console.error('Error:', message);
  alert(message);
}

// ===== App Initialization =====
document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('App initializing...');

    // Register all UI event listeners first, unconditionally,
    // so navigation works even if Supabase fails to initialize.
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        console.log('Nav button clicked:', btn.dataset.view);
        router.navigate(btn.dataset.view);
      });
    });

    const btnNewDeal = document.getElementById('btn-new-deal');
    if (btnNewDeal) {
      btnNewDeal.addEventListener('click', () => router.navigate('new-deal'));
    }

    const btnCancelNew = document.getElementById('btn-cancel-new');
    if (btnCancelNew) {
      btnCancelNew.addEventListener('click', () => router.navigate('dashboard'));
    }

    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    if (btnCancelEdit) {
      btnCancelEdit.addEventListener('click', () => router.navigate('history'));
    }

    // Now initialize Supabase. If it fails, show an error but keep the UI functional.
    if (!initSupabase()) {
      console.error('Supabase initialization failed — data features unavailable.');
      document.getElementById('page-title').textContent = 'Config Error';
      const main = document.querySelector('.main-content');
      main.innerHTML = `
        <div style="padding: 2rem; color: #f87171; text-align: center;">
          <h2>Configuration Error</h2>
          <p>Could not connect to the database.</p>
          <p style="font-size: 0.85rem; color: #94a3b8; margin-top: 1rem;">
            Open your browser console (F12) for details.<br>
            Make sure <code>config.js</code> has a valid Supabase URL and anon key (starts with <code>eyJ...</code>).
          </p>
        </div>
      `;
      return;
    }

    console.log('Supabase initialized successfully');
    router.navigate('dashboard');
  } catch (err) {
    console.error('App initialization error:', err);
    alert('Error starting app: ' + err.message);
  }
});
