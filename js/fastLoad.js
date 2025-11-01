// Fast Loading Optimizations
console.log('⚡ Fast loader starting...');

// Preload critical functions
window.fastLoad = {
    // Cache DOM elements
    cache: new Map(),
    
    // Get cached element
    get(id) {
        if (!this.cache.has(id)) {
            this.cache.set(id, document.getElementById(id));
        }
        return this.cache.get(id);
    },
    
    // Fast show/hide
    show(id) {
        const el = this.get(id);
        if (el) el.style.display = 'block';
    },
    
    hide(id) {
        const el = this.get(id);
        if (el) el.style.display = 'none';
    },
    
    // Fast class toggle
    toggle(id, className) {
        const el = this.get(id);
        if (el) el.classList.toggle(className);
    },
    
    // Fast text update
    text(id, content) {
        const el = this.get(id);
        if (el) el.textContent = content;
    },
    
    // Fast HTML update
    html(id, content) {
        const el = this.get(id);
        if (el) el.innerHTML = content;
    }
};

// Optimize images for faster loading
document.addEventListener('DOMContentLoaded', () => {
    // Lazy load images
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
    });
    
    // Preload critical CSS
    const criticalCSS = `
        .hidden { display: none !important; }
        .loading { opacity: 0.5; pointer-events: none; }
        .fast-fade { transition: opacity 0.1s; }
    `;
    
    const style = document.createElement('style');
    style.textContent = criticalCSS;
    document.head.appendChild(style);
    
    console.log('⚡ Fast loader ready');
});

// Debounce function for performance
window.debounce = (func, wait) => {
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

// Throttle function for performance
window.throttle = (func, limit) => {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};