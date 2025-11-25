window.onload = function() {
  console.log("App loaded!");

  // ================= STARS =================
  for(let i=0;i<150;i++){
    const s=document.createElement("div");
    s.className="star";
    s.style.top=Math.random()*100+"%";
    s.style.left=Math.random()*100+"%";
    s.style.width=(Math.random()*2+1)+"px";
    s.style.height=(Math.random()*2+1)+"px";
    document.getElementById("stars").appendChild(s);
  }

  // ================= TABS =================
  function showTab(tab){
    console.log("Switching to tab:", tab);
    
    ['posts','users','dms','updates','suggestions','leaderboard'].forEach(t=>{
      const section = document.getElementById(t+'Section');
      const tabBtn = document.getElementById('tab'+t.charAt(0).toUpperCase()+t.slice(1));
      
      if(section) section.classList.add('hidden');
      if(tabBtn) tabBtn.classList.remove('active');
    });
    
    const selectedSection = document.getElementById(tab+'Section');
    const selectedTab = document.getElementById('tab'+tab.charAt(0).toUpperCase()+tab.slice(1));
    
    if(selectedSection) selectedSection.classList.remove('hidden');
    if(selectedTab) selectedTab.classList.add('active');

    if(tab === 'posts') loadPosts();
    if(tab === 'users') loadUsers();
    if(tab === 'dms') loadDMs();
    if(tab === 'updates') loadUpdates();
    if(tab === 'suggestions') loadSuggestions();
    if(tab === 'leaderboard') loadLeaderboard();
  }

  const tabPosts = document.getElementById("tabPosts");
  const tabUsers = document.getElementById("tabUsers");
  const tabDMs = document.getElementById("tabDMs");
  const tabUpdates = document.getElementById("tabUpdates");
  const tabSuggestions = document.getElementById("tabSuggestions");
  const tabLeaderboard = document.getElementById("tabLeaderboard");

  if(tabPosts) tabPosts.onclick = () => showTab('posts');
  if(tabUsers) tabUsers.onclick = () => showTab('users');
  if(tabDMs) tabDMs.onclick = () => showTab('dms');
  if(tabUpdates) tabUpdates.onclick = () => showTab('updates');
  if(tabSuggestions) tabSuggestions.onclick = () => showTab('suggestions');
  if(tabLeaderboard) tabLeaderboard.onclick = () => showTab('leaderboard');

  // ================= TOGGLE LOGIN/REGISTER =================
  document.getElementById("toggleToLogin").onclick = ()=>{
    document.getElementById("registerBox").classList.add("hidden"); 
    document.getElementById("loginBox").classList.remove("hidden");
  }
  document.getElementById("toggleToRegister").onclick = ()=>{
    document.getElementById("loginBox").classList.add("hidden"); 
    document.getElementById("registerBox").classList.remove("hidden");
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
  firebase.initializeApp(firebaseConfig);
  const auth=firebase.auth();
  const db=firebase.firestore();
  const storage=firebase.storage();
  let currentUser=null;
  let currentUsername="";
  let isOwner=false;
  let isModerator=false;

  // ================= REGISTER =================
  window.register = async function(){
    console.log("Register function called");
    const email=document.getElementById("regEmail").value;
    const pass=document.getElementById("regPass").value;
    const username=document.getElementById("regUsername").value;
    if(!email||!pass||!username) return alert("All fields required");
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRegex.test(email)) return alert("Please enter a valid email address");
    
    if(pass.length < 6) return alert("Password must be at least 6 characters");
    
    try{
      const snap=await db.collection("users").where("username","==",username).get();
      if(!snap.empty) return alert("Username taken");
      
      const userCred=await auth.createUserWithEmailAndPassword(email,pass);
      
      const colors = ['8a2be2', 'ff6b35', '00d4ff', 'ffd700', 'ff1493', '00ff00'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=${color}&color=fff&size=128&bold=true`;
      
      await db.collection("users").doc(userCred.user.uid).set({
        username,
        email,
        joinDate:Date.now(),
        banned:false,
        moderator:false,
        warnings:0,
        emailVerified:false,
        avatar: avatar,
        status: 'offline',
        customStatus: '',
        lastLogin: Date.now()
      });
      
      await userCred.user.sendEmailVerification();
      await auth.signOut();
      
      alert("Account created! Please check your email and verify your account before logging in.");
      document.getElementById("registerBox").classList.add("hidden");
      document.getElementById("loginBox").classList.remove("hidden");
    }catch(e){
      if(e.code === 'auth/email-already-in-use') {
        alert("This email is already registered");
      } else if(e.code === 'auth/invalid-email') {
        alert("Invalid email address");
      } else {
        alert(e.message);
      }
    }
  }
  
  const registerBtn = document.getElementById("registerBtn");
  if(registerBtn) {
    console.log("Register button found");
    registerBtn.onclick = register;
  }

  // ================= LOGIN =================
  window.login = async function(){
    console.log("Login function called");
    const email=document.getElementById("logEmail").value;
    const pass=document.getElementById("logPass").value;
    console.log("Email:", email, "Password length:", pass.length);
    
    if(!email||!pass) return alert("Enter email and password");
    
    try{
      console.log("Attempting to sign in...");
      const userCred=await auth.signInWithEmailAndPassword(email,pass);
      console.log("Sign in successful!");
      
      if(!userCred.user.emailVerified) {
        console.log("Email not verified");
        const proceed = confirm("⚠️ Your email is not verified yet.\n\nClick OK to continue anyway, or Cancel to verify first.");
        if(!proceed) {
          await userCred.user.sendEmailVerification();
          alert("Verification email sent! Please check your inbox.");
          await auth.signOut();
          return;
        }
      }
      
      console.log("Calling loginUser...");
      loginUser(userCred.user);
    }catch(e){
      console.error("Login error:", e);
      if(e.code === 'auth/user-not-found') {
        alert("❌ No account found with this email.\n\nPlease register first!");
      } else if(e.code === 'auth/wrong-password') {
        alert("❌ Incorrect password.\n\nTry again or use 'Forgot Password'");
      } else if(e.code === 'auth/invalid-email') {
        alert("❌ Invalid email address format");
      } else {
        alert("Login error: " + e.message);
      }
    }
  }
  
  const loginBtn = document.getElementById("loginBtn");
  if(loginBtn) {
    console.log("Login button found, attaching handler");
    loginBtn.onclick = login;
  } else {
    console.error("Login button NOT found!");
  }

  document.getElementById("forgotPass").onclick=async function(){
    const email=document.getElementById("logEmail").value;
    if(!email)return alert("Enter your email");
    try{await auth.sendPasswordResetEmail(email); alert("Password reset sent!");}catch(e){alert(e.message);}
  }

  window.logout=async function(){
    await auth.signOut(); 
    currentUser=null;
    currentUsername="";
    isOwner=false;
    isModerator=false;
    document.getElementById("forum").classList.add("hidden"); 
    document.getElementById("box").classList.remove("hidden");
  }
  
  const logoutBtn = document.getElementById("logoutBtn");
  if(logoutBtn) logoutBtn.onclick = logout;

  auth.onAuthStateChanged(user=>{if(user) loginUser(user);});

  async function loginUser(user){
    console.log("loginUser called");
    currentUser=user;
    const userDoc = await db.collection("users").doc(user.uid).get();
    if(userDoc.exists){
      const userData = userDoc.data();
      if(userData.banned) {
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
    
    document.getElementById("box").classList.add("hidden");
    document.getElementById("forum").classList.remove("hidden");
    
    if(isOwner || isModerator) {
      document.getElementById("ownerControls").classList.remove("hidden");
      if(!isOwner) {
        const clearBtn = document.getElementById("clearForumBtn");
        const makeModBtn = document.getElementById("makeModBtn");
        if(clearBtn) clearBtn.style.display = "none";
        if(makeModBtn) makeModBtn.style.display = "none";
      }
    }
    
    console.log("Logged in successfully!");
    loadPosts();
  }

  function setupPresence(userId) {
    window.addEventListener('beforeunload', () => {
      db.collection("users").doc(userId).update({ status: 'offline' });
    });
    
    setInterval(() => {
      if(currentUser) {
        db.collection("users").doc(userId).update({ 
          status: 'online',
          lastSeen: Date.now()
        });
      }
    }, 60000);
  }

  // ================= LOAD POSTS =================
  async function loadPosts(searchQuery = "", filterCategory = "", sortBy = "newest"){
    const postsList = document.getElementById("postsList");
    postsList.innerHTML = "<p style='text-align:center; color:#888;'>Loading posts...</p>";
    
    try{
      const snapshot = await db.collection("posts").limit(100).get();
      
      const userDataCache = {};
      const userIds = new Set();
      snapshot.forEach(doc => userIds.add(doc.data().authorId));
      
      for(let userId of userIds) {
        try {
          const userDoc = await db.collection("users").doc(userId).get();
          if(userDoc.exists) {
            userDataCache[userId] = userDoc.data();
          }
        } catch(e) {
          console.log("Could not fetch user:", userId);
        }
      }
      
      let posts = [];
      snapshot.forEach(doc => {
        const post = doc.data();
        
        if(searchQuery && !post.content.toLowerCase().includes(searchQuery.toLowerCase())){
          return;
        }
        
        if(filterCategory && filterCategory !== 'all' && post.category !== filterCategory){
          return;
        }
        
        posts.push({ id: doc.id, ...post });
      });
      
      if(sortBy === 'newest') {
        posts.sort((a, b) => {
          if(a.pinned && !b.pinned) return -1;
          if(!a.pinned && b.pinned) return 1;
          return b.timestamp - a.timestamp;
        });
      } else if(sortBy === 'popular') {
        posts.sort((a, b) => {
          if(a.pinned && !b.pinned) return -1;
          if(!a.pinned && b.pinned) return 1;
          return (b.likes || 0) - (a.likes || 0);
        });
      } else if(sortBy === 'discussed') {
        posts.sort((a, b) => {
          if(a.pinned && !b.pinned) return -1;
          if(!a.pinned && b.pinned) return 1;
          return (b.comments?.length || 0) - (a.comments?.length || 0);
        });
      }
      
      postsList.innerHTML = "";
      
      posts.forEach(post => {
        const postId = post.id;
        
        const isLiked = post.likedBy && post.likedBy.includes(currentUser.uid);
        const isBookmarked = post.bookmarkedBy && post.bookmarkedBy.includes(currentUser.uid);
        const canModerate = isOwner || isModerator;
        const canDelete = post.authorId === currentUser.uid || canModerate;
        const canEdit = post.authorId === currentUser.uid;
        
        const authorData = userDataCache[post.authorId];
        let roleBadge = "";
        if(authorData) {
          if(authorData.email === "d29510713@gmail.com") {
            roleBadge = '<span style="color:#ff6b35; text-shadow: 0 0 10px rgba(255,107,53,0.8);"> 👑 OWNER</span>';
          } else if(authorData.moderator) {
            roleBadge = '<span style="color:#00d4ff; text-shadow: 0 0 10px rgba(0,212,255,0.6);"> 🛡️ MOD</span>';
          }
        }
        
        const timeAgo = getTimeAgo(post.timestamp);
        const pinBadge = post.pinned ? '<span style="color:#ffd700;">📌 PINNED</span>' : '';
        const engagement = (post.likes || 0) + ((post.comments?.length || 0) * 2);
        const trendingBadge = engagement > 10 ? '<span style="color:#ff6b35;">🔥 TRENDING</span>' : '';
        
        const postDiv = document.createElement("div");
        postDiv.className = "post";
        if(post.reported) postDiv.style.borderColor = "rgba(255, 0, 0, 0.6)";
        if(post.pinned) postDiv.style.borderColor = "rgba(255, 215, 0, 0.6)";
        
        postDiv.innerHTML = `
          <div class="post-header">
            <div>
              <strong>${post.author}${roleBadge}</strong> - ${post.category} ${pinBadge} ${trendingBadge}
              ${post.reported ? '<span style="color:red;"> ⚠ REPORTED</span>' : ''}
              ${post.edited ? '<span style="color:#888;font-size:11px;"> (edited)</span>' : ''}
            </div>
            <span class="post-time">${new Date(post.timestamp).toLocaleString()} (${timeAgo})</span>
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
      
      if(postsList.innerHTML === "") postsList.innerHTML = "<p style='text-align:center; color:#888;'>No posts found</p>";
    }catch(e){
      postsList.innerHTML = "<p style='text-align:center; color:red;'>Error loading posts: " + e.message + "</p>";
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
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  window.openImageModal = function(imageUrl){
    alert("Image viewer - Click OK to open in new tab");
    window.open(imageUrl, '_blank');
  }

  function loadUsers() {
    document.getElementById("usersList").innerHTML = "<p style='text-align:center; color:#888;'>Users list coming soon...</p>";
  }

  function loadDMs() {
    document.getElementById("dmsList").innerHTML = "<p style='text-align:center; color:#888;'>DMs coming soon...</p>";
  }

  function loadUpdates() {
    document.getElementById("updatesList").innerHTML = "<p style='text-align:center; color:#888;'>Updates coming soon...</p>";
  }

  function loadSuggestions() {
    document.getElementById("suggestionsList").innerHTML = "<p style='text-align:center; color:#888;'>Suggestions coming soon...</p>";
  }

  function loadLeaderboard() {
    document.getElementById("leaderboardList").innerHTML = "<p style='text-align:center; color:#888;'>Leaderboard coming soon...</p>";
  }

  console.log("All functions loaded successfully!");
};
