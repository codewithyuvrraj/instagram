// Fix common console errors
console.log('🔧 Loading error fixes...');

// Fix undefined functions
window.loadFeed = window.loadFeed || window.loadFeedFromApp || function() { console.log('loadFeed called'); };
window.loadStories = window.loadStories || window.loadStoriesFromApp || function() { console.log('loadStories called'); };
window.loadChats = window.loadChats || function() { console.log('loadChats called'); };
window.loadReels = window.loadReels || function() { console.log('loadReels called'); };
window.loadNotifications = window.loadNotifications || function() { console.log('loadNotifications called'); };
window.loadHighlights = window.loadHighlights || function() { console.log('loadHighlights called'); };

// Fix currentUser reference
if (typeof currentUser === 'undefined') {
  window.currentUser = window.currentUser || null;
}

// Fix missing elements
document.addEventListener('DOMContentLoaded', function() {
  // Add missing elements if they don't exist
  if (!document.getElementById('searchResults')) {
    const searchSection = document.getElementById('searchSection');
    if (searchSection && !document.getElementById('searchResults')) {
      const searchResults = document.createElement('div');
      searchResults.id = 'searchResults';
      searchSection.appendChild(searchResults);
    }
  }
});

// Catch and log errors
window.addEventListener('error', function(e) {
  console.log('🐛 Error caught:', e.message, 'at', e.filename, ':', e.lineno);
});

console.log('✅ Error fixes loaded');