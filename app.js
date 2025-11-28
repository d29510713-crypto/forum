// ================== FIREBASE INIT ==================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA1FwweYw4MOz5My0aCfbRv-xrduCTl8z0",
  authDomain: "toasty-89f07.firebaseapp.com",
  projectId: "toasty-89f07",
  storageBucket: "toasty-89f07.appspot.com",
  messagingSenderId: "743787667064",
  appId: "1:743787667064:web:12284120fbbdd1e907d78d",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================== DOM ELEMENTS ==================
const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const authPanel = document.getElementById("auth-panel");
const forumContainer = document.getElementById("forum-container");

const showLoginBtn = document.getElementById("show-login");
const showRegisterBtn = document.getElementById("show-register");

const registerEmail = document.getElementById("register-email");
const registerPassword = document.getElementById("register-password");
const registerUsername = document.getElementById("register-username");
const registerBtn = document.getElementById("register-btn");

const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");

// Posts
const postsList = document.getElementById("posts-list");
const submitPostBtn = document.getElementById("submit-post-btn");
const postContentInput = document.getElementById("post-content");
const postCategoryInput = document.getElementById("post-category");

// Suggestions
const suggestionsList = document.getElementById("suggestions-list");
const submitSuggestionBtn = document.getElementById("submit-suggestion-btn");
const suggestionTitleInput = document.getElementById("suggestion-title");
const suggestionDescInput = document.getElementById("suggestion-description");

// Users
const usersList = document.getElementById("users-list");

// Leaderboard
const leaderboardList = document.getElementById("leaderboard-list");

// Plinko
const plinkoCanvas = document.getElementById("plinko-canvas");
const dropPlinkoBtn = document.getElementById("drop-plinko-ball");
let coins = 0;

// Updates
const updatesList = document.getElementById("updates-list");
const updateTitleInput = document.getElementById("update-title");
const updateContentInput = document.getElementById("update-content");
const postUpdateBtn = document.getElementById("post-update-btn");

// ================== SWITCH FORMS ==================
showLoginBtn.onclick = () => {
  registerForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
};
showRegisterBtn.onclick = () => {
  loginForm.classList.add("hidden");
  registerForm.classList.remove("hidden");
};

// ================== REGISTER ==================
registerBtn.onclick = async () => {
  const email = registerEmail.value;
  const password = registerPassword.value;
  const username = registerUsername.value;

  if (!email || !password || !username) {
    alert("All fields required!");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await sendEmailVerification(user);

    // Add user to users collection
    await addDoc(collection(db, "users"), {
      email: user.email,
      username,
      timestamp: serverTimestamp(),
      coins: 0,
    });

    alert("Account created! Please verify your email.");
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
  } catch (error) {
    alert(error.message);
  }
};

// ================== LOGIN ==================
loginBtn.onclick = async () => {
  const email = loginEmail.value;
  const password = loginPassword.value;

  if (!email || !password) {
    alert("Email and password required!");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (!user.emailVerified) {
      alert("Please verify your email first!");
      return;
    }

    authPanel.classList.add("hidden");
    forumContainer.classList.remove("hidden");

    loadPosts();
    loadSuggestions();
    loadUsers();
    loadLeaderboard();
    loadUpdates();
  } catch (error) {
    alert(error.message);
  }
};

// ================== LOGOUT ==================
logoutBtn.onclick = () => {
  signOut(auth).then(() => {
    forumContainer.classList.add("hidden");
    authPanel.classList.remove("hidden");
  });
};

// ================== POSTS ==================
submitPostBtn.onclick = async () => {
  const content = postContentInput.value;
  const category = postCategoryInput.value;
  if (!content) return;

  await addDoc(collection(db, "posts"), {
    author: auth.currentUser.email.split("@")[0],
    content,
    category,
    timestamp: serverTimestamp(),
  });

  postContentInput.value = "";
  loadPosts();
};

async function loadPosts() {
  postsList.innerHTML = "";
  const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => {
    const post = doc.data();
    const div = document.createElement("div");
    div.className = "post-card";
    div.innerHTML = `
      <div style="display:flex;">
        <div style="width:120px; font-weight:bold; color:#0066cc;">${post.author}</div>
        <div style="flex:1;">
          <div>${post.content}</div>
          <div style="font-size:11px; color:#555;">${post.timestamp?.toDate ? post.timestamp.toDate().toLocaleString() : ""}</div>
        </div>
      </div>
    `;
    postsList.appendChild(div);
  });
}

// ================== SUGGESTIONS ==================
submitSuggestionBtn.onclick = async () => {
  const title = suggestionTitleInput.value;
  const description = suggestionDescInput.value;
  if (!title || !description) return;

  await addDoc(collection(db, "suggestions"), {
    author: auth.currentUser.email.split("@")[0],
    title,
    description,
    timestamp: serverTimestamp(),
  });

  suggestionTitleInput.value = "";
  suggestionDescInput.value = "";
  loadSuggestions();
};

async function loadSuggestions() {
  suggestionsList.innerHTML = "";
  const q = query(collection(db, "suggestions"), orderBy("timestamp", "desc"));
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => {
    const sug = doc.data();
    const div = document.createElement("div");
    div.className = "suggestion-card";
    div.innerHTML = `
      <strong>${sug.title}</strong> by ${sug.author}<br>
      <span>${sug.description}</span>
    `;
    suggestionsList.appendChild(div);
  });
}

// ================== USERS ==================
async function loadUsers() {
  usersList.innerHTML = "";
  const snapshot = await getDocs(collection(db, "users"));
  snapshot.forEach(doc => {
    const user = doc.data();
    const div = document.createElement("div");
    div.className = "user-card";
    div.textContent = user.username || user.email;
    usersList.appendChild(div);
  });
}

// ================== LEADERBOARD ==================
async function loadLeaderboard() {
  leaderboardList.innerHTML = "";
  const q = query(collection(db, "users"), orderBy("coins", "desc"));
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => {
    const user = doc.data();
    const div = document.createElement("div");
    div.className = "leaderboard-card";
    div.textContent = `${user.username}: ${user.coins} coins`;
    leaderboardList.appendChild(div);
  });
}

// ================== UPDATES ==================
postUpdateBtn.onclick = async () => {
  const title = updateTitleInput.value;
  const content = updateContentInput.value;
  if (!title || !content) return;

  await addDoc(collection(db, "updates"), {
    title,
    content,
    author: auth.currentUser.email.split("@")[0],
    timestamp: serverTimestamp(),
  });

  updateTitleInput.value = "";
  updateContentInput.value = "";
  loadUpdates();
};

async function loadUpdates() {
  updatesList.innerHTML = "";
  const q = query(collection(db, "updates"), orderBy("timestamp", "desc"));
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => {
    const up = doc.data();
    const div = document.createElement("div");
    div.className = "update-card";
    div.innerHTML = `<strong>${up.title}</strong> by ${up.author}<br>${up.content}`;
    updatesList.appendChild(div);
  });
}

// ================== PLINKO ==================
const ctx = plinkoCanvas.getContext("2d");
const canvasWidth = plinkoCanvas.width;
const canvasHeight = plinkoCanvas.height;

function drawPlinkoBoard() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw pegs
  ctx.fillStyle = "#999";
  for (let y = 50; y < canvasHeight - 50; y += 50) {
    for (let x = 25; x < canvasWidth; x += 50) {
      if (y / 50 % 2 === 0 && x === canvasWidth - 25) continue;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw slots
  ctx.fillStyle = "#444";
  ctx.fillRect(0, canvasHeight - 30, canvasWidth / 3, 30);
  ctx.fillRect(canvasWidth / 3, canvasHeight - 30, canvasWidth / 3, 30);
  ctx.fillRect((canvasWidth / 3) * 2, canvasHeight - 30, canvasWidth / 3, 30);
}
drawPlinkoBoard();

dropPlinkoBtn.onclick = () => {
  const slot = Math.floor(Math.random() * 3);
  let earned = 0;
  if (slot === 0) earned = 1;
  else if (slot === 1) earned = 5;
  else earned = 10;

  coins += earned;
  alert(`You got ${earned} coins! Total: ${coins}`);
  loadLeaderboard();
};
