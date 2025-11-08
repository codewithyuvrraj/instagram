// Fast loading configuration
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_API_KEY = "YOUR_SUPABASE_ANON_KEY";

// Fast fetch with pagination
async function loadPosts(limit = 20, offset = 0) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_latest_posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_API_KEY,
      'Authorization': `Bearer ${SUPABASE_API_KEY}`
    },
    body: JSON.stringify({ limit_count: limit, offset_count: offset })
  });
  return response.json();
}

async function loadReels(limit = 20, offset = 0) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_latest_reels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_API_KEY,
      'Authorization': `Bearer ${SUPABASE_API_KEY}`
    },
    body: JSON.stringify({ limit_count: limit, offset_count: offset })
  });
  return response.json();
}

// Fast display with lazy loading
function displayPosts(posts) {
  const container = document.getElementById('posts-container');
  posts.forEach(post => {
    const postElement = document.createElement('div');
    postElement.innerHTML = `
      <div class="post">
        <img src="${post.media_url}" loading="lazy" alt="Post">
        <p>${post.caption || ''}</p>
        <small>By: ${post.uploaded_by} | Likes: ${post.likes_count}</small>
      </div>
    `;
    container.appendChild(postElement);
  });
}

// Infinite scroll for better performance
let loading = false;
let offset = 0;

window.addEventListener('scroll', async () => {
  if (loading) return;
  
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
    loading = true;
    const posts = await loadPosts(10, offset);
    displayPosts(posts);
    offset += 10;
    loading = false;
  }
});

// Initial load
loadPosts(20, 0).then(displayPosts);