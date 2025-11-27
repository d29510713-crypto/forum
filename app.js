// ================= Firebase v8 Configuration =================
const firebaseConfig = {
  apiKey: "AIzaSyA1FwweYw4MOz5My0aCfbRv-xrduCTl8z0",
  authDomain: "toasty-89f07.firebaseapp.com",
  projectId: "toasty-89f07",
  storageBucket: "toasty-89f07.appspot.com",
  messagingSenderId: "743787667064",
  appId: "1:743787667064:web:12284120fbbdd1e907d78d"
};

// ================= Initialize Firebase =================
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

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

// ================= STARS ANIMATION =================
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
    const tabBtn = document.getElementById("tab" + capitalize(tab));
    if (tabBtn) tabBtn.onclick = () => showTab(tab);
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function showTab(tab) {
  const allTabs = ["posts", "users", "dms", "updates", "suggestions", "games", "leaderboard"];
  allTabs.forEach(t => {
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
  if (tab === "leaderboard") loadLeaderboard();
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

  const registerBtn = document.getElementById("registerBtn");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  
  if (registerBtn) registerBtn.onclick = register;
  if (loginBtn) loginBtn.onclick = login;
  if (logoutBtn) logoutBtn.onclick = logout;

  auth.onAuthStateChanged(user => {
    if (user) {
      loginUser(user);
    } else {
      console.log("No user signed in");
    }
  });
}

// ================= AUTH FUNCTIONS =================
async function register() {
  const email = document.getElementById("regEmail").value;
  const pass = document.getElementById("regPass").value;
  const username = document.getElementById("regUsername").value;
  
  if (!email || !pass || !username) return alert("All fields required");

  try {
    // Check if username exists
    const usernameQuery = await db.collection("users").where("username", "==", username).get();
    if (!usernameQuery.empty) return alert("Username taken");

    // Create user
    const userCred = await auth.createUserWithEmailAndPassword(email, pass);
    
    // Save user data
    await db.collection("users").doc(userCred.user.uid).set({
      username,
      email,
      joinDate: Date.now(),
      banned: false,
      moderator: false,
      coins: 0,
      lastDailyClaim: 0
    });
    
    console.log("Registration successful");
  } catch (e) {
    console.error("Registration error:", e);
    alert("Registration failed: " + e.message);
  }
}

async function login() {
  const email = document.getElementById("logEmail").value;
  const pass = document.getElementById("logPass").value;
  
  if (!email || !pass) return alert("Enter email and password");
  
  try {
    await auth.signInWithEmailAndPassword(email, pass);
    console.log("Login successful");
  } catch (e) {
    console.error("Login error:", e);
    alert("Login failed: " + e.message);
  }
}

async function logout() {
  try {
    await auth.signOut();
    currentUser = null;
    currentUsername = "";
    isOwner = false;
    isModerator = false;
    document.getElementById("forum").classList.add("hidden");
    document.getElementById("box").classList.remove("hidden");
  } catch (e) {
    console.error("Logout error:", e);
    alert("Logout failed: " + e.message);
  }
}

async function loginUser(user) {
  try {
    currentUser = user;
    const userDoc = await db.collection("users").doc(user.uid).get();
    
    if (!userDoc.exists) {
      console.error("User document not found");
      return;
    }
    
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

    // Update coin display
    updateCoinDisplay(data.coins || 0);

    loadPosts();
    loadUsers();
    initPlinko();
  } catch (error) {
    console.error("Error in loginUser:", error);
    alert("Error loading user data: " + error.message);
  }
}

// ================= COIN SYSTEM =================
function initDailyCoins() {
  const btn = document.querySelector('button[onclick="claimDailyCoins()"]');
  if (btn) btn.onclick = claimDailyCoins;
}

async function claimDailyCoins() {
  if (!currentUser) return alert("Please login first");
  
  try {
    const userRef = db.collection("users").doc(currentUser.uid);
    const userDoc = await userRef.get();
    const data = userDoc.data();
    
    const now = Date.now();
    const lastClaim = data.lastDailyClaim || 0;
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (now - lastClaim < oneDay) {
      const timeLeft = oneDay - (now - lastClaim);
      const hours = Math.floor(timeLeft / (60 * 60 * 1000));
      return alert(`Come back in ${hours} hours!`);
    }
    
    const newCoins = (data.coins || 0) + 50;
    await userRef.update({
      coins: newCoins,
      lastDailyClaim: now
    });
    
    updateCoinDisplay(newCoins);
    alert("🎉 You claimed 50 coins!");
  } catch (error) {
    console.error("Error claiming coins:", error);
    alert("Error claiming coins: " + error.message);
  }
}

function updateCoinDisplay(coins) {
  const display = document.getElementById("coinDisplay");
  if (display) display.textContent = `🪙 ${coins} Coins`;
}

// ================= POSTS =================
async function loadPosts() {
  const container = document.getElementById("postsList");
  if (!container) return;
  container.innerHTML = "<p>Loading posts...</p>";

  try {
    const snapshot = await db.collection("posts").orderBy("timestamp", "desc").limit(20).get();
    container.innerHTML = "";
    
    if (snapshot.empty) {
      container.innerHTML = "<p>No posts yet. Be the first to post!</p>";
      return;
    }

    snapshot.forEach(doc => {
      const post = doc.data();
      const div = document.createElement("div");
      div.className = "post";
      div.innerHTML = `
        <strong>${post.author || "Unknown"}</strong> - ${post.category || "General"}
        <p>${post.content || ""}</p>
        ${post.imageUrl ? `<img src="${post.imageUrl}" style="max-width:300px; margin-top:5px; border-radius:5px;">` : ""}
        <small>${new Date(post.timestamp).toLocaleString()}</small>
      `;
      container.appendChild(div);
    });
  } catch (error) {
    console.error("Error loading posts:", error);
    container.innerHTML = `<p style="color: red;">Error loading posts. Check console for details.</p>`;
  }
  
  // Setup post button
  const postBtn = document.getElementById("postBtn");
  if (postBtn) postBtn.onclick = createPost;
  
  // Setup image preview
  const imageInput = document.getElementById("postImage");
  if (imageInput) {
    imageInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const preview = document.getElementById("previewImage");
        preview.src = URL.createObjectURL(file);
        preview.classList.remove("hidden");
      }
    };
  }
}

async function createPost() {
  if (!currentUser) return alert("Please login first");
  
  const content = document.getElementById("postContent").value;
  const category = document.getElementById("postCategory").value;
  const imageFile = document.getElementById("postImage").files[0];
  
  if (!content) return alert("Write something first!");
  
  try {
    let imageUrl = null;
    
    if (imageFile) {
      const storageRef = storage.ref(`posts/${Date.now()}_${imageFile.name}`);
      await storageRef.put(imageFile);
      imageUrl = await storageRef.getDownloadURL();
    }
    
    await db.collection("posts").add({
      author: currentUsername,
      authorId: currentUser.uid,
      content,
      category,
      imageUrl,
      timestamp: Date.now(),
      likes: 0
    });
    
    // Award coins
    const userRef = db.collection("users").doc(currentUser.uid);
    const userDoc = await userRef.get();
    const newCoins = (userDoc.data().coins || 0) + 5;
    await userRef.update({ coins: newCoins });
    updateCoinDisplay(newCoins);
    
    document.getElementById("postContent").value = "";
    document.getElementById("postImage").value = "";
    document.getElementById("previewImage").classList.add("hidden");
    
    alert("Post created! +5 coins");
    loadPosts();
  } catch (error) {
    console.error("Error creating post:", error);
    alert("Error creating post: " + error.message);
  }
}

// ================= USERS =================
async function loadUsers() {
  const container = document.getElementById("usersList");
  if (!container) return;
  container.innerHTML = "<p>Loading users...</p>";
  
  try {
    const snapshot = await db.collection("users").limit(50).get();
    container.innerHTML = "";
    
    snapshot.forEach(doc => {
      const user = doc.data();
      const div = document.createElement("div");
      div.className = "user-item";
      div.style.padding = "10px";
      div.style.margin = "5px 0";
      div.style.background = "rgba(255,255,255,0.1)";
      div.style.borderRadius = "5px";
      div.innerHTML = `
        <strong>${user.username}</strong>
        <span style="color: #ffd700;">🪙 ${user.coins || 0}</span>
        ${user.moderator ? '<span style="color: #ff6b35;">⭐ Mod</span>' : ''}
      `;
      container.appendChild(div);
    });
  } catch (error) {
    console.error("Error loading users:", error);
    container.innerHTML = `<p style="color: red;">Error loading users.</p>`;
  }
}

// ================= DMS =================
async function loadDMs() {
  const container = document.getElementById("dmsList");
  if (!container) return;
  container.innerHTML = "<p>Loading DMs...</p>";
  
  const dmBtn = document.getElementById("dmBtn");
  if (dmBtn) dmBtn.onclick = sendDM;
  
  if (!currentUser) {
    container.innerHTML = "<p>Please login to view DMs</p>";
    return;
  }
  
  try {
    const snapshot = await db.collection("dms")
      .where("to", "==", currentUsername)
      .orderBy("timestamp", "desc")
      .limit(20)
      .get();
    
    container.innerHTML = "";
    
    if (snapshot.empty) {
      container.innerHTML = "<p>No messages yet</p>";
      return;
    }
    
    snapshot.forEach(doc => {
      const dm = doc.data();
      const div = document.createElement("div");
      div.className = "dm-item";
      div.style.padding = "10px";
      div.style.margin = "5px 0";
      div.style.background = "rgba(255,255,255,0.1)";
      div.style.borderRadius = "5px";
      div.innerHTML = `
        <strong>From: ${dm.from}</strong>
        <p>${dm.content}</p>
        <small>${new Date(dm.timestamp).toLocaleString()}</small>
      `;
      container.appendChild(div);
    });
  } catch (error) {
    console.error("Error loading DMs:", error);
    container.innerHTML = `<p style="color: red;">Error loading DMs.</p>`;
  }
}

async function sendDM() {
  if (!currentUser) return alert("Please login first");
  
  const toUsername = document.getElementById("dmToUsername").value;
  const content = document.getElementById("dmContent").value;
  
  if (!toUsername || !content) return alert("Fill in all fields");
  
  try {
    await db.collection("dms").add({
      from: currentUsername,
      to: toUsername,
      content,
      timestamp: Date.now()
    });
    
    document.getElementById("dmContent").value = "";
    alert("Message sent!");
    loadDMs();
  } catch (error) {
    console.error("Error sending DM:", error);
    alert("Error sending message: " + error.message);
  }
}

// ================= UPDATES =================
async function loadUpdates() {
  const container = document.getElementById("updatesList");
  if (!container) return;
  container.innerHTML = "<p>Loading updates...</p>";
  
  try {
    const snapshot = await db.collection("updates")
      .orderBy("timestamp", "desc")
      .limit(10)
      .get();
    
    container.innerHTML = "";
    
    if (snapshot.empty) {
      container.innerHTML = "<p>No updates yet</p>";
      return;
    }
    
    snapshot.forEach(doc => {
      const update = doc.data();
      const div = document.createElement("div");
      div.className = "update-item";
      div.style.padding = "15px";
      div.style.margin = "10px 0";
      div.style.background = "rgba(255,107,53,0.2)";
      div.style.borderRadius = "8px";
      div.innerHTML = `
        <h3>${update.title}</h3>
        <p>${update.content}</p>
        <small>${new Date(update.timestamp).toLocaleString()}</small>
      `;
      container.appendChild(div);
    });
  } catch (error) {
    console.error("Error loading updates:", error);
    container.innerHTML = `<p style="color: red;">Error loading updates.</p>`;
  }
}

// ================= SUGGESTIONS =================
async function loadSuggestions() {
  const container = document.getElementById("suggestionsList");
  if (!container) return;
  container.innerHTML = "<p>Loading suggestions...</p>";
  
  const submitBtn = document.getElementById("submitSuggestionBtn");
  if (submitBtn) submitBtn.onclick = submitSuggestion;
  
  try {
    const snapshot = await db.collection("suggestions")
      .orderBy("votes", "desc")
      .limit(20)
      .get();
    
    container.innerHTML = "";
    
    if (snapshot.empty) {
      container.innerHTML = "<p>No suggestions yet</p>";
      return;
    }
    
    snapshot.forEach(doc => {
      const suggestion = doc.data();
      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.style.padding = "15px";
      div.style.margin = "10px 0";
      div.style.background = "rgba(255,255,255,0.1)";
      div.style.borderRadius = "8px";
      div.innerHTML = `
        <h3>${suggestion.title}</h3>
        <p>${suggestion.description}</p>
        <small>By: ${suggestion.author} | Votes: ${suggestion.votes || 0}</small>
      `;
      container.appendChild(div);
    });
  } catch (error) {
    console.error("Error loading suggestions:", error);
    container.innerHTML = `<p style="color: red;">Error loading suggestions.</p>`;
  }
}

async function submitSuggestion() {
  if (!currentUser) return alert("Please login first");
  
  const title = document.getElementById("suggestionTitle").value;
  const description = document.getElementById("suggestionDescription").value;
  
  if (!title || !description) return alert("Fill in all fields");
  
  try {
    await db.collection("suggestions").add({
      author: currentUsername,
      title,
      description,
      votes: 0,
      timestamp: Date.now()
    });
    
    // Award coins
    const userRef = db.collection("users").doc(currentUser.uid);
    const userDoc = await userRef.get();
    const newCoins = (userDoc.data().coins || 0) + 10;
    await userRef.update({ coins: newCoins });
    updateCoinDisplay(newCoins);
    
    document.getElementById("suggestionTitle").value = "";
    document.getElementById("suggestionDescription").value = "";
    
    alert("Suggestion submitted! +10 coins");
    loadSuggestions();
  } catch (error) {
    console.error("Error submitting suggestion:", error);
    alert("Error submitting suggestion: " + error.message);
  }
}

// ================= LEADERBOARD =================
async function loadLeaderboard() {
  const container = document.getElementById("leaderboardList");
  if (!container) return;
  container.innerHTML = "<p>Loading leaderboard...</p>";
  
  try {
    const snapshot = await db.collection("users")
      .orderBy("coins", "desc")
      .limit(10)
      .get();
    
    container.innerHTML = "";
    
    let rank = 1;
    snapshot.forEach(doc => {
      const user = doc.data();
      const div = document.createElement("div");
      div.className = "leaderboard-item";
      div.style.padding = "15px";
      div.style.margin = "5px 0";
      div.style.background = rank <= 3 ? "rgba(255,215,0,0.2)" : "rgba(255,255,255,0.1)";
      div.style.borderRadius = "8px";
      div.innerHTML = `
        <span style="font-size: 24px; font-weight: bold;">#${rank}</span>
        <strong>${user.username}</strong>
        <span style="color: #ffd700;">🪙 ${user.coins || 0}</span>
      `;
      container.appendChild(div);
      rank++;
    });
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    container.innerHTML = `<p style="color: red;">Error loading leaderboard.</p>`;
  }
}

// ================= PLINKO GAME =================
function initPlinko() {
  const canvas = document.getElementById("plinkoCanvas");
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");
  
  // Draw pegs
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col <= row; col++) {
      const x = 200 + (col - row / 2) * 40;
      const y = 50 + row * 40;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Draw prize zones
  const prizes = [10, 20, 50, 100, 50, 20, 10];
  const zoneWidth = canvas.width / prizes.length;
  ctx.font = "16px Arial";
  ctx.fillStyle = "#ffd700";
  prizes.forEach((prize, i) => {
    ctx.fillText(`${prize}x`, i * zoneWidth + 20, canvas.height - 10);
  });
}

async function playPlinko() {
  if (!currentUser) return alert("Please login first");
  
  const bet = parseInt(document.getElementById("plinkoBet").value);
  if (bet < 10) return alert("Minimum bet is 10 coins");
  
  const userRef = db.collection("users").doc(currentUser.uid);
  const userDoc = await userRef.get();
  const currentCoins = userDoc.data().coins || 0;
  
  if (currentCoins < bet) return alert("Not enough coins!");
  
  // Deduct bet
  await userRef.update({ coins: currentCoins - bet });
  
  // Simulate plinko
  const multipliers = [10, 20, 50, 100, 50, 20, 10];
  const result = multipliers[Math.floor(Math.random() * multipliers.length)];
  const winnings = Math.floor(bet * (result / 10));
  
  // Add winnings
  const newCoins = currentCoins - bet + winnings;
  await userRef.update({ coins: newCoins });
  updateCoinDisplay(newCoins);
  
  alert(`You won ${winnings} coins! (${result / 10}x multiplier)`);
}
