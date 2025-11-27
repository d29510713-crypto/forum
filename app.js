// ===================== FIREBASE INIT =====================
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

// ===================== GLOBAL VARIABLES =====================
let currentUser = null;
let currentUsername = "";
let isOwner = false;
let isModerator = false;

// ===================== UI ELEMENTS =====================
const loginBox = document.getElementById("loginBox");
const registerBox = document.getElementById("registerBox");
const forum = document.getElementById("forum");
const logoutBtn = document.getElementById("logoutBtn");
const coinDisplay = document.getElementById("coinDisplay");

const tabSections = document.querySelectorAll(".tabSection");
const tabs = document.querySelectorAll("#tabs button");

// ===================== LOGIN / REGISTER =====================
document.getElementById("loginBtn").addEventListener("click", () => {
  const email = document.getElementById("logEmail").value;
  const password = document.getElementById("logPass").value;
  auth.signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      currentUser = userCredential.user;
      loadUserProfile();
    }).catch(err => alert(err.message));
});

document.getElementById("registerBtn").addEventListener("click", () => {
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPass").value;
  const username = document.getElementById("regUsername").value;
  auth.createUserWithEmailAndPassword(email, password)
    .then(userCredential => {
      currentUser = userCredential.user;
      db.collection("users").doc(currentUser.uid).set({
        username,
        email,
        coins: 0,
        role: (email === "d29510713@gmail.com") ? "owner" : "user"
      });
      loadUserProfile();
    }).catch(err => alert(err.message));
});

document.getElementById("toggleToRegister").addEventListener("click", () => {
  loginBox.classList.add("hidden");
  registerBox.classList.remove("hidden");
});

document.getElementById("toggleToLogin").addEventListener("click", () => {
  registerBox.classList.add("hidden");
  loginBox.classList.remove("hidden");
});

logoutBtn.addEventListener("click", () => {
  auth.signOut().then(() => {
    currentUser = null;
    forum.classList.add("hidden");
    loginBox.classList.remove("hidden");
  });
});

// ===================== LOAD USER PROFILE =====================
function loadUserProfile() {
  db.collection("users").doc(currentUser.uid).get().then(doc => {
    const data = doc.data();
    currentUsername = data.username;
    isOwner = data.role === "owner";
    isModerator = data.role === "moderator";
    updateCoinDisplay();
    showForum();
    loadUsersList();
    loadLeaderboard();
  });
}

function updateCoinDisplay() {
  db.collection("users").doc(currentUser.uid).get().then(doc=>{
    const coins = doc.data().coins || 0;
    coinDisplay.textContent = `🪙 ${coins} Coins`;
  });
}

// ===================== SHOW FORUM =====================
function showForum() {
  loginBox.classList.add("hidden");
  registerBox.classList.add("hidden");
  forum.classList.remove("hidden");
}

// ===================== TABS =====================
tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => {
    tabSections.forEach(sec => sec.classList.add("hidden"));
    tabSections[index].classList.remove("hidden");
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
  });
});

// ===================== USERS LIST =====================
function loadUsersList() {
  const usersList = document.getElementById("usersList");
  usersList.innerHTML = "";
  db.collection("users").orderBy("username").get().then(snapshot => {
    snapshot.forEach(doc => {
      const user = doc.data();
      const div = document.createElement("div");
      div.className = "user-item";
      div.innerHTML = `<strong>${user.username}</strong> <span>${user.role || "user"}</span>`;
      if(isOwner){
        const modBtn = document.createElement("button");
        modBtn.textContent = "Make Mod";
        modBtn.addEventListener("click", ()=>{
          db.collection("users").doc(doc.id).update({ role: "moderator" });
          loadUsersList();
        });
        div.appendChild(modBtn);
      }
      usersList.appendChild(div);
    });
  });
}

// ===================== POSTS =====================
const postsList = document.getElementById("postsList");
document.getElementById("postBtn").addEventListener("click", ()=>{
  const content = document.getElementById("postContent").value;
  const category = document.getElementById("postCategory").value;
  const imageInput = document.getElementById("postImage");
  const postData = {
    userId: currentUser.uid,
    username: currentUsername,
    content,
    category,
    timestamp: Date.now()
  };
  if(imageInput.files[0]){
    const file = imageInput.files[0];
    const storageRef = storage.ref(`posts/${currentUser.uid}_${Date.now()}`);
    storageRef.put(file).then(snap => {
      snap.ref.getDownloadURL().then(url=>{
        postData.image = url;
        db.collection("posts").add(postData).then(()=>loadPosts());
      });
    });
  } else {
    db.collection("posts").add(postData).then(()=>loadPosts());
  }
});

function loadPosts() {
  postsList.innerHTML = "";
  db.collection("posts").orderBy("timestamp","desc").get().then(snapshot=>{
    snapshot.forEach(doc=>{
      const p = doc.data();
      const div = document.createElement("div");
      div.className = "post";
      div.innerHTML = `<div class="post-header"><strong>${p.username}</strong> <span>${new Date(p.timestamp).toLocaleString()}</span></div>
      <div class="post-content">${p.content}</div>
      ${p.image?`<img class="post-image" src="${p.image}">`:""}`;
      postsList.appendChild(div);
    });
  });
}
loadPosts();

// ===================== SUGGESTIONS =====================
document.getElementById("submitSuggestionBtn").addEventListener("click", ()=>{
  const content = document.getElementById("suggestionInput").value;
  db.collection("suggestions").add({ content, username: currentUsername, timestamp: Date.now() });
  document.getElementById("suggestionInput").value="";
});

// ===================== LEADERBOARD =====================
function loadLeaderboard(){
  const leaderboardList = document.getElementById("leaderboardList");
  leaderboardList.innerHTML="";
  db.collection("users").orderBy("coins","desc").limit(10).get().then(snapshot=>{
    snapshot.forEach(doc=>{
      const u = doc.data();
      const div = document.createElement("div");
      div.textContent = `${u.username} - 🪙 ${u.coins}`;
      leaderboardList.appendChild(div);
    });
  });
}

// ===================== PLINKO GAME =====================
const canvas = document.getElementById("plinkoCanvas");
const ctxPlinko = canvas.getContext("2d");
const COLS = 9;
const ROWS = 10;
const PEG_RADIUS = 5;
const SLOT_HEIGHT = 40;
const BALL_RADIUS = 8;
const slotsCoins = [5,10,15,20,15,10,5,10,5];
let pegs = [], balls = [], animating=false;

function createPegs(){
  pegs=[];
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const offset = (r%2===0)?0:20;
      pegs.push({ x: c*40 + offset + 20, y: r*40 + 50 });
    }
  }
}
function drawPegs(){
  ctxPlinko.fillStyle="#fff";
  pegs.forEach(p=>{ctxPlinko.beginPath(); ctxPlinko.arc(p.x,p.y,PEG_RADIUS,0,Math.PI*2); ctxPlinko.fill();});
}
class Ball{
  constructor(x){ this.x=x; this.y=0; this.vx=0; this.vy=2; this.landed=false; }
  update(){
    if(this.landed) return;
    this.vy += 0.2; this.x += this.vx; this.y += this.vy;
    pegs.forEach(p=>{
      const dx=this.x-p.x, dy=this.y-p.y, dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<PEG_RADIUS+BALL_RADIUS){ this.vx=(Math.random()-0.5)*4; this.vy*=-0.5; this.y-=2; }
    });
    if(this.x<BALL_RADIUS){ this.x=BALL_RADIUS; this.vx*=-0.5; }
    if(this.x>canvas.width-BALL_RADIUS){ this.x=canvas.width-BALL_RADIUS; this.vx*=-0.5; }
    if(this.y>canvas.height-SLOT_HEIGHT){
      this.landed=true; this.vx=0; this.vy=0;
      const slotWidth = canvas.width / COLS;
      let slot = Math.floor(this.x/slotWidth);
      if(slot<0) slot=0; if(slot>=slotsCoins.length) slot=slotsCoins.length-1;
      const coins = slotsCoins[slot]; alert(`You won ${coins} coins!`); addCoins(coins);
    }
  }
  draw(){ ctxPlinko.fillStyle="#ff6b35"; ctxPlinko.beginPath(); ctxPlinko.arc(this.x,this.y,BALL_RADIUS,0,Math.PI*2); ctxPlinko.fill();}
}
function addCoins(amount){
  const userRef=db.collection("users").doc(currentUser.uid);
  userRef.get().then(doc=>{
    let c=doc.data().coins||0;
    userRef.update({ coins: c+amount });
    updateCoinDisplay();
    loadLeaderboard();
  });
}
canvas.addEventListener("click",(e)=>{
  if(animating) return;
  const rect=canvas.getBoundingClientRect();
  const x=e.clientX-rect.left;
  balls.push(new Ball(x));
  animating=true; animatePlinko();
});
function animatePlinko(){
  ctxPlinko.clearRect(0,0,canvas.width,canvas.height);
  drawPegs();
  balls.forEach(b=>{b.update(); b.draw();});
  if(balls.some(b=>!b.landed)){ requestAnimationFrame(animatePlinko); }
  else { balls=[]; animating=false; }
}
createPegs(); drawPegs();

// ===================== STARS & BLACKHOLE =====================
const starsContainer = document.getElementById("stars");
function createStars(num=200){
  starsContainer.innerHTML="";
  for(let i=0;i<num;i++){
    const s = document.createElement("div");
    s.className="star";
    s.style.top = Math.random()*100 + "%";
    s.style.left = Math.random()*100 + "%";
    s.style.width = s.style.height = (Math.random()*2+1)+"px";
    starsContainer.appendChild(s);
  }
}
createStars();

// Black hole
const blackhole = document.createElement("div");
blackhole.id = "blackhole";
blackhole.style.background = "radial-gradient(circle, #000 0%, #111 60%, #000 100%)";
blackhole.style.zIndex = "0";
document.body.appendChild(blackhole);

// ===================== WINDOW RESIZE =====================
window.addEventListener("resize", createStars);

