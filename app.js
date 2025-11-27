// ================= GLOBAL =================
let currentUser=null;
let currentUsername="";

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

// ================= WINDOW ONLOAD =================
window.onload=function(){
  initStars();
  initTabs();
  initLoginRegister();
  initDailyCoins();
  showTab("posts");
};

// ================= STARS =================
function initStars(){
  const starsContainer=document.getElementById("stars");
  for(let i=0;i<100;i++){
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
function initTabs(){
  const tabs=["posts","users","games"];
  tabs.forEach(tab=>{
    const btn=document.getElementById("tab"+tab.charAt(0).toUpperCase()+tab.slice(1));
    if(btn) btn.onclick=()=>showTab(tab);
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
    username,email,coins:0,lastDailyClaim:0
  });
  loginUser(userCred.user);
}

async function login(){
  const email=document.getElementById("logEmail").value;
  const pass=document.getElementById("logPass").value;
  if(!email||!pass) return alert("All fields required");
  const userCred=await auth.signInWithEmailAndPassword(email,pass);
  loginUser(userCred.user);
}

async function logout(){
  await auth.signOut();
  currentUser=null;
  currentUsername="";
  document.getElementById("forum").classList.add("hidden");
  document.getElementById("box").classList.remove("hidden");
}

async function loginUser(user){
  currentUser=user;
  const doc=await db.collection("users").doc(user.uid).get();
  const data=doc.data();
  currentUsername=data.username;
  document.getElementById("box").classList.add("hidden");
  document.getElementById("forum").classList.remove("hidden");
  loadPosts();
  loadUsers();
}

// ================= DAILY COINS =================
function initDailyCoins(){
  window.claimDailyCoins=async function(){
    if(!currentUser) return alert("Login first");
    const ref=db.collection("users").doc(currentUser.uid);
    const doc=await ref.get();
    const data=doc.data();
    const last=data.lastDailyClaim||0;
    const now=Date.now();
    if(now-last<24*60*60*1000){
      const remain=24*60*60*1000-(now-last);
      const h=Math.floor(remain/(1000*60*60));
      const m=Math.floor((remain%(1000*60*60))/(1000*60));
      return alert(`Already claimed! ${h}h ${m}m left`);
    }
    const reward=Math.floor(Math.random()*51)+50;
    await ref.update({coins:(data.coins||0)+reward,lastDailyClaim:now});
    document.getElementById("coinDisplay").textContent=`🪙 ${(data.coins||0)+reward} Coins`;
    alert(`You got ${reward} coins!`);
  }
}

// ================= POSTS =================
async function loadPosts(){
  const container=document.getElementById("postsContainer");
  container.innerHTML="";
  const snap=await db.collection("posts").orderBy("timestamp","desc").get();
  snap.forEach(doc=>{
    const p=doc.data();
    const div=document.createElement("div");
    div.innerHTML=`<strong>${p.author||"Unknown"}</strong>: ${p.text||""}`;
    container.appendChild(div);
  });
}

async function addPost(){
  const text=document.getElementById("newPostText").value;
  if(!text) return alert("Cannot be empty");
  await db.collection("posts").add({
    author: currentUsername,
    text,
    timestamp:Date.now(),
    deleted:false
  });
  document.getElementById("newPostText").value="";
  loadPosts();
}

// ================= USERS =================
async function loadUsers(){
  const container=document.getElementById("usersContainer");
  container.innerHTML="";
  const snap=await db.collection("users").get();
  snap.forEach(doc=>{
    const u=doc.data();
    const div=document.createElement("div");
    div.textContent=`${u.username} - Coins: ${u.coins||0}`;
    container.appendChild(div);
  });
}

// ================= PLINKO =================
function startPlinko(){
  const ball=document.getElementById("plinkoBall");
  let pos=0;
  let left=140;
  ball.style.top="0px";
  ball.style.left=left+"px";
  const interval=setInterval(()=>{
    pos+=5;
    left += Math.random()*10-5;
    if(left<0) left=0;
    if(left>280) left=280;
    ball.style.top=pos+"px";
    ball.style.left=left+"px";
    if(pos>=380) clearInterval(interval);
  },30);
}
