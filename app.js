// =========================== app.js ===========================
// Toasty Forum - Single-file frontend logic
// Works with the HTML you provided (Firebase v8 SDK loaded in page).
// ===================================================================

// ---------- Firebase config (v8 style) ----------
const firebaseConfig = {
  apiKey: "AIzaSyA1FwweYw4MOz5My0aCfbRv-xrduCTl8z0",
  authDomain: "toasty-89f07.firebaseapp.com",
  projectId: "toasty-89f07",
  storageBucket: "toasty-89f07.appspot.com",
  messagingSenderId: "743787667064",
  appId: "1:743787667064:web:12284120fbbdd1e907d78d"
};

if (!window.firebase) {
  console.error("Firebase SDK not loaded. Make sure firebase scripts are included in HTML.");
} else {
  // Prevent double init
  try { firebase.initializeApp(firebaseConfig); } catch(e) { /* already initialized */ }
}
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ---------- Utilities ----------
const $ = id => document.getElementById(id);
function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
function now(){ return Date.now(); }
function getTimeAgo(ts){
  if(!ts) return "unknown";
  const s = Math.floor((Date.now() - ts)/1000);
  if(s < 60) return `${s}s ago`;
  const m = Math.floor(s/60); if(m < 60) return `${m}m ago`;
  const h = Math.floor(m/60); if(h < 24) return `${h}h ago`;
  const d = Math.floor(h/24); if(d < 30) return `${d}d ago`;
  const mo = Math.floor(d/30); if(mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo/12)}y ago`;
}
function show(el){ if(el) el.classList.remove('hidden'); }
function hide(el){ if(el) el.classList.add('hidden'); }

// ---------- Global State ----------
let currentUser = null;
let currentUsername = "";
let isOwner = false;
let isModerator = false;
let presenceInterval = null;

// ---------- DOM wiring (defensive) ----------
const dom = {
  // auth
  registerForm: $('register-form'),
  registerEmail: $('register-email'),
  registerPassword: $('register-password'),
  registerUsername: $('register-username'),
  registerBtn: $('register-btn'),
  showLogin: $('show-login'),
  showRegister: $('show-register'),
  loginForm: $('login-form'),
  loginEmail: $('login-email'),
  loginPassword: $('login-password'),
  loginBtn: $('login-btn'),
  forgotPassword: $('forgot-password'),
  logoutBtn: $('logout-btn'),

  // containers
  authPanel: $('auth-panel'),
  forumContainer: $('forum-container'),

  // header actions - note we'll create coins display
  headerActions: document.querySelector('.header-actions'),

  // tabs & sections
  tabs: document.querySelectorAll('.tab-btn'),
  postsSection: $('posts-section'),
  usersSection: $('users-section'),
  messagesSection: $('messages-section'),
  updatesSection: $('updates-section'),
  suggestionsSection: $('suggestions-section'),
  leaderboardSection: $('leaderboard-section'),

  // posts
  categoryFilter: $('category-filter'),
  sortFilter: $('sort-filter'),
  searchPosts: $('search-posts'),
  postCategory: $('post-category'),
  postContent: $('post-content'),
  postImage: $('post-image'),
  submitPostBtn: $('submit-post-btn'),
  imagePreview: $('image-preview'),
  postsList: $('posts-list'),

  // users
  searchUsers: $('search-users'),
  usersList: $('users-list'),

  // messages (DM)
  dmRecipient: $('dm-recipient'),
  dmMessage: $('dm-message'),
  sendDmBtn: $('send-dm-btn'),
  messagesList: $('messages-list'),

  // updates (admin)
  adminControls: $('admin-controls'),
  updateTitle: $('update-title'),
  updateContent: $('update-content'),
  postUpdateBtn: $('post-update-btn'),
  clearForumBtn: $('clear-forum-btn'),
  updatesList: $('updates-list'),

  // suggestions
  suggestionTitle: $('suggestion-title'),
  suggestionDescription: $('suggestion-description'),
  submitSuggestionBtn: $('submit-suggestion-btn'),
  suggestionsList: $('suggestions-list'),

  // leaderboard
  leaderboardList: $('leaderboard-list'),

  // background stars
  starsContainer: $('stars')
};

// ---------- Helper: insert coins display into header ----------
function ensureCoinsDisplay(){
  if(!dom.headerActions) return null;
  if($('coins-display')) return $('coins-display');
  const span = document.createElement('span');
  span.id = 'coins-display';
  span.style.cssText = 'display:inline-block; margin-right:10px; font-weight:bold; color:#ffd700;';
  span.textContent = 'Coins: 0';
  dom.headerActions.insertBefore(span, dom.headerActions.firstChild);
  // small claim button
  const claimBtn = document.createElement('button');
  claimBtn.id = 'claim-daily-btn';
  claimBtn.className = 'btn-secondary';
  claimBtn.style.marginRight='8px';
  claimBtn.textContent = 'Claim Daily';
  claimBtn.onclick = claimDailyCoins;
  dom.headerActions.insertBefore(claimBtn, dom.headerActions.firstChild);
  return span;
}
const coinsDisplay = ensureCoinsDisplay();

// ---------- Stars background ----------
function generateStars(){
  const cont = dom.starsContainer;
  if(!cont) return;
  cont.innerHTML = '';
  for(let i=0;i<150;i++){
    const s = document.createElement('div');
    s.className = 'star';
    s.style.top = Math.random()*100 + "%";
    s.style.left = Math.random()*100 + "%";
    s.style.width = (Math.random()*2+1) + "px";
    s.style.height = (Math.random()*2+1) + "px";
    cont.appendChild(s);
  }
}
generateStars();

// ---------- Tab switching ----------
function activateTab(tabName){
  // remove active class from nav buttons
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabName);
  });
  // hide all tab-content
  document.querySelectorAll('.tab-content').forEach(s => {
    s.classList.toggle('active', s.id === `${tabName}-section`);
  });
  // lazy-load sections
  if(tabName === 'posts') loadPosts();
  if(tabName === 'users') loadUsers();
  if(tabName === 'messages') loadDMs();
  if(tabName === 'updates') loadUpdates();
  if(tabName === 'suggestions') loadSuggestions();
  if(tabName === 'leaderboard') loadLeaderboard();
  if(tabName === 'plinko') showPlinko();
}
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', ()=> activateTab(btn.dataset.tab));
});

// ---------- Inject Plinko tab + section (since HTML has no plinko) ----------
function injectPlinkoUI(){
  // create nav button
  const nav = document.querySelector('.tabs');
  if(!nav) return;
  // avoid double-insert
  if(document.querySelector('[data-tab="plinko"]')) return;
  const btn = document.createElement('button');
  btn.className = 'tab-btn';
  btn.dataset.tab = 'plinko';
  btn.textContent = '🎯 Plinko';
  btn.addEventListener('click', ()=> activateTab('plinko'));
  nav.appendChild(btn);

  // create section
  const sec = document.createElement('section');
  sec.id = 'plinko-section';
  sec.className = 'tab-content';
  sec.innerHTML = `
    <h2>🎯 Plinko</h2>
    <div style="display:flex; gap:8px; align-items:center; margin-bottom:10px;">
      <button id="plinko-drop-btn" class="btn-primary">Drop Ball</button>
      <button id="plinko-spawn-btn" class="btn-secondary">Spawn 5</button>
      <label style="margin-left:12px;">Speed: <input id="plinko-gravity" type="range" min="200" max="1200" value="800"></label>
      <span id="plinko-count" style="margin-left:12px; color:#888;">Balls: 0</span>
    </div>
    <div id="plinko-board-wrapper" style="width:100%; display:flex; justify-content:center;">
      <canvas id="plinko-canvas" width="900" height="520" style="background: linear-gradient(180deg, rgba(0,0,0,0.45), rgba(10,10,10,0.6)); border-radius:10px;"></canvas>
    </div>
    <p class="info-text">Click "Drop Ball" to drop a ball and watch it bounce off pegs. You can spawn multiple balls.</p>
  `;
  // append after posts section
  const container = $('forum-container') || document.body;
  container.appendChild(sec);
}
injectPlinkoUI();

// ---------- Auth UI wiring ----------
if(dom.showLogin) dom.showLogin.addEventListener('click', ()=>{ hide(dom.registerForm); show(dom.loginForm); });
if(dom.showRegister) dom.showRegister.addEventListener('click', ()=>{ show(dom.registerForm); hide(dom.loginForm); });

// Register
if(dom.registerBtn) dom.registerBtn.addEventListener('click', async ()=>{
  const email = (dom.registerEmail?.value||'').trim();
  const pass = dom.registerPassword?.value || '';
  const username = (dom.registerUsername?.value||'').trim();
  if(!email || !pass || !username) return alert("All fields required");
  if(pass.length < 6) return alert("Password must be at least 6 characters");
  try{
    // check username uniqueness
    const snap = await db.collection('users').where('username','==',username).get();
    if(!snap.empty) return alert("Username taken");
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    const colors = ['8a2be2', 'ff6b35', '00d4ff', 'ffd700', 'ff1493', '00ff00'];
    const color = colors[Math.floor(Math.random()*colors.length)];
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=${color}&color=fff&size=128&bold=true`;
    await db.collection('users').doc(cred.user.uid).set({
      username, email, joinDate: now(), banned:false, moderator:false, owner:false,
      avatar, status:'offline', customStatus:'', lastLogin: now(), coins:0, lastDaily:0
    });
    await cred.user.sendEmailVerification();
    await auth.signOut();
    alert("Account created. Please verify your email before logging in.");
    hide(dom.registerForm); show(dom.loginForm);
  }catch(e){ alert(e.message || e); }
});

// Login
if(dom.loginBtn) dom.loginBtn.addEventListener('click', async ()=>{
  const email = (dom.loginEmail?.value||'').trim();
  const pass = dom.loginPassword?.value || '';
  if(!email || !pass) return alert("Enter email and password");
  try{
    const cred = await auth.signInWithEmailAndPassword(email, pass);
    if(!cred.user.emailVerified){
      const ok = confirm("Your email is not verified. Continue anyway?");
      if(!ok){ await cred.user.sendEmailVerification(); alert("Verification email sent."); await auth.signOut(); return; }
    }
    // loginUser handled by onAuthStateChanged
  }catch(e){
    if(e.code === 'auth/user-not-found') alert("No account found with this email.");
    else if(e.code === 'auth/wrong-password') alert("Incorrect password.");
    else alert(e.message || e);
  }
});

// Forgot password
if(dom.forgotPassword) dom.forgotPassword.addEventListener('click', async ()=>{
  const email = (dom.loginEmail?.value||'').trim();
  if(!email) return alert("Enter your email in the login form to reset password");
  try{ await auth.sendPasswordResetEmail(email); alert("Password reset sent!"); } catch(e){ alert(e.message||e); }
});

// Logout
if(dom.logoutBtn) dom.logoutBtn.addEventListener('click', async ()=>{
  await auth.signOut();
  currentUser = null;
  currentUsername = "";
  isOwner = false;
  isModerator = false;
  if(presenceInterval) { clearInterval(presenceInterval); presenceInterval = null; }
  hide(dom.forumContainer); show(dom.authPanel);
});

// ---------- onAuthStateChanged ----------
auth.onAuthStateChanged(async user=>{
  if(user){
    currentUser = user;
    await onLogin(user);
  } else {
    currentUser = null;
    currentUsername = "";
    hide(dom.forumContainer); show(dom.authPanel);
  }
});

async function onLogin(user){
  try{
    // get or create user doc
    const docRef = db.collection('users').doc(user.uid);
    const doc = await docRef.get();
    if(!doc.exists){
      const defaultName = user.email.split('@')[0];
      await docRef.set({ username: defaultName, email: user.email, joinDate: now(), banned:false, moderator:false, owner:false, avatar:`https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=8a2be2&color=fff&size=128`, status:'online', lastLogin: now(), coins:0, lastDaily:0 });
    }
    const data = (await docRef.get()).data();
    if(data.banned){ alert("You are banned."); await auth.signOut(); return; }
    currentUsername = data.username;
    isModerator = data.moderator || false;
    // owner detection: site owner email
    isOwner = (user.email === "d29510713@gmail.com") || data.owner || false;
    // set online
    await docRef.update({ lastLogin: now(), status:'online', emailVerified: user.emailVerified });
    // presence heartbeat
    if(presenceInterval) clearInterval(presenceInterval);
    presenceInterval = setInterval(()=> { if(currentUser) db.collection('users').doc(currentUser.uid).update({ status:'online', lastSeen: now() }).catch(()=>{}); }, 60_000);
    hide(dom.authPanel); show(dom.forumContainer);
    if(isOwner || isModerator) show(dom.adminControls); else hide(dom.adminControls);
    updateCoinsUI();
    // initial loads
    loadPosts();
    loadUsers();
    loadSuggestions();
    loadUpdates();
    loadLeaderboard();
    // set up file preview for posts
    setupPostImagePreview();
  }catch(e){ console.error("onLogin error", e); }
}

// ---------- Posts: preview, create, load ----------
function setupPostImagePreview(){
  const input = dom.postImage;
  const img = dom.imagePreview;
  if(!input || !img) return;
  input.addEventListener('change', e=>{
    const f = e.target.files?.[0];
    if(!f){ img.classList.add('hidden'); img.src=''; return; }
    if(f.size > 5*1024*1024){ alert("Image must be under 5MB"); input.value=''; img.classList.add('hidden'); return; }
    if(!f.type.startsWith('image/')){ alert("Please upload an image file"); input.value=''; img.classList.add('hidden'); return; }
    const obj = URL.createObjectURL(f);
    img.src = obj; img.classList.remove('hidden');
    img.onload = ()=> URL.revokeObjectURL(obj);
  });
}

if(dom.submitPostBtn) dom.submitPostBtn.addEventListener('click', async ()=>{
  if(!currentUser) return alert("Log in first");
  const content = (dom.postContent?.value||'').trim();
  const category = dom.postCategory?.value || 'General';
  const file = dom.postImage?.files?.[0] || null;
  if(!content && !file) return alert("Write something or upload an image!");
  const btn = dom.submitPostBtn; btn.disabled = true; btn.textContent = "Uploading...";
  try{
    let imageUrl = null;
    if(file){
      // convert to base64 & upload to Imgur
      const reader = new FileReader();
      const base64 = await new Promise((res, rej)=>{
        reader.onloadend = ()=> res(reader.result.split(',')[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const resp = await fetch('https://api.imgur.com/3/upload', {
        method:'POST',
        headers: { 'Authorization': 'Client-ID 546c25a59c58ad7', 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, type: 'base64' })
      });
      const json = await resp.json();
      if(json.success && json.data && json.data.link) imageUrl = json.data.link;
      else throw new Error(json.data?.error?.message || "Image upload failed");
    }
    await db.collection('posts').add({
      content, category, imageUrl, author: currentUsername, authorId: currentUser.uid, timestamp: now(),
      likes:0, likedBy:[], comments:[], pinned:false, reported:false, bookmarkedBy:[]
    });
    dom.postContent.value = ''; if(dom.postImage) dom.postImage.value = ''; if(dom.imagePreview){ dom.imagePreview.classList.add('hidden'); dom.imagePreview.src=''; }
    alert("Post created!");
    loadPosts();
  }catch(e){ alert("Error creating post: "+(e.message||e)); console.error(e); }
  btn.disabled = false; btn.textContent = "📤 Post";
});

async function loadPosts(searchQuery = '', filterCategory = 'all', sortBy = 'newest'){
  const list = dom.postsList;
  if(!list) return;
  list.innerHTML = `<p class="loading-text">Loading posts...</p>`;
  try{
    const snap = await db.collection('posts').limit(200).get();
    // preload user cache
    const userIds = new Set();
    snap.forEach(d=> { const p = d.data(); if(p.authorId) userIds.add(p.authorId); });
    const userCache = {};
    for(const uid of userIds){
      try{ const ud = await db.collection('users').doc(uid).get(); if(ud.exists) userCache[uid]=ud.data(); } catch(e){ console.log("user fetch fail", uid); }
    }
    let posts = [];
    snap.forEach(doc=> {
      const p = doc.data(); p.id = doc.id;
      if(searchQuery && !(p.content||"").toLowerCase().includes(searchQuery.toLowerCase())) return;
      if(filterCategory && filterCategory !== 'all' && p.category !== filterCategory) return;
      posts.push(p);
    });
    if(sortBy === 'newest') posts.sort((a,b)=> (b.pinned?1:0)-(a.pinned?1:0) || b.timestamp - a.timestamp);
    else if(sortBy === 'popular') posts.sort((a,b)=> (b.pinned?1:0)-(a.pinned?1:0) || (b.likes || 0) - (a.likes || 0));
    else if(sortBy === 'discussed') posts.sort((a,b)=> (b.pinned?1:0)-(a.pinned?1:0) || ( (b.comments?.length||0) - (a.comments?.length||0) ));
    list.innerHTML = '';
    posts.forEach(post=>{
      const authorData = userCache[post.authorId] || {};
      const roleBadge = (authorData.email === "d29510713@gmail.com") ? '<span style="color:#ff6b35"> 👑 OWNER</span>' : (authorData.moderator ? '<span style="color:#00d4ff"> 🛡️ MOD</span>' : '');
      const postDiv = document.createElement('div');
      postDiv.className = 'post';
      postDiv.style.borderColor = post.pinned ? "rgba(255,215,0,0.4)" : (post.reported ? "rgba(255,0,0,0.3)" : "");
      postDiv.innerHTML = `
        <div class="post-header">
          <div><strong>${escapeHtml(post.author||'unknown')}</strong> ${roleBadge} - ${escapeHtml(post.category||'')}</div>
          <span class="post-time">${new Date(post.timestamp).toLocaleString()} (${getTimeAgo(post.timestamp)})</span>
        </div>
        ${post.content ? `<div class="post-content">${escapeHtml(post.content)}</div>` : ''}
        ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image" alt="Post image" loading="lazy" onclick="window.open('${post.imageUrl}','_blank')">` : ''}
        <div class="post-actions" style="font-size:12px;">
          <button data-id="${post.id}" class="like-btn">👍 ${post.likes||0}</button>
          <button data-id="${post.id}" class="comment-btn">💬 ${post.comments?.length||0}</button>
          ${(post.authorId === (currentUser?.uid) || isOwner || isModerator) ? `<button data-id="${post.id}" class="delete-btn">🗑️</button>` : ''}
          ${(post.authorId === (currentUser?.uid)) ? `<button data-id="${post.id}" class="edit-btn">✏️</button>` : ''}
        </div>
      `;
      list.appendChild(postDiv);
    });
    // attach event listeners
    list.querySelectorAll('.like-btn').forEach(b => b.addEventListener('click', ()=> likePost(b.dataset.id)));
    list.querySelectorAll('.comment-btn').forEach(b => b.addEventListener('click', ()=> commentPost(b.dataset.id)));
    list.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', ()=> deletePost(b.dataset.id)));
    list.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', ()=> editPost(b.dataset.id)));
    if(posts.length === 0) list.innerHTML = `<p class="loading-text">No posts found</p>`;
  }catch(e){ list.innerHTML = `<p style="color:red">Error loading posts</p>`; console.error(e); }
}

// Post actions
async function likePost(postId){
  if(!currentUser) return alert("Log in first");
  const ref = db.collection('posts').doc(postId);
  try{
    const doc = await ref.get();
    const data = doc.data();
    const likedBy = data.likedBy || [];
    if(likedBy.includes(currentUser.uid)){ // unlike
      await ref.update({ likedBy: likedBy.filter(u=>u!==currentUser.uid), likes: (likedBy.length - 1) });
    } else {
      likedBy.push(currentUser.uid);
      await ref.update({ likedBy, likes: likedBy.length });
    }
    loadPosts();
  }catch(e){ console.error(e); }
}
function commentPost(postId){
  const text = prompt("Write your comment:");
  if(!text) return;
  db.collection('posts').doc(postId).get().then(d=>{
    const p = d.data();
    const comments = p.comments || [];
    comments.push({ author: currentUsername, authorId: currentUser.uid, text, time: now() });
    d.ref.update({ comments }).then(()=> loadPosts());
  }).catch(e=>console.error(e));
}
async function deletePost(postId){
  if(!confirm("Delete this post?")) return;
  try{ await db.collection('posts').doc(postId).delete(); loadPosts(); } catch(e){ alert(e.message||e); }
}
async function editPost(postId){
  const newText = prompt("Edit post text:");
  if(newText === null) return;
  try{ await db.collection('posts').doc(postId).update({ content: newText, edited:true }); loadPosts(); } catch(e){ alert(e.message||e); }
}

// Filters / search wiring
if(dom.searchPosts) dom.searchPosts.addEventListener('input', e=> loadPosts(e.target.value, dom.categoryFilter?.value || 'all', dom.sortFilter?.value || 'newest'));
if(dom.categoryFilter) dom.categoryFilter.addEventListener('change', ()=> loadPosts(dom.searchPosts?.value||'', dom.categoryFilter.value, dom.sortFilter?.value||'newest'));
if(dom.sortFilter) dom.sortFilter.addEventListener('change', ()=> loadPosts(dom.searchPosts?.value||'', dom.categoryFilter?.value||'all', dom.sortFilter.value));

// ---------- Users ----------
async function loadUsers(searchQuery=''){
  const list = dom.usersList;
  if(!list) return;
  list.innerHTML = `<p class="loading-text">Loading users...</p>`;
  try{
    const snap = await db.collection('users').get();
    const online = []; const offline = [];
    snap.forEach(doc=>{
      const u = doc.data(); const id = doc.id;
      if(searchQuery && u.username && !u.username.toLowerCase().includes(searchQuery.toLowerCase())) return;
      const item = { userId:id, ...u };
      if(u.status === 'online') online.push(item); else offline.push(item);
    });
    list.innerHTML = '';
    if(online.length){
      const h = document.createElement('div'); h.style.cssText='color:#00d4ff;font-weight:bold;margin:10px 0'; h.textContent=`🟢 ONLINE — ${online.length}`; list.appendChild(h);
      online.forEach(u => renderUserItem(u, list));
    }
    if(offline.length){
      const h = document.createElement('div'); h.style.cssText='color:#888;font-weight:bold;margin:10px 0'; h.textContent=`⚫ OFFLINE — ${offline.length}`; list.appendChild(h);
      offline.forEach(u => renderUserItem(u, list));
    }
    if(!online.length && !offline.length) list.innerHTML = `<p class="loading-text">No users</p>`;
  }catch(e){ list.innerHTML = `<p style="color:red">Error loading users</p>`; console.error(e); }
}
function renderUserItem(user, container){
  const statusColor = user.status === 'online' ? '#00ff00' : '#888';
  const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=8a2be2&color=fff&size=64`;
  const isUserOwner = (user.email === "d29510713@gmail.com");
  const div = document.createElement('div');
  div.className = 'user-item';
  div.style.cssText = 'display:flex; align-items:center; gap:12px; background:rgba(0,0,0,0.45); border:2px solid rgba(138,43,226,0.15); border-radius:10px; padding:12px; margin:8px 0;';
  div.innerHTML = `
    <img src="${avatar}" style="width:48px;height:48px;border-radius:50%;border:2px solid ${statusColor}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=8a2be2&color=fff&size=64'">
    <div style="flex:1;">
      <div><span style="display:inline-block;width:10px;height:10px;background:${statusColor};border-radius:50%;margin-right:6px;"></span><strong style="color:#fff">${escapeHtml(user.username)}</strong>
      ${isUserOwner?'<span style="color:#ff6b35;"> 👑 OWNER</span>':''}
      ${user.moderator && !isUserOwner?'<span style="color:#00d4ff;"> 🛡️ MOD</span>':''}
      ${user.banned?'<span style="color:red;"> 🚫 BANNED</span>':''}
      ${user.userId === (currentUser?.uid) ? '<span style="color:#ffd700;"> (You)</span>' : ''}
      </div>
      ${user.customStatus ? `<div style="color:#888;font-size:13px;margin-top:3px;">${escapeHtml(user.customStatus)}</div>` : ''}
      <div style="color:#888;font-size:12px;margin-top:3px;">${user.status === 'online' ? 'Online' : user.lastSeen ? `Last seen ${getTimeAgo(user.lastSeen)}` : 'Offline'}</div>
    </div>
  `;
  // actions
  const actions = document.createElement('div'); actions.style.display='flex'; actions.style.gap='6px';
  if((isOwner || isModerator) && user.userId !== currentUser?.uid && !isUserOwner){
    if(isOwner && !user.moderator){ const b = document.createElement('button'); b.textContent='Make Mod'; b.onclick = ()=> makeModerator(user.userId, user.username); actions.appendChild(b); }
    if(isOwner && user.moderator){ const b = document.createElement('button'); b.textContent='Remove Mod'; b.onclick = ()=> removeModerator(user.userId, user.username); actions.appendChild(b); }
    if(!user.banned){ const b = document.createElement('button'); b.textContent='Ban'; b.onclick = ()=> banUser(user.userId, user.username); actions.appendChild(b); }
    else { const b = document.createElement('button'); b.textContent='Unban'; b.onclick = ()=> unbanUser(user.userId, user.username); actions.appendChild(b); }
  } else if(user.userId !== currentUser?.uid && !isUserOwner){
    const b = document.createElement('button'); b.textContent='💬 Message'; b.onclick = ()=> openDMWithUser(user.username); actions.appendChild(b);
  } else if(isUserOwner && user.userId !== currentUser?.uid){
    const span = document.createElement('span'); span.style.color='#888'; span.textContent = 'Cannot moderate owner'; actions.appendChild(span);
  }
  div.appendChild(actions);
  container.appendChild(div);
}

// moderation user actions
async function makeModerator(userId, username){
  if(!isOwner) return alert("Only owner can make moderators");
  if(!confirm(`Make ${username} a moderator?`)) return;
  try{ await db.collection('users').doc(userId).update({ moderator: true }); alert(`${username} is now a moderator`); loadUsers(); } catch(e){ alert(e.message||e); }
}
async function removeModerator(userId, username){
  if(!isOwner) return alert("Only owner can remove moderators");
  if(!confirm(`Remove ${username} as moderator?`)) return;
  try{ await db.collection('users').doc(userId).update({ moderator: false }); alert(`${username} is no longer a moderator`); loadUsers(); } catch(e){ alert(e.message||e); }
}
async function banUser(userId, username){
  const doc = await db.collection('users').doc(userId).get();
  if(doc.exists && doc.data().email === "d29510713@gmail.com") return alert("Cannot ban owner!");
  if(!confirm(`Ban ${username}?`)) return;
  try{ await db.collection('users').doc(userId).update({ banned: true }); alert(`${username} banned`); loadUsers(); } catch(e){ alert(e.message||e); }
}
async function unbanUser(userId, username){
  if(!confirm(`Unban ${username}?`)) return;
  try{ await db.collection('users').doc(userId).update({ banned: false, warnings: 0 }); alert(`${username} unbanned`); loadUsers(); } catch(e){ alert(e.message||e); }
}

// search users wiring
if(dom.searchUsers) dom.searchUsers.addEventListener('input', e => loadUsers(e.target.value));

// ---------- Suggestions ----------
if(dom.submitSuggestionBtn) dom.submitSuggestionBtn.addEventListener('click', async ()=>{
  if(!currentUser) return alert("Log in first");
  const t = (dom.suggestionTitle?.value||'').trim();
  const d = (dom.suggestionDescription?.value||'').trim();
  if(!t || !d) return alert("Fill in all fields");
  try{
    await db.collection('suggestions').add({ title: t, description: d, author: currentUsername, authorId: currentUser.uid, timestamp: now(), status:'pending', upvotes:0, upvotedBy:[] });
    dom.suggestionTitle.value=''; dom.suggestionDescription.value='';
    alert("Suggestion submitted!");
    loadSuggestions();
  }catch(e){ alert(e.message||e); }
});
async function loadSuggestions(){
  const list = dom.suggestionsList;
  if(!list) return;
  list.innerHTML = `<p class="loading-text">Loading suggestions...</p>`;
  try{
    const snap = await db.collection('suggestions').get();
    const arr = []; snap.forEach(doc=> arr.push({ id: doc.id, ...doc.data() }));
    arr.sort((a,b)=>{
      if(a.status === 'pending' && b.status !== 'pending') return -1;
      if(a.status !== 'pending' && b.status === 'pending') return 1;
      return (b.upvotes||0) - (a.upvotes||0);
    });
    list.innerHTML = '';
    arr.forEach(sug=>{
      const div = document.createElement('div'); div.className = 'post';
      const statusColor = sug.status === 'approved' ? '#00d4ff' : (sug.status === 'implemented' ? '#00ff00' : (sug.status === 'rejected' ? '#ff0000' : '#888'));
      const userUpvoted = sug.upvotedBy && sug.upvotedBy.includes(currentUser?.uid);
      div.innerHTML = `
        <div class="post-header"><div><strong>${escapeHtml(sug.author)}</strong><span style="color:${statusColor};font-weight:bold;margin-left:10px;">${(sug.status||'pending').toUpperCase()}</span></div><span class="post-time">${new Date(sug.timestamp).toLocaleString()}</span></div>
        <div class="post-content"><strong>${escapeHtml(sug.title)}</strong></div>
        <div class="post-content">${escapeHtml(sug.description)}</div>
        <div class="post-actions">
          <button class="upvote-btn">${userUpvoted ? '✔️ ' : ''}👍 ${sug.upvotes||0}</button>
          ${(isOwner || isModerator) ? `<button class="approve-btn">✅ Approve</button><button class="impl-btn">🎉 Implement</button><button class="rej-btn">❌ Reject</button><button class="del-btn">🗑️</button>` : ''}
        </div>
      `;
      list.appendChild(div);
      div.querySelector('.upvote-btn').addEventListener('click', ()=> upvoteSuggestion(sug.id));
      if(isOwner || isModerator){
        if(div.querySelector('.approve-btn')) div.querySelector('.approve-btn').addEventListener('click', ()=> updateSuggestionStatus(sug.id,'approved'));
        if(div.querySelector('.impl-btn')) div.querySelector('.impl-btn').addEventListener('click', ()=> updateSuggestionStatus(sug.id,'implemented'));
        if(div.querySelector('.rej-btn')) div.querySelector('.rej-btn').addEventListener('click', ()=> updateSuggestionStatus(sug.id,'rejected'));
        if(div.querySelector('.del-btn')) div.querySelector('.del-btn').addEventListener('click', ()=> deleteSuggestion(sug.id));
      }
    });
    if(arr.length === 0) list.innerHTML = `<p class="loading-text">No suggestions yet</p>`;
  }catch(e){ list.innerHTML = `<p style="color:red">Error loading suggestions</p>`; console.error(e); }
}

async function upvoteSuggestion(id){
  if(!currentUser) return alert("Log in first");
  const ref = db.collection('suggestions').doc(id);
  const doc = await ref.get(); const s = doc.data();
  let up = s.upvotedBy || []; let count = s.upvotes || 0;
  if(up.includes(currentUser.uid)){ up = up.filter(u=>u!==currentUser.uid); count--; } else { up.push(currentUser.uid); count++; }
  await ref.update({ upvotedBy: up, upvotes: count }); loadSuggestions();
}
async function updateSuggestionStatus(id, status){ await db.collection('suggestions').doc(id).update({ status }); loadSuggestions(); }
async function deleteSuggestion(id){ if(!confirm("Delete suggestion?")) return; await db.collection('suggestions').doc(id).delete(); loadSuggestions(); }

// ---------- Updates (admin) ----------
if(dom.postUpdateBtn) dom.postUpdateBtn.addEventListener('click', async ()=>{
  if(!isOwner && !isModerator) return alert("Admin only");
  const t = (dom.updateTitle?.value||'').trim(); const c = (dom.updateContent?.value||'').trim();
  if(!t || !c) return alert("Fill title and content");
  try{ await db.collection('updates').add({ title: t, text: c, timestamp: now() }); dom.updateTitle.value=''; dom.updateContent.value=''; loadUpdates(); alert("Update posted"); } catch(e){ alert(e.message||e); }
});
if(dom.clearForumBtn) dom.clearForumBtn.addEventListener('click', async ()=>{ if(!isOwner) return alert("Owner only"); if(!confirm("Clear all posts?")) return; const snap = await db.collection('posts').get(); const batch = db.batch(); snap.forEach(d=> batch.delete(d.ref)); await batch.commit(); alert("Forum cleared"); loadPosts(); });

// load updates
async function loadUpdates(){
  const list = dom.updatesList;
  if(!list) return;
  list.innerHTML = `<p class="loading-text">Loading updates...</p>`;
  try{
    const snap = await db.collection('updates').orderBy('timestamp','desc').get();
    list.innerHTML = '';
    snap.forEach(doc=>{
      const u = doc.data();
      const div = document.createElement('div'); div.className = 'update';
      div.innerHTML = `<h4>${escapeHtml(u.title)}</h4><p>${escapeHtml(u.text)}</p><small>${new Date(u.timestamp).toLocaleString()}</small>`;
      list.appendChild(div);
    });
    if(list.innerHTML === '') list.innerHTML = `<p class="info-text">No updates yet</p>`;
  }catch(e){ list.innerHTML = `<p style="color:red">Error loading updates</p>`; console.error(e); }
}

// ---------- Leaderboard ----------
async function loadLeaderboard(){
  const list = dom.leaderboardList; if(!list) return;
  list.innerHTML = `<p class="loading-text">Loading leaderboard...</p>`;
  try{
    const snap = await db.collection('users').orderBy('coins','desc').limit(20).get();
    list.innerHTML = '';
    snap.forEach(doc=>{
      const u = doc.data();
      const div = document.createElement('div'); div.className='lb-item';
      div.innerHTML = `<strong>${escapeHtml(u.username)}</strong> — ${u.coins||0} coins`;
      list.appendChild(div);
    });
  }catch(e){ list.innerHTML = `<p style="color:red">Error loading leaderboard</p>`; console.error(e); }
}

// ---------- DMs (simple) ----------
if(dom.sendDmBtn) dom.sendDmBtn.addEventListener('click', async ()=>{
  if(!currentUser) return alert("Log in first");
  const toUsername = (dom.dmRecipient?.value||'').trim();
  const text = (dom.dmMessage?.value||'').trim();
  if(!toUsername || !text) return alert("Enter recipient and message");
  try{
    // find recipient
    const snap = await db.collection('users').where('username','==',toUsername).limit(1).get();
    if(snap.empty) return alert("User not found");
    const to = snap.docs[0];
    const toId = to.id;
    // find existing DM between the two
    const existing = await db.collection('dms').where('participants','array-contains', currentUser.uid).get();
    let convoDoc = null;
    existing.forEach(doc=>{
      const data = doc.data();
      if(Array.isArray(data.participants) && data.participants.includes(toId) && data.participants.includes(currentUser.uid)) convoDoc = { id: doc.id, data };
    });
    if(!convoDoc){
      // create new convo
      const msg = { senderId: currentUser.uid, senderName: currentUsername, text, time: now() };
      const res = await db.collection('dms').add({ participants: [currentUser.uid, toId], participantsMeta: [{ id: currentUser.uid, name: currentUsername }, { id: toId, name: to.data().username }], messages: [msg], lastUpdated: now(), lastMessage: text });
      alert("Message sent!");
    } else {
      const ref = db.collection('dms').doc(convoDoc.id);
      await ref.update({ messages: firebase.firestore.FieldValue.arrayUnion({ senderId: currentUser.uid, senderName: currentUsername, text, time: now() }), lastUpdated: now(), lastMessage: text });
      alert("Message sent!");
    }
    dom.dmMessage.value='';
    loadDMs();
  }catch(e){ alert(e.message||e); }
});

async function loadDMs(){
  const list = dom.messagesList;
  if(!list) return;
  if(!currentUser){ list.innerHTML = `<p class="info-text">Log in to use DMs</p>`; return; }
  list.innerHTML = `<p class="loading-text">Loading DMs...</p>`;
  try{
    const snap = await db.collection('dms').where('participants','array-contains', currentUser.uid).orderBy('lastUpdated','desc').get();
    list.innerHTML = '';
    snap.forEach(doc=>{
      const c = doc.data();
      const other = c.participantsMeta?.find(p=>p.id !== currentUser.uid) || { name: c.name || 'Chat' };
      const div = document.createElement('div'); div.className='dm-item';
      div.innerHTML = `<strong>${escapeHtml(other.name)}</strong> - ${c.lastMessage ? escapeHtml(c.lastMessage).slice(0,80) : 'No messages yet'} <small>${c.lastUpdated ? getTimeAgo(c.lastUpdated) : ''}</small>`;
      div.onclick = ()=> openDMWindow(doc.id);
      list.appendChild(div);
    });
    if(list.innerHTML === '') list.innerHTML = `<p class="info-text">No DMs yet</p>`;
  }catch(e){ list.innerHTML = `<p style="color:red">Error loading DMs</p>`; console.error(e); }
}

async function openDMWindow(dmId){
  // Simple: fetch convo and show alert with messages (you can expand into a modal)
  try{
    const doc = await db.collection('dms').doc(dmId).get();
    const c = doc.data();
    const msgs = c.messages || [];
    const out = msgs.map(m => `${m.senderName}: ${m.text}`).join('\n\n');
    alert(`Conversation:\n\n${out || '(no messages)'}`);
  }catch(e){ alert(e.message||e); }
}

// ---------- Daily coins ----------
async function updateCoinsUI(){
  const span = $('coins-display');
  if(!span) return;
  if(!currentUser) { span.textContent = 'Coins: 0'; return; }
  try{
    const doc = await db.collection('users').doc(currentUser.uid).get();
    const coins = doc.exists ? (doc.data().coins || 0) : 0;
    span.textContent = `Coins: ${coins}`;
  }catch(e){ console.error(e); }
}
async function claimDailyCoins(){
  if(!currentUser) return alert("Log in first");
  try{
    const ref = db.collection('users').doc(currentUser.uid);
    const doc = await ref.get(); const d = doc.data();
    const last = d.lastDaily || 0; const oneDay = 24*60*60*1000;
    if(now() - last < oneDay) return alert("Daily already claimed");
    await ref.update({ coins: (d.coins||0) + 100, lastDaily: now() });
    alert("You received 100 coins!");
    updateCoinsUI();
    loadLeaderboard();
  }catch(e){ alert(e.message||e); }
}

// ---------- Plinko implementation ----------
let Plinko = (function(){
  const canvas = $('plinko-canvas');
  if(!canvas) return null;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pegs = [];
  const balls = [];
  let gravity = 800; // px/s^2 (adjustable)
  const pegRadius = 6;
  const ballRadius = 10;
  const ballRestitution = 0.6;
  const friction = 0.998; // per frame damping

  function buildPegs(){
    pegs.length = 0;
    const cols = 13;
    const spacingX = Math.floor(W / (cols+1));
    const startY = 80;
    for(let row=0; row<8; row++){
      const offset = (row % 2 === 0) ? spacingX/2 : 0;
      for(let col=0; col<cols; col++){
        const x = Math.floor((col+1)*spacingX + offset);
        const y = startY + row * 55;
        pegs.push({ x, y, r: pegRadius });
      }
    }
  }

  function spawnBall(x){
    balls.push({
      x: x || W/2 + (Math.random()*100 - 50),
      y: 20,
      vx: (Math.random()*80 - 40),
      vy: 0,
      r: ballRadius,
      settled: false
    });
    updateBallCounter();
  }

  function updateBallCounter(){ const el = $('plinko-count'); if(el) el.textContent = `Balls: ${balls.length}`; }

  function step(dt){
    // dt in seconds
    balls.forEach(b=>{
      if(b.settled) return;
      b.vy += gravity * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      // walls
      if(b.x - b.r < 0){ b.x = b.r; b.vx = -b.vx * ballRestitution; b.vx *= 0.75; }
      if(b.x + b.r > W){ b.x = W - b.r; b.vx = -b.vx * ballRestitution; b.vx *= 0.75; }
      // floor (y)
      if(b.y + b.r > H - 20){
        b.y = H - 20 - b.r;
        b.vy = -b.vy * ballRestitution;
        b.vx *= 0.98;
        if(Math.abs(b.vy) < 20) { b.vy = 0; b.vx *= 0.9; b.settled = true; }
      }
      // pegs collisions
      for(const p of pegs){
        const dx = b.x - p.x, dy = b.y - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const minDist = b.r + p.r;
        if(dist < minDist && dist > 0){
          // push ball out
          const nx = dx / dist, ny = dy / dist;
          const overlap = minDist - dist;
          b.x += nx * overlap;
          b.y += ny * overlap;
          // reflect velocity
          const vDotN = b.vx*nx + b.vy*ny;
          b.vx = b.vx - 2 * vDotN * nx;
          b.vy = b.vy - 2 * vDotN * ny;
          b.vx *= ballRestitution;
          b.vy *= ballRestitution;
          // small randomness
          b.vx += (Math.random()*30 - 15);
        }
      }
      // damping
      b.vx *= friction;
      b.vy *= friction;
    });
  }

  function render(){
    ctx.clearRect(0,0,W,H);
    // bottom bins
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0,H-20,W,20);
    // pegs
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    pegs.forEach(p=>{
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    });
    // balls
    balls.forEach(b=>{
      ctx.beginPath(); ctx.fillStyle = '#ff6b35'; ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1; ctx.stroke();
    });
  }

  // animation loop
  let last = performance.now();
  function loop(t){
    const dt = Math.min(0.04, (t - last)/1000);
    last = t;
    // update gravity from slider
    const slider = $('plinko-gravity'); if(slider) gravity = Number(slider.value);
    step(dt);
    render();
    requestAnimationFrame(loop);
  }

  // public init
  function init(){
    buildPegs();
    updateBallCounter();
    // wire buttons
    const dropBtn = $('plinko-drop-btn'); if(dropBtn) dropBtn.onclick = ()=> spawnBall();
    const spawnBtn = $('plinko-spawn-btn'); if(spawnBtn) spawnBtn.onclick = ()=> { for(let i=0;i<5;i++) spawnBall(W/2 + (Math.random()*200-100)); };
    // start loop
    requestAnimationFrame(loop);
  }

  return { init, spawnBall };
})();

function showPlinko(){
  // ensure canvas exists and init plinko
  const canvas = $('plinko-canvas');
  if(!canvas) {
    // attempt to inject UI then init
    injectPlinkoUI();
  }
  setTimeout(()=> { // small delay to ensure DOM added
    if(Plinko && Plinko.init) Plinko.init();
  }, 50);
}

// ---------- startup loads ----------
function initialLoads(){
  // load posts initially
  loadPosts();
  loadUsers();
  loadSuggestions();
  loadUpdates();
  loadLeaderboard();
  loadDMs();
}
initialLoads();

// ---------- Final: update coins on start periodically ----------
setInterval(()=> { if(currentUser) updateCoinsUI(); }, 30_000);
updateCoinsUI();

// ===================================================================
// End of app.js
// ===================================================================
