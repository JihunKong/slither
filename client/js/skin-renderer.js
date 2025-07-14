// Snake Skin Rendering System
class SkinRenderer {
    constructor() {
        this.particleTrails = new Map(); // playerId -> trail particles
    }
    
    // Main method to render a snake with skin
    renderSnakeWithSkin(ctx, snake, camera, skinData, decorationData, trailData) {
        if (!snake || !snake.segments || snake.segments.length === 0) return;
        
        // Render trail effects first (behind snake)
        if (trailData && trailData.id !== 'NONE') {
            this.renderTrailEffect(ctx, snake, camera, trailData);
        }
        
        // Render snake body with skin pattern
        this.renderSnakeBody(ctx, snake, camera, skinData);
        
        // Render head decoration
        if (decorationData && decorationData.id !== 'NONE') {
            this.renderHeadDecoration(ctx, snake, camera, decorationData);
        }
    }
    
    renderSnakeBody(ctx, snake, camera, skinData) {
        const segments = snake.segments;
        const pattern = skinData.pattern;
        
        ctx.save();
        
        // Apply glow effect if skin has it
        if (skinData.glowEffect) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = skinData.colors.primary;
        }
        
        // Render each segment
        for (let i = segments.length - 1; i >= 0; i--) {
            const segment = segments[i];
            const x = segment.x - camera.x;
            const y = segment.y - camera.y;
            const isHead = i === 0;
            const radius = isHead ? 8 : 6;
            
            // Apply pattern-specific rendering
            switch (pattern) {
                case 'solid':
                    this.renderSolidPattern(ctx, x, y, radius, skinData.colors);
                    break;
                case 'stripes':
                    this.renderStripesPattern(ctx, x, y, radius, skinData.colors, i);
                    break;
                case 'dots':
                    this.renderDotsPattern(ctx, x, y, radius, skinData.colors, i);
                    break;
                case 'gradient':
                    this.renderGradientPattern(ctx, x, y, radius, skinData.colors);
                    break;
                case 'diamond':
                    this.renderDiamondPattern(ctx, x, y, radius, skinData.colors, i);
                    break;
                case 'neon':
                    this.renderNeonPattern(ctx, x, y, radius, skinData.colors);
                    break;
                case 'galaxy':
                    this.renderGalaxyPattern(ctx, x, y, radius, skinData.colors);
                    break;
                case 'fire':
                    this.renderFirePattern(ctx, x, y, radius, skinData.colors);
                    break;
                case 'rainbow':
                    this.renderRainbowPattern(ctx, x, y, radius, i);
                    break;
                case 'metallic':
                    this.renderMetallicPattern(ctx, x, y, radius, skinData.colors);
                    break;
                case 'shadow':
                    this.renderShadowPattern(ctx, x, y, radius, skinData.colors);
                    break;
                default:
                    this.renderSolidPattern(ctx, x, y, radius, skinData.colors);
            }
            
            // Add special effects for head
            if (isHead) {
                this.renderSnakeHead(ctx, x, y, radius, snake, skinData);
            }
        }
        
        ctx.restore();
    }
    
    renderSolidPattern(ctx, x, y, radius, colors) {
        ctx.fillStyle = colors.primary;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add border
        ctx.strokeStyle = this.darkenColor(colors.primary, 0.3);
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    renderStripesPattern(ctx, x, y, radius, colors, segmentIndex) {
        // Alternate colors based on segment index
        const isStripe = Math.floor(segmentIndex / 2) % 2 === 0;
        const fillColor = isStripe ? colors.primary : colors.secondary;
        
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = this.darkenColor(fillColor, 0.3);
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    renderDotsPattern(ctx, x, y, radius, colors, segmentIndex) {
        // Base color
        ctx.fillStyle = colors.primary;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add dots
        if (segmentIndex % 3 === 0) {
            ctx.fillStyle = colors.secondary;
            ctx.beginPath();
            ctx.arc(x - 2, y - 2, 2, 0, Math.PI * 2);
            ctx.arc(x + 2, y + 2, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.strokeStyle = this.darkenColor(colors.primary, 0.3);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    renderGradientPattern(ctx, x, y, radius, colors) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, colors.primary);
        gradient.addColorStop(1, colors.secondary);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderDiamondPattern(ctx, x, y, radius, colors, segmentIndex) {
        ctx.fillStyle = colors.primary;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add diamond shape overlay
        if (segmentIndex % 4 === 0) {
            ctx.fillStyle = colors.secondary;
            ctx.beginPath();
            ctx.moveTo(x, y - 4);
            ctx.lineTo(x + 3, y);
            ctx.lineTo(x, y + 4);
            ctx.lineTo(x - 3, y);
            ctx.closePath();
            ctx.fill();
        }
    }
    
    renderNeonPattern(ctx, x, y, radius, colors) {
        // Multiple glow layers for neon effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = colors.secondary;
        
        ctx.fillStyle = colors.primary;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner glow
        ctx.shadowBlur = 10;
        ctx.fillStyle = colors.secondary;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderGalaxyPattern(ctx, x, y, radius, colors) {
        // Animated galaxy effect
        const time = Date.now() * 0.002;
        const rotation = time + x * 0.01;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        gradient.addColorStop(0, colors.primary);
        gradient.addColorStop(0.5, colors.secondary);
        gradient.addColorStop(1, colors.tertiary);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add sparkle effect
        ctx.fillStyle = 'white';
        for (let i = 0; i < 3; i++) {
            const angle = (time + i * Math.PI * 2 / 3) % (Math.PI * 2);
            const sparkleX = Math.cos(angle) * radius * 0.7;
            const sparkleY = Math.sin(angle) * radius * 0.7;
            ctx.beginPath();
            ctx.arc(sparkleX, sparkleY, 1, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    renderFirePattern(ctx, x, y, radius, colors) {
        const time = Date.now() * 0.01;
        
        // Base fire color
        ctx.fillStyle = colors.primary;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Animated flame effect
        ctx.fillStyle = colors.secondary;
        const flameOffset = Math.sin(time + x * 0.1) * 2;
        ctx.beginPath();
        ctx.arc(x + flameOffset, y, radius * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner flame
        ctx.fillStyle = colors.tertiary;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderRainbowPattern(ctx, x, y, radius, segmentIndex) {
        const time = Date.now() * 0.002;
        const hue = ((time + segmentIndex * 30) % 360);
        const color = `hsl(${hue}, 80%, 60%)`;
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderMetallicPattern(ctx, x, y, radius, colors) {
        // Metallic gradient with highlight
        const gradient = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
        gradient.addColorStop(0, this.lightenColor(colors.primary, 0.3));
        gradient.addColorStop(0.3, colors.primary);
        gradient.addColorStop(0.7, colors.secondary);
        gradient.addColorStop(1, this.darkenColor(colors.secondary, 0.2));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Metallic highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(x - 2, y - 2, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderShadowPattern(ctx, x, y, radius, colors) {
        // Shadow effect with transparency
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = colors.primary;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Shadow outline
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = colors.secondary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius + 1, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.globalAlpha = 1;
    }
    
    renderSnakeHead(ctx, x, y, radius, snake, skinData) {
        // Add eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x - 3, y - 2, 2, 0, Math.PI * 2);
        ctx.arc(x + 3, y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye pupils
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(x - 3, y - 2, 1, 0, Math.PI * 2);
        ctx.arc(x + 3, y - 2, 1, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderHeadDecoration(ctx, snake, camera, decorationData) {
        if (!snake.segments || snake.segments.length === 0) return;
        
        const head = snake.segments[0];
        const x = head.x - camera.x;
        const y = head.y - camera.y;
        
        ctx.save();
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(decorationData.icon, x, y - 15);
        ctx.restore();
    }
    
    renderTrailEffect(ctx, snake, camera, trailData) {
        if (!snake.segments || snake.segments.length === 0) return;
        
        const playerId = snake.id;
        
        switch (trailData.effect) {
            case 'sparkles':
                this.renderSparkleTrail(ctx, snake, camera, playerId);
                break;
            case 'fire':
                this.renderFireTrail(ctx, snake, camera, playerId);
                break;
            case 'rainbow':
                this.renderRainbowTrail(ctx, snake, camera);
                break;
        }
    }
    
    renderSparkleTrail(ctx, snake, camera, playerId) {
        // Add sparkle particles behind snake
        const head = snake.segments[0];
        
        if (!this.particleTrails.has(playerId)) {
            this.particleTrails.set(playerId, []);
        }
        
        const particles = this.particleTrails.get(playerId);
        
        // Add new particle
        if (Math.random() < 0.3) {
            particles.push({
                x: head.x + (Math.random() - 0.5) * 10,
                y: head.y + (Math.random() - 0.5) * 10,
                life: 1.0,
                size: Math.random() * 3 + 1
            });
        }
        
        // Update and render particles
        ctx.save();
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            particle.life -= 0.02;
            
            if (particle.life <= 0) {
                particles.splice(i, 1);
                continue;
            }
            
            const x = particle.x - camera.x;
            const y = particle.y - camera.y;
            
            ctx.globalAlpha = particle.life;
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(x, y, particle.size * particle.life, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        
        // Clean up old particles
        if (particles.length > 50) {
            particles.splice(0, particles.length - 50);
        }
    }
    
    renderFireTrail(ctx, snake, camera, playerId) {
        // Similar to sparkle but with fire colors
        const head = snake.segments[0];
        
        if (!this.particleTrails.has(playerId)) {
            this.particleTrails.set(playerId, []);
        }
        
        const particles = this.particleTrails.get(playerId);
        
        if (Math.random() < 0.4) {
            particles.push({
                x: head.x + (Math.random() - 0.5) * 8,
                y: head.y + (Math.random() - 0.5) * 8,
                life: 1.0,
                size: Math.random() * 4 + 2,
                color: Math.random() > 0.5 ? '#FF4757' : '#FF6B35'
            });
        }
        
        ctx.save();
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            particle.life -= 0.03;
            
            if (particle.life <= 0) {
                particles.splice(i, 1);
                continue;
            }
            
            const x = particle.x - camera.x;
            const y = particle.y - camera.y;
            
            ctx.globalAlpha = particle.life;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(x, y, particle.size * particle.life, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
    
    renderRainbowTrail(ctx, snake, camera) {
        // Rainbow trail effect
        const segments = snake.segments;
        for (let i = 1; i < Math.min(segments.length, 10); i++) {
            const segment = segments[i];
            const x = segment.x - camera.x;
            const y = segment.y - camera.y;
            const alpha = 1 - (i / 10);
            
            ctx.save();
            ctx.globalAlpha = alpha * 0.5;
            const hue = (Date.now() * 0.1 + i * 30) % 360;
            ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
            ctx.beginPath();
            ctx.arc(x, y, 8 - i * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    
    // Utility color functions
    lightenColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * amount * 100);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
    
    darkenColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * amount * 100);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
            (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
            (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
    }
}

// Create global skin renderer
window.skinRenderer = new SkinRenderer();