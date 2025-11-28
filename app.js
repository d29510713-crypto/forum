// ================== FIREBASE INIT ==================
const firebaseConfig = {
  apiKey: "AIzaSyA1FwweYw4MOz5My0aCfbRv-xrduCTl8z0",
  authDomain: "toasty-89f07.firebaseapp.com",
  projectId: "toasty-89f07",
  storageBucket: "toasty-89f07.appspot.com",
  messagingSenderId: "743787667064",
  appId: "1:743787667064:web:12284120fbbdd1e907d78d",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

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
registerBtn.onclick = () => {
  const email = registerEmail.value;
  const password = registerPassword.value;
  const username = registerUsername.value;

  if (!email || !password || !username) {
    alert("All fields required!");
    return;
  }

  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      user.sendEmailVerification();

      db.collection("users").add({
        email: user.email,
        username: username,
        coins: 0,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });

      alert("Account created! Please verify your email.");
      registerForm.classList.add("hidden");
      loginForm.classList.remove("hidden");
    })
    .catch((error) => {
      alert(error.message);
    });
};

// ================== LOGIN ==================
loginBtn.onclick = () => {
  const email = loginEmail.value;
  const password = loginPassword.value;

  if (!email || !password) {
    alert("Email and password required!");
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
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
    })
    .catch((error) => {
      alert(error.message);
    });
};

// ================== LOGOUT ==================
logoutBtn.onclick = () => {
  auth.signOut().then(() => {
    forumContainer.classList.add("hidden");
    authPanel.classList.remove("hidden");
  });
};

// ================== POSTS ==================
submitPostBtn.onclick = () => {
  const content = postContentInput.value;
  const category = postCategoryInput.value;
  if (!content) return;

  db.collection("posts").add({
    author: auth.currentUser.email.split("@")[0],
    content: content,
    category: category,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
  });

  postContentInput.value = "";
  loadPosts();
};

function loadPosts() {
  postsList.innerHTML = "";
  db.collection("posts").orderBy("timestamp", "desc").get().then((snapshot) => {
    snapshot.forEach((doc) => {
      const post = doc.data();
      const div = document.createElement("div");
      div.className = "post-card";
      div.innerHTML = `
        <div style="display:flex;">
          <div style="width:120px; font-weight:bold; color:#00ccff;">${post.author}</div>
          <div style="flex:1;">
            <div>${post.content}</div>
            <div style="font-size:11px; color:#888;">${post.timestamp ? post.timestamp.toDate().toLocaleString() : ""}</div>
          </div>
        </div>
      `;
      postsList.appendChild(div);
    });
  });
}

// ================== SUGGESTIONS ==================
submitSuggestionBtn.onclick = () => {
  const title = suggestionTitleInput.value;
  const description = suggestionDescInput.value;
  if (!title || !description) return;

  db.collection("suggestions").add({
    author: auth.currentUser.email.split("@")[0],
    title,
    description,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
  });

  suggestionTitleInput.value = "";
  suggestionDescInput.value = "";
  loadSuggestions();
};

function loadSuggestions() {
  suggestionsList.innerHTML = "";
  db.collection("suggestions").orderBy("timestamp", "desc").get().then((snapshot) => {
    snapshot.forEach((doc) => {
      const sug = doc.data();
      const div = document.createElement("div");
      div.className = "suggestion-card";
      div.innerHTML = `<strong>${sug.title}</strong> by ${sug.author}<br>${sug.description}`;
      suggestionsList.appendChild(div);
    });
  });
}

// ================== USERS ==================
function loadUsers() {
  usersList.innerHTML = "";
  db.collection("users").get().then((snapshot) => {
    snapshot.forEach((doc) => {
      const user = doc.data();
      const div = document.createElement("div");
      div.className = "user-card";
      div.textContent = user.username || user.email;
      usersList.appendChild(div);
    });
  });
}

// ================== LEADERBOARD ==================
function loadLeaderboard() {
  leaderboardList.innerHTML = "";
  db.collection("users").orderBy("coins", "desc").get().then((snapshot) => {
    snapshot.forEach((doc) => {
      const user = doc.data();
      const div = document.createElement("div");
      div.className = "leaderboard-card";
      div.textContent = `${user.username}: ${user.coins} coins`;
      leaderboardList.appendChild(div);
    });
  });
}

// ================== UPDATES ==================
postUpdateBtn.onclick = () => {
  const title = updateTitleInput.value;
  const content = updateContentInput.value;
  if (!title || !content) return;

  db.collection("updates").add({
    title,
    content,
    author: auth.currentUser.email.split("@")[0],
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
  });

  updateTitleInput.value = "";
  updateContentInput.value = "";
  loadUpdates();
};

function loadUpdates() {
  updatesList.innerHTML = "";
  db.collection("updates").orderBy("timestamp", "desc").get().then((snapshot) => {
    snapshot.forEach((doc) => {
      const up = doc.data();
      const div = document.createElement("div");
      div.className = "update-card";
      div.innerHTML = `<strong>${up.title}</strong> by ${up.author}<br>${up.content}`;
      updatesList.appendChild(div);
    });
  });
}

// ================== PLINKO ==================
const ctx = plinkoCanvas.getContext("2d");
const canvasWidth = plinkoCanvas.width;
const canvasHeight = plinkoCanvas.height;

function drawPlinkoBoard() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = "#666";
  for (let y = 50; y < canvasHeight - 50; y += 50) {
    for (let x = 25; x < canvasWidth; x += 50) {
      if (y / 50 % 2 === 0 && x === canvasWidth - 25) continue;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = "#222";
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
