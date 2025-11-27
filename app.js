let users = JSON.parse(localStorage.getItem("users") || "{}");
let banned = JSON.parse(localStorage.getItem("banned") || "[]");
let posts = JSON.parse(localStorage.getItem("posts") || "[]");
let currentUser = localStorage.getItem("currentUser") || null;

// Words blocked 100% (slurs, bypassing, symbols, anything)
const CENSORED = [
    "fuck","shit","bitch","asshole","cunt",
    "nigg","fag","kys","k y s","k.y.s","k y.s",
    "retard","retarded"
];

function censor(text) {
    let t = text.toLowerCase();
    for (let w of CENSORED) {
        if (t.includes(w)) return "*** CENSORED ***";
    }
    return text;
}

function saveAll() {
    localStorage.setItem("users", JSON.stringify(users));
    localStorage.setItem("banned", JSON.stringify(banned));
    localStorage.setItem("posts", JSON.stringify(posts));
}

function showLogin() {
    document.getElementById("loginBox").style.display = "block";
    document.getElementById("registerBox").style.display = "none";
}

function showRegister() {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("registerBox").style.display = "block";
}

function register() {
    let u = regUser.value;
    let p = regPass.value;

    if (!u || !p) return alert("Missing info");
    if (users[u]) return alert("Username taken");
    if (CENSORED.some(w => u.toLowerCase().includes(w))) return alert("Username not allowed");

    users[u] = { pass: p, role: Object.keys(users).length === 0 ? "owner" : "user", lastChange: 0 };
    saveAll();
    alert("Registered!");
    showLogin();
}

function login() {
    let u = loginUser.value;
    let p = loginPass.value;

    if (!users[u]) return alert("No user");
    if (users[u].pass !== p) return alert("Wrong password");
    if (banned.includes(u)) return alert("You are banned");

    currentUser = u;
    localStorage.setItem("currentUser", u);

    document.getElementById("authSection").style.display = "none";
    document.getElementById("forumBox").style.display = "block";

    if (users[u].role === "owner" || users[u].role === "admin") {
        document.getElementById("adminBox").style.display = "block";
    }

    renderPosts();
}

function postMessage() {
    if (!currentUser) return;

    let t = postText.value.trim();
    if (!t) return;

    t = censor(t);

    posts.push({ user: currentUser, text: t, time: Date.now() });
    postText.value = "";
    saveAll();
    renderPosts();
}

function renderPosts() {
    postsArea.innerHTML = "";
    posts.forEach(p => {
        let div = document.createElement("div");
        div.className = "post";
        div.innerHTML = `<b>${p.user}</b><br>${p.text}`;
        postsArea.appendChild(div);
    });
}

function banPerson() {
    if (!currentUser) return;
    if (users[currentUser].role !== "owner" && users[currentUser].role !== "admin") return;

    let u = banUser.value;
    if (!users[u]) return alert("No user found");
    if (u === "owner") return alert("Cannot ban owner");

    banned.push(u);
    posts = posts.filter(p => p.user !== u);

    saveAll();
    renderPosts();
    alert("User banned & posts removed");
}

function changeUsername() {
    if (!currentUser) return;

    let now = Date.now();
    let last = users[currentUser].lastChange;

    if (now - last < 7 * 24 * 60 * 60 * 1000) {
        return alert("You can only change username every 7 days");
    }

    let newName = newUserName.value.trim();
    if (!newName) return alert("Enter a name");
    if (users[newName]) return alert("Name taken");
    if (CENSORED.some(w => newName.toLowerCase().includes(w))) return alert("Invalid name");

    users[newName] = users[currentUser];
    delete users[currentUser];

    posts.forEach(p => { if (p.user === currentUser) p.user = newName; });

    banned = banned.map(b => b === currentUser ? newName : b);

    currentUser = newName;
    localStorage.setItem("currentUser", newName);

    users[newName].lastChange = now;

    saveAll();
    renderPosts();
    alert("Username changed!");
}
