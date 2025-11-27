window.onload = function() {
  console.log("App loaded!");

  // ================= STARS =================
  for (let i = 0; i < 150; i++) {
    const s = document.createElement("div");
    s.className = "star";
    s.style.top = Math.random() * 100 + "%";
    s.style.left = Math.random() * 100 + "%";
    s.style.width = (Math.random() * 2 + 1) + "px";
    s.style.height = (Math.random() * 2 + 1) + "px";
    const starsEl = document.getElementById("stars");
    if (starsEl) starsEl.appendChild(s);
  }

  // ================= TABS =================
  function showTab(tab) {
    console.log("Switching to tab:", tab);

    ['posts', 'users', 'dms', 'updates', 'suggestions', 'leaderboard'].forEach(t => {
      const section = document.getElementById(t + 'Section');
      const tabBtn = document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1));

      if (section) section.classList.add('hidden');
      if (tabBtn) tabBtn.classList.remove('active');
    });

    const selectedSection = document.getElementById(tab + 'Section');
    const selectedTab = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));

    if (selectedSection) selectedSection.classList.remove('hidden');
    if (selectedTab) selectedTab.classList.add('active');

    if (tab === 'posts') loadPosts();
    if (tab === 'users') loadUsers();
    if (tab === 'dms') loadDMs();
    if (tab === 'updates') loadUpdates();
    if (tab === 'suggestions') loadSuggestions();
    if (tab === 'leaderboard') loadLeaderboard();
  }

  const tabPosts = document.getElementById("tabPosts");
  const tabUsers = document.getElementById("tabUsers");
  const tabDMs = document.getElementById("tabDMs");
  const tabUpdates = document.getElementById("tabUpdates");
  const tabSuggestions = document.getElementById("tabSuggestions");
  const tabLeaderboard = document.getElementById("tabLeaderboard");

  if (tabPosts) tabPosts.onclick = () => showTab('posts');
  if (tabUsers) tabUsers.onclick = () => showTab('users');
  if (tabDMs) tabDMs.onclick = () => showTab('dms');
  if (tabUpdates) tabUpdates.onclick = () => showTab('updates');
  if (tabSuggestions) tabSuggestions.onclick = () => showTab('suggestions');
  if (tabLeaderboard) tabLeaderboard.onclick = () => showTab('leaderboard');

  // ================= TOGGLE LOGIN/REGISTER =================
  const toggleToLogin = document.getElementById("toggleToLogin");
  const toggleToRegister = document.getElementById("toggleToRegister");
  if (toggleToLogin) {
    toggleToLogin.onclick = () => {
      const registerBox = document.getElementById("registerBox");
      const loginBox = document.getElementById("loginBox");
      if (registerBox) registerBox.classList.add("hidden");
      if (loginBox) loginBox.classList.remove("hidden");
    };
  }
  if (toggleToRegister) {
    toggleToRegister.onclick = () => {
      const loginBox = document.getElementById("loginBox");
      const registerBox = document.getElementById("registerBox");
      if (loginBox) loginBox.classList.add("hidden");
      if (registerBox) registerBox.classList.remove("hidden");
    };
  }

  // ================= FIREBASE =================
  const firebaseConfig = {
    apiKey: "AIzaSyA1FwweYw4MOz5My0aCfbRv-xrduCTl8z0",
    authDomain: "toasty-89f07.firebaseapp.com",
    projectId: "toasty-89f07",
    storageBucket: "toasty-89f07.appspot.com",
    messagingSenderId: "743787667064",
    appId: "1:743787667064:web:12284120fbbdd1e907d78d"
  };

  if (typeof firebase === 'undefined') {
    console.error("Firebase not loaded - include Firebase SDK before this script.");
    // Fail gracefully: many functions will still guard against null db/auth
  } else {
    firebase.initializeApp(firebaseConfig);
  }

  const auth = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth() : null;
  const db = (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore() : null;
  const storage = (typeof firebase !== 'undefined' && firebase.storage) ? firebase.storage() : null;

  let currentUser = null;
  let currentUsername = "";
  let isOwner = false;
  let isModerator = false;

  // ================= REGISTER =================
  window.register = async function () {
    if (!auth || !db) return alert("Firebase not initialized.");
    console.log("Register function called");
    const emailEl = document.getElementById("regEmail");
    const passEl = document.getElementById("regPass");
    const usernameEl = document.getElementById("regUsername");
    const email = emailEl ? emailEl.value.trim() : "";
    const pass = passEl ? passEl.value : "";
    const username = usernameEl ? usernameEl.value.trim() : "";

    if (!email || !pass || !username) return alert("All fields required");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return alert("Please enter a valid email address");

    if (pass.length < 6) return alert("Password must be at least 6 characters");

    try {
      const snap = await db.collection("users").where("username", "==", username).get();
      if (!snap.empty) return alert("Username taken");

      const userCred = await auth.createUserWithEmailAndPassword(email, pass);

      const colors = ['8a2be2', 'ff6b35', '00d4ff', 'ffd700', 'ff1493', '00ff00'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=${color}&color=fff&size=128&bold=true`;

      await db.collection("users").doc(userCred.user.uid).set({
        username,
        email,
        joinDate: Date.now(),
        banned: false,
        moderator: false,
        warnings: 0,
        emailVerified: false,
        avatar: avatar,
        status: 'offline',
        customStatus: '',
        lastLogin: Date.now()
      });

      await userCred.user.sendEmailVerification();
      await auth.signOut();

      alert("Account created! Please check your email and verify your account before logging in.");
      const registerBox = document.getElementById("registerBox");
      const loginBox = document.getElementById("loginBox");
      if (registerBox) registerBox.classList.add("hidden");
      if (loginBox) loginBox.classList.remove("hidden");
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        alert("This email is already registered");
      } else if (e.code === 'auth/invalid-email') {
        alert("Invalid email address");
      } else {
        alert(e.message || e);
      }
    }
  };

  const registerBtn = document.getElementById("registerBtn");
  if (registerBtn) {
    console.log("Register button found");
    registerBtn.onclick = register;
  }

  // ================= LOGIN =================
  window.login = async function () {
    if (!auth) return alert("Firebase not initialized.");
    console.log("Login function called");
    const emailEl = document.getElementById("logEmail");
    const passEl = document.getElementById("logPass");
    const email = emailEl ? emailEl.value.trim() : "";
    const pass = passEl ? passEl.value : "";
    console.log("Email:", email, "Password length:", pass.length);

    if (!email || !pass) return alert("Enter email and password");

    try {
      console.log("Attempting to sign in...");
      const userCred = await auth.signInWithEmailAndPassword(email, pass);
      console.log("Sign in successful!");

      if (!userCred.user.emailVerified) {
        console.log("Email not verified");
        const proceed = confirm("⚠️ Your email is not verified yet.\n\nClick OK to continue anyway, or Cancel to verify first.");
        if (!proceed) {
          await userCred.user.sendEmailVerification();
          alert("Verification email sent! Please check your inbox.");
          await auth.signOut();
          return;
        }
      }

      console.log("Calling loginUser...");
      loginUser(userCred.user);
    } catch (e) {
      console.error("Login error:", e);
      if (e.code === 'auth/user-not-found') {
        alert("❌ No account found with this email.\n\nPlease register first!");
      } else if (e.code === 'auth/wrong-password') {
        alert("❌ Incorrect password.\n\nTry again or use 'Forgot Password'");
      } else if (e.code === 'auth/invalid-email') {
        alert("❌ Invalid email address format");
      } else {
        alert("Login error: " + (e.message || e));
      }
    }
  };

  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    console.log("Login button found, attaching handler");
    loginBtn.onclick = login;
  } else {
    console.error("Login button NOT found!");
  }

  const forgotPassBtn = document.getElementById("forgotPass");
  if (forgotPassBtn) {
    forgotPassBtn.onclick = async function () {
      if (!auth) return alert("Firebase not initialized.");
      const emailEl = document.getElementById("logEmail");
      const email = emailEl ? emailEl.value.trim() : "";
      if (!email) return alert("Enter your email");
      try {
        await auth.sendPasswordResetEmail(email);
        alert("Password reset sent!");
      } catch (e) {
        alert(e.message || e);
      }
    };
  }

  window.logout = async function () {
    if (!auth) return;
    await auth.signOut();
    currentUser = null;
    currentUsername = "";
    isOwner = false;
    isModerator = false;
    const forum = document.getElementById("forum");
    const box = document.getElementById("box");
    if (forum) forum.classList.add("hidden");
    if (box) box.classList.remove("hidden");
  };

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.onclick = logout;

  if (auth) {
    auth.onAuthStateChanged(user => {
      if (user) loginUser(user);
      else {
        // not logged in
      }
    });
  }

  async function loginUser(user) {
    if (!db) return;
    console.log("loginUser called");
    currentUser = user;
    try {
      const userDoc = await db.collection("users").doc(user.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData.banned) {
          alert("You are banned from this forum");
          await auth.signOut();
          return;
        }
        currentUsername = userData.username;
        isModerator = userData.moderator || false;

        await db.collection("users").doc(user.uid).update({
          lastLogin: Date.now(),
          status: 'online',
          emailVerified: user.emailVerified
        });

        setupPresence(user.uid);
      }

      isOwner = (user.email === "d29510713@gmail.com");

      const box = document.getElementById("box");
      const forum = document.getElementById("forum");
      if (box) box.classList.add("hidden");
      if (forum) forum.classList.remove("hidden");

      if (isOwner || isModerator) {
        const ownerControls = document.getElementById("ownerControls");
        if (ownerControls) ownerControls.classList.remove("hidden");
        if (!isOwner) {
          const clearBtn = document.getElementById("clearForumBtn");
          const makeModBtn = document.getElementById("makeModBtn");
          if (clearBtn) clearBtn.style.display = "none";
          if (makeModBtn) makeModBtn.style.display = "none";
        }
      }

      console.log("Logged in successfully!");
      loadPosts();
    } catch (e) {
      console.error("loginUser error:", e);
    }
  }

  function setupPresence(userId) {
    if (!db) return;
    window.addEventListener('beforeunload', () => {
      try { db.collection("users").doc(userId).update({ status: 'offline' }); } catch (e) { }
    });

    setInterval(() => {
      if (currentUser && db) {
        db.collection("users").doc(userId).update({
          status: 'online',
          lastSeen: Date.now()
        }).catch(() => { });
      }
    }, 60000);
  }

  // ================= LOAD POSTS =================
  async function loadPosts(searchQuery = "", filterCategory = "", sortBy = "newest") {
    const postsList = document.getElementById("postsList");
    if (!postsList) return;
    postsList.innerHTML = "<p style='text-align:center; color:#888;'>Loading posts...</p>";

    if (!db) {
      postsList.innerHTML = "<p style='text-align:center; color:red;'>Database not available</p>";
      return;
    }

    try {
      const snapshot = await db.collection("posts").limit(100).get();

      const userDataCache = {};
      const userIds = new Set();
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data && data.authorId) userIds.add(data.authorId);
      });

      for (let userId of userIds) {
        try {
          const userDoc = await db.collection("users").doc(userId).get();
          if (userDoc.exists) {
            userDataCache[userId] = userDoc.data();
          }
        } catch (e) {
          console.log("Could not fetch user:", userId);
        }
      }

      let posts = [];
      snapshot.forEach(doc => {
        const post = doc.data();
        if (!post) return;

        if (searchQuery && !(post.content || "").toLowerCase().includes(searchQuery.toLowerCase())) {
          return;
        }

        if (filterCategory && filterCategory !== 'all' && post.category !== filterCategory) {
          return;
        }

        posts.push({ id: doc.id, ...post });
      });

      if (sortBy === 'newest') {
        posts.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return (b.timestamp || 0) - (a.timestamp || 0);
        });
      } else if (sortBy === 'popular') {
        posts.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return (b.likes || 0) - (a.likes || 0);
        });
      } else if (sortBy === 'discussed') {
        posts.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return (b.comments?.length || 0) - (a.comments?.length || 0);
        });
      }

      postsList.innerHTML = "";

      posts.forEach(post => {
        const isLiked = post.likedBy && currentUser && post.likedBy.includes(currentUser.uid);
        const isBookmarked = post.bookmarkedBy && currentUser && post.bookmarkedBy.includes(currentUser.uid);
        const canModerate = isOwner || isModerator;
        const canDelete = currentUser && (post.authorId === currentUser.uid || canModerate);
        const canEdit = currentUser && (post.authorId === currentUser.uid);

        const authorData = userDataCache[post.authorId];
        let roleBadge = "";
        if (authorData) {
          if (authorData.email === "d29510713@gmail.com") {
            roleBadge = '<span style="color:#ff6b35; text-shadow: 0 0 10px rgba(255,107,53,0.8);"> 👑 OWNER</span>';
          } else if (authorData.moderator) {
            roleBadge = '<span style="color:#00d4ff; text-shadow: 0 0 10px rgba(0,212,255,0.6);"> 🛡️ MOD</span>';
          }
        }

        const timeAgo = getTimeAgo(post.timestamp || 0);
        const pinBadge = post.pinned ? '<span style="color:#ffd700;">📌 PINNED</span>' : '';
        const engagement = (post.likes || 0) + ((post.comments?.length || 0) * 2);
        const trendingBadge = engagement > 10 ? '<span style="color:#ff6b35;">🔥 TRENDING</span>' : '';

        const postDiv = document.createElement("div");
        postDiv.className = "post";
        if (post.reported) postDiv.style.borderColor = "rgba(255, 0, 0, 0.6)";
        if (post.pinned) postDiv.style.borderColor = "rgba(255, 215, 0, 0.6)";

        postDiv.innerHTML = `
          <div class="post-header">
            <div>
              <strong>${escapeHtml(post.author || "Unknown")}${roleBadge}</strong> - ${escapeHtml(post.category || "")} ${pinBadge} ${trendingBadge}
              ${post.reported ? '<span style="color:red;"> ⚠ REPORTED</span>' : ''}
              ${post.edited ? '<span style="color:#888;font-size:11px;"> (edited)</span>' : ''}
            </div>
            <span class="post-time">${new Date(post.timestamp || Date.now()).toLocaleString()} (${timeAgo})</span>
          </div>
          ${post.content ? `<div class="post-content">${escapeHtml(post.content)}</div>` : ''}
          ${post.imageUrl ? `
            <img src="${post.imageUrl}" 
                 class="post-image" 
                 alt="Post image" 
                 loading="lazy"
                 onerror="this.style.display='none';"
                 onclick="openImageModal('${post.imageUrl}')">
          ` : ''}
          <div class="post-actions" style="font-size:12px;">
            <button onclick="alert('Feature coming soon!')">👍 ${post.likes || 0}</button>
            <button onclick="alert('Feature coming soon!')">💬 ${post.comments?.length || 0}</button>
          </div>
        `;
        postsList.appendChild(postDiv);
      });

      if (postsList.innerHTML === "") postsList.innerHTML = "<p style='text-align:center; color:#888;'>No posts found</p>";
    } catch (e) {
      postsList.innerHTML = "<p style='text-align:center; color:red;'>Error loading posts: " + (e.message || e) + "</p>";
      console.error(e);
    }
  }

  function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(months / 12);
    return `${years}y ago`;
  }

  function escapeHtml(text) {
    if (text === undefined || text === null) return "";
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  window.openImageModal = function (imageUrl) {
    alert("Image viewer - Click OK to open in new tab");
    window.open(imageUrl, '_blank');
  };

  // ================= POST IMAGE PREVIEW =================
  const postImageInput = document.getElementById("postImage");
  if (postImageInput) {
    postImageInput.onchange = function (e) {
      const img = document.getElementById("previewImage");
      if (!img) return;
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];

        if (file.size > 5 * 1024 * 1024) {
          alert("Image must be under 5MB");
          e.target.value = "";
          img.classList.add("hidden");
          return;
        }

        if (!file.type.startsWith('image/')) {
          alert("Please upload an image file");
          e.target.value = "";
          img.classList.add("hidden");
          return;
        }

        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;
        img.classList.remove("hidden");

        img.onload = function () {
          URL.revokeObjectURL(objectUrl);
        };
      } else {
        img.classList.add("hidden");
        img.src = "";
      }
    };
  }

  // ================= CREATE POST =================
  const postBtn = document.getElementById("postBtn");
  if (postBtn) {
    postBtn.onclick = async function () {
      if (!db) return alert("Database not available.");
      const contentEl = document.getElementById("postContent");
      const categoryEl = document.getElementById("postCategory");
      const imageInputEl = document.getElementById("postImage");
      const content = contentEl ? contentEl.value : "";
      const category = categoryEl ? categoryEl.value : "";
      const imageFile = imageInputEl && imageInputEl.files ? imageInputEl.files[0] : null;

      if (!content && !imageFile) return alert("Write something or upload an image!");

      postBtn.disabled = true;
      postBtn.textContent = "Uploading...";

      try {
        let imageUrl = null;
        if (imageFile) {
          console.log("Starting image upload to Imgur...");

          const reader = new FileReader();
          const base64Promise = new Promise((resolve, reject) => {
            reader.onloadend = () => {
              const base64String = reader.result.split(',')[1];
              resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
          });

          const base64Data = await base64Promise;
          console.log("Image converted to base64");

          const response = await fetch('https://api.imgur.com/3/upload', {
            method: 'POST',
            headers: {
              'Authorization': 'Client-ID 546c25a59c58ad7',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              image: base64Data,
              type: 'base64'
            })
          });

          const result = await response.json();
          console.log("Imgur response:", result);

          if (result.success && result.data && result.data.link) {
            imageUrl = result.data.link;
            console.log("Image uploaded successfully:", imageUrl);
          } else {
            throw new Error(result.data?.error?.message || "Image upload failed. Please try again.");
          }
        }

        await db.collection("posts").add({
          content: content || "",
          category,
          imageUrl,
          author: currentUsername,
          authorId: currentUser ? currentUser.uid : null,
          timestamp: Date.now(),
          likes: 0,
          likedBy: [],
          reported: false,
          reportCount: 0,
          comments: [],
          pinned: false,
          edited: false,
          bookmarkedBy: []
        });

        if (contentEl) contentEl.value = "";
        if (imageInputEl) imageInputEl.value = "";
        const previewImage = document.getElementById("previewImage");
        if (previewImage) {
          previewImage.classList.add("hidden");
          previewImage.src = "";
        }

        postBtn.disabled = false;
        postBtn.textContent = "📤 Post";

        alert("Post created successfully!");
        loadPosts();
      } catch (e) {
        postBtn.disabled = false;
        postBtn.textContent = "📤 Post";
        alert("Error creating post: " + (e.message || e));
        console.error("Full error:", e);
      }
    };
  }

  // ================= SEARCH AND FILTER =================
  const searchPostInput = document.getElementById("searchPost");
  if (searchPostInput) {
    searchPostInput.oninput = function (e) {
      const category = document.getElementById("categoryFilter")?.value || 'all';
      const sort = document.getElementById("sortPosts")?.value || 'newest';
      loadPosts(e.target.value, category, sort);
    };
  }

  const categoryFilter = document.getElementById("categoryFilter");
  if (categoryFilter) {
    categoryFilter.onchange = function (e) {
      const search = document.getElementById("searchPost")?.value || '';
      const sort = document.getElementById("sortPosts")?.value || 'newest';
      loadPosts(search, e.target.value, sort);
    };
  }

  const sortPosts = document.getElementById("sortPosts");
  if (sortPosts) {
    sortPosts.onchange = function (e) {
      const search = document.getElementById("searchPost")?.value || '';
      const category = document.getElementById("categoryFilter")?.value || 'all';
      loadPosts(search, category, e.target.value);
    };
  }

  // ================= SEARCH USERS =================
  const searchUserInput = document.getElementById("searchUser");
  if (searchUserInput) {
    searchUserInput.oninput = function (e) {
      loadUsers(e.target.value);
    };
  }

  async function loadUsers(search = "") {
    const usersList = document.getElementById("usersList");
    if (!usersList) return;
    usersList.innerHTML = "<p style='text-align:center; color:#888;'>Loading users...</p>";

    if (!db) {
      usersList.innerHTML = "<p style='text-align:center; color:red;'>Database not available</p>";
      return;
    }

    try {
      const snapshot = await db.collection("users").get();
      usersList.innerHTML = "";

      const onlineUsers = [];
      const offlineUsers = [];

      snapshot.forEach(doc => {
        const user = doc.data();
        const userId = doc.id;
        const userData = { userId, ...user };

        if (search && !userData.username.toLowerCase().includes(search.toLowerCase())) return;

        if (user.status === 'online') onlineUsers.push(userData);
        else offlineUsers.push(userData);
      });

      if (onlineUsers.length > 0) {
        const onlineHeader = document.createElement("div");
        onlineHeader.style.cssText = "color:#00d4ff; font-weight:bold; margin:15px 0 5px 0; font-size:14px;";
        onlineHeader.innerHTML = `🟢 ONLINE — ${onlineUsers.length}`;
        usersList.appendChild(onlineHeader);
        onlineUsers.forEach(user => renderUserItem(user, usersList));
      }

      if (offlineUsers.length > 0) {
        const offlineHeader = document.createElement("div");
        offlineHeader.style.cssText = "color:#888; font-weight:bold; margin:15px 0 5px 0; font-size:14px;";
        offlineHeader.innerHTML = `⚫ OFFLINE — ${offlineUsers.length}`;
        usersList.appendChild(offlineHeader);
        offlineUsers.forEach(user => renderUserItem(user, usersList));
      }

      if (onlineUsers.length === 0 && offlineUsers.length === 0) {
        usersList.innerHTML = "<p style='text-align:center; color:#888;'>No users found</p>";
      }
    } catch (e) {
      usersList.innerHTML = "<p style='text-align:center; color:red;'>Error: " + (e.message || e) + "</p>";
    }
  }

  function renderUserItem(user, container) {
    const userId = user.userId;
    const statusColor = user.status === 'online' ? '#00ff00' : '#888';
    const statusDot = `<span style="display:inline-block; width:10px; height:10px; background:${statusColor}; border-radius:50%; margin-right:5px;"></span>`;
    const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=8a2be2&color=fff&size=64`;

    // Check if user is the owner
    const isUserOwner = (user.email === "d29510713@gmail.com");

    const userDiv = document.createElement("div");
    userDiv.className = "user-item";
    userDiv.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(0, 0, 0, 0.5);
      border: 2px solid rgba(138, 43, 226, 0.3);
      border-radius: 10px;
      padding: 12px;
      margin: 8px 0;
      transition: all 0.3s ease;
      cursor: pointer;
    `;

    userDiv.innerHTML = `
      <img src="${avatar}" 
           style="width:48px; height:48px; border-radius:50%; border:2px solid ${statusColor};"
           onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=8a2be2&color=fff&size=64'">
      <div style="flex:1;">
        <div>
          ${statusDot}
          <strong style="color:#fff; font-size:16px;">${escapeHtml(user.username)}</strong>
          ${isUserOwner ? '<span style="color:#ff6b35; text-shadow: 0 0 10px rgba(255,107,53,0.8);"> 👑 OWNER</span>' : ''}
          ${user.moderator && !isUserOwner ? '<span style="color:#00d4ff;"> 🛡️ MOD</span>' : ''}
          ${user.banned ? '<span style="color:red;"> 🚫 BANNED</span>' : ''}
          ${currentUser && userId === currentUser.uid ? '<span style="color:#ffd700;"> (You)</span>' : ''}
        </div>
        ${user.customStatus ? `<div style="color:#888; font-size:13px; margin-top:3px;">${escapeHtml(user.customStatus)}</div>` : ''}
        <div style="color:#888; font-size:12px; margin-top:3px;">
          ${user.status === 'online' ? 'Online' : user.lastSeen ? `Last seen ${getTimeAgo(user.lastSeen)}` : 'Offline'}
        </div>
      </div>
      ${(isOwner || isModerator) && currentUser && userId !== currentUser.uid && !isUserOwner ? `
        <div style="display:flex; gap:5px; flex-wrap:wrap;">
          ${isOwner && !user.moderator ? `<button onclick="makeModerator('${userId}', '${escapeHtml(user.username)}')" style="padding:6px 12px; font-size:12px;">Make Mod</button>` : ''}
          ${isOwner && user.moderator ? `<button onclick="removeModerator('${userId}', '${escapeHtml(user.username)}')" style="padding:6px 12px; font-size:12px;">Remove Mod</button>` : ''}
          ${!user.banned ? `<button onclick="banUser('${userId}', '${escapeHtml(user.username)}')" style="padding:6px 12px; font-size:12px;">Ban</button>` : ''}
          ${user.banned ? `<button onclick="unbanUser('${userId}', '${escapeHtml(user.username)}')" style="padding:6px 12px; font-size:12px;">Unban</button>` : ''}
        </div>
      ` : userId !== (currentUser && currentUser.uid) && !isUserOwner ? `
        <button onclick="openDMWithUser('${escapeHtml(user.username)}')" style="padding:6px 12px; font-size:12px; background:linear-gradient(135deg, #00d4ff, #0099cc);">💬 Message</button>
      ` : isUserOwner && currentUser && userId !== currentUser.uid ? `
        <span style="color:#888; font-size:12px;">Cannot moderate owner</span>
      ` : ''}

    `;

    container.appendChild(userDiv);
  }

  window.openDMWithUser = function (username) {
    const dmField = document.getElementById("dmToUsername");
    if (dmField) dmField.value = username;
    showTab('dms');
  };

  window.makeModerator = async function (userId, username) {
    if (!isOwner) {
      alert("Only the owner can make moderators");
      return;
    }
    if (!confirm(`Make ${username} a moderator?`)) return;
    try {
      await db.collection("users").doc(userId).update({ moderator: true });
      alert(`${username} is now a moderator!`);
      loadUsers();
    } catch (e) {
      alert("Error: " + (e.message || e));
    }
  };

  window.removeModerator = async function (userId, username) {
    if (!isOwner) {
      alert("Only the owner can remove moderators");
      return;
    }
    if (!confirm(`Remove ${username} as moderator?`)) return;
    try {
      await db.collection("users").doc(userId).update({ moderator: false });
      alert(`${username} is no longer a moderator`);
      loadUsers();
    } catch (e) {
      alert("Error: " + (e.message || e));
    }
  };

  window.banUser = async function (userId, username) {
    if (!db) return alert("Database not available");
    // Check if trying to ban owner
    const userDoc = await db.collection("users").doc(userId).get();
    if (userDoc.exists && userDoc.data().email === "d29510713@gmail.com") {
      alert("❌ Cannot ban the owner!");
      return;
    }

    if (!confirm(`Ban ${username}?`)) return;
    try {
      await db.collection("users").doc(userId).update({ banned: true });
      alert(`${username} has been banned`);
      loadUsers();
    } catch (e) {
      alert("Error: " + (e.message || e));
    }
  };

  window.unbanUser = async function (userId, username) {
    if (!confirm(`Unban ${username}?`)) return;
    try {
      await db.collection("users").doc(userId).update({ banned: false, warnings: 0 });
      alert(`${username} has been unbanned`);
      loadUsers();
    } catch (e) {
      alert("Error: " + (e.message || e));
    }
  };

  function loadDMs() {
    const dmsList = document.getElementById("dmsList");
    if (dmsList) dmsList.innerHTML = "<p style='text-align:center; color:#888;'>DMs coming soon...</p>";
  }

  function loadUpdates() {
    const updatesList = document.getElementById("updatesList");
    if (updatesList) updatesList.innerHTML = "<p style='text-align:center; color:#888;'>Updates coming soon...</p>";
  }

  function loadSuggestions() {
    const suggestionsList = document.getElementById("suggestionsList");
    if (!suggestionsList) return;
    suggestionsList.innerHTML = "<p style='text-align:center; color:#888;'>Loading suggestions...</p>";

    if (!db) {
      suggestionsList.innerHTML = "<p style='text-align:center; color:red;'>Database not available</p>";
      return;
    }

    db.collection("suggestions").get().then(snapshot => {
      const suggestions = [];
      snapshot.forEach(doc => {
        suggestions.push({ id: doc.id, ...doc.data() });
      });

      suggestions.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return (b.upvotes || 0) - (a.upvotes || 0);
      });

      suggestionsList.innerHTML = "";

      suggestions.forEach(sug => {
        const sugDiv = document.createElement("div");
        sugDiv.className = "post";

        let statusColor = "#888";
        let statusText = sug.status || 'pending';
        if (statusText === 'approved') statusColor = "#00d4ff";
        if (statusText === 'implemented') statusColor = "#00ff00";
        if (statusText === 'rejected') statusColor = "#ff0000";

        const userUpvoted = sug.upvotedBy && currentUser && sug.upvotedBy.includes(currentUser.uid);

        sugDiv.innerHTML = `
          <div class="post-header">
            <div>
              <strong>${escapeHtml(sug.author)}</strong>
              <span style="color:${statusColor}; font-weight:bold; margin-left:10px;">
                ${statusText.toUpperCase()}
              </span>
            </div>
            <span class="post-time">${new Date(sug.timestamp || Date.now()).toLocaleString()}</span>
          </div>
          <div class="post-content"><strong>${escapeHtml(sug.title)}</strong></div>
          <div class="post-content">${escapeHtml(sug.description)}</div>
          <div class="post-actions">
            <button onclick="upvoteSuggestion('${sug.id}')" 
              style="background:${userUpvoted ? 'linear-gradient(135deg, #ff6b35, #f7931e)' : ''}">
              👍 ${sug.upvotes || 0}
            </button>
            ${(isOwner || isModerator) ? `
              <button onclick="updateSuggestionStatus('${sug.id}', 'approved')">✅ Approve</button>
              <button onclick="updateSuggestionStatus('${sug.id}', 'implemented')">🎉 Implement</button>
              <button onclick="updateSuggestionStatus('${sug.id}', 'rejected')">❌ Reject</button>
              <button onclick="deleteSuggestion('${sug.id}')">🗑️</button>
            ` : ''}
          </div>
        `;
        suggestionsList.appendChild(sugDiv);
      });

      if (suggestionsList.innerHTML === "") {
        suggestionsList.innerHTML = "<p style='text-align:center; color:#888;'>No suggestions yet</p>";
      }
    }).catch(e => {
      suggestionsList.innerHTML = "<p style='text-align:center; color:red;'>Error: " + (e.message || e) + "</p>";
    });
  }

  // Submit suggestion
  const submitSuggestionBtn = document.getElementById("submitSuggestion");
  if (submitSuggestionBtn) {
    submitSuggestionBtn.onclick = async function () {
      if (!db) return alert("Database not available.");
      const titleEl = document.getElementById("suggestionTitle");
      const descEl = document.getElementById("suggestionDesc");
      const title = titleEl ? titleEl.value.trim() : "";
      const description = descEl ? descEl.value.trim() : "";

      if (!title || !description) return alert("Fill in all fields");

      try {
        await db.collection("suggestions").add({
          title,
          description,
          author: currentUsername,
          authorId: currentUser ? currentUser.uid : null,
          timestamp: Date.now(),
          status: 'pending',
          upvotes: 0,
          upvotedBy: []
        });

        if (titleEl) titleEl.value = "";
        if (descEl) descEl.value = "";
        alert("Suggestion submitted!");
        loadSuggestions();
      } catch (e) {
        alert("Error: " + (e.message || e));
      }
    };
  }

  window.upvoteSuggestion = async function (sugId) {
    if (!db || !currentUser) return alert("Action requires login.");
    try {
      const sugRef = db.collection("suggestions").doc(sugId);
      const sugDoc = await sugRef.get();
      const sug = sugDoc.data();

      let upvotedBy = sug.upvotedBy || [];
      let upvotes = sug.upvotes || 0;

      if (upvotedBy.includes(currentUser.uid)) {
        upvotedBy = upvotedBy.filter(uid => uid !== currentUser.uid);
        upvotes--;
      } else {
        upvotedBy.push(currentUser.uid);
        upvotes++;
      }

      await sugRef.update({ upvotes, upvotedBy });
      loadSuggestions();
    } catch (e) {
      alert("Error: " + (e.message || e));
    }
  };

  window.updateSuggestionStatus = async function (sugId, status) {
    if (!db) return alert("Database not available.");
    try {
      await db.collection("suggestions").doc(sugId).update({ status });
      loadSuggestions();
    } catch (e) {
      alert("Error: " + (e.message || e));
    }
  };

  window.deleteSuggestion = async function (sugId) {
    if (!confirm("Delete this suggestion?")) return;
    try {
      await db.collection("suggestions").doc(sugId).delete();
      loadSuggestions();
    } catch (e) {
      alert("Error: " + (e.message || e));
    }
  };

  function loadLeaderboard() {
    const leaderboardList = document.getElementById("leaderboardList");
    if (leaderboardList) leaderboardList.innerHTML = "<p style='text-align:center; color:#888;'>Leaderboard coming soon...</p>";
  }

  // ================= POLLS =================
  window.createPoll = async function () {
    const question = prompt("Poll question:");
    if (!question) return;

    const options = [];
    for (let i = 0; i < 4; i++) {
      const opt = prompt(`Option ${i + 1} (leave empty to finish):`);
      if (!opt) break;
      options.push({ text: opt, votes: 0 });
    }

    if (options.length < 2) return alert("Need at least 2 options!");

    const category = document.getElementById("postCategory") ? document.getElementById("postCategory").value : "";

    try {
      await db.collection("posts").add({
        content: "",
        category,
        imageUrl: null,
        author: currentUsername,
        authorId: currentUser ? currentUser.uid : null,
        timestamp: Date.now(),
        likes: 0,
        likedBy: [],
        reported: false,
        reportCount: 0,
        comments: [],
        pinned: false,
        edited: false,
        bookmarkedBy: [],
        poll: {
          question,
          options,
          voters: []
        }
      });
      alert("Poll created!");
      loadPosts();
    } catch (e) {
      alert("Error: " + (e.message || e));
    }
  };

  // ================= PROFILE FUNCTIONS =================
  window.setCustomStatus = async function () {
    if (!db || !currentUser) return alert("Action requires login.");
    const status = prompt("Set your custom status:", "");
    if (status === null) return;

    try {
      await db.collection("users").doc(currentUser.uid).update({
        customStatus: status.substring(0, 100)
      });
      alert("Status updated!");
    } catch (e) {
      alert("Error: " + (e.message || e));
    }
  };

  window.changeProfilePicture = async function () {
    if (!db || !currentUser) return alert("Action requires login.");
    const choice = prompt("Choose option:\n1. Upload image URL\n2. Generate new random avatar\n\nEnter 1 or 2:");

    if (choice === "1") {
      const url = prompt("Enter image URL (direct link to image):");
      if (!url) return;

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        alert("Please enter a valid URL starting with http:// or https://");
        return;
      }

      try {
        await db.collection("users").doc(currentUser.uid).update({
          avatar: url
        });
        alert("Profile picture updated!");
      } catch (e) {
        alert("Error: " + (e.message || e));
      }
    } else if (choice === "2") {
      const colors = ['8a2be2', 'ff6b35', '00d4ff', 'ffd700', 'ff1493', '00ff00', 'ff69b4', '00ced1', 'ff4500'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const newAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUsername)}&background=${color}&color=fff&size=128&bold=true`;

      try {
        await db.collection("users").doc(currentUser.uid).update({
          avatar: newAvatar
        });
        alert("Profile picture updated!");
      } catch (e) {
        alert("Error: " + (e.message || e));
      }
    }
  };

  console.log("All functions loaded successfully!");
}; // end window.onload
