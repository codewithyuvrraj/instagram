// Performance optimizations for faster loading

// Optimize Cloudinary URLs for faster delivery
window.optimizeCloudinaryUrl = function(url, options = {}) {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  const { width = 600, quality = 'auto', format = 'auto' } = options;
  
  // Add transformations for faster loading
  const transformations = `f_${format},q_${quality},w_${width}`;
  
  // Insert transformations into Cloudinary URL
  return url.replace('/upload/', `/upload/${transformations}/`);
};

// Lazy load images with intersection observer
window.setupLazyLoading = function() {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.add('loaded');
        observer.unobserve(img);
      }
    });
  });

  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
};

// Create optimized image element
window.createOptimizedImage = function(src, alt = '', className = '') {
  const img = document.createElement('img');
  img.className = `lazy-img ${className}`;
  img.alt = alt;
  img.loading = 'lazy';
  
  // Use optimized Cloudinary URL
  const optimizedSrc = window.optimizeCloudinaryUrl(src, { width: 600 });
  img.dataset.src = optimizedSrc;
  
  // Placeholder while loading
  img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PC9zdmc+';
  
  return img;
};

// Skeleton loader for posts
window.createSkeleton = function() {
  const skeleton = document.createElement('div');
  skeleton.className = 'skeleton';
  return skeleton;
};

// Batch DOM updates for better performance
window.batchDOMUpdates = function(updates) {
  requestAnimationFrame(() => {
    updates.forEach(update => update());
  });
};

// Debounce function for search and scroll
window.debounce = function(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Initialize performance optimizations
document.addEventListener('DOMContentLoaded', function() {
  // Setup lazy loading
  window.setupLazyLoading();
  
  // Re-setup lazy loading when new content is added
  const observer = new MutationObserver(() => {
    window.setupLazyLoading();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});

console.log('⚡ Performance optimizations loaded');