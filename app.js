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
  const tabs = ["posts", "users", "dms", "updates", "suggestions", "games", "leaderboard"];
  tabs.forEach(tab => {
    const tabBtn = document.getElementById("tab" + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (tabBtn) tabBtn.onclick = () => showTab(tab);
  });
}

function showTab(tab) {
  const allSections = ["posts", "users", "dms", "updates", "suggestions", "games", "leaderboard"];
  allSections.forEach(t => {
    const section = document.getElementById(t + "Section");
    const tabBtn = document.getElementById("tab" + t.charAt(0).toUpperCase() + t.slice(1));
    if (section) section.classList.add("hidden");
    if (tabBtn) tabBtn.classList.remove("active");
  });
  const selectedSection = document.getElementById(tab + "Section");
  const selectedTab = document.getElementById("tab" + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (selectedSection) selectedSection.classList.remove("hidden");
  if (selectedTab) selectedTab.classList.add("active");

  // Load content dynamically
  if (tab === "posts") loadPosts();
  if (tab === "users") loadUsers();
  if (tab === "dms") loadDMs();
  if (tab === "updates") loadUpdates();
  if (tab === "suggestions") loadSuggestions();
  if (tab === "leaderboard") loadLeaderboard();
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
      lastDailyClaim: 0
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
  loadLeaderboard();
  showTab("posts");
}

// ================= DAILY COINS =================
function initDailyCoins() {
  const coinsDisplay = document.getElementById("coinDisplay");

  async function updateCoinsDisplay() {
    if (!currentUser) return;
    const userDoc = await db.collection("users").doc(currentUser.uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      coinsDisplay.textContent = `🪙 ${data.coins || 0} Coins`;
    }
  }

  window.claimDailyCoins = async function () {
    if (!currentUser) return alert("Log in first!");
    const userRef = db.collection("users").doc(currentUser.uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return;
    const userData = userDoc.data();

    const lastClaim = userData.lastDailyClaim || 0;
    const now = Date.now();
    if (now - lastClaim < 24 * 60 * 60 * 1000) {
      const remaining = 24 * 60 * 60 * 1000 - (now - lastClaim);
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      alert(`Already claimed! Come back in ${hours}h ${minutes}m.`);
      return;
    }

    const reward = Math.floor(Math.random() * 51) + 50;
    await userRef.update({
      coins: (userData.coins || 0) + reward,
      lastDailyClaim: now
    });

    alert(`You received ${reward} coins!`);
    updateCoinsDisplay();
  };

  auth.onAuthStateChanged(user => {
    currentUser = user;
    if (currentUser) updateCoinsDisplay();
  });
}

// ================= POSTS =================
async function loadPosts() {
  const container = document.getElementById("postsList");
  if (!container) return;
  container.innerHTML = "";
  const snapshot = await db.collection("posts").orderBy("timestamp", "desc").get();
  snapshot.forEach(doc => {
    const post = doc.data();
    const div = document.createElement("div");
    div.className = "post";
    div.innerHTML = `
      <strong>${post.author}</strong>: ${post.content || post.text || "No content"}<br>
      ${post.imageUrl ? `<img src="${post.imageUrl}" style="max-width:200px; display:block; margin:5px 0;">` : ""}
    `;
    container.appendChild(div);
  });
}

// ================= USERS =================
async function loadUsers() {
  const container = document.getElementById("usersList");
  if (!container) return;
  container.innerHTML = "";
  const snapshot = await db.collection("users").get();
  snapshot.forEach(doc => {
    const u = doc.data();
    const div = document.createElement("div");
    div.textContent = `${u.username} ${u.moderator ? "(Mod)" : ""}`;
    container.appendChild(div);
  });
}

// ================= DMS =================
async function loadDMs() {
  const container = document.getElementById("dmsList");
  if (!container) return;
  container.innerHTML = "";
  const snapshot = await db.collection("dms").where("participants", "array-contains", currentUser.uid).orderBy("timestamp", "desc").get();
  snapshot.forEach(doc => {
    const dm = doc.data();
    const otherUser = dm.participants.filter(uid => uid !== currentUser.uid)[0];
    const div = document.createElement("div");
    div.textContent = `DM with ${otherUser}: ${dm.lastMessage}`;
    container.appendChild(div);
  });
}

// ================= UPDATES =================
async function loadUpdates() {
  const container = document.getElementById("updatesList");
  if (!container) return;
  container.innerHTML = "";
  const snapshot = await db.collection("updates").orderBy("timestamp", "desc").get();
  snapshot.forEach(doc => {
    const u = doc.data();
    const div = document.createElement("div");
    div.innerHTML = `<strong>${u.title}</strong>: ${u.text}`;
    container.appendChild(div);
  });
}

// ================= SUGGESTIONS =================
async function loadSuggestions() {
  const container = document.getElementById("suggestionsList");
  if (!container) return;
  container.innerHTML = "";
  const snapshot = await db.collection("suggestions").orderBy("timestamp", "desc").get();
  snapshot.forEach(doc => {
    const s = doc.data();
    const div = document.createElement("div");
    div.innerHTML = `<strong>${s.title}</strong>: ${s.description}`;
    container.appendChild(div);
  });
}

// ================= LEADERBOARD =================
async function loadLeaderboard() {
  const container = document.getElementById("leaderboardList");
  if (!container) return;
  container.innerHTML = "";
  const snapshot = await db.collection("users").orderBy("coins", "desc").limit(10).get();
  snapshot.forEach(doc => {
    const u = doc.data();
    const div = document.createElement("div");
    div.textContent = `${u.username}: ${u.coins || 0} 🪙`;
    container.appendChild(div);
  });
}

// ================= PLINKO GAME =================
function playPlinko() {
  const board = document.getElementById("plinkoBoard");
  board.innerHTML = ""; // clear previous
  const ball = document.createElement("div");
  ball.style.position = "absolute";
  ball.style.top = "0px";
  ball.style.left = Math.random() * (board.offsetWidth - 20) + "px";
  ball.style.width = "20px";
  ball.style.height = "20px";
  ball.style.borderRadius = "50%";
  ball.style.background = "#ffd700";
  ball.style.transition = "top 2s ease, left 2s ease";
  board.appendChild(ball);

  // Simulate bouncing
  setTimeout(() => {
    const slots = [0.05, 0.2, 0.5, 0.8, 0.95]; // relative positions
    const rand = slots[Math.floor(Math.random() * slots.length)];
    ball.style.top = board.offsetHeight - 20 + "px";
    ball.style.left = board.offsetWidth * rand + "px";
  }, 50);
}

// ================= WINDOW ONLOAD =================
window.onload = function () {
  initStars();
  initTabs();
  initLoginRegister();
  initDailyCoins();
};
