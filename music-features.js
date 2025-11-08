// Music Features for Posts and Reels

// Music upload and management
window.musicFeatures = {
  selectedMusic: null,
  audioContext: null,
  
  // Initialize audio context
  initAudio() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  },
  
  // Open music selector
  openMusicSelector(type = 'post') {
    const modal = document.getElementById('musicModal') || this.createMusicModal();
    modal.dataset.type = type;
    modal.classList.remove('hidden');
    this.loadMusicLibrary();
  },
  
  // Create music modal
  createMusicModal() {
    const modal = document.createElement('div');
    modal.id = 'musicModal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-backdrop" onclick="musicFeatures.closeMusicModal()"></div>
      <div class="modal-dialog" style="max-width: 600px;">
        <div class="modal-header">
          <h3>Add Music</h3>
          <button class="close-btn" onclick="musicFeatures.closeMusicModal()">×</button>
        </div>
        <div class="modal-body" style="padding: 20px;">
          <div class="music-upload" style="margin-bottom: 20px;">
            <input type="file" id="musicFileInput" accept="audio/*" onchange="musicFeatures.handleMusicUpload(this)" style="display: none;">
            <button class="btn btn-primary" onclick="document.getElementById('musicFileInput').click()">
              📁 Upload Music from Device
            </button>
          </div>
          
          <div class="music-library">
            <h4>Your Music Library</h4>
            <div id="musicList" style="max-height: 300px; overflow-y: auto;">
              <div class="loading">Loading music...</div>
            </div>
          </div>
          
          <div id="musicPreview" class="music-preview hidden" style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px;">
            <div class="preview-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div>
                <div class="music-title" style="font-weight: 600;"></div>
                <div class="music-artist" style="color: #8e8e8e; font-size: 0.9rem;"></div>
              </div>
              <button class="btn btn-secondary" onclick="musicFeatures.clearSelection()">Remove</button>
            </div>
            
            <audio id="musicAudio" controls style="width: 100%; margin-bottom: 10px;"></audio>
            
            <div class="music-trim" style="margin-bottom: 15px;">
              <label>Trim Music (30 seconds max):</label>
              <div style="display: flex; gap: 10px; align-items: center; margin-top: 5px;">
                <label>Start: <input type="number" id="startTime" min="0" step="0.1" value="0" style="width: 80px;"> sec</label>
                <label>Duration: <input type="number" id="duration" min="1" max="30" step="0.1" value="30" style="width: 80px;"> sec</label>
                <button class="btn btn-secondary" onclick="musicFeatures.previewTrim()">Preview</button>
              </div>
            </div>
            
            <button class="btn btn-primary" onclick="musicFeatures.confirmMusicSelection()">Use This Music</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  },
  
  // Handle music file upload
  async handleMusicUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file');
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      alert('File too large. Maximum size is 50MB');
      return;
    }
    
    try {
      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'unsigned_upload'); // Use your Cloudinary preset
      formData.append('resource_type', 'auto');
      
      const response = await fetch('https://api.cloudinary.com/v1_1/dn7cpjfyz/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (!response.ok) throw new Error('Upload failed');
      
      // Get audio duration
      const audio = new Audio(result.secure_url);
      audio.addEventListener('loadedmetadata', async () => {
        // Save to music library
        const { error } = await window.sb
          .from('music_library')
          .insert({
            user_id: window.currentUser.id,
            title: file.name.replace(/\.[^/.]+$/, ""),
            file_url: result.secure_url,
            duration: audio.duration,
            file_size: file.size
          });
        
        if (error) {
          console.error('Error saving music:', error);
          alert('Error saving music to library');
        } else {
          this.loadMusicLibrary();
          alert('Music uploaded successfully!');
        }
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload music');
    }
  },
  
  // Load music library
  async loadMusicLibrary() {
    try {
      const { data: music, error } = await window.sb
        .from('music_library')
        .select('*')
        .eq('user_id', window.currentUser.id)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      
      const musicList = document.getElementById('musicList');
      if (!musicList) return;
      
      if (!music || music.length === 0) {
        musicList.innerHTML = '<div class="no-music">No music in your library. Upload some music to get started!</div>';
        return;
      }
      
      musicList.innerHTML = music.map(track => `
        <div class="music-item" onclick="musicFeatures.selectMusic('${track.id}', '${track.title}', '${track.artist || ''}', '${track.file_url}', ${track.duration})" style="padding: 10px; border-radius: 8px; cursor: pointer; margin-bottom: 8px; background: rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 600;">${track.title}</div>
            <div style="color: #8e8e8e; font-size: 0.9rem;">${track.artist || 'Unknown Artist'} • ${Math.floor(track.duration)}s</div>
          </div>
          <div>
            <button class="btn btn-secondary" onclick="event.stopPropagation(); musicFeatures.deleteMusic('${track.id}')" style="padding: 4px 8px; font-size: 0.8rem;">Delete</button>
          </div>
        </div>
      `).join('');
      
    } catch (error) {
      console.error('Error loading music:', error);
      document.getElementById('musicList').innerHTML = '<div class="error">Error loading music library</div>';
    }
  },
  
  // Select music
  selectMusic(id, title, artist, url, duration) {
    this.selectedMusic = { id, title, artist, url, duration };
    
    const preview = document.getElementById('musicPreview');
    const audio = document.getElementById('musicAudio');
    
    preview.classList.remove('hidden');
    preview.querySelector('.music-title').textContent = title;
    preview.querySelector('.music-artist').textContent = artist || 'Unknown Artist';
    
    audio.src = url;
    
    // Set default trim values
    document.getElementById('startTime').max = duration;
    document.getElementById('startTime').value = 0;
    document.getElementById('duration').value = Math.min(30, duration);
  },
  
  // Preview trim
  previewTrim() {
    const audio = document.getElementById('musicAudio');
    const startTime = parseFloat(document.getElementById('startTime').value);
    const duration = parseFloat(document.getElementById('duration').value);
    
    audio.currentTime = startTime;
    audio.play();
    
    setTimeout(() => {
      audio.pause();
    }, duration * 1000);
  },
  
  // Clear selection
  clearSelection() {
    this.selectedMusic = null;
    document.getElementById('musicPreview').classList.add('hidden');
  },
  
  // Confirm music selection
  confirmMusicSelection() {
    if (!this.selectedMusic) return;
    
    const startTime = parseFloat(document.getElementById('startTime').value);
    const duration = parseFloat(document.getElementById('duration').value);
    
    this.selectedMusic.startTime = startTime;
    this.selectedMusic.trimDuration = duration;
    
    // Update UI to show selected music
    const modal = document.getElementById('musicModal');
    const type = modal.dataset.type;
    
    if (type === 'post') {
      this.updatePostMusicUI();
    } else if (type === 'reel') {
      this.updateReelMusicUI();
    }
    
    this.closeMusicModal();
  },
  
  // Update post music UI
  updatePostMusicUI() {
    const musicBtn = document.getElementById('postMusicBtn');
    if (musicBtn && this.selectedMusic) {
      musicBtn.innerHTML = `🎵 ${this.selectedMusic.title}`;
      musicBtn.style.background = '#0095f6';
      musicBtn.style.color = 'white';
    }
  },
  
  // Update reel music UI
  updateReelMusicUI() {
    const musicBtn = document.getElementById('reelMusicBtn');
    if (musicBtn && this.selectedMusic) {
      musicBtn.innerHTML = `🎵 ${this.selectedMusic.title}`;
      musicBtn.style.background = '#0095f6';
      musicBtn.style.color = 'white';
    }
  },
  
  // Delete music
  async deleteMusic(musicId) {
    if (!confirm('Delete this music from your library?')) return;
    
    try {
      const { error } = await window.sb
        .from('music_library')
        .delete()
        .eq('id', musicId);
      
      if (error) throw error;
      
      this.loadMusicLibrary();
    } catch (error) {
      console.error('Error deleting music:', error);
      alert('Failed to delete music');
    }
  },
  
  // Close music modal
  closeMusicModal() {
    const modal = document.getElementById('musicModal');
    if (modal) modal.classList.add('hidden');
  },
  
  // Get selected music data for saving
  getMusicData() {
    if (!this.selectedMusic) return null;
    
    return {
      music_name: this.selectedMusic.title,
      music_artist: this.selectedMusic.artist,
      music_url: this.selectedMusic.url,
      music_start_time: this.selectedMusic.startTime || 0,
      music_duration: this.selectedMusic.trimDuration || 30
    };
  }
};

// Add music buttons to post and reel creation forms
window.addMusicButtons = function() {
  // Add to post form
  const postForm = document.querySelector('#createPostModal .modal-form');
  if (postForm && !document.getElementById('postMusicBtn')) {
    const musicBtn = document.createElement('button');
    musicBtn.id = 'postMusicBtn';
    musicBtn.type = 'button';
    musicBtn.className = 'btn btn-secondary';
    musicBtn.innerHTML = '🎵 Add Music';
    musicBtn.onclick = () => musicFeatures.openMusicSelector('post');
    musicBtn.style.marginTop = '10px';
    postForm.appendChild(musicBtn);
  }
  
  // Add to reel form
  const reelForm = document.querySelector('#createReelModal .modal-form');
  if (reelForm && !document.getElementById('reelMusicBtn')) {
    const musicBtn = document.createElement('button');
    musicBtn.id = 'reelMusicBtn';
    musicBtn.type = 'button';
    musicBtn.className = 'btn btn-secondary';
    musicBtn.innerHTML = '🎵 Add Music';
    musicBtn.onclick = () => musicFeatures.openMusicSelector('reel');
    musicBtn.style.marginTop = '10px';
    reelForm.appendChild(musicBtn);
  }
};

// Initialize music features
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.addMusicButtons);
} else {
  window.addMusicButtons();
}