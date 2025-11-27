// =========================
// app.js - Toasty Forums (FINAL)
// Owner: d29510713@gmail.com
// Firebase v8
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
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ---------- GLOBALS ----------
let currentUser = null;
let currentUsername = "";
let isOwner = false;
let isModerator = false;
const OWNER_EMAIL = "d29510713@gmail.com";

// ---------- BOOT ----------
document.addEventListener("DOMContentLoaded", () => {
  console.log("Toasty app starting...");
  renderStars();
  wireBasicUI();
  setupImagePreview();
  setupProfileAvatarPreview();
  auth.onAuthStateChanged(handleAuthChange);
});

// ---------- SMALL DOM HELPERS ----------
const $ = id => document.getElementById(id);
const show = id => { const e = $(id); if (e) e.classList.remove("hidden"); };
const hide = id => { const e = $(id); if (e) e.classList.add("hidden"); };
const setText = (id, text) => { const e = $(id); if (e) e.textContent = text; };
const el = sel => document.querySelector(sel);

// escape html
function escapeHtml(s=""){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ---------- STARS ----------
function renderStars() {
  const stars = $("stars");
  if (!stars) return;
  for (let i=0;i<150;i++){
    const s = document.createElement("div");
    s.className = "star";
    s.style.left = Math.random()*100+"%";
    s.style.top = Math.random()*100+"%";
    const size = (Math.random()*2+1).toFixed(2)+"px";
    s.style.width = s.style.height = size;
    stars.appendChild(s);
  }
}

// ---------- AUTH / USER META ----------
async function handleAuthChange(user) {
  if (user) {
    currentUser = user;
    await ensureUserDoc(user);
    const meta = await db.collection("users").doc(user.uid).get();
    const data = meta.exists ? meta.data() : {};
    if (data.banned) {
      alert("You are banned. Contact owner for appeal.");
      await auth.signOut();
      return;
    }
    currentUsername = data.username || user.email.split("@")[0];
    isModerator = !!data.moderator;
    isOwner = (user.email === OWNER_EMAIL);
    hide("box");
    show("forum");
    setText("currentUserBadge", `${currentUsername}${isOwner ? " (Owner)" : isModerator ? " (Mod)" : ""}`);
    await refreshUserDisplay();
    // load default tab
    loadPosts();
    loadUsers();
    loadLeaderboard();
    loadActivityLeaderboard();
    loadUpdates();
    loadSuggestions();
    // show owner panel if owner
    if (isOwner) buildOwnerPanel();
    else removeOwnerPanel();
  } else {
    currentUser = null;
    currentUsername = "";
    isModerator = false;
    isOwner = false;
    show("box");
    hide("forum");
    setText("currentUserBadge", "");
  }
}

async function ensureUserDoc(user) {
  const userRef = db.collection("users").doc(user.uid);
  const doc = await userRef.get();
  if (!doc.exists) {
    console.log("Creating base user doc for", user.uid);
    await userRef.set({
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
      color: "",
      title: "",
      muted: false
    });
  } else {
    // ensure expected fields exist
    const data = doc.data();
    const patch = {};
    if (data.coins === undefined) patch.coins = 0;
    if (data.activity === undefined) patch.activity = 0;
    if (data.comments === undefined) patch.comments = 0;
    if (data.posts === undefined) patch.posts = 0;
    if (data.lastDailyClaim === undefined) patch.lastDailyClaim = 0;
    if (data.muted === undefined) patch.muted = false;
    if (Object.keys(patch).length) await userRef.update(patch);
  }
}

// ---------- BASIC UI WIRING ----------
function wireBasicUI() {
  // tabs map
  const tabMap = {
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

  Object.keys(tabMap).forEach(tabId => {
    const b = $(tabId);
    if (!b) return;
    b.onclick = () => {
      document.querySelectorAll(".tabs button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      document.querySelectorAll(".section").forEach(s => s.classList.add("hidden"));
      const sec = $(tabMap[tabId]);
      if (sec) sec.classList.remove("hidden");

      const secId = tabMap[tabId];
      // lazy loads
      if (secId === "postsSection") loadPosts();
      if (secId === "usersSection") loadUsers();
      if (secId === "dmsSection") loadDMs();
      if (secId === "updatesSection") loadUpdates();
      if (secId === "suggestionsSection") loadSuggestions();
      if (secId === "leaderboardSection") loadLeaderboard();
      if (secId === "activitySection") loadActivityLeaderboard();
      if (secId === "gamesSection") initPlinko();
      if (secId === "profileSection") loadMyProfile();
    };
  });

  // auth buttons
  $("toggleToRegister")?.addEventListener("click", ()=>{ hide("loginBox"); show("registerBox"); });
  $("toggleToLogin")?.addEventListener("click", ()=>{ hide("registerBox"); show("loginBox"); });
  $("registerBtn")?.addEventListener("click", register);
  $("loginBtn")?.addEventListener("click", login);
  $("logoutBtn")?.addEventListener("click", logout);
  $("postBtn")?.addEventListener("click", createPost);
  $("dmBtn")?.addEventListener("click", sendDM);
  $("submitSuggestionBtn")?.addEventListener("click", submitSuggestion);
  $("claimDailyBtn")?.addEventListener("click", claimDailyCoins);
  $("plinkoDropBtn")?.addEventListener("click", playPlinko);
  $("createUpdateBtn")?.addEventListener("click", createUpdate);
  $("saveProfileBtn")?.addEventListener("click", saveProfile);

  // quick search trigger for posts (simple filter client-side)
  $("searchPost")?.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    filterPosts(q);
  });
  $("searchUser")?.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    filterUsers(q);
  });
}

// ---------- AUTH ACTIONS ----------
async function register(){
  const email = $("regEmail").value.trim();
  const pass = $("regPass").value;
  const username = $("regUsername").value.trim();
  if (!email || !pass || !username) return alert("All fields required");
  try {
    const taken = await db.collection("users").where("username","==",username).get();
    if (!taken.empty) return alert("Username taken");
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    await db.collection("users").doc(cred.user.uid).set({
      username, email, joinDate: Date.now(), banned:false, moderator:false,
      coins:0, activity:0, comments:0, posts:0, lastDailyClaim:0, bio:"", avatarUrl:"", color:"", title:"", muted:false
    });
    alert("Registered! Please login.");
    hide("registerBox"); show("loginBox");
  } catch (e) { console.error(e); alert("Register failed: "+e.message); }
}

async function login(){
  const email = $("logEmail").value.trim();
  const pass = $("logPass").value;
  if (!email || !pass) return alert("Enter email & password");
  try { await auth.signInWithEmailAndPassword(email, pass); }
  catch (e) { console.error(e); alert("Login failed: "+e.message); }
}

async function logout(){
  try { await auth.signOut(); } catch(e){ console.error(e); alert("Logout failed") }
}

// ---------- DAILY COINS ----------
async function claimDailyCoins(){
  if (!currentUser) return alert("Login first");
  const uRef = db.collection("users").doc(currentUser.uid);
  const doc = await uRef.get();
  const data = doc.data() || {};
  const now = Date.now();
  const oneDay = 24*60*60*1000;
  if (now - (data.lastDailyClaim || 0) < oneDay) {
    const left = Math.ceil((oneDay - (now - (data.lastDailyClaim || 0)))/(60*60*1000));
    return alert(`Come back in ${left} hours`);
  }
  const newCoins = (data.coins || 0) + 50;
  await uRef.update({ coins: newCoins, lastDailyClaim: now, activity: (data.activity || 0)+5 });
  updateCoinDisplay(newCoins);
  alert("🎉 +50 coins");
}

// ---------- POSTS ----------
async function loadPosts(){
  const container = $("postsList");
  if (!container) return;
  container.innerHTML = "<p>Loading posts...</p>";
  try {
    const snap = await db.collection("posts").orderBy("timestamp","desc").limit(50).get();
    container.innerHTML = "";
    if (snap.empty) { container.innerHTML = "<p>No posts yet.</p>"; return; }
    snap.forEach(doc => {
      const p = doc.data(); const id = doc.id;
      const card = document.createElement("div"); card.className = "postCard";
      const author = escapeHtml(p.author || "Unknown");
      const time = p.timestamp ? new Date(p.timestamp).toLocaleString() : "";
      const category = escapeHtml(p.category || "General");
      const content = escapeHtml(p.content || "");
      const likes = p.likes || 0;
      const commentCount = p.commentCount || 0;
      // title of author (if set)
      let authorLabel = author;
      // we'll fetch author's title quickly (not blocking UI much)
      db.collection("users").where("username","==",p.author).limit(1).get().then(q=>{
        if (!q.empty) {
          const data = q.docs[0].data();
          if (data.title) authorLabel = `${author} — ${escapeHtml(data.title)}`;
          // update header if present
          const headerSpan = card.querySelector(".authorLabel");
          if (headerSpan) headerSpan.innerHTML = authorLabel;
        }
      }).catch(()=>{});
      card.innerHTML = `
        <div class="postHeader">
          <div><strong class="authorLabel">${author}</strong> • <small>${time}</small> • <small>${category}</small></div>
          <div></div>
        </div>
        <div class="postContent">${content}</div>
        ${p.imageUrl ? `<img src="${p.imageUrl}" class="postImage" />` : ""}
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button onclick="likePost('${id}')">❤️ ${likes}</button>
          <button onclick="toggleComments('${id}')">💬 ${commentCount}</button>
          ${ (isOwner || isModerator || (p.authorId === currentUser?.uid)) ? `<button onclick="deletePost('${id}')">Delete</button>` : "" }
        </div>
        <div id="comments-${id}" class="postCommentSection hidden"></div>
      `;
      container.appendChild(card);
    });
  } catch (e) {
    console.error("loadPosts", e); container.innerHTML = "<p style='color:salmon'>Error loading posts</p>";
  }
}

let lastFilteredPosts = [];
function filterPosts(q){
  q = q.trim().toLowerCase();
  const container = $("postsList");
  if (!container) return;
  const cards = container.querySelectorAll(".postCard");
  cards.forEach(card => {
    const txt = card.innerText.toLowerCase();
    card.style.display = txt.includes(q) ? "" : "none";
  });
}

async function createPost(){
  if (!currentUser) return alert("Login first");
  // check ban
  const uDoc = await db.collection("users").doc(currentUser.uid).get();
  if (uDoc.data().banned) return alert("You are banned");
  const content = $("postContent").value.trim();
  const category = $("postCategory").value || "General";
  const file = $("postImage").files && $("postImage").files[0];
  if (!content && !file) return alert("Write something or attach an image");
  try {
    let imageUrl = null;
    if (file) {
      const sref = storage.ref(`posts/${Date.now()}_${file.name}`);
      await sref.put(file);
      imageUrl = await sref.getDownloadURL();
    }
    await db.collection("posts").add({
      author: currentUsername,
      authorId: currentUser.uid,
      content, imageUrl: imageUrl || null, category,
      timestamp: Date.now(), likes:0, likedBy: [], commentCount:0
    });
    // user rewards
    const uRef = db.collection("users").doc(currentUser.uid);
    const ud = (await uRef.get()).data() || {};
    await uRef.update({ coins: (ud.coins||0)+5, activity: (ud.activity||0)+10, posts: (ud.posts||0)+1 });
    updateCoinDisplay((ud.coins||0)+5);
    $("postContent").value = ""; $("postImage").value = ""; hide("previewImage");
    alert("Posted! +5 coins +10 activity");
    loadPosts();
  } catch (e) {
    console.error("createPost", e); alert("Failed to create post");
  }
}

async function deletePost(postId){
  if (!currentUser) return;
  if (!(isOwner || isModerator || confirm("Are you the author? Confirm deletion"))) {
    // if not owner/mod, we only allow deletion by author via UI confirmation
  }
  if (!confirm("Delete this post?")) return;
  try {
    await db.collection("posts").doc(postId).delete();
    // Optionally delete comments subcollection (firestore doesn't support cascade automatically)
    // quick cleanup: get comments then delete
    const commentsSnap = await db.collection("posts").doc(postId).collection("comments").get();
    const batch = db.batch();
    commentsSnap.forEach(d => batch.delete(d.ref));
    await batch.commit().catch(()=>{});
    loadPosts();
  } catch (e) { console.error("deletePost", e); alert("Delete failed"); }
}

// ---------- LIKES ----------
async function likePost(postId){
  if (!currentUser) return alert("Login first");
  try {
    const ref = db.collection("posts").doc(postId);
    const doc = await ref.get();
    if (!doc.exists) return;
    const p = doc.data();
    const liked = (p.likedBy || []).includes(currentUser.uid);
    if (liked) {
      await ref.update({ likes: Math.max(0,(p.likes||1)-1), likedBy: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) });
    } else {
      await ref.update({ likes: (p.likes||0)+1, likedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) });
      // award coin to author
      if (p.authorId && p.authorId !== currentUser.uid) {
        const aRef = db.collection("users").doc(p.authorId);
        const aDoc = await aRef.get();
        if (aDoc.exists) await aRef.update({ coins: (aDoc.data().coins||0)+1 });
      }
    }
    loadPosts();
  } catch (e) { console.error("likePost", e); alert("Error liking post"); }
}

// ---------- COMMENTS ----------
async function toggleComments(postId){
  const cont = $(`comments-${postId}`);
  if (!cont) return;
  if (cont.classList.contains("hidden")) { cont.classList.remove("hidden"); loadComments(postId); }
  else cont.classList.add("hidden");
}

async function loadComments(postId){
  const container = $(`comments-${postId}`);
  if (!container) return;
  container.innerHTML = "<p>Loading comments...</p>";
  try {
    const snap = await db.collection("posts").doc(postId).collection("comments").orderBy("timestamp","asc").get();
    container.innerHTML = "";
    if (snap.empty) container.innerHTML = "<p>No comments</p>";
    snap.forEach(doc => {
      const c = doc.data(); const cid = doc.id;
      const div = document.createElement("div"); div.className = "commentCard";
      div.innerHTML = `<strong>${escapeHtml(c.author)}</strong> • <small>${new Date(c.timestamp).toLocaleString()}</small>
        <div>${escapeHtml(c.content)}</div>
        ${ (isOwner || isModerator || (c.authorId === currentUser?.uid)) ? `<div style="margin-top:6px;"><button onclick="deleteComment('${postId}','${cid}')">Delete Comment</button></div>` : "" }`;
      container.appendChild(div);
    });
    // comment input
    const ta = document.createElement("textarea"); ta.placeholder = "Write a comment...";
    const btn = document.createElement("button"); btn.textContent = "Post Comment (+2 coins)";
    btn.onclick = ()=> addComment(postId, ta.value);
    container.appendChild(ta); container.appendChild(btn);
  } catch (e) { console.error("loadComments", e); container.innerHTML = "<p style='color:salmon'>Error</p>"; }
}

async function addComment(postId, content){
  if (!currentUser) return alert("Login first");
  const userDoc = await db.collection("users").doc(currentUser.uid).get();
  if (userDoc.data().banned) return alert("You are banned");
  content = String(content || "").trim();
  if (!content) return alert("Write something");
  try {
    await db.collection("posts").doc(postId).collection("comments").add({
      author: currentUsername, authorId: currentUser.uid, content, timestamp: Date.now()
    });
    const postRef = db.collection("posts").doc(postId);
    const postSnap = await postRef.get();
    await postRef.update({ commentCount: (postSnap.data().commentCount||0)+1 });
    // reward commenter
    const uRef = db.collection("users").doc(currentUser.uid);
    const uDoc = await uRef.get(); const ud = uDoc.data() || {};
    await uRef.update({ coins: (ud.coins||0)+2, comments: (ud.comments||0)+1, activity: (ud.activity||0)+1 });
    updateCoinDisplay((ud.coins||0)+2);
    loadComments(postId); loadPosts();
  } catch (e) { console.error("addComment", e); alert("Failed to add comment"); }
}

async function deleteComment(postId, commentId){
  if (!currentUser) return;
  if (!confirm("Delete this comment?")) return;
  try {
    // only owner/mod or comment author can delete
    const cRef = db.collection("posts").doc(postId).collection("comments").doc(commentId);
    const cDoc = await cRef.get();
    if (!cDoc.exists) return;
    const cData = cDoc.data();
    if (!(isOwner || isModerator || cData.authorId === currentUser.uid)) {
      return alert("Not allowed");
    }
    await cRef.delete();
    // decrement commentCount
    const postRef = db.collection("posts").doc(postId);
    const postDoc = await postRef.get();
    if (postDoc.exists) {
      await postRef.update({ commentCount: Math.max(0,(postDoc.data().commentCount||1)-1) });
    }
    loadComments(postId);
  } catch (e) { console.error("deleteComment", e); alert("Delete failed"); }
}

// ---------- USERS LIST / PROFILE ----------
async function loadUsers(){
  const container = $("usersList");
  if (!container) return;
  container.innerHTML = "<p>Loading users...</p>";
  try {
    const snap = await db.collection("users").orderBy("coins","desc").limit(100).get();
    container.innerHTML = "";
    if (snap.empty) { container.innerHTML = "<p>No users</p>"; return; }
    snap.forEach(doc => {
      const u = doc.data(); const uid = doc.id;
      const div = document.createElement("div"); div.className = "userCard";
      div.innerHTML = `
        ${u.avatarUrl ? `<img src="${u.avatarUrl}" class="userAvatar">` : `<div class="userAvatar"></div>`}
        <div style="flex:1;">
          <strong>${escapeHtml(u.username)}</strong> ${u.title ? `<small style="color:#ffd700">— ${escapeHtml(u.title)}</small>` : ""}
          <div style="font-size:13px; color:#ccc;">🪙 ${u.coins||0} • 🔥 ${u.activity||0}</div>
        </div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          <button onclick="openProfile('${uid}')">View</button>
          ${ isOwner ? `<button onclick="buildOwnerUserActions('${uid}')">Manage</button>` : "" }
        </div>
      `;
      container.appendChild(div);
    });
  } catch (e) { console.error("loadUsers", e); container.innerHTML = "<p style='color:salmon'>Error loading users</p>"; }
}

async function openProfile(uid){
  // open user profile in profileSection
  const doc = await db.collection("users").doc(uid).get();
  if (!doc.exists) return alert("User not found");
  const d = doc.data();
  // show profile section and populate
  document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
  $("tabProfile")?.classList.add("active");
  document.querySelectorAll(".section").forEach(s => s.classList.add("hidden"));
  $("profileSection")?.classList.remove("hidden");
  $("myProfileInfo").innerHTML = `
    <strong>${escapeHtml(d.username)}</strong><br>
    ${ d.avatarUrl ? `<img src="${d.avatarUrl}" id="profileAvatarPreview" style="width:120px;height:120px;border-radius:10px;object-fit:cover;margin-top:8px;" />` : "" }
    <p>${escapeHtml(d.bio||"")}</p>
    <p>Title: ${escapeHtml(d.title||"")}</p>
    <p>Joined: ${new Date(d.joinDate).toLocaleDateString()}</p>
    <p>🪙 ${d.coins||0} • 🔥 ${d.activity||0} • Posts: ${d.posts||0} • Comments: ${d.comments||0}</p>
  `;
}

// ---------- PROFILE EDIT ----------
function setupProfileAvatarPreview() {
  const input = $("profileAvatar");
  const preview = $("profileAvatarPreview");
  if (!input || !preview) return;
  input.onchange = () => {
    const f = input.files[0];
    if (!f) { preview.classList.add("hidden"); return; }
    const reader = new FileReader();
    reader.onload = e => { preview.src = e.target.result; preview.classList.remove("hidden"); };
    reader.readAsDataURL(f);
  };
}

async function saveProfile(){
  if (!currentUser) return alert("Login first");
  try {
    const bio = $("profileBio").value.trim();
    const file = $("profileAvatar").files && $("profileAvatar").files[0];
    const ref = db.collection("users").doc(currentUser.uid);
    const doc = await ref.get(); const data = doc.data() || {};
    let avatarUrl = data.avatarUrl || "";
    if (file) {
      const sref = storage.ref(`avatars/${currentUser.uid}_${Date.now()}_${file.name}`);
      await sref.put(file);
      avatarUrl = await sref.getDownloadURL();
    }
    await ref.update({ bio, avatarUrl });
    alert("Profile saved");
    loadMyProfile();
    loadUsers();
  } catch (e) { console.error("saveProfile", e); alert("Save profile failed"); }
}

async function loadMyProfile(){
  if (!currentUser) return;
  const doc = await db.collection("users").doc(currentUser.uid).get();
  if (!doc.exists) return;
  const d = doc.data();
  $("myProfileInfo").innerHTML = `
    <strong>${escapeHtml(d.username)}</strong><br>
    ${ d.avatarUrl ? `<img src="${d.avatarUrl}" id="profileAvatarPreview" style="width:120px;height:120px;border-radius:10px;object-fit:cover;margin-top:8px;" />` : "" }
    <p>${escapeHtml(d.bio||"")}</p>
    <p>Title: ${escapeHtml(d.title||"")}</p>
    <p>Joined: ${new Date(d.joinDate).toLocaleDateString()}</p>
    <p>🪙 ${d.coins||0} • 🔥 ${d.activity||0} • Posts: ${d.posts||0} • Comments: ${d.comments||0}</p>
  `;
}

// ---------- DMS (with mute enforcement) ----------
async function loadDMs(){
  const container = $("dmsList");
  if (!container) return;
  if (!currentUser) { container.innerHTML = "<p>Login to view DMs</p>"; return; }
  container.innerHTML = "<p>Loading DMs...</p>";
  try {
    const snap = await db.collection("dms").where("to","==",currentUsername).orderBy("timestamp","desc").limit(100).get();
    container.innerHTML = "";
    if (snap.empty) container.innerHTML = "<p>No messages</p>";
    snap.forEach(doc => {
      const m = doc.data();
      const div = document.createElement("div"); div.className = "dmCard";
      div.innerHTML = `<div class="dmSender">From: ${escapeHtml(m.from)}</div><div>${escapeHtml(m.content)}</div><small>${new Date(m.timestamp).toLocaleString()}</small>`;
      container.appendChild(div);
    });
  } catch (e) { console.error("loadDMs", e); container.innerHTML = "<p style='color:salmon'>Error</p>"; }
}

async function sendDM(){
  if (!currentUser) return alert("Login first");
  const to = $("dmToUsername").value.trim();
  const content = $("dmContent").value.trim();
  if (!to || !content) return alert("Fill fields");
  try {
    // find recipient user doc
    const q = await db.collection("users").where("username","==",to).limit(1).get();
    if (q.empty) return alert("Recipient not found");
    const recipient = q.docs[0].data();
    if (recipient.muted) return alert("Recipient is muted and cannot receive DMs");
    // check if sender muted? (prevent send if sender muted)
    const meDoc = await db.collection("users").doc(currentUser.uid).get();
    if (meDoc.data().muted) return alert("You are muted and cannot send DMs");
    await db.collection("dms").add({ from: currentUsername, to, content, timestamp: Date.now() });
    $("dmContent").value = "";
    alert("Message sent");
    loadDMs();
  } catch (e) { console.error("sendDM", e); alert("Send DM failed"); }
}

// ---------- UPDATES (owner only create UI already in HTML) ----------
async function loadUpdates(){
  const container = $("updatesList");
  if (!container) return;
  container.innerHTML = "<p>Loading updates...</p>";
  try {
    const snap = await db.collection("updates").orderBy("timestamp","desc").limit(50).get();
    container.innerHTML = "";
    if (snap.empty) container.innerHTML = "<p>No updates</p>";
    snap.forEach(doc => {
      const u = doc.data();
      const div = document.createElement("div"); div.className = "updateCard";
      if (u.priority === "high") div.classList.add("updateHigh");
      else if (u.priority === "medium") div.classList.add("updateMedium");
      else div.classList.add("updateLow");
      div.innerHTML = `<strong>${escapeHtml(u.title)}</strong><div>${escapeHtml(u.content)}</div><small>${new Date(u.timestamp).toLocaleString()}</small>`;
      container.appendChild(div);
    });
    if (isOwner) show("createUpdateArea"); else hide("createUpdateArea");
  } catch (e) { console.error("loadUpdates", e); container.innerHTML = "<p style='color:salmon'>Error</p>"; }
}

async function createUpdate(){
  if (!currentUser) return alert("Login first");
  if (!isOwner && !isModerator) return alert("No permission");
  const title = $("updateTitle").value.trim(); const content = $("updateContent").value.trim();
  const priority = $("updatePriority").value || "low";
  if (!title || !content) return alert("Fill fields");
  try {
    await db.collection("updates").add({ title, content, priority, timestamp: Date.now() });
    $("updateTitle").value=""; $("updateContent").value="";
    loadUpdates(); alert("Update published");
  } catch (e) { console.error("createUpdate", e); alert("Publish failed"); }
}

// ---------- SUGGESTIONS (mods can moderate = delete) ----------
async function loadSuggestions(){
  const container = $("suggestionsList");
  if (!container) return;
  container.innerHTML = "<p>Loading suggestions...</p>";
  try {
    const snap = await db.collection("suggestions").orderBy("votes","desc").limit(50).get();
    container.innerHTML = "";
    if (snap.empty) container.innerHTML = "<p>No suggestions</p>";
    snap.forEach(doc => {
      const s = doc.data(); const id = doc.id;
      const div = document.createElement("div"); div.className = "suggestionCard";
      div.innerHTML = `<strong>${escapeHtml(s.title)}</strong><div>${escapeHtml(s.description)}</div><small>By: ${escapeHtml(s.author)} • Votes: ${s.votes||0}</small>
        ${ (isOwner || isModerator) ? `<div style="margin-top:8px;"><button onclick="deleteSuggestion('${id}')">Delete</button></div>` : "" }`;
      container.appendChild(div);
    });
  } catch (e) { console.error("loadSuggestions", e); container.innerHTML = "<p style='color:salmon'>Error</p>"; }
}

async function submitSuggestion(){
  if (!currentUser) return alert("Login first");
  const title = $("suggestionTitle").value.trim(); const desc = $("suggestionDescription").value.trim();
  if (!title || !desc) return alert("Fill fields");
  try {
    await db.collection("suggestions").add({ title, description: desc, author: currentUsername, votes: 0, timestamp: Date.now() });
    // reward
    const uRef = db.collection("users").doc(currentUser.uid); const uDoc = await uRef.get(); const ud = uDoc.data()||{};
    await uRef.update({ coins: (ud.coins||0)+10, activity: (ud.activity||0)+15 });
    updateCoinDisplay((ud.coins||0)+10);
    $("suggestionTitle").value=""; $("suggestionDescription").value="";
    loadSuggestions(); alert("Submitted! +10 coins");
  } catch (e) { console.error("submitSuggestion", e); alert("Failed"); }
}

async function deleteSuggestion(id){
  if (!currentUser) return;
  if (!(isOwner || isModerator)) return alert("No permission");
  if (!confirm("Delete suggestion?")) return;
  try { await db.collection("suggestions").doc(id).delete(); loadSuggestions(); } catch(e){ console.error(e); alert("Delete failed"); }
}

// ---------- LEADERBOARDS ----------
async function loadLeaderboard(){
  const container = $("leaderboardList"); if (!container) return; container.innerHTML = "<p>Loading...</p>";
  try {
    const snap = await db.collection("users").orderBy("coins","desc").limit(10).get(); container.innerHTML = "";
    let rank=1; snap.forEach(doc=>{ const u=doc.data(); const div=document.createElement("div"); div.className="leaderboardEntry"; div.innerHTML=`<div>${rank}. <strong>${escapeHtml(u.username)}</strong></div><div>🪙 ${u.coins||0}</div>`; container.appendChild(div); rank++; });
  } catch(e){ console.error(e); container.innerHTML="<p style='color:salmon'>Error</p>"; }
}

async function loadActivityLeaderboard(){
  const container = $("activityList"); if (!container) return; container.innerHTML = "<p>Loading...</p>";
  try {
    const snap = await db.collection("users").orderBy("activity","desc").limit(10).get(); container.innerHTML = "";
    let rank=1; snap.forEach(doc=>{ const u=doc.data(); const div=document.createElement("div"); div.className="leaderboardEntry"; div.innerHTML=`<div>${rank}. <strong>${escapeHtml(u.username)}</strong></div><div>🔥 ${u.activity||0}</div>`; container.appendChild(div); rank++; });
  } catch(e){ console.error(e); container.innerHTML="<p style='color:salmon'>Error</p>"; }
}

// ---------- PLINKO (visible ball) ----------
let plinkoCanvas=null, plinkoCtx=null, plinkoBall=null, plinkoAnimating=false;
function initPlinko(){
  plinkoCanvas = $("plinkoCanvas");
  if (!plinkoCanvas) return;
  plinkoCtx = plinkoCanvas.getContext("2d");
  drawPlinkoBoard();
}
function drawPlinkoBoard(){
  if (!plinkoCtx) return;
  const W=plinkoCanvas.width, H=plinkoCanvas.height;
  plinkoCtx.clearRect(0,0,W,H);
  plinkoCtx.fillStyle="#fff";
  for (let row=1; row<=10; row++){
    const num = row+1;
    for (let col=0; col<num; col++){
      const x = W/2 + (col - num/2 + 0.5)*35;
      const y = 40 + row*35;
      plinkoCtx.beginPath(); plinkoCtx.arc(x,y,4,0,Math.PI*2); plinkoCtx.fill();
    }
  }
  const zoneM = [0.5,1,2,5,10,5,2,1,0.5];
  const zoneW = W/zoneM.length;
  plinkoCtx.font = "14px Arial"; plinkoCtx.textAlign="center";
  zoneM.forEach((m,i)=> { plinkoCtx.fillStyle = (i===4) ? "rgba(255,215,0,0.25)" : "rgba(255,255,255,0.05)"; plinkoCtx.fillRect(i*zoneW,H-40,zoneW,40); plinkoCtx.fillStyle="#ffd700"; plinkoCtx.fillText(`${m}x`, i*zoneW+zoneW/2, H-14); });
}
function animatePlinko(){
  if (!plinkoCtx || !plinkoBall) return;
  drawPlinkoBoard();
  plinkoBall.vy += plinkoBall.g;
  plinkoBall.y += plinkoBall.vy;
  plinkoBall.x += plinkoBall.vx;
  // collisions
  for (let row=1; row<=10; row++){
    const num = row+1;
    for (let col=0; col<num; col++){
      const pegX = plinkoCanvas.width/2 + (col - num/2 + 0.5)*35;
      const pegY = 40 + row*35;
      const dx = plinkoBall.x - pegX, dy = plinkoBall.y - pegY;
      const dist = Math.sqrt(dx*dx+dy*dy);
      if (dist < plinkoBall.radius + 4) {
        plinkoBall.vx = (Math.random()-0.5)*4;
        plinkoBall.vy = -Math.abs(plinkoBall.vy)*0.4;
        plinkoBall.y = pegY + plinkoBall.radius + 4;
      }
    }
  }
  if (plinkoBall.x < plinkoBall.radius) { plinkoBall.x = plinkoBall.radius; plinkoBall.vx *= -0.5; }
  if (plinkoBall.x > plinkoCanvas.width - plinkoBall.radius) { plinkoBall.x = plinkoCanvas.width - plinkoBall.radius; plinkoBall.vx *= -0.5; }
  plinkoCtx.fillStyle="#ff6b35"; plinkoCtx.beginPath(); plinkoCtx.arc(plinkoBall.x,plinkoBall.y,plinkoBall.radius,0,Math.PI*2); plinkoCtx.fill();
  if (plinkoBall.y >= plinkoCanvas.height - 40) {
    plinkoAnimating = false;
    const award = Math.floor(Math.random()*100)+1;
    finalizePlinko(award);
    plinkoBall = null;
    return;
  }
  requestAnimationFrame(animatePlinko);
}
async function playPlinko(){
  if (!currentUser) return alert("Login first");
  if (!plinkoCanvas) initPlinko();
  if (plinkoAnimating) return alert("Wait for ball to finish");
  const bet = Math.max(10, parseInt($("plinkoBet").value) || 10);
  const uRef = db.collection("users").doc(currentUser.uid); const doc = await uRef.get(); const ud = doc.data()||{};
  if ((ud.coins||0) < bet) return alert("Not enough coins");
  await uRef.update({ coins: (ud.coins||0)-bet });
  updateCoinDisplay((ud.coins||0)-bet);
  plinkoAnimating = true;
  plinkoBall = { x: plinkoCanvas.width/2, y: 8, vx: 0, vy: 2, g: 0.3, radius: 7, bet };
  animatePlinko();
}
async function finalizePlinko(amount){
  if (!currentUser) return;
  try {
    const uRef = db.collection("users").doc(currentUser.uid);
    const doc = await uRef.get(); const ud = doc.data()||{};
    const newCoins = (ud.coins||0) + amount;
    await uRef.update({ coins: newCoins, activity: (ud.activity||0)+5 });
    updateCoinDisplay(newCoins);
    $("plinkoResult").textContent = `You won ${amount} coins!`;
    alert(`🎉 You got ${amount} coins`);
  } catch(e) { console.error(e); alert("Error awarding prize"); }
}

// ---------- IMAGE PREVIEWS ----------
function setupImagePreview(){
  const input = $("postImage"); const preview = $("previewImage");
  if (!input || !preview) return;
  input.onchange = function(){
    const f = this.files[0];
    if (!f) { preview.classList.add("hidden"); return; }
    const reader = new FileReader();
    reader.onload = e => { preview.src = e.target.result; preview.style.maxWidth="220px"; preview.classList.remove("hidden"); };
    reader.readAsDataURL(f);
  };
}

// ---------- COIN DISPLAY ----------
async function refreshUserDisplay(){
  if (!currentUser) return;
  const doc = await db.collection("users").doc(currentUser.uid).get();
  const d = doc.data() || {};
  updateCoinDisplay(d.coins || 0);
}
function updateCoinDisplay(coins){ const el = $("coinDisplay"); if(el) el.textContent = `🪙 ${coins} Coins`; }

// ---------- OWNER PANEL (dynamically created) ----------
function buildOwnerPanel(){
  // add owner panel button if not exist
  if ($("ownerPanelBtn")) return;
  const headerRight = document.querySelector("#header > div:nth-child(2)");
  if (!headerRight) return;
  const btn = document.createElement("button"); btn.id = "ownerPanelBtn"; btn.textContent = "Owner Panel";
  btn.style.background = "#8a2be2"; btn.style.color = "#fff";
  btn.onclick = showOwnerPanel;
  headerRight.insertBefore(btn, headerRight.firstChild);
}
function removeOwnerPanel(){
  $("ownerPanelBtn")?.remove();
  $("ownerPanel")?.remove();
}

async function showOwnerPanel(){
  // create panel overlay at bottom of forum
  let panel = $("ownerPanel");
  if (!panel) {
    panel = document.createElement("div"); panel.id = "ownerPanel";
    panel.style.position = "fixed"; panel.style.right = "20px"; panel.style.bottom = "20px"; panel.style.zIndex = "9999";
    panel.style.width = "420px"; panel.style.maxHeight = "80vh"; panel.style.overflowY = "auto";
    panel.style.background = "rgba(10,10,15,0.95)"; panel.style.border = "2px solid rgba(138,43,226,0.6)"; panel.style.padding = "12px"; panel.style.borderRadius = "10px";
    panel.innerHTML = `<h3 style="margin:0 0 8px 0;">Owner Panel</h3>
      <div id="ownerUsersList"><p>Loading...</p></div>
      <div style="margin-top:8px;"><button id="closeOwnerPanelBtn">Close</button></div>`;
    document.body.appendChild(panel);
    $("closeOwnerPanelBtn").onclick = ()=> panel.remove();
  }
  // load users in owner panel
  const list = $("ownerUsersList"); if (!list) return;
  list.innerHTML = "<p>Loading users...</p>";
  const snap = await db.collection("users").orderBy("joinDate","desc").limit(200).get();
  list.innerHTML = "";
  snap.forEach(doc=>{
    const u = doc.data(); const uid = doc.id;
    const row = document.createElement("div"); row.style.borderBottom="1px solid rgba(255,255,255,0.03)"; row.style.padding="6px 0";
    row.innerHTML = `<strong>${escapeHtml(u.username)}</strong> ${u.title ? ` — ${escapeHtml(u.title)}` : ""} <br>
      <small>🪙 ${u.coins||0} • 🔥 ${u.activity||0} • ${u.moderator ? "<span style='color:#ffd700'>MOD</span>" : ""} ${u.banned ? "<span style='color:#ff6b35'>BANNED</span>" : ""}</small>
      <div style="margin-top:6px; display:flex; gap:6px;">
        <button onclick="ownerToggleMod('${uid}')">${u.moderator? "Demote":"Promote"}</button>
        <button onclick="ownerSetTitlePrompt('${uid}')">Set Title</button>
        <button onclick="ownerToggleBan('${uid}')">${u.banned ? "Unban":"Ban"}</button>
        <button onclick="ownerMuteToggle('${uid}')">${u.muted ? "Unmute":"Mute"}</button>
      </div>`;
    list.appendChild(row);
  });
}

// owner actions
async function ownerToggleMod(uid){
  if (!isOwner) return alert("Owner only");
  const ref = db.collection("users").doc(uid);
  const doc = await ref.get(); if (!doc.exists) return;
  const curr = doc.data().moderator || false;
  await ref.update({ moderator: !curr });
  alert(`${!curr ? "Promoted to moderator" : "Demoted from moderator"}`);
  showOwnerPanel(); loadUsers();
}

async function ownerSetTitlePrompt(uid){
  if (!isOwner) return alert("Owner only");
  const title = prompt("Enter title for user (leave blank to clear)");
  if (title === null) return;
  await db.collection("users").doc(uid).update({ title: String(title).trim() });
  alert("Title updated");
  showOwnerPanel(); loadUsers();
}

async function ownerToggleBan(uid){
  if (!isOwner) return alert("Owner only");
  if (uid === currentUser.uid) return alert("Cannot ban yourself");
  const ref = db.collection("users").doc(uid); const doc = await ref.get(); if (!doc.exists) return;
  const b = !!doc.data().banned;
  await ref.update({ banned: !b });
  alert(!b ? "User banned" : "User unbanned");
  showOwnerPanel(); loadUsers();
}

async function ownerMuteToggle(uid){
  if (!isOwner) return alert("Owner only");
  const ref = db.collection("users").doc(uid); const doc = await ref.get(); if (!doc.exists) return;
  const muted = !!doc.data().muted;
  await ref.update({ muted: !muted });
  alert(!muted ? "User muted" : "User unmuted");
  showOwnerPanel(); loadUsers();
}

// helper to open owner actions for a specific user (from Users list)
async function buildOwnerUserActions(uid){
  // reuse owner panel: scroll to user entry and highlight - simpler: open owner panel then focus
  showOwnerPanel();
  // give small delay for render then scroll
  setTimeout(()=> {
    const list = document.getElementById("ownerUsersList");
    if (!list) return;
    const children = Array.from(list.children);
    const idx = children.findIndex(c => c.innerHTML.includes(`ownerToggleMod('${uid}')`) || c.innerHTML.includes(`ownerSetTitlePrompt('${uid}')`));
    if (idx >= 0) children[idx].scrollIntoView({behavior:"smooth", block:"center"});
  }, 150);
}

// ---------- MOD TOOLS (delete posts/comments, mute users from DMs, moderate suggestions) ----------
// Delete post already allowed if isModerator in deletePost()

// Mute enforcement is applied in sendDM() above (checks recipient.muted)

// Moderators can delete comments and suggestions (implemented above)

// ---------- UTIL: get user doc by username ----------
async function getUserByUsername(username){
  const q = await db.collection("users").where("username","==",username).limit(1).get();
  if (q.empty) return null;
  const doc = q.docs[0]; return { id: doc.id, data: doc.data() };
}

// ---------- SEARCH HELPERS ----------
function filterUsers(q){
  q = q.trim().toLowerCase();
  const cards = document.querySelectorAll("#usersList .userCard");
  cards.forEach(c => {
    const txt = c.innerText.toLowerCase();
    c.style.display = txt.includes(q) ? "" : "none";
  });
}

// ---------- SCAFFOLD: sendDM duplicate function name cleanup ----------
// There were two sendDM definitions in earlier flows; the current one is above and used.

// ---------- FINAL LOG ----------
console.log("Final app.js loaded. Owner:", OWNER_EMAIL);
