// Cloudinary Configuration
const CLOUD_NAME = "dn7cpjfyz";
const UPLOAD_PRESET = "unsigned_upload";

// Supabase Configuration
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL"; // Replace with your Supabase URL
const SUPABASE_API_KEY = "YOUR_SUPABASE_ANON_KEY"; // Replace with your Supabase anon key

async function uploadContent() {
  const fileInput = document.getElementById('fileInput');
  const contentType = document.getElementById('contentType').value;
  const caption = document.getElementById('caption').value;
  const uploadedBy = document.getElementById('uploadedBy').value;
  const statusDiv = document.getElementById('status');
  
  if (!fileInput.files[0]) {
    alert('Please select a file');
    return;
  }
  
  if (!uploadedBy.trim()) {
    alert('Please enter your username');
    return;
  }
  
  const file = fileInput.files[0];
  const isVideo = file.type.startsWith('video');
  const isImage = file.type.startsWith('image');
  
  // Validate file type based on content type
  if (contentType === 'post' && !isImage) {
    alert('Posts must be images');
    return;
  }
  
  if (contentType === 'reel' && !isVideo) {
    alert('Reels must be videos');
    return;
  }
  
  statusDiv.innerHTML = '<p>Uploading to Cloudinary...</p>';
  
  try {
    // Upload to Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    
    const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
      method: 'POST',
      body: formData
    });
    
    const cloudinaryData = await cloudinaryResponse.json();
    
    if (!cloudinaryResponse.ok) {
      throw new Error('Cloudinary upload failed');
    }
    
    const mediaUrl = cloudinaryData.secure_url;
    const mediaType = isVideo ? 'video' : 'image';
    
    // Show preview
    showPreview(mediaUrl, mediaType);
    
    statusDiv.innerHTML = '<p>Saving to database...</p>';
    
    // Save to Supabase
    await saveToSupabase(contentType, caption, mediaUrl, mediaType, uploadedBy);
    
    statusDiv.innerHTML = '<p style="color: #4CAF50;">✅ Upload successful!</p>';
    
    // Reset form
    document.getElementById('caption').value = '';
    fileInput.value = '';
    
  } catch (error) {
    console.error('Upload error:', error);
    statusDiv.innerHTML = '<p style="color: #f44336;">❌ Upload failed. Check console for details.</p>';
  }
}

function showPreview(url, type) {
  const preview = document.getElementById('preview');
  
  if (type === 'video') {
    preview.innerHTML = `
      <h3>Preview:</h3>
      <video src="${url}" controls style="max-width: 100%; max-height: 300px;">
        Your browser does not support the video tag.
      </video>
    `;
  } else {
    preview.innerHTML = `
      <h3>Preview:</h3>
      <img src="${url}" alt="Uploaded image" style="max-width: 100%; max-height: 300px;">
    `;
  }
}

async function saveToSupabase(contentType, caption, mediaUrl, mediaType, uploadedBy) {
  const tableName = contentType === 'post' ? 'posts' : 'reels';
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_API_KEY,
      'Authorization': `Bearer ${SUPABASE_API_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      caption: caption || null,
      media_url: mediaUrl,
      media_type: mediaType,
      uploaded_by: uploadedBy
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase error: ${errorText}`);
  }
}

// File input change handler for immediate preview
document.getElementById('fileInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('video') ? 'video' : 'image';
    showPreview(url, type);
  }
});