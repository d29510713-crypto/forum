// ================= Firebase v9 Modular Setup =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, addDoc, updateDoc, getDocs, query, where, orderBy, arrayUnion } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

// ================= Firebase Config =================
const firebaseConfig = {
  apiKey: "AIzaSyA1FwweYw4MOz5My0aCfbRv-xrduCTl8z0",
  authDomain: "toasty-89f07.firebaseapp.com",
  projectId: "toasty-89f07",
  storageBucket: "toasty-89f07.appspot.com",
  messagingSenderId: "743787667064",
  appId: "1:743787667064:web:12284120fbbdd1e907d78d"
};

// ================= Initialize =================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ================= GLOBAL VARIABLES =================
let currentUser = null;
let currentUsername = "";
let isOwner = false;
let isModerator = false;

// ================= WINDOW ONLOAD =================
window.onload = () => {
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
  const tabs = ["posts", "users", "dms", "updates", "suggestions", "games"];
  tabs.forEach(tab => {
    const tabBtn = document.getElementById("tab" + capitalize(tab));
    if (tabBtn) tabBtn.onclick = () => showTab(tab);
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function showTab(tab) {
  ["posts", "users", "dms", "updates", "suggestions", "games"].forEach(t => {
    const section = document.getElementById(t + "Section");
    const tabBtn = document.getElementById("tab" + capitalize(t));
    if (section) section.classList.add("hidden");
    if (tabBtn) tabBtn.classList.remove("active");
  });
  const selectedSection = document.getElementById(tab + "Section");
  const selectedTab = document.getElementById("tab" + capitalize(tab));
  if (selectedSection) selectedSection.classList.remove("hidden");
  if (selectedTab) selectedTab.classList.add("active");

  if (tab === "posts") loadPosts();
  if (tab === "users") loadUsers();
  if (tab === "dms") loadDMs();
  if (tab === "updates") loadUpdates();
  if (tab === "suggestions") loadSuggestions();
  if (tab === "games") initPlinko();
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

  onAuthStateChanged(auth, user => {
    if (user) loginUser(user);
  });
}

// ================= AUTH FUNCTIONS =================
async function register() {
  const email = document.getElementById("regEmail").value;
  const pass = document.getElementById("regPass").value;
  const username = document.getElementById("regUsername").value;
  if (!email || !pass || !username) return alert("All fields required");

  const q = query(collection(db, "users"), where("username", "==", username));
  const snap = await getDocs(q);
  if (!snap.empty) return alert("Username taken");

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, "users", userCred.user.uid), {
      username,
      email,
      joinDate: Date.now(),
      banned: false,
      moderator: false,
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
    const userCred = await signInWithEmailAndPassword(auth, email, pass);
    loginUser(userCred.user);
  } catch (e) {
    alert(e.message);
  }
}

async function logout() {
  await signOut(auth);
  currentUser = null;
  currentUsername = "";
  isOwner = false;
  isModerator = false;
  document.getElementById("forum").classList.add("hidden");
  document.getElementById("box").classList.remove("hidden");
}

async function loginUser(user) {
  currentUser = user;
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists()) return;
  const data = userDoc.data();
  if (data.banned) {
    alert("You are banned");
    await signOut(auth);
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
  initPlinko();
}

// ================= POSTS =================
async function loadPosts() {
  const container = document.getElementById("postsList");
  if (!container) return;
  container.innerHTML = "";

  const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
  const snapshot = await getDocs(q);

  snapshot.forEach(docSnap => {
    const post = docSnap.data();
    const div = document.createElement("div");
    div.className = "post";
    div.innerHTML = `
      <strong>${post.author || "Unknown"}</strong>: ${post.content || ""}
      ${post.imageUrl ? `<br><img src="${post.imageUrl}" style="max-width:200px; margin-top:5px;">` : ""}
    `;
    container.appendChild(div);
  });
}

// ================= PLINKO =================
function initPlinko() {
  const board = document.getElementById("plinkoBoard");
  if (!board) return;
  board.innerHTML = "";
  const ball = document.createElement("div");
  ball.style.position = "absolute";
  ball.style.top = "0";
  ball.style.left = "50%";
  ball.style.width = "20px";
  ball.style.height = "20px";
  ball.style.background = "yellow";
  ball.style.borderRadius = "50%";
  ball.style.transition = "top 1s ease-in, left 1s ease-in";
  board.appendChild(ball);

  ball.onclick = () => {
    let left = Math.random() * (board.clientWidth - 20);
    ball.style.left = left + "px";
    ball.style.top = board.clientHeight - 20 + "px";
  };
}
