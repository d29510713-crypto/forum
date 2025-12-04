// ================= FULL APP.JS =================
// Core variables
let currentUser = null;
let currentUsername = null;
let userCoins = 0;
let blackjack = null;

// ================= FIREBASE INIT =================
const firebaseConfig = {
  apiKey: "AIzaSyA1FwweYw4MOz5My0aCfbRv-xrduCTl8z0",
  authDomain: "toasty-89f07.firebaseapp.com",
  projectId: "toasty-89f07",
  storageBucket: "toasty-89f07.appspot.com",
  messagingSenderId: "1050558945326",
  appId: "1:1050558945326:web:b17704302990245b5aee0e"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ================= LOGIN / REGISTER =================
const loginBox = document.getElementById("loginBox");
const registerBox = document.getElementById("registerBox");
const forum = document.getElementById("forum");

document.getElementById("toggleToRegister").onclick = () => {
  loginBox.classList.add("hidden");
  registerBox.classList.remove("hidden");
};
document.getElementById("toggleToLogin").onclick = () => {
  registerBox.classList.add("hidden");
  loginBox.classList.remove("hidden");
};

document.getElementById("loginBtn").onclick = async () => {
  const email = document.getElementById("logEmail").value;
  const pass = document.getElementById("logPass").value;
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (e) { alert(e.message); }
};

document.getElementById("registerBtn").onclick = async () => {
  const email = document.getElementById("regEmail").value;
  const pass = document.getElementById("regPass").value;
  const username = document.getElementById("regUsername").value;
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    await db.collection("users").doc(cred.user.uid).set({
      username,
      coins: 50,
      badges: [],
      color: "#fff"
    });
  } catch (e) { alert(e.message); }
};

// ================= AUTH STATE =================
auth.onAuthStateChanged(async user => {
  if (user) {
    currentUser = user;
    const snap = await db.collection("users").doc(user.uid).get();
    currentUsername = snap.data().username;
    userCoins = snap.data().coins;
    document.getElementById("coinDisplay").innerText = `🪙 ${userCoins} Coins`;
    loginBox.classList.add("hidden");
    registerBox.classList.add("hidden");
    forum.classList.remove("hidden");
    loadPosts();
    loadUsers();
    loadUpdates();
    loadDMs();
  } else {
    forum.classList.add("hidden");
    loginBox.classList.remove("hidden");
  }
});

document.getElementById("logoutBtn").onclick = () => auth.signOut();

// ================= TABS =================
const tabs = document.querySelectorAll("#tabs button");
const sections = document.querySelectorAll(".tabSection");

tabs.forEach((btn, i) => {
  btn.onclick = () => {
    sections.forEach(s => s.classList.add("hidden"));
    sections[i].classList.remove("hidden");
  };
});

// ================= POSTS =================
async function loadPosts() {
  const postsList = document.getElementById("postsList");
  postsList.innerHTML = "";
  const snap = await db.collection("posts").orderBy("time", "desc").get();
  snap.forEach(doc => {
    const p = doc.data();
    postsList.innerHTML += `
      <div class="post">
        <h4>${p.username} — <span>${p.category}</span></h4>
        <p>${p.content}</p>
        <button onclick="likePost('${doc.id}')">❤️ ${p.likes || 0}</button>
      </div>
    `;
  });
}

document.getElementById("postBtn").onclick = async () => {
  const content = document.getElementById("postContent").value;
  const category = document.getElementById("postCategory").value;
  if (!content.trim()) return;
  await db.collection("posts").add({
    username: currentUsername,
    content,
    category,
    likes: 0,
    time: Date.now()
  });
  loadPosts();
};

async function likePost(id) {
  const ref = db.collection("posts").doc(id);
  const snap = await ref.get();
  await ref.update({ likes: (snap.data().likes || 0) + 1 });
  loadPosts();
}

// ================= USERS =================
async function loadUsers() {
  const usersList = document.getElementById("usersList");
  usersList.innerHTML = "";
  const snap = await db.collection("users").get();
  snap.forEach(u => {
    const d = u.data();
    usersList.innerHTML += `<div class='user'>${d.username} — Coins: ${d.coins}</div>`;
  });
}

// ================= UPDATES =================
async function loadUpdates() {
  const updatesList = document.getElementById("updatesList");
  updatesList.innerHTML = "";
  const snap = await db.collection("updates").get();
  snap.forEach(d => {
    updatesList.innerHTML += `<div class='update'>${d.data().text}</div>`;
  });
}

// ================= DMS =================
async function loadDMs() {
  const dms = document.getElementById("dmsList");
  dms.innerHTML = "";
  const snap = await db.collection("dms").where("to", "==", currentUsername).get();
  snap.forEach(m => {
    const d = m.data();
    dms.innerHTML += `<div class='dm'><b>${d.from}:</b> ${d.message}</div>`;
  });
}

document.getElementById("dmBtn").onclick = async () => {
  const to = document.getElementById("dmToUsername").value;
  const msg = document.getElementById("dmContent").value;
  if (!to || !msg) return;
  await db.collection("dms").add({ from: currentUsername, to, message: msg, time: Date.now() });
  loadDMs();
};

// ================= COINS =================
document.getElementById("claimDailyCoins").onclick = async () => {
  userCoins += 10;
  await db.collection("users").doc(currentUser.uid).update({ coins: userCoins });
  document.getElementById("coinDisplay").innerText = `🪙 ${userCoins} Coins`;
};

// ================= SIMPLE GAMES =================
function playCoinFlip(choice) {
  const bet = Number(document.getElementById("coinflipBet").value);
  if (!bet || bet < 1 || bet > userCoins) return;
  const result = Math.random() < 0.5 ? "heads" : "tails";
  if (result === choice) userCoins += bet;
  else userCoins -= bet;
  document.getElementById("coinflipResult").innerText = result === "heads" ? "🙂" : "🪙";
  db.collection("users").doc(currentUser.uid).update({ coins: userCoins });
  document.getElementById("coinDisplay").innerText = `🪙 ${userCoins} Coins`;
}

// ================= BLACKJACK =================
function startBlackjack() {
  const bet = Number(document.getElementById("blackjackBet").value);
  if (!bet || bet < 1 || bet > userCoins) return;
  blackjack = {
    bet,
    player: [draw(), draw()],
    dealer: [draw(), draw()],
    over: false
  };
  renderBJ();
}
function draw() { return Math.floor(Math.random()*11)+1; }
function score(hand) { return hand.reduce((a,b)=>a+b,0); }
function renderBJ() {
  const div = document.getElementById("blackjackGame");
  div.innerHTML = `
    <p>Player: ${blackjack.player.join(" ")} (
    ${score(blackjack.player)})</p>
    <p>Dealer: ${blackjack.dealer[0]} ❓</p>
    <button onclick="hitBJ()">Hit</button>
    <button onclick="standBJ()">Stand</button>
  `;
}

function hitBJ() {
  if (blackjack.over) return;
  blackjack.player.push(draw());
  if (score(blackjack.player) > 21) endBJ();
  renderBJ();
}

function standBJ() {
  if (blackjack.over) return;
  while (score(blackjack.dealer) < 17) blackjack.dealer.push(draw());
  endBJ();
}

function endBJ() {
  blackjack.over = true;
  const p = score(blackjack.player);
  const d = score(blackjack.dealer);
  let result = "";

  if (p > 21) {
    userCoins -= blackjack.bet;
    result = "❌ Bust! You lost.";
  } else if (d > 21 || p > d) {
    userCoins += blackjack.bet;
    result = "✅ You win!";
  } else if (p < d) {
    userCoins -= blackjack.bet;
    result = "❌ Dealer wins.";
  } else {
    result = "🤝 Push (tie).";
  }

  db.collection("users").doc(currentUser.uid).update({ coins: userCoins });

  document.getElementById("coinDisplay").innerText = `🪙 ${userCoins} Coins`;

  document.getElementById("blackjackGame").innerHTML = `
    <p>Player: ${blackjack.player.join(" ")} (${p})</p>
    <p>Dealer: ${blackjack.dealer.join(" ")} (${d})</p>
    <h3>${result}</h3>
  `;
}

// ================= WHEEL SPIN =================
function spinWheel() {
  const bet = Number(document.getElementById("wheelBet").value);
  if (!bet || bet < 1 || bet > userCoins) return;

  const mults = [0, 0.5, 1, 2, 3, 5, 10];
  const multiplier = mults[Math.floor(Math.random() * mults.length)];

  const win = Math.floor(bet * multiplier);
  userCoins = userCoins - bet + win;

  db.collection("users").doc(currentUser.uid).update({ coins: userCoins });

  document.getElementById("wheelResult").innerText = `${multiplier}x`;
  document.getElementById("coinDisplay").innerText = `🪙 ${userCoins} Coins`;
}

// ================= SLOTS =================
function playSlots() {
  const bet = Number(document.getElementById("slotsBet").value);
  if (!bet || bet < 1 || bet > userCoins) return;

  const symbols = ["🍒","🍋","🍊","⭐","💎"]; 
  const r = [
    symbols[Math.floor(Math.random()*symbols.length)],
    symbols[Math.floor(Math.random()*symbols.length)],
    symbols[Math.floor(Math.random()*symbols.length)]
  ];

  document.getElementById("slotsResult").innerText = r.join(" ");

  if (r[0] === r[1] && r[1] === r[2]) {
    let mult = r[0] === "💎" ? 10 : 5;
    userCoins += bet * mult;
  } else {
    userCoins -= bet;
  }

  db.collection("users").doc(currentUser.uid).update({ coins: userCoins });
  document.getElementById("coinDisplay").innerText = `🪙 ${userCoins} Coins`;
}

// ================= SCRATCH CARD =================
function playScratch() {
  const bet = Number(document.getElementById("scratchBet").value);
  if (!bet || bet < 1 || bet > userCoins) return;

  const symbols = ["⭐","💎","7️⃣"];
  const card = [
    symbols[Math.floor(Math.random()*symbols.length)],
    symbols[Math.floor(Math.random()*symbols.length)],
    symbols[Math.floor(Math.random()*symbols.length)]
  ];

  document.getElementById("scratchResult").innerText = card.join(" ");

  if (card[0] === card[1] && card[1] === card[2]) {
    userCoins += bet * 8;
  } else userCoins -= bet;

  db.collection("users").doc(currentUser.uid).update({ coins: userCoins });
  document.getElementById("coinDisplay").innerText = `🪙 ${userCoins} Coins`;
}

// ================= MINES =================
let mines = null;

function startMines() {
  const bet = Number(document.getElementById("minesBet").value);
  if (!bet || bet < 1 || bet > userCoins) return;

  mines = {
    bet,
    grid: Array(16).fill(null),
    mine: Math.floor(Math.random()*16),
    revealed: 0,
    over: false
  };

  renderMines();
}

function renderMines() {
  const g = document.getElementById("minesGrid");
  g.innerHTML = "";

  mines.grid.forEach((v,i) => {
    g.innerHTML += `<button onclick="clickMine(${i})" style="padding:20px; font-size:20px;">${v ? v : ""}</button>`;
  });
}

function clickMine(i) {
  if (mines.over) return;

  if (i === mines.mine) {
    mines.grid[i] = "💣";
    mines.over = true;
    userCoins -= mines.bet;
    document.getElementById("minesResult").innerText = "💥 You hit a mine!";
  } else {
    mines.grid[i] = "💎";
    mines.revealed++;
    let win = Math.floor(mines.bet * (1 + mines.revealed * 0.5));
    userCoins = userCoins - mines.bet + win;
    mines.bet = win;
    document.getElementById("minesResult").innerText = `✨ Current Cashout: ${win}`;
  }

  db.collection("users").doc(currentUser.uid).update({ coins: userCoins });
  document.getElementById("coinDisplay").innerText = `🪙 ${userCoins} Coins`;
  renderMines();
}

// ================= CRASH =================
let crash = null;
let crashInterval = null;

function startCrash() {
  const bet = Number(document.getElementById("crashBet").value);
  if (!bet || bet < 1 || bet > userCoins) return;

  crash = { bet, mult: 1, crashed: false };

  document.getElementById("crashCashout").style.display = "block";

  crashInterval = setInterval(() => {
    if (Math.random() < 0.05) {
      crash.crashed = true;
      clearInterval(crashInterval);
      document.getElementById("crashMultiplier").innerText = "💥 CRASH";
      userCoins -= crash.bet;
      db.collection("users").doc(currentUser.uid).update({ coins: userCoins });
      document.getElementById("coinDisplay").innerText = `🪙 ${userCoins} Coins`;
      return;
    }

    crash.mult = (crash.mult + 0.05).toFixed(2);
    document.getElementById("crashMultiplier").innerText = crash.mult + "x";
  }, 200);
}

function cashoutCrash() {
  if (!crash || crash.crashed) return;

  clearInterval(crashInterval);

  const win = Math.floor(crash.bet * crash.mult);
  userCoins = userCoins - crash.bet + win;

  db.collection("users").doc(currentUser.uid).update({ coins: userCoins });

  document.getElementById("coinDisplay").innerText = `🪙 ${userCoins} Coins`;
  document.getElementById("crashMultiplier").innerText = `💰 ${win} Won`;
  crash = null;
}

// ================= SHOP =================
function buyItem(item, cost) {
  if (userCoins < cost) return alert("Not enough coins!");

  userCoins -= cost;
  db.collection("users").doc(currentUser.uid).update({ coins: userCoins });

  document.getElementById("coinDisplay").innerText = `🪙 ${userCoins} Coins`;

  alert("Purchased " + item + "!");
}

function giftCoins() {
  const to = document.getElementById("giftUsername").value;
  const amt = Number(document.getElementById("giftAmount").value);
  if (!to || !amt || amt < 1 || amt > userCoins) return;

  db.collection("users").where("username","==",to).get().then(snap => {
    if (snap.empty) return alert("User not found.");

    const uid = snap.docs[0].id;
    const userData = snap.docs[0].data();

    db.collection("users").doc(uid).update({ coins: userData.coins + amt });
    userCoins -= amt;
    db.collection("users").doc(currentUser.uid).update({ coins: userCoins });

    document.getElementById("coinDisplay").innerText = `🪙 ${userCoins} Coins`;
    alert("Gift sent!");
  });
}

// ================= MODERATION SYSTEM =================

window.makeModerator = async function(uid) {
  await db.collection("users").doc(uid).update({ role: "moderator" });
  alert("User promoted to Moderator.");
  loadUsers();
};

window.removeModerator = async function(uid) {
  await db.collection("users").doc(uid).update({ role: "user" });
  alert("Moderator removed.");
  loadUsers();
};

window.banUser = async function(uid) {
  await db.collection("users").doc(uid).update({ banned: true });
  alert("User has been banned.");
  loadUsers();
};

window.unbanUser = async function(uid) {
  await db.collection("users").doc(uid).update({ banned: false });
  alert("User has been unbanned.");
  loadUsers();
};

// ================= DMS SYSTEM =================

window.sendDM = async function(toUID, message) {
  if (!currentUser) return alert("Not logged in.");

  await db.collection("dms").add({
    from: currentUser.uid,
    to: toUID,
    message,
    timestamp: Date.now()
  });

  alert("DM sent.");
};

window.loadDMs = function() {
  if (!currentUser) return;

  db.collection("dms")
    .where("to", "==", currentUser.uid)
    .orderBy("timestamp", "desc")
    .onSnapshot(snapshot => {
      const box = document.getElementById("dmInbox");
      if (!box) return;

      box.innerHTML = "";

      snapshot.forEach(doc => {
        const dm = doc.data();
        box.innerHTML += `
          <div class="dm-item">
            <strong>From:</strong> ${dm.from}<br>
            ${dm.message}
          </div>
        `;
      });
    });
};

// ================= GAME: SLOTS =================

window.playSlots = async function(bet) {
  const ref = db.collection("users").doc(currentUser.uid);
  const doc = await ref.get();
  let coins = doc.data().coins || 0;
  if (coins < bet) return alert("Not enough coins.");

  coins -= bet;

  const r1 = Math.floor(Math.random() * 5);
  const r2 = Math.floor(Math.random() * 5);
  const r3 = Math.floor(Math.random() * 5);

  let win = 0;
  if (r1 === r2 && r2 === r3) win = bet * 5;
  else if (r1 === r2 || r2 === r3 || r1 === r3) win = bet * 2;

  coins += win;
  await ref.update({ coins });
  loadCoins();

  document.getElementById("slotsGame").innerHTML = `
    <div>${r1} | ${r2} | ${r3}</div>
    <div>${win > 0 ? `You won ${win} coins!` : "You lost!"}</div>
  `;
};

// ================= GAME: DICE =================

window.rollDice = async function(bet) {
  const ref = db.collection("users").doc(currentUser.uid);
  const doc = await ref.get();
  let coins = doc.data().coins || 0;
  if (coins < bet) return alert("Not enough coins.");

  coins -= bet;

  const player = Math.floor(Math.random() * 6) + 1;
  const dealer = Math.floor(Math.random() * 6) + 1;

  let result = "";

  if (player > dealer) {
    coins += bet * 2;
    result = `You win! +${bet}`;
  } else if (player === dealer) {
    coins += bet;
    result = "Tie! Bet returned.";
  } else {
    result = `You lost ${bet}`;
  }

  await ref.update({ coins });
  loadCoins();

  document.getElementById("diceGame").innerHTML = `
    <div>You: ${player}</div>
    <div>Dealer: ${dealer}</div>
    <div>${result}</div>
  `;
};

// ================= GAME: PLINKO =================

window.playPlinko = async function(bet) {
  const ref = db.collection("users").doc(currentUser.uid);
  const doc = await ref.get();
  let coins = doc.data().coins || 0;
  if (coins < bet) return alert("Not enough coins.");

  coins -= bet;

  const slots = [0, 2, 5, 10, 5, 2, 0];
  const resultIdx = Math.floor(Math.random() * slots.length);
  const multiplier = slots[resultIdx];
  const payout = bet * multiplier;

  coins += payout;
  await ref.update({ coins });
  loadCoins();

  document.getElementById("plinkoGame").innerHTML = `
    <div>Ball landed in slot x${multiplier}</div>
    <div>${payout > 0 ? `You won ${payout}!` : "No win."}</div>
  `;
};

// ================= UPDATE SYSTEM =================

window.postUpdate = async function(text) {
  if (!currentUser) return alert("Not logged in.");

  await db.collection("updates").add({
    user: currentUser.uid,
    text,
    time: Date.now()
  });

  loadUpdates();
};

window.loadUpdates = function() {
  const box = document.getElementById("updatesBox");
  if (!box) return;

  db.collection("updates")
    .orderBy("time", "desc")
    .onSnapshot(snapshot => {
      box.innerHTML = "";
      snapshot.forEach(doc => {
        const u = doc.data();
        box.innerHTML += `
          <div class="update-item">
            <strong>${u.user}</strong><br>
            ${u.text}
          </div>
        `;
      });
    });
};

// ================= END OF FULL SYSTEM =================


// ================= REALTIME ONLINE USERS =================

window.trackOnline = function() {
  if (!currentUser) return;

  const ref = db.collection("online").doc(currentUser.uid);
  ref.set({ lastActive: Date.now() });

  setInterval(() => {
    ref.update({ lastActive: Date.now() });
  }, 30000);
};

window.loadOnlineUsers = function() {
  const box = document.getElementById("onlineUsers");
  if (!box) return;

  db.collection("online").onSnapshot(snapshot => {
    box.innerHTML = "";

    snapshot.forEach(doc => {
      const u = doc.data();
      if (Date.now() - u.lastActive < 60000) {
        box.innerHTML += `<div class="online-user">${doc.id}</div>`;
      }
    });
  });
};

// ================= FRIEND SYSTEM =================

window.sendFriendRequest = async function(uid) {
  await db.collection("friend_requests").add({
    from: currentUser.uid,
    to: uid,
    time: Date.now()
  });
  alert("Friend request sent.");
};

window.acceptFriend = async function(reqID, fromUID) {
  await db.collection("friends").add({
    users: [currentUser.uid, fromUID]
  });
  await db.collection("friend_requests").doc(reqID).delete();
};

window.loadFriendRequests = function() {
  const box = document.getElementById("friendRequests");
  if (!box) return;

  db.collection("friend_requests")
    .where("to", "==", currentUser.uid)
    .onSnapshot(snapshot => {
      box.innerHTML = "";
      snapshot.forEach(doc => {
        const r = doc.data();
        box.innerHTML += `
          <div class="request">
            From: ${r.from}
            <button onclick="acceptFriend('${doc.id}', '${r.from}')">Accept</button>
          </div>
        `;
      });
    });
};

// ================= LEADERBOARDS =================

window.loadLeaderboard = function() {
  const box = document.getElementById("leaderboard");
  if (!box) return;

  db.collection("users")
    .orderBy("coins", "desc")
    .limit(20)
    .onSnapshot(snapshot => {
      box.innerHTML = "";
      snapshot.forEach(doc => {
        const u = doc.data();
        box.innerHTML += `
          <div class="leader-item">
            ${u.username || doc.id}: ${u.coins} coins
          </div>`;
      });
    });
};

// ================= SETTINGS =================

window.updateProfile = async function(username, bio) {
  if (!currentUser) return;

  await db.collection("users").doc(currentUser.uid).update({ username, bio });
  alert("Profile updated!");
};

// ================= LOGOUT =================

window.logout = function() {
  auth.signOut().then(() => {
    currentUser = null;
    window.location.reload();
  });
};

// ================= FINAL END =================


// ================= SOUND EFFECTS =================
const sfx = {
  click: new Audio('sfx/click.mp3'),
  win: new Audio('sfx/win.mp3'),
  lose: new Audio('sfx/lose.mp3'),
  coin: new Audio('sfx/coin.mp3'),
  popup: new Audio('sfx/popup.mp3')
};

document.body.addEventListener("click", ()=> sfx.click.play().catch(()=>{}));

function playSFX(name){
  if(sfx[name]) sfx[name].play().catch(()=>{});
}

// ================= ANIMATIONS =================

function animatePop(el){
  el.style.transform = "scale(1.15)";
  setTimeout(()=> el.style.transform = "scale(1)", 150);
}

function flashGold(el){
  el.style.boxShadow = "0 0 15px gold";
  setTimeout(()=> el.style.boxShadow = "none", 300);
}

// Add animation to coin update
function updateCoinDisplay(amount){
  const cd = document.getElementById("coinDisplay");
  cd.innerText = `🪙 ${amount} Coins`;
  animatePop(cd);
  playSFX("coin");
}

// ================= ACHIEVEMENTS =================

const achievementList = {
  firstLogin: "Logged in for the first time!",
  firstPost: "Created your first post!",
  rich100: "Earned 100+ coins!",
  gambler200: "Won 200 coins from games!",
  chatter: "Sent 10 DMs!",
  highRoller: "Bet 100 coins in a single game!",
  eggHunter: "Found the secret easter egg!"
};

async function unlockAchievement(key){
  if(!currentUser) return;

  const ref = db.collection("users").doc(currentUser.uid);
  const snap = await ref.get();
  const data = snap.data();

  if(data.achievements && data.achievements.includes(key)) return;

  await ref.update({
    achievements: firebase.firestore.FieldValue.arrayUnion(key)
  });

  showAchievementPopup(achievementList[key]);
}

function showAchievementPopup(text){
  playSFX("popup");

  const box = document.createElement("div");
  box.className = "achievementPopup";
  box.innerHTML = `🏆 ${text}`;
  document.body.appendChild(box);

  setTimeout(()=> box.style.opacity = 1, 50);
  setTimeout(()=> box.style.opacity = 0, 3000);
  setTimeout(()=> box.remove(), 3500);
}

// Trigger achievements automatically
auth.onAuthStateChanged(user => {
  if(user) unlockAchievement("firstLogin");
});

window.postMessageAchievement = function(){ unlockAchievement("firstPost"); };
window.gain100CoinsAchievement = function(){ unlockAchievement("rich100"); };
window.bigBetAchievement = function(){ unlockAchievement("highRoller"); };
window.dmAchievement = function(){ unlockAchievement("chatter"); };

// ================= EASTER EGGS =================

// Secret console command
typeSecret = "";
document.addEventListener("keydown", e => {
  typeSecret += e.key.toLowerCase();
  if(typeSecret.includes("spaceisawesome")){
    unlockAchievement("eggHunter");
    alert("🚀 You found a secret easter egg!");
    typeSecret = "";
  }
});

// Hidden clickable star
const starsDiv = document.getElementById("stars");
starsDiv.addEventListener("click", ()=>{
  if(Math.random() < 0.02){
    unlockAchievement("eggHunter");
    alert("⭐ You clicked the magical star!");
  }
});

// ================= END EXTENSIONS =================

