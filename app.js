window.onload = function() {

    // ================= DAILY COINS =================
  const coinsDisplay = document.getElementById("coinsDisplay"); // add a span/div in HTML with id="coinsDisplay"
  const dailyCoinsBtn = document.getElementById("claimDailyCoins"); // add a button in HTML with id="claimDailyCoins"
  
  async function updateCoinsDisplay(){
    if(!currentUser) return;
    const userDoc = await db.collection("users").doc(currentUser.uid).get();
    if(userDoc.exists){
      const data = userDoc.data();
      coinsDisplay.textContent = `Coins: ${data.coins || 0}`;
    }
  }

  window.claimDailyCoins = async function(){
    if(!currentUser) return alert("Log in first!");
    const userRef = db.collection("users").doc(currentUser.uid);
    const userDoc = await userRef.get();
    if(!userDoc.exists) return;
    const userData = userDoc.data();
    
    const lastClaim = userData.lastDailyClaim || 0;
    const now = Date.now();
    
    if(now - lastClaim < 24 * 60 * 60 * 1000){
      const remaining = 24*60*60*1000 - (now - lastClaim);
      const hours = Math.floor(remaining / (1000*60*60));
      const minutes = Math.floor((remaining % (1000*60*60)) / (1000*60));
      alert(`You already claimed today! Come back in ${hours}h ${minutes}m.`);
      return;
    }
    
    const reward = Math.floor(Math.random() * 51) + 50; // 50-100 coins
    await userRef.update({
      coins: (userData.coins || 0) + reward,
      lastDailyClaim: now
    });
    
    alert(`You received ${reward} coins!`);
    updateCoinsDisplay();
  }

  if(dailyCoinsBtn) dailyCoinsBtn.onclick = claimDailyCoins;
  updateCoinsDisplay();


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
    
    ['posts','users','dms','updates'].forEach(t=>{
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
  }

  const tabPosts = document.getElementById("tabPosts");
  const tabUsers = document.getElementById("tabUsers");
  const tabDMs = document.getElementById("tabDMs");
  const tabUpdates = document.getElementById("tabUpdates");

  if(tabPosts) tabPosts.onclick = () => showTab('posts');
  if(tabUsers) tabUsers.onclick = () => showTab('users');
  if(tabDMs) tabDMs.onclick = () => showTab('dms');
  if(tabUpdates) tabUpdates.onclick = () => showTab('updates');

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

  // ================= LOGIN/REGISTER =================
  window.register = async function(){
    const email=document.getElementById("regEmail").value;
    const pass=document.getElementById("regPass").value;
    const username=document.getElementById("regUsername").value;
    if(!email||!pass||!username) return alert("All fields required");
    const snap=await db.collection("users").where("username","==",username).get();
    if(!snap.empty) return alert("Username taken");
    try{
      const userCred=await auth.createUserWithEmailAndPassword(email,pass);
      await db.collection("users").doc(userCred.user.uid).set({
        username,
        email,
        joinDate:Date.now(),
        banned:false,
        moderator:false,
        warnings:0
      });
      loginUser(userCred.user);
    }catch(e){alert(e.message);}
  }
  document.getElementById("registerBtn").onclick=register;

  window.login = async function(){
    const email=document.getElementById("logEmail").value;
    const pass=document.getElementById("logPass").value;
    if(!email||!pass) return alert("Enter email and password");
    try{
      const userCred=await auth.signInWithEmailAndPassword(email,pass);
      loginUser(userCred.user);
    }catch(e){alert(e.message);}
  }
  document.getElementById("loginBtn").onclick=login;

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
      
      img.src=URL.createObjectURL(file); 
      img.classList.remove("hidden");
    } else {
      img.classList.add("hidden");
    }
  }

  // ================= CREATE POST =================
  document.getElementById("postBtn").onclick = async function(){
    const content = document.getElementById("postContent").value;
    const category = document.getElementById("postCategory").value;
    const imageFile = document.getElementById("postImage").files[0];
    
    if(!content && !imageFile) return alert("Write something or upload an image!");
    
    try{
      let imageUrl = null;
      if(imageFile){
        const storageRef = storage.ref(`posts/${currentUser.uid}/${Date.now()}_${imageFile.name}`);
        const uploadTask = await storageRef.put(imageFile);
        imageUrl = await uploadTask.ref.getDownloadURL();
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
        reportCount: 0
      });
      
      document.getElementById("postContent").value = "";
      document.getElementById("postImage").value = "";
      document.getElementById("previewImage").classList.add("hidden");
      alert("Post created!");
      loadPosts();
    }catch(e){
      alert("Error creating post: " + e.message);
      console.error(e);
    }
  }

  // ================= LOAD POSTS =================
  async function loadPosts(searchQuery = ""){
    const postsList = document.getElementById("postsList");
    postsList.innerHTML = "<p style='text-align:center; color:#888;'>Loading posts...</p>";
    
    try{
      let query = db.collection("posts").orderBy("timestamp", "desc").limit(50);
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
      
      postsList.innerHTML = "";
      
      snapshot.forEach(doc => {
        const post = doc.data();
        const postId = doc.id;
        
        // Filter by search query
        if(searchQuery && !post.content.toLowerCase().includes(searchQuery.toLowerCase())){
          return;
        }
        
        const isLiked = post.likedBy && post.likedBy.includes(currentUser.uid);
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
        
        const postDiv = document.createElement("div");
        postDiv.className = "post";
        if(post.reported) postDiv.style.borderColor = "rgba(255, 0, 0, 0.6)";
        if(post.pinned) postDiv.style.borderColor = "rgba(255, 215, 0, 0.6)";
        
        postDiv.innerHTML = `
          <div class="post-header">
            <strong>${post.author}${roleBadge}</strong> - ${post.category} ${pinBadge}
            ${post.reported ? '<span style="color:red;"> ⚠ REPORTED</span>' : ''}
            ${post.edited ? '<span style="color:#888;font-size:12px;"> (edited)</span>' : ''}
            <span class="post-time">${new Date(post.timestamp).toLocaleString()} (${timeAgo})</span>
          </div>
          ${post.content ? `<div class="post-content">${escapeHtml(post.content)}</div>` : ''}
          ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image" alt="Post image" onclick="openImageModal('${post.imageUrl}')">` : ''}
          ${post.comments && post.comments.length > 0 ? `
            <div style="margin-top:15px; padding:10px; background:rgba(0,0,0,0.3); border-radius:8px;">
              <strong style="color:#00d4ff;">💬 Comments (${post.comments.length}):</strong>
              ${post.comments.map(c => `
                <div style="margin:8px 0; padding:8px; background:rgba(0,0,0,0.2); border-left:2px solid #8a2be2; border-radius:5px;">
                  <small style="color:#00d4ff;"><strong>${c.author}</strong> - ${new Date(c.timestamp).toLocaleString()}</small><br>
                  <span style="color:#e0e0e0;">${escapeHtml(c.text)}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
          <div class="post-actions">
            <button onclick="likePost('${postId}')" style="background:${isLiked ? 'linear-gradient(135deg, #ff6b35, #f7931e)' : ''}">
              ${isLiked ? '❤️' : '👍'} ${post.likes || 0}
            </button>
            <button onclick="commentOnPost('${postId}')">💬 Comment</button>
            ${canEdit ? `<button onclick="editPost('${postId}', \`${escapeHtml(post.content || '').replace(/`/g, '\\`')}\`)">✏️ Edit</button>` : ''}
            ${canDelete ? `<button onclick="deletePost('${postId}')">🗑️ Delete</button>` : ''}
            ${!canModerate && post.authorId !== currentUser.uid ? 
              `<button onclick="reportPost('${postId}')">⚠️ Report</button>` : ''}
            ${canModerate ? `
              <button onclick="warnUser('${post.authorId}', '${post.author}')">⚠️ Warn</button>
              ${!post.pinned ? `<button onclick="pinPost('${postId}')">📌 Pin</button>` : `<button onclick="unpinPost('${postId}')">📌 Unpin</button>`}
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
      
      // Delete image from storage if exists
      if(post.imageUrl){
        try{
          const imageRef = storage.refFromURL(post.imageUrl);
          await imageRef.delete();
        }catch(e){
          console.log("Image already deleted or doesn't exist");
        }
      }
      
      await db.collection("posts").doc(postId).delete();
      loadPosts();
    }catch(e){
      alert("Error: " + e.message);
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
      
      snapshot.forEach(doc => {
        const user = doc.data();
        const userId = doc.id;
        
        if(searchQuery && !user.username.toLowerCase().includes(searchQuery.toLowerCase())){
          return;
        }
        
        const userDiv = document.createElement("div");
        userDiv.className = "user-item";
        userDiv.innerHTML = `
          <div>
            <strong>${user.username}</strong>
            ${user.moderator ? '<span style="color:#00d4ff;"> 🛡️ MOD</span>' : ''}
            ${user.banned ? '<span style="color:red;"> 🚫 BANNED</span>' : ''}
            <br>
            <span>Joined: ${new Date(user.joinDate).toLocaleDateString()}</span>
            ${user.warnings ? `<span style="color:orange;"> ⚠️ Warnings: ${user.warnings}/3</span>` : ''}
          </div>
          ${(isOwner || isModerator) && userId !== currentUser.uid ? `
            <div style="display:flex; gap:5px;">
              ${isOwner && !user.moderator ? `<button onclick="makeModerator('${userId}', '${user.username}')">Make Mod</button>` : ''}
              ${isOwner && user.moderator ? `<button onclick="removeModerator('${userId}', '${user.username}')">Remove Mod</button>` : ''}
              ${!user.banned ? `<button onclick="banUser('${userId}', '${user.username}')">Ban</button>` : ''}
              ${user.banned ? `<button onclick="unbanUser('${userId}', '${user.username}')">Unban</button>` : ''}
            </div>
          ` : ''}
        `;
        usersList.appendChild(userDiv);
      });
      
      if(usersList.innerHTML === "") usersList.innerHTML = "<p style='text-align:center; color:#888;'>No users found</p>";
    }catch(e){
      usersList.innerHTML = "<p style='text-align:center; color:red;'>Error loading users: " + e.message + "</p>";
    }
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
          rocket: 0
        }
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

  // React to update
  window.reactToUpdate = async function(updateId, reactionType){
    try{
      const updateRef = db.collection("updates").doc(updateId);
      const updateDoc = await updateRef.get();
      const update = updateDoc.data();
      
      const reactions = update.reactions || { like: 0, love: 0, fire: 0, rocket: 0 };
      reactions[reactionType] = (reactions[reactionType] || 0) + 1;
      
      await updateRef.update({ reactions });
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
    `;
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.cssText = `
      max-width: 90%;
      max-height: 90%;
      border-radius: 10px;
      box-shadow: 0 0 50px rgba(138, 43, 226, 0.8);
    `;
    
    modal.appendChild(img);
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
  }

};
