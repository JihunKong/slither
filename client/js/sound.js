// Sound Manager for Snake Game
class SoundManager {
    constructor() {
        this.enabled = true;
        this.volume = 0.5;
        this.sounds = {};
        this.audioContext = null;
        this.initialized = false;
        
        // Initialize on first user interaction
        this.initPromise = null;
    }
    
    async init() {
        if (this.initialized) return;
        
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Load volume preference
            const savedVolume = localStorage.getItem('snakeGameVolume');
            if (savedVolume !== null) {
                this.volume = parseFloat(savedVolume);
            }
            
            const savedEnabled = localStorage.getItem('snakeGameSoundEnabled');
            if (savedEnabled !== null) {
                this.enabled = savedEnabled === 'true';
            }
            
            this.initialized = true;
            console.log('Sound system initialized');
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            this.enabled = false;
        }
    }
    
    // Create simple synthesized sounds
    createEatSound(foodValue = 10) {
        if (!this.audioContext || !this.enabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        // Higher value foods have higher pitch
        const baseFreq = 400;
        const frequency = baseFreq + (foodValue * 10);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        // Quick envelope
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }
    
    createBoostSound() {
        if (!this.audioContext || !this.enabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.frequency.value = 200;
        oscillator.type = 'sawtooth';
        
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        filter.Q.value = 10;
        
        // Boost up sound
        oscillator.frequency.linearRampToValueAtTime(400, this.audioContext.currentTime + 0.2);
        filter.frequency.linearRampToValueAtTime(2000, this.audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(this.volume * 0.2, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }
    
    createDeathSound() {
        if (!this.audioContext || !this.enabled) return;
        
        // Create multiple oscillators for death sound
        for (let i = 0; i < 3; i++) {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.frequency.value = 150 - (i * 30);
            oscillator.type = 'square';
            
            // Descending pitch
            oscillator.frequency.exponentialRampToValueAtTime(
                50, 
                this.audioContext.currentTime + 0.5
            );
            
            gainNode.gain.setValueAtTime(this.volume * 0.2, this.audioContext.currentTime + i * 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start(this.audioContext.currentTime + i * 0.1);
            oscillator.stop(this.audioContext.currentTime + 0.6);
        }
    }
    
    createVictorySound() {
        if (!this.audioContext || !this.enabled) return;
        
        // Victory fanfare
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C (octave higher)
        
        notes.forEach((freq, i) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.frequency.value = freq;
            oscillator.type = 'sine';
            
            const startTime = this.audioContext.currentTime + i * 0.15;
            
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, startTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.5);
        });
    }
    
    createClickSound() {
        if (!this.audioContext || !this.enabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.frequency.value = 1000;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(this.volume * 0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.05);
    }
    
    // Play methods
    async playEat(foodValue) {
        await this.ensureInitialized();
        this.createEatSound(foodValue);
    }
    
    async playBoost() {
        await this.ensureInitialized();
        this.createBoostSound();
    }
    
    async playDeath() {
        await this.ensureInitialized();
        this.createDeathSound();
    }
    
    async playVictory() {
        await this.ensureInitialized();
        this.createVictorySound();
    }
    
    async playClick() {
        await this.ensureInitialized();
        this.createClickSound();
    }
    
    // Ensure audio context is initialized
    async ensureInitialized() {
        if (!this.initialized) {
            if (!this.initPromise) {
                this.initPromise = this.init();
            }
            await this.initPromise;
        }
    }
    
    // Settings
    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        localStorage.setItem('snakeGameVolume', this.volume);
    }
    
    setEnabled(value) {
        this.enabled = value;
        localStorage.setItem('snakeGameSoundEnabled', value);
    }
    
    toggle() {
        this.setEnabled(!this.enabled);
        return this.enabled;
    }
}

// Create global sound manager instance
window.soundManager = new SoundManager();

// Initialize on first user interaction
document.addEventListener('click', () => {
    window.soundManager.ensureInitialized();
}, { once: true });

document.addEventListener('touchstart', () => {
    window.soundManager.ensureInitialized();
}, { once: true });