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
    const usersList = document.getElementById("usersList");
    usersList.innerHTML = "<p style='text-align:center; color:#888;'>Loading users...</p>";
    
    db.collection("users").get().then(snapshot => {
      usersList.innerHTML = "";
      
      const onlineUsers = [];
      const offlineUsers = [];
      
      snapshot.forEach(doc => {
        const user = doc.data();
        const userId = doc.id;
        const userData = { userId, ...user };
        
        if(user.status === 'online') {
          onlineUsers.push(userData);
        } else {
          offlineUsers.push(userData);
        }
      });
      
      if(onlineUsers.length > 0) {
        const onlineHeader = document.createElement("div");
        onlineHeader.style.cssText = "color:#00d4ff; font-weight:bold; margin:15px 0 5px 0; font-size:14px;";
        onlineHeader.innerHTML = `🟢 ONLINE — ${onlineUsers.length}`;
        usersList.appendChild(onlineHeader);
        onlineUsers.forEach(user => renderUserItem(user, usersList));
      }
      
      if(offlineUsers.length > 0) {
        const offlineHeader = document.createElement("div");
        offlineHeader.style.cssText = "color:#888; font-weight:bold; margin:15px 0 5px 0; font-size:14px;";
        offlineHeader.innerHTML = `⚫ OFFLINE — ${offlineUsers.length}`;
        usersList.appendChild(offlineHeader);
        offlineUsers.forEach(user => renderUserItem(user, usersList));
      }
    }).catch(e => {
      usersList.innerHTML = "<p style='text-align:center; color:red;'>Error: " + e.message + "</p>";
    });
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
          <strong style="color:#fff; font-size:16px;">${user.username}</strong>
          ${isUserOwner ? '<span style="color:#ff6b35; text-shadow: 0 0 10px rgba(255,107,53,0.8);"> 👑 OWNER</span>' : ''}
          ${user.moderator && !isUserOwner ? '<span style="color:#00d4ff;"> 🛡️ MOD</span>' : ''}
          ${user.banned ? '<span style="color:red;"> 🚫 BANNED</span>' : ''}
          ${userId === currentUser.uid ? '<span style="color:#ffd700;"> (You)</span>' : ''}
        </div>
        ${user.customStatus ? `<div style="color:#888; font-size:13px; margin-top:3px;">${escapeHtml(user.customStatus)}</div>` : ''}
        <div style="color:#888; font-size:12px; margin-top:3px;">
          ${user.status === 'online' ? 'Online' : user.lastSeen ? `Last seen ${getTimeAgo(user.lastSeen)}` : 'Offline'}
        </div>
      </div>
      ${(isOwner || isModerator) && userId !== currentUser.uid && !isUserOwner ? `
        <div style="display:flex; gap:5px; flex-wrap:wrap;">
          ${isOwner && !user.moderator ? `<button onclick="makeModerator('${userId}', '${user.username}')" style="padding:6px 12px; font-size:12px;">Make Mod</button>` : ''}
          ${isOwner && user.moderator ? `<button onclick="removeModerator('${userId}', '${user.username}')" style="padding:6px 12px; font-size:12px;">Remove Mod</button>` : ''}
          ${!user.banned ? `<button onclick="banUser('${userId}', '${user.username}')" style="padding:6px 12px; font-size:12px;">Ban</button>` : ''}
          ${user.banned ? `<button onclick="unbanUser('${userId}', '${user.username}')" style="padding:6px 12px; font-size:12px;">Unban</button>` : ''}
        </div>
      ` : userId !== currentUser.uid && !isUserOwner ? `
        <button onclick="openDMWithUser('${user.username}')" style="padding:6px 12px; font-size:12px; background:linear-gradient(135deg, #00d4ff, #0099cc);">💬 Message</button>
      ` : isUserOwner && userId !== currentUser.uid ? `
        <span style="color:#888; font-size:12px;">Cannot moderate owner</span>
      ` : ''}
    `;
    
    container.appendChild(userDiv);
  }

  window.openDMWithUser = function(username) {
    document.getElementById("dmToUsername").value = username;
    showTab('dms');
  }

  window.makeModerator = async function(userId, username){
    if(!isOwner) {
      alert("Only the owner can make moderators");
      return;
    }
    if(!confirm(`Make ${username} a moderator?`)) return;
    try{
      await db.collection("users").doc(userId).update({moderator: true});
      alert(`${username} is now a moderator!`);
      loadUsers();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  window.removeModerator = async function(userId, username){
    if(!isOwner) {
      alert("Only the owner can remove moderators");
      return;
    }
    if(!confirm(`Remove ${username} as moderator?`)) return;
    try{
      await db.collection("users").doc(userId).update({moderator: false});
      alert(`${username} is no longer a moderator`);
      loadUsers();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  window.banUser = async function(userId, username){
    // Check if trying to ban owner
    const userDoc = await db.collection("users").doc(userId).get();
    if(userDoc.exists && userDoc.data().email === "d29510713@gmail.com") {
      alert("❌ Cannot ban the owner!");
      return;
    }
    
    if(!confirm(`Ban ${username}?`)) return;
    try{
      await db.collection("users").doc(userId).update({banned: true});
      alert(`${username} has been banned`);
      loadUsers();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  window.unbanUser = async function(userId, username){
    if(!confirm(`Unban ${username}?`)) return;
    try{
      await db.collection("users").doc(userId).update({banned: false, warnings: 0});
      alert(`${username} has been unbanned`);
      loadUsers();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  function loadDMs() {
    document.getElementById("dmsList").innerHTML = "<p style='text-align:center; color:#888;'>DMs coming soon...</p>";
  }

  function loadUpdates() {
    document.getElementById("updatesList").innerHTML = "<p style='text-align:center; color:#888;'>Updates coming soon...</p>";
  }

  function loadSuggestions() {
    const suggestionsList = document.getElementById("suggestionsList");
    suggestionsList.innerHTML = "<p style='text-align:center; color:#888;'>Loading suggestions...</p>";
    
    db.collection("suggestions").get().then(snapshot => {
      const suggestions = [];
      snapshot.forEach(doc => {
        suggestions.push({ id: doc.id, ...doc.data() });
      });
      
      suggestions.sort((a, b) => {
        if(a.status === 'pending' && b.status !== 'pending') return -1;
        if(a.status !== 'pending' && b.status === 'pending') return 1;
        return (b.upvotes || 0) - (a.upvotes || 0);
      });
      
      suggestionsList.innerHTML = "";
      
      suggestions.forEach(sug => {
        const sugDiv = document.createElement("div");
        sugDiv.className = "post";
        
        let statusColor = "#888";
        let statusText = sug.status || 'pending';
        if(statusText === 'approved') statusColor = "#00d4ff";
        if(statusText === 'implemented') statusColor = "#00ff00";
        if(statusText === 'rejected') statusColor = "#ff0000";
        
        const userUpvoted = sug.upvotedBy && sug.upvotedBy.includes(currentUser.uid);
        
        sugDiv.innerHTML = `
          <div class="post-header">
            <div>
              <strong>${sug.author}</strong>
              <span style="color:${statusColor}; font-weight:bold; margin-left:10px;">
                ${statusText.toUpperCase()}
              </span>
            </div>
            <span class="post-time">${new Date(sug.timestamp).toLocaleString()}</span>
          </div>
          <div class="post-content"><strong>${escapeHtml(sug.title)}</strong></div>
          <div class="post-content">${escapeHtml(sug.description)}</div>
          <div class="post-actions">
            <button onclick="upvoteSuggestion('${sug.id}')" 
              style="background:${userUpvoted ? 'linear-gradient(135deg, #ff6b35, #f7931e)' : ''}">
              👍 ${sug.upvotes || 0}
            </button>
            ${isOwner || isModerator ? `
              <button onclick="updateSuggestionStatus('${sug.id}', 'approved')">✅ Approve</button>
              <button onclick="updateSuggestionStatus('${sug.id}', 'implemented')">🎉 Implement</button>
              <button onclick="updateSuggestionStatus('${sug.id}', 'rejected')">❌ Reject</button>
              <button onclick="deleteSuggestion('${sug.id}')">🗑️</button>
            ` : ''}
          </div>
        `;
        suggestionsList.appendChild(sugDiv);
      });
      
      if(suggestionsList.innerHTML === "") {
        suggestionsList.innerHTML = "<p style='text-align:center; color:#888;'>No suggestions yet</p>";
      }
    }).catch(e => {
      suggestionsList.innerHTML = "<p style='text-align:center; color:red;'>Error: " + e.message + "</p>";
    });
  }

  // Submit suggestion
  const submitSuggestionBtn = document.getElementById("submitSuggestion");
  if(submitSuggestionBtn) {
    submitSuggestionBtn.onclick = async function() {
      const title = document.getElementById("suggestionTitle").value;
      const description = document.getElementById("suggestionDesc").value;
      
      if(!title || !description) return alert("Fill in all fields");
      
      try{
        await db.collection("suggestions").add({
          title,
          description,
          author: currentUsername,
          authorId: currentUser.uid,
          timestamp: Date.now(),
          status: 'pending',
          upvotes: 0,
          upvotedBy: []
        });
        
        document.getElementById("suggestionTitle").value = "";
        document.getElementById("suggestionDesc").value = "";
        alert("Suggestion submitted!");
        loadSuggestions();
      }catch(e){
        alert("Error: " + e.message);
      }
    };
  }

  window.upvoteSuggestion = async function(sugId){
    try{
      const sugRef = db.collection("suggestions").doc(sugId);
      const sugDoc = await sugRef.get();
      const sug = sugDoc.data();
      
      let upvotedBy = sug.upvotedBy || [];
      let upvotes = sug.upvotes || 0;
      
      if(upvotedBy.includes(currentUser.uid)){
        upvotedBy = upvotedBy.filter(uid => uid !== currentUser.uid);
        upvotes--;
      } else {
        upvotedBy.push(currentUser.uid);
        upvotes++;
      }
      
      await sugRef.update({ upvotes, upvotedBy });
      loadSuggestions();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  window.updateSuggestionStatus = async function(sugId, status){
    try{
      await db.collection("suggestions").doc(sugId).update({ status });
      loadSuggestions();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  window.deleteSuggestion = async function(sugId){
    if(!confirm("Delete this suggestion?")) return;
    try{
      await db.collection("suggestions").doc(sugId).delete();
      loadSuggestions();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  function loadLeaderboard() {
    document.getElementById("leaderboardList").innerHTML = "<p style='text-align:center; color:#888;'>Leaderboard coming soon...</p>";
  }

  // ================= POLLS =================
  window.createPoll = async function(){
    const question = prompt("Poll question:");
    if(!question) return;
    
    const options = [];
    for(let i = 0; i < 4; i++){
      const opt = prompt(`Option ${i+1} (leave empty to finish):`);
      if(!opt) break;
      options.push({ text: opt, votes: 0 });
    }
    
    if(options.length < 2) return alert("Need at least 2 options!");
    
    const category = document.getElementById("postCategory").value;
    
    try{
      await db.collection("posts").add({
        content: "",
        category,
        imageUrl: null,
        author: currentUsername,
        authorId: currentUser.uid,
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
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  // ================= PROFILE FUNCTIONS =================
  window.setCustomStatus = async function() {
    const status = prompt("Set your custom status:", "");
    if(status === null) return;
    
    try {
      await db.collection("users").doc(currentUser.uid).update({
        customStatus: status.substring(0, 100)
      });
      alert("Status updated!");
    } catch(e) {
      alert("Error: " + e.message);
    }
  }

  window.changeProfilePicture = async function() {
    const choice = prompt("Choose option:\n1. Upload image URL\n2. Generate new random avatar\n\nEnter 1 or 2:");
    
    if(choice === "1") {
      const url = prompt("Enter image URL (direct link to image):");
      if(!url) return;
      
      if(!url.startsWith('http://') && !url.startsWith('https://')) {
        alert("Please enter a valid URL starting with http:// or https://");
        return;
      }
      
      try {
        await db.collection("users").doc(currentUser.uid).update({
          avatar: url
        });
        alert("Profile picture updated!");
      } catch(e) {
        alert("Error: " + e.message);
      }
    } else if(choice === "2") {
      const colors = ['8a2be2', 'ff6b35', '00d4ff', 'ffd700', 'ff1493', '00ff00', 'ff69b4', '00ced1', 'ff4500'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const newAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUsername)}&background=${color}&color=fff&size=128&bold=true`;
      
      try {
        await db.collection("users").doc(currentUser.uid).update({
          avatar: newAvatar
        });
        alert("Profile picture updated!");
      } catch(e) {
        alert("Error: " + e.message);
      }
    }
  }

  console.log("All functions loaded successfully!");
};
