// =========================
// app.js - Toasty Forums
// Firebase v8 compatible
// =========================

// ---------- CONFIG ----------
const firebaseConfig = {
  apiKey: "AIzaSyA1FwweYw4MOz5My0aCfbRv-xrduCTl8z0",
  authDomain: "toasty-89f07.firebaseapp.com",
  projectId: "toasty-89f07",
  storageBucket: "toasty-89f07.appspot.com",
  messagingSenderId: "743787667064",
  appId: "1:743787667064:web:12284120fbbdd1e907d78d"
};

// ---------- INIT ----------
if (!window.firebase) {
  alert("Firebase SDK not found. Make sure Firebase v8 scripts are included in HTML.");
  throw new Error("Firebase SDK not loaded");
}

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ---------- GLOBALS ----------
let currentUser = null;
let currentUsername = "";
let isOwner = false;
let isModerator = false;

// Owner email
const OWNER_EMAIL = "d29510713@gmail.com";

// ---------- STARTUP ----------
document.addEventListener("DOMContentLoaded", () => {
  console.log("App starting...");
  makeStars();
  setupImagePreview();
  setupProfileAvatarPreview();
  setupTabsAndWiring();
  auth.onAuthStateChanged(onAuthStateChanged);
});

// ---------- UI UTILITIES ----------
function $(id) { return document.getElementById(id); }
function show(id) { const e = $(id); if (e) e.classList.remove("hidden"); }
function hide(id) { const e = $(id); if (e) e.classList.add("hidden"); }
function setText(id, text) { const e = $(id); if (e) e.textContent = text; }

// escape html
function escapeHtml(s="") {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ---------- STARS ----------
function makeStars() {
  const stars = $("stars");
  if (!stars) return;
  for (let i = 0; i < 150; i++) {
    const s = document.createElement("div");
    s.className = "star";
    s.style.top = Math.random() * 100 + "%";
    s.style.left = Math.random() * 100 + "%";
    const sz = (Math.random() * 2 + 1).toFixed(2) + "px";
    s.style.width = sz;
    s.style.height = sz;
    stars.appendChild(s);
  }
}

// ---------- AUTH HANDLERS ----------
async function onAuthStateChanged(user) {
  if (user) {
    currentUser = user;
    await loadUserMeta(user);
    hide("box");
    show("forum");
    setText("currentUserBadge", `Signed in as ${currentUsername}${isOwner ? " (Owner)" : isModerator ? " (Mod)" : ""}`);
    await refreshUserDisplay();
    loadPosts();
    // pre-load some things
    loadUsers();
    loadLeaderboard();
    loadActivityLeaderboard();
  } else {
    currentUser = null;
    currentUsername = "";
    isOwner = false;
    isModerator = false;
    show("box");
    hide("forum");
    setText("currentUserBadge", "");
  }
}

// fetch user doc and set currentUsername/isModerator/isOwner
async function loadUserMeta(user) {
  try {
    const doc = await db.collection("users").doc(user.uid).get();
    if (!doc.exists) {
      // create baseline user doc if missing (shouldn't happen for registered users but guard)
      await db.collection("users").doc(user.uid).set({
        username: user.email.split("@")[0],
        email: user.email,
        joinDate: Date.now(),
        banned: false,
        moderator: false,
        coins: 0,
        activity: 0,
        comments: 0,
        posts: 0,
        lastDailyClaim: 0,
        bio: "",
        avatarUrl: "",
        color: ""
      });
      currentUsername = user.email.split("@")[0];
      isModerator = false;
      isOwner = (user.email === OWNER_EMAIL);
      return;
    }
    const data = doc.data();
    currentUsername = data.username || user.email.split("@")[0];
    isModerator = !!data.moderator;
    isOwner = (user.email === OWNER_EMAIL);
  } catch (e) {
    console.error("loadUserMeta error", e);
  }
}

// ---------- WIRING (tabs + buttons) ----------
function setupTabsAndWiring() {
  // tab map
  const map = {
    tabPosts: "postsSection",
    tabUsers: "usersSection",
    tabDMs: "dmsSection",
    tabUpdates: "updatesSection",
    tabSuggestions: "suggestionsSection",
    tabGames: "gamesSection",
    tabLeaderboard: "leaderboardSection",
    tabActivity: "activitySection",
    tabProfile: "profileSection"
  };

  Object.keys(map).forEach(tabId => {
    const btn = $(tabId);
    if (!btn) return;
    btn.onclick = () => {
      // activate visual tab
      document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      // hide sections
      document.querySelectorAll(".section").forEach(s => s.classList.add("hidden"));
      const sec = $(map[tabId]);
      if (sec) sec.classList.remove("hidden");

      // lazy load
      const id = map[tabId];
      if (id === "postsSection") loadPosts();
      if (id === "usersSection") loadUsers();
      if (id === "dmsSection") loadDMs();
      if (id === "updatesSection") loadUpdates();
      if (id === "suggestionsSection") loadSuggestions();
      if (id === "leaderboardSection") loadLeaderboard();
      if (id === "activitySection") loadActivityLeaderboard();
      if (id === "gamesSection") initPlinko();
      if (id === "profileSection") loadMyProfile();
    };
  });

  // auth buttons
  const tToRegister = $("toggleToRegister");
  const tToLogin = $("toggleToLogin");
  if (tToRegister) tToRegister.onclick = () => { hide("loginBox"); show("registerBox"); };
  if (tToLogin) tToLogin.onclick = () => { hide("registerBox"); show("loginBox"); };

  const rBtn = $("registerBtn");
  const lBtn = $("loginBtn");
  const logoutBtn = $("logoutBtn");
  const postBtn = $("postBtn");
  const dmBtn = $("dmBtn");
  const submitSuggestionBtn = $("submitSuggestionBtn");
  const claimDailyBtn = $("claimDailyBtn");
  const plinkoDropBtn = $("plinkoDropBtn");
  const createUpdateBtn = $("createUpdateBtn");
  const saveProfileBtn = $("saveProfileBtn");

  if (rBtn) rBtn.onclick = register;
  if (lBtn) lBtn.onclick = login;
  if (logoutBtn) logoutBtn.onclick = logout;
  if (postBtn) postBtn.onclick = createPost;
  if (dmBtn) dmBtn.onclick = sendDM;
  if (submitSuggestionBtn) submitSuggestionBtn.onclick = submitSuggestion;
  if (claimDailyBtn) claimDailyBtn.onclick = claimDailyCoins;
  if (plinkoDropBtn) plinkoDropBtn.onclick = playPlinko;
  if (createUpdateBtn) createUpdateBtn.onclick = createUpdate;
  if (saveProfileBtn) saveProfileBtn.onclick = saveProfile;
}

// ---------- AUTH FUNCTIONS ----------
async function register() {
  const email = $("regEmail").value.trim();
  const pass = $("regPass").value;
  const username = $("regUsername").value.trim();
  if (!email || !pass || !username) return alert("Fill all fields");

  try {
    // ensure username unique
    const q = await db.collection("users").where("username", "==", username).get();
    if (!q.empty) return alert("Username already taken");

    const uc = await auth.createUserWithEmailAndPassword(email, pass);
    const uid = uc.user.uid;
    await db.collection("users").doc(uid).set({
      username,
      email,
      joinDate: Date.now(),
      banned: false,
      moderator: false,
      coins: 0,
      activity: 0,
      comments: 0,
      posts: 0,
      lastDailyClaim: 0,
      bio: "",
      avatarUrl: "",
      color: ""
    });
    alert("Registered — you can log in now.");
    hide("registerBox");
    show("loginBox");
  } catch (e) {
    console.error("register err", e);
    alert("Registration failed: " + e.message);
  }
}

async function login() {
  const email = $("logEmail").value.trim();
  const pass = $("logPass").value;
  if (!email || !pass) return alert("Fill email & password");
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (e) {
    console.error("login err", e);
    alert("Login failed: " + e.message);
  }
}

async function logout() {
  try {
    await auth.signOut();
  } catch (e) {
    console.error("logout err", e);
    alert("Logout failed");
  }
}

// ---------- DAILY COINS ----------
async function claimDailyCoins() {
  if (!currentUser) return alert("Please login first");
  try {
    const ref = db.collection("users").doc(currentUser.uid);
    const doc = await ref.get();
    const data = doc.data() || {};
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if ((now - (data.lastDailyClaim || 0)) < oneDay) {
      const left = Math.ceil((oneDay - (now - (data.lastDailyClaim || 0)))/(60*60*1000));
      return alert(`Come back in ${left} hours`);
    }
    const newCoins = (data.coins || 0) + 50;
    await ref.update({ coins: newCoins, lastDailyClaim: now, activity: (data.activity || 0) + 5 });
    updateCoinDisplay(newCoins);
    alert("🎉 +50 coins");
  } catch (e) {
    console.error("claimDaily err", e);
    alert("Error claiming daily coins");
  }
}

async function refreshUserDisplay() {
  if (!currentUser) return;
  try {
    const doc = await db.collection("users").doc(currentUser.uid).get();
    const data = doc.data() || {};
    updateCoinDisplay(data.coins || 0);
  } catch (e) {
    console.error("refreshUserDisplay", e);
  }
}

// ---------- POSTS ----------
async function loadPosts() {
  const container = $("postsList");
  if (!container) return;
  container.innerHTML = "<p>Loading posts...</p>";
  try {
    const snap = await db.collection("posts").orderBy("timestamp", "desc").limit(50).get();
    container.innerHTML = "";
    if (snap.empty) { container.innerHTML = "<p>No posts yet.</p>"; return; }

    snap.forEach(doc => {
      const p = doc.data();
      const id = doc.id;
      const card = document.createElement("div");
      card.className = "postCard";
      const author = escapeHtml(p.author || "Unknown");
      const time = new Date(p.timestamp).toLocaleString();
      const category = escapeHtml(p.category || "General");
      const content = escapeHtml(p.content || "");
      const likes = p.likes || 0;
      const commentCount = p.commentCount || 0;

      card.innerHTML = `
        <div class="postHeader">
          <div><strong>${author}</strong> • <small>${time}</small> • <small style="opacity:.7">${category}</small></div>
          <div>
            ${ (isOwner || isModerator || (p.authorId === currentUser?.uid)) ? `<button onclick="deletePost('${id}')">Delete</button>` : "" }
          </div>
        </div>
        <div class="postContent">${content}</div>
        ${p.imageUrl ? `<img src="${p.imageUrl}" class="postImage" />` : ""}
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button onclick="likePost('${id}')">❤️ ${likes}</button>
          <button onclick="toggleComments('${id}')">💬 ${commentCount}</button>
        </div>
        <div id="comments-${id}" class="postCommentSection hidden"></div>
      `;
      container.appendChild(card);
    });
  } catch (e) {
    console.error("loadPosts", e);
    container.innerHTML = "<p style='color:salmon'>Error loading posts</p>";
  }
}

async function createPost() {
  if (!currentUser) return alert("Please login first");
  const content = $("postContent").value.trim();
  const category = $("postCategory").value || "General";
  const file = $("postImage").files && $("postImage").files[0];

  if (!content && !file) return alert("Write something or attach an image");

  try {
    let imageUrl = null;
    if (file) {
      const ref = storage.ref(`posts/${Date.now()}_${file.name}`);
      await ref.put(file);
      imageUrl = await ref.getDownloadURL();
    }

    const postRef = await db.collection("posts").add({
      author: currentUsername,
      authorId: currentUser.uid,
      content,
      imageUrl: imageUrl || null,
      category,
      timestamp: Date.now(),
      likes: 0,
      likedBy: [],
      commentCount: 0
    });

    // update user stat
    const uRef = db.collection("users").doc(currentUser.uid);
    const udoc = await uRef.get();
    const udata = udoc.data() || {};
    await uRef.update({
      coins: (udata.coins || 0) + 5,
      activity: (udata.activity || 0) + 10,
      posts: (udata.posts || 0) + 1
    });
    updateCoinDisplay((udata.coins || 0) + 5);

    $("postContent").value = "";
    $("postImage").value = "";
    hide("previewImage");
    alert("Posted! +5 coins, +10 activity");
    loadPosts();
  } catch (e) {
    console.error("createPost", e);
    alert("Error creating post: " + e.message);
  }
}

async function deletePost(postId) {
  if (!currentUser) return;
  if (!confirm("Delete post?")) return;
  try {
    await db.collection("posts").doc(postId).delete();
    loadPosts();
  } catch (e) {
    console.error("deletePost", e);
    alert("Delete failed");
  }
}

// ---------- LIKES ----------
async function likePost(postId) {
  if (!currentUser) return alert("Please login first");
  try {
    const ref = db.collection("posts").doc(postId);
    const doc = await ref.get();
    if (!doc.exists) return;
    const p = doc.data();
    const likedBy = p.likedBy || [];
    if (likedBy.includes(currentUser.uid)) {
      await ref.update({
        likes: (p.likes || 1) - 1,
        likedBy: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
      });
    } else {
      await ref.update({
        likes: (p.likes || 0) + 1,
        likedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
      });
      // award 1 coin to post author if not self
      if (p.authorId && p.authorId !== currentUser.uid) {
        const aRef = db.collection("users").doc(p.authorId);
        const aDoc = await aRef.get();
        if (aDoc.exists) await aRef.update({ coins: (aDoc.data().coins || 0) + 1 });
      }
    }
    loadPosts();
  } catch (e) {
    console.error("likePost", e);
    alert("Error liking post");
  }
}

// ---------- COMMENTS ----------
async function toggleComments(postId) {
  const el = $(`comments-${postId}`);
  if (!el) return;
  if (el.classList.contains("hidden")) {
    el.classList.remove("hidden");
    await loadComments(postId);
  } else {
    el.classList.add("hidden");
  }
}

async function loadComments(postId) {
  const container = $(`comments-${postId}`);
  if (!container) return;
  container.innerHTML = "<p>Loading comments...</p>";
  try {
    const snap = await db.collection("posts").doc(postId).collection("comments").orderBy("timestamp", "asc").get();
    container.innerHTML = "";
    if (snap.empty) container.innerHTML = "<p>No comments yet</p>";
    snap.forEach(doc => {
      const c = doc.data();
      const div = document.createElement("div");
      div.className = "commentCard";
      div.innerHTML = `<strong>${escapeHtml(c.author)}</strong> • <small>${new Date(c.timestamp).toLocaleString()}</small><div>${escapeHtml(c.content)}</div>`;
      container.appendChild(div);
    });

    // comment input
    const ta = document.createElement("textarea");
    ta.placeholder = "Write a comment...";
    const btn = document.createElement("button");
    btn.textContent = "Post Comment (+2 coins)";
    btn.onclick = () => addComment(postId, ta.value);
    container.appendChild(ta);
    container.appendChild(btn);
  } catch (e) {
    console.error("loadComments", e);
    container.innerHTML = "<p style='color:salmon'>Error loading comments</p>";
  }
}

async function addComment(postId, content) {
  if (!currentUser) return alert("Please login first");
  content = String(content || "").trim();
  if (!content) return alert("Write something first");

  try {
    const postRef = db.collection("posts").doc(postId);
    await postRef.collection("comments").add({
      author: currentUsername,
      authorId: currentUser.uid,
      content,
      timestamp: Date.now()
    });

    const postDoc = await postRef.get();
    await postRef.update({ commentCount: (postDoc.data().commentCount || 0) + 1 });

    const uRef = db.collection("users").doc(currentUser.uid);
    const uDoc = await uRef.get();
    const udata = uDoc.data() || {};
    await uRef.update({
      coins: (udata.coins || 0) + 2,
      comments: (udata.comments || 0) + 1,
      activity: (udata.activity || 0) + 1
    });
    updateCoinDisplay((udata.coins || 0) + 2);

    // refresh
    await loadComments(postId);
    loadPosts();
  } catch (e) {
    console.error("addComment", e);
    alert("Error adding comment");
  }
}

// ---------- USERS ----------
async function loadUsers() {
  const container = $("usersList");
  if (!container) return;
  container.innerHTML = "<p>Loading users...</p>";
  try {
    const snap = await db.collection("users").orderBy("coins", "desc").limit(100).get();
    container.innerHTML = "";
    if (snap.empty) container.innerHTML = "<p>No users</p>";
    snap.forEach(doc => {
      const u = doc.data();
      const d = document.createElement("div");
      d.className = "userCard";
      d.innerHTML = `
        ${u.avatarUrl ? `<img src="${u.avatarUrl}" class="userAvatar" />` : `<div class="userAvatar"></div>`}
        <div style="flex:1;">
          <strong>${escapeHtml(u.username)}</strong><br>
          <small>🪙 ${u.coins || 0} • 🔥 ${u.activity || 0}</small>
        </div>
        <div>
          ${u.moderator ? '<small style="color:#ff6b35">MOD</small>' : ''}
        </div>
      `;
      container.appendChild(d);
    });
  } catch (e) {
    console.error("loadUsers", e);
    container.innerHTML = "<p style='color:salmon'>Error loading users</p>";
  }
}

// ---------- DMS ----------
async function loadDMs() {
  const container = $("dmsList");
  if (!container) return;
  if (!currentUser) { container.innerHTML = "<p>Login to view DMs</p>"; return; }
  container.innerHTML = "<p>Loading DMs...</p>";
  try {
    const snap = await db.collection("dms").where("to", "==", currentUsername).orderBy("timestamp", "desc").limit(100).get();
    container.innerHTML = "";
    if (snap.empty) container.innerHTML = "<p>No messages</p>";
    snap.forEach(doc => {
      const m = doc.data();
      const div = document.createElement("div");
      div.className = "dmCard";
      div.innerHTML = `<div class="dmSender">From: ${escapeHtml(m.from)}</div><div>${escapeHtml(m.content)}</div><small>${new Date(m.timestamp).toLocaleString()}</small>`;
      container.appendChild(div);
    });
  } catch (e) {
    console.error("loadDMs", e);
    container.innerHTML = "<p style='color:salmon'>Error loading DMs</p>";
  }
}

async function sendDM() {
  if (!currentUser) return alert("Please login first");
  const to = $("dmToUsername").value.trim();
  const content = $("dmContent").value.trim();
  if (!to || !content) return alert("Fill fields");

  try {
    await db.collection("dms").add({
      from: currentUsername,
      to,
      content,
      timestamp: Date.now()
    });
    $("dmContent").value = "";
    alert("Message sent");
    loadDMs();
  } catch (e) {
    console.error("sendDM", e);
    alert("Error sending DM");
  }
}

// ---------- UPDATES (owner/mod) ----------
async function loadUpdates() {
  const container = $("updatesList");
  if (!container) return;
  container.innerHTML = "<p>Loading updates...</p>";
  try {
    const snap = await db.collection("updates").orderBy("timestamp", "desc").limit(50).get();
    container.innerHTML = "";
    if (snap.empty) container.innerHTML = "<p>No updates</p>";
    snap.forEach(doc => {
      const u = doc.data();
      const div = document.createElement("div");
      div.className = "updateCard " + (u.priority === "high" ? "updateHigh" : u.priority === "medium" ? "updateMedium" : "updateLow");
      div.innerHTML = `<strong>${escapeHtml(u.title)}</strong><div>${escapeHtml(u.content)}</div><small>${new Date(u.timestamp).toLocaleString()}</small>`;
      container.appendChild(div);
    });
    if (isOwner || isModerator) show("createUpdateArea"); else hide("createUpdateArea");
  } catch (e) {
    console.error("loadUpdates", e);
    container.innerHTML = "<p style='color:salmon'>Error loading updates</p>";
  }
}

async function createUpdate() {
  if (!currentUser) return alert("Please login first");
  if (!(isOwner || isModerator)) return alert("Only owner/moderators can post updates");
  const title = $("updateTitle").value.trim();
  const content = $("updateContent").value.trim();
  const priority = $("updatePriority").value || "low";
  if (!title || !content) return alert("Fill fields");
  try {
    await db.collection("updates").add({
      title, content, priority, timestamp: Date.now()
    });
    $("updateTitle").value = "";
    $("updateContent").value = "";
    loadUpdates();
    alert("Update published");
  } catch (e) {
    console.error("createUpdate", e);
    alert("Error creating update");
  }
}

// ---------- SUGGESTIONS ----------
async function loadSuggestions() {
  const container = $("suggestionsList");
  if (!container) return;
  container.innerHTML = "<p>Loading suggestions...</p>";
  try {
    const snap = await db.collection("suggestions").orderBy("votes", "desc").limit(50).get();
    container.innerHTML = "";
    if (snap.empty) container.innerHTML = "<p>No suggestions</p>";
    snap.forEach(doc => {
      const s = doc.data();
      const div = document.createElement("div");
      div.className = "suggestionCard";
      div.innerHTML = `<strong>${escapeHtml(s.title)}</strong><div>${escapeHtml(s.description)}</div><small>By: ${escapeHtml(s.author)} • Votes: ${s.votes || 0}</small>`;
      container.appendChild(div);
    });
  } catch (e) {
    console.error("loadSuggestions", e);
    container.innerHTML = "<p style='color:salmon'>Error loading suggestions</p>";
  }
}

async function submitSuggestion() {
  if (!currentUser) return alert("Please login first");
  const title = $("suggestionTitle").value.trim();
  const desc = $("suggestionDescription").value.trim();
  if (!title || !desc) return alert("Fill fields");
  try {
    await db.collection("suggestions").add({
      title, description: desc, author: currentUsername, votes: 0, timestamp: Date.now()
    });
    // reward user
    const uRef = db.collection("users").doc(currentUser.uid);
    const uDoc = await uRef.get();
    const ud = uDoc.data() || {};
    await uRef.update({ coins: (ud.coins || 0) + 10, activity: (ud.activity || 0) + 15 });
    updateCoinDisplay((ud.coins || 0) + 10);
    $("suggestionTitle").value = "";
    $("suggestionDescription").value = "";
    alert("Suggestion submitted! +10 coins");
    loadSuggestions();
  } catch (e) {
    console.error("submitSuggestion", e);
    alert("Error submitting suggestion");
  }
}

// ---------- LEADERBOARDS ----------
async function loadLeaderboard() {
  const container = $("leaderboardList");
  if (!container) return;
  container.innerHTML = "<p>Loading leaderboard...</p>";
  try {
    const snap = await db.collection("users").orderBy("coins", "desc").limit(10).get();
    container.innerHTML = "";
    let rank = 1;
    snap.forEach(doc => {
      const u = doc.data();
      const div = document.createElement("div");
      div.className = "leaderboardEntry";
      div.innerHTML = `<div>${rank}. <strong>${escapeHtml(u.username)}</strong></div><div>🪙 ${u.coins || 0}</div>`;
      container.appendChild(div);
      rank++;
    });
  } catch (e) {
    console.error("loadLeaderboard", e);
    container.innerHTML = "<p style='color:salmon'>Error loading leaderboard</p>";
  }
}

async function loadActivityLeaderboard() {
  const container = $("activityList");
  if (!container) return;
  container.innerHTML = "<p>Loading activity...</p>";
  try {
    const snap = await db.collection("users").orderBy("activity", "desc").limit(10).get();
    container.innerHTML = "";
    let rank = 1;
    snap.forEach(doc => {
      const u = doc.data();
      const div = document.createElement("div");
      div.className = "leaderboardEntry";
      div.innerHTML = `<div>${rank}. <strong>${escapeHtml(u.username)}</strong></div><div>🔥 ${u.activity || 0}</div>`;
      container.appendChild(div);
      rank++;
    });
  } catch (e) {
    console.error("loadActivityLeaderboard", e);
    container.innerHTML = "<p style='color:salmon'>Error loading activity leaderboard</p>";
  }
}

// ---------- PROFILE ----------
function setupProfileAvatarPreview() {
  const input = $("profileAvatar");
  const preview = $("profileAvatarPreview");
  if (!input || !preview) return;
  input.onchange = () => {
    const f = input.files[0];
    if (!f) { preview.classList.add("hidden"); return; }
    const r = new FileReader();
    r.onload = e => {
      preview.src = e.target.result;
      preview.classList.remove("hidden");
    };
    r.readAsDataURL(f);
  };
}

async function saveProfile() {
  if (!currentUser) return alert("Login first");
  const bio = $("profileBio").value.trim();
  const file = $("profileAvatar").files && $("profileAvatar").files[0];
  try {
    const uRef = db.collection("users").doc(currentUser.uid);
    const doc = await uRef.get();
    const data = doc.data() || {};
    let avatarUrl = data.avatarUrl || "";
    if (file) {
      const sref = storage.ref(`avatars/${currentUser.uid}_${Date.now()}_${file.name}`);
      await sref.put(file);
      avatarUrl = await sref.getDownloadURL();
    }
    await uRef.update({ bio, avatarUrl });
    alert("Profile saved");
    loadMyProfile();
    loadUsers();
  } catch (e) {
    console.error("saveProfile", e);
    alert("Error saving profile");
  }
}

async function loadMyProfile() {
  if (!currentUser) return;
  try {
    const doc = await db.collection("users").doc(currentUser.uid).get();
    if (!doc.exists) return;
    const d = doc.data();
    $("myProfileInfo").innerHTML = `
      <strong>${escapeHtml(d.username)}</strong><br>
      ${d.avatarUrl ? `<img src="${d.avatarUrl}" id="profileAvatarPreview" style="width:120px;height:120px;border-radius:10px;object-fit:cover;margin-top:8px;" />` : ""}
      <p>${escapeHtml(d.bio || "")}</p>
      <p>Joined: ${new Date(d.joinDate).toLocaleDateString()}</p>
      <p>🪙 ${d.coins || 0} • 🔥 ${d.activity || 0} • Posts: ${d.posts || 0} • Comments: ${d.comments || 0}</p>
    `;
  } catch (e) {
    console.error("loadMyProfile", e);
  }
}

// ---------- IMAGE PREVIEW (post) ----------
function setupImagePreview() {
  const input = $("postImage");
  const preview = $("previewImage");
  if (!input || !preview) return;
  input.onchange = function() {
    const f = this.files[0];
    if (!f) { preview.classList.add("hidden"); return; }
    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.style.maxWidth = "220px";
      preview.classList.remove("hidden");
    };
    reader.readAsDataURL(f);
  };
}

// ---------- PLINKO (visible ball, 1-100 random) ----------
let plinkoCanvas = null, plinkoCtx = null, plinkoBall = null, plinkoAnimating = false;

function initPlinko() {
  plinkoCanvas = $("plinkoCanvas");
  if (!plinkoCanvas) return;
  plinkoCtx = plinkoCanvas.getContext("2d");
  drawPlinkoBoard();
}

function drawPlinkoBoard() {
  if (!plinkoCtx) return;
  const W = plinkoCanvas.width, H = plinkoCanvas.height;
  plinkoCtx.clearRect(0,0,W,H);
  // pegs
  plinkoCtx.fillStyle = "#fff";
  for (let row = 1; row <= 10; row++) {
    const num = row + 1;
    for (let col = 0; col < num; col++) {
      const x = W/2 + (col - num/2 + 0.5)*35;
      const y = 40 + row*35;
      plinkoCtx.beginPath();
      plinkoCtx.arc(x,y,4,0,Math.PI*2);
      plinkoCtx.fill();
    }
  }
  // bottom zones
  const multipliers = [0.5,1,2,5,10,5,2,1,0.5];
  const zoneW = W / multipliers.length;
  plinkoCtx.font = "14px Arial";
  plinkoCtx.textAlign = "center";
  multipliers.forEach((m,i) => {
    plinkoCtx.fillStyle = (i === 4) ? "rgba(255,215,0,0.25)" : "rgba(255,255,255,0.05)";
    plinkoCtx.fillRect(i*zoneW, H - 40, zoneW, 40);
    plinkoCtx.fillStyle = "#ffd700";
    plinkoCtx.fillText(`${m}x`, i*zoneW + zoneW/2, H - 14);
  });
}

function animatePlinko() {
  if (!plinkoCtx || !plinkoBall) return;
  drawPlinkoBoard();
  plinkoBall.vy += plinkoBall.gravity;
  plinkoBall.y += plinkoBall.vy;
  plinkoBall.x += plinkoBall.vx;

  // collisions with pegs
  for (let row=1; row<=10; row++) {
    const num = row + 1;
    for (let col=0; col < num; col++) {
      const pegX = plinkoCanvas.width/2 + (col - num/2 + 0.5)*35;
      const pegY = 40 + row*35;
      const dx = plinkoBall.x - pegX;
      const dy = plinkoBall.y - pegY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < plinkoBall.radius + 4) {
        plinkoBall.vx = (Math.random() - 0.5) * 4;
        plinkoBall.vy = -Math.abs(plinkoBall.vy) * 0.4;
        plinkoBall.y = pegY + plinkoBall.radius + 4;
      }
    }
  }

  // bounds
  if (plinkoBall.x < plinkoBall.radius) { plinkoBall.x = plinkoBall.radius; plinkoBall.vx *= -0.5; }
  if (plinkoBall.x > plinkoCanvas.width - plinkoBall.radius) { plinkoBall.x = plinkoCanvas.width - plinkoBall.radius; plinkoBall.vx *= -0.5; }

  // draw ball
  plinkoCtx.fillStyle = "#ff6b35";
  plinkoCtx.beginPath();
  plinkoCtx.arc(plinkoBall.x, plinkoBall.y, plinkoBall.radius, 0, Math.PI*2);
  plinkoCtx.fill();

  // bottom reached?
  if (plinkoBall.y >= plinkoCanvas.height - 40) {
    plinkoAnimating = false;
    // award random 1-100 coins (per your choice)
    const award = Math.floor(Math.random() * 100) + 1;
    finalizePlinko(award);
    plinkoBall = null;
    return;
  }

  requestAnimationFrame(animatePlinko);
}

async function playPlinko() {
  if (!currentUser) return alert("Please login first");
  if (!plinkoCanvas) initPlinko();
  if (plinkoAnimating) return alert("Wait for current ball to finish");
  const bet = Math.max(10, parseInt($("plinkoBet").value) || 10);

  // check coins
  const uRef = db.collection("users").doc(currentUser.uid);
  const uDoc = await uRef.get();
  const udata = uDoc.data() || {};
  if ((udata.coins || 0) < bet) return alert("Not enough coins");

  // deduct bet
  await uRef.update({ coins: (udata.coins || 0) - bet });
  updateCoinDisplay((udata.coins || 0) - bet);

  plinkoAnimating = true;
  plinkoBall = { x: plinkoCanvas.width/2, y: 8, vx: 0, vy: 2, gravity: 0.3, radius: 7, bet };
  animatePlinko();
}

async function finalizePlinko(randomAward) {
  // randomAward is 1..100
  if (!currentUser) return;
  try {
    const uRef = db.collection("users").doc(currentUser.uid);
    const d = await uRef.get();
    const data = d.data() || {};
    // award random coins + also activity bump
    const newCoins = (data.coins || 0) + randomAward;
    await uRef.update({ coins: newCoins, activity: (data.activity || 0) + 5 });
    updateCoinDisplay(newCoins);
    $("plinkoResult").textContent = `You got ${randomAward} coins!`;
    alert(`🎉 You won ${randomAward} coins`);
  } catch (e) {
    console.error("finalizePlinko", e);
    alert("Error awarding plinko prize");
  }
}

// ---------- HELPERS ----------
function updateCoinDisplay(coins) {
  const el = $("coinDisplay");
  if (el) el.textContent = `🪙 ${coins} Coins`;
}

// ---------- UTIL (optionally used elsewhere) ----------
async function getUserByUsername(username) {
  const q = await db.collection("users").where("username", "==", username).limit(1).get();
  if (q.empty) return null;
  const doc = q.docs[0];
  return { id: doc.id, data: doc.data() };
}

// ---------- FOLLOW-UPS: DM sending, etc. ----------
async function sendDM() {
  if (!currentUser) return alert("Please login first");
  const to = $("dmToUsername").value.trim();
  const content = $("dmContent").value.trim();
  if (!to || !content) return alert("Fill fields");
  try {
    // check recipient exists
    const u = await getUserByUsername(to);
    if (!u) return alert("Recipient not found");
    await db.collection("dms").add({ from: currentUsername, to, content, timestamp: Date.now() });
    $("dmContent").value = "";
    alert("Message sent");
    loadDMs();
  } catch (e) {
    console.error("sendDM", e);
    alert("Error sending DM");
  }
}

// ---------- FINAL NOTES ----------
console.log("app.js loaded — Toasty Forums ready.");

