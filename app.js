// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA1FwweYw4MOz5My0aCfbRv-xrduCTl8z0",
    authDomain: "toasty-89f07.firebaseapp.com",
    projectId: "toasty-89f07",
    storageBucket: "toasty-89f07.firebasestorage.app",
    messagingSenderId: "743787667064",
    appId: "1:743787667064:web:12284120fbbdd1e907d78d",
    measurementId: "G-VHGVH5JEYY"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Global State
let currentUser = null;
let currentView = 'posts';
let authMode = 'login';
let allPosts = [];
let allUsers = [];
let allMessages = [];
let allSuggestions = [];
let allUpdates = [];
let allLeaderboard = [];

// Filter States
let searchTerm = '';
let categoryFilter = 'all';
let sortBy = 'newest';

// DOM Elements
const headerActions = document.getElementById('headerActions');
const mainContent = document.getElementById('mainContent');
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const usernameInput = document.getElementById('usernameInput');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authToggle = document.getElementById('authToggle');
const authCancel = document.getElementById('authCancel');
const newPostModal = document.getElementById('newPostModal');
const newPostForm = document.getElementById('newPostForm');
const cancelPost = document.getElementById('cancelPost');
const starsContainer = document.getElementById('stars-container');

// Initialize Stars Background
function createStars() {
    for (let i = 0; i < 100; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.width = Math.random() * 3 + 'px';
        star.style.height = star.style.width;
        star.style.top = Math.random() * 100 + '%';
        star.style.left = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 3 + 's';
        star.style.animationDuration = Math.random() * 3 + 2 + 's';
        starsContainer.appendChild(star);
    }
}

// Auth State Observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            currentUser = { uid: user.uid, email: user.email, ...userDoc.data() };
        } else {
            currentUser = { uid: user.uid, email: user.email, points: 0 };
        }
        renderHeader();
        renderView();
    } else {
        currentUser = null;
        renderHeader();
        renderView();
    }
});

// Firestore Listeners
db.collection('posts').onSnapshot((snapshot) => {
    allPosts = [];
    snapshot.forEach((doc) => {
        allPosts.push({ id: doc.id, ...doc.data() });
    });
    if (currentView === 'posts') renderView();
});

db.collection('users').onSnapshot((snapshot) => {
    allUsers = [];
    snapshot.forEach((doc) => {
        allUsers.push({ id: doc.id, ...doc.data() });
    });
    if (currentView === 'users') renderView();
});

db.collection('messages').onSnapshot((snapshot) => {
    allMessages = [];
    snapshot.forEach((doc) => {
        allMessages.push({ id: doc.id, ...doc.data() });
    });
    if (currentView === 'messages') renderView();
});

db.collection('suggestions').onSnapshot((snapshot) => {
    allSuggestions = [];
    snapshot.forEach((doc) => {
        allSuggestions.push({ id: doc.id, ...doc.data() });
    });
    if (currentView === 'suggestions') renderView();
});

db.collection('updates').onSnapshot((snapshot) => {
    allUpdates = [];
    snapshot.forEach((doc) => {
        allUpdates.push({ id: doc.id, ...doc.data() });
    });
    if (currentView === 'updates') renderView();
});

db.collection('leaderboard').orderBy('points', 'desc').onSnapshot((snapshot) => {
    allLeaderboard = [];
    snapshot.forEach((doc) => {
        allLeaderboard.push({ id: doc.id, ...doc.data() });
    });
    if (currentView === 'leaderboard') renderView();
});

// Render Header
function renderHeader() {
    if (currentUser) {
        headerActions.innerHTML = `
            <div class="user-points">
                <svg class="star-icon" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <span>${currentUser.points || 0} pts</span>
            </div>
            <span class="username">${currentUser.username || currentUser.email}</span>
            <button class="btn-logout" onclick="handleLogout()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Logout
            </button>
        `;
    } else {
        headerActions.innerHTML = `
            <button class="btn-login" onclick="showAuthModal('login')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Login
            </button>
        `;
    }
}

// Show Auth Modal
function showAuthModal(mode) {
    authMode = mode;
    if (mode === 'login') {
        authTitle.textContent = 'Login to Galaxy Forum';
        usernameInput.classList.add('hidden');
        authSubmitBtn.textContent = 'Login';
        authToggle.textContent = 'Need an account? Register';
    } else {
        authTitle.textContent = 'Join Galaxy Forum';
        usernameInput.classList.remove('hidden');
        authSubmitBtn.textContent = 'Register';
        authToggle.textContent = 'Already have an account? Login';
    }
    authModal.classList.remove('hidden');
}

// Handle Auth Submit
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const username = usernameInput.value.trim();

    try {
        if (authMode === 'login') {
            await auth.signInWithEmailAndPassword(email, password);
        } else {
            const result = await auth.createUserWithEmailAndPassword(email, password);
            await db.collection('users').doc(result.user.uid).set({
                username: username,
                email: email,
                points: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            await db.collection('leaderboard').doc(result.user.uid).set({
                username: username,
                points: 0
            });
        }
        authModal.classList.add('hidden');
        emailInput.value = '';
        passwordInput.value = '';
        usernameInput.value = '';
    } catch (error) {
        alert(error.message);
    }
});

// Auth Toggle
authToggle.addEventListener('click', () => {
    showAuthModal(authMode === 'login' ? 'register' : 'login');
});

// Auth Cancel
authCancel.addEventListener('click', () => {
    authModal.classList.add('hidden');
    emailInput.value = '';
    passwordInput.value = '';
    usernameInput.value = '';
});

// Handle Logout
function handleLogout() {
    auth.signOut();
}

// Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentView = btn.getAttribute('data-view');
        renderView();
    });
});

// Render View
function renderView() {
    switch (currentView) {
        case 'posts':
            renderPosts();
            break;
        case 'users':
            renderUsers();
            break;
        case 'messages':
            renderMessages();
            break;
        case 'suggestions':
            renderSuggestions();
            break;
        case 'updates':
            renderUpdates();
            break;
        case 'leaderboard':
            renderLeaderboard();
            break;
        case 'plinko':
            renderPlinko();
            break;
    }
}

// Render Posts
function renderPosts() {
    const filteredPosts = getFilteredPosts();
    
    mainContent.innerHTML = `
        <div class="filters-section">
            <div class="filters-grid">
                <div class="search-wrapper">
                    <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input type="text" id="searchInput" placeholder="Search posts..." value="${searchTerm}">
                </div>
                <select id="categorySelect">
                    <option value="all" ${categoryFilter === 'all' ? 'selected' : ''}>All Categories</option>
                    <option value="general" ${categoryFilter === 'general' ? 'selected' : ''}>General</option>
                    <option value="tech" ${categoryFilter === 'tech' ? 'selected' : ''}>Tech</option>
                    <option value="gaming" ${categoryFilter === 'gaming' ? 'selected' : ''}>Gaming</option>
                    <option value="space" ${categoryFilter === 'space' ? 'selected' : ''}>Space</option>
                </select>
                <select id="sortSelect">
                    <option value="newest" ${sortBy === 'newest' ? 'selected' : ''}>Newest First</option>
                    <option value="oldest" ${sortBy === 'oldest' ? 'selected' : ''}>Oldest First</option>
                    <option value="popular" ${sortBy === 'popular' ? 'selected' : ''}>Most Popular</option>
                </select>
            </div>
            ${currentUser ? `
                <button class="btn-primary" onclick="showNewPostModal()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="16"/>
                        <line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                    Create New Post
                </button>
            ` : ''}
        </div>
        <div class="posts-list">
            ${filteredPosts.length > 0 ? filteredPosts.map(post => `
                <div class="post-card">
                    <h3 class="post-title">${post.title}</h3>
                    <p class="post-content">${post.content}</p>
                    <div class="post-meta">
                        <span class="post-author">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 1rem; height: 1rem;">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                            ${post.author}
                        </span>
                        <span class="post-category">${post.category}</span>
                        <span>${post.likes || 0} likes</span>
                        <span>${post.replies || 0} replies</span>
                    </div>
                </div>
            `).join('') : `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <p>No posts found. Be the first to create one!</p>
                </div>
            `}
        </div>
    `;

    // Attach event listeners
    const searchInput = document.getElementById('searchInput');
    const categorySelect = document.getElementById('categorySelect');
    const sortSelect = document.getElementById('sortSelect');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value;
            renderPosts();
        });
    }

    if (categorySelect) {
        categorySelect.addEventListener('change', (e) => {
            categoryFilter = e.target.value;
            renderPosts();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortBy = e.target.value;
            renderPosts();
        });
    }
}

// Get Filtered Posts
function getFilteredPosts() {
    let filtered = [...allPosts];

    // Search filter
    if (searchTerm) {
        filtered = filtered.filter(post =>
            post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            post.content?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    // Category filter
    if (categoryFilter !== 'all') {
        filtered = filtered.filter(post => post.category === categoryFilter);
    }

    // Sort
    filtered.sort((a, b) => {
        if (sortBy === 'newest') {
            return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        } else if (sortBy === 'oldest') {
            return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
        } else if (sortBy === 'popular') {
            return (b.likes || 0) - (a.likes || 0);
        }
        return 0;
    });

    return filtered;
}

// Show New Post Modal
function showNewPostModal() {
    newPostModal.classList.remove('hidden');
}

// New Post Form
newPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    const category = document.getElementById('postCategory').value;

    if (!title || !content) return;

    await db.collection('posts').add({
        title: title,
        content: content,
        category: category,
        author: currentUser.username || currentUser.email,
        authorId: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        likes: 0,
        replies: 0
    });

    newPostModal.classList.add('hidden');
    document.getElementById('postTitle').value = '';
    document.getElementById('postContent').value = '';
    document.getElementById('postCategory').value = 'general';
});

// Cancel Post
cancelPost.addEventListener('click', () => {
    newPostModal.classList.add('hidden');
    document.getElementById('postTitle').value = '';
    document.getElementById('postContent').value = '';
    document.getElementById('postCategory').value = 'general';
});

// Render Users
function renderUsers() {
    mainContent.innerHTML = `
        <div class="content-card">
            <div class="content-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <h2>Community Members</h2>
            </div>
            <div class="users-grid">
                ${allUsers.map(user => `
                    <div class="user-item">
                        <div class="user-info">
                            <div class="user-avatar">
                                ${(user.username || user.email || 'U')[0].toUpperCase()}
                            </div>
                            <div class="user-details">
                                <p>${user.username || user.email}</p>
                                <p>${user.points || 0} points</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Render Messages
function renderMessages() {
    mainContent.innerHTML = `
        <div class="content-card">
            <div class="content-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                <h2>Messages</h2>
            </div>
            <div class="item-list">
                ${allMessages.length > 0 ? allMessages.map(msg => `
                    <div class="item-card">
                        <p>${msg.content}</p>
                        <p class="item-meta">From: ${msg.from}</p>
                    </div>
                `).join('') : '<p class="empty-state">No messages yet</p>'}
            </div>
        </div>
    `;
}

// Render Suggestions
function renderSuggestions() {
    mainContent.innerHTML = `
        <div class="content-card">
            <div class="content-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                <h2>Suggestions</h2>
            </div>
            <div class="item-list">
                ${allSuggestions.length > 0 ? allSuggestions.map(suggestion => `
                    <div class="item-card">
                        <h3>${suggestion.title}</h3>
                        <p>${suggestion.content}</p>
                        <p class="item-meta">Votes: ${suggestion.votes || 0}</p>
                    </div>
                `).join('') : '<p class="empty-state">No suggestions yet</p>'}
            </div>
        </div>
    `;
}

// Render Updates
function renderUpdates() {
    mainContent.innerHTML = `
        <div class="content-card">
            <div class="content-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <h2>Platform Updates</h2>
            </div>
            <div class="item-list">
                ${allUpdates.length > 0 ? allUpdates.map(update => `
                    <div class="item-card">
                        <h3>${update.title}</h3>
                        <p>${update.content}</p>
                    </div>
                `).join('') : '<p class="empty-state">No updates yet</p>'}
            </div>
        </div>
    `;
}

// Render Leaderboard
function renderLeaderboard() {
    mainContent.innerHTML = `
        <div class="content-card">
            <div class="content-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                    <path d="M4 22h16"/>
                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                </svg>
                <h2>Leaderboard</h2>
            </div>
            <div class="leaderboard-list">
                ${allLeaderboard.length > 0 ? allLeaderboard.map((entry, index) => `
                    <div class="leaderboard-item">
                        <div class="leaderboard-left">
                            <div class="rank-badge ${
                                index === 0 ? 'rank-1' :
                                index === 1 ? 'rank-2' :
                                index === 2 ? 'rank-3' :
                                'rank-other'
                            }">
                                ${index + 1}
                            </div>
                            <span>${entry.username}</span>
                        </div>
                        <div class="leaderboard-points">
                            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 1.25rem; height: 1.25rem; color: #fbbf24;">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                            <span>${entry.points}</span>
                        </div>
                    </div>
                `).join('') : '<p class="empty-state">No leaderboard data yet</p>'}
            </div>
        </div>
    `;
}

// Render Plinko
function renderPlinko() {
    mainContent.innerHTML = `
        <div class="content-card">
            <div class="content-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="8" width="18" height="4" rx="1"/>
                    <path d="M12 8v13"/>
                    <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/>
                    <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>
                </svg>
                <h2>Plinko Game</h2>
            </div>
            <div class="plinko-container">
                <div class="plinko-board">
                    <div class="plinko-emoji">🎰</div>
                    <p class="plinko-title">Drop the ball and win points!</p>
                    <div id="plinkoScore"></div>
                    ${currentUser ? `
                        <button class="btn-plinko" onclick="playPlinko()">Play Plinko</button>
                    ` : `
                        <p style="color: #9ca3af;">Login to play!</p>
                    `}
                </div>
            </div>
        </div>
    `;
}

// Play Plinko
function playPlinko() {
    if (!currentUser) return;

    const reward = Math.floor(Math.random() * 100) + 10;
    const scoreDiv = document.getElementById('plinkoScore');
    const playBtn = document.querySelector('.btn-plinko');

    if (scoreDiv && playBtn) {
        scoreDiv.innerHTML = `<div class="plinko-score">+${reward} Points!</div>`;
        playBtn.disabled = true;

        // Update Firestore
        db.collection('leaderboard').doc(currentUser.uid).update({
            points: firebase.firestore.FieldValue.increment(reward)
        }).catch(() => {
            // If document doesn't exist, create it
            db.collection('leaderboard').doc(currentUser.uid).set({
                username: currentUser.username || currentUser.email,
                points: reward
            });
        });

        db.collection('users').doc(currentUser.uid).update({
            points: firebase.firestore.FieldValue.increment(reward)
        });

        setTimeout(() => {
            scoreDiv.innerHTML = '';
            playBtn.disabled = false;
        }, 3000);
    }
}

// Initialize
createStars();
renderHeader();
renderView();
