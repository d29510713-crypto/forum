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
let allComments = [];
let selectedDMUser = null;
let expandedComments = new Set(); // Track which posts have comments expanded
let selectedPost = null; // For viewing full post details

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
    for (let i = 0; i < 150; i++) {
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
            
            // Fix undefined username
            if (!currentUser.username || currentUser.username === 'undefined') {
                const newUsername = user.email.split('@')[0];
                await db.collection('users').doc(user.uid).update({ username: newUsername });
                currentUser.username = newUsername;
                
                // Update leaderboard too
                await db.collection('leaderboard').doc(user.uid).update({ username: newUsername });
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
    
    // Posts listener - real-time updates
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

    // Users listener - real-time updates
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

    // Messages listener - real-time updates
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

    // Suggestions listener - real-time updates
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

    // Updates listener - real-time updates, sorted newest first
    const unsubUpdates = db.collection('updates').orderBy('createdAt', 'desc').onSnapshot(
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

    // Leaderboard listener - real-time updates
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

    // DMs listener - real-time updates (only if user is logged in)
    if (currentUser) {
        try {
            const unsubDMs = db.collection('dms').onSnapshot(
                (snapshot) => {
                    allDMs = [];
                    snapshot.forEach((doc) => {
                        allDMs.push({ id: doc.id, ...doc.data() });
                    });
                    if (currentView === 'dms') renderView();
                },
                (error) => {
                    console.log('DMs listener error (this is normal if not logged in):', error.message);
                }
            );
            unsubscribers.push(unsubDMs);
        } catch (error) {
            console.log('Could not setup DMs listener:', error.message);
        }
    }
    
    // Comments listener - real-time updates
    const unsubComments = db.collection('comments').onSnapshot(
        (snapshot) => {
            allComments = [];
            snapshot.forEach((doc) => {
                allComments.push({ id: doc.id, ...doc.data() });
            });
            if (currentView === 'posts') renderView();
        },
        (error) => {
            console.log('Comments listener error:', error);
        }
    );
    unsubscribers.push(unsubComments);
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
    
    const titleEl = document.getElementById('authTitle');
    const usernameEl = document.getElementById('usernameInput');
    const submitBtn = document.getElementById('authSubmitBtn');
    const toggleBtn = document.getElementById('authToggle');
    
    if (mode === 'login') {
        if (titleEl) titleEl.textContent = 'Login to Galaxy Forum';
        if (usernameEl) usernameEl.classList.add('hidden');
        if (submitBtn) submitBtn.textContent = 'Login';
        if (toggleBtn) toggleBtn.textContent = 'Need an account? Register';
    } else {
        if (titleEl) titleEl.textContent = 'Join Galaxy Forum';
        if (usernameEl) usernameEl.classList.remove('hidden');
        if (submitBtn) submitBtn.textContent = 'Register';
        if (toggleBtn) toggleBtn.textContent = 'Already have an account? Login';
    }
    
    if (authModal) authModal.classList.remove('hidden');
}

// Handle Auth Submit
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const emailEl = document.getElementById('emailInput');
        const passwordEl = document.getElementById('passwordInput');
        const usernameEl = document.getElementById('usernameInput');
        
        if (!emailEl || !passwordEl) {
            console.error('Auth form elements not found');
            return;
        }
        
        const email = emailEl.value.trim();
        const password = passwordEl.value.trim();
        const username = usernameEl ? usernameEl.value.trim() : '';

        if (!email || !password) {
            alert('Please enter email and password');
            return;
        }

        try {
            if (authMode === 'login') {
                await auth.signInWithEmailAndPassword(email, password);
            } else {
                if (!username) {
                    alert('Please enter a username');
                    return;
                }
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
            emailEl.value = '';
            passwordEl.value = '';
            if (usernameEl) usernameEl.value = '';
        } catch (error) {
            console.error('Auth error:', error);
            alert(error.message);
        }
    });
}

// Auth Toggle
if (authToggle) {
    authToggle.addEventListener('click', () => {
        showAuthModal(authMode === 'login' ? 'register' : 'login');
    });
}

// Auth Cancel
if (authCancel) {
    authCancel.addEventListener('click', () => {
        authModal.classList.add('hidden');
        const emailEl = document.getElementById('emailInput');
        const passwordEl = document.getElementById('passwordInput');
        const usernameEl = document.getElementById('usernameInput');
        if (emailEl) emailEl.value = '';
        if (passwordEl) passwordEl.value = '';
        if (usernameEl) usernameEl.value = '';
    });
}

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
        try {
            await db.collection('posts').doc(postId).delete();
            // Delete all comments for this post
            const comments = await db.collection('comments').where('postId', '==', postId).get();
            const batch = db.batch();
            comments.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Error deleting post');
        }
    }
}

// Edit Post (author only)
async function editPost(postId) {
    const post = allPosts.find(p => p.id === postId);
    if (!post || !currentUser) return;
    
    // Only author or mods can edit
    if (post.authorId !== currentUser.uid && !isMod()) {
        alert('You can only edit your own posts!');
        return;
    }
    
    const newContent = prompt('Edit your post:', post.content);
    if (newContent && newContent.trim() !== post.content) {
        try {
            await db.collection('posts').doc(postId).update({
                content: newContent.trim(),
                edited: true,
                editedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error editing post:', error);
            alert('Error editing post');
        }
    }
}

// Share Post
function sharePost(postId) {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    
    const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;
    
    if (navigator.share) {
        navigator.share({
            title: `Post by ${post.author}`,
            text: post.content.substring(0, 100),
            url: url
        });
    } else {
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copied to clipboard!');
        });
    }
}

// Report Post
async function reportPost(postId) {
    if (!currentUser) return;
    
    const reason = prompt('Why are you reporting this post?');
    if (!reason) return;
    
    try {
        await db.collection('reports').add({
            postId: postId,
            reportedBy: currentUser.uid,
            reporterName: currentUser.username || currentUser.email,
            reason: reason,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            resolved: false
        });
        alert('Post reported. Moderators will review it.');
    } catch (error) {
        console.error('Error reporting post:', error);
        alert('Error reporting post');
    }
}

// Award Points to User (Mod/Owner only)
async function awardPoints(userId) {
    if (!isMod()) return;
    
    const points = prompt('How many points to award?');
    if (!points || isNaN(points)) return;
    
    const amount = parseInt(points);
    
    try {
        await db.collection('leaderboard').doc(userId).update({
            points: firebase.firestore.FieldValue.increment(amount)
        });
        await db.collection('users').doc(userId).update({
            points: firebase.firestore.FieldValue.increment(amount)
        });
        alert(`Awarded ${amount} points!`);
    } catch (error) {
        console.error('Error awarding points:', error);
        alert('Error awarding points');
    }
}

// Delete Comment
async function deleteComment(commentId, postId) {
    if (!isMod()) return;
    
    if (confirm('Delete this comment?')) {
        try {
            await db.collection('comments').doc(commentId).delete();
            await db.collection('posts').doc(postId).update({
                replies: firebase.firestore.FieldValue.increment(-1)
            });
        } catch (error) {
            console.error('Error deleting comment:', error);
        }
    }
}

// Give Badge to User (Owner only)
async function giveBadge(userId) {
    if (!isOwner()) return;
    
    const badges = ['⭐ Star Member', '🔥 Hot Contributor', '💎 Diamond User', '👑 VIP', '🚀 Astronaut'];
    const badge = prompt(`Choose a badge:\n${badges.map((b, i) => `${i + 1}. ${b}`).join('\n')}`);
    
    if (!badge) return;
    
    try {
        await db.collection('users').doc(userId).update({
            badges: firebase.firestore.FieldValue.arrayUnion(badge)
        });
        alert('Badge awarded!');
    } catch (error) {
        console.error('Error giving badge:', error);
    }
}

// View User Profile
function viewUserProfile(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const userPosts = allPosts.filter(p => p.authorId === userId);
    const totalLikes = userPosts.reduce((sum, post) => sum + (post.likes || 0), 0);
    
    alert(`
👤 ${user.username || user.email}
${user.role === 'owner' ? '👑 OWNER' : user.role === 'mod' ? '🛡️ MOD' : ''}
${user.badges ? user.badges.join(' ') : ''}

📊 Stats:
⭐ Points: ${user.points || 0}
📝 Posts: ${userPosts.length}
❤️ Total Likes: ${totalLikes}
📅 Member since: ${user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}
    `);
}

// Follow/Unfollow User
async function toggleFollow(userId) {
    if (!currentUser || userId === currentUser.uid) return;
    
    const userRef = db.collection('users').doc(currentUser.uid);
    const userDoc = await userRef.get();
    const following = userDoc.data()?.following || [];
    
    if (following.includes(userId)) {
        await userRef.update({
            following: firebase.firestore.FieldValue.arrayRemove(userId)
        });
    } else {
        await userRef.update({
            following: firebase.firestore.FieldValue.arrayUnion(userId)
        });
    }
}

// Save/Bookmark Post
async function toggleSavePost(postId) {
    if (!currentUser) return;
    
    const userRef = db.collection('users').doc(currentUser.uid);
    const userDoc = await userRef.get();
    const saved = userDoc.data()?.savedPosts || [];
    
    if (saved.includes(postId)) {
        await userRef.update({
            savedPosts: firebase.firestore.FieldValue.arrayRemove(postId)
        });
    } else {
        await userRef.update({
            savedPosts: firebase.firestore.FieldValue.arrayUnion(postId)
        });
    }
    
    renderPosts();
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

// Get time ago string
function getTimeAgo(timestamp) {
    if (!timestamp || !timestamp.seconds) return 'Just now';
    
    const now = Date.now();
    const postTime = timestamp.seconds * 1000;
    const diff = now - postTime;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 4) return `${weeks}w ago`;
    if (months < 12) return `${months}mo ago`;
    return `${years}y ago`;
}

// Toggle Comments View
function toggleComments(postId) {
    if (expandedComments.has(postId)) {
        expandedComments.delete(postId);
    } else {
        expandedComments.add(postId);
    }
    renderPosts();
}

// Get comments for a post
function getCommentsForPost(postId) {
    return allComments
        .filter(comment => comment.postId === postId)
        .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
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
                const isPinned = post.pinned || false;
                const isFeatured = post.featured || false;
                const isLocked = post.locked || false;
                const postComments = getCommentsForPost(post.id);
                const commentsExpanded = expandedComments.has(post.id);
                const timeAgo = getTimeAgo(post.createdAt);
                const isSaved = currentUser && currentUser.savedPosts && currentUser.savedPosts.includes(post.id);
                const isOwnPost = currentUser && post.authorId === currentUser.uid;
                const reactionCounts = getReactionCounts(post);
                const userReaction = currentUser && post.reactions && post.reactions[currentUser.uid];
                
                return `
                    <div class="post-card" style="${isPinned ? 'border: 2px solid #fbbf24; background: rgba(251, 191, 36, 0.1);' : isFeatured ? 'border: 2px solid #8b5cf6; background: rgba(138, 43, 226, 0.1);' : ''}">
                        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap;">
                            ${isPinned ? '<div style="display: inline-block; background: #fbbf24; color: #000; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: bold;">📌 PINNED</div>' : ''}
                            ${isFeatured ? '<div style="display: inline-block; background: #8b5cf6; color: #fff; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: bold;">⭐ FEATURED</div>' : ''}
                            ${isLocked ? '<div style="display: inline-block; background: #dc2626; color: #fff; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: bold;">🔒 LOCKED</div>' : ''}
                            ${post.edited ? '<div style="display: inline-block; background: rgba(138, 43, 226, 0.3); color: #d8b4fe; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.75rem;">✏️ Edited</div>' : ''}
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                            <div class="user-avatar" style="width: 2.5rem; height: 2.5rem; font-size: 1rem; cursor: pointer;" onclick="viewUserProfile('${post.authorId}')">
                                ${(post.author || 'U')[0].toUpperCase()}
                            </div>
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                    <h3 class="post-title" style="margin: 0; font-size: 1.125rem; cursor: pointer;" onclick="viewUserProfile('${post.authorId}')">${post.author || 'Unknown'}</h3>
                                    <span class="post-category" style="font-size: 0.75rem;">${post.category}</span>
                                    <span style="color: #6b7280; font-size: 0.75rem;">• ${timeAgo}</span>
                                </div>
                            </div>
                        </div>
                        <p class="post-content">${post.content}</p>
                        
                        <!-- Reactions -->
                        ${Object.keys(reactionCounts).length > 0 ? `
                            <div style="display: flex; gap: 0.5rem; margin: 0.75rem 0; flex-wrap: wrap;">
                                ${Object.entries(reactionCounts).map(([emoji, count]) => `
                                    <span style="background: rgba(138, 43, 226, 0.2); padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.875rem; border: 1px solid rgba(138, 43, 226, 0.3);">
                                        ${emoji} ${count}
                                    </span>
                                `).join('')}
                            </div>
                        ` : ''}
                        
                        <div class="post-meta">
                            <button onclick="likePost('${post.id}')" class="like-btn ${isLiked ? 'liked' : ''}" style="background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.25rem; color: ${isLiked ? '#ef4444' : '#9ca3af'}; transition: all 0.3s;" title="Like">
                                <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="width: 1rem; height: 1rem;">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                </svg>
                                ${post.likes || 0}
                            </button>
                            ${!isLocked ? `
                                <button onclick="addComment('${post.id}')" style="background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.25rem; color: #9ca3af; transition: all 0.3s;" title="Comment">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 1rem; height: 1rem;">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                    </svg>
                                    ${post.replies || 0}
                                </button>
                            ` : `
                                <span style="display: flex; align-items: center; gap: 0.25rem; color: #6b7280;">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 1rem; height: 1rem;">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                    </svg>
                                    ${post.replies || 0}
                                </span>
                            `}
                            ${currentUser ? `
                                <!-- Quick Reactions -->
                                <button onclick="reactToPost('${post.id}', '👍')" style="background: none; border: none; cursor: pointer; font-size: 1.125rem; ${userReaction === '👍' ? 'transform: scale(1.3);' : ''}" title="Like">👍</button>
                                <button onclick="reactToPost('${post.id}', '❤️')" style="background: none; border: none; cursor: pointer; font-size: 1.125rem; ${userReaction === '❤️' ? 'transform: scale(1.3);' : ''}" title="Love">❤️</button>
                                <button onclick="reactToPost('${post.id}', '😂')" style="background: none; border: none; cursor: pointer; font-size: 1.125rem; ${userReaction === '😂' ? 'transform: scale(1.3);' : ''}" title="Haha">😂</button>
                                <button onclick="reactToPost('${post.id}', '🔥')" style="background: none; border: none; cursor: pointer; font-size: 1.125rem; ${userReaction === '🔥' ? 'transform: scale(1.3);' : ''}" title="Fire">🔥</button>
                                
                                <button onclick="toggleSavePost('${post.id}')" style="background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.25rem; color: ${isSaved ? '#fbbf24' : '#9ca3af'}; transition: all 0.3s;" title="${isSaved ? 'Unsave' : 'Save'}">
                                    <svg viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="width: 1rem; height: 1rem;">
                                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                                    </svg>
                                </button>
                                <button onclick="sharePost('${post.id}')" style="background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.25rem; color: #9ca3af; transition: all 0.3s;" title="Share">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 1rem; height: 1rem;">
                                        <circle cx="18" cy="5" r="3"/>
                                        <circle cx="6" cy="12" r="3"/>
                                        <circle cx="18" cy="19" r="3"/>
                                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                                    </svg>
                                </button>
                            ` : ''}
                            ${isOwnPost || isMod() ? `
                                <button onclick="editPost('${post.id}')" style="background: #3b82f6; border: none; cursor: pointer; padding: 0.25rem 0.75rem; border-radius: 0.25rem; color: white; font-size: 0.875rem;" title="Edit">
                                    Edit
                                </button>
                            ` : ''}
                            ${isMod() ? `
                                <button onclick="featurePost('${post.id}')" style="background: ${isFeatured ? '#8b5cf6' : '#6b7280'}; border: none; cursor: pointer; padding: 0.25rem 0.75rem; border-radius: 0.25rem; color: white; font-size: 0.875rem;">
                                    ${isFeatured ? 'Unfeature' : 'Feature'}
                                </button>
                                <button onclick="toggleLockPost('${post.id}')" style="background: ${isLocked ? '#f59e0b' : '#6b7280'}; border: none; cursor: pointer; padding: 0.25rem 0.75rem; border-radius: 0.25rem; color: white; font-size: 0.875rem;">
                                    ${isLocked ? 'Unlock' : 'Lock'}
                                </button>
                                <button onclick="togglePinPost('${post.id}')" style="background: ${isPinned ? '#f59e0b' : '#6b7280'}; border: none; cursor: pointer; padding: 0.25rem 0.75rem; border-radius: 0.25rem; color: white; font-size: 0.875rem;">
                                    ${isPinned ? 'Unpin' : 'Pin'}
                                </button>
                                <button onclick="deletePost('${post.id}')" style="background: #dc2626; border: none; cursor: pointer; padding: 0.25rem 0.75rem; border-radius: 0.25rem; color: white; font-size: 0.875rem;">
                                    Delete
                                </button>
                            ` : currentUser ? `
                                <button onclick="reportPost('${post.id}')" style="background: none; border: none; cursor: pointer; color: #dc2626; font-size: 0.75rem;" title="Report">
                                    Report
                                </button>
                            ` : ''}
                        </div>
                        
                        ${postComments.length > 0 ? `
                            <div class="comments-section">
                                <button onclick="toggleComments('${post.id}')" class="comments-toggle">
                                    ${commentsExpanded ? '▼' : '▶'} ${postComments.length} Comment${postComments.length !== 1 ? 's' : ''}
                                </button>
                                ${commentsExpanded ? `
                                    <div class="comments-list">
                                        ${postComments.map(comment => `
                                            <div class="comment-item">
                                                <div style="display: flex; justify-content: space-between; align-items: start;">
                                                    <div>
                                                        <div class="comment-author">${comment.author || 'Unknown'}</div>
                                                        <div class="comment-content">${comment.content}</div>
                                                    </div>
                                                    ${isMod() ? `
                                                        <button onclick="deleteComment('${comment.id}', '${post.id}')" style="background: #dc2626; border: none; cursor: pointer; padding: 0.25rem 0.5rem; border-radius: 0.25rem; color: white; font-size: 0.75rem;">
                                                            Delete
                                                        </button>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
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

// Pin/Unpin Post
async function togglePinPost(postId) {
    if (!isMod()) return;
    
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    
    await db.collection('posts').doc(postId).update({
        pinned: !post.pinned,
        pinnedAt: post.pinned ? null : firebase.firestore.FieldValue.serverTimestamp()
    });
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

    // Separate pinned and unpinned posts
    const pinnedPosts = filtered.filter(post => post.pinned);
    const unpinnedPosts = filtered.filter(post => !post.pinned);

    // Sort unpinned posts
    unpinnedPosts.sort((a, b) => {
        if (sortBy === 'newest') {
            return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        } else if (sortBy === 'oldest') {
            return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
        } else if (sortBy === 'popular') {
            return (b.likes || 0) - (a.likes || 0);
        }
        return 0;
    });

    // Sort pinned posts by pinned date (newest pinned first)
    pinnedPosts.sort((a, b) => {
        return (b.pinnedAt?.seconds || 0) - (a.pinnedAt?.seconds || 0);
    });

    // Return pinned posts first, then unpinned
    return [...pinnedPosts, ...unpinnedPosts];
}

// Show New Post Modal
function showNewPostModal() {
    newPostModal.classList.remove('hidden');
    // Reset form
    setTimeout(() => {
        const contentInput = document.getElementById('postContent');
        const categoryInput = document.getElementById('postCategory');
        if (contentInput) contentInput.value = '';
        if (categoryInput) categoryInput.value = 'general';
    }, 100);
}

// New Post Form
if (newPostForm) {
    newPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const contentInput = document.getElementById('postContent');
        const categoryInput = document.getElementById('postCategory');
        
        if (!contentInput || !categoryInput) {
            console.error('Post form elements not found');
            return;
        }

        const content = contentInput.value.trim();
        const category = categoryInput.value;

        if (!content) {
            alert('Please enter some content for your post');
            return;
        }

        try {
            await db.collection('posts').add({
                title: '', // No longer used
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
            contentInput.value = '';
            categoryInput.value = 'general';
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Error creating post. Please try again.');
        }
    });
}

// Cancel Post
if (cancelPost) {
    cancelPost.addEventListener('click', () => {
        newPostModal.classList.add('hidden');
        const contentInput = document.getElementById('postContent');
        const categoryInput = document.getElementById('postCategory');
        if (contentInput) contentInput.value = '';
        if (categoryInput) categoryInput.value = 'general';
    });
}

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
            ${isOwner() ? `
                <button onclick="makeAnnouncement()" class="btn-primary" style="margin-bottom: 1rem;">
                    📢 Make Announcement
                </button>
            ` : ''}
            <div class="users-grid">
                ${allUsers.map(user => {
                    const roleBadge = user.role === 'owner' ? '👑' : user.role === 'mod' ? '🛡️' : '';
                    const isBanned = user.banned || false;
                    const isMuted = user.muted || false;
                    const isFollowing = currentUser && currentUser.following && currentUser.following.includes(user.id);
                    
                    return `
                        <div class="user-item" style="${isBanned ? 'opacity: 0.5; border-color: #dc2626;' : ''}">
                            <div class="user-info">
                                <div class="user-avatar" style="cursor: pointer;" onclick="viewUserProfile('${user.id}')">
                                    ${(user.username || user.email || 'U')[0].toUpperCase()}
                                </div>
                                <div class="user-details">
                                    <p style="cursor: pointer;" onclick="viewUserProfile('${user.id}')">
                                        ${roleBadge} ${user.username || user.email} 
                                        ${isBanned ? '(Banned)' : ''} 
                                        ${isMuted ? '🔇' : ''}
                                    </p>
                                    ${user.customTitle ? `<p style="font-size: 0.75rem; color: #fbbf24; font-style: italic;">${user.customTitle}</p>` : ''}
                                    <p>${user.points || 0} points</p>
                                    ${user.badges && user.badges.length > 0 ? `<p style="font-size: 0.875rem; margin-top: 0.25rem;">${user.badges.join(' ')}</p>` : ''}
                                </div>
                            </div>
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                ${currentUser && currentUser.uid !== user.id ? `
                                    <button onclick="toggleFollow('${user.id}')" class="action-btn" style="background: ${isFollowing ? '#10b981' : '#6b7280'}; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; color: white; cursor: pointer; font-size: 0.875rem;">
                                        ${isFollowing ? '✓ Following' : 'Follow'}
                                    </button>
                                ` : ''}
                                ${isOwner() && user.role !== 'mod' && user.email !== OWNER_EMAIL ? `
                                    <button onclick="makeMod('${user.id}', '${user.email}')" class="action-btn" style="background: #3b82f6; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; color: white; cursor: pointer; font-size: 0.875rem;">
                                        Make Mod
                                    </button>
                                ` : ''}
                                ${isOwner() && user.role === 'mod' && user.email !== OWNER_EMAIL ? `
                                    <button onclick="removeMod('${user.id}', '${user.email}')" class="action-btn" style="background: #f59e0b; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; color: white; cursor: pointer; font-size: 0.875rem;">
                                        Remove Mod
                                    </button>
                                ` : ''}
                                ${isMod() && user.email !== OWNER_EMAIL ? `
                                    ${!isBanned ? `
                                        <button onclick="banUser('${user.id}', '${user.email}')" class="action-btn" style="background: #dc2626; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; color: white; cursor: pointer; font-size: 0.875rem;">
                                            Ban
                                        </button>
                                    ` : `
                                        <button onclick="unbanUser('${user.id}')" class="action-btn" style="background: #10b981; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; color: white; cursor: pointer; font-size: 0.875rem;">
                                            Unban
                                        </button>
                                    `}
                                    ${!isMuted ? `
                                        <button onclick="muteUser('${user.id}')" class="action-btn" style="background: #6b7280; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; color: white; cursor: pointer; font-size: 0.875rem;">
                                            Mute
                                        </button>
                                    ` : `
                                        <button onclick="unmuteUser('${user.id}')" class="action-btn" style="background: #10b981; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; color: white; cursor: pointer; font-size: 0.875rem;">
                                            Unmute
                                        </button>
                                    `}
                                    <button onclick="awardPoints('${user.id}')" class="action-btn" style="background: #fbbf24; color: #000; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.875rem;">
                                        Award Points
                                    </button>
                                ` : ''}
                                ${isOwner() && user.email !== OWNER_EMAIL ? `
                                    <button onclick="giveBadge('${user.id}')" class="action-btn" style="background: #8b5cf6; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; color: white; cursor: pointer; font-size: 0.875rem;">
                                        Give Badge
                                    </button>
                                    ${user.badges && user.badges.length > 0 ? `
                                        <button onclick="removeBadge('${user.id}')" class="action-btn" style="background: #dc2626; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; color: white; cursor: pointer; font-size: 0.875rem;">
                                            Remove Badge
                                        </button>
                                    ` : ''}
                                    <button onclick="setUserTitle('${user.id}')" class="action-btn" style="background: #ec4899; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; color: white; cursor: pointer; font-size: 0.875rem;">
                                        Set Title
                                    </button>
                                ` : ''}
                                ${currentUser && currentUser.uid !== user.id ? `
                                    <button onclick="openDM('${user.id}')" class="action-btn" style="background: #8b5cf6; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; color: white; cursor: pointer; font-size: 0.875rem;">
                                        DM
                                    </button>
                                ` : ''}
                            </div>
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
    if (!input) return;
    
    const message = input.value.trim();
    
    if (!message) return;
    
    const participants = [currentUser.uid, selectedDMUser.id].sort();
    const conversationId = participants.join('_');
    
    try {
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
        
        // Scroll to bottom after sending
        setTimeout(() => {
            const messageContainer = document.getElementById('messagesContainer');
            if (messageContainer) {
                messageContainer.scrollTop = messageContainer.scrollHeight;
            }
        }, 100);
    } catch (error) {
        console.error('Error sending DM:', error);
        alert('Error sending message. Please try again.');
    }
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
                            <h3>${conv.userName || 'User'}</h3>
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
                    <h2>Chat with ${selectedDMUser.username || selectedDMUser.email || 'User'}</h2>
                </div>
                <div id="messagesContainer" style="max-height: 400px; overflow-y: auto; margin-bottom: 1rem; padding: 1rem; background: rgba(30, 41, 59, 0.3); border-radius: 0.5rem;">
                    ${messages.map(msg => `
                        <div style="margin-bottom: 1rem; text-align: ${msg.from === currentUser.uid ? 'right' : 'left'};">
                            <div style="display: inline-block; max-width: 70%; background: ${msg.from === currentUser.uid ? '#8b5cf6' : '#475569'}; padding: 0.75rem; border-radius: 1rem; text-align: left;">
                                <p style="font-size: 0.75rem; color: #d1d5db; margin-bottom: 0.25rem;">${msg.fromName || 'User'}</p>
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
        setTimeout(() => {
            const messageContainer = document.getElementById('messagesContainer');
            if (messageContainer) {
                messageContainer.scrollTop = messageContainer.scrollHeight;
            }
        }, 100);
        
        // Add enter key handler
        const dmInput = document.getElementById('dmInput');
        if (dmInput) {
            dmInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendDM();
                }
            });
            dmInput.focus();
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
                <div class="plinko-board-wrapper">
                    <canvas id="plinkoCanvas" width="400" height="500"></canvas>
                    <div id="plinkoResult" style="text-align: center; margin-top: 1rem; min-height: 3rem;"></div>
                </div>
                ${currentUser ? `
                    <button class="btn-plinko" onclick="playPlinko()" id="plinkoBtn">Drop Ball</button>
                ` : `
                    <p style="color: #9ca3af; text-align: center; margin-top: 1rem;">Login to play!</p>
                `}
            </div>
        </div>
    `;
    
    // Initialize Plinko board
    if (currentUser) {
        initPlinkoBoard();
    }
}

// Initialize Plinko Board
function initPlinkoBoard() {
    const canvas = document.getElementById('plinkoCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw pegs
    const rows = 10;
    const cols = 9;
    const pegRadius = 4;
    const startY = 50;
    const spacing = 40;
    
    ctx.fillStyle = '#a855f7';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#a855f7';
    
    for (let row = 0; row < rows; row++) {
        const numPegs = cols - (row % 2);
        const offsetX = (row % 2) * (spacing / 2);
        
        for (let col = 0; col < numPegs; col++) {
            const x = offsetX + (width / numPegs) * col + (width / numPegs / 2);
            const y = startY + row * spacing;
            
            ctx.beginPath();
            ctx.arc(x, y, pegRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw prize zones at bottom
    const zones = [10, 20, 50, 100, 50, 20, 10];
    const zoneWidth = width / zones.length;
    const zoneY = height - 40;
    
    ctx.shadowBlur = 0;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    
    zones.forEach((prize, i) => {
        const x = i * zoneWidth;
        const color = prize === 100 ? '#fbbf24' : prize >= 50 ? '#a855f7' : '#8b5cf6';
        
        ctx.fillStyle = color;
        ctx.fillRect(x, zoneY, zoneWidth - 2, 35);
        
        ctx.fillStyle = '#000';
        ctx.fillText(prize, x + zoneWidth / 2, zoneY + 22);
    });
}

// Play Plinko with animation
function playPlinko() {
    if (!currentUser) return;

    const canvas = document.getElementById('plinkoCanvas');
    const btn = document.getElementById('plinkoBtn');
    const resultDiv = document.getElementById('plinkoResult');
    
    if (!canvas || !btn) return;
    
    btn.disabled = true;
    btn.textContent = 'Dropping...';
    resultDiv.innerHTML = '';
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Ball properties
    let ballX = width / 2 + (Math.random() - 0.5) * 20; // Random start position
    let ballY = 20;
    const ballRadius = 8;
    let velocityY = 0;
    let velocityX = 0;
    const gravity = 0.5;
    const bounce = 0.6;
    
    // Peg positions
    const rows = 10;
    const cols = 9;
    const startY = 50;
    const spacing = 40;
    const pegRadius = 4;
    const pegs = [];
    
    for (let row = 0; row < rows; row++) {
        const numPegs = cols - (row % 2);
        const offsetX = (row % 2) * (spacing / 2);
        
        for (let col = 0; col < numPegs; col++) {
            const x = offsetX + (width / numPegs) * col + (width / numPegs / 2);
            const y = startY + row * spacing;
            pegs.push({ x, y });
        }
    }
    
    // Prize zones
    const zones = [10, 20, 50, 100, 50, 20, 10];
    const zoneWidth = width / zones.length;
    
    let lastCollision = 0;
    
    function animate() {
        // Redraw board
        initPlinkoBoard();
        
        // Update ball physics
        velocityY += gravity;
        ballY += velocityY;
        ballX += velocityX;
        
        // Apply air resistance
        velocityX *= 0.99;
        
        // Check collision with pegs
        const now = Date.now();
        pegs.forEach(peg => {
            const dx = ballX - peg.x;
            const dy = ballY - peg.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < ballRadius + pegRadius && now - lastCollision > 50) {
                lastCollision = now;
                
                // Calculate bounce angle
                const angle = Math.atan2(dy, dx);
                
                // Separate the ball from the peg
                const overlap = (ballRadius + pegRadius) - distance;
                ballX += Math.cos(angle) * overlap;
                ballY += Math.sin(angle) * overlap;
                
                // Bounce with randomness
                const bounceAngle = angle + (Math.random() - 0.5) * 0.5;
                const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY) * bounce;
                
                velocityX = Math.cos(bounceAngle) * speed * 1.2;
                velocityY = Math.abs(Math.sin(bounceAngle) * speed * 0.8);
                
                // Add random horizontal push
                velocityX += (Math.random() - 0.5) * 2;
            }
        });
        
        // Wall collision
        if (ballX - ballRadius < 0) {
            ballX = ballRadius;
            velocityX = Math.abs(velocityX) * bounce;
        }
        if (ballX + ballRadius > width) {
            ballX = width - ballRadius;
            velocityX = -Math.abs(velocityX) * bounce;
        }
        
        // Draw ball
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ec4899';
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Check if ball reached bottom
        if (ballY + ballRadius >= height - 45) {
            velocityY = 0;
            velocityX *= 0.9;
            ballY = height - 45 - ballRadius;
            
            // If ball has settled (very low velocity)
            if (Math.abs(velocityX) < 0.5 && Math.abs(velocityY) < 0.5) {
                // Calculate which zone
                const zoneIndex = Math.floor(ballX / zoneWidth);
                const reward = zones[Math.max(0, Math.min(zoneIndex, zones.length - 1))];
                
                // Show result
                resultDiv.innerHTML = `<div class="plinko-score">+${reward} Points!</div>`;
                
                // Update Firestore
                db.collection('leaderboard').doc(currentUser.uid).update({
                    points: firebase.firestore.FieldValue.increment(reward)
                }).catch(() => {
                    db.collection('leaderboard').doc(currentUser.uid).set({
                        username: currentUser.username || currentUser.email,
                        points: reward
                    });
                });

                db.collection('users').doc(currentUser.uid).update({
                    points: firebase.firestore.FieldValue.increment(reward)
                });
                
                // Re-enable button
                setTimeout(() => {
                    btn.disabled = false;
                    btn.textContent = 'Drop Ball';
                    resultDiv.innerHTML = '';
                }, 3000);
                return;
            }
        }
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// Initialize
createStars();
renderHeader();
renderView();
