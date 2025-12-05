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

// Owner Email
const OWNER_EMAIL = 'd29510713@gmail.com';

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
let allDMs = [];
let selectedDMUser = null;

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

// Check if user is owner
function isOwner() {
    return currentUser && currentUser.email === OWNER_EMAIL;
}

// Check if user is mod
function isMod() {
    return currentUser && (currentUser.role === 'mod' || currentUser.role === 'owner');
}

// Auth State Observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                currentUser = { uid: user.uid, email: user.email, ...userDoc.data() };
            } else {
                // Create user document
                const userData = {
                    username: user.email.split('@')[0],
                    email: user.email,
                    points: 0,
                    role: user.email === OWNER_EMAIL ? 'owner' : 'user',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    banned: false
                };
                await db.collection('users').doc(user.uid).set(userData);
                
                // Create leaderboard entry
                await db.collection('leaderboard').doc(user.uid).set({
                    username: userData.username,
                    points: 0
                });
                
                currentUser = { uid: user.uid, ...userData };
            }
            
            // Update role to owner if email matches
            if (currentUser.email === OWNER_EMAIL && currentUser.role !== 'owner') {
                await db.collection('users').doc(user.uid).update({ role: 'owner' });
                currentUser.role = 'owner';
            }
            
            // Setup Firestore listeners after user is authenticated
            setupFirestoreListeners();
            
            renderHeader();
            renderView();
        } catch (error) {
            console.error('Auth error:', error);
            alert('Error loading user data. Please check Firebase rules.');
        }
    } else {
        currentUser = null;
        renderHeader();
        renderView();
    }
});

// Firestore Listeners with error handling
let unsubscribers = [];

function setupFirestoreListeners() {
    // Clear old listeners
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];
    
    // Posts listener
    const unsubPosts = db.collection('posts').onSnapshot(
        (snapshot) => {
            allPosts = [];
            snapshot.forEach((doc) => {
                allPosts.push({ id: doc.id, ...doc.data() });
            });
            if (currentView === 'posts') renderView();
        },
        (error) => {
            console.log('Posts listener error:', error);
        }
    );
    unsubscribers.push(unsubPosts);

    // Users listener
    const unsubUsers = db.collection('users').onSnapshot(
        (snapshot) => {
            allUsers = [];
            snapshot.forEach((doc) => {
                allUsers.push({ id: doc.id, ...doc.data() });
            });
            if (currentView === 'users' || currentView === 'dms') renderView();
        },
        (error) => {
            console.log('Users listener error:', error);
        }
    );
    unsubscribers.push(unsubUsers);

    // Messages listener
    const unsubMessages = db.collection('messages').onSnapshot(
        (snapshot) => {
            allMessages = [];
            snapshot.forEach((doc) => {
                allMessages.push({ id: doc.id, ...doc.data() });
            });
            if (currentView === 'messages') renderView();
        },
        (error) => {
            console.log('Messages listener error:', error);
        }
    );
    unsubscribers.push(unsubMessages);

    // Suggestions listener
    const unsubSuggestions = db.collection('suggestions').onSnapshot(
        (snapshot) => {
            allSuggestions = [];
            snapshot.forEach((doc) => {
                allSuggestions.push({ id: doc.id, ...doc.data() });
            });
            if (currentView === 'suggestions') renderView();
        },
        (error) => {
            console.log('Suggestions listener error:', error);
        }
    );
    unsubscribers.push(unsubSuggestions);

    // Updates listener
    const unsubUpdates = db.collection('updates').onSnapshot(
        (snapshot) => {
            allUpdates = [];
            snapshot.forEach((doc) => {
                allUpdates.push({ id: doc.id, ...doc.data() });
            });
            if (currentView === 'updates') renderView();
        },
        (error) => {
            console.log('Updates listener error:', error);
        }
    );
    unsubscribers.push(unsubUpdates);

    // Leaderboard listener
    const unsubLeaderboard = db.collection('leaderboard').orderBy('points', 'desc').onSnapshot(
        (snapshot) => {
            allLeaderboard = [];
            snapshot.forEach((doc) => {
                allLeaderboard.push({ id: doc.id, ...doc.data() });
            });
            if (currentView === 'leaderboard') renderView();
        },
        (error) => {
            console.log('Leaderboard listener error:', error);
        }
    );
    unsubscribers.push(unsubLeaderboard);

    // DMs listener (only if user is logged in)
    if (currentUser) {
        const unsubDMs = db.collection('dms').onSnapshot(
            (snapshot) => {
                allDMs = [];
                snapshot.forEach((doc) => {
                    allDMs.push({ id: doc.id, ...doc.data() });
                });
                if (currentView === 'dms') renderView();
            },
            (error) => {
                console.log('DMs listener error:', error);
            }
        );
        unsubscribers.push(unsubDMs);
    }
}

// Call this after user logs in
setupFirestoreListeners();

// Render Header
function renderHeader() {
    if (currentUser) {
        const roleBadge = currentUser.role === 'owner' ? '<span style="background: linear-gradient(90deg, #fbbf24, #f59e0b); color: #000; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: bold;">👑 OWNER</span>' :
                        currentUser.role === 'mod' ? '<span style="background: #3b82f6; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: bold;">🛡️ MOD</span>' : '';
        
        headerActions.innerHTML = `
            <div class="user-points">
                <svg class="star-icon" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <span>${currentUser.points || 0} pts</span>
            </div>
            ${roleBadge}
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
                role: email === OWNER_EMAIL ? 'owner' : 'user',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                banned: false
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
        case 'dms':
            renderDMs();
            break;
    }
}

// Like Post
async function likePost(postId) {
    if (!currentUser) {
        alert('Please login to like posts!');
        return;
    }

    const postRef = db.collection('posts').doc(postId);
    const post = allPosts.find(p => p.id === postId);
    
    if (!post) return;
    
    const likedBy = post.likedBy || [];
    
    if (likedBy.includes(currentUser.uid)) {
        // Unlike
        await postRef.update({
            likes: firebase.firestore.FieldValue.increment(-1),
            likedBy: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
        });
    } else {
        // Like
        await postRef.update({
            likes: firebase.firestore.FieldValue.increment(1),
            likedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
        });
    }
}

// Delete Post
async function deletePost(postId) {
    if (!isMod()) return;
    
    if (confirm('Are you sure you want to delete this post?')) {
        await db.collection('posts').doc(postId).delete();
    }
}

// Add Comment
async function addComment(postId) {
    if (!currentUser) return;
    
    const comment = prompt('Enter your comment:');
    if (!comment) return;
    
    const postRef = db.collection('posts').doc(postId);
    await postRef.update({
        replies: firebase.firestore.FieldValue.increment(1)
    });
    
    await db.collection('comments').add({
        postId: postId,
        content: comment,
        author: currentUser.username || currentUser.email,
        authorId: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
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
            ${filteredPosts.length > 0 ? filteredPosts.map(post => {
                const isLiked = currentUser && post.likedBy && post.likedBy.includes(currentUser.uid);
                return `
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
                            <button onclick="likePost('${post.id}')" class="like-btn ${isLiked ? 'liked' : ''}" style="background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.25rem; color: ${isLiked ? '#ef4444' : '#9ca3af'};">
                                <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="width: 1rem; height: 1rem;">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                </svg>
                                ${post.likes || 0}
                            </button>
                            <button onclick="addComment('${post.id}')" style="background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.25rem; color: #9ca3af;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 1rem; height: 1rem;">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                </svg>
                                ${post.replies || 0}
                            </button>
                            ${isMod() ? `
                                <button onclick="deletePost('${post.id}')" style="background: #dc2626; border: none; cursor: pointer; padding: 0.25rem 0.75rem; border-radius: 0.25rem; color: white; font-size: 0.875rem;">
                                    Delete
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('') : `
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
        replies: 0,
        likedBy: []
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

// Make Mod
async function makeMod(userId, userEmail) {
    if (!isOwner()) return;
    if (userEmail === OWNER_EMAIL) {
        alert('Cannot change owner role!');
        return;
    }
    
    await db.collection('users').doc(userId).update({
        role: 'mod'
    });
    alert('User is now a moderator!');
}

// Remove Mod
async function removeMod(userId, userEmail) {
    if (!isOwner()) return;
    if (userEmail === OWNER_EMAIL) {
        alert('Cannot change owner role!');
        return;
    }
    
    await db.collection('users').doc(userId).update({
        role: 'user'
    });
    alert('Moderator privileges removed!');
}

// Ban User
async function banUser(userId, userEmail) {
    if (!isMod()) return;
    if (userEmail === OWNER_EMAIL) {
        alert('Cannot ban the owner!');
        return;
    }
    
    await db.collection('users').doc(userId).update({
        banned: true
    });
    alert('User has been banned!');
}

// Unban User
async function unbanUser(userId) {
    if (!isMod()) return;
    
    await db.collection('users').doc(userId).update({
        banned: false
    });
    alert('User has been unbanned!');
}

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
                ${allUsers.map(user => {
                    const roleBadge = user.role === 'owner' ? '👑' : user.role === 'mod' ? '🛡️' : '';
                    const isBanned = user.banned || false;
                    
                    return `
                        <div class="user-item" style="${isBanned ? 'opacity: 0.5; border-color: #dc2626;' : ''}">
                            <div class="user-info">
                                <div class="user-avatar">
                                    ${(user.username || user.email || 'U')[0].toUpperCase()}
                                </div>
                                <div class="user-details">
                                    <p>${roleBadge} ${user.username || user.email} ${isBanned ? '(Banned)' : ''}</p>
                                    <p>${user.points || 0} points</p>
                                </div>
                            </div>
                            ${(isMod() || isOwner()) && user.email !== OWNER_EMAIL ? `
                                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                    ${isOwner() && user.role !== 'mod' ? `
                                        <button onclick="makeMod('${user.id}', '${user.email}')" class="action-btn" style="background: #3b82f6; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; color: white; cursor: pointer; font-size: 0.875rem;">
                                            Make Mod
                                        </button>
                                    ` : ''}
                                    ${isOwner() && user.role === 'mod' ? `
                                        <button onclick="removeMod('${user.id}', '${user.email}')" class="action-btn" style="background: #f59e0b; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; color: white; cursor: pointer; font-size: 0.875rem;">
                                            Remove Mod
                                        </button>
                                    ` : ''}
                                    ${!isBanned ? `
                                        <button onclick="banUser('${user.id}', '${user.email}')" class="action-btn" style="background: #dc2626; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; color: white; cursor: pointer; font-size: 0.875rem;">
                                            Ban
                                        </button>
                                    ` : `
                                        <button onclick="unbanUser('${user.id}')" class="action-btn" style="background: #10b981; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; color: white; cursor: pointer; font-size: 0.875rem;">
                                            Unban
                                        </button>
                                    `}
                                    ${currentUser && currentUser.uid !== user.id ? `
                                        <button onclick="openDM('${user.id}')" class="action-btn" style="background: #8b5cf6; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; color: white; cursor: pointer; font-size: 0.875rem;">
                                            DM
                                        </button>
                                    ` : ''}
                                </div>
                            ` : currentUser && currentUser.uid !== user.id ? `
                                <button onclick="openDM('${user.id}')" class="action-btn" style="background: #8b5cf6; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; color: white; cursor: pointer; font-size: 0.875rem;">
                                    DM
                                </button>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// Open DM
function openDM(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    selectedDMUser = user;
    currentView = 'dms';
    
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.nav-btn[data-view="dms"]').classList.add('active');
    
    renderDMs();
}

// Send DM
async function sendDM() {
    if (!currentUser || !selectedDMUser) return;
    
    const input = document.getElementById('dmInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    const participants = [currentUser.uid, selectedDMUser.id].sort();
    const conversationId = participants.join('_');
    
    await db.collection('dms').add({
        conversationId: conversationId,
        from: currentUser.uid,
        fromName: currentUser.username || currentUser.email,
        to: selectedDMUser.id,
        toName: selectedDMUser.username || selectedDMUser.email,
        message: message,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        read: false
    });
    
    input.value = '';
}

// Render DMs
function renderDMs() {
    if (!currentUser) {
        mainContent.innerHTML = '<div class="empty-state">Please login to use DMs</div>';
        return;
    }
    
    // Get unique conversations
    const conversations = new Map();
    allDMs.forEach(dm => {
        const otherUserId = dm.from === currentUser.uid ? dm.to : dm.from;
        const otherUserName = dm.from === currentUser.uid ? dm.toName : dm.fromName;
        
        if (!conversations.has(otherUserId)) {
            conversations.set(otherUserId, {
                userId: otherUserId,
                userName: otherUserName,
                lastMessage: dm.message,
                lastMessageTime: dm.createdAt
            });
        }
    });
    
    if (!selectedDMUser) {
        // Show conversation list
        mainContent.innerHTML = `
            <div class="content-card">
                <div class="content-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <h2>Direct Messages</h2>
                </div>
                <div class="item-list">
                    ${Array.from(conversations.values()).map(conv => `
                        <div class="item-card" style="cursor: pointer;" onclick="openDM('${conv.userId}')">
                            <h3>${conv.userName}</h3>
                            <p>${conv.lastMessage}</p>
                        </div>
                    `).join('')}
                    ${conversations.size === 0 ? '<p class="empty-state">No conversations yet. Go to Users to start chatting!</p>' : ''}
                </div>
            </div>
        `;
    } else {
        // Show conversation with selected user
        const participants = [currentUser.uid, selectedDMUser.id].sort();
        const conversationId = participants.join('_');
        
        const messages = allDMs
            .filter(dm => dm.conversationId === conversationId)
            .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        
        mainContent.innerHTML = `
            <div class="content-card">
                <div class="content-header">
                    <button onclick="selectedDMUser = null; renderDMs();" style="background: #475569; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; color: white; cursor: pointer; margin-right: 1rem;">
                        ← Back
                    </button>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <h2>Chat with ${selectedDMUser.username || selectedDMUser.email}</h2>
                </div>
                <div style="max-height: 400px; overflow-y: auto; margin-bottom: 1rem; padding: 1rem; background: rgba(30, 41, 59, 0.3); border-radius: 0.5rem;">
                    ${messages.map(msg => `
                        <div style="margin-bottom: 1rem; text-align: ${msg.from === currentUser.uid ? 'right' : 'left'};">
                            <div style="display: inline-block; max-width: 70%; background: ${msg.from === currentUser.uid ? '#8b5cf6' : '#475569'}; padding: 0.75rem; border-radius: 1rem; text-align: left;">
                                <p style="font-size: 0.75rem; color: #d1d5db; margin-bottom: 0.25rem;">${msg.fromName}</p>
                                <p>${msg.message}</p>
                            </div>
                        </div>
                    `).join('')}
                    ${messages.length === 0 ? '<p class="empty-state">No messages yet. Start the conversation!</p>' : ''}
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="text" id="dmInput" placeholder="Type a message..." style="flex: 1;">
                    <button onclick="sendDM()" class="btn-primary" style="width: auto; padding: 0.75rem 1.5rem;">
                        Send
                    </button>
                </div>
            </div>
        `;
        
        // Auto scroll to bottom
        const messageContainer = mainContent.querySelector('[style*="max-height: 400px"]');
        if (messageContainer) {
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }
        
        // Add enter key handler
        const dmInput = document.getElementById('dmInput');
        if (dmInput) {
            dmInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendDM();
                }
            });
        }
    }
}

// Render Messages (Public Messages)
function renderMessages() {
    mainContent.innerHTML = `
        <div class="content-card">
            <div class="content-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                <h2>Public Messages</h2>
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

// Vote Suggestion
async function voteSuggestion(suggestionId) {
    if (!currentUser) {
        alert('Please login to vote!');
        return;
    }
    
    const suggestionRef = db.collection('suggestions').doc(suggestionId);
    const suggestion = allSuggestions.find(s => s.id === suggestionId);
    
    if (!suggestion) return;
    
    const votedBy = suggestion.votedBy || [];
    
    if (votedBy.includes(currentUser.uid)) {
        // Remove vote
        await suggestionRef.update({
            votes: firebase.firestore.FieldValue.increment(-1),
            votedBy: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
        });
    } else {
        // Add vote
        await suggestionRef.update({
            votes: firebase.firestore.FieldValue.increment(1),
            votedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
        });
    }
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
                ${allSuggestions.length > 0 ? allSuggestions.map(suggestion => {
                    const hasVoted = currentUser && suggestion.votedBy && suggestion.votedBy.includes(currentUser.uid);
                    return `
                        <div class="item-card">
                            <h3>${suggestion.title}</h3>
                            <p>${suggestion.content}</p>
                            <div style="display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem;">
                                <button onclick="voteSuggestion('${suggestion.id}')" style="background: ${hasVoted ? '#10b981' : '#6b7280'}; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; color: white; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
                                    <svg viewBox="0 0 24 24" fill="currentColor" style="width: 1rem; height: 1rem;">
                                        <path d="M7 10l5-5 5 5"/>
                                        <path d="M12 5v14"/>
                                    </svg>
                                    ${suggestion.votes || 0} votes
                                </button>
                            </div>
                        </div>
                    `;
                }).join('') : '<p class="empty-state">No suggestions yet</p>'}
            </div>
        </div>
    `;
}

// Create Update (Owner only)
async function createUpdate() {
    if (!isOwner()) return;
    
    const title = prompt('Update Title:');
    if (!title) return;
    
    const content = prompt('Update Content:');
    if (!content) return;
    
    await db.collection('updates').add({
        title: title,
        content: content,
        createdBy: currentUser.username || currentUser.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    alert('Update published!');
}

// Delete Update
async function deleteUpdate(updateId) {
    if (!isOwner()) return;
    
    if (confirm('Delete this update?')) {
        await db.collection('updates').doc(updateId).delete();
    }
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
            ${isOwner() ? `
                <button onclick="createUpdate()" class="btn-primary" style="margin-bottom: 1rem;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 1.25rem; height: 1.25rem;">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="16"/>
                        <line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                    Create Update
                </button>
            ` : ''}
            <div class="item-list">
                ${allUpdates.length > 0 ? allUpdates.map(update => `
                    <div class="item-card">
                        <h3>${update.title}</h3>
                        <p>${update.content}</p>
                        <p class="item-meta">Posted by: ${update.createdBy}</p>
                        ${isOwner() ? `
                            <button onclick="deleteUpdate('${update.id}')" style="background: #dc2626; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; color: white; cursor: pointer; margin-top: 0.5rem;">
                                Delete
                            </button>
                        ` : ''}
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
