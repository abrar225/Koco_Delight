// Get Firebase configuration from environment variables
const firebaseConfig = window.APP_CONFIG ? window.APP_CONFIG.FIREBASE : {
    // Fallback for local development
    apiKey: "AIzaSyBs-7nJ3-L2IISbkB_B2PB6E_1y9ZmImUw",
    authDomain: "koco-delight.firebaseapp.com",
    projectId: "koco-delight",
    storageBucket: "koco-delight.firebasestorage.app",
    messagingSenderId: "587407788224",
    appId: "1:587407788224:web:dfe3a40919aabfc2200525",
    measurementId: "G-QZRMX4WN3G"
};

// Get admin emails from environment variables
const ADMIN_EMAILS = window.APP_CONFIG ? 
    (window.APP_CONFIG.ADMIN_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean) : 
    [
        'moabrarakhunji@gmail.com',
        'kamilganiji@gmail.com',
        'kocodelight083@gmail.com'
    ];

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global Variables
let currentAdmin = null;
let allOrders = [];
let allCustomers = [];
let currentFilter = 'all';
let currentOrderId = null;
let isLoading = false;

console.log('🚀 Koco Admin Panel Loading...');
console.log('📧 Admin emails configured:', ADMIN_EMAILS);

// Authentication State Management
auth.onAuthStateChanged(user => {
    console.log('Auth state changed:', user ? user.email : 'No user');
    
    if (user && ADMIN_EMAILS.includes(user.email)) {
        console.log('✅ Admin authenticated:', user.email);
        currentAdmin = user;
        showMainApp(user);
        loadDashboardData();
    } else if (user) {
        console.warn('❌ User not authorized as admin:', user.email);
        showAccessDenied();
    } else {
        console.log('📝 No user signed in, showing sign-in screen');
        showSignInScreen();
    }
});

// Screen Management Functions
function showLoadingScreen() {
    document.getElementById('loading-screen').classList.remove('hidden');
    document.getElementById('signin-screen').classList.add('hidden');
    document.getElementById('access-denied-screen').classList.add('hidden');
    document.getElementById('main-app').classList.add('hidden');
}

function showSignInScreen() {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('signin-screen').classList.remove('hidden');
    document.getElementById('access-denied-screen').classList.add('hidden');
    document.getElementById('main-app').classList.add('hidden');
}

function showAccessDenied() {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('signin-screen').classList.add('hidden');
    document.getElementById('access-denied-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
}

function showMainApp(user) {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('signin-screen').classList.add('hidden');
    document.getElementById('access-denied-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    
    // Update admin info in header
    updateAdminInfo(user);
}

function updateAdminInfo(user) {
    document.getElementById('admin-name').textContent = user.displayName || 'Admin';
    document.getElementById('admin-email').textContent = user.email;
    document.getElementById('admin-avatar').src = user.photoURL || 
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Admin')}&background=F59E0B&color=1F2937&size=40`;
}

// Authentication Functions
async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    
    try {
        const result = await auth.signInWithPopup(provider);
        console.log('✅ Sign-in successful:', result.user.email);
        showNotification('Welcome to Koco Admin!', 'success');
    } catch (error) {
        console.error('❌ Sign-in error:', error);
        showNotification('Sign-in failed: ' + error.message, 'error');
    }
}

function signOut() {
    auth.signOut().then(() => {
        console.log('👋 Admin signed out');
        currentAdmin = null;
        allOrders = [];
        allCustomers = [];
        showNotification('Signed out successfully', 'success');
    }).catch(error => {
        console.error('Sign-out error:', error);
        showNotification('Error signing out', 'error');
    });
}

// Data Loading Functions
async function loadDashboardData() {
    console.log('📊 Loading dashboard data...');
    
    try {
        await Promise.all([
            loadOrders(),
            loadCustomers()
        ]);
        
        updateStats();
        updateOrderCounts();
        showNotification('Dashboard loaded successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        showNotification('Failed to load dashboard data', 'error');
    }
}

async function loadOrders() {
    console.log('📦 Loading orders...');
    
    const ordersLoading = document.getElementById('orders-loading');
    const ordersContainer = document.getElementById('orders-container');
    const ordersEmpty = document.getElementById('orders-empty');
    
    ordersLoading.classList.remove('hidden');
    ordersContainer.classList.add('hidden');
    ordersEmpty.classList.add('hidden');
    
    try {
        const snapshot = await db.collection('orders')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        allOrders = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            allOrders.push(data);
        });
        
        console.log(`✅ Loaded ${allOrders.length} orders`);
        
        ordersLoading.classList.add('hidden');
        
        if (allOrders.length === 0) {
            ordersEmpty.classList.remove('hidden');
        } else {
            ordersContainer.classList.remove('hidden');
            renderOrders(allOrders);
        }
        
    } catch (error) {
        console.error('❌ Error loading orders:', error);
        ordersLoading.classList.add('hidden');
        ordersEmpty.classList.remove('hidden');
        document.getElementById('orders-empty').innerHTML = `
            <div class="text-center py-12">
                <div class="text-6xl text-red-400 mb-4">⚠️</div>
                <h3 class="text-xl font-semibold text-red-400 mb-2">Failed to Load Orders</h3>
                <p class="text-gray-500 mb-4">Error: ${error.message}</p>
                <button onclick="loadOrders()" class="btn-primary py-2 px-4 rounded-xl">Try Again</button>
            </div>
        `;
    }
}

async function loadCustomers() {
    console.log('👥 Loading customers...');
    
    const customersLoading = document.getElementById('customers-loading');
    const customersContainer = document.getElementById('customers-container');
    const customersEmpty = document.getElementById('customers-empty');
    
    customersLoading.classList.remove('hidden');
    customersContainer.classList.add('hidden');
    customersEmpty.classList.add('hidden');
    
    try {
        const snapshot = await db.collection('users').get();
        
        allCustomers = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            allCustomers.push(data);
        });
        
        console.log(`✅ Loaded ${allCustomers.length} customers`);
        
        customersLoading.classList.add('hidden');
        
        if (allCustomers.length === 0) {
            customersEmpty.classList.remove('hidden');
        } else {
            customersContainer.classList.remove('hidden');
            renderCustomers(allCustomers);
        }
        
    } catch (error) {
        console.error('❌ Error loading customers:', error);
        customersLoading.classList.add('hidden');
        customersEmpty.classList.remove('hidden');
    }
}

// Rendering Functions
function renderOrders(orders) {
    const container = document.getElementById('orders-container');
    if (!container || !orders) return;
    
    const filteredOrders = currentFilter === 'all' ? orders : 
        orders.filter(order => (order.status || 'pending') === currentFilter);
    
    if (filteredOrders.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <div class="text-4xl text-gray-500 mb-4">🔍</div>
                <p class="text-gray-400">No orders found for "${currentFilter}" status</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredOrders.map(order => {
        const createdAt = order.createdAt ? order.createdAt.toDate() : new Date();
        const status = order.status || 'pending';
        const itemsCount = order.items ? order.items.length : 0;
        
        return `
            <div class="order-card glass rounded-2xl p-4" onclick="showOrderDetails('${order.id}')">
                <div class="flex items-start justify-between mb-3">
                    <div>
                        <h3 class="font-bold text-lg text-white">#${order.orderId || order.id.slice(0, 8)}</h3>
                        <p class="text-gray-400 text-sm">${createdAt.toLocaleDateString()} at ${createdAt.toLocaleTimeString()}</p>
                    </div>
                    <span class="status-${status} px-3 py-1 rounded-full text-xs font-semibold">
                        ${status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                </div>
                
                <div class="flex items-center justify-between mb-3">
                    <div>
                        <p class="font-semibold text-white">${order.customerName || 'Unknown Customer'}</p>
                        <p class="text-gray-400 text-sm">${order.customerPhone || 'No phone'}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-2xl text-green-400">$${(order.totalPrice || 0).toFixed(2)}</p>
                        <p class="text-gray-400 text-sm">${itemsCount} items</p>
                    </div>
                </div>
                
                <div class="flex items-center space-x-1 mb-3">
                    ${order.items ? order.items.slice(0, 5).map(item => 
                        `<span class="text-2xl" title="${item.name}">${item.emoji || '🍫'}</span>`
                    ).join('') : '<span class="text-2xl">🍫</span>'}
                    ${itemsCount > 5 ? `<span class="text-gray-400 text-sm">+${itemsCount - 5} more</span>` : ''}
                </div>
                
                <div class="flex space-x-2">
                    <button onclick="event.stopPropagation(); showStatusModal('${order.id}')" class="flex-1 py-2 px-3 bg-yellow-500 text-gray-900 rounded-lg font-medium text-sm hover:bg-yellow-400 transition-colors">
                        <i class="fas fa-edit mr-1"></i>
                        Update Status
                    </button>
                    <button onclick="event.stopPropagation(); showOrderDetails('${order.id}')" class="flex-1 py-2 px-3 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-400 transition-colors">
                        <i class="fas fa-eye mr-1"></i>
                        View Details
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderCustomers(customers) {
    const container = document.getElementById('customers-container');
    if (!container || !customers) return;
    
    container.innerHTML = customers.map(customer => {
        const joinedAt = customer.createdAt ? customer.createdAt.toDate() : new Date();
        
        return `
            <div class="glass rounded-2xl p-4">
                <div class="flex items-center space-x-3 mb-3">
                    <img src="${customer.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name || 'User')}&background=F59E0B&color=1F2937&size=48`}" 
                         alt="${customer.name || 'User'}" 
                         class="w-12 h-12 rounded-full border-2 border-yellow-400">
                    <div class="flex-1">
                        <h3 class="font-semibold text-white">${customer.name || 'Unknown User'}</h3>
                        <p class="text-gray-400 text-sm">${customer.email || 'No email'}</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4 mb-3">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-yellow-400">${customer.totalOrders || 0}</div>
                        <div class="text-xs text-gray-400">Orders</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-green-400">$${(customer.totalSpent || 0).toFixed(0)}</div>
                        <div class="text-xs text-gray-400">Spent</div>
                    </div>
                </div>
                
                <div class="text-center">
                    <p class="text-gray-400 text-xs">Member since ${joinedAt.toLocaleDateString()}</p>
                    ${customer.phone ? `<p class="text-gray-400 text-xs">${customer.phone}</p>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Stats and Analytics Functions
function updateStats() {
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const pendingOrders = allOrders.filter(order => (order.status || 'pending') === 'pending').length;
    const totalCustomers = allCustomers.length;
    
    document.getElementById('total-orders').textContent = totalOrders;
    document.getElementById('total-revenue').textContent = `$${totalRevenue.toFixed(0)}`;
    document.getElementById('pending-orders').textContent = pendingOrders;
    document.getElementById('total-customers').textContent = totalCustomers;
    
    // Analytics tab stats
    const today = new Date().toDateString();
    const todayOrders = allOrders.filter(order => {
        if (!order.createdAt) return false;
        return order.createdAt.toDate().toDateString() === today;
    }).length;
    
    const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;
    
    document.getElementById('today-orders').textContent = todayOrders;
    document.getElementById('avg-order-value').textContent = `$${avgOrderValue.toFixed(2)}`;
    
    updatePopularItems();
    updateRecentActivity();
}

function updateOrderCounts() {
    const counts = {
        all: allOrders.length,
        pending: 0,
        confirmed: 0,
        preparing: 0,
        ready: 0,
        delivered: 0,
        cancelled: 0
    };
    
    allOrders.forEach(order => {
        const status = order.status || 'pending';
        if (counts.hasOwnProperty(status)) {
            counts[status]++;
        }
    });
    
    Object.keys(counts).forEach(status => {
        const element = document.getElementById(`count-${status}`);
        if (element) {
            element.textContent = counts[status];
        }
    });
}

function updatePopularItems() {
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
    
    const container = document.getElementById('popular-items-container');
    if (container) {
        if (sortedItems.length === 0) {
            container.innerHTML = '<p class="text-gray-400">No items data available</p>';
        } else {
            container.innerHTML = sortedItems.map(([name, count], index) => `
                <div class="flex items-center justify-between py-2">
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 bg-yellow-500 text-gray-900 rounded-full flex items-center justify-center font-bold text-sm">
                            ${index + 1}
                        </div>
                        <span class="text-white">${name}</span>
                    </div>
                    <span class="text-yellow-400 font-semibold">${count} orders</span>
                </div>
            `).join('');
        }
    }
}

function updateRecentActivity() {
    const recentOrders = allOrders
        .filter(order => order.createdAt)
        .sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate())
        .slice(0, 5);
    
    const container = document.getElementById('recent-activity-container');
    if (container) {
        if (recentOrders.length === 0) {
            container.innerHTML = '<p class="text-gray-400">No recent activity</p>';
        } else {
            container.innerHTML = recentOrders.map(order => {
                const createdAt = order.createdAt.toDate();
                const timeAgo = getTimeAgo(createdAt);
                const status = order.status || 'pending';
                
                return `
                    <div class="flex items-center justify-between py-2">
                        <div>
                            <p class="text-white font-medium">Order #${order.orderId || order.id.slice(0, 8)}</p>
                            <p class="text-gray-400 text-sm">${order.customerName || 'Unknown'} • ${timeAgo}</p>
                        </div>
                        <span class="status-${status} px-2 py-1 rounded text-xs font-medium">
                            ${status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                    </div>
                `;
            }).join('');
        }
    }
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
}

// Tab Management
function showTab(tabName) {
    // Update current section in header
    document.getElementById('current-section').textContent = 
        tabName.charAt(0).toUpperCase() + tabName.slice(1);
    
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('tab-active');
        btn.classList.add('hover:bg-white/10');
    });
    
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) {
        activeTab.classList.add('tab-active');
        activeTab.classList.remove('hover:bg-white/10');
    }
    
    // Show/hide tab content
    document.getElementById('orders-tab').classList.add('hidden');
    document.getElementById('customers-tab').classList.add('hidden');
    document.getElementById('analytics-tab').classList.add('hidden');
    
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');
}

// Filter Management
function filterOrders(status) {
    currentFilter = status;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('filter-active');
        btn.classList.add('hover:bg-white/10');
    });
    
    const activeFilter = document.querySelector(`[data-filter="${status}"]`);
    if (activeFilter) {
        activeFilter.classList.add('filter-active');
        activeFilter.classList.remove('hover:bg-white/10');
    }
    
    // Re-render orders with filter
    renderOrders(allOrders);
}

// Order Details Modal
function showOrderDetails(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const modal = document.getElementById('order-modal');
    const content = document.getElementById('order-modal-content');
    
    const createdAt = order.createdAt ? order.createdAt.toDate() : new Date();
    
    content.innerHTML = `
        <!-- Order Header -->
        <div class="border-b border-gray-700 pb-4 mb-6">
            <div class="flex items-start justify-between">
                <div>
                    <h4 class="text-2xl font-bold text-yellow-400">Order #${order.orderId || order.id.slice(0, 8)}</h4>
                    <p class="text-gray-400">${createdAt.toLocaleDateString()} at ${createdAt.toLocaleTimeString()}</p>
                </div>
                <span class="status-${order.status || 'pending'} px-4 py-2 rounded-full font-semibold">
                    ${(order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1)}
                </span>
            </div>
        </div>
        
        <!-- Customer Info -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
                <h5 class="font-semibold text-yellow-400 mb-3">Customer Information</h5>
                <div class="space-y-2">
                    <p class="text-white"><strong>Name:</strong> ${order.customerName || 'Unknown'}</p>
                    <p class="text-white"><strong>Email:</strong> ${order.customerEmail || 'Not provided'}</p>
                    <p class="text-white"><strong>Phone:</strong> ${order.customerPhone || 'Not provided'}</p>
                </div>
            </div>
            <div>
                <h5 class="font-semibold text-yellow-400 mb-3">Delivery Address</h5>
                <p class="text-white bg-gray-800 rounded-lg p-3">${order.deliveryAddress || 'Not provided'}</p>
            </div>
        </div>
        
        <!-- Order Items -->
        <div class="mb-6">
            <h5 class="font-semibold text-yellow-400 mb-3">Order Items (${order.items ? order.items.length : 0})</h5>
            <div class="space-y-3">
                ${order.items ? order.items.map(item => `
                    <div class="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div class="flex items-center space-x-3">
                            <span class="text-2xl">${item.emoji || '🍫'}</span>
                            <div>
                                <p class="font-medium text-white">${item.name || 'Unknown item'}</p>
                                <p class="text-gray-400 text-sm">${item.description || item.flavor || ''}</p>
                            </div>
                        </div>
                        <span class="text-green-400 font-bold text-lg">$${(item.price || 0).toFixed(2)}</span>
                    </div>
                `).join('') : '<p class="text-gray-400">No items found</p>'}
            </div>
        </div>
        
        <!-- Order Summary -->
        <div class="bg-gray-800 rounded-lg p-4 mb-6">
            <h5 class="font-semibold text-yellow-400 mb-3">Order Summary</h5>
            <div class="space-y-2">
                <div class="flex justify-between"><span class="text-gray-400">Subtotal:</span><span class="text-white">$${(order.subtotal || 0).toFixed(2)}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Delivery Fee:</span><span class="text-white">$${(order.deliveryFee || 0).toFixed(2)}</span></div>
                <div class="flex justify-between"><span class="text-gray-400">Tax:</span><span class="text-white">$${(order.tax || 0).toFixed(2)}</span></div>
                <div class="border-t border-gray-700 pt-2">
                    <div class="flex justify-between font-bold text-lg">
                        <span class="text-yellow-400">Total:</span>
                        <span class="text-green-400">$${(order.totalPrice || 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
        
        ${order.specialInstructions ? `
        <div class="bg-gray-800 rounded-lg p-4 mb-6">
            <h5 class="font-semibold text-yellow-400 mb-2">Special Instructions</h5>
            <p class="text-white">${order.specialInstructions}</p>
        </div>
        ` : ''}
        
        <!-- Action Buttons -->
        <div class="flex space-x-3">
            <button onclick="showStatusModal('${order.id}'); closeOrderModal();" class="flex-1 btn-primary py-3 rounded-xl">
                <i class="fas fa-edit mr-2"></i>
                Update Status
            </button>
            <button onclick="closeOrderModal()" class="flex-1 py-3 px-4 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors">
                <i class="fas fa-times mr-2"></i>
                Close
            </button>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function closeOrderModal() {
    document.getElementById('order-modal').classList.add('hidden');
}

// Status Update Modal
function showStatusModal(orderId) {
    currentOrderId = orderId;
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const modal = document.getElementById('status-modal');
    const orderInfo = document.getElementById('status-order-info');
    
    orderInfo.innerHTML = `
        <div class="text-center">
            <h4 class="text-lg font-bold text-white">Order #${order.orderId || order.id.slice(0, 8)}</h4>
            <p class="text-gray-400">${order.customerName || 'Unknown Customer'}</p>
            <span class="inline-block mt-2 status-${order.status || 'pending'} px-3 py-1 rounded-full text-sm font-medium">
                Current: ${(order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1)}
            </span>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function closeStatusModal() {
    document.getElementById('status-modal').classList.add('hidden');
    currentOrderId = null;
}

// Update Order Status
async function updateOrderStatus(newStatus) {
    if (!currentOrderId || isLoading) return;
    
    isLoading = true;
    
    try {
        await db.collection('orders').doc(currentOrderId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update local data
        const orderIndex = allOrders.findIndex(order => order.id === currentOrderId);
        if (orderIndex !== -1) {
            allOrders[orderIndex].status = newStatus;
        }
        
        closeStatusModal();
        renderOrders(allOrders);
        updateStats();
        updateOrderCounts();
        
        showNotification(`Order status updated to ${newStatus}`, 'success');
        
    } catch (error) {
        console.error('Error updating order status:', error);
        showNotification('Failed to update order status', 'error');
    } finally {
        isLoading = false;
    }
}

// Refresh Data
async function refreshData() {
    if (isLoading) return;
    
    const button = document.querySelector('.fab-button');
    const originalIcon = button.innerHTML;
    
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    button.disabled = true;
    
    try {
        await loadDashboardData();
        showNotification('Data refreshed successfully!', 'success');
    } catch (error) {
        showNotification('Failed to refresh data', 'error');
    } finally {
        button.innerHTML = originalIcon;
        button.disabled = false;
    }
}

// Notification System
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'notification fixed top-6 right-6 z-[60] px-6 py-4 rounded-xl shadow-lg max-w-sm transform transition-all duration-300';
    
    if (type === 'success') {
        notification.className += ' bg-green-600 text-white';
    } else if (type === 'error') {
        notification.className += ' bg-red-600 text-white';
    } else {
        notification.className += ' bg-yellow-600 text-gray-900';
    }
    
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} mr-3"></i>
            <span class="font-medium">${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 4000);
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Admin panel DOM loaded');
    console.log('🔧 Firebase config:', firebaseConfig.projectId);
    console.log('📧 Admin emails:', ADMIN_EMAILS);
    
    // Show loading screen initially
    showLoadingScreen();
    
    // Add CSS for filter active state
    const style = document.createElement('style');
    style.textContent = `
        .filter-active {
            background: var(--secondary) !important;
            color: var(--primary) !important;
        }
    `;
    document.head.appendChild(style);
    
    console.log('✅ Admin panel initialized');
});
