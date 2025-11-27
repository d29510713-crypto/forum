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
  initStars();
  initTabs();
  initLoginRegister();
  initDailyCoins();
  createPlinkoBoard();
};

// ================= STARS =================
function initStars() {
  const starsContainer = document.getElementById("stars");
  if (!starsContainer) return;
  for (let i=0;i<150;i++){
    const s=document.createElement("div");
    s.className="star";
    s.style.top=Math.random()*100+"%";
    s.style.left=Math.random()*100+"%";
    s.style.width=(Math.random()*2+1)+"px";
    s.style.height=(Math.random()*2+1)+"px";
    starsContainer.appendChild(s);
  }
}

// ================= TABS =================
function initTabs() {
  const tabs = ["posts","users","dms","updates","suggestions","games"];
  tabs.forEach(tab=>{
    const tabBtn = document.getElementById("tab"+tab.charAt(0).toUpperCase()+tab.slice(1));
    if(tabBtn) tabBtn.onclick = ()=>showTab(tab);
  });
}
function showTab(tab){
  ["posts","users","dms","updates","suggestions","games"].forEach(t=>{
    const section = document.getElementById(t+"Section");
    const tabBtn = document.getElementById("tab"+t.charAt(0).toUpperCase()+t.slice(1));
    if(section) section.classList.add("hidden");
    if(tabBtn) tabBtn.classList.remove("active");
  });
  const selectedSection = document.getElementById(tab+"Section");
  const selectedTab = document.getElementById("tab"+tab.charAt(0).toUpperCase()+tab.slice(1));
  if(selectedSection) selectedSection.classList.remove("hidden");
  if(selectedTab) selectedTab.classList.add("active");

  if(tab==="posts") loadPosts();
  if(tab==="users") loadUsers();
  if(tab==="dms") loadDMs();
  if(tab==="updates") loadUpdates();
}

// ================= LOGIN / REGISTER =================
function initLoginRegister(){
  const toggleToLogin = document.getElementById("toggleToLogin");
  const toggleToRegister = document.getElementById("toggleToRegister");

  if(toggleToLogin) toggleToLogin.onclick = ()=>{
    document.getElementById("registerBox").classList.add("hidden");
    document.getElementById("loginBox").classList.remove("hidden");
  };
  if(toggleToRegister) toggleToRegister.onclick = ()=>{
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

// ================= AUTH FUNCTIONS =================
async function register(){
  const email = document.getElementById("regEmail").value;
  const pass = document.getElementById("regPass").value;
  const username = document.getElementById("regUsername").value;
  if(!email || !pass || !username) return alert("All fields required");

  const snap = await db.collection("users").where("username","==",username).get();
  if(!snap.empty) return alert("Username taken");

  try{
    const userCred = await auth.createUserWithEmailAndPassword(email,pass);
    await db.collection("users").doc(userCred.user.uid).set({
      username,
      email,
      joinDate: Date.now(),
      banned:false,
      moderator:false,
      warnings:0,
      coins:0,
      lastDailyClaim:0
    });
    loginUser(userCred.user);
  }catch(e){alert(e.message);}
}

async function login(){
  const email = document.getElementById("logEmail").value;
  const pass = document.getElementById("logPass").value;
  if(!email || !pass) return alert("Enter email and password");
  try{
    const userCred = await auth.signInWithEmailAndPassword(email,pass);
    loginUser(userCred.user);
  }catch(e){alert(e.message);}
}

async function logout(){
  await auth.signOut();
  currentUser=null;
  currentUsername="";
  isOwner=false;
  isModerator=false;
  document.getElementById("forum").classList.add("hidden");
  document.getElementById("box").classList.remove("hidden");
}

async function loginUser(user){
  currentUser=user;
  const userDoc = await db.collection("users").doc(user.uid).get();
  if(!userDoc.exists) return;
  const data = userDoc.data();
  if(data.banned){alert("You are banned"); await auth.signOut(); return;}

  currentUsername=data.username;
  isModerator=data.moderator||false;
  isOwner=(user.email==="d29510713@gmail.com");

  document.getElementById("box").classList.add("hidden");
  document.getElementById("forum").classList.remove("hidden");
  if(isOwner||isModerator) document.getElementById("ownerControls").classList.remove("hidden");

  loadPosts();
  loadUsers();
  loadDMs();
  loadUpdates();
}

// ================= DAILY COINS =================
function initDailyCoins(){
  const coinsDisplay=document.getElementById("coinDisplay");
  const dailyCoinsBtn=document.getElementById("claimDailyCoins");

  async function updateCoinsDisplay(){
    if(!currentUser) return;
    const userDoc=await db.collection("users").doc(currentUser.uid).get();
    if(userDoc.exists){
      const data=userDoc.data();
      coinsDisplay.textContent=`🪙 Coins: ${data.coins||0}`;
    }
  }

  window.claimDailyCoins = async function(){
    if(!currentUser) return alert("Log in first!");
    const userRef=db.collection("users").doc(currentUser.uid);
    const userDoc=await userRef.get();
    if(!userDoc.exists) return;
    const userData=userDoc.data();
    const lastClaim=userData.lastDailyClaim||0;
    const now=Date.now();
    if(now-lastClaim<24*60*60*1000){
      const remaining=24*60*60*1000-(now-lastClaim);
      const hours=Math.floor(remaining/(1000*60*60));
      const minutes=Math.floor((remaining%(1000*60*60))/(1000*60));
      alert(`Already claimed! Come back in ${hours}h ${minutes}m.`);
      return;
    }
    const reward=Math.floor(Math.random()*51)+50;
    await userRef.update({coins:(userData.coins||0)+reward,lastDailyClaim:now});
    alert(`You received ${reward} coins!`);
    updateCoinsDisplay();
  };

  if(dailyCoinsBtn) dailyCoinsBtn.onclick=claimDailyCoins;
  auth.onAuthStateChanged(user=>{
    currentUser=user;
    if(currentUser) updateCoinsDisplay();
  });
}

// ================= POSTS =================
async function loadPosts(){
  const postsContainer = document.getElementById("postsList");
  if(!postsContainer) return;
  postsContainer.innerHTML="";
  const snapshot = await db.collection("posts").orderBy("timestamp","desc").get();
  snapshot.forEach(doc=>{
    const post=doc.data();
    if(post.deleted) return;
    const div=document.createElement("div");
    div.className="post";
    div.innerHTML=`<strong>${post.author||"[Unknown]"}</strong>: ${post.text||"[No text]"}`;
    postsContainer.appendChild(div);
  });
}

async function addPost(){
  const text=document.getElementById("postContent").value;
  if(!text) return alert("Cannot post empty");
  await db.collection("posts").add({
    text,
    author:currentUsername,
    timestamp:Date.now(),
    deleted:false
  });
  document.getElementById("postContent").value="";
  loadPosts();
}

// ================= USERS =================
async function loadUsers(){
  const usersContainer=document.getElementById("usersList");
  if(!usersContainer) return;
  usersContainer.innerHTML="";
  const snapshot=await db.collection("users").get();
  snapshot.forEach(doc=>{
    const u=doc.data();
    const div=document.createElement("div");
    div.innerHTML=`${u.username} ${u.moderator?"(Mod)":""} ${u.banned?"(Banned)":""} ${isOwner && u.email!==currentUser.email?`<button onclick="banUser('${doc.id}')">Ban</button>`:""}`;
    usersContainer.appendChild(div);
  });
}
async function banUser(uid){
  if(!isOwner) return alert("Only owner can ban");
  await db.collection("users").doc(uid).update({banned:true});
  alert("User banned!");
  loadUsers();
}

// ================= DMS =================
async function loadDMs(){
  const dmsContainer=document.getElementById("dmsList");
  if(!dmsContainer) return;
  dmsContainer.innerHTML="";
}

// ================= UPDATES =================
async function loadUpdates(){
  const updatesContainer=document.getElementById("updatesList");
  if(!updatesContainer) return;
  updatesContainer.innerHTML="";
}

// ================= PLINKO =================
function createPlinkoBoard(){
  const board = document.getElementById("plinkoBoard");
  board.innerHTML="";
  board.style.position="relative";
  board.style.background="rgba(0,0,0,0.3)";
  board.style.borderRadius="10px";
  board.style.overflow="hidden";
  board.style.height="400px";

  // pegs
  const rows=8;
  const cols=7;
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      if(r%2===0 && c===cols-1) continue;
      const peg=document.createElement("div");
      peg.style.width="10px";
      peg.style.height="10px";
      peg.style.background="#fff";
      peg.style.borderRadius="50%";
      peg.style.position="absolute";
      peg.style.top=`${r*40 + 40}px`;
      const offset=r%2===0?0:30;
      peg.style.left=`${c*60 + offset}px`;
      board.appendChild(peg);
    }
  }

  // slots indicator
  const slotRow=document.createElement("div");
  slotRow.style.position="absolute";
  slotRow.style.bottom="0";
  slotRow.style.width="100%";
  slotRow.style.height="40px";
  slotRow.style.display="flex";
  slotRow.style.justifyContent="space-between";
  const slots=["5x","2x","1x","0.5x","1x","2x","5x"];
  slots.forEach(s=>{
    const span=document.createElement("span");
    span.textContent=s;
    span.style.color="#ffd700";
    span.style.width="14%";
    span.style.textAlign="center";
    slotRow.appendChild(span);
  });
  board.appendChild(slotRow);
}

function playPlinko(){
  if(!currentUser) return alert("Log in first!");
  const bet=parseInt(document.getElementById("plinkoBet").value);
  if(isNaN(bet) || bet<10) return alert("Minimum bet 10 coins!");
  const board=document.getElementById("plinkoBoard");
  if(!board) return;

  db.collection("users").doc(currentUser.uid).get().then(doc=>{
    const coins=doc.data().coins||0;
    if(coins<bet) return alert("Not enough coins!");

    const ball=document.createElement("div");
    ball.style.width="20px";
    ball.style.height="20px";
    ball.style.background="#ffd700";
    ball.style.borderRadius="50%";
    ball.style.position="absolute";
    ball.style.top="0px";
    ball.style.left=board.offsetWidth/2-10 + "px";
    ball.style.transition="top 2s ease, left 2s ease";
    board.appendChild(ball);

    const slots=[5,2,1,0.5,1,2,5];
    const slotWidth=board.offsetWidth/slots.length;
    const finalIndex=Math.floor(Math.random()*slots.length);
    const finalX=finalIndex*slotWidth + slotWidth/2 - 10;

    setTimeout(()=>{
      ball.style.top="360px";
      ball.style.left=finalX+"px";
    },50);

    setTimeout(()=>{
      const resultMultiplier = slots[finalIndex];
      const winnings = Math.floor(bet*resultMultiplier);
      db.collection("users").doc(currentUser.uid).update({coins: coins-bet+winnings});

      const resultDiv=document.createElement("div");
      resultDiv.style.padding="10px";
      resultDiv.style.textAlign="center";
      resultDiv.style.color="#ffd700";
      resultDiv.innerHTML=`🎯 You landed <strong>${resultMultiplier}x</strong>! Won <strong>${winnings}</strong> coins.`;
      board.appendChild(resultDiv);
      ball.remove();
    },2200);
  });
}
