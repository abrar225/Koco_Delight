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

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Global Variables
let scene, camera, renderer;
let heroScene, heroCamera, heroRenderer;
let loaderScene, loaderCamera, loaderRenderer;
const chocolates3D = [];
let mouseX = 0, mouseY = 0;
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;
let boxItems = [];
let userLocation = null;
let currentUser = null;

// Chocolate Data
const chocolateData = [
    {
        id: 'heart',
        name: 'Velvet Heart',
        price: 3.50,
        imgSrc: 'https://placehold.co/200x200/1A1208/D5CEA3?text=💖',
        flavor: 'Dark Chocolate',
        emoji: '💖',
        description: 'Silky smooth dark chocolate with raspberry center'
    },
    {
        id: 'caramel',
        name: 'Caramel Bite', 
        price: 4.00,
        imgSrc: 'https://placehold.co/200x200/1A1208/D5CEA3?text=🍯',
        flavor: 'Salted Caramel',
        emoji: '🍯',
        description: 'Rich milk chocolate with salted caramel filling'
    },
    {
        id: 'truffle',
        name: 'Hazelnut Truffle',
        price: 4.50,
        imgSrc: 'https://placehold.co/200x200/1A1208/D5CEA3?text=🌰',
        flavor: 'Hazelnut',
        emoji: '🌰',
        description: 'Roasted hazelnuts in premium dark chocolate'
    },
    {
        id: 'dome',
        name: 'Cocoa Dome',
        price: 3.75,
        imgSrc: 'https://placehold.co/200x200/1A1208/D5CEA3?text=🍫',
        flavor: 'Milk Chocolate',
        emoji: '🍫',
        description: 'Pure Belgian cocoa in elegant dome shape'
    },
    {
        id: 'gem', 
        name: 'Raspberry Gem',
        price: 3.60,
        imgSrc: 'https://placehold.co/200x200/1A1208/D5CEA3?text=💎',
        flavor: 'Raspberry',
        emoji: '💎',
        description: 'White chocolate with dried raspberry pieces'
    },
    {
        id: 'swirl',
        name: 'Mint Swirl',
        price: 3.80,
        imgSrc: 'https://placehold.co/200x200/1A1208/D5CEA3?text=🌿',
        flavor: 'Mint',
        emoji: '🌿',
        description: 'Cool mint cream in dark chocolate shell'
    },
    {
        id: 'almond',
        name: 'Almond Cluster', 
        price: 4.20,
        imgSrc: 'https://placehold.co/200x200/1A1208/D5CEA3?text=🥜',
        flavor: 'Almond',
        emoji: '🥜',
        description: 'Whole almonds covered in milk chocolate'
    },
    {
        id: 'orange',
        name: 'Orange Slice',
        price: 3.90,
        imgSrc: 'https://placehold.co/200x200/1A1208/D5CEA3?text=🍊',
        flavor: 'Orange',
        emoji: '🍊',
        description: 'Candied orange peel in dark chocolate'
    }
];

// Initialize page immediately with fallback styles
document.documentElement.classList.add('no-js');

// Authentication State Management
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        updateUIForUser(user);
        
        // Get or create user document in Firestore
        db.collection('users').doc(user.uid).get()
            .then(doc => {
                if (!doc.exists) {
                    // Create new user document
                    return db.collection('users').doc(user.uid).set({
                        name: user.displayName,
                        email: user.email,
                        photoURL: user.photoURL,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        addresses: []
                    });
                } else {
                    const userData = doc.data();
                    if (userData.addresses && userData.addresses.length > 0) {
                        displaySavedAddresses(userData.addresses);
                    }
                }
            })
            .catch(error => {
                console.error('Error handling user document:', error);
            });
    } else {
        currentUser = null;
        updateUIForSignedOut();
    }
});

// UI Update Functions
function updateUIForUser(user) {
    // Hide auth buttons, show user menu
    const authButtons = document.querySelectorAll('#google-sign-in, #mobile-google-sign-in');
    const userMenus = document.querySelectorAll('#user-menu, #mobile-user-menu');
    
    authButtons.forEach(btn => btn.style.display = 'none');
    userMenus.forEach(menu => menu.style.display = 'flex');
    
    // Update user info
    const userAvatars = document.querySelectorAll('#user-avatar, #mobile-user-avatar');
    const userNames = document.querySelectorAll('#user-name, #mobile-user-name');
    
    userAvatars.forEach(avatar => {
        avatar.src = user.photoURL || 'https://via.placeholder.com/36x36/D5CEA3/1A1208?text=' + (user.displayName ? user.displayName.charAt(0) : 'U');
    });
    
    userNames.forEach(name => {
        name.textContent = user.displayName || 'User';
    });
}

function updateUIForSignedOut() {
    // Show auth buttons, hide user menu
    const authButtons = document.querySelectorAll('#google-sign-in, #mobile-google-sign-in');
    const userMenus = document.querySelectorAll('#user-menu, #mobile-user-menu');
    
    authButtons.forEach(btn => btn.style.display = 'flex');
    userMenus.forEach(menu => menu.style.display = 'none');
}

// Google Sign-In Functions
function signInWithGoogle() {
    auth.signInWithPopup(googleProvider)
        .then((result) => {
            showCustomAlert('Successfully signed in!', 'success');
            // Request location permission after sign-in
            setTimeout(() => {
                if (navigator.geolocation) {
                    openLocationModal();
                }
            }, 1000);
        })
        .catch((error) => {
            console.error('Sign-in error:', error);
            showCustomAlert(error.message, 'error');
        });
}

function signOut() {
    auth.signOut()
        .then(() => {
            showCustomAlert('Successfully signed out', 'success');
        })
        .catch((error) => {
            console.error('Sign-out error:', error);
            showCustomAlert(error.message, 'error');
        });
}

// Location Functions
function openLocationModal() {
    const modal = document.getElementById('location-modal');
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            const modalContent = modal.querySelector('div > div');
            if (modalContent) modalContent.classList.remove('scale-95');
        }, 10);
    }
}

function closeLocationModal() {
    const modal = document.getElementById('location-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        const modalContent = modal.querySelector('div > div');
        if (modalContent) modalContent.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

function getCurrentLocation() {
    const status = document.getElementById('location-status');
    if (!navigator.geolocation) {
        status.textContent = 'Geolocation is not supported by your browser';
        return;
    }
    
    status.textContent = 'Locating...';
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            
            // Reverse geocoding to get address
            fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`)
                .then(response => response.json())
                .then(data => {
                    const address = `${data.city}, ${data.principalSubdivision}, ${data.countryName}`;
                    userLocation = address;
                    
                    const customerAddress = document.getElementById('customer-address');
                    if (customerAddress) customerAddress.value = address;
                    
                    status.textContent = 'Location found!';
                    
                    // Save address to user profile if signed in
                    if (currentUser) {
                        saveAddressToProfile(address);
                    }
                })
                .catch(error => {
                    status.textContent = 'Unable to get address details';
                    console.error(error);
                });
        },
        (error) => {
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    status.textContent = 'User denied the request for Geolocation.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    status.textContent = 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    status.textContent = 'The request to get user location timed out.';
                    break;
                case error.UNKNOWN_ERROR:
                    status.textContent = 'An unknown error occurred.';
                    break;
            }
        }
    );
}

function saveAddressToProfile(address) {
    if (!currentUser) return;
    
    // Get current user data
    db.collection('users').doc(currentUser.uid).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                const addresses = userData.addresses || [];
                
                // Add new address if not already exists
                if (!addresses.includes(address)) {
                    addresses.push(address);
                    
                    // Update user document
                    return db.collection('users').doc(currentUser.uid).update({
                        addresses: addresses
                    });
                }
            }
        })
        .then(() => {
            // Refresh saved addresses display
            if (addresses) displaySavedAddresses(addresses);
        })
        .catch(error => {
            console.error('Error saving address:', error);
        });
}

function displaySavedAddresses(addresses) {
    const container = document.getElementById('saved-locations');
    if (!container) return;
    
    container.innerHTML = '';
    
    addresses.forEach((address, index) => {
        const pill = document.createElement('div');
        pill.className = 'bg-bronze/20 border border-bronze/30 rounded-full px-3 py-2 text-sm text-primary-light cursor-pointer hover:bg-bronze/30 transition-colors duration-300';
        pill.innerHTML = `<i class="fas fa-map-marker-alt mr-2 text-bronze"></i> ${address}`;
        pill.addEventListener('click', () => {
            // Remove active class from all pills
            document.querySelectorAll('.saved-location-pill').forEach(p => p.classList.remove('bg-gold/20', 'border-gold/30'));
            pill.classList.add('bg-gold/20', 'border-gold/30');
            
            const customerAddress = document.getElementById('customer-address');
            if (customerAddress) customerAddress.value = address;
            userLocation = address;
        });
        container.appendChild(pill);
    });
}

// 3D Scene Initialization
function initHero3D() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    
    try {
        heroScene = new THREE.Scene();
        heroCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        heroRenderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            canvas: canvas
        });
        heroRenderer.setSize(window.innerWidth, window.innerHeight);
        heroRenderer.setClearColor(0x000000, 0);
        
        // Lighting - enhanced for visibility
        const light = new THREE.DirectionalLight(0xffffff, 2);
        light.position.set(10, 10, 10);
        heroScene.add(light);
        
        const ambientLight = new THREE.AmbientLight(0xD5CEA3, 1.2);
        heroScene.add(ambientLight);
        
        const pointLight = new THREE.PointLight(0xD5CEA3, 0.8, 100);
        pointLight.position.set(5, 5, 5);
        heroScene.add(pointLight);
        
        // Material - enhanced colors
        const materials = [
            new THREE.MeshStandardMaterial({ 
                color: 0x3C2A21, 
                roughness: 0.4, 
                metalness: 0.6,
                emissive: 0x1A1208,
                emissiveIntensity: 0.1
            }),
            new THREE.MeshStandardMaterial({ 
                color: 0xD5CEA3, 
                roughness: 0.3, 
                metalness: 0.7,
                emissive: 0xA27B5C,
                emissiveIntensity: 0.05
            }),
            new THREE.MeshStandardMaterial({ 
                color: 0xA27B5C, 
                roughness: 0.5, 
                metalness: 0.4,
                emissive: 0x3C2A21,
                emissiveIntensity: 0.1
            })
        ];
        
        // Create 50 3D objects - enhanced visibility
        for (let i = 0; i < 50; i++) {
            const geometries = [
                new THREE.BoxGeometry(1, 1, 1),
                new THREE.SphereGeometry(0.7, 16, 16),
                new THREE.IcosahedronGeometry(0.8, 0),
                new THREE.TorusKnotGeometry(0.5, 0.2, 64, 8),
                new THREE.ConeGeometry(0.6, 1.2, 8),
                new THREE.OctahedronGeometry(0.8, 0)
            ];
            
            const geometry = geometries[Math.floor(Math.random() * geometries.length)];
            const material = materials[Math.floor(Math.random() * materials.length)];
            const chocolate = new THREE.Mesh(geometry, material);
            
            chocolate.position.set(
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 30
            );
            chocolate.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            const scale = Math.random() * 0.8 + 0.4;
            chocolate.scale.set(scale, scale, scale);
            
            chocolates3D.push(chocolate);
            heroScene.add(chocolate);
        }
        
        heroCamera.position.z = 15;
        
        // Mouse move event
        document.addEventListener('mousemove', onDocumentMouseMove, false);
        
        // Start animation immediately
        animateHero();
        
        console.log('3D scene initialized successfully');
    } catch (error) {
        console.error('Error initializing 3D scene:', error);
        // Fallback: show hero content without 3D
        showHeroContentFallback();
    }
}

function showHeroContentFallback() {
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.style.opacity = '1';
        heroContent.style.transform = 'translateY(0)';
    }
}

function onDocumentMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) / 100;
    mouseY = (event.clientY - windowHalfY) / 100;
}

function animateHero() {
    if (!heroRenderer || !heroScene || !heroCamera) return;
    
    requestAnimationFrame(animateHero);
    
    try {
        // Camera follows mouse - smooth movement
        if (heroCamera) {
            heroCamera.position.x += (mouseX - heroCamera.position.x) * 0.05;
            heroCamera.position.y += (-mouseY - heroCamera.position.y) * 0.05;
            heroCamera.lookAt(heroScene.position);
        }
        
        // Rotate chocolates
        chocolates3D.forEach((chocolate, i) => {
            if (chocolate) {
                chocolate.rotation.x += 0.002 * (i % 3 + 1);
                chocolate.rotation.y += 0.003 * (i % 3 + 1);
                chocolate.rotation.z += 0.001 * (i % 3 + 1);
                
                // Add floating motion
                chocolate.position.y += Math.sin(Date.now() * 0.001 + i) * 0.01;
            }
        });
        
        heroRenderer.render(heroScene, heroCamera);
    } catch (error) {
        console.error('Error in animation loop:', error);
    }
}

function onWindowResize() {
    if (heroCamera && heroRenderer) {
        heroCamera.aspect = window.innerWidth / window.innerHeight;
        heroCamera.updateProjectionMatrix();
        heroRenderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Navigation Scroll Effects
function initNavigationEffects() {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    
    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
        
        lastScrollY = currentScrollY;
    });
}

// Mobile Menu Functions
function initMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    
    if (btn && menu) {
        btn.addEventListener('click', () => {
            menu.classList.toggle('hidden');
        });
        
        // Close menu when clicking links
        menu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menu.classList.add('hidden');
            });
        });
    }
}

// Custom Cursor
function initCustomCursor() {
    const dot = document.getElementById('cursor-dot');
    const circle = document.getElementById('cursor-circle');
    
    if (!dot || !circle) return;
    
    window.addEventListener('mousemove', e => {
        if (typeof gsap !== 'undefined') {
            gsap.to(dot, { duration: 0.1, x: e.clientX, y: e.clientY });
            gsap.to(circle, { duration: 0.3, x: e.clientX, y: e.clientY });
        } else {
            dot.style.left = e.clientX + 'px';
            dot.style.top = e.clientY + 'px';
            circle.style.left = e.clientX + 'px';
            circle.style.top = e.clientY + 'px';
        }
    });
    
    document.querySelectorAll('a, button, .chocolate-card').forEach(el => {
        el.addEventListener('mouseenter', () => circle.classList.add('cursor-grow'));
        el.addEventListener('mouseleave', () => circle.classList.remove('cursor-grow'));
    });
}

// GSAP Animations
function initAnimations() {
    if (typeof gsap === 'undefined') {
        console.warn('GSAP not loaded, using fallback animations');
        return;
    }
    
    try {
        gsap.registerPlugin(ScrollTrigger);
        
        // Remove no-js class when animations are ready
        document.documentElement.classList.remove('no-js');
        
        // Hero animations - immediate visibility with staggered entrance
        const tl = gsap.timeline({ delay: 0.5 });
        tl.fromTo('.hero-subtitle', 
            { opacity: 0, y: 30 },
            { duration: 1, opacity: 1, y: 0, ease: 'power3.out' }
        )
        .fromTo('.hero-title', 
            { opacity: 0, y: 50 },
            { duration: 1.2, opacity: 1, y: 0, ease: 'power3.out' }, 
            '-=0.7'
        )
        .fromTo('.hero-description', 
            { opacity: 0, y: 30 },
            { duration: 1, opacity: 1, y: 0, ease: 'power3.out' }, 
            '-=0.5'
        )
        .fromTo('.hero-cta', 
            { opacity: 0, y: 30 },
            { duration: 0.8, opacity: 1, y: 0, ease: 'power3.out' }, 
            '-=0.3'
        );
        
        // Section animations
        document.querySelectorAll('.section-title').forEach(title => {
            gsap.fromTo(title, 
                { opacity: 0, y: 30 },
                {
                    scrollTrigger: {
                        trigger: title,
                        start: 'top 85%'
                    },
                    opacity: 1,
                    y: 0,
                    duration: 1,
                    ease: 'power3.out'
                }
            );
        });
        
        document.querySelectorAll('.section-subtitle').forEach(subtitle => {
            gsap.fromTo(subtitle,
                { opacity: 0, y: 20 },
                {
                    scrollTrigger: {
                        trigger: subtitle,
                        start: 'top 85%'
                    },
                    opacity: 1,
                    y: 0,
                    duration: 1,
                    delay: 0.2,
                    ease: 'power3.out'
                }
            );
        });
        
        document.querySelectorAll('.card-item').forEach((card, i) => {
            gsap.fromTo(card,
                { opacity: 0, y: 30 },
                {
                    scrollTrigger: {
                        trigger: card,
                        start: 'top 85%'
                    },
                    opacity: 1,
                    y: 0,
                    duration: 1,
                    delay: (i % 4) * 0.1,
                    ease: 'power3.out'
                }
            );
        });
        
    } catch (error) {
        console.error('Error initializing animations:', error);
        // Fallback: show all content immediately
        document.documentElement.classList.remove('no-js');
    }
}

// Populate chocolates grid with small cards
function populateChocolatesGrid() {
    const grid = document.getElementById('chocolates-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    chocolateData.forEach((chocolate, index) => {
        const card = document.createElement('div');
        card.className = 'chocolate-card';
        card.innerHTML = `
            <div class="chocolate-emoji">${chocolate.emoji}</div>
            <h3 class="chocolate-title">${chocolate.name}</h3>
            <p class="chocolate-description">${chocolate.description}</p>
            <div class="chocolate-price">$${chocolate.price.toFixed(2)}</div>
            <button class="add-to-box-btn" onclick="addToBox('${chocolate.id}')">Add to Box</button>
        `;
        grid.appendChild(card);
        
        // Add staggered animation if GSAP is available
        if (typeof gsap !== 'undefined') {
            gsap.fromTo(card,
                { opacity: 0, y: 30 },
                {
                    scrollTrigger: {
                        trigger: card,
                        start: 'top 85%'
                    },
                    opacity: 1,
                    y: 0,
                    duration: 1,
                    delay: (index % 8) * 0.1,
                    ease: 'power3.out'
                }
            );
        }
    });
}

// Chocolate Customization System
function initCustomizeAndOrder() {
    const optionsContainer = document.getElementById('chocolate-options');
    const boxContainer = document.getElementById('custom-box');
    const totalPriceEl = document.getElementById('total-price');
    const clearBoxBtn = document.getElementById('clear-box');
    const proceedBtn = document.getElementById('proceed-to-order-btn');
    
    if (!optionsContainer || !boxContainer) return;
    
    // Populate chocolate options
    chocolateData.forEach(choco => {
        const div = document.createElement('div');
        div.className = 'text-center p-3 rounded-xl glass-effect transition-all hover:scale-105 cursor-pointer';
        div.draggable = true;
        div.innerHTML = `
            <div class="text-2xl mb-2">${choco.emoji}</div>
            <p class="text-sm font-medium text-gold">${choco.name}</p>
            <p class="text-xs font-bold text-bronze">$${choco.price.toFixed(2)}</p>
        `;
        
        div.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify(choco));
        });
        
        div.addEventListener('click', () => {
            if (boxItems.length >= 12) {
                showCustomAlert('Your box is full! (Max 12 pieces)', 'error');
                return;
            }
            
            boxItems.push(choco);
            updateBox();
        });
        
        optionsContainer.appendChild(div);
    });
    
    // Box drop functionality
    boxContainer.addEventListener('dragover', (e) => e.preventDefault());
    boxContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        
        if (boxItems.length >= 12) {
            showCustomAlert('Your box is full! (Max 12 pieces)', 'error');
            return;
        }
        
        try {
            const choco = JSON.parse(e.dataTransfer.getData('text/plain'));
            boxItems.push(choco);
            updateBox();
        } catch (error) {
            console.error('Error processing drop:', error);
        }
    });
    
    // Clear box functionality
    if (clearBoxBtn) {
        clearBoxBtn.addEventListener('click', () => {
            boxItems = [];
            updateBox();
        });
    }
    
    // Initial box update
    updateBox();
}

// Add to box function (called from grid cards)
function addToBox(chocolateId) {
    const chocolate = chocolateData.find(c => c.id === chocolateId);
    if (!chocolate) return;
    
    if (boxItems.length >= 12) {
        showCustomAlert('Your box is full! (Max 12 pieces)', 'error');
        return;
    }
    
    boxItems.push(chocolate);
    updateBox();
    showCustomAlert(`${chocolate.name} added to box!`, 'success');
}

// Update box function (used by both customize section and grid)
function updateBox() {
    const boxContainer = document.getElementById('custom-box');
    const totalPriceEl = document.getElementById('total-price');
    
    if (!boxContainer || !totalPriceEl) return;
    
    boxContainer.innerHTML = '';
    let currentTotal = 0;
    
    if (boxItems.length === 0) {
        boxContainer.innerHTML = `
            <div class="col-span-4 flex flex-col items-center justify-center text-bronze/50 h-64">
                <i class="fas fa-arrow-up text-2xl mb-2"></i>
                <p class="text-xs text-center">Drag chocolates here or click "Add to Box"</p>
            </div>
        `;
    } else {
        boxItems.forEach((item, index) => {
            currentTotal += item.price;
            const itemEl = document.createElement('div');
            itemEl.className = 'relative p-2 bg-primary-dark rounded-lg border border-bronze/20';
            itemEl.innerHTML = `
                <div class="text-center">
                    <div class="text-lg mb-1">${item.emoji}</div>
                    <div class="text-xs text-gold">${item.name}</div>
                    <div class="text-xs text-bronze">$${item.price.toFixed(2)}</div>
                </div>
                <button class="absolute -top-2 -right-2 bg-red-700 text-white rounded-full h-5 w-5 text-xs flex items-center justify-center font-mono remove-item" data-index="${index}">&times;</button>
            `;
            boxContainer.appendChild(itemEl);
        });
    }
    
    totalPriceEl.textContent = `${currentTotal.toFixed(2)}`;
    
    // Add event listeners to remove buttons
    boxContainer.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            boxItems.splice(index, 1);
            updateBox();
        });
    });
}

// Order System (simplified for demo)
function initOrderSystem() {
    const proceedBtn = document.getElementById('proceed-to-order-btn');
    
    if (proceedBtn) {
        proceedBtn.addEventListener('click', () => {
            if (boxItems.length === 0) {
                showCustomAlert('Your box is empty. Please add some chocolates first.', 'error');
                return;
            }
            
            // Check if user is authenticated
            if (!currentUser) {
                showCustomAlert('Please sign in to place an order', 'error');
                signInWithGoogle();
                return;
            }
            
            showCustomAlert('Order functionality coming soon!', 'info');
        });
    }
}

// Utility Functions
function showCustomAlert(message, type = 'info') {
    // Remove any existing alerts
    const existingAlert = document.querySelector('.custom-alert');
    if (existingAlert) existingAlert.remove();
    
    const alert = document.createElement('div');
    alert.className = `custom-alert fixed top-6 right-6 z-[10000] px-6 py-4 rounded-xl shadow-lg border transform transition-all duration-300`;
    
    if (type === 'success') {
        alert.className += ' bg-green-900/90 border-green-700 text-green-100';
    } else if (type === 'error') {
        alert.className += ' bg-red-900/90 border-red-700 text-red-100';
    } else {
        alert.className += ' bg-primary-medium/90 border-gold/30 text-gold';
    }
    
    alert.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-3"></i>
            <p>${message}</p>
        </div>
    `;
    
    document.body.appendChild(alert);
    
    // Animate in
    if (typeof gsap !== 'undefined') {
        gsap.fromTo(alert, { x: 100, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5 });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            gsap.to(alert, {
                x: 100,
                opacity: 0,
                duration: 0.5,
                onComplete: () => alert.remove()
            });
        }, 5000);
    } else {
        alert.style.opacity = '1';
        alert.style.transform = 'translateX(0)';
        
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

// Page Initialization
function initPage() {
    console.log('Initializing page...');
    
    // Initialize navigation effects first
    initNavigationEffects();
    initMobileMenu();
    
    // Show hero content immediately as fallback
    showHeroContentFallback();
    
    // Initialize 3D scene
    if (typeof THREE !== 'undefined') {
        initHero3D();
    } else {
        console.warn('Three.js not loaded, hero will show without 3D background');
    }
    
    // Initialize animations
    if (typeof gsap !== 'undefined') {
        initAnimations();
    } else {
        console.warn('GSAP not loaded, using fallback styles');
        document.documentElement.classList.remove('no-js');
    }
    
    // Initialize other systems
    initCustomCursor();
    populateChocolatesGrid();
    initCustomizeAndOrder();
    initOrderSystem();
    
    // Initialize with no user
    updateUIForSignedOut();
    
    console.log('Page initialization complete');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');
    
    // Hide loader after a short delay
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) {
            if (typeof gsap !== 'undefined') {
                gsap.to(loader, {
                    opacity: 0,
                    duration: 1,
                    onComplete: () => {
                        loader.style.display = 'none';
                        initPage();
                    }
                });
            } else {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                    initPage();
                }, 1000);
            }
        } else {
            initPage();
        }
    }, 2000); // Show loader for 2 seconds
    
    // Window resize handler
    window.addEventListener('resize', onWindowResize);
    
    // Auth button event listeners
    document.addEventListener('click', (e) => {
        if (e.target.matches('#google-sign-in') || e.target.matches('#mobile-google-sign-in')) {
            e.preventDefault();
            signInWithGoogle();
        }
        
        if (e.target.matches('#logout-btn') || e.target.matches('#mobile-logout-btn')) {
            e.preventDefault();
            signOut();
        }
    });
    
    // Location modal event listeners
    const getLocationBtn = document.getElementById('get-location-btn');
    const confirmLocationBtn = document.getElementById('confirm-location');
    const cancelLocationBtn = document.getElementById('cancel-location');
    
    if (getLocationBtn) {
        getLocationBtn.addEventListener('click', getCurrentLocation);
    }
    
    if (confirmLocationBtn) {
        confirmLocationBtn.addEventListener('click', () => {
            const manualAddress = document.getElementById('manual-address')?.value;
            if (manualAddress) {
                userLocation = manualAddress;
                // Save address to user profile if signed in
                if (currentUser) {
                    saveAddressToProfile(manualAddress);
                }
                closeLocationModal();
                showCustomAlert('Delivery location set successfully!', 'success');
            } else if (userLocation) {
                closeLocationModal();
                showCustomAlert('Delivery location set successfully!', 'success');
            } else {
                showCustomAlert('Please set a delivery location', 'error');
            }
        });
    }
    
    if (cancelLocationBtn) {
        cancelLocationBtn.addEventListener('click', closeLocationModal);
    }
});