// ================= GLOBAL VARIABLES =================
let currentUser = null;
let currentUsername = "";
let isOwner = false;
let isModerator = false;

// ================= FIREBASE INIT =================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ================= WINDOW ONLOAD =================
window.onload = function () {
  initStars();
  initTabs();
  initLoginRegister();
  initDailyRewards();
};

// ================= STARS =================
function initStars() {
  const starsContainer = document.getElementById("stars");
  if (!starsContainer) return;
  for (let i = 0; i < 150; i++) {
    const s = document.createElement("div");
    s.className = "star";
    s.style.top = Math.random() * 100 + "%";
    s.style.left = Math.random() * 100 + "%";
    s.style.width = (Math.random() * 2 + 1) + "px";
    s.style.height = (Math.random() * 2 + 1) + "px";
    starsContainer.appendChild(s);
  }
}

// ================= TABS =================
function initTabs() {
  const tabs = ["Posts","Users","DMs","Updates","Suggestions","Games","Leaderboard"];
  tabs.forEach(tab => {
    const tabBtn = document.getElementById("tab"+tab);
    if(tabBtn) tabBtn.onclick = () => showTab(tab.toLowerCase());
  });
}

function showTab(tab) {
  ["posts","users","dms","updates","suggestions","games","leaderboard"].forEach(t=>{
    const section = document.getElementById(t+"Section");
    const btn = document.getElementById("tab"+t.charAt(0).toUpperCase()+t.slice(1));
    if(section) section.classList.add("hidden");
    if(btn) btn.classList.remove("active");
  });
  const section = document.getElementById(tab+"Section");
  const btn = document.getElementById("tab"+tab.charAt(0).toUpperCase()+tab.slice(1));
  if(section) section.classList.remove("hidden");
  if(btn) btn.classList.add("active");

  if(tab==="posts") loadPosts();
  if(tab==="users") loadUsers();
  if(tab==="dms") loadDMs();
  if(tab==="updates") loadUpdates();
  if(tab==="suggestions") loadSuggestions();
  if(tab==="leaderboard") loadLeaderboard();
}

// ================= LOGIN / REGISTER =================
function initLoginRegister() {
  document.getElementById("toggleToLogin").onclick = ()=>{
    document.getElementById("loginBox").classList.remove("hidden");
    document.getElementById("registerBox").classList.add("hidden");
  };
  document.getElementById("toggleToRegister").onclick = ()=>{
    document.getElementById("registerBox").classList.remove("hidden");
    document.getElementById("loginBox").classList.add("hidden");
  };
  document.getElementById("registerBtn").onclick = register;
  document.getElementById("loginBtn").onclick = login;
  document.getElementById("logoutBtn").onclick = logout;

  auth.onAuthStateChanged(user=>{
    if(user) loginUser(user);
  });
}

async function register() {
  const email = document.getElementById("regEmail").value;
  const pass = document.getElementById("regPass").value;
  const username = document.getElementById("regUsername").value;
  if(!email||!pass||!username) return alert("All fields required");
  const snap = await db.collection("users").where("username","==",username).get();
  if(!snap.empty) return alert("Username taken");
  try{
    const userCred = await auth.createUserWithEmailAndPassword(email,pass);
    await db.collection("users").doc(userCred.user.uid).set({
      username,email,coins:0,xp:0,joinDate:Date.now(),moderator:false,banned:false,lastDaily:0
    });
    loginUser(userCred.user);
  }catch(e){alert(e.message);}
}

async function login() {
  const email = document.getElementById("logEmail").value;
  const pass = document.getElementById("logPass").value;
  if(!email||!pass) return alert("Enter email and password");
  try{
    const userCred = await auth.signInWithEmailAndPassword(email,pass);
    loginUser(userCred.user);
  }catch(e){alert(e.message);}
}

async function logout(){
  await auth.signOut();
  currentUser=currentUsername=null;
  document.getElementById("forum").classList.add("hidden");
  document.getElementById("box").classList.remove("hidden");
}

// ================= LOGIN USER =================
async function loginUser(user){
  currentUser=user;
  const doc = await db.collection("users").doc(user.uid).get();
  if(!doc.exists) return;
  const data = doc.data();
  if(data.banned){ alert("You are banned"); await auth.signOut(); return;}
  currentUsername=data.username;
  isModerator=data.moderator||false;
  isOwner=(user.email==="YOUR_EMAIL@gmail.com");

  document.getElementById("box").classList.add("hidden");
  document.getElementById("forum").classList.remove("hidden");

  loadPosts(); loadUsers(); loadDMs(); loadUpdates(); loadSuggestions(); loadLeaderboard();
  updateCoinsDisplay();
}

// ================= COINS & DAILY REWARDS =================
async function initDailyRewards(){
  window.claimDailyCoins=async ()=>{
    if(!currentUser) return alert("Log in first");
    const ref=db.collection("users").doc(currentUser.uid);
    const doc=await ref.get();
    const data=doc.data();
    const now=Date.now();
    if(now-data.lastDaily<24*60*60*1000){
      const h=Math.floor((24*60*60*1000-(now-data.lastDaily))/(1000*60*60));
      const m=Math.floor(((24*60*60*1000-(now-data.lastDaily))%(1000*60*60))/(1000*60));
      return alert(`Already claimed. Come back in ${h}h ${m}m.`);
    }
    const reward=Math.floor(Math.random()*50)+50;
    await ref.update({coins:(data.coins||0)+reward,lastDaily:now});
    alert(`You got ${reward} coins!`);
    updateCoinsDisplay();
  };
}

async function updateCoinsDisplay(){
  if(!currentUser) return;
  const doc = await db.collection("users").doc(currentUser.uid).get();
  const data = doc.data();
  document.getElementById("coinDisplay").textContent=`🪙 ${data.coins||0} | XP: ${data.xp||0}`;
}

// ================= POSTS =================
document.getElementById("postBtn")?.addEventListener("click",addPost);
async function addPost(){
  if(!currentUser) return alert("Log in first");
  const content=document.getElementById("postContent").value;
  const category=document.getElementById("postCategory").value;
  const file=document.getElementById("postImage").files[0];
  if(!content && !file) return alert("Cannot post empty");

  const postRef = db.collection("posts").doc();
  let imageUrl = null;
  if(file){
    const storageRef=storage.ref().child("postsImages/"+postRef.id);
    await storageRef.put(file);
    imageUrl=await storageRef.getDownloadURL();
  }

  await postRef.set({
    author: currentUsername,
    authorId: currentUser.uid,
    content,
    category,
    imageUrl,
    timestamp:Date.now(),
    deleted:false,
    likes:0,
    likedBy:[],
    comments:[],
    xpReward:5
  });

  // Reward user
  const userRef=db.collection("users").doc(currentUser.uid);
  const userDoc=await userRef.get();
  await userRef.update({coins:(userDoc.data().coins||0)+5,xp:(userDoc.data().xp||0)+5});

  document.getElementById("postContent").value="";
  document.getElementById("postImage").value="";
  loadPosts(); updateCoinsDisplay();
}

async function loadPosts(){
  const container=document.getElementById("postsList");
  container.innerHTML="";
  const snapshot=await db.collection("posts").orderBy("timestamp","desc").get();
  snapshot.forEach(doc=>{
    const p=doc.data();
    if(p.deleted) return;
    const div=document.createElement("div");
    div.innerHTML=`<strong>${p.author}</strong>: ${p.content || ""} 
      ${p.imageUrl? `<br><img src="${p.imageUrl}" style="max-width:200px;">`: ""}
    `;
    container.appendChild(div);
  });
}

// ================= USERS =================
async function loadUsers(){
  const container=document.getElementById("usersList");
  container.innerHTML="";
  const snapshot=await db.collection("users").get();
  snapshot.forEach(doc=>{
    const u=doc.data();
    const div=document.createElement("div");
    div.textContent=`${u.username} | Coins: ${u.coins||0} | XP: ${u.xp||0}`;
    container.appendChild(div);
  });
}

// ================= LEADERBOARD =================
async function loadLeaderboard(){
  const container=document.getElementById("leaderboardList");
  container.innerHTML="";
  const snapshot=await db.collection("users").orderBy("coins","desc").limit(10).get();
  snapshot.forEach((doc,i)=>{
    const u=doc.data();
    const div=document.createElement("div");
    div.textContent=`#${i+1} ${u.username} | Coins: ${u.coins||0} | XP: ${u.xp||0}`;
    container.appendChild(div);
  });
}

// ================= PLINKO GAME =================
const plinkoCanvas = document.getElementById("plinkoCanvas");
const ctx = plinkoCanvas?.getContext("2d");
let plinkoBall = null;

function playPlinko(){
  if(!currentUser) return alert("Login first");
  const bet = parseInt(document.getElementById("plinkoBet").value);
  if(isNaN(bet)||bet<10) return alert("Minimum bet 10");
  
  db.collection("users").doc(currentUser.uid).get().then(doc=>{
    const data=doc.data();
    if(data.coins<bet) return alert("Not enough coins");
    db.collection("users").doc(currentUser.uid).update({coins:data.coins-bet});
    updateCoinsDisplay();
    plinkoBall = {x:200, y:10, vx:(Math.random()-0.5)*4, vy:2};
    requestAnimationFrame(plinkoAnimate);
    setTimeout(()=>finishPlinko(bet),3000);
  });
}

function plinkoAnimate(){
  if(!plinkoBall || !ctx) return;
  ctx.clearRect(0,0,plinkoCanvas.width,plinkoCanvas.height);
  // draw pegs
  for(let row=0; row<8; row++){
    for(let i=0;i<9;i++){
      ctx.beginPath();
      ctx.arc(25+i*50 + (row%2)*25, 50+row*40,5,0,Math.PI*2);
      ctx.fillStyle="white"; ctx.fill();
    }
  }
  // ball physics
  plinkoBall.vy+=0.2; plinkoBall.x+=plinkoBall.vx; plinkoBall.y+=plinkoBall.vy;
  if(plinkoBall.x<0||plinkoBall.x>plinkoCanvas.width) plinkoBall.vx*=-1;
  if(plinkoBall.y>plinkoCanvas.height) plinkoBall.y=plinkoCanvas.height;
  ctx.beginPath();
  ctx.arc(plinkoBall.x,plinkoBall.y,8,0,Math.PI*2);
  ctx.fillStyle="red"; ctx.fill();
  if(plinkoBall.y<plinkoCanvas.height) requestAnimationFrame(plinkoAnimate);
}

// determine Plinko reward
async function finishPlinko(bet){
  const slots = [0.5,1,2,5,1,2,5]; // multipliers
  const pos = Math.floor(plinkoBall.x/57); 
  const mult = slots[pos]||1;
  const reward = Math.floor(bet*mult);
  const userRef=db.collection("users").doc(currentUser.uid);
  const doc = await userRef.get();
  await userRef.update({coins:(doc.data().coins||0)+reward,xp:(doc.data().xp||0)+reward});
  alert(`You won ${reward} coins!`);
  plinkoBall=null;
  updateCoinsDisplay();
}

// ================= SUGGESTIONS =================
document.getElementById("submitSuggestionBtn")?.addEventListener("click",async ()=>{
  const title=document.getElementById("suggestionTitle").value;
  const desc=document.getElementById("suggestionDescription").value;
  if(!title||!desc) return alert("Cannot submit empty");
  const suggestionRef=db.collection("suggestions").doc();
  await suggestionRef.set({title,description:desc,author:currentUsername,timestamp:Date.now()});
  const userRef=db.collection("users").doc(currentUser.uid);
  const doc=await userRef.get();
  await userRef.update({coins:(doc.data().coins||0)+10,xp:(doc.data().xp||0)+10});
  document.getElementById("suggestionTitle").value="";
  document.getElementById("suggestionDescription").value="";
  loadSuggestions();
  updateCoinsDisplay();
});

async function loadSuggestions(){
  const container=document.getElementById("suggestionsList");
  container.innerHTML="";
  const snapshot=await db.collection("suggestions").orderBy("timestamp","desc").get();
  snapshot.forEach(doc=>{
    const s=doc.data();
    const div=document.createElement("div");
    div.innerHTML=`<strong>${s.title}</strong> by ${s.author}<br>${s.description}`;
    container.appendChild(div);
  });
}

// ================= UPDATES =================
async function loadUpdates(){
  const container=document.getElementById("updatesList");
  container.innerHTML="";
  const snapshot=await db.collection("updates").orderBy("timestamp","desc").get();
  snapshot.forEach(doc=>{
    const u=doc.data();
    const div=document.createElement("div");
    div.innerHTML=`<strong>${u.title}</strong>: ${u.text}`;
    container.appendChild(div);
  });
}

// ================= DMS (basic) =================
document.getElementById("dmBtn")?.addEventListener("click",async ()=>{
  const toUsername=document.getElementById("dmToUsername").value;
  const content=document.getElementById("dmContent").value;
  if(!toUsername||!content) return alert("Fill fields");
  const userSnap=await db.collection("users").where("username","==",toUsername).get();
  if(userSnap.empty) return alert("User not found");
  const toUID=userSnap.docs[0].id;
  await db.collection("dms").add({participants:[currentUser.uid,toUID],lastMessage:content,timestamp:Date.now()});
  document.getElementById("dmContent").value="";
  loadDMs();
});

async function loadDMs(){
  const container=document.getElementById("dmsList");
  container.innerHTML="";
  const snapshot=await db.collection("dms").where("participants","array-contains",currentUser.uid).orderBy("timestamp","desc").get();
  snapshot.forEach(doc=>{
    const dm=doc.data();
    const other=dm.participants.find(uid=>uid!==currentUser.uid);
    const div=document.createElement("div");
    div.textContent=`DM with ${other}: ${dm.lastMessage}`;
    container.appendChild(div);
  });
}
