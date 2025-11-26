// ================= LOAD POSTS =================
  async function loadPosts(searchQuery = "", filterCategory = "", sortBy = "newest"){
    const postsList = document.getElementById("postsList");
    postsList.innerHTML = "<p style='text-align:center; color:#888;'>Loading posts...</p>";
    
    try{
      const snapshot = await db.collection("posts").limit(100).get();
      
      const userDataCache = {};
      const userIds = new Set();
      snapshot.forEach(doc => userIds.add(doc.data().authorId));
      
      for(let userId of userIds) {
        try {
          const userDoc = await db.collection("users").doc(userId).get();
          if(userDoc.exists) {
            userDataCache[userId] = userDoc.data();
          }
        } catch(e) {
          console.log("Could not fetch user:", userId);
        }
      }
      
      let posts = [];
      snapshot.forEach(doc => {
        const post = doc.data();
        
        if(searchQuery && !post.content.toLowerCase().includes(searchQuery.toLowerCase())){
          return;
        }
        
        if(filterCategory && filterCategory !== 'all' && post.category !== filterCategory){
          return;
        }
        
        posts.push({ id: doc.id, ...post });
      });
      
      if(sortBy === 'newest') {
        posts.sort((a, b) => {
          if(a.pinned && !b.pinned) return -1;
          if(!a.pinned && b.pinned) return 1;
          return b.timestamp - a.timestamp;
        });
      } else if(sortBy === 'popular') {
        posts.sort((a, b) => {
          if(a.pinned && !b.pinned) return -1;
          if(!a.pinned && b.pinned) return 1;
          return (b.likes || 0) - (a.likes || 0);
        });
      } else if(sortBy === 'discussed') {
        posts.sort((a, b) => {
          if(a.pinned && !b.pinned) return -1;
          if(!a.pinned && b.pinned) return 1;
          return (b.comments?.length || 0) - (a.comments?.length || 0);
        });
      }
      
      postsList.innerHTML = "";
      
      posts.forEach(post => {
        const postId = post.id;
        
        const isLiked = post.likedBy && post.likedBy.includes(currentUser.uid);
        const isBookmarked = post.bookmarkedBy && post.bookmarkedBy.includes(currentUser.uid);
        const canModerate = isOwner || isModerator;
        const canDelete = post.authorId === currentUser.uid || canModerate;
        const canEdit = post.authorId === currentUser.uid;
        
        const authorData = userDataCache[post.authorId];
        let roleBadge = "";
        if(authorData) {
          if(authorData.email === "d29510713@gmail.com") {
            roleBadge = '<span style="color:#ff6b35; text-shadow: 0 0 10px rgba(255,107,53,0.8);"> 👑 OWNER</span>';
          } else if(authorData.moderator) {
            roleBadge = '<span style="color:#00d4ff; text-shadow: 0 0 10px rgba(0,212,255,0.6);"> 🛡️ MOD</span>';
          }
        }
        
        const timeAgo = getTimeAgo(post.timestamp);
        const pinBadge = post.pinned ? '<span style="color:#ffd700;">📌 PINNED</span>' : '';
        const engagement = (post.likes || 0) + ((post.comments?.length || 0) * 2);
        const trendingBadge = engagement > 10 ? '<span style="color:#ff6b35;">🔥 TRENDING</span>' : '';
        
        const postDiv = document.createElement("div");
        postDiv.className = "post";
        if(post.reported) postDiv.style.borderColor = "rgba(255, 0, 0, 0.6)";
        if(post.pinned) postDiv.style.borderColor = "rgba(255, 215, 0, 0.6)";
        
        postDiv.innerHTML = `
          <div class="post-header">
            <div>
              <strong>${post.author}${roleBadge}</strong> - ${post.category} ${pinBadge} ${trendingBadge}
              ${post.reported ? '<span style="color:red;"> ⚠ REPORTED</span>' : ''}
              ${post.edited ? '<span style="color:#888;font-size:11px;"> (edited)</span>' : ''}
            </div>
            <span class="post-time">${new Date(post.timestamp).toLocaleString()} (${timeAgo})</span>
          </div>
          ${post.poll ? `
            <div class="post-content"><strong>📊 ${escapeHtml(post.poll.question)}</strong></div>
            <div style="margin:10px 0;">
              ${post.poll.options.map((opt, idx) => {
                const totalVotes = post.poll.options.reduce((sum, o) => sum + o.votes, 0);
                const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                const hasVoted = post.poll.voters && post.poll.voters.includes(currentUser.uid);
                return `
                  <div style="margin:8px 0;">
                    <button onclick="voteOnPoll('${postId}', ${idx})" 
                            style="width:100%; text-align:left; padding:10px; position:relative; overflow:hidden;"
                            ${hasVoted ? 'disabled' : ''}>
                      <div style="position:absolute; left:0; top:0; height:100%; width:${percentage}%; background:rgba(138,43,226,0.3); z-index:0;"></div>
                      <span style="position:relative; z-index:1;">${escapeHtml(opt.text)} - ${opt.votes} votes (${percentage}%)</span>
                    </button>
                  </div>
                `;
              }).join('')}
              <div style="color:#888; font-size:12px; margin-top:5px;">
                Total votes: ${post.poll.options.reduce((sum, o) => sum + o.votes, 0)}
              </div>
            </div>
          ` : ''}
          ${post.content ? `<div class="post-content">${escapeHtml(post.content)}</div>` : ''}
          ${post.imageUrl ? `
            <img src="${post.imageUrl}" 
                 class="post-image" 
                 alt="Post image" 
                 loading="lazy"
                 onerror="this.style.display='none';"
                 onclick="openImageModal('${post.imageUrl}')">
          ` : ''}
          <div class="post-actions" style="font-size:12px;">
            <button onclick="likePost('${postId}')" style="background:${isLiked ? 'linear-gradient(135deg, #ff6b35, #f7931e)' : ''}">
              👍 ${post.likes || 0}
            </button>
            <button onclick="toggleComments('${postId}')">💬 ${post.comments?.length || 0}</button>
            <button onclick="bookmarkPost('${postId}')" style="background:${isBookmarked ? 'linear-gradient(135deg, #ffd700, #ffed4e)' : ''}">
              🔖 ${isBookmarked ? 'Saved' : 'Save'}
            </button>
            ${canEdit ? `<button onclick="editPost('${postId}')">✏️ Edit</button>` : ''}
            ${canDelete ? `<button onclick="deletePost('${postId}')">🗑️ Delete</button>` : ''}
            ${canModerate ? `
              <button onclick="pinPost('${postId}', ${!post.pinned})">${post.pinned ? '📍 Unpin' : '📌 Pin'}</button>
            ` : ''}
            ${!canModerate && post.authorId !== currentUser.uid ? `
              <button onclick="reportPost('${postId}')">⚠️ Report</button>
            ` : ''}
          </div>
          <div id="comments-${postId}" style="display:none; margin-top:15px; border-top:1px solid rgba(138,43,226,0.3); padding-top:15px;">
            <div style="margin-bottom:10px;">
              <textarea id="commentText-${postId}" placeholder="Write a comment..." style="width:100%; min-height:60px; padding:8px; background:rgba(0,0,0,0.5); border:1px solid rgba(138,43,226,0.5); color:#fff; border-radius:5px; resize:vertical;"></textarea>
              <button onclick="addComment('${postId}')" style="margin-top:5px;">Post Comment</button>
            </div>
            <div id="commentsList-${postId}"></div>
          </div>
        `;
        postsList.appendChild(postDiv);
      });
      
      if(postsList.innerHTML === "") postsList.innerHTML = "<p style='text-align:center; color:#888;'>No posts found</p>";
    }catch(e){
      postsList.innerHTML = "<p style='text-align:center; color:red;'>Error loading posts: " + e.message + "</p>";
      console.error(e);
    }
  }
