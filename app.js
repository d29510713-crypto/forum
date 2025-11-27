// ================= FIREBASE CONFIG =================
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
const storage = firebase.storage();

// ================= GLOBAL VARIABLES =================
let currentUser = null;
let currentUserData = null;
const OWNER_EMAIL = "d29510713@gmail.com";

// ================= UI ELEMENTS =================
const loginBox = document.getElementById("loginBox");
const registerBox = document.getElementById("registerBox");
const authBox = document.getElementById("authBox");
const forum = document.getElementById("forum");
const coinDisplay = document.getElementById("coinDisplay");
const logoutBtn = document.getElementById("logoutBtn");

// Tabs
const tabButtons = document.querySelectorAll(".tabs button");
const tabSections = document.querySelectorAll(".tabSection");

// ================= AUTH =================
document.getElementById("toggleToRegister").onclick = () => {
  loginBox.classList.add("hidden");
  registerBox.classList.remove("hidden");
};
document.getElementById("toggleToLogin").onclick = () => {
  registerBox.classList.add("hidden");
  loginBox.classList.remove("hidden");
};

// Register
document.getElementById("registerBtn").onclick = async () => {
  const email = document.getElementById("regEmail").value;
  const pass = document.getElementById("regPass").value;
  const username = document.getElementById("regUsername").value;
  if (!email || !pass || !username) return alert("All fields required!");
  try {
    const userCred = await auth.createUserWithEmailAndPassword(email, pass);
    currentUser = userCred.user;
    await db.collection("users").doc(currentUser.uid).set({
      username,
      email,
      role: email === OWNER_EMAIL ? "owner" : "user",
      coins: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) { alert(err.message); }
};

// Login
document.getElementById("loginBtn").onclick = async () => {
  const email = document.getElementById("logEmail").value;
  const pass = document.getElementById("logPass").value;
  try {
    const userCred = await auth.signInWithEmailAndPassword(email, pass);
    currentUser = userCred.user;
    loadUserData();
  } catch (err) { alert(err.message); }
};

// Logout
logoutBtn.onclick = () => auth.signOut();

// ================= LOAD USER DATA =================
async function loadUserData() {
  const doc = await db.collection("users").doc(currentUser.uid).get();
  currentUserData = doc.data();
  authBox.classList.add("hidden");
  forum.classList.remove("hidden");
  updateUI();
  loadAllPosts();
  loadAllUsers();
  loadAllDMs();
  loadAllUpdates();
  loadAllSuggestions();
  startTabSwitching();
}

// ================= UPDATE UI =================
function updateUI() {
  coinDisplay.innerText = `🪙 ${currentUserData.coins || 0} Coins`;
}

// ================= TABS SWITCHING =================
function startTabSwitching() {
  tabButtons.forEach(btn => {
    btn.onclick = () => {
      tabSections.forEach(sec => sec.classList.add("hidden"));
      document.getElementById(btn.dataset.tab).classList.remove("hidden");
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    };
  });
}

// ================= POSTS =================
const postImageInput = document.getElementById("postImage");
const previewImage = document.getElementById("previewImage");

postImageInput.onchange = () => {
  const file = postImageInput.files[0];
  if (!file) return;
  previewImage.src = URL.createObjectURL(file);
  previewImage.classList.remove("hidden");
};

document.getElementById("postBtn").onclick = async () => {
  const content = document.getElementById("postContent").value;
  const category = document.getElementById("postCategory").value;
  let imageURL = "";
  if (postImageInput.files[0]) {
    const file = postImageInput.files[0];
    const ref = storage.ref(`posts/${Date.now()}_${file.name}`);
    await ref.put(file);
    imageURL = await ref.getDownloadURL();
  }
  const postData = {
    uid: currentUser.uid,
    username: currentUserData.username,
    content,
    category,
    imageURL,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  await db.collection("posts").add(postData);
  document.getElementById("postContent").value = "";
  previewImage.classList.add("hidden");
  loadAllPosts();
  loadAllUsers(); // ensure user shows in users list
};

// Load Posts
async function loadAllPosts() {
  const postsList = document.getElementById("postsList");
  postsList.innerHTML = "";
  const postsSnap = await db.collection("posts").orderBy("createdAt", "desc").get();
  postsSnap.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.classList.add("post");
    div.innerHTML = `<strong>${data.username}</strong> [${data.category}]<p>${data.content}</p>${data.imageURL ? `<img src="${data.imageURL}" class="post-image">` : ""}`;
    postsList.appendChild(div);
  });
}

// ================= USERS =================
async function loadAllUsers() {
  const usersList = document.getElementById("usersList");
  usersList.innerHTML = "";
  const usersSnap = await db.collection("users").orderBy("createdAt").get();
  usersSnap.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.classList.add("user-item");
    div.innerHTML = `<strong>${data.username}</strong> <span>${data.role || "user"}</span>`;
    // Owner can mod
    if (currentUserData.role === "owner" && data.uid !== currentUser.uid) {
      const promoteBtn = document.createElement("button");
      promoteBtn.innerText = "Promote";
      promoteBtn.onclick = async () => {
        const newRole = prompt("Enter role: user/mod");
        if (!newRole) return;
        await db.collection("users").doc(doc.id).update({ role: newRole });
        loadAllUsers();
      };
      div.appendChild(promoteBtn);
    }
    usersList.appendChild(div);
  });
}

// ================= DMs =================
document.getElementById("dmBtn").onclick = async () => {
  const toUsername = document.getElementById("dmToUsername").value;
  const content = document.getElementById("dmContent").value;
  if (!toUsername || !content) return alert("Fill both fields!");
  const toSnap = await db.collection("users").where("username", "==", toUsername).get();
  if (toSnap.empty) return alert("User not found!");
  const toUID = toSnap.docs[0].id;
  await db.collection("dms").add({
    fromUID: currentUser.uid,
    toUID,
    fromUsername: currentUserData.username,
    content,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  document.getElementById("dmContent").value = "";
  loadAllDMs();
};

// Load DMs
async function loadAllDMs() {
  const dmsList = document.getElementById("dmsList");
  dmsList.innerHTML = "";
  const dmSnap = await db.collection("dms")
    .where("fromUID", "==", currentUser.uid)
    .get();
  dmSnap.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.classList.add("dm-item");
    div.innerHTML = `<strong>To: ${data.toUID}</strong><div>${data.content}</div>`;
    dmsList.appendChild(div);
  });
}

// ================= SUGGESTIONS =================
document.getElementById("submitSuggestionBtn").onclick = async () => {
  const content = document.getElementById("suggestionInput").value;
  if (!content) return alert("Type a suggestion!");
  await db.collection("suggestions").add({
    uid: currentUser.uid,
    username: currentUserData.username,
    content,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  document.getElementById("suggestionInput").value = "";
  loadAllSuggestions();
};

async function loadAllSuggestions() {
  const suggestionsList = document.getElementById("suggestionsList");
  suggestionsList.innerHTML = "";
  const snap = await db.collection("suggestions").orderBy("createdAt", "desc").get();
  snap.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.classList.add("post");
    div.innerHTML = `<strong>${data.username}</strong><p>${data.content}</p>`;
    suggestionsList.appendChild(div);
  });
}

// ================= DAILY COINS =================
document.getElementById("dailyCoinBtn").onclick = async () => {
  const userRef = db.collection("users").doc(currentUser.uid);
  const newCoins = (currentUserData.coins || 0) + 10;
  await userRef.update({ coins: newCoins });
  currentUserData.coins = newCoins;
  updateUI();
};

// ================= LOAD PLACEHOLDER FUNCTIONS =================
function loadAllUpdates() { /* similar to posts */ }
function loadAllLeaderboard() { /* similar */ }
function loadAllActivity() { /* similar */ }

// ================= START =================
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    loadUserData();
  }
});
