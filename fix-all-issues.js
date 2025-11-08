// Fix all search and UI issues
console.log('🔧 Fixing all issues...');

// Fix 1: Ensure three dots are always visible
document.addEventListener('DOMContentLoaded', function() {
  // Add CSS for three dots visibility
  const style = document.createElement('style');
  style.textContent = `
    .user-item button[onclick*="toggleUserMenu"] {
      background: rgba(255, 255, 255, 0.3) !important;
      border: 3px solid rgba(255, 255, 255, 0.6) !important;
      border-radius: 50% !important;
      color: #ffffff !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 42px !important;
      height: 42px !important;
      padding: 10px !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 4px 15px rgba(0,0,0,0.6) !important;
      z-index: 100 !important;
      flex-shrink: 0 !important;
    }
    
    .user-item button[onclick*="toggleUserMenu"]:hover {
      background: rgba(255, 255, 255, 0.5) !important;
      transform: scale(1.15) !important;
      box-shadow: 0 6px 20px rgba(0,0,0,0.8) !important;
    }
    
    .user-item {
      cursor: default !important;
      pointer-events: auto !important;
    }
    
    .user-info {
      pointer-events: none !important;
    }
    
    .user-avatar img {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      border-radius: 50% !important;
      display: block !important;
    }
    
    .chat-avatar img {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      border-radius: 50% !important;
      display: block !important;
    }
  `;
  document.head.appendChild(style);
});

// Fix 2: Override any click handlers on user items
document.addEventListener('click', function(e) {
  const userItem = e.target.closest('.user-item');
  if (userItem && !e.target.closest('button') && !e.target.closest('.user-actions')) {
    e.stopPropagation();
    e.preventDefault();
    return false;
  }
});

console.log('✅ All issues fixed');