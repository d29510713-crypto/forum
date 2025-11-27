// =================== CONFIG & INIT ===================
/* Paste your Firebase v8 config here (kept same as earlier) */
const firebaseConfig = {
  apiKey: "AIzaSyA1FwweYw4MOz5My0aCfbRv-xrduCTl8z0",
  authDomain: "toasty-89f07.firebaseapp.com",
  projectId: "toasty-89f07",
  storageBucket: "toasty-89f07.appspot.com",
  messagingSenderId: "743787667064",
  appId: "1:743787667064:web:12284120fbbdd1e907d78d"
};

if (!window.firebase) {
  alert("Firebase not loaded. Check script tags.");
  throw new Error("Firebase not loaded");
}

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ================= GLOBALS =================
let currentUser = null;
let currentUsername = "";
let isOwner = false;
let isModerator = false;

// ================= STARTUP (stars + image preview + tabs) =================
document.addEventListener("DOMContentLoaded", () => {
  makeStars();
  setupImagePreview();
  setupProfileAvatarPreview();
  setupTabs();
  wireUIButtons();
  auth.onAuthStateChanged(handleAuthStateChanged);
});

// ---------------- Stars ----------------
function makeStars() {
  const stars = document.getElementById("stars");
  if (!stars) return;
  for (let i = 0; i < 150; i++) {
    const s = document.createElement("div");
    s.className = "star";
    s.style.top = Math.random() * 100 + "%";
    s.style.left = Math.random() * 100 + "%";
    const size = Math.random() * 2 + 1;
    s.style.width = size + "px";
    s.style.height = size + "px";
    stars.appendChild(s);
  }
}

// ---------------- Tabs ----------------
function setupTabs() {
  const mapping = {
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

  Object.keys(mapping).forEach(tabId => {
    const btn = document.getElementById(tabId);
    if (!btn) return;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".section").forEach(s => s.classList.add("hidden"));
      const sec = document.getElementById(mapping[tabId]);
      if (sec) sec.classList.remove("hidden");

      // lazy-load things
      if (mapping[tabId] === "postsSection") loadPosts();
      if (mapping[tabId] === "usersSection") loadUsers();
      if (mapping[tabId] === "dmsSection") loadDMs();
      if (mapping[tabId] === "updatesSection") loadUpdates();
      if (mapping[tabId] === "suggestionsSection") loadSuggestions();
      if (mapping[tabId] === "leaderboardSection") loadLeaderboard();
      if (mapping[tabId] === "activitySection") loadActivityLeaderboard();
      if (mapping[tabId] === "gamesSection") initPlinko();
      if (mapping[tabId] === "profileSection") loadMyProfile();
    });
  });
}

// ---------------- Wire basic UI buttons ----------------
function wireUIButtons() {
  document.getElementById("toggleToRegister").onclick = () => {
    document.getElementById("loginBox").classList.add("hidden");
    document.getElementById("registerBox").classList.remove("hidden");
  };
  document.getElementById("toggleToLogin").onclick = () => {
    document.getElementById("registerBox").classList.add("hidden");
    document.getElementById("loginBox").classList.remove("hidden");
  };

  document.getElementById("registerBtn").onclick = register;
  document.getElementById("loginBtn").onclick = login;
  document.getElementById("logoutBtn").onclick = logout;
  document.getElementById("postBtn").onclick = createPost;
  document.getElementById("dmBtn").onclick = sendDM;
  document.getElementById("submitSuggestionBtn").onclick = submitSuggestion;
  document.getElementById("claimDailyBtn").onclick = claimDailyCoins;
  document.getElementById("plinkoDropBtn").onclick = playPlinko;
  document.getElementById("saveProfileBtn").onclick = saveProfile;
}

// ================= AUTH HANDLERS =================
async function handleAuthStateChanged(u) {
  if (u) {
    currentUser = u;
    await loadUserMeta(u);
    document.getElementById("box").classList.add("hidden");
    document.getElementById("forum").classList.remove("hidden");
    updateCoinDisplay((await getUserDoc(u.uid)).coins || 0);
    loadPosts();
    loadUsers();
    initPlinko();
  } else {
    currentUser = null;
    currentUsername = "";
    isOwner = false;
    isModerator = false;
    document.getElementById("forum").classList.add("hidden");
    document.getElementById("box").classList.remove("hidden");
  }
}

async function loadUserMeta(user) {
  try {
    const doc = await db.collection("users").doc(user.uid).get();
    if (!doc.exists) return;
    const data = doc.data();
    currentUsername = data.username || user.email.split("@")[0];
    isModerator = !!data.moderator;
    isOwner = (user.email === "d29510713@gmail.com");
  } catch (e) {
    console.error("loadUserMeta:", e);
  }
}

async function getUserDoc(uid) {
  const ref = db.collection("users").doc(uid);
  const doc = await ref.get();
  return doc.exists ? doc.data() : {};
}

// ---------------- Register ----------------
async function register() {
  const email = document.getElementById("regEmail").value.trim();
  const pass = document.getElementById("regPass").value;
  const username = document.getElementById("regUsername").value.trim();

  if (!email || !pass || !username) return alert("All fields required");

  try {
    // ensure username unique
    const q = await db.collection("users").where("username", "==", username).get();
    if (!q.empty) return alert("Username taken");

    const userCred = await auth.createUserWithEmailAndPassword(email, pass);
    const uid = userCred.user.uid;

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
      avatarUrl: ""
    });

    alert("Registered! You can log in now.");
    document.getElementById("registerBox").classList.add("hidden");
    document.getElementById("loginBox").classList.remove("hidden");
  } catch (e) {
    console.error("register:", e);
    alert("Registration failed: " + e.message);
  }
}

// ---------------- Login ----------------
async function login() {
  const email = document.getElementById("logEmail").value.trim();
  const pass = document.getElementById("logPass").value;
  if (!email || !pass) return alert("Enter email and password");
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (e) {
    console.error("login:", e);
    alert("Login failed: " + e.message);
  }
}

// ---------------- Logout ----------------
async function logout() {
  try {
    await auth.signOut();
  } catch (e) {
    console.error("logout:", e);
    alert("Logout failed: " + e.message);
  }
}

// ================= COIN / DAILY =================
async function claimDailyCoins() {
  if (!currentUser) return alert("Please login first");
  try {
    const userRef = db.collection("users").doc(currentUser.uid);
    const userDoc = await userRef.get();
    const data = userDoc.data();
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if ((now - (data.lastDailyClaim || 0)) < oneDay) {
      const left = Math.ceil((oneDay - (now - (data.lastDailyClaim || 0))) / (60 * 60 * 1000));
      return alert(`Come back in ${left} hours`);
    }

    const newCoins = (data.coins || 0) + 50;
    await userRef.update({ coins: newCoins, lastDailyClaim: now, activity: (data.activity || 0) + 5 });
    updateCoinDisplay(newCoins);
    alert("🎉 +50 coins");
  } catch (e) {
    console.error("claimDailyCoins:", e);
    alert("Error: " + e.message);
  }
}

function updateCoinDisplay(coins) {
  const el = document.getElementById("coinDisplay");
  if (el) el.textContent = `🪙 ${coins} Coins`;
}

// ================= POSTS =================
async function loadPosts() {
  const container = document.getElementById("postsList");
  if (!container) return;
  container.innerHTML = "<p>Loading posts...</p>";
  try {
    const snap = await db.collection("posts").orderBy("timestamp", "desc").limit(30).get();
    container.innerHTML = "";
    if (snap.empty) return container.innerHTML = "<p>No posts yet.</p>";

    snap.forEach(doc => {
      const post = doc.data();
      const id = doc.id;
      const postDiv = document.createElement("div");
      postDiv.className = "post";
      postDiv.innerHTML = `
        <div class="post-header">
          <div><strong>${escapeHtml(post.author)}</strong> • <span class="post-time">${new Date(post.timestamp).toLocaleString()}</span></div>
          <div><small>${escapeHtml(post.category || "General")}</small></div>
        </div>
        <div class="post-content">${escapeHtml(post.content)}</div>
        ${post.imageUrl ? `<img class="post-image" src="${post.imageUrl}" />` : ""}
        <div class="post-actions">
          <button onclick="likePost('${id}')">❤️ ${post.likes || 0}</button>
          <button onclick="toggleComments('${id}')">💬 ${post.commentCount || 0}</button>
          ${ (isOwner || isModerator || (post.authorId === currentUser?.uid)) ? `<button onclick="deletePost('${id}')">🗑 Delete</button>` : '' }
        </div>
        <div id="comments-${id}" class="hidden" style="margin-top:10px;"></div>
      `;
      container.appendChild(postDiv);
    });
  } catch (e) {
    console.error("loadPosts:", e);
    container.innerHTML = "<p style='color:red;'>Error loading posts</p>";
  }
}

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

async function createPost() {
  if (!currentUser) return alert("Please login first");
  const content = document.getElementById("postContent").value.trim();
  const category = document.getElementById("postCategory").value;
  const file = document.getElementById("postImage").files[0];
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

    // award coins & activity
    const userRef = db.collection("users").doc(currentUser.uid);
    const userDoc = await userRef.get();
    const old = userDoc.data();
    await userRef.update({
      coins: (old.coins || 0) + 5,
      activity: (old.activity || 0) + 10,
      posts: (old.posts || 0) + 1
    });
    updateCoinDisplay((old.coins || 0) + 5);

    document.getElementById("postContent").value = "";
    document.getElementById("postImage").value = "";
    document.getElementById("previewImage").classList.add("hidden");
    alert("Posted! +5 coins, +10 activity");
    loadPosts();
  } catch (e) {
    console.error("createPost:", e);
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
    console.error("deletePost:", e);
    alert("Delete failed: " + e.message);
  }
}

// ================= LIKES =================
async function likePost(postId) {
  if (!currentUser) return alert("Please login first");
  try {
    const postRef = db.collection("posts").doc(postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) return;
    const post = postDoc.data();
    const likedBy = post.likedBy || [];
    if (likedBy.includes(currentUser.uid)) {
      await postRef.update({
        likes: (post.likes || 1) - 1,
        likedBy: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
      });
    } else {
      await postRef.update({
        likes: (post.likes || 0) + 1,
        likedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
      });
      // award coin to author
      if (post.authorId && post.authorId !== currentUser.uid) {
        const authorRef = db.collection("users").doc(post.authorId);
        const aDoc = await authorRef.get();
        if (aDoc.exists) await authorRef.update({ coins: (aDoc.data().coins || 0) + 1 });
      }
    }
    loadPosts();
  } catch (e) {
    console.error("likePost:", e);
    alert("Error: " + e.message);
  }
}

// ================= COMMENTS =================
async function toggleComments(postId) {
  const el = document.getElementById(`comments-${postId}`);
  if (!el) return;
  if (el.classList.contains("hidden")) {
    el.classList.remove("hidden");
    await loadComments(postId);
  } else {
    el.classList.add("hidden");
  }
}

async function loadComments(postId) {
  const container = document.getElementById(`comments-${postId}`);
  if (!container) return;
  container.innerHTML = "<p>Loading comments...</p>";

  try {
    const snap = await db.collection("posts").doc(postId).collection("comments").orderBy("timestamp", "asc").get();
    container.innerHTML = "";
    snap.forEach(doc => {
      const c = doc.data();
      const d = document.createElement("div");
      d.style.padding = "6px";
      d.style.margin = "6px 0";
      d.style.background = "rgba(255,255,255,0.03)";
      d.style.borderRadius = "6px";
      d.innerHTML = `<strong>${escapeHtml(c.author)}</strong>: ${escapeHtml(c.content)}<br><small>${new Date(c.timestamp).toLocaleString()}</small>`;
      container.appendChild(d);
    });

    // comment input
    const ta = document.createElement("textarea");
    ta.placeholder = "Write a comment...";
    ta.style.marginTop = "8px";
    ta.style.width = "100%";
    const btn = document.createElement("button");
    btn.textContent = "Post Comment (+2 coins)";
    btn.onclick = () => addComment(postId, ta.value);
    container.appendChild(ta);
    container.appendChild(btn);
  } catch (e) {
    console.error("loadComments:", e);
    container.innerHTML = "<p style='color:red;'>Error loading comments</p>";
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

    const userRef = db.collection("users").doc(currentUser.uid);
    const uDoc = await userRef.get();
    await userRef.update({
      coins: (uDoc.data().coins || 0) + 2,
      comments: (uDoc.data().comments || 0) + 1,
      activity: (uDoc.data().activity || 0) + 1
    });
    updateCoinDisplay((uDoc.data().coins || 0) + 2);

    loadComments(postId);
    loadPosts();
  } catch (e) {
    console.error("addComment:", e);
    alert("Error: " + e.message);
  }
}

// ================= USERS LIST =================
async function loadUsers() {
  const container = document.getElementById("usersList");
  if (!container) return;
  container.innerHTML = "<p>Loading users...</p>";

  try {
    const snap = await db.collection("users").orderBy("coins", "desc").limit(100).get();
    container.innerHTML = "";
    snap.forEach(doc => {
      const u = doc.data();
      const div = document.createElement("div");
      div.className = "user-item";
      div.innerHTML = `<strong>${escapeHtml(u.username)}</strong>
                       <div>${u.avatarUrl ? `<img src="${u.avatarUrl}" class="profile-avatar" />` : ''} <span style="color:#ffd700">🪙 ${u.coins || 0}</span> ${u.moderator ? '<span style="color:#ff6b35">⭐ Mod</span>' : ''}</div>`;
      container.appendChild(div);
    });
  } catch (e) {
    console.error("loadUsers:", e);
    container.innerHTML = "<p style='color:red;'>Error loading users</p>";
  }
}

// ================= DMS =================
async function loadDMs() {
  const container = document.getElementById("dmsList");
  if (!container) return;
  if (!currentUser) {
    container.innerHTML = "<p>Please login to view DMs</p>";
    return;
  }
  container.innerHTML = "<p>Loading...</p>";
  try {
    const snap = await db.collection("dms").where("to", "==", currentUsername).orderBy("timestamp", "desc").limit(50).get();
    container.innerHTML = "";
    if (snap.empty) container.innerHTML = "<p>No messages</p>";
    snap.forEach(doc => {
      const m = doc.data();
      const d = document.createElement("div");
      d.className = "dm-item";
      d.innerHTML = `<strong>From: ${escapeHtml(m.from)}</strong><div>${escapeHtml(m.content)}</div><small>${new Date(m.timestamp).toLocaleString()}</small>`;
      container.appendChild(d);
    });
  } catch (e) {
    console.error("loadDMs:", e);
    container.innerHTML = "<p style='color:red;'>Error loading DMs</p>";
  }
}

async function sendDM() {
  if (!currentUser) return alert("Please login first");
  const to = document.getElementById("dmToUsername").value.trim();
  const content = document.getElementById("dmContent").value.trim();
  if (!to || !content) return alert("Fill in fields");
  try {
    await db.collection("dms").add({
      from: currentUsername,
      to,
      content,
      timestamp: Date.now()
    });
    document.getElementById("dmContent").value = "";
    alert("Message sent");
    loadDMs();
  } catch (e) {
    console.error("sendDM:", e);
    alert("Error sending DM");
  }
}

// ================= UPDATES =================
async function loadUpdates() {
  const container = document.getElementById("updatesList");
  if (!container) return;
  container.innerHTML = "<p>Loading updates...</p>";
  try {
    const snap = await db.collection("updates").orderBy("timestamp", "desc").limit(20).get();
    container.innerHTML = "";
    if (snap.empty) return container.innerHTML = "<p>No updates</p>";
    snap.forEach(doc => {
      const u = doc.data();
      const div = document.createElement("div");
      div.className = "update-item";
      div.innerHTML = `<h3>${escapeHtml(u.title)}</h3><div>${escapeHtml(u.content)}</div><small>${new Date(u.timestamp).toLocaleString()}</small>`;
      container.appendChild(div);
    });
  } catch (e) {
    console.error("loadUpdates:", e);
    container.innerHTML = "<p style='color:red;'>Error</p>";
  }
}

// ================= SUGGESTIONS =================
async function loadSuggestions() {
  const container = document.getElementById("suggestionsList");
  if (!container) return;
  container.innerHTML = "<p>Loading suggestions...</p>";
  try {
    const snap = await db.collection("suggestions").orderBy("votes", "desc").limit(50).get();
    container.innerHTML = "";
    snap.forEach(doc => {
      const s = doc.data();
      const div = document.createElement("div");
      div.className = "update-item";
      div.innerHTML = `<h3>${escapeHtml(s.title)}</h3><div>${escapeHtml(s.description)}</div><small>By: ${escapeHtml(s.author)} • Votes: ${s.votes || 0}</small>`;
      container.appendChild(div);
    });
  } catch (e) {
    console.error("loadSuggestions:", e);
    container.innerHTML = "<p style='color:red;'>Error</p>";
  }
}

async function submitSuggestion() {
  if (!currentUser) return alert("Please login first");
  const title = document.getElementById("suggestionTitle").value.trim();
  const description = document.getElementById("suggestionDescription").value.trim();
  if (!title || !description) return alert("Fill in fields");
  try {
    await db.collection("suggestions").add({
      author: currentUsername,
      title,
      description,
      votes: 0,
      timestamp: Date.now()
    });
    const ref = db.collection("users").doc(currentUser.uid);
    const doc = await ref.get();
    await ref.update({
      coins: (doc.data().coins || 0) + 10,
      activity: (doc.data().activity || 0) + 15
    });
    updateCoinDisplay((doc.data().coins || 0) + 10);
    document.getElementById("suggestionTitle").value = "";
    document.getElementById("suggestionDescription").value = "";
    alert("Suggestion submitted! +10 coins, +15 activity");
    loadSuggestions();
  } catch (e) {
    console.error("submitSuggestion:", e);
    alert("Error submitting suggestion");
  }
}

// ================= LEADERBOARDS =================
async function loadLeaderboard() {
  const container = document.getElementById("leaderboardList");
  if (!container) return;
  container.innerHTML = "<p>Loading leaderboard...</p>";
  try {
    const snap = await db.collection("users").orderBy("coins", "desc").limit(10).get();
    container.innerHTML = "<h3>🪙 Top Coin Holders</h3>";
    let rank = 1;
    snap.forEach(doc => {
      const u = doc.data();
      const div = document.createElement("div");
      div.className = "leaderboard-item";
      div.style.padding = "10px";
      div.style.margin = "6px 0";
      div.innerHTML = `<strong>${rank}. ${escapeHtml(u.username)}</strong> <span style="float:right; color:#ffd700">🪙 ${u.coins || 0}</span>`;
      container.appendChild(div);
      rank++;
    });
  } catch (e) {
    console.error("loadLeaderboard:", e);
    container.innerHTML = "<p style='color:red;'>Error</p>";
  }
}

async function loadActivityLeaderboard() {
  const container = document.getElementById("activityList");
  if (!container) return;
  container.innerHTML = "<p>Loading activity...</p>";
  try {
    const snap = await db.collection("users").orderBy("activity", "desc").limit(10).get();
    container.innerHTML = "";
    let rank = 1;
    snap.forEach(doc => {
      const u = doc.data();
      const div = document.createElement("div");
      div.className = "leaderboard-item";
      div.style.padding = "10px";
      div.style.margin = "6px 0";
      div.innerHTML = `<strong>${rank}. ${escapeHtml(u.username)}</strong> <span style="float:right; color:#ff6b35">🔥 ${u.activity || 0}</span>`;
      container.appendChild(div);
      rank++;
    });
  } catch (e) {
    console.error("loadActivityLeaderboard:", e);
    container.innerHTML = "<p style='color:red;'>Error</p>";
  }
}

// ================= PROFILE =================
function setupProfileAvatarPreview() {
  const input = document.getElementById("profileAvatar");
  const preview = document.getElementById("profileAvatarPreview");
  if (!input || !preview) return;
  input.addEventListener("change", () => {
    const f = input.files[0];
    if (!f) {
      preview.classList.add("hidden");
      return;
    }
    const r = new FileReader();
    r.onload = e => {
      preview.src = e.target.result;
      preview.classList.remove("hidden");
      preview.style.width = "100px";
      preview.style.height = "100px";
      preview.classList.add("profile-avatar");
    };
    r.readAsDataURL(f);
  });
}

async function saveProfile() {
  if (!currentUser) return alert("Login first");
  const bio = document.getElementById("profileBio").value.trim();
  const file = document.getElementById("profileAvatar").files[0];
  try {
    const ref = db.collection("users").doc(currentUser.uid);
    const doc = await ref.get();
    const data = doc.data() || {};
    let avatarUrl = data.avatarUrl || "";
    if (file) {
      const sref = storage.ref(`avatars/${currentUser.uid}_${Date.now()}_${file.name}`);
      await sref.put(file);
      avatarUrl = await sref.getDownloadURL();
    }
    await ref.update({ bio, avatarUrl });
    alert("Profile saved");
    loadMyProfile();
  } catch (e) {
    console.error("saveProfile:", e);
    alert("Error saving profile");
  }
}

async function loadMyProfile() {
  if (!currentUser) return;
  const ref = db.collection("users").doc(currentUser.uid);
  const doc = await ref.get();
  if (!doc.exists) return;
  const data = doc.data();
  document.getElementById("myProfileInfo").innerHTML = `
    <strong>${escapeHtml(data.username)}</strong>
    <div>${data.avatarUrl ? `<img src="${data.avatarUrl}" class="profile-avatar" />` : ''}</div>
    <p>${escapeHtml(data.bio || "")}</p>
    <p>🪙 ${data.coins || 0} • 🔥 ${data.activity || 0}</p>
  `;
}

// ================= IMAGE PREVIEW FOR NEW POSTS =================
function setupImagePreview() {
  const input = document.getElementById("postImage");
  const preview = document.getElementById("previewImage");
  if (!input || !preview) return;
  input.addEventListener("change", function () {
    const f = this.files[0];
    if (!f) {
      preview.classList.add("hidden");
      return;
    }
    const r = new FileReader();
    r.onload = e => {
      preview.src = e.target.result;
      preview.classList.remove("hidden");
      preview.style.maxWidth = "200px";
    };
    r.readAsDataURL(f);
  });
}

// ================= PLINKO GAME (visible falling ball) =================
let plinkoCanvas, plinkoCtx, plinkoBall = null, plinkoAnimating = false;

function initPlinko() {
  plinkoCanvas = document.getElementById("plinkoCanvas");
  if (!plinkoCanvas) return;
  plinkoCtx = plinkoCanvas.getContext("2d");
  drawPlinkoBoard();
}

function drawPlinkoBoard() {
  if (!plinkoCtx) return;
  const W = plinkoCanvas.width, H = plinkoCanvas.height;
  plinkoCtx.clearRect(0, 0, W, H);

  // pegs
  plinkoCtx.fillStyle = "#fff";
  for (let row = 1; row <= 10; row++) {
    const num = row + 1;
    for (let col = 0; col < num; col++) {
      const x = W / 2 + (col - num / 2 + 0.5) * 35;
      const y = 40 + row * 35;
      plinkoCtx.beginPath();
      plinkoCtx.arc(x, y, 4, 0, Math.PI * 2);
      plinkoCtx.fill();
    }
  }

  // prize zones
  const prizes = [0.5, 1, 2, 5, 10, 5, 2, 1, 0.5];
  const zoneW = W / prizes.length;
  plinkoCtx.font = "14px Arial";
  plinkoCtx.textAlign = "center";
  prizes.forEach((p, i) => {
    plinkoCtx.fillStyle = i === 4 ? "rgba(255,215,0,0.25)" : "rgba(255,255,255,0.05)";
    plinkoCtx.fillRect(i * zoneW, H - 40, zoneW, 40);
    plinkoCtx.fillStyle = "#ffd700";
    plinkoCtx.fillText(`${p}x`, i * zoneW + zoneW / 2, H - 14);
  });
}

// physics animation
function animatePlinko() {
  drawPlinkoBoard();
  if (!plinkoBall) return;
  plinkoBall.vy += plinkoBall.gravity;
  plinkoBall.y += plinkoBall.vy;
  plinkoBall.x += plinkoBall.vx;

  // collision with pegs
  for (let row = 1; row <= 10; row++) {
    const num = row + 1;
    for (let col = 0; col < num; col++) {
      const pegX = plinkoCanvas.width / 2 + (col - num / 2 + 0.5) * 35;
      const pegY = 40 + row * 35;
      const dx = plinkoBall.x - pegX;
      const dy = plinkoBall.y - pegY;
      const dist = Math.sqrt(dx * dx + dy * dy);
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
  plinkoCtx.arc(plinkoBall.x, plinkoBall.y, plinkoBall.radius, 0, Math.PI * 2);
  plinkoCtx.fill();

  // bottom
  if (plinkoBall.y >= plinkoCanvas.height - 40) {
    plinkoAnimating = false;
    // compute zone
    const multipliers = [0.5,1,2,5,10,5,2,1,0.5];
    const zoneWidth = plinkoCanvas.width / multipliers.length;
    const zoneIndex = Math.floor(plinkoBall.x / zoneWidth);
    const multiplier = multipliers[Math.max(0, Math.min(zoneIndex, multipliers.length-1))];
    finalizePlinko(multiplier);
    plinkoBall = null;
    return;
  }

  requestAnimationFrame(animatePlinko);
}

async function playPlinko() {
  if (!currentUser) return alert("Please login first");
  if (!plinkoCanvas) initPlinko();
  if (plinkoAnimating) return alert("Wait for current ball");
  const bet = Math.max(10, parseInt(document.getElementById("plinkoBet").value) || 10);

  const uref = db.collection("users").doc(currentUser.uid);
  const udoc = await uref.get();
  const coins = udoc.data().coins || 0;
  if (coins < bet) return alert("Not enough coins");

  await uref.update({ coins: coins - bet });
  updateCoinDisplay(coins - bet);
  plinkoAnimating = true;
  plinkoBall = { x: plinkoCanvas.width/2, y: 10, vx: 0, vy: 2, gravity: 0.3, radius: 7, bet };
  animatePlinko();
}

async function finalizePlinko(multiplier) {
  // award
  if (!currentUser) return;
  const ref = db.collection("users").doc(currentUser.uid);
  const doc = await ref.get();
  const orig = doc.data().coins || 0;
  const bet = plinkoBall ? plinkoBall.bet : parseInt(document.getElementById("plinkoBet").value) || 10;
  const winnings = Math.floor(bet * multiplier);
  const newCoins = orig + winnings;
  await ref.update({ coins: newCoins, activity: firebase.firestore.FieldValue.increment(5) });
  updateCoinDisplay(newCoins);
  const profit = winnings - bet;
  const msg = profit > 0 ? `🎉 WIN +${profit} coins (${multiplier}x)` : profit === 0 ? `Break even (${multiplier}x)` : `You lost ${Math.abs(profit)} coins (${multiplier}x)`;
  document.getElementById("plinkoResult").innerText = msg;
  alert(msg);
}

// ================= LEAN HELPERS =================
/* small utility to ensure UI shows up-to-date user doc values used elsewhere */
async function refreshUserDisplay() {
  if (!currentUser) return;
  const doc = await db.collection("users").doc(currentUser.uid).get();
  updateCoinDisplay(doc.data().coins || 0);
}

// ================= LOAD / UTIL =================
async function getDocData(collection, id) {
  const d = await db.collection(collection).doc(id).get();
  return d.exists ? d.data() : null;
}

// ================= PROFILE CREATION (for complete user record) =================
// This is already done in register, but the UI will also allow creating/updating profile via saveProfile()

// ================= HELPER: get current user's userDoc if needed (fast) =================
async function getCurrentUserDoc() {
  if (!currentUser) return null;
  const d = await db.collection("users").doc(currentUser.uid).get();
  return d.exists ? d.data() : null;
}
