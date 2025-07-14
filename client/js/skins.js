// Snake Skin System for Enhanced Customization
class SkinManager {
    constructor() {
        this.availableSkins = this.defineAllSkins();
        this.unlockedSkins = this.loadUnlockedSkins();
        this.currentSkin = this.loadCurrentSkin();
        this.headDecorations = this.defineHeadDecorations();
        this.trailEffects = this.defineTrailEffects();
        this.unlockedDecorations = this.loadUnlockedDecorations();
        this.unlockedTrails = this.loadUnlockedTrails();
        this.currentDecoration = this.loadCurrentDecoration();
        this.currentTrail = this.loadCurrentTrail();
    }
    
    defineAllSkins() {
        return {
            // Basic skins (unlocked by default)
            SOLID: {
                id: 'SOLID',
                name: '단색',
                type: 'basic',
                unlockLevel: 1,
                unlockMethod: 'default',
                rarity: 'common',
                pattern: 'solid',
                colors: {
                    primary: '#FF6B6B',
                    secondary: null
                },
                description: '기본 단색 패턴'
            },
            
            // Level-based unlocks
            STRIPES: {
                id: 'STRIPES',
                name: '줄무늬',
                type: 'pattern',
                unlockLevel: 5,
                unlockMethod: 'level',
                rarity: 'common',
                pattern: 'stripes',
                colors: {
                    primary: '#4ECDC4',
                    secondary: '#45B7D1'
                },
                description: '클래식한 줄무늬 패턴'
            },
            
            DOTS: {
                id: 'DOTS',
                name: '점무늬',
                type: 'pattern',
                unlockLevel: 10,
                unlockMethod: 'level',
                rarity: 'common',
                pattern: 'dots',
                colors: {
                    primary: '#F7DC6F',
                    secondary: '#F39C12'
                },
                description: '귀여운 점무늬 패턴'
            },
            
            GRADIENT: {
                id: 'GRADIENT',
                name: '그라데이션',
                type: 'gradient',
                unlockLevel: 15,
                unlockMethod: 'level',
                rarity: 'uncommon',
                pattern: 'gradient',
                colors: {
                    primary: '#667eea',
                    secondary: '#764ba2'
                },
                description: '부드러운 그라데이션 효과'
            },
            
            DIAMOND: {
                id: 'DIAMOND',
                name: '다이아몬드',
                type: 'pattern',
                unlockLevel: 20,
                unlockMethod: 'level',
                rarity: 'uncommon',
                pattern: 'diamond',
                colors: {
                    primary: '#A29BFE',
                    secondary: '#6C5CE7'
                },
                description: '다이아몬드 모양 패턴'
            },
            
            // Achievement-based unlocks
            NEON: {
                id: 'NEON',
                name: '네온',
                type: 'special',
                unlockLevel: 25,
                unlockMethod: 'achievement',
                unlockAchievement: 'neon_master',
                rarity: 'rare',
                pattern: 'neon',
                colors: {
                    primary: '#00D4FF',
                    secondary: '#FF0080'
                },
                description: '밝게 빛나는 네온 효과',
                glowEffect: true
            },
            
            GALAXY: {
                id: 'GALAXY',
                name: '갤럭시',
                type: 'animated',
                unlockLevel: 30,
                unlockMethod: 'achievement',
                unlockAchievement: 'cosmic_explorer',
                rarity: 'epic',
                pattern: 'galaxy',
                colors: {
                    primary: '#2C3E50',
                    secondary: '#8E44AD',
                    tertiary: '#F39C12'
                },
                description: '우주 같은 신비로운 패턴',
                animated: true
            },
            
            FIRE: {
                id: 'FIRE',
                name: '불꽃',
                type: 'animated',
                unlockLevel: 35,
                unlockMethod: 'achievement',
                unlockAchievement: 'hot_streak',
                rarity: 'epic',
                pattern: 'fire',
                colors: {
                    primary: '#FF4757',
                    secondary: '#FF6B35',
                    tertiary: '#FFD23F'
                },
                description: '타오르는 불꽃 효과',
                animated: true,
                glowEffect: true
            },
            
            // Premium/Shop skins
            RAINBOW: {
                id: 'RAINBOW',
                name: '무지개',
                type: 'premium',
                unlockLevel: 1,
                unlockMethod: 'shop',
                price: 5000,
                rarity: 'legendary',
                pattern: 'rainbow',
                colors: {
                    primary: '#FF0000',
                    secondary: '#00FF00',
                    tertiary: '#0000FF'
                },
                description: '아름다운 무지개 색상',
                animated: true
            },
            
            GOLDEN: {
                id: 'GOLDEN',
                name: '황금',
                type: 'premium',
                unlockLevel: 40,
                unlockMethod: 'shop',
                price: 10000,
                rarity: 'legendary',
                pattern: 'metallic',
                colors: {
                    primary: '#FFD700',
                    secondary: '#FFA500'
                },
                description: '고급스러운 황금 광택',
                glowEffect: true,
                metallic: true
            },
            
            SHADOW: {
                id: 'SHADOW',
                name: '그림자',
                type: 'special',
                unlockLevel: 50,
                unlockMethod: 'secret',
                rarity: 'mythic',
                pattern: 'shadow',
                colors: {
                    primary: '#2C2C2C',
                    secondary: '#404040'
                },
                description: '신비로운 그림자 효과',
                special: true
            }
        };
    }
    
    defineHeadDecorations() {
        return {
            NONE: {
                id: 'NONE',
                name: '없음',
                icon: '',
                unlockLevel: 1,
                rarity: 'common'
            },
            HAT: {
                id: 'HAT',
                name: '모자',
                icon: '🎩',
                unlockLevel: 8,
                rarity: 'common'
            },
            CROWN: {
                id: 'CROWN',
                name: '왕관',
                icon: '👑',
                unlockLevel: 25,
                rarity: 'rare'
            },
            SUNGLASSES: {
                id: 'SUNGLASSES',
                name: '선글라스',
                icon: '🕶️',
                unlockLevel: 12,
                rarity: 'uncommon'
            },
            HORNS: {
                id: 'HORNS',
                name: '뿔',
                icon: '🐂',
                unlockLevel: 18,
                rarity: 'uncommon'
            }
        };
    }
    
    defineTrailEffects() {
        return {
            NONE: {
                id: 'NONE',
                name: '없음',
                effect: 'none',
                unlockLevel: 1,
                rarity: 'common'
            },
            SPARKLES: {
                id: 'SPARKLES',
                name: '반짝임',
                effect: 'sparkles',
                unlockLevel: 15,
                rarity: 'uncommon',
                particles: '✨'
            },
            FIRE_TRAIL: {
                id: 'FIRE_TRAIL',
                name: '불꽃 흔적',
                effect: 'fire',
                unlockLevel: 30,
                rarity: 'rare',
                particles: '🔥'
            },
            RAINBOW_TRAIL: {
                id: 'RAINBOW_TRAIL',
                name: '무지개 흔적',
                effect: 'rainbow',
                unlockLevel: 40,
                rarity: 'epic',
                animated: true
            }
        };
    }
    
    loadUnlockedSkins() {
        const saved = localStorage.getItem('unlockedSkins');
        if (saved) {
            try {
                return new Set(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load unlocked skins:', e);
            }
        }
        return new Set(['SOLID']); // Default unlocked skin
    }
    
    loadCurrentSkin() {
        return localStorage.getItem('currentSkin') || 'SOLID';
    }
    
    loadUnlockedDecorations() {
        const saved = localStorage.getItem('unlockedDecorations');
        if (saved) {
            try {
                return new Set(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load unlocked decorations:', e);
            }
        }
        return new Set(['NONE']);
    }
    
    loadCurrentDecoration() {
        return localStorage.getItem('currentDecoration') || 'NONE';
    }
    
    loadUnlockedTrails() {
        const saved = localStorage.getItem('unlockedTrails');
        if (saved) {
            try {
                return new Set(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load unlocked trails:', e);
            }
        }
        return new Set(['NONE']);
    }
    
    loadCurrentTrail() {
        return localStorage.getItem('currentTrail') || 'NONE';
    }
    
    saveUnlockedSkins() {
        localStorage.setItem('unlockedSkins', JSON.stringify([...this.unlockedSkins]));
    }
    
    saveCurrentSkin() {
        localStorage.setItem('currentSkin', this.currentSkin);
    }
    
    saveUnlockedDecorations() {
        localStorage.setItem('unlockedDecorations', JSON.stringify([...this.unlockedDecorations]));
    }
    
    saveCurrentDecoration() {
        localStorage.setItem('currentDecoration', this.currentDecoration);
    }
    
    saveUnlockedTrails() {
        localStorage.setItem('unlockedTrails', JSON.stringify([...this.unlockedTrails]));
    }
    
    saveCurrentTrail() {
        localStorage.setItem('currentTrail', this.currentTrail);
    }
    
    unlockSkin(skinId, reason = '') {
        if (this.availableSkins[skinId] && !this.unlockedSkins.has(skinId)) {
            this.unlockedSkins.add(skinId);
            this.saveUnlockedSkins();
            this.showUnlockNotification(this.availableSkins[skinId], 'skin', reason);
            return true;
        }
        return false;
    }
    
    unlockDecoration(decorationId, reason = '') {
        if (this.headDecorations[decorationId] && !this.unlockedDecorations.has(decorationId)) {
            this.unlockedDecorations.add(decorationId);
            this.saveUnlockedDecorations();
            this.showUnlockNotification(this.headDecorations[decorationId], 'decoration', reason);
            return true;
        }
        return false;
    }
    
    unlockTrail(trailId, reason = '') {
        if (this.trailEffects[trailId] && !this.unlockedTrails.has(trailId)) {
            this.unlockedTrails.add(trailId);
            this.saveUnlockedTrails();
            this.showUnlockNotification(this.trailEffects[trailId], 'trail', reason);
            return true;
        }
        return false;
    }
    
    selectSkin(skinId) {
        if (this.unlockedSkins.has(skinId)) {
            this.currentSkin = skinId;
            this.saveCurrentSkin();
            return true;
        }
        return false;
    }
    
    selectDecoration(decorationId) {
        if (this.unlockedDecorations.has(decorationId)) {
            this.currentDecoration = decorationId;
            this.saveCurrentDecoration();
            return true;
        }
        return false;
    }
    
    selectTrail(trailId) {
        if (this.unlockedTrails.has(trailId)) {
            this.currentTrail = trailId;
            this.saveCurrentTrail();
            return true;
        }
        return false;
    }
    
    checkLevelUnlocks(level) {
        let newUnlocks = [];
        
        // Check skin unlocks
        Object.values(this.availableSkins).forEach(skin => {
            if (skin.unlockMethod === 'level' && 
                skin.unlockLevel <= level && 
                !this.unlockedSkins.has(skin.id)) {
                if (this.unlockSkin(skin.id, `레벨 ${level} 달성`)) {
                    newUnlocks.push({type: 'skin', item: skin});
                }
            }
        });
        
        // Check decoration unlocks
        Object.values(this.headDecorations).forEach(decoration => {
            if (decoration.unlockLevel <= level && 
                !this.unlockedDecorations.has(decoration.id)) {
                if (this.unlockDecoration(decoration.id, `레벨 ${level} 달성`)) {
                    newUnlocks.push({type: 'decoration', item: decoration});
                }
            }
        });
        
        // Check trail unlocks
        Object.values(this.trailEffects).forEach(trail => {
            if (trail.unlockLevel <= level && 
                !this.unlockedTrails.has(trail.id)) {
                if (this.unlockTrail(trail.id, `레벨 ${level} 달성`)) {
                    newUnlocks.push({type: 'trail', item: trail});
                }
            }
        });
        
        return newUnlocks;
    }
    
    showUnlockNotification(item, type, reason) {
        const notification = document.createElement('div');
        notification.className = 'skin-unlock-notification';
        
        const typeText = {
            'skin': '스킨',
            'decoration': '장식',
            'trail': '흔적 효과'
        }[type];
        
        notification.innerHTML = `
            <div class="unlock-content">
                <div class="unlock-header">🎉 새로운 ${typeText} 해금! 🎉</div>
                <div class="unlock-item">
                    ${item.icon || '🎨'} ${item.name}
                </div>
                <div class="unlock-reason">${reason}</div>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            z-index: 10000;
            animation: unlockPulse 0.8s ease-out;
            box-shadow: 0 0 30px rgba(102, 126, 234, 0.8);
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        
        // Add styles if not already added
        if (!document.querySelector('style[data-skin-styles]')) {
            const style = document.createElement('style');
            style.setAttribute('data-skin-styles', 'true');
            style.textContent = `
                @keyframes unlockPulse {
                    0% {
                        transform: translate(-50%, -50%) scale(0.5);
                        opacity: 0;
                    }
                    50% {
                        transform: translate(-50%, -50%) scale(1.1);
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 1;
                    }
                }
                
                .unlock-header {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                
                .unlock-item {
                    font-size: 16px;
                    margin-bottom: 8px;
                }
                
                .unlock-reason {
                    font-size: 14px;
                    opacity: 0.8;
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Play unlock sound
        if (window.soundManager) {
            window.soundManager.playVictory();
        }
        
        // Remove after animation
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.5s ease-out forwards';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
    
    getCurrentSkinData() {
        return this.availableSkins[this.currentSkin] || this.availableSkins.SOLID;
    }
    
    getCurrentDecorationData() {
        return this.headDecorations[this.currentDecoration] || this.headDecorations.NONE;
    }
    
    getCurrentTrailData() {
        return this.trailEffects[this.currentTrail] || this.trailEffects.NONE;
    }
    
    getUnlockedSkinsList() {
        return [...this.unlockedSkins].map(id => this.availableSkins[id]).filter(Boolean);
    }
    
    getUnlockedDecorationsList() {
        return [...this.unlockedDecorations].map(id => this.headDecorations[id]).filter(Boolean);
    }
    
    getUnlockedTrailsList() {
        return [...this.unlockedTrails].map(id => this.trailEffects[id]).filter(Boolean);
    }
}

// Create global skin manager
window.skinManager = new SkinManager();