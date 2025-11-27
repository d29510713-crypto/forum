// GLOBAL VARIABLES
let currentUser=null;
let currentUsername="";
let isOwner=false;
let isModerator=false;

// FIREBASE INIT
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

// WINDOW ONLOAD
window.onload=function(){
  initStars();
  initTabs();
  initLoginRegister();
  initDailyCoins();
  createPlinkoBoard();
  document.getElementById("postBtn").onclick = addPost;
  document.getElementById("submitSuggestionBtn").onclick = addSuggestion;
};

// STARS
function initStars(){
  const starsContainer=document.getElementById("stars");
  for(let i=0;i<150;i++){
    const s=document.createElement("div");
    s.className="star";
    s.style.top=Math.random()*100+"%";
    s.style.left=Math.random()*100+"%";
    s.style.width=(Math.random()*2+1)+"px";
    s.style.height=(Math.random()*2+1)+"px";
    starsContainer.appendChild(s);
  }
}

// TABS
function initTabs(){
  const tabs=["posts","users","dms","updates","suggestions","games"];
  tabs.forEach(tab=>{
    const tabBtn=document.getElementById("tab"+tab.charAt(0).toUpperCase()+tab.slice(1));
    if(tabBtn) tabBtn.onclick=()=>showTab(tab);
  });
}
function showTab(tab){
  ["posts","users","dms","updates","suggestions","games"].forEach(t=>{
    const sec=document.getElementById(t+"Section");
    const btn=document.getElementById("tab"+t.charAt(0).toUpperCase()+t.slice(1));
    if(sec) sec.classList.add("hidden");
    if(btn) btn.classList.remove("active");
  });
  document.getElementById(tab+"Section").classList.remove("hidden");
  document.getElementById("tab"+tab.charAt(0).toUpperCase()+tab.slice(1)).classList.add("active");

  if(tab==="posts") loadPosts();
  if(tab==="users") loadUsers();
}

// LOGIN / REGISTER
function initLoginRegister(){
  document.getElementById("toggleToLogin").onclick=()=>{
    document.getElementById("registerBox").classList.add("hidden");
    document.getElementById("loginBox").classList.remove("hidden");
  };
  document.getElementById("toggleToRegister").onclick=()=>{
    document.getElementById("loginBox").classList.add("hidden");
    document.getElementById("registerBox").classList.remove("hidden");
  };
  document.getElementById("registerBtn").onclick=register;
  document.getElementById("loginBtn").onclick=login;
  document.getElementById("logoutBtn").onclick=logout;

  auth.onAuthStateChanged(user=>{
    if(user) loginUser(user);
  });
}
async function register(){
  const email=document.getElementById("regEmail").value;
  const pass=document.getElementById("regPass").value;
  const username=document.getElementById("regUsername").value;
  if(!email||!pass||!username) return alert("All fields required");
  const snap=await db.collection("users").where("username","==",username).get();
  if(!snap.empty) return alert("Username taken");
  const userCred=await auth.createUserWithEmailAndPassword(email,pass);
  await db.collection("users").doc(userCred.user.uid).set({
    username,email,joinDate:Date.now(),banned:false,moderator:false,coins:0,lastDailyClaim:0
  });
  loginUser(userCred.user);
}
async function login(){
  const email=document.getElementById("logEmail").value;
  const pass=document.getElementById("logPass").value;
  if(!email||!pass) return alert("Enter email and password");
  const userCred=await auth.signInWithEmailAndPassword(email,pass);
  loginUser(userCred.user);
}
async function logout(){
  await auth.signOut();
  currentUser=null; currentUsername="";
  document.getElementById("forum").classList.add("hidden");
  document.getElementById("box").classList.remove("hidden");
}
async function loginUser(user){
  currentUser=user;
  const doc=await db.collection("users").doc(user.uid).get();
  if(!doc.exists) return;
  const data=doc.data();
  if(data.banned){alert("Banned!"); await auth.signOut(); return;}
  currentUsername=data.username;
  isOwner=(user.email==="d29510713@gmail.com");
  isModerator=data.moderator||false;
  document.getElementById("box").classList.add("hidden");
  document.getElementById("forum").classList.remove("hidden");
  loadPosts(); loadUsers();
}

// DAILY COINS
function initDailyCoins(){
  const coinsDisplay=document.getElementById("coinDisplay");
  document.getElementById("claimDailyCoins").onclick=async function(){
    if(!currentUser) return alert("Log in first!");
    const ref=db.collection("users").doc(currentUser.uid);
    const doc=await ref.get();
    const data=doc.data();
    const now=Date.now();
    if(now-(data.lastDailyClaim||0)<24*3600*1000){
      alert("Already claimed!");
      return;
    }
    const reward=Math.floor(Math.random()*51)+50;
    await ref.update({coins:(data.coins||0)+reward,lastDailyClaim:now});
    alert(`You got ${reward} coins!`);
    coinsDisplay.textContent=`🪙 Coins: ${(data.coins||0)+reward}`;
  };
}

// POSTS
async function loadPosts(){
  const cont=document.getElementById("postsList");
  cont.innerHTML="";
  const snapshot=await db.collection("posts").orderBy("timestamp","desc").get();
  snapshot.forEach(doc=>{
    const p=doc.data();
    const div=document.createElement("div");
    div.innerHTML=`<strong>${p.author}</strong>: ${p.text}`;
    cont.appendChild(div);
  });
}
async function addPost(){
  if(!currentUser) return alert("Log in first!");
  const text=document.getElementById("postContent").value;
  if(!text) return alert("Cannot post empty");
  const ref=db.collection("users").doc(currentUser.uid);
  const userDoc=await ref.get();
  await db.collection("posts").add({
    text, author:currentUsername, timestamp:Date.now()
  });
  await ref.update({coins:(userDoc.data().coins||0)+5});
  document.getElementById("postContent").value="";
  loadPosts();
}

// USERS
async function loadUsers(){
  const cont=document.getElementById("usersList");
  cont.innerHTML="";
  const snap=await db.collection("users").get();
  snap.forEach(doc=>{
    const u=doc.data();
    const div=document.createElement("div");
    div.textContent=`${u.username} - Coins: ${u.coins||0}`;
    cont.appendChild(div);
  });
}

// SUGGESTIONS
async function addSuggestion(){
  if(!currentUser) return alert("Log in first!");
  const title=document.getElementById("suggestionTitle").value;
  const desc=document.getElementById("suggestionDescription").value;
  if(!title||!desc) return alert("Fill both fields");
  const ref=db.collection("users").doc(currentUser.uid);
  const userDoc=await ref.get();
  await db.collection("suggestions").add({
    title, desc, author:currentUsername, timestamp:Date.now()
  });
  await ref.update({coins:(userDoc.data().coins||0)+10});
  document.getElementById("suggestionTitle").value="";
  document.getElementById("suggestionDescription").value="";
}

// ================= PLINKO =================
function createPlinkoBoard(){
  const board=document.getElementById("plinkoBoard");
  board.innerHTML="";
  const rows=8, cols=7;
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      if(r%2==0 && c==cols-1) continue;
      const peg=document.createElement("div");
      peg.style.width="10px"; peg.style.height="10px";
      peg.style.background="#fff"; peg.style.borderRadius="50%";
      peg.style.position="absolute";
      peg.style.top=`${r*40+40}px`;
      const offset=r%2===0?0:30;
      peg.style.left=`${c*60+offset}px`;
      board.appendChild(peg);
    }
  }
}
function playPlinko(){
  if(!currentUser) return alert("Log in first!");
  const bet=parseInt(document.getElementById("plinkoBet").value);
  if(isNaN(bet)||bet<10) return alert("Min 10 coins");
  const ref=db.collection("users").doc(currentUser.uid);
  ref.get().then(doc=>{
    const coins=doc.data().coins||0;
    if(coins<bet) return alert("Not enough coins");
    const board=document.getElementById("plinkoBoard");
    const ball=document.createElement("div");
    ball.style.width="20px"; ball.style.height="20px";
    ball.style.background="#ffd700"; ball.style.borderRadius="50%";
    ball.style.position="absolute"; ball.style.top="0px";
    ball.style.left=board.offsetWidth/2-10+"px";
    ball.style.transition="top 2s ease, left 2s ease";
    board.appendChild(ball);

    const slots=[5,2,1,0.5,1,2,5];
    const slotWidth=board.offsetWidth/slots.length;
    const finalIndex=Math.floor(Math.random()*slots.length);
    const finalX=finalIndex*slotWidth+slotWidth/2-10;

    setTimeout(()=>{ball.style.top="360px"; ball.style.left=finalX+"px";},50);
    setTimeout(()=>{
      const win=slots[finalIndex];
      const winnings=Math.floor(bet*win);
      ref.update({coins:coins-bet+winnings});
      alert(`You landed ${win}x! Won ${winnings} coins`);
      ball.remove();
    },2200);
  });
}
