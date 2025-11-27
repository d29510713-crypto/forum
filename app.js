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
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ================= GLOBAL =================
let currentUser = null;
let currentUsername = "";
let isOwner = false;
let isModerator = false;

// ================= UI ELEMENTS =================
const loginBox = document.getElementById("loginBox");
const registerBox = document.getElementById("registerBox");
const forum = document.getElementById("forum");
const coinDisplay = document.getElementById("coinDisplay");
const logoutBtn = document.getElementById("logoutBtn");
const usersList = document.getElementById("usersList");
const postsList = document.getElementById("postsList");
const updatesList = document.getElementById("updatesList");
const leaderboardList = document.getElementById("leaderboardList");
const activityList = document.getElementById("activityList");
const plinkoCanvas = document.getElementById("plinkoCanvas");
const ctx = plinkoCanvas.getContext("2d");

// ================= OWNER =================
const OWNER_EMAIL = "d29510713@gmail.com";

// ================= LOGIN / REGISTER =================
document.getElementById("loginBtn").onclick = async () => {
  const email = document.getElementById("logEmail").value;
  const pass = document.getElementById("logPass").value;
  try {
    const cred = await auth.signInWithEmailAndPassword(email, pass);
    currentUser = cred.user;
    loadUserData();
  } catch (e) { alert(e.message); }
};

document.getElementById("registerBtn").onclick = async () => {
  const email = document.getElementById("regEmail").value;
  const pass = document.getElementById("regPass").value;
  const username = document.getElementById("regUsername").value;
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    currentUser = cred.user;
    await db.collection("users").doc(currentUser.uid).set({
      email, username, coins: 0, role: "user", createdAt: Date.now()
    });
    loadUserData();
  } catch (e) { alert(e.message); }
};

document.getElementById("toggleToRegister").onclick = () => {
  loginBox.classList.add("hidden");
  registerBox.classList.remove("hidden");
};
document.getElementById("toggleToLogin").onclick = () => {
  registerBox.classList.add("hidden");
  loginBox.classList.remove("hidden");
};

// ================= LOGOUT =================
logoutBtn.onclick = async () => {
  await auth.signOut();
  currentUser = null;
  forum.classList.add("hidden");
  loginBox.classList.remove("hidden");
};

// ================= LOAD USER DATA =================
async function loadUserData() {
  const doc = await db.collection("users").doc(currentUser.uid).get();
  const data = doc.data();
  currentUsername = data.username;
  isOwner = data.email === OWNER_EMAIL;
  isModerator = data.role === "mod";
  coinDisplay.innerText = `🪙 ${data.coins || 0} Coins`;
  forum.classList.remove("hidden");
  loginBox.classList.add("hidden");
  registerBox.classList.add("hidden");

  loadUsers();
  loadPosts();
  loadUpdates();
  loadLeaderboard();
}

// ================= USERS =================
async function loadUsers() {
  usersList.innerHTML = "";
  const snap = await db.collection("users").orderBy("createdAt","asc").get();
  snap.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.classList.add("user-item");
    div.innerHTML = `<strong>${data.username}</strong> ${data.role ? `(${data.role})` : ''} <span>🪙 ${data.coins || 0}</span>`;
    if(isOwner) {
      const modBtn = document.createElement("button");
      modBtn.innerText = data.role==="mod"?"Remove Mod":"Make Mod";
      modBtn.onclick = async () => {
        await db.collection("users").doc(doc.id).update({role: data.role==="mod"?"user":"mod"});
        loadUsers();
      };
      div.appendChild(modBtn);
    }
    usersList.appendChild(div);
  });
}

// ================= POSTS =================
document.getElementById("postBtn").onclick = async () => {
  const content = document.getElementById("postContent").value;
  const category = document.getElementById("postCategory").value;
  const fileInput = document.getElementById("postImage");
  let imageUrl = "";
  if(fileInput.files[0]){
    const ref = storage.ref().child(`posts/${Date.now()}-${fileInput.files[0].name}`);
    await ref.put(fileInput.files[0]);
    imageUrl = await ref.getDownloadURL();
  }
  await db.collection("posts").add({uid: currentUser.uid, username: currentUsername, content, category, imageUrl, timestamp: Date.now()});
  document.getElementById("postContent").value = "";
  document.getElementById("postImage").value = "";
  loadPosts();
  loadLeaderboard();
};

async function loadPosts(){
  postsList.innerHTML = "";
  const snap = await db.collection("posts").orderBy("timestamp","desc").get();
  snap.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.classList.add("post");
    div.innerHTML = `<div class="post-header"><strong>${data.username}</strong><span>${new Date(data.timestamp).toLocaleString()}</span></div>
                     <div class="post-content">${data.content}</div>
                     ${data.imageUrl ? `<img src="${data.imageUrl}" class="post-image">` : ""}`;
    postsList.appendChild(div);
  });
}

// ================= UPDATES =================
async function loadUpdates(){
  updatesList.innerHTML = "";
  const snap = await db.collection("updates").orderBy("timestamp","desc").get();
  snap.forEach(doc=>{
    const data = doc.data();
    const div = document.createElement("div");
    div.classList.add("update-item");
    div.innerHTML = `<h3>${data.title}</h3><div>${data.content}</div>`;
    updatesList.appendChild(div);
  });
}

// ================= LEADERBOARD =================
async function loadLeaderboard(){
  leaderboardList.innerHTML = ""; activityList.innerHTML = "";
  const snap = await db.collection("users").orderBy("coins","desc").get();
  let rank = 1;
  snap.forEach(doc=>{
    const data = doc.data();
    const div = document.createElement("div");
    div.classList.add("user-item");
    div.innerHTML = `<strong>#${rank} ${data.username}</strong> 🪙 ${data.coins || 0}`;
    leaderboardList.appendChild(div);
    rank++;
  });

  // Activity leaderboard
  const postsSnap = await db.collection("posts").get();
  const counts = {};
  postsSnap.forEach(doc=>{ counts[doc.data().uid] = (counts[doc.data().uid]||0)+1; });
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  for(let i=0;i<sorted.length;i++){
    const userSnap = await db.collection("users").doc(sorted[i][0]).get();
    const user = userSnap.data();
    const div = document.createElement("div");
    div.classList.add("user-item");
    div.innerHTML = `<strong>#${i+1} ${user.username}</strong> Posts: ${sorted[i][1]}`;
    activityList.appendChild(div);
  }
}

// ================= DAILY COINS =================
async function claimDailyCoins(){
  const userRef = db.collection("users").doc(currentUser.uid);
  const doc = await userRef.get();
  const lastClaim = doc.data().lastDaily || 0;
  const now = Date.now();
  if(now-lastClaim<24*60*60*1000) return alert("You can claim once every 24h!");
  const earned = Math.floor(Math.random()*50)+10;
  await userRef.update({coins: firebase.firestore.FieldValue.increment(earned), lastDaily: now});
  alert(`You claimed ${earned} coins!`);
  loadUserData();
}

// ================= PLINKO =================
const plinkoCols = 8, plinkoRows = 10, pegRadius = 5, slotWidth = plinkoCanvas.width/plinkoCols;
let ball = null;

function drawPlinkoBoard(){
  ctx.clearRect(0,0,plinkoCanvas.width,plinkoCanvas.height);
  for(let r=0;r<plinkoRows;r++){
    for(let c=0;c<plinkoCols;c++){
      const x = c*slotWidth+slotWidth/2+(r%2?slotWidth/2:0);
      const y = 50+r*40;
      ctx.beginPath(); ctx.arc(x,y,pegRadius,0,Math.PI*2); ctx.fillStyle="#fff"; ctx.fill();
    }
  }
  for(let c=0;c<=plinkoCols;c++){
    ctx.beginPath(); ctx.moveTo(c*slotWidth,plinkoCanvas.height-50); ctx.lineTo(c*slotWidth,plinkoCanvas.height); ctx.strokeStyle="#fff"; ctx.stroke();
  }
  if(ball){ctx.beginPath(); ctx.arc(ball.x,ball.y,10,0,Math.PI*2); ctx.fillStyle="#ff6b35"; ctx.fill();}
}

function dropBall(){
  if(ball) return;
  ball = {x: plinkoCanvas.width/2, y:0, vx:0};
  const interval = setInterval(async ()=>{
    if(ball.y>=plinkoCanvas.height-60){
      const slot = Math.floor(ball.x/slotWidth);
      const reward = (slot+1)*5;
      await db.collection("users").doc(currentUser.uid).update({coins: firebase.firestore.FieldValue.increment(reward)});
      alert(`Plinko! You won ${reward} coins`);
      ball = null; clearInterval(interval); loadUserData(); loadLeaderboard();
    } else {
      ball.y+=5; ball.x+=Math.random()<0.5?2:-2;
    }
    drawPlinkoBoard();
  },30);
}
plinkoCanvas.onclick = dropBall;
drawPlinkoBoard();

// ================= ANIMATED BACKGROUND =================
const starsEl = document.getElementById("stars");
function createStars(count=200){
  for(let i=0;i<count;i++){
    const star = document.createElement("div");
    star.className = "star";
    star.style.top = Math.random()*100+"%";
    star.style.left = Math.random()*100+"%";
    star.style.width = star.style.height = (Math.random()*2+1)+"px";
    starsEl.appendChild(star);
  }
}
createStars();
