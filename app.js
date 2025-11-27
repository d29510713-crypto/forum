// ================= GLOBAL VARIABLES =================
let currentUser = null;
let currentUsername = "";
let isOwner = false;
let isModerator = false;

// ================= FIREBASE INIT =================
const firebaseConfig = {
  apiKey: "AIzaSyA1FwweYw4MOz5My0aCfbRv-xrduCTl8z0",
  authDomain: "toasty-89f07.firebaseapp.com",
  projectId: "toasty-89f07",
  storageBucket: "toasty-89f07.appspot.com",
  messagingSenderId: "743787667064",
  appId: "1:743787667064:web:12284120fbbdd1e907d78d"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ================= WINDOW ONLOAD =================
window.onload = function () {
  initStars();
  initTabs();
  initLoginRegister();
  initDailyCoins();
};

// ================= STARS =================
function initStars() {
  const starsContainer = document.getElementById("stars");
  if (!starsContainer) return;
  for (let i = 0; i < 150; i++) {
    const s = document.createElement("div");
    s.className = "star";
    s.style.top = Math.random() * 100 + "%";
    s.style.left = Math.random() * 100 + "%";
    s.style.width = (Math.random() * 2 + 1) + "px";
    s.style.height = (Math.random() * 2 + 1) + "px";
    starsContainer.appendChild(s);
  }
}

// ================= TABS =================
function initTabs() {
  const tabs = ["Posts", "Users", "DMs", "Updates", "Suggestions", "Games"];
  tabs.forEach(tab => {
    const tabBtn = document.getElementById("tab" + tab);
    if (tabBtn) {
      tabBtn.onclick = () => showTab(tab.toLowerCase());
    }
  });
}

function showTab(tab) {
  const sections = {
    posts: "postsSection",
    users: "usersSection",
    dms: "dmsSection",
    updates: "updatesSection",
    suggestions: "suggestionsSection",
    games: "gamesSection"
  };

  for (const t in sections) {
    const section = document.getElementById(sections[t]);
    const tabBtn = document.getElementById("tab" + t.charAt(0).toUpperCase() + t.slice(1));
    if (section) section.classList.add("hidden");
    if (tabBtn) tabBtn.classList.remove("active");
  }

  const selectedSection = document.getElementById(sections[tab]);
  const selectedTabBtn = document.getElementById("tab" + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (selectedSection) selectedSection.classList.remove("hidden");
  if (selectedTabBtn) selectedTabBtn.classList.add("active");

  switch (tab) {
    case "posts": loadPosts(); break;
    case "users": loadUsers(); break;
    case "dms": loadDMs(); break;
    case "updates": loadUpdates(); break;
    case "suggestions": loadSuggestions(); break;
    case "games": break; // games are static for now
  }
}

// ================= LOGIN / REGISTER =================
function initLoginRegister() {
  const toggleToLogin = document.getElementById("toggleToLogin");
  const toggleToRegister = document.getElementById("toggleToRegister");

  if (toggleToLogin) toggleToLogin.onclick = () => {
    document.getElementById("registerBox").classList.add("hidden");
    document.getElementById("loginBox").classList.remove("hidden");
  };
  if (toggleToRegister) toggleToRegister.onclick = () => {
    document.getElementById("loginBox").classList.add("hidden");
    document.getElementById("registerBox").classList.remove("hidden");
  };

  document.getElementById("registerBtn").onclick = register;
  document.getElementById("loginBtn").onclick = login;
  document.getElementById("logoutBtn").onclick = logout;

  auth.onAuthStateChanged(user => {
    if (user) loginUser(user);
  });
}

// ================= AUTH FUNCTIONS =================
async function register() {
  const email = document.getElementById("regEmail").value;
  const pass = document.getElementById("regPass").value;
  const username = document.getElementById("regUsername").value;
  if (!email || !pass || !username) return alert("All fields required");

  const snap = await db.collection("users").where("username", "==", username).get();
  if (!snap.empty) return alert("Username taken");

  try {
    const userCred = await auth.createUserWithEmailAndPassword(email, pass);
    await db.collection("users").doc(userCred.user.uid).set({
      username,
      email,
      joinDate: Date.now(),
      banned: false,
      moderator: false,
      warnings: 0,
      coins: 0,
      lastUsernameChange: 0
    });
    loginUser(userCred.user);
  } catch (e) {
    alert(e.message);
  }
}

async function login() {
  const email = document.getElementById("logEmail").value;
  const pass = document.getElementById("logPass").value;
  if (!email || !pass) return alert("Enter email and password");
  try {
    const userCred = await auth.signInWithEmailAndPassword(email, pass);
    loginUser(userCred.user);
  } catch (e) {
    alert(e.message);
  }
}

async function logout() {
  await auth.signOut();
  currentUser = null;
  currentUsername = "";
  isOwner = false;
  isModerator = false;
  document.getElementById("forum").classList.add("hidden");
  document.getElementById("box").classList.remove("hidden");
}

async function loginUser(user) {
  currentUser = user;
  const userDoc = await db.collection("users").doc(user.uid).get();
  if (!userDoc.exists) return;
  const data = userDoc.data();
  if (data.banned) {
    alert("You are banned");
    await auth.signOut();
    return;
  }
  currentUsername = data.username;
  isModerator = data.moderator || false;
  isOwner = (user.email === "d29510713@gmail.com");

  document.getElementById("box").classList.add("hidden");
  document.getElementById("forum").classList.remove("hidden");
  if (isOwner || isModerator) document.getElementById("ownerControls").classList.remove("hidden");

  loadPosts();
  loadUsers();
  loadDMs();
  loadUpdates();
  loadSuggestions();
}

// ================= DAILY COINS =================
function initDailyCoins() {
  const coinsDisplay = document.getElementById("coinDisplay");
  const dailyCoinsBtn = document.getElementById("claimDailyCoins");

  async function updateCoinsDisplay() {
    if (!currentUser || !coinsDisplay) return;
    const userDoc = await db.collection("users").doc(currentUser.uid).get();
    if (userDoc.exists) coinsDisplay.textContent = `🪙 Coins: ${userDoc.data().coins || 0}`;
  }

  window.claimDailyCoins = async function () {
    if (!currentUser) return alert("Log in first!");
    const userRef = db.collection("users").doc(currentUser.uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return;

    const data = userDoc.data();
    const lastClaim = data.lastDailyClaim || 0;
    const now = Date.now();
    if (now - lastClaim < 24 * 60 * 60 * 1000) {
      const remaining = 24 * 60 * 60 * 1000 - (now - lastClaim);
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      return alert(`Already claimed! Come back in ${hours}h ${minutes}m.`);
    }

    const reward = Math.floor(Math.random() * 51) + 50;
    await userRef.update({ coins: (data.coins || 0) + reward, lastDailyClaim: now });
    alert(`You received ${reward} coins!`);
    updateCoinsDisplay();
  };

  if (dailyCoinsBtn) dailyCoinsBtn.onclick = claimDailyCoins;
  auth.onAuthStateChanged(user => { currentUser = user; if (currentUser) updateCoinsDisplay(); });
}

// ================= POSTS =================
async function loadPosts() {
  const postsContainer = document.getElementById("postsList");
  if (!postsContainer) return;
  postsContainer.innerHTML = "";
  const snapshot = await db.collection("posts").orderBy("timestamp", "desc").get();
  snapshot.forEach(doc => {
    const post = doc.data();
    if (post.deleted) return;
    const div = document.createElement("div");
    div.className = "post";
    div.innerHTML = `
      <strong>${post.author}</strong>: ${post.text}
      ${isOwner || isModerator ? `<button onclick="deletePost('${doc.id}')">Delete</button>` : ""}
      <div id="comments-${doc.id}"></div>
      <input placeholder="Comment" id="commentInput-${doc.id}"/>
      <button onclick="addComment('${doc.id}')">Post Comment</button>
    `;
    postsContainer.appendChild(div);
    loadComments(doc.id);
  });
}

// Comments
async function loadComments(postId) {
  const commentsContainer = document.getElementById(`comments-${postId}`);
  if (!commentsContainer) return;
  commentsContainer.innerHTML = "";
  const snapshot = await db.collection("posts").doc(postId).collection("comments").orderBy("timestamp").get();
  snapshot.forEach(doc => {
    const c = doc.data();
    if (c.deleted) return;
    const div = document.createElement("div");
    div.className = "comment";
    div.innerHTML = `<strong>${c.author}</strong>: ${c.text}
      ${(isOwner || isModerator) ? `<button onclick="deleteComment('${postId}','${doc.id}')">Delete</button>` : ""}`;
    commentsContainer.appendChild(div);
  });
}

// ================= USERS =================
async function loadUsers() {
  const usersContainer = document.getElementById("usersList");
  if (!usersContainer) return;
  usersContainer.innerHTML = "";
  const snapshot = await db.collection("users").get();
  snapshot.forEach(doc => {
    const u = doc.data();
    const div = document.createElement("div");
    div.innerHTML = `${u.username} ${u.moderator ? "(Mod)" : ""} ${u.banned ? "(Banned)" : ""} 
      ${isOwner && u.email !== currentUser.email ? `<button onclick="banUser('${doc.id}')">Ban</button>` : ""}`;
    usersContainer.appendChild(div);
  });
}

// ================= DMS =================
async function loadDMs() {
  const dmsContainer = document.getElementById("dmsList");
  if (!dmsContainer) return;
  dmsContainer.innerHTML = "";
  const snapshot = await db.collection("dms").where("participants", "array-contains", currentUser.uid).orderBy("timestamp","desc").get();
  snapshot.forEach(async doc => {
    const dm = doc.data();
    const otherUid = dm.participants.find(uid => uid !== currentUser.uid);
    const userDoc = await db.collection("users").doc(otherUid).get();
    const otherUsername = userDoc.exists ? userDoc.data().username : "Unknown";
    const div = document.createElement("div");
    div.className = "dm";
    div.innerHTML = `<strong>DM with ${otherUsername}</strong>: ${dm.lastMessage}`;
    dmsContainer.appendChild(div);
  });
}

// ================= UPDATES =================
async function loadUpdates() {
  const updatesContainer = document.getElementById("updatesList");
  if (!updatesContainer) return;
  updatesContainer.innerHTML = "";
  const snapshot = await db.collection("updates").orderBy("timestamp","desc").get();
  snapshot.forEach(doc => {
    const u = doc.data();
    const div = document.createElement("div");
    div.innerHTML = `<strong>${u.title}</strong>: ${u.text}`;
    updatesContainer.appendChild(div);
  });
}

// ================= SUGGESTIONS =================
async function loadSuggestions() {
  const suggestionsContainer = document.getElementById("suggestionsList");
  if (!suggestionsContainer) return;
  suggestionsContainer.innerHTML = "";
  const snapshot = await db.collection("suggestions").orderBy("timestamp","desc").get();
  snapshot.forEach(doc => {
    const s = doc.data();
    const div = document.createElement("div");
    div.innerHTML = `<strong>${s.title}</strong> by ${s.author}: ${s.description}`;
    suggestionsContainer.appendChild(div);
  });
}

// ================= PLINKO GAME =================
function playPlinko() {
  if (!currentUser) return alert("Log in first!");
  const bet = parseInt(document.getElementById("plinkoBet").value);
  if (isNaN(bet) || bet < 10) return alert("Minimum bet 10 coins!");

  db.collection("users").doc(currentUser.uid).get().then(doc => {
    const coins = doc.data().coins || 0;
    if (coins < bet) return alert("Not enough coins!");

    const slots = [5,2,1,0.5,1,2,5];
    const result = slots[Math.floor(Math.random()*slots.length)];
    const winnings = Math.floor(bet * result);

    db.collection("users").doc(currentUser.uid).update({ coins: coins - bet + winnings });
    document.getElementById("plinkoBoard").innerHTML = `You landed a ${result}x! You won ${winnings} coins.`;
  });
}
