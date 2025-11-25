// ================= CREATE POST =================
  document.getElementById("postBtn").onclick = async function(){
    const content = document.getElementById("postContent").value;
    const category = document.getElementById("postCategory").value;
    const imageFile = document.getElementById("postImage").files[0];
    
    if(!content && !imageFile) return alert("Write something or upload an image!");
    
    const postBtn = document.getElementById("postBtn");
    postBtn.disabled = true;
    postBtn.textContent = "Uploading...";
    
    // Check if user wants to add a poll
    let poll = null;
    if(confirm("Do you want to add a poll to this post?")){
      const question = prompt("Enter poll question:");
      if(question){
        const optionsStr = prompt("Enter poll options (comma-separated):");
        if(optionsStr){
          const options = optionsStr.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
          if(options.length >= 2){
            poll = {
              question,
              options: options.map(text => ({ text, votes: 0 })),
              voters: []
            };
          } else {
            alert("Need at least 2 options for a poll");
          }
        }
      }
    }
    
    try{
      let imageUrl = null;
      if(imageFile){
