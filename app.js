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
    s.style.background = "white";
    s.style.position = "absolute";
    s.style.borderRadius = "50%";
    starsContainer.appendChild(s);
  }
}

// ================= TABS =================
function initTabs() {
  const tabs = ["posts", "users", "games"];
  tabs.forEach(tab => {
    const tabBtn = document.getElementById("tab" + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (tabBtn) tabBtn.onclick = () => showTab(tab);
  });
}

function showTab(tab) {
  ["posts", "users", "games"].forEach(t => {
    const section = document.getElementById(t + "Section");
    const tabBtn = document.getElementById("tab" + t.charAt(0).toUpperCase() + t.slice(1));
    if (section) section.classList.add("hidden");
    if (tabBtn) tabBtn.classList.remove("active");
  });

  const selectedSection = document.getElementById(tab + "Section");
  const selectedTab = document.getElementById("tab" + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (selectedSection) selectedSection.classList.remove("hidden");
  if (selectedTab) selectedTab.classList.add("active");

  if (tab === "posts") loadPosts();
  if (tab === "users") loadUsers();
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
      coins: 0,
      moderator: false,
      banned: false,
      joinDate: Date.now()
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
  currentUsername = data.username;
  isModerator = data.moderator || false;
  isOwner = (user.email === "d29510713@gmail.com");

  document.getElementById("box").classList.add("hidden");
  document.getElementById("forum").classList.remove("hidden");

  loadPosts();
  loadUsers();
}

// ================= POSTS =================
async function loadPosts() {
  const postsContainer = document.getElementById("postsContainer");
  if (!postsContainer) return;
  postsContainer.innerHTML = "";

  const snapshot = await db.collection("posts").orderBy("timestamp", "desc").get();
  snapshot.forEach(doc => {
    const post = doc.data();
    if (!post || post.deleted) return;

    const div = document.createElement("div");
    div.className = "post";
    div.innerHTML = `<strong>${post.author || "Unknown"}</strong>: ${post.content || ""}`;
    postsContainer.appendChild(div);
  });
}

async function addPost() {
  const text = document.getElementById("newPostText").value;
  if (!text) return alert("Cannot post empty");
  await db.collection("posts").add({
    author: currentUsername,
    content: text,
    timestamp: Date.now(),
    deleted: false
  });
  document.getElementById("newPostText").value = "";
  loadPosts();
}

// ================= USERS =================
async function loadUsers() {
  const usersContainer = document.getElementById("usersContainer");
  if (!usersContainer) return;
  usersContainer.innerHTML = "";

  const snapshot = await db.collection("users").get();
  snapshot.forEach(doc => {
    const u = doc.data();
    const div = document.createElement("div");
    div.textContent = `${u.username || "Unknown"} ${u.moderator ? "(Mod)" : ""}`;
    usersContainer.appendChild(div);
  });
}

// ================= PLINKO (simplified visual) =================
function playPlinko() {
  const board = document.getElementById("plinkoBoard");
  if (!board) return;
  const ball = document.createElement("div");
  ball.style.width = "20px";
  ball.style.height = "20px";
  ball.style.background = "gold";
  ball.style.borderRadius = "50%";
  ball.style.position = "absolute";
  ball.style.top = "0";
  ball.style.left = Math.random() * (board.clientWidth - 20) + "px";
  board.appendChild(ball);

  let pos = 0;
  const interval = setInterval(() => {
    pos += 5;
    ball.style.top = pos + "px";
    ball.style.left = parseFloat(ball.style.left) + (Math.random() * 20 - 10) + "px";
    if (pos >= board.clientHeight - 20) {
      clearInterval(interval);
    }
  }, 50);
}
