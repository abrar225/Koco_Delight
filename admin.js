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

// Admin User IDs (Add your admin email/UID here)
const ADMIN_EMAILS = [
    'your-admin-email@gmail.com', // Replace with your admin email
    'admin@kocodelight.com'
];

// Authentication State Management
auth.onAuthStateChanged(user => {
    if (user && ADMIN_EMAILS.includes(user.email)) {
        currentAdmin = user;
        updateAdminUI(user);
        initializeDashboard();
    } else if (user) {
        // User is signed in but not admin
        showAccessDenied();
    } else {
        // User is not signed in
        showSignInForm();
    }
});

function updateAdminUI(user) {
    document.getElementById('admin-name').textContent = user.displayName || 'Admin';
    document.getElementById('admin-email').textContent = user.email;
    document.getElementById('admin-avatar').src = user.photoURL || 
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Admin')}&background=FCD34D&color=1F2937&size=32`;
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
        console.log('Admin sign-in successful:', result.user);
    } catch (error) {
        console.error('Sign-in error:', error);
        alert('Sign-in failed: ' + error.message);
    }
}

function signOut() {
    auth.signOut().then(() => {
        console.log('Admin signed out');
        location.reload();
    }).catch(error => {
        console.error('Sign-out error:', error);
    });
}

// Dashboard Initialization
async function initializeDashboard() {
    console.log('Initializing admin dashboard...');
    
    try {
        // Load initial data
        await Promise.all([
            loadOrders(),
            loadCustomers()
        ]);
        
        // Update dashboard stats
        updateDashboardStats();
        
        // Initialize charts
        initializeCharts();
        
        // Set up real-time listeners
        setupRealtimeListeners();
        
        // Show orders section by default
        showSection('orders');
        
        console.log('✅ Admin dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showError('Failed to load dashboard data. Please refresh and try again.');
    }
}

// Data Loading Functions
async function loadOrders() {
    const loadingEl = document.getElementById('loading-orders');
    const containerEl = document.getElementById('orders-container');
    const emptyEl = document.getElementById('empty-orders');
    
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (containerEl) containerEl.classList.add('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');
    
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
        if (loadingEl) loadingEl.classList.add('hidden');
        
        if (allOrders.length === 0) {
            if (emptyEl) emptyEl.classList.remove('hidden');
        } else {
            renderOrders(allOrders);
            if (containerEl) containerEl.classList.remove('hidden');
        }
        
    } catch (error) {
        console.error('Error loading orders:', error);
        if (loadingEl) loadingEl.classList.add('hidden');
        showError('Failed to load orders. Please check your permissions.');
    }
}

async function loadCustomers() {
    try {
        const snapshot = await db.collection('users').get();
        
        allCustomers = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            allCustomers.push(data);
        });
        
        console.log(`✅ Loaded ${allCustomers.length} customers`);
        renderCustomers(allCustomers);
        
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

// Render Functions
function renderOrders(orders) {
    const tableBody = document.getElementById('orders-table-body');
    if (!tableBody) return;
    
    if (orders.length === 0) {
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
        
        return `
            <tr class="hover:bg-yellow-400/5 transition-colors cursor-pointer" onclick="showOrderDetails('${order.id}')">
                <td class="font-mono text-yellow-400">${order.orderId || order.id}</td>
                <td>
                    <div>
                        <div class="font-medium text-gray-200">${order.customerName || 'Unknown'}</div>
                        <div class="text-sm text-gray-400">${order.customerEmail || ''}</div>
                        <div class="text-xs text-gray-500">${order.customerPhone || ''}</div>
                    </div>
                </td>
                <td>
                    <div class="flex items-center space-x-1">
                        ${order.items ? order.items.slice(0, 3).map(item => 
                            `<span class="text-lg" title="${item.name}">${item.emoji || '🍫'}</span>`
                        ).join('') : ''}
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
                                class="text-green-400 hover:text-green-300 transition-colors" 
                                title="Confirm Order">
                            <i class="fas fa-check"></i>
                        </button>
                        <button onclick="event.stopPropagation(); updateOrderStatus('${order.id}', 'preparing')" 
                                class="text-blue-400 hover:text-blue-300 transition-colors" 
                                title="Mark as Preparing">
                            <i class="fas fa-cookie-bite"></i>
                        </button>
                        <button onclick="event.stopPropagation(); updateOrderStatus('${order.id}', 'ready')" 
                                class="text-yellow-400 hover:text-yellow-300 transition-colors" 
                                title="Ready for Delivery">
                            <i class="fas fa-box"></i>
                        </button>
                        <button onclick="event.stopPropagation(); updateOrderStatus('${order.id}', 'delivered')" 
                                class="text-purple-400 hover:text-purple-300 transition-colors" 
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
    if (!container) return;
    
    if (customers.length === 0) {
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
                        <div>
                            <div class="text-gray-400">Phone</div>
                            <div class="text-xs text-gray-300">${customer.phone || 'Not provided'}</div>
                        </div>
                        <div>
                            <div class="text-gray-400">Addresses</div>
                            <div class="text-xs text-gray-300">${customer.addresses ? customer.addresses.length : 0} saved</div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Order Management Functions
async function updateOrderStatus(orderId, newStatus) {
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
        
        showSuccess(`Order ${orderId.substring(0, 8)}... status updated to ${newStatus}`);
        
    } catch (error) {
        console.error('Error updating order status:', error);
        showError('Failed to update order status. Please try again.');
    }
}

function showOrderDetails(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const modal = document.getElementById('order-modal');
    const content = document.getElementById('order-details-content');
    
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
                                    <div class="font-medium text-gray-200">${item.name}</div>
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
    modal.classList.add('hidden');
}

// Filter and Search Functions
function filterOrders(status) {
    currentFilter = status;
    
    // Update filter badges
    document.querySelectorAll('.filter-badge').forEach(badge => {
        badge.classList.remove('active');
    });
    document.querySelector(`[data-filter="${status}"]`).classList.add('active');
    
    // Filter orders
    const filteredOrders = status === 'all' ? allOrders : 
        allOrders.filter(order => order.status === status);
    
    renderOrders(filteredOrders);
}

function setupSearch() {
    const searchBar = document.getElementById('search-bar');
    if (!searchBar) return;
    
    searchBar.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredOrders = allOrders.filter(order => {
            return (order.orderId && order.orderId.toLowerCase().includes(searchTerm)) ||
                   (order.customerName && order.customerName.toLowerCase().includes(searchTerm)) ||
                   (order.customerEmail && order.customerEmail.toLowerCase().includes(searchTerm)) ||
                   (order.customerPhone && order.customerPhone.includes(searchTerm));
        });
        
        // Apply current filter as well
        const finalFiltered = currentFilter === 'all' ? filteredOrders :
            filteredOrders.filter(order => order.status === currentFilter);
        
        renderOrders(finalFiltered);
    });
}

// Dashboard Stats
function updateDashboardStats() {
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const pendingOrders = allOrders.filter(order => order.status === 'pending').length;
    const totalCustomers = allCustomers.length;
    
    document.getElementById('total-orders').textContent = totalOrders;
    document.getElementById('total-revenue').textContent = `$${totalRevenue.toFixed(2)}`;
    document.getElementById('pending-orders').textContent = pendingOrders;
    document.getElementById('total-customers').textContent = totalCustomers;
}

// Charts
function initializeCharts() {
    initializeRevenueChart();
    initializeStatusChart();
    initializePopularItemsChart();
    initializeTrendsChart();
}

function initializeRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    // Group orders by date
    const revenueByDate = {};
    const last7Days = [];
    
    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.push(dateStr);
        revenueByDate[dateStr] = 0;
    }
    
    // Calculate revenue for each day
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
                    labels: {
                        color: '#D1D5DB'
                    }
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
                    grid: {
                        color: 'rgba(156, 163, 175, 0.2)'
                    }
                },
                x: {
                    ticks: {
                        color: '#9CA3AF'
                    },
                    grid: {
                        color: 'rgba(156, 163, 175, 0.2)'
                    }
                }
            }
        }
    });
}

function initializeStatusChart() {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    
    // Count orders by status
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
    
    // Count items
    const itemCounts = {};
    
    allOrders.forEach(order => {
        if (order.items) {
            order.items.forEach(item => {
                itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
            });
        }
    });
    
    // Get top 5 items
    const sortedItems = Object.entries(itemCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
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
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#9CA3AF'
                    },
                    grid: {
                        color: 'rgba(156, 163, 175, 0.2)'
                    }
                },
                x: {
                    ticks: {
                        color: '#9CA3AF'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function initializeTrendsChart() {
    const ctx = document.getElementById('trendsChart');
    if (!ctx) return;
    
    // Simple trend chart showing order count over last 30 days
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
                    labels: {
                        color: '#D1D5DB'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#9CA3AF',
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(156, 163, 175, 0.2)'
                    }
                },
                x: {
                    ticks: {
                        color: '#9CA3AF',
                        maxTicksLimit: 7
                    },
                    grid: {
                        color: 'rgba(156, 163, 175, 0.2)'
                    }
                }
            }
        }
    });
}

// Real-time Updates
function setupRealtimeListeners() {
    // Listen for new orders
    db.collection('orders').orderBy('createdAt', 'desc').limit(100)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const newOrder = change.doc.data();
                    newOrder.id = change.doc.id;
                    
                    // Check if we already have this order
                    const existingIndex = allOrders.findIndex(order => order.id === newOrder.id);
                    if (existingIndex === -1) {
                        allOrders.unshift(newOrder);
                        showSuccess(`New order received: ${newOrder.orderId || newOrder.id}`);
                    }
                }
                
                if (change.type === 'modified') {
                    const updatedOrder = change.doc.data();
                    updatedOrder.id = change.doc.id;
                    
                    const index = allOrders.findIndex(order => order.id === updatedOrder.id);
                    if (index !== -1) {
                        allOrders[index] = updatedOrder;
                    }
                }
            });
            
            // Re-render if we're on the orders section
            if (document.getElementById('orders-section').classList.contains('hidden') === false) {
                const filteredOrders = currentFilter === 'all' ? allOrders : 
                    allOrders.filter(order => order.status === currentFilter);
                renderOrders(filteredOrders);
            }
            
            updateDashboardStats();
        }, (error) => {
            console.error('Error in real-time listener:', error);
        });
}

// Navigation Functions
function showSection(sectionName) {
    // Update page title
    const titles = {
        dashboard: { title: 'Dashboard', subtitle: 'Overview and analytics' },
        orders: { title: 'Orders Management', subtitle: 'Monitor and manage customer orders' },
        customers: { title: 'Customers', subtitle: 'View customer information and history' },
        analytics: { title: 'Analytics', subtitle: 'Detailed reports and insights' }
    };
    
    const titleInfo = titles[sectionName] || titles.orders;
    document.getElementById('page-title').textContent = titleInfo.title;
    document.getElementById('page-subtitle').textContent = titleInfo.subtitle;
    
    // Hide all sections
    document.querySelectorAll('section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    document.getElementById(`${sectionName}-section`).classList.remove('hidden');
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNav = document.querySelector(`a[href="#${sectionName}"]`);
    if (activeNav) activeNav.classList.add('active');
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    
    sidebar.classList.toggle('hidden');
    sidebar.classList.toggle('show');
    mainContent.classList.toggle('full-width');
}

// Utility Functions
async function refreshData() {
    const button = event.target.closest('button');
    const originalHTML = button.innerHTML;
    
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Refreshing...';
    button.disabled = true;
    
    try {
        await Promise.all([
            loadOrders(),
            loadCustomers()
        ]);
        
        updateDashboardStats();
        showSuccess('Data refreshed successfully!');
    } catch (error) {
        showError('Failed to refresh data');
    } finally {
        button.innerHTML = originalHTML;
        button.disabled = false;
    }
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-6 right-6 z-50 px-6 py-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full`;
    
    if (type === 'success') {
        notification.className += ' bg-green-600 text-white';
    } else if (type === 'error') {
        notification.className += ' bg-red-600 text-white';
    } else {
        notification.className += ' bg-yellow-600 text-white';
    }
    
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info-circle'} mr-3"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 4000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin panel DOM loaded');
    
    // Setup search functionality
    setupSearch();
    
    // Close modal when clicking outside
    document.getElementById('order-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeOrderModal();
        }
    });
});