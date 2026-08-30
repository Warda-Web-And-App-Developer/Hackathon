import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDoUS6swG2vtTR0w0asoUHaancQXDBXs8U",
  authDomain: "fir-project-86277.firebaseapp.com",
  projectId: "fir-project-86277",
  storageBucket: "fir-project-86277.firebasestorage.app",
  messagingSenderId: "212841775689",
  appId: "1:212841775689:web:40767b549d5732034a7598",
  measurementId: "G-Y399YHJ4D1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

const INITIAL_PROVIDERS = [
    { id: 'p1', name: 'Zain Ahmed', service: 'Plumber', location: 'Clifton, Karachi', experience: '6 Years', price: 'Rs. 1,500/hr', rating: 4.8, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', status: 'Available' },
    { id: 'p2', name: 'Bilal Baloch', service: 'Electrician', location: 'Gulshan, Karachi', experience: '8 Years', price: 'Rs. 1,800/hr', rating: 4.9, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', status: 'Available' },
    { id: 'p3', name: 'Tanveer Hussain', service: 'AC Technician', location: 'DHA Phase 5, Karachi', experience: '5 Years', price: 'Rs. 2,000/visit', rating: 4.7, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', status: 'Busy' },
    { id: 'p4', name: 'Ayesha Khan', service: 'House Cleaner', location: 'North Nazimabad, Karachi', experience: '4 Years', price: 'Rs. 1,200/hr', rating: 4.9, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', status: 'Available' },
    { id: 'p5', name: 'Farooq Carpenter', service: 'Carpenter', location: 'PECHS, Karachi', experience: '10 Years', price: 'Rs. 2,500/job', rating: 4.6, avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', status: 'Available' },
    { id: 'p6', name: 'Kamran Painter', service: 'Painter', location: 'Bahria Town, Karachi', experience: '7 Years', price: 'Rs. 2,200/day', rating: 4.8, avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', status: 'Busy' }
];

let currentUser = null;
let selectedAuthRole = 'customer';
let cachedProviders = [...INITIAL_PROVIDERS];
let cachedBookings = [];
let cachedReviews = [];

window.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = {
                uid: user.uid,
                email: user.email,
                name: user.displayName || user.email.split('@')[0],
                role: localStorage.getItem('profix_role') || 'customer'
            };
            const authScreen = document.getElementById('auth-screen');
            const mainApp = document.getElementById('main-app');
            if (authScreen) authScreen.classList.add('hidden');
            if (mainApp) mainApp.classList.remove('hidden');
            updateUserBadge();
            await loadAppDataFromFirebase();
        } else {
            const authScreen = document.getElementById('auth-screen');
            const mainApp = document.getElementById('main-app');
            if (authScreen) authScreen.classList.remove('hidden');
            if (mainApp) mainApp.classList.add('hidden');
        }
    });
});

window.setAuthRole = function(role) {
    selectedAuthRole = role;
    localStorage.setItem('profix_role', role);
    const custTab = document.getElementById('tab-role-customer');
    const provTab = document.getElementById('tab-role-provider');
    const catField = document.getElementById('provider-category-field');

    if (!custTab || !provTab) return;

    if (role === 'customer') {
        custTab.className = "flex-1 py-2 text-sm font-semibold rounded-md bg-[#0B275D] text-white transition cursor-pointer";
        provTab.className = "flex-1 py-2 text-sm font-semibold rounded-md text-slate-600 transition cursor-pointer";
        if (catField) catField.classList.add('hidden');
    } else {
        provTab.className = "flex-1 py-2 text-sm font-semibold rounded-md bg-[#0B275D] text-white transition cursor-pointer";
        custTab.className = "flex-1 py-2 text-sm font-semibold rounded-md text-slate-600 transition cursor-pointer";
        if (catField) catField.classList.remove('hidden');
    }
}

window.handleLogin = async function(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
        Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please enter your email and password.', confirmButtonColor: '#0B275D' });
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        localStorage.setItem('profix_role', selectedAuthRole);
        Swal.fire({ icon: 'success', title: 'Welcome Back!', text: 'Successfully logged in.', timer: 1500, showConfirmButton: false });
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Login Failed', text: error.message, confirmButtonColor: '#0B275D' });
    }
}

window.handleRegister = async function(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const categoryElem = document.getElementById('auth-category');
    const category = categoryElem ? categoryElem.value : 'Plumber';

    if (!email || !password) {
        Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please enter your email and password.', confirmButtonColor: '#0B275D' });
        return;
    }

    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        if (selectedAuthRole === 'provider') {
            await addDoc(collection(db, 'providers'), {
                uid: userCred.user.uid,
                name: email.split('@')[0],
                email: email,
                service: category,
                location: 'Karachi, Pakistan',
                experience: '3 Years',
                price: 'Rs. 1,500/hr',
                rating: 5.0,
                avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
                status: 'Available'
            });
        }
        localStorage.setItem('profix_role', selectedAuthRole);
        Swal.fire({ icon: 'success', title: 'Account Created!', text: 'Your registration was successful.', timer: 1500, showConfirmButton: false });
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Registration Failed', text: error.message, confirmButtonColor: '#0B275D' });
    }
}

window.handleGoogleSignIn = async function() {
    try {
        await signInWithPopup(auth, googleProvider);
        localStorage.setItem('profix_role', selectedAuthRole);
        Swal.fire({ icon: 'success', title: 'Google Sign-In Successful', timer: 1500, showConfirmButton: false });
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Google Sign-In Error', text: error.message, confirmButtonColor: '#0B275D' });
    }
}

window.logoutUser = async function() {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You want to logout from ProFix?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0B275D',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Logout'
    });

    if (result.isConfirmed) {
        await signOut(auth);
        currentUser = null;
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
        const form = document.getElementById('auth-form');
        if (form) form.reset();
    }
}

function updateUserBadge() {
    if (!currentUser) return;
    const nameElem = document.getElementById('current-user-name');
    const roleElem = document.getElementById('current-user-role');
    const btnTextElem = document.getElementById('dashboard-btn-text');

    if (nameElem) nameElem.innerText = currentUser.name;
    if (roleElem) roleElem.innerText = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    if (btnTextElem) btnTextElem.innerText = currentUser.role === 'provider' ? 'Provider Dashboard' : 'My Bookings';
}

async function loadAppDataFromFirebase() {
    try {
        const provSnap = await getDocs(collection(db, 'providers'));
        if (!provSnap.empty) {
            cachedProviders = [];
            provSnap.forEach(docSnap => {
                cachedProviders.push({ id: docSnap.id, ...docSnap.data() });
            });
        }

        const bookSnap = await getDocs(collection(db, 'bookings'));
        cachedBookings = [];
        bookSnap.forEach(docSnap => {
            cachedBookings.push({ id: docSnap.id, ...docSnap.data() });
        });

        const revSnap = await getDocs(collection(db, 'reviews'));
        cachedReviews = [];
        revSnap.forEach(docSnap => {
            cachedReviews.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderProvidersGrid();
        if (currentUser && currentUser.role === 'provider') {
            renderDashboard();
        }
    } catch (err) {
        console.warn('Firestore fetch notice:', err);
        renderProvidersGrid();
    }
}

window.navigateHome = function() {
    document.getElementById('view-home').classList.remove('hidden');
    document.getElementById('view-profile').classList.add('hidden');
    document.getElementById('view-dashboard').classList.add('hidden');
    renderProvidersGrid();
}

window.openProviderProfile = function(providerId) {
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-profile').classList.remove('hidden');
    document.getElementById('view-dashboard').classList.add('hidden');
    renderProfileDetails(providerId);
}

window.toggleDashboard = function() {
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-profile').classList.add('hidden');
    document.getElementById('view-dashboard').classList.remove('hidden');
    renderDashboard();
}

function renderProvidersGrid(listToRender = null) {
    const providers = listToRender || cachedProviders;
    const grid = document.getElementById('providers-grid');
    const countEl = document.getElementById('provider-count');
    if (countEl) countEl.innerText = `Showing ${providers.length} Providers`;
    if (!grid) return;
    grid.innerHTML = '';

    if (providers.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-12 text-center text-slate-500">No service providers found.</div>`;
        return;
    }

    providers.forEach(p => {
        grid.innerHTML += `
            <div class="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden hover:shadow-xl transition flex flex-col justify-between">
                <div class="p-6">
                    <div class="flex items-start gap-4">
                        <img src="${p.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}" alt="${p.name}" class="w-16 h-16 rounded-full object-cover border-2 border-[#DEA924] shadow">
                        <div class="flex-1">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold uppercase tracking-wider bg-slate-100 text-[#2B5284] px-2.5 py-1 rounded-md">${p.service}</span>
                                <span class="text-xs font-semibold text-emerald-600 flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> ${p.status || 'Available'}</span>
                            </div>
                            <h3 class="text-lg font-bold text-[#0B275D] mt-2">${p.name}</h3>
                            <p class="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><i class="fa-solid fa-location-dot text-red-500"></i> ${p.location}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
                        <div><span class="font-semibold text-slate-800">Experience:</span> ${p.experience}</div>
                        <div><span class="font-semibold text-slate-800">Rating:</span> ⭐ ${p.rating}</div>
                    </div>
                    <div class="mt-2 text-sm font-bold text-[#2B5284]">
                        Rate: <span class="text-[#0B275D]">${p.price}</span>
                    </div>
                </div>
                <div class="px-6 py-3 bg-slate-50 border-t border-slate-100">
                    <button onclick="openProviderProfile('${p.id}')" class="w-full bg-[#0B275D] hover:bg-[#2B5284] text-white text-sm font-semibold py-2.5 rounded-lg transition text-center cursor-pointer">
                        View Profile & Book
                    </button>
                </div>
            </div>
        `;
    });
}

window.filterProviders = function() {
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const queryStr = searchInput ? searchInput.value.toLowerCase() : '';
    const category = categoryFilter ? categoryFilter.value : '';

    const filtered = cachedProviders.filter(p => {
        const matchesQuery = p.name.toLowerCase().includes(queryStr) || p.service.toLowerCase().includes(queryStr) || p.location.toLowerCase().includes(queryStr);
        const matchesCategory = category === "" || p.service === category;
        return matchesQuery && matchesCategory;
    });
    renderProvidersGrid(filtered);
}

function renderProfileDetails(providerId) {
    const provider = cachedProviders.find(p => p.id === providerId);
    const container = document.getElementById('profile-details-container');
    if (!provider || !container) return;

    container.innerHTML = `
        <div class="bg-gradient-to-r from-[#0B275D] to-[#2B5284] p-8 text-white flex flex-col sm:flex-row items-center gap-6">
            <img src="${provider.avatar}" alt="${provider.name}" class="w-28 h-28 rounded-full object-cover border-4 border-[#DEA924] shadow-xl">
            <div class="text-center sm:text-left">
                <span class="bg-[#DEA924] text-[#0B275D] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">${provider.service}</span>
                <h1 class="text-3xl font-black mt-2">${provider.name}</h1>
                <p class="text-slate-200 text-sm flex items-center justify-center sm:justify-start gap-1 mt-1"><i class="fa-solid fa-location-dot text-red-400"></i> ${provider.location}</p>
            </div>
        </div>

        <div class="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="space-y-6 lg:col-span-1 border-b lg:border-b-0 lg:border-r border-slate-200 pb-6 lg:pr-6">
                <h3 class="text-lg font-bold text-[#0B275D]">Provider Information</h3>
                <ul class="space-y-3 text-sm text-slate-600">
                    <li class="flex justify-between py-2 border-b border-slate-100"><span class="font-semibold text-slate-800">Experience:</span> <span>${provider.experience}</span></li>
                    <li class="flex justify-between py-2 border-b border-slate-100"><span class="font-semibold text-slate-800">Price:</span> <span class="text-[#2B5284] font-bold">${provider.price}</span></li>
                    <li class="flex justify-between py-2 border-b border-slate-100"><span class="font-semibold text-slate-800">Rating:</span> <span class="text-amber-500 font-bold">⭐ ${provider.rating}</span></li>
                </ul>
            </div>
            <div class="lg:col-span-2">
                <h3 class="text-lg font-bold text-[#0B275D] mb-4">Book ${provider.name}</h3>
                ${currentUser && currentUser.role === 'provider' ? `<div class="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm mb-4"><i class="fa-solid fa-triangle-exclamation mr-1"></i> You are logged in as a Provider. Switch to a Customer account to book.</div>` : ''}
                <form onsubmit="handleBookingSubmit(event, '${provider.id}', '${provider.name}', '${provider.service}')" class="space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label class="block text-xs font-bold text-slate-700 uppercase mb-1">Date *</label><input type="date" id="book-date" required class="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"></div>
                        <div><label class="block text-xs font-bold text-slate-700 uppercase mb-1">Time *</label><input type="time" id="book-time" required class="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"></div>
                    </div>
                    <div><label class="block text-xs font-bold text-slate-700 uppercase mb-1">Location *</label><input type="text" id="book-location" required placeholder="Address" autocomplete="off" class="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"></div>
                    <div><label class="block text-xs font-bold text-slate-700 uppercase mb-1">Description *</label><textarea id="book-desc" required rows="3" placeholder="Describe task..." autocomplete="off" class="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"></textarea></div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Damage Image URL (Optional)</label>
                        <input type="url" id="book-image" placeholder="https://example.com/broken-item.jpg" class="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm">
                        <p class="text-xs text-slate-400 mt-1">Paste an image link showing what needs to be repaired so the provider can inspect it.</p>
                    </div>
                    <button type="submit" ${currentUser && currentUser.role === 'provider' ? 'disabled' : ''} class="w-full bg-[#DEA924] hover:bg-[#c9951c] disabled:bg-slate-300 text-[#0B275D] font-bold py-3 rounded-lg shadow transition cursor-pointer">Submit Booking Request</button>
                </form>
            </div>
        </div>
    `;
}

window.handleBookingSubmit = async function(e, providerId, providerName, serviceName) {
    e.preventDefault();
    const date = document.getElementById('book-date').value;
    const time = document.getElementById('book-time').value;
    const location = document.getElementById('book-location').value.trim();
    const desc = document.getElementById('book-desc').value.trim();
    const imageEl = document.getElementById('book-image');
    const image = imageEl ? imageEl.value.trim() : '';
    
    const uniqueId = 'BK-' + Math.floor(1000 + Math.random() * 9000);

    const newBooking = {
        bookingId: uniqueId,
        customerEmail: currentUser.email,
        customerName: currentUser.name,
        providerId: providerId,
        providerName: providerName,
        service: serviceName,
        date, time, location,
        description: desc,
        image: image || '',
        status: 'Pending'
    };

    try {
        await addDoc(collection(db, 'bookings'), newBooking);
        Swal.fire({ icon: 'success', title: 'Booking Submitted!', text: `Your booking ID is: ${uniqueId}`, confirmButtonColor: '#0B275D' });
        toggleDashboard();
        await loadAppDataFromFirebase();
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Booking Failed', text: err.message, confirmButtonColor: '#0B275D' });
    }
}

function renderDashboard() {
    const title = document.getElementById('dashboard-title');
    const subtitle = document.getElementById('dashboard-subtitle');
    const container = document.getElementById('dashboard-content');
    if (!container) return;
    container.innerHTML = '';

    if (!currentUser) return;

    if (currentUser.role === 'customer') {
        if (title) title.innerText = 'Customer Dashboard';
        if (subtitle) subtitle.innerText = 'Track your bookings and rate completed tasks.';
        const myBookings = cachedBookings.filter(b => b.customerEmail === currentUser.email);

        if (myBookings.length === 0) {
            container.innerHTML = `<div class="bg-white p-8 rounded-xl shadow border text-center text-slate-500">No bookings found.</div>`;
            return;
        }
        

        myBookings.forEach(b => {
            let hasReviewed = cachedReviews.some(r => r.bookingId === b.bookingId && r.customerEmail === currentUser.email);
            
            let statusBadgeClass = 'bg-blue-100 text-blue-800';
            if (b.status === 'Accepted') statusBadgeClass = 'bg-emerald-100 text-emerald-800 font-bold';
            if (b.status === 'Rejected') statusBadgeClass = 'bg-red-100 text-red-800 font-bold';
            if (b.status === 'In Progress') statusBadgeClass = 'bg-purple-100 text-purple-800';
            if (b.status === 'Completed') statusBadgeClass = 'bg-slate-100 text-slate-800';

            container.innerHTML += `
                <div class="bg-white rounded-xl shadow-md border p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div class="space-y-2">
                        <div class="flex items-center gap-3">
                            <span class="text-xs font-mono font-bold bg-slate-100 px-2 py-1 rounded">${b.bookingId}</span>
                            <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadgeClass}">
                                ${b.status === 'Rejected' ? '<i class="fa-solid fa-circle-xmark mr-1"></i>' : ''}
                                ${b.status === 'Accepted' ? '<i class="fa-solid fa-circle-check mr-1"></i>' : ''}
                                ${b.status}
                            </span>
                        </div>
                        <h4 class="text-lg font-bold text-[#0B275D]">${b.service} - Provider: ${b.providerName}</h4>
                        <p class="text-xs text-slate-500">${b.date} at ${b.time} | ${b.location}</p>
                        <p class="text-sm bg-slate-50 p-2.5 rounded text-slate-700">${b.description}</p>
                        ${b.image ? `<div class="mt-2"><span class="text-xs font-bold text-slate-600 block mb-1">Attached Photo:</span><img src="${b.image}" alt="Repair item" class="w-24 h-24 object-cover rounded-lg border shadow-sm"></div>` : ''}
                        ${b.status === 'Rejected' ? `<p class="text-xs text-red-600 font-medium">The provider was unable to accept this request.</p>` : ''}
                        ${b.status === 'Accepted' ? `<p class="text-xs text-emerald-600 font-medium">The provider has accepted your booking and will arrive shortly!</p>` : ''}
                    </div>
                    <div>
                        ${b.status === 'Completed' && !hasReviewed ? `
                            <button onclick="openReviewModal('${b.id}', '${b.bookingId}', '${b.providerId}')" class="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer">
                                <i class="fa-solid fa-star mr-1"></i> Rate Service
                            </button>
                        ` : ''}
                        ${hasReviewed ? `<span class="text-xs text-emerald-600 font-semibold"><i class="fa-solid fa-check"></i> Reviewed</span>` : ''}
                    </div>
                </div>
            `;
        });
    } else {
        if (title) title.innerText = 'Provider Dashboard';
        if (subtitle) subtitle.innerText = 'Manage your profile and incoming customer requests.';
        
        let currentProv = cachedProviders.find(p => p.email === currentUser.email || p.uid === currentUser.uid);
        if (!currentProv) {
            currentProv = { id: 'temp', name: currentUser.name, email: currentUser.email, service: 'Plumber', location: 'Karachi, Pakistan', experience: '3 Years', price: 'Rs. 1,500/hr', rating: 5.0, avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', status: 'Available' };
        }

        container.innerHTML = `
            <div class="bg-white rounded-xl shadow-md border p-6 mb-8">
                <h3 class="text-lg font-bold text-[#0B275D] mb-4"><i class="fa-solid fa-user-pen mr-2 text-[#DEA924]"></i> Edit Profile & Skills</h3>
                <form onsubmit="handleUpdateProviderProfile(event, '${currentProv.id}')" class="space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
                            <input type="text" id="prof-name" value="${currentProv.name || ''}" required class="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Skill / Service</label>
                            <select id="prof-service" class="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                                <option value="Plumber" ${currentProv.service === 'Plumber' ? 'selected' : ''}>Plumber</option>
                                <option value="Electrician" ${currentProv.service === 'Electrician' ? 'selected' : ''}>Electrician</option>
                                <option value="AC Technician" ${currentProv.service === 'AC Technician' ? 'selected' : ''}>AC Technician</option>
                                <option value="House Cleaner" ${currentProv.service === 'House Cleaner' ? 'selected' : ''}>House Cleaner</option>
                                <option value="Carpenter" ${currentProv.service === 'Carpenter' ? 'selected' : ''}>Carpenter</option>
                                <option value="Painter" ${currentProv.service === 'Painter' ? 'selected' : ''}>Painter</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Status</label>
                            <select id="prof-status" class="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                                <option value="Available" ${currentProv.status === 'Available' ? 'selected' : ''}>Available</option>
                                <option value="Busy" ${currentProv.status === 'Busy' ? 'selected' : ''}>Busy</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Location</label>
                            <input type="text" id="prof-location" value="${currentProv.location || ''}" required class="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Experience</label>
                            <input type="text" id="prof-experience" value="${currentProv.experience || ''}" required class="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Price / Rate</label>
                            <input type="text" id="prof-price" value="${currentProv.price || ''}" required class="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Avatar Image URL</label>
                        <input type="url" id="prof-avatar" value="${currentProv.avatar || ''}" required class="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm">
                    </div>
                    <button type="submit" class="bg-[#0B275D] hover:bg-[#2B5284] text-white text-sm font-bold px-6 py-2.5 rounded-lg transition cursor-pointer">Save Profile Changes</button>
                </form>
            </div>

            <h3 class="text-lg font-bold text-[#0B275D] mb-4">Incoming Customer Bookings</h3>
            <div id="incoming-bookings-list" class="space-y-4"></div>
        `;

        const incoming = cachedBookings.filter(b => b.providerId === currentProv.id);
        const incomingContainer = document.getElementById('incoming-bookings-list');

        if (incoming.length === 0) {
            incomingContainer.innerHTML = `<div class="bg-white p-6 rounded-xl shadow border text-center text-slate-500 text-sm">No incoming bookings yet.</div>`;
            return;
        }

        incoming.forEach(b => {
            incomingContainer.innerHTML += `
                <div class="bg-white rounded-xl shadow-md border p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div class="space-y-2">
                        <div class="flex items-center gap-3">
                            <span class="text-xs font-mono font-bold bg-slate-100 px-2 py-1 rounded">${b.bookingId}</span>
                            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">${b.status}</span>
                        </div>
                        <h4 class="text-lg font-bold text-[#0B275D]">Service: ${b.service} - Customer: ${b.customerName}</h4>
                        <p class="text-xs text-slate-500">${b.date} at ${b.time} | ${b.location}</p>
                        <p class="text-sm bg-slate-50 p-2.5 rounded text-slate-700"><strong>Note:</strong> ${b.description}</p>
                        ${b.image ? `<div><span class="text-xs font-bold text-slate-600 block mb-1">Customer Damage Photo:</span><a href="${b.image}" target="_blank"><img src="${b.image}" alt="Damage" class="w-28 h-28 object-cover rounded-lg border shadow-sm hover:opacity-90 transition"></a></div>` : ''}
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        ${b.status === 'Pending' ? `<button onclick="updateStatus('${b.id}', 'Accepted')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-bold cursor-pointer">Accept</button><button onclick="updateStatus('${b.id}', 'Rejected')" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-bold cursor-pointer">Reject</button>` : ''}
                        ${b.status === 'Accepted' ? `<button onclick="updateStatus('${b.id}', 'In Progress')" class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-xs font-bold cursor-pointer">In Progress</button>` : ''}
                        ${b.status === 'In Progress' ? `<button onclick="updateStatus('${b.id}', 'Completed')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold cursor-pointer">Complete</button>` : ''}
                    </div>
                </div>
            `;
        });
    }
}

window.handleUpdateProviderProfile = async function(e, providerId) {
    e.preventDefault();
    const name = document.getElementById('prof-name').value.trim();
    const service = document.getElementById('prof-service').value;
    const status = document.getElementById('prof-status').value;
    const location = document.getElementById('prof-location').value.trim();
    const experience = document.getElementById('prof-experience').value.trim();
    const price = document.getElementById('prof-price').value.trim();
    const avatar = document.getElementById('prof-avatar').value.trim();

    try {
        if (providerId === 'temp') {
            const newDocRef = await addDoc(collection(db, 'providers'), {
                uid: currentUser.uid,
                name, email: currentUser.email, service, location, experience, price, rating: 5.0, avatar, status
            });
            providerId = newDocRef.id;
        } else {
            await updateDoc(doc(db, 'providers', providerId), {
                name, service, status, location, experience, price, avatar
            });
        }

        currentUser.name = name;
        updateUserBadge();
        Swal.fire({ icon: 'success', title: 'Profile Updated!', text: 'Your provider profile has been successfully updated.', timer: 1500, showConfirmButton: false });
        await loadAppDataFromFirebase();
        toggleDashboard();
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Update Failed', text: err.message, confirmButtonColor: '#0B275D' });
    }
}

window.updateStatus = async function(docId, newStatus) {
    await updateDoc(doc(db, 'bookings', docId), { status: newStatus });
    Swal.fire({ icon: 'success', title: 'Status Updated', text: `Booking status changed to ${newStatus}`, timer: 1500, showConfirmButton: false });
    await loadAppDataFromFirebase();
    toggleDashboard();
}

window.openReviewModal = async function(docId, bookingId, providerId) {
    const { value: rating } = await Swal.fire({
        title: 'Rate Service Provider',
        input: 'select',
        inputOptions: {
            '5': '⭐⭐⭐⭐⭐ (5 - Excellent)',
            '4': '⭐⭐⭐⭐ (4 - Good)',
            '3': '⭐⭐⭐ (3 - Average)',
            '2': '⭐⭐ (2 - Poor)',
            '1': '⭐ (1 - Terrible)'
        },
        inputPlaceholder: 'Select rating',
        showCancelButton: true,
        confirmButtonColor: '#0B275D'
    });

    if (rating) {
        await addDoc(collection(db, 'reviews'), {
            bookingId, providerId, customerEmail: currentUser.email, rating: Number(rating)
        });

        const existingReviews = cachedReviews.filter(r => r.providerId === providerId);
        existingReviews.push({ rating: Number(rating) });
        
        const totalScore = existingReviews.reduce((sum, r) => sum + r.rating, 0);
        const newAverageRating = Number((totalScore / existingReviews.length).toFixed(1));

        await updateDoc(doc(db, 'providers', providerId), {
            rating: newAverageRating
        });

        Swal.fire({ icon: 'success', title: 'Thank You!', text: 'Your review was submitted and the provider rating has been updated.', timer: 1500, showConfirmButton: false });
        await loadAppDataFromFirebase();
        toggleDashboard();
    }
}

async function loadWebsiteTestimonials() {
    const container = document.getElementById('dynamic-testimonials-container');
    if (!container) return;

    try {
        const querySnapshot = await getDocs(collection(db, 'website_feedback'));
        container.innerHTML = '';

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const stars = '⭐'.repeat(data.rating || 5);
            const initials = data.name ? data.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

            const card = document.createElement('div');
            card.className = 'bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4';
            card.innerHTML = `
                <div class="text-sm tracking-widest">${stars}</div>
                <p class="text-xs text-slate-600 leading-relaxed">"${escapeHtml(data.comment)}"</p>
                <div class="flex items-center gap-3 pt-2 border-t border-slate-100">
                    <div class="w-9 h-9 rounded-full bg-[#DEA924]/20 font-bold text-xs flex items-center justify-center text-[#0B275D]">${initials}</div>
                    <div>
                        <p class="text-xs font-bold text-[#0B275D]">${escapeHtml(data.name)}</p>
                        <p class="text-[10px] text-slate-400">Verified Platform User</p>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error("Error loading testimonials:", err);
    };
};
function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};