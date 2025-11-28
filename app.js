/* ===========================================================
   TOASTY FORUM - FULL APP.JS
   Firebase v8 • Auth • Posts • Users • DMs • Plinko • Coins
   =========================================================== */

// =============== FIREBASE v8 CONFIG ==================
var firebaseConfig = {
    apiKey: "AIzaSyA1FwweYw4MOz5My0aCfbRv-xrduCTl8z0",
    authDomain: "toasty-89f07.firebaseapp.com",
    projectId: "toasty-89f07",
    storageBucket: "toasty-89f07.firebasestorage.app",
    messagingSenderId: "743787667064",
    appId: "1:743787667064:web:12284120fbbdd1e907d78d",
    measurementId: "G-VHGVH5JEYY"
};

// Initialize Firebase v8
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

console.log("Firebase Loaded:", firebase.SDK_VERSION);

// =====================================================
// GLOBAL STATE
// =====================================================
let currentUser = null;
let currentUsername = "";
let isOwner = false;
let isModerator = false;

// =====================================================
// ELEMENT SHORTCUTS
// =====================================================
const box = document.getElementById("box");

const loginUsernameField = document.getElementById("loginUsername");
const loginPasswordField = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const createAccBtn = document.getElementById("createAccBtn");
const logoutBtn = document.getElementById("logoutBtn");

const usernameDisplay = document.getElementById("usernameDisplay");
const coinsDisplay = document.getElementById("coinsDisplay");

const welcomePage = document.getElementById("welcomePage");
const postsPage = document.getElementById("postsPage");
const usersPage = document.getElementById("usersPage");
const suggestionsPage = document.getElementById("suggestionsPage");
const updatesPage = document.getElementById("updatesPage");
const statsPage = document.getElementById("statsPage");
const blackholeLoader = document.getElementById("blackholeLoader");

// Tabs
const tabWelcome = document.getElementById("tabWelcome");
const tabPosts = document.getElementById("tabPosts");
const tabUsers = document.getElementById("tabUsers");
const tabSuggestions = document.getElementById("tabSuggestions");
const tabUpdates = document.getElementById("tabUpdates");
const tabStats = document.getElementById("tabStats");

// Post creation
const newPostText = document.getElementById("newPostText");
const attachImage = document.getElementById("attachImage");
const postBtn = document.getElementById("postBtn");
const postList = document.getElementById("postList");

// Suggestions + Updates
const suggestionText = document.getElementById("suggestionText");
const sendSuggestionBtn = document.getElementById("sendSuggestionBtn");
const suggestionList = document.getElementById("suggestionList");

const updateText = document.getElementById("updateText");
const postUpdateBtn = document.getElementById("postUpdateBtn");
const updateList = document.getElementById("updateList");

// Users
const userList = document.getElementById("userList");

// Stats / Plinko
const playPlinkoBtn = document.getElementById("playPlinko");
const plinkoBall = document.getElementById("plinkoBall");
const plinkoCanvas = document.getElementById("plinkoCanvas");

// =====================================================
// SHOW/HIDE PANELS
// =====================================================
function showPage(pageDiv) {
    welcomePage.style.display = "none";
    postsPage.style.display = "none";
    usersPage.style.display = "none";
    suggestionsPage.style.display = "none";
    updatesPage.style.display = "none";
    statsPage.style.display = "none";

    pageDiv.style.display = "block";
}

// Tab switching
tabWelcome.onclick = () => showPage(welcomePage);
tabPosts.onclick = () => {
    showPage(postsPage);
    loadPosts();
};
tabUsers.onclick = () => {
    showPage(usersPage);
    loadUsers();
};
tabSuggestions.onclick = () => {
    showPage(suggestionsPage);
    loadSuggestions();
};
tabUpdates.onclick = () => {
    showPage(updatesPage);
    loadUpdates();
};
tabStats.onclick = () => showPage(statsPage);

// =====================================================
// AUTH - LOGIN & REGISTER
// =====================================================
createAccBtn.onclick = async () => {
    const username = loginUsernameField.value.trim();
    const password = loginPasswordField.value;

    if (!username || !password) {
        alert("Enter both username & password");
        return;
    }

    // Make unique email using username
    const email = username + "@toasty.fake";

    try {
        await auth.createUserWithEmailAndPassword(email, password);

        // Store username
        await db.collection("users").doc(email).set({
            username: username,
            coins: 100,
            joined: Date.now(),
            role: "user",
            avatar: "https://api.dicebear.com/9.x/pixel-art/svg?seed=" + username
        });

        alert("Account created!");
    } catch (err) {
        alert(err.message);
    }
};

loginBtn.onclick = async () => {
    const username = loginUsernameField.value.trim();
    const password = loginPasswordField.value;

    if (!username || !password) {
        alert("Missing username / password");
        return;
    }

    const email = username + "@toasty.fake";

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
        alert(err.message);
    }
};

logoutBtn.onclick = () => auth.signOut();

// =====================================================
// AUTH STATE LISTENER - LOAD USER PROFILE
// =====================================================
auth.onAuthStateChanged(async user => {
    if (!user) {
        currentUser = null;
        box.style.display = "block";
        welcomePage.style.display = "none";
        return;
    }

    currentUser = user;
    const email = user.email;

    const snap = await db.collection("users").doc(email).get();
    const data = snap.data();

    currentUsername = data.username;
    isOwner = data.role === "owner";
    isModerator = data.role === "moderator";

    usernameDisplay.textContent = currentUsername;
    coinsDisplay.textContent = data.coins;

    box.style.display = "none";
    showPage(welcomePage);
});

// =====================================================
// POSTS
// =====================================================
async function loadPosts() {
    postList.innerHTML = `<p>Loading posts...</p>`;

    const snap = await db.collection("posts").orderBy("time", "desc").get();

    postList.innerHTML = "";

    snap.forEach(doc => {
        const p = doc.data();

        const div = document.createElement("div");
        div.className = "post";

        div.innerHTML = `
            <strong>${p.username}</strong>: ${p.text}<br>
            <small>${new Date(p.time).toLocaleString()}</small>
        `;

        if (p.imageURL) {
            div.innerHTML += `<br><img src="${p.imageURL}" style="max-width:100%;border-radius:10px;margin-top:5px;">`;
        }

        postList.appendChild(div);
    });
}

postBtn.onclick = async () => {
    if (!currentUser) return;

    const text = newPostText.value.trim();
    if (!text && !attachImage.files.length) {
        alert("Write a post or attach an image");
        return;
    }

    let imageURL = null;

    if (attachImage.files.length) {
        const file = attachImage.files[0];
        const ref = storage.ref("postImages/" + Date.now() + "-" + file.name);
        await ref.put(file);
        imageURL = await ref.getDownloadURL();
    }

    await db.collection("posts").add({
        username: currentUsername,
        text,
        imageURL,
        time: Date.now()
    });

    newPostText.value = "";
    attachImage.value = "";

    loadPosts();
};

// =====================================================
// USERS LIST
// =====================================================
async function loadUsers() {
    userList.innerHTML = "Loading...";

    const snap = await db.collection("users").get();

    userList.innerHTML = "";

    snap.forEach(doc => {
        const u = doc.data();

        const div = document.createElement("div");
        div.className = "userEntry";
        div.innerHTML = `
            <img src="${u.avatar}" width="40" style="border-radius:8px;margin-right:6px;">
            <strong>${u.username}</strong> — ${u.coins} coins
        `;
        userList.appendChild(div);
    });
}

// =====================================================
// SUGGESTIONS
// =====================================================
async function loadSuggestions() {
    suggestionList.innerHTML = "Loading...";

    const snap = await db.collection("suggestions").orderBy("time", "desc").get();

    suggestionList.innerHTML = "";

    snap.forEach(doc => {
        const s = doc.data();

        const div = document.createElement("div");
        div.className = "suggestionEntry";
        div.innerHTML = `
            <strong>${s.username}:</strong> ${s.text}<br>
            <small>${new Date(s.time).toLocaleString()}</small>
        `;
        suggestionList.appendChild(div);
    });
}

sendSuggestionBtn.onclick = async () => {
    const text = suggestionText.value.trim();
    if (!text) return;

    await db.collection("suggestions").add({
        username: currentUsername,
        text,
        time: Date.now()
    });

    suggestionText.value = "";
    loadSuggestions();
};

// =====================================================
// UPDATES
// =====================================================
async function loadUpdates() {
    updateList.innerHTML = "Loading...";

    const snap = await db.collection("updates").orderBy("time", "desc").get();

    updateList.innerHTML = "";

    snap.forEach(doc => {
        const u = doc.data();

        const div = document.createElement("div");
        div.className = "updateEntry";
        div.innerHTML = `
            <strong>Update:</strong> ${u.text}<br>
            <small>${new Date(u.time).toLocaleString()}</small>
        `;
        updateList.appendChild(div);
    });
}

postUpdateBtn.onclick = async () => {
    if (!isOwner && !isModerator) {
        alert("Admins only.");
        return;
    }
    const text = updateText.value.trim();
    if (!text) return;

    await db.collection("updates").add({
        text,
        time: Date.now()
    });

    updateText.value = "";
    loadUpdates();
};

// =====================================================
// DAILY COINS
// =====================================================
async function grantDailyCoins() {
    const ref = db.collection("users").doc(currentUser.email);
    const snap = await ref.get();
    const data = snap.data();

    const now = Date.now();
    const canClaim = !data.lastDaily || now - data.lastDaily > 86400000;

    if (!canClaim) {
        alert("You already claimed daily coins.");
        return;
    }

    await ref.update({
        coins: data.coins + 50,
        lastDaily: now
    });

    coinsDisplay.textContent = data.coins + 50;
    alert("You received 50 coins!");
}

// =====================================================
// PLINKO SYSTEM
// =====================================================
playPlinkoBtn.onclick = () => playPlinko();

function playPlinko() {
    plinkoBall.style.display = "block";

    let x = 150;
    let y = 0;
    let vx = (Math.random() - 0.5) * 4;
    let vy = 2;

    function frame() {
        y += vy;
        x += vx;

        // bounce left/right
        if (x < 10 || x > 290) vx = -vx;

        plinkoBall.style.left = x + "px";
        plinkoBall.style.top = y + "px";

        if (y < 420) {
            requestAnimationFrame(frame);
        } else {
            finishPlinko();
        }
    }

    frame();
}

async function finishPlinko() {
    plinkoBall.style.display = "none";

    const reward = Math.floor(Math.random() * 40) + 10;

    const ref = db.collection("users").doc(currentUser.email);
    const snap = await ref.get();
    const oldCoins = snap.data().coins;

    await ref.update({
        coins: oldCoins + reward
    });

    coinsDisplay.textContent = oldCoins + reward;

    alert("You won " + reward + " coins!");
}

// =====================================================
// END OF FILE
// =====================================================

