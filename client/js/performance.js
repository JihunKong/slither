// Performance Optimization Utilities
class PerformanceManager {
    constructor() {
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 60;
        this.fpsHistory = [];
        this.maxFPSHistory = 10;
        
        // Performance monitoring
        this.renderTime = 0;
        this.lastRenderStart = 0;
        
        // Object pools for performance
        this.particlePool = [];
        this.maxPoolSize = 100;
        
        // Culling settings
        this.cullingEnabled = true;
        this.cullingMargin = 100;
    }
    
    startFrame() {
        this.lastRenderStart = performance.now();
        this.frameCount++;
    }
    
    endFrame() {
        const now = performance.now();
        this.renderTime = now - this.lastRenderStart;
        
        // Update FPS calculation
        if (now - this.lastTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
            this.fpsHistory.push(this.fps);
            
            if (this.fpsHistory.length > this.maxFPSHistory) {
                this.fpsHistory.shift();
            }
            
            this.frameCount = 0;
            this.lastTime = now;
            
            // Auto-adjust performance settings based on FPS
            this.autoAdjustSettings();
        }
    }
    
    autoAdjustSettings() {
        const avgFPS = this.getAverageFPS();
        
        // If FPS is too low, reduce quality
        if (avgFPS < 30) {
            this.cullingMargin = 50; // More aggressive culling
            window.showParticles = false; // Disable particles
            window.showTrails = false; // Disable trail effects
        } else if (avgFPS > 50) {
            this.cullingMargin = 100; // Normal culling
            window.showParticles = true; // Enable particles
            window.showTrails = true; // Enable trail effects
        }
    }
    
    getAverageFPS() {
        if (this.fpsHistory.length === 0) return this.fps;
        return this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
    }
    
    getFPS() {
        return this.fps;
    }
    
    getRenderTime() {
        return this.renderTime;
    }
    
    // Object pooling for particles
    getParticle() {
        if (this.particlePool.length > 0) {
            return this.particlePool.pop();
        }
        return {
            x: 0,
            y: 0,
            life: 1,
            size: 1,
            color: '#FFFFFF',
            vx: 0,
            vy: 0
        };
    }
    
    releaseParticle(particle) {
        if (this.particlePool.length < this.maxPoolSize) {
            // Reset particle properties
            particle.x = 0;
            particle.y = 0;
            particle.life = 1;
            particle.size = 1;
            particle.color = '#FFFFFF';
            particle.vx = 0;
            particle.vy = 0;
            
            this.particlePool.push(particle);
        }
    }
    
    // Frustum culling for better performance
    isInViewport(x, y, camera, margin = null) {
        if (!this.cullingEnabled) return true;
        
        const cullMargin = margin || this.cullingMargin;
        return x - camera.x > -cullMargin && 
               x - camera.x < canvas.width + cullMargin &&
               y - camera.y > -cullMargin && 
               y - camera.y < canvas.height + cullMargin;
    }
    
    // Batch DOM updates to avoid layout thrashing
    batchDOMUpdates(updates) {
        requestAnimationFrame(() => {
            updates.forEach(update => update());
        });
    }
    
    // Debounce function for expensive operations
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Performance monitoring display
    drawPerformanceStats(ctx, x = 10, y = 10) {
        if (!window.showPerformanceStats) return;
        
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, 200, 80);
        
        ctx.fillStyle = 'white';
        ctx.font = '12px monospace';
        ctx.fillText(`FPS: ${this.fps}`, x + 5, y + 15);
        ctx.fillText(`Avg FPS: ${Math.round(this.getAverageFPS())}`, x + 5, y + 30);
        ctx.fillText(`Render: ${this.renderTime.toFixed(1)}ms`, x + 5, y + 45);
        ctx.fillText(`Players: ${gameData?.players?.length || 0}`, x + 5, y + 60);
        ctx.fillText(`Pool: ${this.particlePool.length}/${this.maxPoolSize}`, x + 5, y + 75);
        ctx.restore();
    }
    
    // Memory cleanup
    cleanup() {
        this.fpsHistory = [];
        this.particlePool = [];
    }
}

// Optimized animation utilities
class AnimationOptimizer {
    constructor() {
        this.animations = new Map();
        this.frameSkipCounter = 0;
    }
    
    // Skip frames for non-critical animations
    shouldSkipFrame(skipRate = 2) {
        this.frameSkipCounter++;
        return this.frameSkipCounter % skipRate !== 0;
    }
    
    // Optimized sine wave calculation with lookup table
    createSineLookup(samples = 360) {
        this.sineLookup = [];
        for (let i = 0; i < samples; i++) {
            this.sineLookup[i] = Math.sin((i / samples) * Math.PI * 2);
        }
    }
    
    fastSin(angle) {
        if (!this.sineLookup) this.createSineLookup();
        const index = Math.floor((angle / (Math.PI * 2)) * this.sineLookup.length) % this.sineLookup.length;
        return this.sineLookup[Math.abs(index)];
    }
    
    // Interpolation with caching
    lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    // Easing functions
    easeOutQuad(t) {
        return t * (2 - t);
    }
    
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
}

// Global performance manager
window.performanceManager = new PerformanceManager();
window.animationOptimizer = new AnimationOptimizer();

// Initialize performance settings
window.showParticles = true;
window.showTrails = true;
window.showPerformanceStats = false; // Set to true for debugging

// Console commands for debugging
window.togglePerformanceStats = () => {
    window.showPerformanceStats = !window.showPerformanceStats;
    console.log('Performance stats:', window.showPerformanceStats ? 'ON' : 'OFF');
};

window.showFPS = false;
window.toggleFPS = () => {
    window.showFPS = !window.showFPS;
    console.log('FPS display:', window.showFPS ? 'ON' : 'OFF');
};