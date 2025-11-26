<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Toasty Forum</title>
  <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
  <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js"></script>
  <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js"></script>
  <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-storage.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #0a0a0a, #1a0033, #0a0a0a);
      color: #fff;
      min-height: 100vh;
      overflow-x: hidden;
      position: relative;
    }
    #stars {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
    }
    .star {
      position: absolute;
      background: white;
      border-radius: 50%;
      animation: twinkle 3s infinite;
    }
    @keyframes twinkle {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 1; }
    }
    #box, #forum {
      position: relative;
      z-index: 1;
      max-width: 500px;
      margin: 50px auto;
      padding: 30px;
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid rgba(138, 43, 226, 0.5);
      border-radius: 15px;
      box-shadow: 0 0 30px rgba(138, 43, 226, 0.3);
    }
    #forum {
      max-width: 1200px;
    }
    h1, h2 {
      text-align: center;
      color: #8a2be2;
      text-shadow: 0 0 20px rgba(138, 43, 226, 0.8);
      margin-bottom: 20px;
    }
    input, textarea, select, button {
      width: 100%;
      padding: 12px;
      margin: 8px 0;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(138, 43, 226, 0.5);
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
      transition: all 0.3s ease;
    }
    input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: #8a2be2;
      box-shadow: 0 0 15px rgba(138, 43, 226, 0.5);
    }
    button {
      background: linear-gradient(135deg, #8a2be2, #4b0082);
      cursor: pointer;
      font-weight: bold;
      border: none;
    }
    button:hover {
      background: linear-gradient(135deg, #9d4edd, #5a0099);
      box-shadow: 0 0 20px rgba(138, 43, 226, 0.6);
      transform: translateY(-2px);
    }
    .hidden { display: none !important; }
    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .tabs button {
      flex: 1;
      min-width: 100px;
      padding: 10px;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(138, 43, 226, 0.3);
    }
    .tabs button.active {
      background: linear-gradient(135deg, #8a2be2, #4b0082);
      border-color: #8a2be2;
    }
    .post, .user-item {
      background: rgba(0, 0, 0, 0.6);
      border: 2px solid rgba(138, 43, 226, 0.4);
      border-radius: 10px;
      padding: 15px;
      margin: 15px 0;
      transition: all 0.3s ease;
    }
    .post:hover, .user-item:hover {
      border-color: rgba(138, 43, 226, 0.8);
      box-shadow: 0 0 20px rgba(138, 43, 226, 0.4);
      transform: translateY(-2px);
    }
    .post-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      flex-wrap: wrap;
      gap: 10px;
    }
    .post-time {
      color: #888;
      font-size: 12px;
    }
    .post-content {
      margin: 10px 0;
      line-height: 1.6;
      word-wrap: break-word;
    }
    .post-image {
      max-width: 100%;
      border-radius: 8px;
      margin: 10px 0;
      cursor: pointer;
      transition: transform 0.3s ease;
    }
    .post-image:hover {
      transform: scale(1.02);
    }
    .post-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 10px;
    }
    .post-actions button {
      width: auto;
      padding: 8px 15px;
      font-size: 13px;
      margin: 0;
    }
    .link {
      color: #8a2be2;
      cursor: pointer;
      text-decoration: underline;
    }
    .link:hover {
      color: #9d4edd;
    }
    #ownerControls {
      margin-top: 20px;
      padding: 15px;
      background: rgba(255, 107, 53, 0.1);
      border: 2px solid rgba(255, 107, 53, 0.5);
      border-radius: 10px;
    }
    #ownerControls h3 {
      color: #ff6b35;
      margin-bottom: 10px;
    }
    .search-filter {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr auto;
      gap: 10px;
      margin-bottom: 15px;
    }
    @media (max-width: 768px) {
      .search-filter {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div id="stars"></div>

  <!-- LOGIN/REGISTER -->
  <div id="box">
    <div id="loginBox">
      <h1>🔥 Toasty Forum</h1>
      <input type="email" id="logEmail" placeholder="Email">
      <input type="password" id="logPass" placeholder="Password">
      <button id="loginBtn">Login</button>
      <p style="text-align:center; margin-top:10px;">
        <span class="link" id="forgotPass">Forgot Password?</span>
      </p>
      <p style="text-align:center; margin-top:10px;">
        Don't have an account? <span class="link" id="toggleToRegister">Register</span>
      </p>
    </div>

    <div id="registerBox" class="hidden">
      <h1>🔥 Join Toasty</h1>
      <input type="text" id="regUsername" placeholder="Username">
      <input type="email" id="regEmail" placeholder="Email">
      <input type="password" id="regPass" placeholder="Password (min 6 chars)">
      <button id="registerBtn">Register</button>
      <p style="text-align:center; margin-top:10px;">
        Already have an account? <span class="link" id="toggleToLogin">Login</span>
      </p>
    </div>
  </div>

  <!-- FORUM -->
  <div id="forum" class="hidden">
    <h1>🔥 Toasty Forum</h1>
    <button id="logoutBtn">Logout</button>

    <div class="tabs">
      <button id="tabPosts" class="active">📝 Posts</button>
      <button id="tabUsers">👥 Users</button>
      <button id="tabDMs">💬 DMs</button>
      <button id="tabUpdates">📢 Updates</button>
      <button id="tabSuggestions">💡 Suggestions</button>
      <button id="tabLeaderboard">🏆 Leaderboard</button>
    </div>

    <!-- POSTS -->
    <div id="postsSection">
      <h2>Create Post</h2>
      <textarea id="postContent" placeholder="What's on your mind?" rows="4"></textarea>
      <select id="postCategory">
        <option value="General">General</option>
        <option value="Announcement">Announcement</option>
        <option value="Discussion">Discussion</option>
        <option value="Question">Question</option>
        <option value="Meme">Meme</option>
      </select>
      <input type="file" id="postImage" accept="image/*">
      <button id="createPostBtn">Post</button>
      <button onclick="createPoll()" style="background:linear-gradient(135deg, #00d4ff, #0099cc);">📊 Create Poll</button>

      <div class="search-filter">
        <input type="text" id="searchInput" placeholder="🔍 Search posts...">
        <select id="filterCategory">
          <option value="all">All Categories</option>
          <option value="General">General</option>
          <option value="Announcement">Announcement</option>
          <option value="Discussion">Discussion</option>
          <option value="Question">Question</option>
          <option value="Meme">Meme</option>
        </select>
        <select id="sortBy">
          <option value="newest">Newest</option>
          <option value="popular">Most Popular</option>
          <option value="discussed">Most Discussed</option>
        </select>
        <button id="searchBtn">Search</button>
      </div>

      <div id="postsList"></div>
    </div>

    <!-- USERS -->
    <div id="usersSection" class="hidden">
      <h2>Users</h2>
      <button onclick="setCustomStatus()">✏️ Set Status</button>
      <button onclick="changeProfilePicture()">🖼️ Change Profile Picture</button>
      <div id="usersList"></div>
    </div>

    <!-- DMS -->
    <div id="dmsSection" class="hidden">
      <h2>Direct Messages</h2>
      <input type="text" id="dmToUsername" placeholder="Username">
      <textarea id="dmMessage" placeholder="Message..." rows="3"></textarea>
      <button onclick="alert('DMs coming soon!')">Send DM</button>
      <div id="dmsList"></div>
    </div>

    <!-- UPDATES -->
    <div id="updatesSection" class="hidden">
      <h2>Forum Updates</h2>
      <div id="updatesList"></div>
    </div>

    <!-- SUGGESTIONS -->
    <div id="suggestionsSection" class="hidden">
      <h2>Suggestions</h2>
      <input type="text" id="suggestionTitle" placeholder="Suggestion title">
      <textarea id="suggestionDesc" placeholder="Describe your suggestion..." rows="3"></textarea>
      <button id="submitSuggestion">Submit Suggestion</button>
      <div id="suggestionsList"></div>
    </div>

    <!-- LEADERBOARD -->
    <div id="leaderboardSection" class="hidden">
      <h2>🏆 Leaderboard</h2>
      <p style="text-align:center; color:#888; margin-bottom:15px;">
        Top contributors ranked by posts, likes, and engagement
      </p>
      <div id="leaderboardList"></div>
    </div>

    <!-- OWNER CONTROLS -->
    <div id="ownerControls" class="hidden">
      <h3>👑 Admin Controls</h3>
      <button id="clearForumBtn" onclick="if(confirm('Clear ALL posts?')){db.collection('posts').get().then(s=>s.forEach(d=>d.ref.delete())); alert('Cleared!');}">🗑️ Clear Forum</button>
    </div>
  </div>

  <script src="script.js"></script>
</body>
</html>
