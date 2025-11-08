// Debug version - add this to test three dots visibility
console.log('🔍 Debug search loaded');

// Force show three dots for testing
window.debugSearchUsers = function() {
  const searchResults = document.getElementById('searchResults');
  if (!searchResults) {
    console.log('❌ searchResults element not found');
    return;
  }

  const testHTML = `
    <div class="user-item" style="position: relative; display: flex; align-items: center; padding: 1rem; border: 1px solid #333; margin: 10px 0;">
      <button onclick="alert('Three dots clicked!')" style="padding: 8px; background: rgba(255, 255, 255, 0.3) !important; border: 2px solid rgba(255, 255, 255, 0.5) !important; border-radius: 50% !important; color: #ffffff !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; width: 40px !important; height: 40px !important; margin-right: 12px !important;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
      </button>
      <div style="width: 44px; height: 44px; background: #e1306c; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; color: white; font-weight: 600;">T</div>
      <div style="flex: 1;">
        <div style="color: white; font-weight: 600;">@testuser</div>
        <div style="color: #888;">Test User</div>
      </div>
      <button style="padding: 8px 16px; background: #0095f6; color: white; border: none; border-radius: 20px; margin-left: 8px;">Follow</button>
    </div>
  `;
  
  searchResults.innerHTML = testHTML;
  console.log('✅ Debug search results added');
};

// Auto-run debug when page loads
setTimeout(() => {
  if (document.getElementById('searchResults')) {
    window.debugSearchUsers();
  }
}, 2000);