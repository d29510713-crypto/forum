// ================== FIREBASE INIT ==================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.24.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/9.24.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.24.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.24.0/firebase-storage.js";

// ================== CONFIG ==================
const firebaseConfig = {
  apiKey: "AIzaSyA1FwweYw4MOz5My0aCfbRv-xrduCTl8z0",
  authDomain: "toasty-89f07.firebaseapp.com",
  projectId: "toasty-89f07",
  storageBucket: "toasty-89f07.appspot.com",
  messagingSenderId: "743787667064",
  appId: "1:743787667064:web:12284120fbbdd1e907d78d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ================== DOM ELEMENTS ==================
const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const authPanel = document.getElementById("auth-panel");
const forumContainer = document.getElementById("forum-container");

const registerBtn = document.getElementById("register-btn");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");

// Posts
const postContent = document.getElementById("post-content");
const postCategory = document.getElementById("post-category");
const submitPostBtn = document.getElementById("submit-post-btn");
const postsList = document.getElementById("posts-list");
const postImage = document.getElementById("post-image");

// Suggestions
const suggestionTitle = document.getElementById("suggestion-title");
const suggestionDescription = document.getElementById("suggestion-description");
const submitSuggestionBtn = document.getElementById("submit-suggestion-btn");
const suggestionsList = document.getElementById("suggestions-list");

// Users
const usersList = document.getElementById("users-list");
const searchUsersInput = document.getElementById("search-users");

// Leaderboard
const leaderboardList = document.getElementById("leaderboard-list");

// Tabs
const tabs = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

// Plinko
const dropPlinkoBallBtn = document.getElementById("drop-plinko-ball");
const plinkoCanvas = document.getElementById("plinko-canvas");
const ctx = plinkoCanvas?.getContext("2d");

// ================== AUTH ==================
registerBtn?.addEventListener("click", async () => {
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  const username = document.getElementById("register-username").value;

  if (!email || !password || !username) return alert("Fill all fields");

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);

    // Save user in Firestore
    await setDoc(doc(db, "users", userCredential.user.uid), {
      email,
      username,
      timestamp: Date.now()
    });

    alert("Registered! Check your email for verification.");
  } catch (err) {
    alert(err.message);
  }
});

loginBtn?.addEventListener("click", async () => {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!userCredential.user.emailVerified) {
      alert("Please verify your email before logging in.");
      await signOut(auth);
      return;
    }
  } catch (err) {
    alert(err.message);
  }
});

logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
});

// Show/Hide Forms
document.getElementById("show-login")?.addEventListener("click", () => {
  registerForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
});
document.getElementById("show-register")?.addEventListener("click", () => {
  loginForm.classList.add("hidden");
  registerForm.classList.remove("hidden");
});

// ================== AUTH STATE ==================
onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    authPanel.classList.add("hidden");
    forumContainer.classList.remove("hidden");

    subscribePosts();
    subscribeSuggestions();
    subscribeUsers();
    subscribeLeaderboard();
  } else {
    authPanel.classList.remove("hidden");
    forumContainer.classList.add("hidden");
  }
});

// ================== POSTS ==================
submitPostBtn?.addEventListener("click", async () => {
  const content = postContent.value;
  const category = postCategory.value;
  let imageUrl = "";

  if (!content) return alert("Post content is required.");

  if (postImage.files.length > 0) {
    const file = postImage.files[0];
    const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    imageUrl = await getDownloadURL(storageRef);
  }

  await addDoc(collection(db, "posts"), {
    content,
    category,
    imageUrl,
    timestamp: Date.now(),
    author: auth.currentUser.email
  });

  postContent.value = "";
  postImage.value = "";
});

// ================== REAL-TIME POSTS ==================
function subscribePosts() {
  const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
  onSnapshot(q, (snapshot) => {
    postsList.innerHTML = "";
    snapshot.forEach(doc => {
      const p = doc.data();
      const div = document.createElement("div");
      div.className = "post-card";
      div.innerHTML = `
        <p><strong>${p.author}</strong> (${p.category})</p>
        <p>${p.content}</p>
        ${p.imageUrl ? `<img src="${p.imageUrl}" class="post-image">` : ""}
      `;
      postsList.appendChild(div);
    });
  });
}

// ================== SUGGESTIONS ==================
submitSuggestionBtn?.addEventListener("click", async () => {
  const title = suggestionTitle.value;
  const desc = suggestionDescription.value;

  if (!title || !desc) return alert("Fill all fields");

  await addDoc(collection(db, "suggestions"), {
    title,
    description: desc,
    timestamp: Date.now(),
    author: auth.currentUser.email
  });

  suggestionTitle.value = "";
  suggestionDescription.value = "";
});

function subscribeSuggestions() {
  const q = query(collection(db, "suggestions"), orderBy("timestamp", "desc"));
  onSnapshot(q, (snapshot) => {
    suggestionsList.innerHTML = "";
    snapshot.forEach(doc => {
      const s = doc.data();
      const div = document.createElement("div");
      div.className = "suggestion-card";
      div.innerHTML = `<p><strong>${s.author}</strong>: ${s.title}</p><p>${s.description}</p>`;
      suggestionsList.appendChild(div);
    });
  });
}

// ================== USERS ==================
function subscribeUsers() {
  const q = query(collection(db, "users"), orderBy("timestamp", "asc"));
  onSnapshot(q, (snapshot) => {
    const term = searchUsersInput.value.toLowerCase();
    usersList.innerHTML = "";
    snapshot.forEach(doc => {
      const u = doc.data();
      if (!term || u.username.toLowerCase().includes(term)) {
        const div = document.createElement("div");
        div.className = "user-card";
        div.textContent = `${u.username} (${u.email})`;
        usersList.appendChild(div);
      }
    });
  });
}

searchUsersInput?.addEventListener("input", subscribeUsers);

// ================== LEADERBOARD ==================
function subscribeLeaderboard() {
  const postsCol = collection(db, "posts");
  const suggestionsCol = collection(db, "suggestions");

  onSnapshot(postsCol, (postsSnap) => {
    onSnapshot(suggestionsCol, (suggSnap) => {
      const scores = {};

      postsSnap.forEach(doc => {
        const a = doc.data().author;
        scores[a] = (scores[a] || 0) + 1;
      });
      suggSnap.forEach(doc => {
        const a = doc.data().author;
        scores[a] = (scores[a] || 0) + 1;
      });

      const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
      leaderboardList.innerHTML = "";
      sorted.forEach(([user, score], i) => {
        const div = document.createElement("div");
        div.className = "leaderboard-card";
        div.textContent = `${i + 1}. ${user} - ${score} points`;
        leaderboardList.appendChild(div);
      });
    });
  });
}

// ================== TABS ==================
tabs.forEach(tab => {
  tab.onclick = () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    tabContents.forEach(tc => {
      tc.id === `${target}-section` ? tc.classList.add("active") : tc.classList.remove("active");
    });
  };
});

// ================== PLINKO ==================
if (plinkoCanvas && dropPlinkoBallBtn) {
  const ballRadius = 10;
  function dropBall() {
    let x = plinkoCanvas.width / 2;
    let y = 0;
    const interval = setInterval(() => {
      y += 5;
      x += Math.random() < 0.5 ? -5 : 5;

      ctx.clearRect(0, 0, plinkoCanvas.width, plinkoCanvas.height);
      ctx.beginPath();
      ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
      ctx.fillStyle = "red";
      ctx.fill();
      ctx.closePath();

      if (y >= plinkoCanvas.height - 20) {
        clearInterval(interval);
        let reward = 0;
        if (x < plinkoCanvas.width / 3) reward = 1;
        else if (x < 2 * plinkoCanvas.width / 3) reward = 5;
        else reward = 10;
        alert(`You earned ${reward} coins!`);
      }
    }, 30);
  }

  dropPlinkoBallBtn.onclick = dropBall;
}
