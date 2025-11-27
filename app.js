// ================= GLOBAL VARIABLES =================
let currentUser = null;
let currentUsername = "";
let isOwner = false;
let isModerator = false;

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

// ================= WINDOW ONLOAD =================
window.onload = function() {
  initTabs();
  initLoginRegister();
  initDailyCoins();
};

// ================= TABS =================
function initTabs() {
  const tabs = ["posts", "users", "games"];
  tabs.forEach(tab => {
    const tabBtn = document.getElementById("tab" + tab.charAt(0).toUpperCase() + tab.slice(1));
    if(tabBtn) tabBtn.onclick = () => showTab(tab);
  });
}
function showTab(tab){
  ["posts","users","games"].forEach(t=>{
    document.getElementById(t+"Section").classList.add("hidden");
    document.getElementById("tab"+t.charAt(0).toUpperCase()+t.slice(1)).classList.remove("active");
  });
  document.getElementById(tab+"Section").classList.remove("hidden");
  document.getElementById("tab"+tab.charAt(0).toUpperCase()+tab.slice(1)).classList.add("active");
  if(tab==="posts") loadPosts();
  if(tab==="users") loadUsers();
}

// ================= LOGIN / REGISTER =================
function initLoginRegister(){
  document.getElementById("toggleToLogin").onclick = ()=>{
    document.getElementById("registerBox").classList.add("hidden");
    document.getElementById("loginBox").classList.remove("hidden");
  };
  document.getElementById("toggleToRegister").onclick = ()=>{
    document.getElementById("loginBox").classList.add("hidden");
    document.getElementById("registerBox").classList.remove("hidden");
  };
  document.getElementById("registerBtn").onclick = register;
  document.getElementById("loginBtn").onclick = login;
  document.getElementById("logoutBtn").onclick = logout;

  auth.onAuthStateChanged(user=>{
    if(user) loginUser(user);
  });
}

async function register(){
  const email = document.getElementById("regEmail").value;
  const pass = document.getElementById("regPass").value;
  const username = document.getElementById("regUsername").value;
  if(!email||!pass||!username) return alert("All fields required");

  const snap = await db.collection("users").where("username","==",username).get();
  if(!snap.empty) return alert("Username taken");

  const userCred = await auth.createUserWithEmailAndPassword(email,pass);
  await db.collection("users").doc(userCred.user.uid).set({
    username,email,joinDate:Date.now(),banned:false,moderator:false,coins:0
  });
  loginUser(userCred.user);
}

async function login(){
  const email = document.getElementById("logEmail").value;
  const pass = document.getElementById("logPass").value;
  if(!email||!pass) return alert("Enter email/password");

  const userCred = await auth.signInWithEmailAndPassword(email,pass);
  loginUser(userCred.user);
}

async function logout(){
  await auth.signOut();
  currentUser = null; currentUsername=""; isOwner=false; isModerator=false;
  document.getElementById("forum").classList.add("hidden");
  document.getElementById("box").classList.remove("hidden");
}

async function loginUser(user){
  currentUser = user;
  const userDoc = await db.collection("users").doc(user.uid).get();
  if(!userDoc.exists) return;
  const data = userDoc.data();
  currentUsername = data.username;
  isModerator = data.moderator||false;
  isOwner = (user.email==="d29510713@gmail.com");
  document.getElementById("box").classList.add("hidden");
  document.getElementById("forum").classList.remove("hidden");
}

// ================= DAILY COINS =================
function initDailyCoins(){
  const coinsDisplay = document.getElementById("coinDisplay");
  window.claimDailyCoins = async function(){
    if(!currentUser) return alert("Log in first!");
    const userRef = db.collection("users").doc(currentUser.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    const last = userData.lastDailyClaim||0;
    const now = Date.now();
    if(now-last<24*60*60*1000){
      const rem = 24*60*60*1000-(now-last);
      const h=Math.floor(rem/(1000*60*60)), m=Math.floor((rem%(1000*60*60))/(1000*60));
      return alert(`Already claimed! Come back in ${h}h ${m}m.`);
    }
    const reward = Math.floor(Math.random()*51)+50;
    await userRef.update({coins:(userData.coins||0)+reward,lastDailyClaim:now});
    alert(`You received ${reward} coins!`);
    coinsDisplay.textContent = `🪙 ${(userData.coins||0)+reward}`;
  };
}

// ================= POSTS & COMMENTS =================
async function loadPosts(){
  const postsContainer = document.getElementById("postsList");
  if(!postsContainer) return;
  postsContainer.innerHTML = "";
  const snapshot = await db.collection("posts").orderBy("timestamp","desc").get();
  snapshot.forEach(doc=>{
    const p = doc.data();
    if(p.deleted) return;
    const div=document.createElement("div");
    div.className="post";
    div.innerHTML = `<strong>${p.author}</strong>: ${p.content||""} ${isOwner||isModerator?`<button onclick="deletePost('${doc.id}')">Delete</button>`:""}<div id="comments-${doc.id}" class="comments"></div><input placeholder="Comment" id="commentInput-${doc.id}"/><button onclick="addComment('${doc.id}')">Post Comment</button>`;
    postsContainer.appendChild(div);
    loadComments(doc.id);
  });
}

async function addPost(){
  const text=document.getElementById("newPostText").value;
  if(!text) return alert("Cannot post empty");
  await db.collection("posts").add({
    author: currentUsername,
    content: text,
    timestamp: Date.now(),
    deleted:false
  });
  document.getElementById("newPostText").value="";
  loadPosts();
}

async function deletePost(id){ if(!isOwner&&!isModerator)return alert("Not authorized"); await db.collection("posts").doc(id).update({deleted:true}); loadPosts(); }

async function loadComments(postId){
  const container=document.getElementById(`comments-${postId}`);
  if(!container)return;
  container.innerHTML="";
  const snapshot=await db.collection("posts").doc(postId).collection("comments").orderBy("timestamp").get();
  snapshot.forEach(doc=>{
    const c=doc.data();
    if(c.deleted) return;
    const div=document.createElement("div");
    div.className="comment";
    div.innerHTML=`<strong>${c.author}</strong>: ${c.content||""} ${(isOwner||isModerator)?`<button onclick="deleteComment('${postId}','${doc.id}')">Delete</button>`:""}`;
    container.appendChild(div);
  });
}

async function addComment(postId){
  const input=document.getElementById(`commentInput-${postId}`);
  const text=input.value;
  if(!text) return alert("Cannot comment empty");
  await db.collection("posts").doc(postId).collection("comments").add({author:currentUsername,content:text,timestamp:Date.now(),deleted:false});
  input.value="";
  loadComments(postId);
}

async function deleteComment(postId,commentId){ if(!isOwner&&!isModerator)return alert("Not authorized"); await db.collection("posts").doc(postId).collection("comments").doc(commentId).update({deleted:true}); loadComments(postId); }

// ================= USERS =================
async function loadUsers(){
  const container=document.getElementById("usersList");
  container.innerHTML="";
  const snapshot=await db.collection("users").get();
  snapshot.forEach(doc=>{
    const u=doc.data();
    const div=document.createElement("div");
    div.innerHTML=`${u.username} ${u.moderator?"(Mod)":""}`;
    container.appendChild(div);
  });
}

// ================= PLINKO GAME =================
function playPlinko(){
  const board=document.getElementById("plinkoBoard");
  const ball=document.createElement("div");
  ball.className="ball";
  board.appendChild(ball);

  let posY=0;
  const interval=setInterval(()=>{
    posY+=5;
    if(posY>=380){
      clearInterval(interval);
      // Random slot result
      const slots=[5,2,1,0.5,1,2,5];
      const idx=Math.floor(Math.random()*slots.length);
      alert(`Plinko finished! You won ${slots[idx]}x your bet!`);
      board.removeChild(ball);
    } else {
      ball.style.top=posY+"px";
      ball.style.left=(50 + Math.sin(posY/30)*50)+"%"; // zigzag
    }
  },30);
}
