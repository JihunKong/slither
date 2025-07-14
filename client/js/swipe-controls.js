// Swipe Controls for Mobile Snake Game
class SwipeControls {
    constructor() {
        this.enabled = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.currentAngle = 0;
        this.sensitivity = 2; // Adjustable sensitivity
        this.onChange = null;
        
        // Check if mobile
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                       (window.innerWidth <= 768);
                       
        if (this.isMobile) {
            this.init();
        }
    }
    
    init() {
        // Get swipe preference
        const swipeEnabled = localStorage.getItem('snakeSwipeControls');
        this.enabled = swipeEnabled === 'true';
        
        // Load sensitivity setting
        const savedSensitivity = localStorage.getItem('swipeSensitivity');
        if (savedSensitivity !== null) {
            this.sensitivity = parseFloat(savedSensitivity);
        }
        
        if (this.enabled) {
            this.setupEventListeners();
        }
    }
    
    setupEventListeners() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        
        // Touch events for swipe
        canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    }
    
    removeEventListeners() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        
        canvas.removeEventListener('touchstart', this.handleTouchStart);
        canvas.removeEventListener('touchmove', this.handleTouchMove);
        canvas.removeEventListener('touchend', this.handleTouchEnd);
    }
    
    handleTouchStart(e) {
        if (!this.enabled) return;
        
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
    }
    
    handleTouchMove(e) {
        if (!this.enabled) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        
        // Calculate angle from swipe
        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
            this.currentAngle = Math.atan2(deltaY, deltaX);
            
            // Emit change event
            if (this.onChange) {
                this.onChange(this.currentAngle, 1); // Full speed with swipe
            }
        }
    }
    
    handleTouchEnd(e) {
        // Keep last direction
    }
    
    setEnabled(value) {
        this.enabled = value;
        localStorage.setItem('snakeSwipeControls', value);
        
        if (value) {
            this.setupEventListeners();
        } else {
            this.removeEventListeners();
        }
    }
    
    toggle() {
        this.setEnabled(!this.enabled);
        return this.enabled;
    }
    
    setSensitivity(value) {
        this.sensitivity = Math.max(0.5, Math.min(5, value));
        localStorage.setItem('swipeSensitivity', this.sensitivity);
    }
    
    setOnChange(callback) {
        this.onChange = callback;
    }
}

// Create global swipe controls instance
window.swipeControls = new SwipeControls();