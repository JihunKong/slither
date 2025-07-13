// Virtual Joystick for mobile controls
class VirtualJoystick {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Joystick container not found');
            return;
        }
        
        this.active = false;
        this.angle = 0;
        this.distance = 0;
        this.maxDistance = 60;
        
        this.createJoystick();
        this.setupEventListeners();
        
        // Hide on desktop
        if (!this.isMobile()) {
            this.container.style.display = 'none';
        }
    }
    
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768);
    }
    
    createJoystick() {
        this.container.innerHTML = `
            <div class="joystick-base" id="joystickBase">
                <div class="joystick-knob" id="joystickKnob"></div>
            </div>
        `;
        
        this.base = document.getElementById('joystickBase');
        this.knob = document.getElementById('joystickKnob');
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .joystick-container {
                position: fixed;
                bottom: 30px;
                left: 30px;
                z-index: 1000;
                touch-action: none;
                user-select: none;
                -webkit-user-select: none;
            }
            
            .joystick-base {
                width: 120px;
                height: 120px;
                background-color: rgba(255, 255, 255, 0.2);
                border: 3px solid rgba(255, 255, 255, 0.4);
                border-radius: 50%;
                position: relative;
                touch-action: none;
            }
            
            .joystick-knob {
                width: 50px;
                height: 50px;
                background-color: rgba(255, 255, 255, 0.6);
                border: 2px solid rgba(255, 255, 255, 0.8);
                border-radius: 50%;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                transition: none;
                touch-action: none;
            }
            
            .joystick-knob.active {
                background-color: rgba(76, 175, 80, 0.8);
                box-shadow: 0 0 10px rgba(76, 175, 80, 0.8);
            }
            
            @media (min-width: 769px) {
                .joystick-container {
                    display: none !important;
                }
            }
            
            @media (max-width: 768px) {
                .joystick-container {
                    bottom: 20px;
                    left: 20px;
                }
                
                .joystick-base {
                    width: 100px;
                    height: 100px;
                }
                
                .joystick-knob {
                    width: 40px;
                    height: 40px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // Touch events
        this.base.addEventListener('touchstart', this.handleStart.bind(this), { passive: false });
        this.base.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
        this.base.addEventListener('touchend', this.handleEnd.bind(this), { passive: false });
        this.base.addEventListener('touchcancel', this.handleEnd.bind(this), { passive: false });
        
        // Mouse events for testing
        this.base.addEventListener('mousedown', this.handleStart.bind(this));
        window.addEventListener('mousemove', this.handleMove.bind(this));
        window.addEventListener('mouseup', this.handleEnd.bind(this));
    }
    
    handleStart(e) {
        e.preventDefault();
        this.active = true;
        this.knob.classList.add('active');
        this.updatePosition(e);
    }
    
    handleMove(e) {
        if (!this.active) return;
        e.preventDefault();
        this.updatePosition(e);
    }
    
    handleEnd(e) {
        if (!this.active) return;
        e.preventDefault();
        this.active = false;
        this.knob.classList.remove('active');
        
        // Reset knob position
        this.knob.style.transform = 'translate(-50%, -50%)';
        this.angle = 0;
        this.distance = 0;
        
        // Emit stop event
        if (this.onStop) {
            this.onStop();
        }
    }
    
    updatePosition(e) {
        const rect = this.base.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        const deltaX = clientX - centerX;
        const deltaY = clientY - centerY;
        
        this.angle = Math.atan2(deltaY, deltaX);
        this.distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), this.maxDistance);
        
        // Improved responsiveness with dead zone
        const normalizedDistance = this.distance / this.maxDistance;
        const deadZone = 0.1;
        const adjustedDistance = normalizedDistance < deadZone ? 0 : (normalizedDistance - deadZone) / (1 - deadZone);
        
        // Update knob position with smooth animation
        const knobX = Math.cos(this.angle) * this.distance;
        const knobY = Math.sin(this.angle) * this.distance;
        
        this.knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
        
        // Emit change event with adjusted distance
        if (this.onChange && adjustedDistance > 0) {
            this.onChange(this.angle, adjustedDistance);
        }
    }
    
    // Get current angle in radians
    getAngle() {
        return this.angle;
    }
    
    // Get normalized distance (0-1)
    getDistance() {
        return this.distance / this.maxDistance;
    }
    
    // Check if joystick is active
    isActive() {
        return this.active;
    }
    
    // Set callback for change events
    setOnChange(callback) {
        this.onChange = callback;
    }
    
    // Set callback for stop events
    setOnStop(callback) {
        this.onStop = callback;
    }
    
    // Show/hide joystick
    show() {
        this.container.style.display = 'block';
    }
    
    hide() {
        this.container.style.display = 'none';
    }
}

// Export for use in game
window.VirtualJoystick = VirtualJoystick;