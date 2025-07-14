// Power-up System for Snake Game
class PowerUpManager {
    constructor() {
        this.activePowerUps = new Map(); // playerId -> active power-ups
        this.powerUpTypes = this.definePowerUps();
    }
    
    definePowerUps() {
        return {
            SPEED_BOOST: {
                id: 'SPEED_BOOST',
                name: '스피드 부스트',
                icon: '⚡',
                color: '#FFD700',
                duration: 10000, // 10 seconds
                effect: {
                    speedMultiplier: 1.5
                },
                description: '10초간 속도 1.5배 증가'
            },
            SHIELD: {
                id: 'SHIELD',
                name: '보호막',
                icon: '🛡️',
                color: '#4CAF50',
                duration: 15000, // 15 seconds
                effect: {
                    invincible: true
                },
                description: '15초간 무적 상태'
            },
            MAGNET: {
                id: 'MAGNET',
                name: '자석',
                icon: '🧲',
                color: '#2196F3',
                duration: 20000, // 20 seconds
                effect: {
                    magnetRange: 50
                },
                description: '20초간 주변 먹이 끌어당김'
            },
            GHOST: {
                id: 'GHOST',
                name: '유령 모드',
                icon: '👻',
                color: '#9C27B0',
                duration: 8000, // 8 seconds
                effect: {
                    ghost: true
                },
                description: '8초간 다른 뱀 통과 가능'
            },
            MEGA_GROWTH: {
                id: 'MEGA_GROWTH',
                name: '메가 성장',
                icon: '🌟',
                color: '#FF6B6B',
                duration: 0, // instant
                effect: {
                    instantGrowth: 5
                },
                description: '즉시 5개 세그먼트 추가'
            },
            SCORE_MULTIPLIER: {
                id: 'SCORE_MULTIPLIER',
                name: '점수 배율',
                icon: '💰',
                color: '#F39C12',
                duration: 30000, // 30 seconds
                effect: {
                    scoreMultiplier: 2
                },
                description: '30초간 점수 2배'
            },
            SHRINK: {
                id: 'SHRINK',
                name: '축소',
                icon: '🔻',
                color: '#E74C3C',
                duration: 15000, // 15 seconds
                effect: {
                    sizeMultiplier: 0.7
                },
                description: '15초간 크기 30% 감소 (회피 용이)'
            },
            FREEZE_FIELD: {
                id: 'FREEZE_FIELD',
                name: '동결 필드',
                icon: '❄️',
                color: '#00BCD4',
                duration: 5000, // 5 seconds
                effect: {
                    freezeRadius: 100,
                    freezeSlowdown: 0.5
                },
                description: '5초간 주변 적 속도 50% 감소'
            },
            TELEPORT: {
                id: 'TELEPORT',
                name: '순간이동',
                icon: '🌀',
                color: '#9B59B6',
                duration: 0, // instant
                effect: {
                    teleport: true
                },
                description: '무작위 안전한 위치로 순간이동'
            },
            XRAY_VISION: {
                id: 'XRAY_VISION',
                name: '투시',
                icon: '👁️',
                color: '#34495E',
                duration: 15000, // 15 seconds
                effect: {
                    xrayVision: true
                },
                description: '15초간 다른 뱀과 장애물을 투시'
            },
            TIME_SLOW: {
                id: 'TIME_SLOW',
                name: '시간 정지',
                icon: '⏰',
                color: '#8E44AD',
                duration: 8000, // 8 seconds
                effect: {
                    timeSlow: true,
                    slowFactor: 0.3
                },
                description: '8초간 다른 플레이어 시간 70% 감소'
            },
            CLONE: {
                id: 'CLONE',
                name: '분신술',
                icon: '👥',
                color: '#16A085',
                duration: 12000, // 12 seconds
                effect: {
                    hasClone: true
                },
                description: '12초간 분신 생성 (적 혼란 유발)'
            },
            TREASURE_DETECTOR: {
                id: 'TREASURE_DETECTOR',
                name: '보물 탐지',
                icon: '🔍',
                color: '#F39C12',
                duration: 25000, // 25 seconds
                effect: {
                    treasureDetector: true,
                    detectionRadius: 150
                },
                description: '25초간 주변 먹이와 파워업 위치 표시'
            }
        };
    }
    
    activatePowerUp(playerId, powerUpId) {
        const powerUp = this.powerUpTypes[powerUpId];
        if (!powerUp) return;
        
        if (!this.activePowerUps.has(playerId)) {
            this.activePowerUps.set(playerId, []);
        }
        
        const playerPowerUps = this.activePowerUps.get(playerId);
        
        // Check if same power-up is already active
        const existingIndex = playerPowerUps.findIndex(p => p.id === powerUpId);
        if (existingIndex >= 0) {
            // Refresh duration
            playerPowerUps[existingIndex].endTime = Date.now() + powerUp.duration;
            return;
        }
        
        // Add new power-up
        const activePowerUp = {
            ...powerUp,
            startTime: Date.now(),
            endTime: Date.now() + powerUp.duration
        };
        
        playerPowerUps.push(activePowerUp);
        
        // Show activation notification
        this.showActivationNotification(powerUp);
        
        // Play sound
        if (window.soundManager) {
            window.soundManager.playClick(); // Could add specific power-up sound
        }
        
        // Handle instant effects
        if (powerUpId === 'MEGA_GROWTH') {
            this.applyInstantGrowth(playerId, powerUp.effect.instantGrowth);
        } else if (powerUpId === 'TELEPORT') {
            this.applyInstantTeleport(playerId);
        }
        
        // Schedule removal if duration-based
        if (powerUp.duration > 0) {
            setTimeout(() => {
                this.removePowerUp(playerId, powerUpId);
            }, powerUp.duration);
        }
    }
    
    removePowerUp(playerId, powerUpId) {
        const playerPowerUps = this.activePowerUps.get(playerId);
        if (!playerPowerUps) return;
        
        const index = playerPowerUps.findIndex(p => p.id === powerUpId);
        if (index >= 0) {
            playerPowerUps.splice(index, 1);
        }
        
        if (playerPowerUps.length === 0) {
            this.activePowerUps.delete(playerId);
        }
    }
    
    getActivePowerUps(playerId) {
        const playerPowerUps = this.activePowerUps.get(playerId) || [];
        const now = Date.now();
        
        // Filter out expired power-ups
        const active = playerPowerUps.filter(p => {
            if (p.duration === 0) return false; // Instant power-ups
            return p.endTime > now;
        });
        
        this.activePowerUps.set(playerId, active);
        return active;
    }
    
    getActiveEffects(playerId) {
        const activePowerUps = this.getActivePowerUps(playerId);
        const effects = {
            speedMultiplier: 1,
            invincible: false,
            magnetRange: 0,
            ghost: false,
            scoreMultiplier: 1,
            sizeMultiplier: 1,
            freezeRadius: 0,
            freezeSlowdown: 1,
            teleport: false,
            xrayVision: false,
            timeSlow: false,
            slowFactor: 1,
            hasClone: false,
            treasureDetector: false,
            detectionRadius: 0
        };
        
        // Combine all active effects
        activePowerUps.forEach(powerUp => {
            Object.keys(powerUp.effect).forEach(key => {
                if (key === 'speedMultiplier' || key === 'scoreMultiplier' || key === 'sizeMultiplier') {
                    effects[key] *= powerUp.effect[key];
                } else if (key === 'invincible' || key === 'ghost' || key === 'teleport' || key === 'xrayVision' || 
                          key === 'timeSlow' || key === 'hasClone' || key === 'treasureDetector') {
                    effects[key] = effects[key] || powerUp.effect[key];
                } else if (key === 'magnetRange' || key === 'freezeRadius' || key === 'detectionRadius') {
                    effects[key] = Math.max(effects[key], powerUp.effect[key]);
                } else if (key === 'freezeSlowdown' || key === 'slowFactor') {
                    effects[key] = Math.min(effects[key], powerUp.effect[key]);
                }
            });
        });
        
        return effects;
    }
    
    showActivationNotification(powerUp) {
        const notification = document.createElement('div');
        notification.className = 'powerup-notification';
        notification.innerHTML = `
            <div class="powerup-icon">${powerUp.icon}</div>
            <div class="powerup-info">
                <div class="powerup-name">${powerUp.name}</div>
                <div class="powerup-desc">${powerUp.description}</div>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            bottom: 150px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, ${powerUp.color}88, ${powerUp.color}CC);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 15px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            animation: powerUpBounce 0.5s ease-out;
            border: 2px solid ${powerUp.color};
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes powerUpBounce {
                0% {
                    transform: translateX(-50%) translateY(100px);
                    opacity: 0;
                }
                60% {
                    transform: translateX(-50%) translateY(-20px);
                }
                100% {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }
            
            .powerup-icon {
                font-size: 30px;
                filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.5));
            }
            
            .powerup-info {
                text-align: left;
            }
            
            .powerup-name {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 2px;
            }
            
            .powerup-desc {
                font-size: 14px;
                opacity: 0.9;
            }
        `;
        
        if (!document.querySelector('style[data-powerup-styles]')) {
            style.setAttribute('data-powerup-styles', 'true');
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Remove after animation
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => notification.remove(), 300);
        }, 2500);
    }
    
    applyInstantGrowth(playerId, segments) {
        // This would need to be handled by the game logic
        if (window.socket && window.socket.connected) {
            window.socket.emit('instantGrowth', segments);
        }
    }
    
    applyInstantTeleport(playerId) {
        // This would need to be handled by the game logic
        if (window.socket && window.socket.connected) {
            window.socket.emit('requestTeleport');
        }
    }
    
    drawPowerUpUI(ctx, player, camera) {
        const activePowerUps = this.getActivePowerUps(player.id);
        if (activePowerUps.length === 0) return;
        
        // Draw active power-up indicators above player
        const head = player.segments[0];
        const x = head.x - camera.x;
        const y = head.y - camera.y - 30;
        
        activePowerUps.forEach((powerUp, index) => {
            const iconX = x + (index - activePowerUps.length / 2) * 25;
            const iconY = y;
            
            // Draw power-up icon
            ctx.save();
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(powerUp.icon, iconX, iconY);
            
            // Draw duration bar if applicable
            if (powerUp.duration > 0) {
                const now = Date.now();
                const progress = (powerUp.endTime - now) / powerUp.duration;
                
                ctx.fillStyle = powerUp.color;
                ctx.fillRect(iconX - 10, iconY + 5, 20 * progress, 3);
                
                ctx.strokeStyle = powerUp.color;
                ctx.strokeRect(iconX - 10, iconY + 5, 20, 3);
            }
            
            ctx.restore();
        });
    }
    
    // Draw power-up effects (성능 최적화)
    drawEffects(ctx, player, camera, effects) {
        // 성능을 위해 화면 밖이면 렌더링 생략
        const head = player.segments[0];
        if (!window.performanceManager.isInViewport(head.x, head.y, camera, 50)) {
            return;
        }
        
        const x = head.x - camera.x;
        const y = head.y - camera.y;
        
        // Shield effect
        if (effects.invincible) {
            ctx.save();
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#4CAF50';
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.2;
            ctx.beginPath();
            ctx.arc(x, y, 25, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        
        // Ghost effect
        if (effects.ghost) {
            ctx.save();
            ctx.globalAlpha = 0.5;
            // Player will be drawn with this alpha
        }
        
        // Magnet effect
        if (effects.magnetRange > 0) {
            ctx.save();
            ctx.strokeStyle = '#2196F3';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(x, y, effects.magnetRange, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        
        // Freeze field effect
        if (effects.freezeRadius > 0) {
            ctx.save();
            ctx.fillStyle = '#00BCD4';
            ctx.globalAlpha = 0.1;
            ctx.beginPath();
            ctx.arc(x, y, effects.freezeRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Snowflakes
            for (let i = 0; i < 5; i++) {
                const angle = (Date.now() * 0.001 + i * Math.PI * 2 / 5) % (Math.PI * 2);
                const snowX = x + Math.cos(angle) * effects.freezeRadius * 0.8;
                const snowY = y + Math.sin(angle) * effects.freezeRadius * 0.8;
                
                ctx.fillStyle = 'white';
                ctx.globalAlpha = 0.6;
                ctx.font = '16px Arial';
                ctx.fillText('❄️', snowX, snowY);
            }
            ctx.restore();
        }
        
        // X-ray vision effect
        if (effects.xrayVision) {
            ctx.save();
            ctx.strokeStyle = '#34495E';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(x, y, 30, 0, Math.PI * 2);
            ctx.stroke();
            
            // Eye icon
            ctx.globalAlpha = 1;
            ctx.font = '20px Arial';
            ctx.fillStyle = '#34495E';
            ctx.textAlign = 'center';
            ctx.fillText('👁️', x, y - 40);
            ctx.restore();
        }
        
        // Time slow effect
        if (effects.timeSlow) {
            ctx.save();
            ctx.strokeStyle = '#8E44AD';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.01) * 0.2;
            ctx.beginPath();
            for (let i = 0; i < 3; i++) {
                ctx.arc(x, y, 25 + i * 10, 0, Math.PI * 2);
            }
            ctx.stroke();
            ctx.restore();
        }
        
        // Clone effect indicator
        if (effects.hasClone) {
            ctx.save();
            ctx.fillStyle = '#16A085';
            ctx.globalAlpha = 0.3;
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('👥', x + 25, y - 25);
            ctx.restore();
        }
        
        // Treasure detector effect
        if (effects.treasureDetector && effects.detectionRadius > 0) {
            ctx.save();
            ctx.strokeStyle = '#F39C12';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.3;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.arc(x, y, effects.detectionRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Radar sweep effect
            const sweepAngle = (Date.now() * 0.003) % (Math.PI * 2);
            ctx.strokeStyle = '#F39C12';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(
                x + Math.cos(sweepAngle) * effects.detectionRadius,
                y + Math.sin(sweepAngle) * effects.detectionRadius
            );
            ctx.stroke();
            ctx.restore();
        }
    }
}

// Create global power-up manager
window.powerUpManager = new PowerUpManager();