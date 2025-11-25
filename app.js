window.onload = function() {

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

    // Load content when switching tabs
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
    // Set custom status
  window.setCustomStatus = async function() {
    const status = prompt("Set your custom status:", "");
    if(status === null) return; // User cancelled
    
    try {
      await db.collection("users").doc(currentUser.uid).update({
        customStatus: status.substring(0, 100) // Max 100 chars
      });
      alert("Status updated!");
      loadUsers();
    } catch(e) {
      alert("Error: " + e.message);
    }
  }

  // Change profile picture
  window.changeProfilePicture = async function() {
    const choice = prompt("Choose option:\n1. Upload image URL\n2. Generate new random avatar\n\nEnter 1 or 2:");
    
    if(choice === "1") {
      const url = prompt("Enter image URL (direct link to image):");
      if(!url) return;
      
      // Validate URL
      if(!url.startsWith('http://') && !url.startsWith('https://')) {
        alert("Please enter a valid URL starting with http:// or https://");
        return;
      }
      
      try {
        await db.collection("users").doc(currentUser.uid).update({
          avatar: url
        });
        alert("Profile picture updated!");
        loadUsers();
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
        loadUsers();
      } catch(e) {
        alert("Error: " + e.message);
      }
    }
  }

};
  firebase.initializeApp(firebaseConfig);
  const auth=firebase.auth();
  const db=firebase.firestore();
  const storage=firebase.storage();
  let currentUser=null;
  let currentUsername="";
  let isOwner=false;
  let isModerator=false;

  // ================= LOGIN/REGISTER =================
  window.register = async function(){
    const email=document.getElementById("regEmail").value;
    const pass=document.getElementById("regPass").value;
    const username=document.getElementById("regUsername").value;
    if(!email||!pass||!username) return alert("All fields required");
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRegex.test(email)) return alert("Please enter a valid email address");
    
    // Check password strength
    if(pass.length < 6) return alert("Password must be at least 6 characters");
    
    try{
      const snap=await db.collection("users").where("username","==",username).get();
      if(!snap.empty) return alert("Username taken");
      
      const userCred=await auth.createUserWithEmailAndPassword(email,pass);
      
      // Generate avatar
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
      
      // Send email verification
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
  document.getElementById("registerBtn").onclick=register;

  window.login = async function(){
    console.log("Login function called");
    const email=document.getElementById("logEmail").value;
    const pass=document.getElementById("logPass").value;
    console.log("Email:", email, "Password length:", pass.length);
    
    if(!email||!pass) return alert("Enter email and password");
    
    try{
      console.log("Attempting to sign in...");
      const userCred=await auth.signInWithEmailAndPassword(email,pass);
      console.log("Sign in successful, user:", userCred.user.email);
      
      // Check if email is verified (give warning but allow login)
      if(!userCred.user.emailVerified) {
        console.log("Email not verified");
        const proceed = confirm("⚠️ Your email is not verified yet.\n\nClick OK to continue anyway, or Cancel to verify first.\n\n(Check your email for verification link)");
        if(!proceed) {
          // Resend verification email
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
      } else if(e.code === 'auth/user-disabled') {
        alert("❌ This account has been disabled");
      } else if(e.code === 'auth/too-many-requests') {
        alert("❌ Too many failed login attempts.\n\nPlease try again later or reset your password");
      } else {
        alert("Login error: " + e.message);
      }
    }
  }
  
  // Make sure button is connected
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
  document.getElementById("logoutBtn").onclick=logout;

  auth.onAuthStateChanged(user=>{if(user) loginUser(user);});

  async function loginUser(user){
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
      
      // Update user status and last login
      await db.collection("users").doc(user.uid).update({
        lastLogin: Date.now(),
        status: 'online',
        emailVerified: user.emailVerified
      });
      
      // Set up presence system
      setupPresence(user.uid);
    }
    
    isOwner = (user.email === "d29510713@gmail.com");
    
    document.getElementById("box").classList.add("hidden");
    document.getElementById("forum").classList.remove("hidden");
    
    if(isOwner || isModerator) {
      document.getElementById("ownerControls").classList.remove("hidden");
      if(!isOwner) {
        // Hide owner-only buttons for moderators
        document.getElementById("clearForumBtn").style.display = "none";
        document.getElementById("makeModBtn").style.display = "none";
      }
    }
    
    console.log("Logged in as:", user.email, "Moderator:", isModerator, "Owner:", isOwner);
    loadPosts();
    checkNotifications();
    startRealtimeListeners();
  }

  // Presence system (online/offline)
  function setupPresence(userId) {
    // Update status to offline when user closes tab
    window.addEventListener('beforeunload', () => {
      db.collection("users").doc(userId).update({ status: 'offline' });
    });
    
    // Keep user online
    setInterval(() => {
      if(currentUser) {
        db.collection("users").doc(userId).update({ 
          status: 'online',
          lastSeen: Date.now()
        });
      }
    }, 60000); // Update every minute
  }

  // Start realtime listeners for live updates
  function startRealtimeListeners() {
    // Listen for new posts
    db.collection("posts").orderBy("timestamp", "desc").limit(1)
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" && change.doc.data().authorId !== currentUser.uid) {
            showNotification("New Post", `${change.doc.data().author} posted in ${change.doc.data().category}`);
          }
        });
      });
    
    // Listen for new DMs
    db.collection("dms").where("toId", "==", currentUser.uid)
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const dm = change.doc.data();
            if(dm.timestamp > Date.now() - 5000) { // Only notify for recent messages
              showNotification("New Message", `${dm.from}: ${dm.content.substring(0, 50)}`);
            }
          }
        });
      });
  }

  // Show browser notification
  function showNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }

  // Request notification permission on login
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  // Check for notifications
  async function checkNotifications() {
    try {
      const mentionsSnapshot = await db.collection("posts")
        .where("content", ">=", `@${currentUsername}`)
        .where("content", "<=", `@${currentUsername}\uf8ff`)
        .get();
      
      if(mentionsSnapshot.size > 0) {
        console.log(`You have ${mentionsSnapshot.size} mention(s)!`);
      }
    } catch(e) {
      console.log("Notification check error:", e);
    }
  }

  // ================= POST IMAGE PREVIEW =================
  document.getElementById("postImage").onchange=function(e){
    const img=document.getElementById("previewImage");
    if(e.target.files && e.target.files[0]){
      const file = e.target.files[0];
      
      // Check file size (max 5MB)
      if(file.size > 5 * 1024 * 1024) {
        alert("Image must be under 5MB");
        e.target.value = "";
        img.classList.add("hidden");
        return;
      }
      
      // Check file type
      if(!file.type.startsWith('image/')) {
        alert("Please upload an image file");
        e.target.value = "";
        img.classList.add("hidden");
        return;
      }
      
      // Create object URL for preview
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      img.classList.remove("hidden");
      
      // Clean up old object URL when new one is created
      img.onload = function() {
        URL.revokeObjectURL(objectUrl);
      };
    } else {
      img.classList.add("hidden");
      img.src = "";
    }
  }

  // ================= CREATE POST =================
  document.getElementById("postBtn").onclick = async function(){
    const content = document.getElementById("postContent").value;
    const category = document.getElementById("postCategory").value;
    const imageFile = document.getElementById("postImage").files[0];
    
    if(!content && !imageFile) return alert("Write something or upload an image!");
    
    const postBtn = document.getElementById("postBtn");
    postBtn.disabled = true;
    postBtn.textContent = "Uploading...";
    
    try{
      let imageUrl = null;
      if(imageFile){
        console.log("Starting image upload to Imgur...");
        
        // Convert image to base64
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
        
        // Upload to Imgur
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
        
        if(result.success && result.data && result.data.link) {
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
        authorId: currentUser.uid,
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
      
      document.getElementById("postContent").value = "";
      document.getElementById("postImage").value = "";
      document.getElementById("previewImage").classList.add("hidden");
      document.getElementById("previewImage").src = "";
      
      postBtn.disabled = false;
      postBtn.textContent = "📤 Post";
      
      alert("Post created successfully!");
      loadPosts();
    }catch(e){
      postBtn.disabled = false;
      postBtn.textContent = "📤 Post";
      alert("Error creating post: " + e.message);
      console.error("Full error:", e);
    }
  }

  // ================= LOAD POSTS =================
  async function loadPosts(searchQuery = "", filterCategory = "", sortBy = "newest"){
    const postsList = document.getElementById("postsList");
    postsList.innerHTML = "<p style='text-align:center; color:#888;'>Loading posts...</p>";
    
    try{
      let query = db.collection("posts").limit(100);
      const snapshot = await query.get();
      
      // Get all user data for role badges
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
      
      // Convert to array and filter
      let posts = [];
      snapshot.forEach(doc => {
        const post = doc.data();
        
        // Filter by search
        if(searchQuery && !post.content.toLowerCase().includes(searchQuery.toLowerCase())){
          return;
        }
        
        // Filter by category
        if(filterCategory && filterCategory !== 'all' && post.category !== filterCategory){
          return;
        }
        
        posts.push({ id: doc.id, ...post });
      });
      
      // Sort posts
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
        
        // Get author role
        const authorData = userDataCache[post.authorId];
        let roleBadge = "";
        if(authorData) {
          if(authorData.email === "d29510713@gmail.com") {
            roleBadge = '<span style="color:#ff6b35; text-shadow: 0 0 10px rgba(255,107,53,0.8);"> 👑 OWNER</span>';
          } else if(authorData.moderator) {
            roleBadge = '<span style="color:#00d4ff; text-shadow: 0 0 10px rgba(0,212,255,0.6);"> 🛡️ MOD</span>';
          }
        }
        
        // Time ago
        const timeAgo = getTimeAgo(post.timestamp);
        
        // Pin badge
        const pinBadge = post.pinned ? '<span style="color:#ffd700;">📌 PINNED</span>' : '';
        
        // Trending badge (high engagement)
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
                 onerror="this.style.display='none'; this.insertAdjacentHTML('afterend', '<div style=\\"padding:20px; text-align:center; color:#888; background:rgba(0,0,0,0.3); border-radius:8px; margin:10px 0;\\">🖼️ Image failed to load</div>');"
                 onclick="openImageModal('${post.imageUrl}')">
          ` : ''}
          ${post.poll ? renderPoll(post.poll, postId) : ''}
          ${post.comments && post.comments.length > 0 ? `
            <div style="margin-top:12px; padding:10px; background:rgba(0,0,0,0.3); border-radius:8px;">
              <strong style="color:#00d4ff;">💬 Comments (${post.comments.length}):</strong>
              ${post.comments.slice(0, 3).map(c => `
                <div style="margin:6px 0; padding:6px; background:rgba(0,0,0,0.2); border-left:2px solid #8a2be2; border-radius:5px; font-size:12px;">
                  <small style="color:#00d4ff;"><strong>${c.author}</strong></small><br>
                  <span style="color:#e0e0e0;">${escapeHtml(c.text.substring(0, 100))}${c.text.length > 100 ? '...' : ''}</span>
                </div>
              `).join('')}
              ${post.comments.length > 3 ? `<small style="color:#888;">+ ${post.comments.length - 3} more comments</small>` : ''}
            </div>
          ` : ''}
          <div class="post-actions">
            <button onclick="likePost('${postId}')" style="background:${isLiked ? 'linear-gradient(135deg, #ff6b35, #f7931e)' : ''}">
              ${isLiked ? '❤️' : '👍'} ${post.likes || 0}
            </button>
            <button onclick="commentOnPost('${postId}')">💬 ${post.comments?.length || 0}</button>
            <button onclick="bookmarkPost('${postId}')" style="background:${isBookmarked ? 'linear-gradient(135deg, #ffd700, #ffa500)' : ''}">
              ${isBookmarked ? '⭐' : '🔖'}
            </button>
            <button onclick="sharePost('${postId}')">📤 Share</button>
            ${canEdit ? `<button onclick="editPost('${postId}', \`${escapeHtml(post.content || '').replace(/`/g, '\\`')}\`)">✏️</button>` : ''}
            ${canDelete ? `<button onclick="deletePost('${postId}')">🗑️</button>` : ''}
            ${!canModerate && post.authorId !== currentUser.uid ? 
              `<button onclick="reportPost('${postId}')">⚠️</button>` : ''}
            ${canModerate ? `
              <button onclick="warnUser('${post.authorId}', '${post.author}')">⚠️</button>
              ${!post.pinned ? `<button onclick="pinPost('${postId}')">📌</button>` : `<button onclick="unpinPost('${postId}')">📌</button>`}
            ` : ''}
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

  // Render poll
  function renderPoll(poll, postId) {
    const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
    const userVoted = poll.voters && poll.voters.includes(currentUser.uid);
    
    return `
      <div style="margin:12px 0; padding:12px; background:rgba(138,43,226,0.1); border-radius:8px; border:1px solid rgba(138,43,226,0.3);">
        <strong style="color:#00d4ff;">📊 ${poll.question}</strong>
        ${poll.options.map((opt, idx) => {
          const percentage = totalVotes > 0 ? Math.round((opt.votes || 0) / totalVotes * 100) : 0;
          return `
            <div style="margin:8px 0;">
              <button onclick="voteOnPoll('${postId}', ${idx})" 
                ${userVoted ? 'disabled' : ''}
                style="width:100%; text-align:left; padding:8px; font-size:12px; position:relative; overflow:hidden;">
                <div style="position:absolute; left:0; top:0; height:100%; width:${percentage}%; background:rgba(138,43,226,0.3); z-index:0;"></div>
                <span style="position:relative; z-index:1;">${opt.text} - ${opt.votes || 0} (${percentage}%)</span>
              </button>
            </div>
          `;
        }).join('')}
        <small style="color:#888;">Total votes: ${totalVotes}</small>
      </div>
    `;
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ================= LIKE POST =================
  window.likePost = async function(postId){
    try{
      const postRef = db.collection("posts").doc(postId);
      const postDoc = await postRef.get();
      const post = postDoc.data();
      
      let likedBy = post.likedBy || [];
      let likes = post.likes || 0;
      
      if(likedBy.includes(currentUser.uid)){
        // Unlike
        likedBy = likedBy.filter(uid => uid !== currentUser.uid);
        likes--;
      } else {
        // Like
        likedBy.push(currentUser.uid);
        likes++;
      }
      
      await postRef.update({ likes, likedBy });
      loadPosts();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  // ================= REPORT POST =================
  window.reportPost = async function(postId){
    const reason = prompt("Why are you reporting this post?");
    if(!reason) return;
    
    try{
      const postRef = db.collection("posts").doc(postId);
      const postDoc = await postRef.get();
      const post = postDoc.data();
      
      await postRef.update({
        reported: true,
        reportCount: (post.reportCount || 0) + 1
      });
      
      await db.collection("reports").add({
        postId,
        reportedBy: currentUsername,
        reporterId: currentUser.uid,
        reason,
        timestamp: Date.now()
      });
      
      alert("Post reported. Moderators will review it.");
      loadPosts();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  // ================= WARN USER =================
  window.warnUser = async function(userId, username){
    if(!confirm(`Warn user ${username}?`)) return;
    
    try{
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      const userData = userDoc.data();
      
      const newWarnings = (userData.warnings || 0) + 1;
      
      await userRef.update({
        warnings: newWarnings
      });
      
      // Send warning DM
      await db.collection("dms").add({
        from: "⚠️ MODERATOR",
        fromId: "system",
        to: username,
        toId: userId,
        content: `You have received a warning. Total warnings: ${newWarnings}. (3 warnings = ban)`,
        timestamp: Date.now(),
        read: false
      });
      
      // Auto-ban at 3 warnings
      if(newWarnings >= 3){
        await userRef.update({banned: true});
        alert(`${username} has been banned (3 warnings)`);
      } else {
        alert(`${username} warned (${newWarnings}/3)`);
      }
      
      loadPosts();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  // ================= DELETE POST =================
  window.deletePost = async function(postId){
    if(!confirm("Delete this post?")) return;
    try{
      const postDoc = await db.collection("posts").doc(postId).get();
      const post = postDoc.data();
      
      // Note: Imgur images can't be deleted with free API
      // They will auto-delete after 6 months of no views
      
      await db.collection("posts").doc(postId).delete();
      
      alert("Post deleted!");
      loadPosts();
    }catch(e){
      alert("Error: " + e.message);
      console.error("Delete error:", e);
    }
  }

  // ================= SEARCH POSTS =================
  document.getElementById("searchPost").oninput = function(e){
    loadPosts(e.target.value);
  }

  // ================= LOAD USERS =================
  async function loadUsers(searchQuery = ""){
    const usersList = document.getElementById("usersList");
    usersList.innerHTML = "<p style='text-align:center; color:#888;'>Loading users...</p>";
    
    try{
      let query = db.collection("users");
      const snapshot = await query.get();
      
      usersList.innerHTML = "";
      
      // Separate online and offline users
      const onlineUsers = [];
      const offlineUsers = [];
      
      snapshot.forEach(doc => {
        const user = doc.data();
        const userId = doc.id;
        
        if(searchQuery && !user.username.toLowerCase().includes(searchQuery.toLowerCase())){
          return;
        }
        
        const userData = { userId, ...user };
        
        if(user.status === 'online') {
          onlineUsers.push(userData);
        } else {
          offlineUsers.push(userData);
        }
      });
      
      // Display online users first
      if(onlineUsers.length > 0) {
        const onlineHeader = document.createElement("div");
        onlineHeader.style.cssText = "color:#00d4ff; font-weight:bold; margin:15px 0 5px 0; font-size:14px;";
        onlineHeader.innerHTML = `🟢 ONLINE — ${onlineUsers.length}`;
        usersList.appendChild(onlineHeader);
        
        onlineUsers.forEach(user => renderUserItem(user, usersList));
      }
      
      // Display offline users
      if(offlineUsers.length > 0) {
        const offlineHeader = document.createElement("div");
        offlineHeader.style.cssText = "color:#888; font-weight:bold; margin:15px 0 5px 0; font-size:14px;";
        offlineHeader.innerHTML = `⚫ OFFLINE — ${offlineUsers.length}`;
        usersList.appendChild(offlineHeader);
        
        offlineUsers.forEach(user => renderUserItem(user, usersList));
      }
      
      if(usersList.innerHTML === "") usersList.innerHTML = "<p style='text-align:center; color:#888;'>No users found</p>";
    }catch(e){
      usersList.innerHTML = "<p style='text-align:center; color:red;'>Error loading users: " + e.message + "</p>";
    }
  }

  function renderUserItem(user, container) {
    const userId = user.userId;
    const statusColor = user.status === 'online' ? '#00ff00' : '#888';
    const statusDot = `<span style="display:inline-block; width:10px; height:10px; background:${statusColor}; border-radius:50%; margin-right:5px;"></span>`;
    
    // Get avatar
    const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=8a2be2&color=fff&size=64`;
    
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
          ${user.moderator ? '<span style="color:#00d4ff;"> 🛡️ MOD</span>' : ''}
          ${user.banned ? '<span style="color:red;"> 🚫 BANNED</span>' : ''}
          ${userId === currentUser.uid ? '<span style="color:#ffd700;"> (You)</span>' : ''}
        </div>
        ${user.customStatus ? `<div style="color:#888; font-size:13px; margin-top:3px;">${escapeHtml(user.customStatus)}</div>` : ''}
        <div style="color:#888; font-size:12px; margin-top:3px;">
          ${user.status === 'online' ? 'Online' : user.lastSeen ? `Last seen ${getTimeAgo(user.lastSeen)}` : 'Offline'}
        </div>
      </div>
      ${(isOwner || isModerator) && userId !== currentUser.uid ? `
        <div style="display:flex; gap:5px; flex-wrap:wrap;">
          ${isOwner && !user.moderator ? `<button onclick="makeModerator('${userId}', '${user.username}')" style="padding:6px 12px; font-size:12px;">Make Mod</button>` : ''}
          ${isOwner && user.moderator ? `<button onclick="removeModerator('${userId}', '${user.username}')" style="padding:6px 12px; font-size:12px;">Remove Mod</button>` : ''}
          ${!user.banned ? `<button onclick="banUser('${userId}', '${user.username}')" style="padding:6px 12px; font-size:12px;">Ban</button>` : ''}
          ${user.banned ? `<button onclick="unbanUser('${userId}', '${user.username}')" style="padding:6px 12px; font-size:12px;">Unban</button>` : ''}
        </div>
      ` : userId !== currentUser.uid ? `
        <button onclick="openDMWithUser('${user.username}')" style="padding:6px 12px; font-size:12px; background:linear-gradient(135deg, #00d4ff, #0099cc);">💬 Message</button>
      ` : ''}
    `;
    
    container.appendChild(userDiv);
  }

  // Open DM tab with username pre-filled
  window.openDMWithUser = function(username) {
    document.getElementById("dmToUsername").value = username;
    showTab('dms');
  }

  // ================= SEARCH USERS =================
  document.getElementById("searchUser").oninput = function(e){
    loadUsers(e.target.value);
  }

  // ================= SEND DM =================
  document.getElementById("dmBtn").onclick = async function(){
    const toUsername = document.getElementById("dmToUsername").value;
    const content = document.getElementById("dmContent").value;
    
    if(!toUsername || !content) return alert("Fill in all fields");
    
    try{
      const userSnap = await db.collection("users").where("username","==",toUsername).get();
      if(userSnap.empty) return alert("User not found");
      
      const recipientId = userSnap.docs[0].id;
      
      await db.collection("dms").add({
        from: currentUsername,
        fromId: currentUser.uid,
        to: toUsername,
        toId: recipientId,
        content,
        timestamp: Date.now(),
        read: false
      });
      
      document.getElementById("dmToUsername").value = "";
      document.getElementById("dmContent").value = "";
      alert("DM sent!");
      loadDMs();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  // ================= LOAD DMs =================
  async function loadDMs(){
    const dmsList = document.getElementById("dmsList");
    dmsList.innerHTML = "<p style='text-align:center; color:#888;'>Loading messages...</p>";
    
    try{
      // Get all DMs for current user without orderBy to avoid index requirement
      const snapshot = await db.collection("dms")
        .where("toId", "==", currentUser.uid)
        .get();
      
      // Convert to array and sort manually
      const dms = [];
      snapshot.forEach(doc => {
        dms.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort by timestamp descending
      dms.sort((a, b) => b.timestamp - a.timestamp);
      
      dmsList.innerHTML = "";
      
      // Display sorted DMs
      dms.slice(0, 50).forEach(dm => {
        const dmDiv = document.createElement("div");
        dmDiv.className = "dm-item";
        dmDiv.innerHTML = `
          <strong>From: ${dm.from}</strong>
          <span>${new Date(dm.timestamp).toLocaleString()}</span>
          <div>${escapeHtml(dm.content)}</div>
        `;
        dmsList.appendChild(dmDiv);
      });
      
      if(dmsList.innerHTML === "") dmsList.innerHTML = "<p style='text-align:center; color:#888;'>No messages</p>";
    }catch(e){
      dmsList.innerHTML = "<p style='text-align:center; color:red;'>Error loading DMs: " + e.message + "</p>";
      console.error("DM Error:", e);
    }
  }

  // ================= LOAD UPDATES =================
  async function loadUpdates(){
    const updatesList = document.getElementById("updatesList");
    updatesList.innerHTML = "<p style='text-align:center; color:#888;'>Loading updates...</p>";
    
    try{
      // Get all updates without orderBy to avoid index requirement
      const snapshot = await db.collection("updates").get();
      
      // Convert to array and sort manually
      const updates = [];
      snapshot.forEach(doc => {
        updates.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort by timestamp descending
      updates.sort((a, b) => b.timestamp - a.timestamp);
      
      updatesList.innerHTML = "";
      
      // Display sorted updates
      updates.slice(0, 20).forEach(update => {
        const updateDiv = document.createElement("div");
        updateDiv.className = "update-item";
        
        // Calculate time ago
        const timeAgo = getTimeAgo(update.timestamp);
        
        // Add pin emoji if pinned
        const pinnedBadge = update.pinned ? '<span style="color:#ffd700;">📌 PINNED</span> ' : '';
        
        updateDiv.innerHTML = `
          <h3>${pinnedBadge}${escapeHtml(update.title)}</h3>
          <div>${escapeHtml(update.content)}</div>
          <span>${new Date(update.timestamp).toLocaleString()} (${timeAgo})</span>
          ${isOwner || isModerator ? `
            <div style="margin-top:10px;">
              ${!update.pinned ? `<button onclick="pinUpdate('${update.id}')">📌 Pin</button>` : `<button onclick="unpinUpdate('${update.id}')">📌 Unpin</button>`}
              <button onclick="deleteUpdate('${update.id}')">🗑️ Delete</button>
            </div>
          ` : ''}
        `;
        updatesList.appendChild(updateDiv);
      });
      
      if(updatesList.innerHTML === "") updatesList.innerHTML = "<p style='text-align:center; color:#888;'>No updates yet</p>";
    }catch(e){
      updatesList.innerHTML = "<p style='text-align:center; color:red;'>Error loading updates: " + e.message + "</p>";
      console.error("Updates Error:", e);
    }
  }

  // Helper function to get "time ago" string
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

  // ================= MODERATION FUNCTIONS =================
  window.makeModerator = async function(userId, username){
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

  // ================= OWNER CONTROLS =================
  document.getElementById("createUpdateBtn").onclick = async function(){
    const title = document.getElementById("updateTitle").value;
    const content = document.getElementById("updateContent").value;
    
    if(!title || !content) return alert("Fill in all fields");
    
    // Ask for category and priority
    const category = prompt("Category (e.g., Feature, Bug Fix, News, Maintenance):", "News");
    const priorityOptions = "Choose priority:\n1. High\n2. Medium\n3. Low";
    const priorityChoice = prompt(priorityOptions, "2");
    
    let priority = 'medium';
    if(priorityChoice === '1') priority = 'high';
    else if(priorityChoice === '3') priority = 'low';
    
    try{
      await db.collection("updates").add({
        title,
        content,
        category: category || 'General',
        priority,
        timestamp: Date.now(),
        pinned: false,
        author: currentUsername,
        reactions: {
          like: 0,
          love: 0,
          fire: 0,
          rocket: 0,
          star: 0,
          thinking: 0
        },
        userReactions: {},
        comments: [],
        views: 0
      });
      
      document.getElementById("updateTitle").value = "";
      document.getElementById("updateContent").value = "";
      alert("Update created!");
      loadUpdates();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  // Pin/Unpin updates
  window.pinUpdate = async function(updateId){
    try{
      await db.collection("updates").doc(updateId).update({pinned: true});
      loadUpdates();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  window.unpinUpdate = async function(updateId){
    try{
      await db.collection("updates").doc(updateId).update({pinned: false});
      loadUpdates();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  // Edit update
  window.editUpdate = async function(updateId){
    try{
      const updateDoc = await db.collection("updates").doc(updateId).get();
      const update = updateDoc.data();
      
      const newTitle = prompt("Edit title:", update.title);
      if(!newTitle) return;
      
      const newContent = prompt("Edit content:", update.content);
      if(!newContent) return;
      
      const category = prompt("Category:", update.category);
      const priorityOptions = "Choose priority:\n1. High\n2. Medium\n3. Low";
      const priorityChoice = prompt(priorityOptions, update.priority === 'high' ? '1' : update.priority === 'low' ? '3' : '2');
      
      let priority = 'medium';
      if(priorityChoice === '1') priority = 'high';
      else if(priorityChoice === '3') priority = 'low';
      
      await db.collection("updates").doc(updateId).update({
        title: newTitle,
        content: newContent,
        category: category || 'General',
        priority
      });
      
      alert("Update edited!");
      loadUpdates();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  // React to update (one reaction per user)
  window.reactToUpdate = async function(updateId, reactionType){
    try{
      const updateRef = db.collection("updates").doc(updateId);
      const updateDoc = await updateRef.get();
      const update = updateDoc.data();
      
      const reactions = update.reactions || { like: 0, love: 0, fire: 0, rocket: 0, star: 0, thinking: 0 };
      const userReactions = update.userReactions || {};
      const previousReaction = userReactions[currentUser.uid];
      
      // Remove previous reaction
      if(previousReaction) {
        reactions[previousReaction] = Math.max(0, (reactions[previousReaction] || 0) - 1);
      }
      
      // Add new reaction (or remove if same)
      if(previousReaction === reactionType) {
        delete userReactions[currentUser.uid];
      } else {
        reactions[reactionType] = (reactions[reactionType] || 0) + 1;
        userReactions[currentUser.uid] = reactionType;
      }
      
      await updateRef.update({ reactions, userReactions });
      loadUpdates();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  // Comment on update
  window.commentOnUpdate = async function(updateId){
    const commentText = prompt("Write your comment:");
    if(!commentText) return;
    
    try{
      const updateRef = db.collection("updates").doc(updateId);
      const updateDoc = await updateRef.get();
      const update = updateDoc.data();
      
      const comments = update.comments || [];
      comments.push({
        author: currentUsername,
        authorId: currentUser.uid,
        text: commentText,
        timestamp: Date.now(),
        likes: 0,
        likedBy: []
      });
      
      await updateRef.update({ comments });
      loadUpdates();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  // Like comment on update
  window.likeComment = async function(updateId, commentIndex){
    try{
      const updateRef = db.collection("updates").doc(updateId);
      const updateDoc = await updateRef.get();
      const update = updateDoc.data();
      
      const comments = update.comments || [];
      const comment = comments[commentIndex];
      
      if(!comment) return;
      
      const likedBy = comment.likedBy || [];
      const likes = comment.likes || 0;
      
      if(likedBy.includes(currentUser.uid)){
        // Unlike
        comment.likedBy = likedBy.filter(uid => uid !== currentUser.uid);
        comment.likes = Math.max(0, likes - 1);
      } else {
        // Like
        comment.likedBy = [...likedBy, currentUser.uid];
        comment.likes = likes + 1;
      }
      
      comments[commentIndex] = comment;
      await updateRef.update({ comments });
      loadUpdates();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  // Delete comment on update
  window.deleteComment = async function(updateId, commentIndex){
    if(!confirm("Delete this comment?")) return;
    
    try{
      const updateRef = db.collection("updates").doc(updateId);
      const updateDoc = await updateRef.get();
      const update = updateDoc.data();
      
      const comments = update.comments || [];
      comments.splice(commentIndex, 1);
      
      await updateRef.update({ comments });
      loadUpdates();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  document.getElementById("clearForumBtn").onclick = async function(){
    if(!confirm("Delete ALL posts, DMs, and updates? This cannot be undone!")) return;
    
    try{
      const posts = await db.collection("posts").get();
      posts.forEach(doc => doc.ref.delete());
      
      const dms = await db.collection("dms").get();
      dms.forEach(doc => doc.ref.delete());
      
      const updates = await db.collection("updates").get();
      updates.forEach(doc => doc.ref.delete());
      
      const reports = await db.collection("reports").get();
      reports.forEach(doc => doc.ref.delete());
      
      alert("Forum cleared!");
      loadPosts();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  document.getElementById("banUserBtn").onclick = async function(){
    const username = prompt("Enter username to ban:");
    if(!username) return;
    
    try{
      const userSnap = await db.collection("users").where("username","==",username).get();
      if(userSnap.empty) return alert("User not found");
      
      await userSnap.docs[0].ref.update({banned: true});
      alert("User banned!");
      loadUsers();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  window.deleteUpdate = async function(updateId){
    if(!confirm("Delete this update?")) return;
    try{
      await db.collection("updates").doc(updateId).delete();
      loadUpdates();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  // ================= NEW FEATURES =================
  
  // Comment on post
  window.commentOnPost = async function(postId){
    const commentText = prompt("Write your comment:");
    if(!commentText) return;
    
    try{
      const postRef = db.collection("posts").doc(postId);
      const postDoc = await postRef.get();
      const post = postDoc.data();
      
      const comments = post.comments || [];
      comments.push({
        author: currentUsername,
        authorId: currentUser.uid,
        text: commentText,
        timestamp: Date.now()
      });
      
      await postRef.update({ comments });
      loadPosts();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  // Edit post
  window.editPost = async function(postId, currentContent){
    const newContent = prompt("Edit your post:", currentContent);
    if(!newContent || newContent === currentContent) return;
    
    try{
      await db.collection("posts").doc(postId).update({
        content: newContent,
        edited: true
      });
      alert("Post updated!");
      loadPosts();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  // Pin/Unpin post (moderator only)
  window.pinPost = async function(postId){
    try{
      await db.collection("posts").doc(postId).update({ pinned: true });
      loadPosts();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  window.unpinPost = async function(postId){
    try{
      await db.collection("posts").doc(postId).update({ pinned: false });
      loadPosts();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  // Image modal viewer
  window.openImageModal = function(imageUrl){
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      cursor: pointer;
      animation: fadeIn 0.3s ease-out;
    `;
    
    const container = document.createElement('div');
    container.style.cssText = `
      position: relative;
      max-width: 95%;
      max-height: 95%;
      display: flex;
      flex-direction: column;
      align-items: center;
    `;
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.cssText = `
      max-width: 100%;
      max-height: 90vh;
      border-radius: 10px;
      box-shadow: 0 0 50px rgba(138, 43, 226, 0.8);
      animation: zoomIn 0.3s ease-out;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕ Close';
    closeBtn.style.cssText = `
      margin-top: 20px;
      padding: 12px 30px;
      background: linear-gradient(135deg, #8a2be2, #4b0082);
      border: 2px solid rgba(138, 43, 226, 0.8);
      border-radius: 10px;
      color: #fff;
      font-family: 'Courier New', monospace;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(138, 43, 226, 0.4);
    `;
    
    const downloadBtn = document.createElement('button');
    downloadBtn.innerHTML = '⬇️ Download';
    downloadBtn.style.cssText = closeBtn.style.cssText;
    downloadBtn.style.background = 'linear-gradient(135deg, #ff6b35, #f7931e)';
    downloadBtn.style.marginLeft = '10px';
    
    downloadBtn.onclick = async (e) => {
      e.stopPropagation();
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'toasty-image-' + Date.now() + '.jpg';
        a.click();
        window.URL.revokeObjectURL(url);
      } catch(e) {
        alert('Could not download image');
      }
    };
    
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display: flex; gap: 10px; margin-top: 20px;';
    btnContainer.appendChild(downloadBtn);
    btnContainer.appendChild(closeBtn);
    
    container.appendChild(img);
    container.appendChild(btnContainer);
    modal.appendChild(container);
    
    closeBtn.onclick = () => modal.remove();
    modal.onclick = (e) => {
      if(e.target === modal) modal.remove();
    };
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes zoomIn {
        from { transform: scale(0.8); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(modal);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    modal.addEventListener('remove', () => {
      document.body.style.overflow = 'auto';
    });
  }

  // ================= NEW FEATURES =================
  
  // Bookmark post
  window.bookmarkPost = async function(postId){
    try{
      const postRef = db.collection("posts").doc(postId);
      const postDoc = await postRef.get();
      const post = postDoc.data();
      
      let bookmarkedBy = post.bookmarkedBy || [];
      
      if(bookmarkedBy.includes(currentUser.uid)){
        bookmarkedBy = bookmarkedBy.filter(uid => uid !== currentUser.uid);
      } else {
        bookmarkedBy.push(currentUser.uid);
      }
      
      await postRef.update({ bookmarkedBy });
      loadPosts();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  // Share post
  window.sharePost = function(postId){
    const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;
    
    if(navigator.share) {
      navigator.share({
        title: 'Check out this post!',
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  }

  // Vote on poll
  window.voteOnPoll = async function(postId, optionIndex){
    try{
      const postRef = db.collection("posts").doc(postId);
      const postDoc = await postRef.get();
      const post = postDoc.data();
      
      if(!post.poll) return;
      
      const voters = post.poll.voters || [];
      if(voters.includes(currentUser.uid)) {
        alert("You already voted!");
        return;
      }
      
      post.poll.options[optionIndex].votes = (post.poll.options[optionIndex].votes || 0) + 1;
      post.poll.voters = [...voters, currentUser.uid];
      
      await postRef.update({ poll: post.poll });
      loadPosts();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  // Filter and sort posts
  document.getElementById("categoryFilter")?.addEventListener('change', (e) => {
    const search = document.getElementById("searchPost").value;
    const sort = document.getElementById("sortPosts")?.value || 'newest';
    loadPosts(search, e.target.value, sort);
  });

  document.getElementById("sortPosts")?.addEventListener('change', (e) => {
    const search = document.getElementById("searchPost").value;
    const category = document.getElementById("categoryFilter")?.value || 'all';
    loadPosts(search, category, e.target.value);
  });

  // ================= SUGGESTIONS SYSTEM =================
  window.loadSuggestions = async function(){
    const suggestionsList = document.getElementById("suggestionsList");
    if(!suggestionsList) return;
    
    suggestionsList.innerHTML = "<p style='text-align:center; color:#888;'>Loading suggestions...</p>";
    
    try{
      const snapshot = await db.collection("suggestions").get();
      
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
    }catch(e){
      suggestionsList.innerHTML = "<p style='text-align:center; color:red;'>Error: " + e.message + "</p>";
      console.error("Suggestions error:", e);
    }
  }

  // Submit suggestion
  document.getElementById("submitSuggestion")?.addEventListener('click', async () => {
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
      console.error("Submit suggestion error:", e);
    }
  });

  // Upvote suggestion
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

  // Update suggestion status
  window.updateSuggestionStatus = async function(sugId, status){
    try{
      await db.collection("suggestions").doc(sugId).update({ status });
      loadSuggestions();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  // Delete suggestion
  window.deleteSuggestion = async function(sugId){
    if(!confirm("Delete this suggestion?")) return;
    try{
      await db.collection("suggestions").doc(sugId).delete();
      loadSuggestions();
    }catch(e){
      alert("Error: " + e.message);
    }
  }

  // Create poll
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
  window.loadLeaderboard = async function(){
    const leaderboardList = document.getElementById("leaderboardList");
    if(!leaderboardList) return;
    
    leaderboardList.innerHTML = "<p style='text-align:center; color:#888;'>Calculating leaderboard...</p>";
    
    try{
      // Get all users
      const usersSnapshot = await db.collection("users").get();
      const users = [];
      
      for(const userDoc of usersSnapshot.docs){
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Get user's posts
        const postsSnapshot = await db.collection("posts").where("authorId", "==", userId).get();
        let totalLikes = 0;
        let totalComments = 0;
        let postCount = postsSnapshot.size;
        
        postsSnapshot.forEach(postDoc => {
          const post = postDoc.data();
          totalLikes += post.likes || 0;
          totalComments += post.comments?.length || 0;
        });
        
        // Get user's comments on others' posts
        const allPostsSnapshot = await db.collection("posts").get();
        let commentsMade = 0;
        allPostsSnapshot.forEach(postDoc => {
          const post = postDoc.data();
          if(post.comments){
            commentsMade += post.comments.filter(c => c.authorId === userId).length;
          }
        });
        
        // Calculate points
        const points = (postCount * 10) + (totalLikes * 5) + (commentsMade * 2) + (totalComments * 1);
        
        users.push({
          username: userData.username,
          userId: userId,
          email: userData.email,
          moderator: userData.moderator,
          postCount,
          totalLikes,
          commentsMade,
          totalComments,
          points,
          joinDate: userData.joinDate
        });
      }
      
      // Sort by points
      users.sort((a, b) => b.points - a.points);
      
      leaderboardList.innerHTML = "";
      
      users.forEach((user, index) => {
        const rank = index + 1;
        let rankIcon = "";
        let rankColor = "#888";
        
        if(rank === 1) {
          rankIcon = "🥇";
          rankColor = "#ffd700";
        } else if(rank === 2) {
          rankIcon = "🥈";
          rankColor = "#c0c0c0";
        } else if(rank === 3) {
          rankIcon = "🥉";
          rankColor = "#cd7f32";
        } else {
          rankIcon = `#${rank}`;
        }
        
        let roleBadge = "";
        if(user.email === "d29510713@gmail.com") {
          roleBadge = '<span style="color:#ff6b35; text-shadow: 0 0 10px rgba(255,107,53,0.8);"> 👑 OWNER</span>';
        } else if(user.moderator) {
          roleBadge = '<span style="color:#00d4ff; text-shadow: 0 0 10px rgba(0,212,255,0.6);"> 🛡️ MOD</span>';
        }
        
        // Calculate level
        const level = Math.floor(user.points / 100) + 1;
        const pointsToNextLevel = ((level) * 100) - user.points;
        const progressPercent = ((user.points % 100) / 100) * 100;
        
        const userDiv = document.createElement("div");
        userDiv.className = "leaderboard-item";
        userDiv.style.cssText = `
          background: rgba(0, 0, 0, 0.6);
          border: 2px solid rgba(138, 43, 226, 0.4);
          border-radius: 12px;
          padding: 15px;
          margin: 10px 0;
          transition: all 0.3s ease;
        `;
        
        if(rank <= 3) {
          userDiv.style.borderColor = rankColor;
          userDiv.style.boxShadow = `0 0 20px ${rankColor}40`;
        }
        
        userDiv.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:15px;">
              <span style="font-size:24px; color:${rankColor}; font-weight:bold; min-width:50px;">${rankIcon}</span>
              <div>
                <div style="font-size:18px; font-weight:bold; color:#00d4ff;">
                  ${user.username}${roleBadge}
                  ${user.userId === currentUser.uid ? '<span style="color:#ffd700;"> (You)</span>' : ''}
                </div>
                <div style="font-size:12px; color:#888; margin-top:3px;">
                  Level ${level} • ${user.points} XP
                  ${pointsToNextLevel > 0 ? `• ${pointsToNextLevel} XP to level ${level + 1}` : ''}
                </div>
              </div>
            </div>
            <div style="text-align:right; font-size:13px;">
              <div style="color:#00d4ff;">📝 ${user.postCount} posts</div>
              <div style="color:#ff6b35;">❤️ ${user.totalLikes} likes</div>
              <div style="color:#ffd700;">💬 ${user.commentsMade} comments</div>
            </div>
          </div>
          <div style="margin-top:10px; background:rgba(0,0,0,0.4); border-radius:10px; height:8px; overflow:hidden;">
            <div style="background:linear-gradient(90deg, #8a2be2, #00d4ff); height:100%; width:${progressPercent}%; transition:width 0.5s;"></div>
          </div>
          <div style="margin-top:8px; display:flex; gap:10px; font-size:11px; color:#888; flex-wrap:wrap;">
            <span>🏆 Posts: +${user.postCount * 10} XP</span>
            <span>❤️ Likes: +${user.totalLikes * 5} XP</span>
            <span>💬 Comments: +${user.commentsMade * 2} XP</span>
          </div>
        `;
        
        leaderboardList.appendChild(userDiv);
      });
      
      // Add XP info
      const infoDiv = document.createElement("div");
      infoDiv.style.cssText = `
        background: rgba(138, 43, 226, 0.1);
        border: 2px solid rgba(138, 43, 226, 0.3);
        border-radius: 12px;
        padding: 15px;
        margin-top: 20px;
        font-size: 13px;
        color: #888;
      `;
      infoDiv.innerHTML = `
        <strong style="color:#00d4ff; font-size:15px;">📊 How XP Works:</strong><br><br>
        🔸 Create a post: <strong style="color:#00d4ff;">+10 XP</strong><br>
        🔸 Receive a like: <strong style="color:#ff6b35;">+5 XP</strong><br>
        🔸 Write a comment: <strong style="color:#ffd700;">+2 XP</strong><br>
        🔸 Get a comment on your post: <strong style="color:#888;">+1 XP</strong><br><br>
        <strong style="color:#00d4ff;">Level up every 100 XP!</strong>
      `;
      leaderboardList.appendChild(infoDiv);
      
    }catch(e){
      leaderboardList.innerHTML = "<p style='text-align:center; color:red;'>Error loading leaderboard: " + e.message + "</p>";
      console.error("Leaderboard error:", e);
    }
  }

};
