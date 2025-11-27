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

// ================= GLOBALS =================
let currentUser = null;
let currentUsername = "";
let isOwner = false;
let isModerator = false;
const ownerEmail = "d29510713@gmail.com";

// ================= UI ELEMENTS =================
const loginBox = document.getElementById("loginBox");
const registerBox = document.getElementById("registerBox");
const forum = document.getElementById("forum");
const postsList = document.getElementById("postsList");
const usersList = document.getElementById("usersList");
const previewImage = document.getElementById("previewImage");

// ================= AUTH STATE =================
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    currentUsername = user.displayName || user.email.split("@")[0];

    loginBox.classList.add("hidden");
    registerBox.classList.add("hidden");
    forum.classList.remove("hidden");

    if (user.email === ownerEmail) isOwner = true;

    loadUsers();
    loadPosts();
    loadUpdates();
  } else {
    forum.classList.add("hidden");
    loginBox.classList.remove("hidden");
  }
});

// ================= LOGIN/REGISTER =================
document.getElementById("loginBtn").addEventListener("click", () => {
  const email = document.getElementById("logEmail").value;
  const pass = document.getElementById("logPass").value;

  auth.signInWithEmailAndPassword(email, pass)
    .catch(err => alert(err.message));
});

document.getElementById("registerBtn").addEventListener("click", () => {
  const email = document.getElementById("regEmail").value;
  const pass = document.getElementById("regPass").value;
  const username = document.getElementById("regUsername").value;

  auth.createUserWithEmailAndPassword(email, pass)
    .then(cred => cred.user.updateProfile({ displayName: username }))
    .catch(err => alert(err.message));
});

// ================= LOGOUT =================
document.getElementById("logoutBtn").addEventListener("click", () => {
  auth.signOut();
});

// ================= TABS =================
const tabs = document.querySelectorAll("#tabs button");
const sections = document.querySelectorAll(".tabSection");

tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    sections.forEach(sec => sec.classList.add("hidden"));
    document.getElementById(btn.id.replace("tab", "").toLowerCase() + "Section").classList.remove("hidden");
    tabs.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// ================= POST CREATION =================
document.getElementById("postBtn").addEventListener("click", async () => {
  const content = document.getElementById("postContent").value;
  const category = document.getElementById("postCategory").value;
  const file = document.getElementById("postImage").files[0];

  let imageUrl = "";
  if (file) {
    const storageRef = storage.ref(`posts/${Date.now()}_${file.name}`);
    await storageRef.put(file);
    imageUrl = await storageRef.getDownloadURL();
  }

  await db.collection("posts").add({
    author: currentUsername,
    uid: currentUser.uid,
    content,
    category,
    imageUrl,
    timestamp: Date.now()
  });

  document.getElementById("postContent").value = "";
  document.getElementById("postImage").value = "";
  previewImage.classList.add("hidden");

  loadPosts();
});

// ================= POST IMAGE PREVIEW =================
document.getElementById("postImage").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    previewImage.src = reader.result;
    previewImage.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
});

// ================= LOAD POSTS =================
async function loadPosts() {
  postsList.innerHTML = "";
  const snapshot = await db.collection("posts").orderBy("timestamp", "desc").get();
  snapshot.forEach(doc => {
    const data = doc.data();
    const postDiv = document.createElement("div");
    postDiv.className = "post";
    postDiv.innerHTML = `
      <div class="post-header"><strong>${data.author}</strong> | <span>${data.category}</span></div>
      <div class="post-content">${data.content}</div>
      ${data.imageUrl ? `<img src="${data.imageUrl}" class="post-image">` : ""}
    `;
    postsList.appendChild(postDiv);
  });
}

// ================= LOAD USERS =================
async function loadUsers() {
  usersList.innerHTML = "";
  const snapshot = await db.collection("users").get();

  // Add current user to db if not exists
  if (currentUser) {
    const userDoc = await db.collection("users").doc(currentUser.uid).get();
    if (!userDoc.exists) {
      await db.collection("users").doc(currentUser.uid).set({
        username: currentUsername,
        uid: currentUser.uid,
        email: currentUser.email
      });
    }
  }

  const allUsers = await db.collection("users").get();
  allUsers.forEach(doc => {
    const u = doc.data();
    const userDiv = document.createElement("div");
    userDiv.className = "user-item";
    userDiv.innerHTML = `<strong>${u.username}</strong> <span>${u.email}</span>`;
    usersList.appendChild(userDiv);
  });
}

// ================= UPDATES (OWNER ONLY) =================
async function loadUpdates() {
  const updatesList = document.getElementById("updatesList");
  if (!updatesList) return;
  updatesList.innerHTML = "";
  const snapshot = await db.collection("updates").orderBy("timestamp", "desc").get();
  snapshot.forEach(doc => {
    const data = doc.data();
    const updateDiv = document.createElement("div");
    updateDiv.className = "update-item";
    updateDiv.innerHTML = `<h3>${data.title}</h3><div>${data.content}</div>`;
    updatesList.appendChild(updateDiv);
  });
}

// ================= STARS BACKGROUND =================
for (let i = 0; i < 150; i++) {
  const star = document.createElement("div");
  star.className = "star";
  star.style.top = Math.random() * 100 + "%";
  star.style.left = Math.random() * 100 + "%";
  star.style.width = Math.random() * 2 + 1 + "px";
  star.style.height = Math.random() * 2 + 1 + "px";
  document.getElementById("stars").appendChild(star);
}

// ================= BLACK HOLE =================
const blackhole = document.createElement("div");
blackhole.id = "blackhole";
blackhole.style.background = "radial-gradient(circle at center, #000 0%, #111 60%, transparent 100%)";
blackhole.style.width = "400px";
blackhole.style.height = "400px";
blackhole.style.position = "fixed";
blackhole.style.top = "50%";
blackhole.style.left = "50%";
blackhole.style.transform = "translate(-50%, -50%)";
blackhole.style.borderRadius = "50%";
blackhole.style.zIndex = "0";
blackhole.style.boxShadow = "0 0 80px rgba(138,43,226,0.5), inset 0 0 50px rgba(138,43,226,0.3)";
document.body.appendChild(blackhole);
