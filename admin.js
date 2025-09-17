// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBs-7nJ3-L2IISbkB_B2PB6E_1y9ZmImUw",
    authDomain: "koco-delight.firebaseapp.com",
    projectId: "koco-delight",
    storageBucket: "koco-delight.firebasestorage.app",
    messagingSenderId: "587407788224",
    appId: "1:587407788224:web:dfe3a40919aabfc2200525",
    measurementId: "G-QZRMX4WN3G"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global Variables
let currentAdmin = null;
let allOrders = [];
let allCustomers = [];
let currentFilter = 'all';
let charts = {};
let isInitialized = false;
let loadingTimeouts = new Set();

// Admin User IDs (Replace with your admin email)
const ADMIN_EMAILS = [
    'moabrarakhunji@gmail.com', // Replace with your admin email
    'admin@kocodelight.com'
];

// Authentication State Management
auth.onAuthStateChanged(user => {
    console.log('Auth state changed:', user ? user.email : 'No user');
    
    if (user && ADMIN_EMAILS.includes(user.email)) {
        currentAdmin = user;
        updateAdminUI(user);
        
        if (!isInitialized) {
            initializeDashboard();
            isInitialized = true;
        }
    } else if (user) {
        // User is signed in but not admin
        showAccessDenied();
    } else {
        // User is not signed in
        showSignInForm();
    }
});

function updateAdminUI(user) {
    const nameEl = document.getElementById('admin-name');
    const emailEl = document.getElementById('admin-email');
    const avatarEl = document.getElementById('admin-avatar');
    
    if (nameEl) nameEl.textContent = user.displayName || 'Admin';
    if (emailEl) emailEl.textContent = user.email;
    if (avatarEl) {
        avatarEl.src = user.photoURL || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Admin')}&background=FCD34D&color=1F2937&size=32`;
    }
}

function showAccessDenied() {
    document.body.innerHTML = `
        <div class="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
            <div class="text-center p-8 glass-effect rounded-2xl max-w-md">
                <div class="text-6xl text-red-400 mb-4">🚫</div>
                <h2 class="text-2xl font-bold text-red-400 mb-2">Access Denied</h2>
                <p class="text-gray-300 mb-6">You don't have admin permissions to access this dashboard.</p>
                <button onclick="signOut()" class="btn-primary">
                    <i class="fas fa-sign-out-alt mr-2"></i>
                    Sign Out
                </button>
            </div>
        </div>
    `;
}

function showSignInForm() {
    document.body.innerHTML = `
        <div class="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
            <div class="text-center p-8 glass-effect rounded-2xl max-w-md">
                <div class="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                    <i class="fas fa-crown text-yellow-900 text-2xl"></i>
                </div>
                <h2 class="text-3xl font-bold text-yellow-400 mb-2">Admin Portal</h2>
                <p class="text-gray-300 mb-8">Sign in with your admin account to access the dashboard</p>
                <button onclick="signInWithGoogle()" class="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:scale-105 transform transition-all duration-300">
                    <i class="fab fa-google mr-2"></i>
                    Sign in with Google
                </button>
                <p class="text-xs text-gray-500 mt-4">Only authorized administrators can access this system</p>
            </div>
        </div>
    `;
}

async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    
    try {
        const result = await auth.signInWithPopup(provider);
        console.log('Admin sign-in successful:', result.user.email);
    } catch (error) {
        console.error('Sign-in error:', error);
        alert('Sign-in failed: ' + error.message);
    }
}

function signOut() {
    auth.signOut().then(() => {
        console.log('Admin signed out');
        isInitialized = false;
        // Clear all timeouts
        loadingTimeouts.forEach(timeout => clearTimeout(timeout));
        loadingTimeouts.clear();
        location.reload();
    }).catch(error => {
        console.error('Sign-out error:', error);
    });
}

// Dashboard Initialization with proper error handling
async function initializeDashboard() {
    console.log('Initializing admin dashboard...');
    
    try {
        // Show loading states
        showLoadingStates();
        
        // Load data with timeout protection
        const loadDataPromise = Promise.all([
            loadOrders(),
            loadCustomers()
        ]);
        
        // Set timeout for data loading
        const timeoutPromise = new Promise((_, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Data loading timeout'));
            }, 10000); // 10 second timeout
            loadingTimeouts.add(timeout);
        });
        
        await Promise.race([loadDataPromise, timeoutPromise]);
        
        // Update UI
        updateDashboardStats();
        
        // Show orders section by default
        showSection('orders');
        
        console.log('✅ Admin dashboard initialized successfully');
        showSuccess('Dashboard loaded successfully!');
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showError('Failed to load dashboard data. Please refresh and try again.');
        hideLoadingStates();
    }
}

function showLoadingStates() {
    const ordersLoading = document.getElementById('loading-orders');
    const customersLoading = document.getElementById('customers-loading');
    
    if (ordersLoading) ordersLoading.classList.remove('hidden');
    if (customersLoading) customersLoading.classList.remove('hidden');
}

function hideLoadingStates() {
    const ordersLoading = document.getElementById('loading-orders');
    const customersLoading = document.getElementById('customers-loading');
    
    if (ordersLoading) ordersLoading.classList.add('hidden');
    if (customersLoading) customersLoading.classList.add('hidden');
}

// Data Loading Functions with proper error handling
async function loadOrders() {
    console.log('Loading orders...');
    
    try {
        const snapshot = await db.collection('orders')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();
        
        allOrders = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            allOrders.push(data);
        });
        
        console.log(`✅ Loaded ${allOrders.length} orders`);
        
        // Update UI
        const loadingEl = document.getElementById('loading-orders');
        const containerEl = document.getElementById('orders-container');
        const emptyEl = document.getElementById('empty-orders');
        
        if (loadingEl) loadingEl.classList.add('hidden');
        
        if (allOrders.length === 0) {
            if (emptyEl) emptyEl.classList.remove('hidden');
            if (containerEl) containerEl.classList.add('hidden');
        } else {
            renderOrders(allOrders);
            if (containerEl) containerEl.classList.remove('hidden');
            if (emptyEl) emptyEl.classList.add('hidden');
        }
        
        return allOrders;
        
    } catch (error) {
        console.error('Error loading orders:', error);
        const loadingEl = document.getElementById('loading-orders');
        const emptyEl = document.getElementById('empty-orders');
        
        if (loadingEl) loadingEl.classList.add('hidden');
        if (emptyEl) {
            emptyEl.classList.remove('hidden');
            emptyEl.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-6xl text-red-400 mb-4">⚠️</div>
                    <h3 class="text-xl font-semibold text-red-400 mb-2">Failed to Load Orders</h3>
                    <p class="text-gray-500 mb-4">Error: ${error.message}</p>
                    <button onclick="loadOrders()" class="btn-primary">Try Again</button>
                </div>
            `;
        }
        throw error;
    }
}

async function loadCustomers() {
    console.log('Loading customers...');
    
    try {
        const snapshot = await db.collection('users').get();
        
        allCustomers = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            allCustomers.push(data);
        });
        
        console.log(`✅ Loaded ${allCustomers.length} customers`);
        
        // Update UI
        const loadingEl = document.getElementById('customers-loading');
        const containerEl = document.getElementById('customers-container');
        const emptyEl = document.getElementById('empty-customers');
        
        if (loadingEl) loadingEl.classList.add('hidden');
        
        if (allCustomers.length === 0) {
            if (emptyEl) emptyEl.classList.remove('hidden');
            if (containerEl) containerEl.classList.add('hidden');
        } else {
            renderCustomers(allCustomers);
            if (containerEl) containerEl.classList.remove('hidden');
            if (emptyEl) emptyEl.classList.add('hidden');
        }
        
        return allCustomers;
        
    } catch (error) {
        console.error('Error loading customers:', error);
        const loadingEl = document.getElementById('customers-loading');
        const emptyEl = document.getElementById('empty-customers');
        
        if (loadingEl) loadingEl.classList.add('hidden');
        if (emptyEl) {
            emptyEl.classList.remove('hidden');
            emptyEl.innerHTML = `
                <div class="text-center py-8">
                    <div class="text-4xl text-red-400 mb-4">⚠️</div>
                    <p class="text-red-400 mb-4">Failed to load customers: ${error.message}</p>
                    <button onclick="loadCustomers()" class="btn-primary">Try Again</button>
                </div>
            `;
        }
        throw error;
    }
}

// Render Functions with null checks
function renderOrders(orders) {
    const tableBody = document.getElementById('orders-table-body');
    if (!tableBody) {
        console.error('Orders table body not found');
        return;
    }
    
    if (!orders || orders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-8 text-gray-400">
                    No orders found matching your filter
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = orders.map(order => {
        const createdAt = order.createdAt ? order.createdAt.toDate() : new Date();
        const itemsCount = order.items ? order.items.length : 0;
        const status = order.status || 'pending';
        const orderId = order.orderId || order.id;
        
        return `
            <tr class="hover:bg-yellow-400/5 transition-colors cursor-pointer" onclick="showOrderDetails('${order.id}')">
                <td class="font-mono text-yellow-400">${orderId}</td>
                <td>
                    <div>
                        <div class="font-medium text-gray-200">${order.customerName || 'Unknown'}</div>
                        <div class="text-sm text-gray-400">${order.customerEmail || ''}</div>
                        <div class="text-xs text-gray-500">${order.customerPhone || ''}</div>
                    </div>
                </td>
                <td>
                    <div class="flex items-center space-x-1 mb-1">
                        ${order.items ? order.items.slice(0, 3).map(item => 
                            `<span class="text-lg" title="${item.name || 'Unknown item'}">${item.emoji || '🍫'}</span>`
                        ).join('') : '<span class="text-lg">🍫</span>'}
                        ${itemsCount > 3 ? `<span class="text-xs text-gray-400">+${itemsCount - 3}</span>` : ''}
                    </div>
                    <div class="text-xs text-gray-400">${itemsCount} items</div>
                </td>
                <td class="font-semibold text-green-400">$${(order.totalPrice || 0).toFixed(2)}</td>
                <td>
                    <span class="px-2 py-1 rounded-full text-xs font-medium status-${status}">
                        ${status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                </td>
                <td class="text-gray-400">
                    <div>${createdAt.toLocaleDateString()}</div>
                    <div class="text-xs">${createdAt.toLocaleTimeString()}</div>
                </td>
                <td>
                    <div class="flex space-x-2">
                        <button onclick="event.stopPropagation(); updateOrderStatus('${order.id}', 'confirmed')" 
                                class="text-green-400 hover:text-green-300 transition-colors text-sm p-1" 
                                title="Confirm Order">
                            <i class="fas fa-check"></i>
                        </button>
                        <button onclick="event.stopPropagation(); updateOrderStatus('${order.id}', 'preparing')" 
                                class="text-blue-400 hover:text-blue-300 transition-colors text-sm p-1" 
                                title="Mark as Preparing">
                            <i class="fas fa-cookie-bite"></i>
                        </button>
                        <button onclick="event.stopPropagation(); updateOrderStatus('${order.id}', 'delivered')" 
                                class="text-purple-400 hover:text-purple-300 transition-colors text-sm p-1" 
                                title="Mark as Delivered">
                            <i class="fas fa-truck"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderCustomers(customers) {
    const container = document.getElementById('customers-container');
    if (!container) {
        console.error('Customers container not found');
        return;
    }
    
    if (!customers || customers.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <div class="text-4xl mb-4">👥</div>
                <p>No customers found</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${customers.map(customer => `
                <div class="glass-effect rounded-lg p-4 hover:bg-yellow-400/5 transition-colors">
                    <div class="flex items-center space-x-3 mb-3">
                        <img src="${customer.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name || 'User')}&background=FCD34D&color=1F2937&size=40`}" 
                             alt="${customer.name || 'User'}" 
                             class="w-10 h-10 rounded-full">
                        <div>
                            <div class="font-medium text-gray-200">${customer.name || 'Unknown'}</div>
                            <div class="text-sm text-gray-400">${customer.email || ''}</div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <div class="text-gray-400">Orders</div>
                            <div class="font-semibold text-yellow-400">${customer.totalOrders || 0}</div>
                        </div>
                        <div>
                            <div class="text-gray-400">Spent</div>
                            <div class="font-semibold text-green-400">$${(customer.totalSpent || 0).toFixed(2)}</div>
                        </div>
                        <div class="col-span-2">
                            <div class="text-gray-400">Phone</div>
                            <div class="text-xs text-gray-300">${customer.phone || 'Not provided'}</div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Order Management Functions
async function updateOrderStatus(orderId, newStatus) {
    if (!orderId || !newStatus) {
        showError('Invalid order or status');
        return;
    }
    
    try {
        await db.collection('orders').doc(orderId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update local data
        const orderIndex = allOrders.findIndex(order => order.id === orderId);
        if (orderIndex !== -1) {
            allOrders[orderIndex].status = newStatus;
            allOrders[orderIndex].updatedAt = new Date();
        }
        
        // Re-render orders
        const filteredOrders = currentFilter === 'all' ? allOrders : 
            allOrders.filter(order => order.status === currentFilter);
        renderOrders(filteredOrders);
        
        // Update dashboard stats
        updateDashboardStats();
        
        const shortOrderId = orderId.substring(0, 8);
        showSuccess(`Order ${shortOrderId}... status updated to ${newStatus}`);
        
    } catch (error) {
        console.error('Error updating order status:', error);
        showError('Failed to update order status. Please try again.');
    }
}

function showOrderDetails(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) {
        showError('Order not found');
        return;
    }
    
    const modal = document.getElementById('order-modal');
    const content = document.getElementById('order-details-content');
    
    if (!modal || !content) {
        console.error('Order modal elements not found');
        return;
    }
    
    const createdAt = order.createdAt ? order.createdAt.toDate() : new Date();
    
    content.innerHTML = `
        <div class="space-y-6">
            <!-- Order Header -->
            <div class="border-b border-gray-600 pb-4">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="text-xl font-bold text-yellow-400">Order ${order.orderId || order.id}</h4>
                    <span class="px-3 py-1 rounded-full text-sm font-medium status-${order.status || 'pending'}">
                        ${(order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1)}
                    </span>
                </div>
                <p class="text-gray-400">${createdAt.toLocaleDateString()} at ${createdAt.toLocaleTimeString()}</p>
            </div>
            
            <!-- Customer Information -->
            <div>
                <h5 class="font-semibold text-yellow-400 mb-3">Customer Information</h5>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div class="text-sm text-gray-400">Name</div>
                        <div class="text-gray-200">${order.customerName || 'Unknown'}</div>
                    </div>
                    <div>
                        <div class="text-sm text-gray-400">Email</div>
                        <div class="text-gray-200">${order.customerEmail || 'Not provided'}</div>
                    </div>
                    <div>
                        <div class="text-sm text-gray-400">Phone</div>
                        <div class="text-gray-200">${order.customerPhone || 'Not provided'}</div>
                    </div>
                    <div>
                        <div class="text-sm text-gray-400">Delivery Address</div>
                        <div class="text-gray-200">${order.deliveryAddress || 'Not provided'}</div>
                    </div>
                </div>
                ${order.specialInstructions ? `
                <div class="mt-4">
                    <div class="text-sm text-gray-400">Special Instructions</div>
                    <div class="text-gray-200 bg-gray-800 rounded p-3 mt-1">${order.specialInstructions}</div>
                </div>
                ` : ''}
            </div>
            
            <!-- Order Items -->
            <div>
                <h5 class="font-semibold text-yellow-400 mb-3">Order Items (${order.items ? order.items.length : 0})</h5>
                <div class="space-y-3">
                    ${order.items ? order.items.map(item => `
                        <div class="flex justify-between items-center p-3 bg-gray-800 rounded">
                            <div class="flex items-center space-x-3">
                                <span class="text-2xl">${item.emoji || '🍫'}</span>
                                <div>
                                    <div class="font-medium text-gray-200">${item.name || 'Unknown item'}</div>
                                    <div class="text-sm text-gray-400">${item.description || item.flavor || ''}</div>
                                </div>
                            </div>
                            <div class="text-green-400 font-semibold">$${(item.price || 0).toFixed(2)}</div>
                        </div>
                    `).join('') : '<div class="text-gray-400">No items found</div>'}
                </div>
            </div>
            
            <!-- Order Summary -->
            <div>
                <h5 class="font-semibold text-yellow-400 mb-3">Order Summary</h5>
                <div class="bg-gray-800 rounded p-4 space-y-2">
                    <div class="flex justify-between">
                        <span class="text-gray-400">Subtotal</span>
                        <span class="text-gray-200">$${(order.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Delivery Fee</span>
                        <span class="text-gray-200">$${(order.deliveryFee || 0).toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Tax</span>
                        <span class="text-gray-200">$${(order.tax || 0).toFixed(2)}</span>
                    </div>
                    <div class="border-t border-gray-600 pt-2">
                        <div class="flex justify-between font-semibold text-lg">
                            <span class="text-yellow-400">Total</span>
                            <span class="text-green-400">$${(order.totalPrice || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Status Update Actions -->
            <div>
                <h5 class="font-semibold text-yellow-400 mb-3">Update Status</h5>
                <div class="flex flex-wrap gap-2">
                    <button onclick="updateOrderStatus('${order.id}', 'pending'); closeOrderModal();" class="btn-secondary">
                        <i class="fas fa-clock mr-1"></i> Pending
                    </button>
                    <button onclick="updateOrderStatus('${order.id}', 'confirmed'); closeOrderModal();" class="btn-secondary">
                        <i class="fas fa-check mr-1"></i> Confirmed
                    </button>
                    <button onclick="updateOrderStatus('${order.id}', 'preparing'); closeOrderModal();" class="btn-secondary">
                        <i class="fas fa-cookie-bite mr-1"></i> Preparing
                    </button>
                    <button onclick="updateOrderStatus('${order.id}', 'ready'); closeOrderModal();" class="btn-secondary">
                        <i class="fas fa-box mr-1"></i> Ready
                    </button>
                    <button onclick="updateOrderStatus('${order.id}', 'delivered'); closeOrderModal();" class="btn-secondary">
                        <i class="fas fa-truck mr-1"></i> Delivered
                    </button>
                    <button onclick="updateOrderStatus('${order.id}', 'cancelled'); closeOrderModal();" class="btn-secondary text-red-400 border-red-400 hover:bg-red-400/10">
                        <i class="fas fa-times mr-1"></i> Cancelled
                    </button>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function closeOrderModal() {
    const modal = document.getElementById('order-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Filter and Search Functions
function filterOrders(status) {
    currentFilter = status;
    
    // Update filter badges
    document.querySelectorAll('.filter-badge').forEach(badge => {
        badge.classList.remove('active');
    });
    
    const activeBadge = document.querySelector(`[data-filter="${status}"]`);
    if (activeBadge) {
        activeBadge.classList.add('active');
    }
    
    // Filter orders
    const filteredOrders = status === 'all' ? allOrders : 
        allOrders.filter(order => (order.status || 'pending') === status);
    
    renderOrders(filteredOrders);
}

function setupSearch() {
    const searchBar = document.getElementById('search-bar');
    if (!searchBar) return;
    
    let searchTimeout;
    
    searchBar.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        
        searchTimeout = setTimeout(() => {
            const searchTerm = e.target.value.toLowerCase();
            
            if (!searchTerm.trim()) {
                // Show all orders for current filter
                const filteredOrders = currentFilter === 'all' ? allOrders :
                    allOrders.filter(order => (order.status || 'pending') === currentFilter);
                renderOrders(filteredOrders);
                return;
            }
            
            const filteredOrders = allOrders.filter(order => {
                const matchesSearch = 
                    (order.orderId && order.orderId.toLowerCase().includes(searchTerm)) ||
                    (order.id && order.id.toLowerCase().includes(searchTerm)) ||
                    (order.customerName && order.customerName.toLowerCase().includes(searchTerm)) ||
                    (order.customerEmail && order.customerEmail.toLowerCase().includes(searchTerm)) ||
                    (order.customerPhone && order.customerPhone.includes(searchTerm));
                
                const matchesFilter = currentFilter === 'all' || 
                    (order.status || 'pending') === currentFilter;
                
                return matchesSearch && matchesFilter;
            });
            
            renderOrders(filteredOrders);
        }, 300); // Debounce search
    });
}

// Dashboard Stats
function updateDashboardStats() {
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const pendingOrders = allOrders.filter(order => (order.status || 'pending') === 'pending').length;
    const totalCustomers = allCustomers.length;
    
    const totalOrdersEl = document.getElementById('total-orders');
    const totalRevenueEl = document.getElementById('total-revenue');
    const pendingOrdersEl = document.getElementById('pending-orders');
    const totalCustomersEl = document.getElementById('total-customers');
    
    if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
    if (totalRevenueEl) totalRevenueEl.textContent = `$${totalRevenue.toFixed(2)}`;
    if (pendingOrdersEl) pendingOrdersEl.textContent = pendingOrders;
    if (totalCustomersEl) totalCustomersEl.textContent = totalCustomers;
}

// Charts with proper cleanup
function initializeCharts() {
    // Destroy existing charts to prevent infinite loops
    Object.values(charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    charts = {};
    
    try {
        initializeRevenueChart();
        initializeStatusChart();
        initializePopularItemsChart();
        initializeTrendsChart();
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
}

function initializeRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    // Clear any existing chart
    if (charts.revenue) {
        charts.revenue.destroy();
    }
    
    // Group orders by date (last 7 days)
    const revenueByDate = {};
    const last7Days = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.push(dateStr);
        revenueByDate[dateStr] = 0;
    }
    
    allOrders.forEach(order => {
        if (order.createdAt) {
            const orderDate = order.createdAt.toDate();
            const dateStr = orderDate.toISOString().split('T')[0];
            if (revenueByDate.hasOwnProperty(dateStr)) {
                revenueByDate[dateStr] += order.totalPrice || 0;
            }
        }
    });
    
    const data = last7Days.map(date => revenueByDate[date]);
    const labels = last7Days.map(date => new Date(date).toLocaleDateString());
    
    charts.revenue = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue',
                data: data,
                borderColor: '#FCD34D',
                backgroundColor: 'rgba(252, 211, 77, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#D1D5DB' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#9CA3AF',
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        }
                    },
                    grid: { color: 'rgba(156, 163, 175, 0.2)' }
                },
                x: {
                    ticks: { color: '#9CA3AF' },
                    grid: { color: 'rgba(156, 163, 175, 0.2)' }
                }
            }
        }
    });
}

function initializeStatusChart() {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    
    if (charts.status) {
        charts.status.destroy();
    }
    
    const statusCounts = {};
    const statusColors = {
        pending: '#FDB462',
        confirmed: '#80CED7',
        preparing: '#A8DADC',
        ready: '#B5E48C',
        delivered: '#90EE90',
        cancelled: '#FF6B6B'
    };
    
    allOrders.forEach(order => {
        const status = order.status || 'pending';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    const labels = Object.keys(statusCounts);
    const data = Object.values(statusCounts);
    const colors = labels.map(status => statusColors[status] || '#9CA3AF');
    
    if (labels.length === 0) {
        // Show empty state
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        return;
    }
    
    charts.status = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#D1D5DB',
                        padding: 20
                    }
                }
            }
        }
    });
}

function initializePopularItemsChart() {
    const ctx = document.getElementById('popularItemsChart');
    if (!ctx) return;
    
    if (charts.popularItems) {
        charts.popularItems.destroy();
    }
    
    const itemCounts = {};
    
    allOrders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                if (item.name) {
                    itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
                }
            });
        }
    });
    
    const sortedItems = Object.entries(itemCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
    if (sortedItems.length === 0) {
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        return;
    }
    
    const labels = sortedItems.map(([name]) => name);
    const data = sortedItems.map(([,count]) => count);
    
    charts.popularItems = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Orders',
                data: data,
                backgroundColor: '#FCD34D',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#9CA3AF' },
                    grid: { color: 'rgba(156, 163, 175, 0.2)' }
                },
                x: {
                    ticks: { color: '#9CA3AF' },
                    grid: { display: false }
                }
            }
        }
    });
}

function initializeTrendsChart() {
    const ctx = document.getElementById('trendsChart');
    if (!ctx) return;
    
    if (charts.trends) {
        charts.trends.destroy();
    }
    
    const ordersByDate = {};
    const last30Days = [];
    
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last30Days.push(dateStr);
        ordersByDate[dateStr] = 0;
    }
    
    allOrders.forEach(order => {
        if (order.createdAt) {
            const orderDate = order.createdAt.toDate();
            const dateStr = orderDate.toISOString().split('T')[0];
            if (ordersByDate.hasOwnProperty(dateStr)) {
                ordersByDate[dateStr]++;
            }
        }
    });
    
    const data = last30Days.map(date => ordersByDate[date]);
    const labels = last30Days.map(date => new Date(date).toLocaleDateString());
    
    charts.trends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Orders',
                data: data,
                borderColor: '#8B5CF6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#D1D5DB' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#9CA3AF',
                        stepSize: 1
                    },
                    grid: { color: 'rgba(156, 163, 175, 0.2)' }
                },
                x: {
                    ticks: {
                        color: '#9CA3AF',
                        maxTicksLimit: 7
                    },
                    grid: { color: 'rgba(156, 163, 175, 0.2)' }
                }
            }
        }
    });
}

// Navigation Functions
function showSection(sectionName) {
    const titles = {
        dashboard: { title: 'Dashboard', subtitle: 'Overview and analytics' },
        orders: { title: 'Orders Management', subtitle: 'Monitor and manage customer orders' },
        customers: { title: 'Customers', subtitle: 'View customer information and history' },
        analytics: { title: 'Analytics', subtitle: 'Detailed reports and insights' }
    };
    
    const titleInfo = titles[sectionName] || titles.orders;
    
    const pageTitleEl = document.getElementById('page-title');
    const pageSubtitleEl = document.getElementById('page-subtitle');
    
    if (pageTitleEl) pageTitleEl.textContent = titleInfo.title;
    if (pageSubtitleEl) pageSubtitleEl.textContent = titleInfo.subtitle;
    
    // Hide all sections
    document.querySelectorAll('main section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNav = document.querySelector(`a[href="#${sectionName}"]`);
    if (activeNav) activeNav.classList.add('active');
    
    // Initialize charts if showing dashboard or analytics
    if (sectionName === 'dashboard' || sectionName === 'analytics') {
        // Delay chart initialization to ensure DOM is ready
        setTimeout(() => {
            initializeCharts();
        }, 100);
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    
    if (sidebar && mainContent) {
        sidebar.classList.toggle('hidden');
        sidebar.classList.toggle('show');
        mainContent.classList.toggle('full-width');
    }
}

// Utility Functions
async function refreshData() {
    const button = event?.target?.closest('button');
    let originalHTML = '';
    
    if (button) {
        originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Refreshing...';
        button.disabled = true;
    }
    
    try {
        showSuccess('Refreshing data...');
        
        await Promise.all([
            loadOrders(),
            loadCustomers()
        ]);
        
        updateDashboardStats();
        
        // Re-initialize charts if on dashboard
        const dashboardSection = document.getElementById('dashboard-section');
        if (dashboardSection && !dashboardSection.classList.contains('hidden')) {
            setTimeout(() => initializeCharts(), 100);
        }
        
        showSuccess('Data refreshed successfully!');
        
    } catch (error) {
        console.error('Error refreshing data:', error);
        showError('Failed to refresh data: ' + error.message);
    } finally {
        if (button) {
            button.innerHTML = originalHTML;
            button.disabled = false;
        }
    }
}

// Notification Functions
function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification fixed top-6 right-6 z-50 px-6 py-4 rounded-lg shadow-lg transform transition-all duration-300 max-w-md`;
    
    if (type === 'success') {
        notification.className += ' bg-green-600 text-white';
    } else if (type === 'error') {
        notification.className += ' bg-red-600 text-white';
    } else {
        notification.className += ' bg-yellow-600 text-white';
    }
    
    notification.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info-circle'} mr-3"></i>
                <span>${message}</span>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    notification.style.transform = 'translateX(100%)';
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin panel DOM loaded');
    
    // Setup search functionality
    setupSearch();
    
    // Setup modal close on outside click
    const orderModal = document.getElementById('order-modal');
    if (orderModal) {
        orderModal.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                closeOrderModal();
            }
        });
    }
    
    console.log('✅ Admin panel setup complete');
});
