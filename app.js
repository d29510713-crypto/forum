window.onload = function () {
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
  const storage = firebase.storage();

  // ================= GLOBAL =================
  const ownerEmail = "d29510713@gmail.com";
  let currentUser = null;

  // ================= DOM =================
  const loginBox = document.getElementById("loginBox");
  const registerBox = document.getElementById("registerBox");
  const forum = document.getElementById("forum");
  const logoutBtn = document.getElementById("logoutBtn");

  const tabs = document.querySelectorAll("#tabs button");
  const sections = document.querySelectorAll(".tabSection");

  const postsList = document.getElementById("postsList");
  const usersList = document.getElementById("usersList");
  const updatesList = document.getElementById("updatesList");
  const addUpdateBtn = document.getElementById("addUpdateBtn");
  const dmsList = document.getElementById("dmsList");
  const suggestionsList = document.getElementById("suggestionsList");

  const coinDisplay = document.getElementById("coinDisplay");

  // ================= TAB SWITCH =================
  tabs.forEach((tab, idx) => {
    tab.addEventListener("click", () => {
      sections.forEach(s => s.classList.add("hidden"));
      sections[idx].classList.remove("hidden");
    });
  });

  // ================= LOGIN =================
  document.getElementById("loginBtn").onclick = () => {
    const email = document.getElementById("logEmail").value;
    const pass = document.getElementById("logPass").value;
    auth.signInWithEmailAndPassword(email, pass)
      .then(() => console.log("Logged in"))
      .catch(err => alert(err.message));
  };

  // ================= REGISTER =================
  document.getElementById("registerBtn").onclick = () => {
    const email = document.getElementById("regEmail").value;
    const pass = document.getElementById("regPass").value;
    const username = document.getElementById("regUsername").value;

    auth.createUserWithEmailAndPassword(email, pass)
      .then(res => {
        const uid = res.user.uid;
        db.collection("users").doc(uid).set({
          email,
          username,
          coins: 0,
          role: email === ownerEmail ? "owner" : "user"
        });
        console.log("Registered");
      })
      .catch(err => alert(err.message));
  };

  // ================= TOGGLE LOGIN/REGISTER =================
  document.getElementById("toggleToRegister").onclick = () => {
    loginBox.classList.add("hidden");
    registerBox.classList.remove("hidden");
  };
  document.getElementById("toggleToLogin").onclick = () => {
    registerBox.classList.add("hidden");
    loginBox.classList.remove("hidden");
  };

  // ================= LOGOUT =================
  logoutBtn.onclick = () => auth.signOut();

  // ================= AUTH STATE =================
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      loginBox.classList.add("hidden");
      registerBox.classList.add("hidden");
      forum.classList.remove("hidden");

      const userDoc = await db.collection("users").doc(user.uid).get();
      const role = userDoc.data().role;

      // Owner features
      if (role === "owner") addUpdateBtn?.classList.remove("hidden");
      else addUpdateBtn?.classList.add("hidden");

      loadUsers();
      loadPosts();
      loadUpdates();
      loadCoins();
      loadDMs();
      loadSuggestions();
      initPlinko();
    } else {
      currentUser = null;
      loginBox.classList.remove("hidden");
      registerBox.classList.add("hidden");
      forum.classList.add("hidden");
    }
  });

  // ================= USERS =================
  async function loadUsers() {
    const snapshot = await db.collection("users").get();
    usersList.innerHTML = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement("div");
      div.className = "user-item";
      div.innerHTML = `<strong>${data.username}</strong> <span>${data.role}</span>`;

      // Owner can assign roles
      if (currentUser) {
        const currentDoc = db.collection("users").doc(currentUser.uid);
        currentDoc.get().then(curUser => {
          if (curUser.data().role === "owner") {
            const btn = document.createElement("button");
            btn.textContent = "Toggle Mod";
            btn.onclick = () => {
              const newRole = data.role === "mod" ? "user" : "mod";
              db.collection("users").doc(doc.id).update({ role: newRole }).then(loadUsers);
            };
            div.appendChild(btn);
          }
        });
      }

      usersList.appendChild(div);
    });
  }

  // ================= POSTS =================
  document.getElementById("postBtn").onclick = async () => {
    const content = document.getElementById("postContent").value;
    const category = document.getElementById("postCategory").value;
    if (!content) return;

    await db.collection("posts").add({
      uid: currentUser.uid,
      content,
      category,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById("postContent").value = "";
    loadPosts();
    loadUsers();
  };

  async function loadPosts() {
    const snapshot = await db.collection("posts").orderBy("timestamp", "desc").get();
    postsList.innerHTML = "";
    snapshot.forEach(doc => {
      const p = doc.data();
      const div = document.createElement("div");
      div.className = "post";
      div.innerHTML = `<strong>${p.category}</strong><p>${p.content}</p>`;

      // Owner/Mod can delete
      const currentDoc = db.collection("users").doc(currentUser.uid);
      currentDoc.get().then(curUser => {
        if (["owner","mod"].includes(curUser.data().role)) {
          const btn = document.createElement("button");
          btn.textContent = "Delete";
          btn.onclick = () => db.collection("posts").doc(doc.id).delete().then(loadPosts);
          div.appendChild(btn);
        }
      });

      postsList.appendChild(div);
    });
  }

  // ================= UPDATES =================
  addUpdateBtn?.addEventListener("click", () => {
    const title = prompt("Enter update title:");
    const content = prompt("Enter update content:");
    if (!title || !content) return;
    db.collection("updates").add({ title, content, timestamp: firebase.firestore.FieldValue.serverTimestamp() })
      .then(loadUpdates);
  });

  async function loadUpdates() {
    const snapshot = await db.collection("updates").orderBy("timestamp","desc").get();
    updatesList.innerHTML = "";
    snapshot.forEach(doc => {
      const u = doc.data();
      const div = document.createElement("div");
      div.className = "update-item";
      div.innerHTML = `<h3>${u.title}</h3><div>${u.content}</div>`;
      updatesList.appendChild(div);
    });
  }

  // ================= COINS =================
  async function loadCoins() {
    const doc = await db.collection("users").doc(currentUser.uid).get();
    coinDisplay.textContent = `🪙 ${doc.data().coins || 0} Coins`;
  }

  document.getElementById("claimDailyCoins")?.addEventListener("click", async () => {
    const ref = db.collection("users").doc(currentUser.uid);
    const doc = await ref.get();
    let coins = doc.data().coins || 0;
    coins += 10;
    await ref.update({ coins });
    loadCoins();
  });

  // ================= DMS =================
  document.getElementById("dmBtn").onclick = async () => {
    const toUsername = document.getElementById("dmToUsername").value;
    const content = document.getElementById("dmContent").value;
    if (!toUsername || !content) return;

    const snap = await db.collection("users").where("username","==",toUsername).get();
    if (snap.empty) return alert("User not found");

    const toUid = snap.docs[0].id;
    await db.collection("dms").add({
      from: currentUser.uid,
      to: toUid,
      content,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById("dmContent").value = "";
    loadDMs();
  };

  async function loadDMs() {
    const snapshot = await db.collection("dms").orderBy("timestamp","desc").get();
    dmsList.innerHTML = "";
    snapshot.forEach(doc => {
      const d = doc.data();
      if (d.to === currentUser.uid || d.from === currentUser.uid) {
        const div = document.createElement("div");
        div.className = "dm-item";
        div.innerHTML = `<strong>${d.from === currentUser.uid ? "To" : "From"}: ${d.from === currentUser.uid ? d.to : d.from}</strong><div>${d.content}</div>`;
        dmsList.appendChild(div);
      }
    });
  }

  // ================= SUGGESTIONS =================
  document.getElementById("submitSuggestionBtn").onclick = async () => {
    const text = document.getElementById("suggestionInput").value;
    if (!text) return;
    await db.collection("suggestions").add({
      uid: currentUser.uid,
      content: text,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById("suggestionInput").value = "";
    loadSuggestions();
  };

  async function loadSuggestions() {
    const snapshot = await db.collection("suggestions").orderBy("timestamp","desc").get();
    suggestionsList.innerHTML = "";
    snapshot.forEach(doc => {
      const s = doc.data();
      const div = document.createElement("div");
      div.className = "post";
      div.innerHTML = `<p>${s.content}</p>`;
      suggestionsList.appendChild(div);
    });
  }

  // ================= PLINKO =================
  function initPlinko() {
    const canvas = document.getElementById("plinkoCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#8a2be2";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "20px monospace";
    ctx.fillText("Plinko Game Placeholder",50,250);
  }
};
