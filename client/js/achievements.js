// Achievement System for Snake Game
class AchievementManager {
    constructor() {
        this.achievements = this.defineAchievements();
        this.unlockedAchievements = new Set();
        this.loadUnlocked();
        this.checkQueue = [];
        this.isShowingNotification = false;
    }
    
    defineAchievements() {
        return {
            // Beginner achievements
            FIRST_FOOD: {
                id: 'FIRST_FOOD',
                name: '첫 식사',
                description: '첫 먹이를 먹으세요',
                icon: '🍎',
                xp: 50,
                condition: (stats) => stats.totalFoodEaten >= 1
            },
            FIRST_KILL: {
                id: 'FIRST_KILL',
                name: '첫 처치',
                description: '다른 뱀을 처음으로 처치하세요',
                icon: '⚔️',
                xp: 100,
                condition: (stats) => stats.totalKills >= 1
            },
            FIRST_WIN: {
                id: 'FIRST_WIN',
                name: '첫 승리',
                description: '게임에서 처음으로 승리하세요',
                icon: '🏆',
                xp: 200,
                condition: (stats) => stats.totalWins >= 1
            },
            
            // Score achievements
            SCORE_1000: {
                id: 'SCORE_1000',
                name: '점수 마스터',
                description: '한 게임에서 1,000점 달성',
                icon: '💯',
                xp: 100,
                condition: (stats) => stats.highScore >= 1000
            },
            SCORE_5000: {
                id: 'SCORE_5000',
                name: '점수 전문가',
                description: '한 게임에서 5,000점 달성',
                icon: '🌟',
                xp: 200,
                condition: (stats) => stats.highScore >= 5000
            },
            SCORE_10000: {
                id: 'SCORE_10000',
                name: '점수 전설',
                description: '한 게임에서 10,000점 달성',
                icon: '👑',
                xp: 500,
                condition: (stats) => stats.highScore >= 10000
            },
            
            // Food achievements
            FOOD_100: {
                id: 'FOOD_100',
                name: '대식가',
                description: '총 100개의 먹이 먹기',
                icon: '🍕',
                xp: 150,
                condition: (stats) => stats.totalFoodEaten >= 100
            },
            FOOD_500: {
                id: 'FOOD_500',
                name: '먹방 스타',
                description: '총 500개의 먹이 먹기',
                icon: '🍔',
                xp: 300,
                condition: (stats) => stats.totalFoodEaten >= 500
            },
            FOOD_CHAIN: {
                id: 'FOOD_CHAIN',
                name: '연속 포식자',
                description: '한 게임에서 30개 이상 먹기',
                icon: '🔥',
                xp: 200,
                condition: (stats, session) => session && session.foodEaten >= 30
            },
            
            // Combat achievements
            SURVIVOR: {
                id: 'SURVIVOR',
                name: '생존왕',
                description: '5분 이상 생존하기',
                icon: '🛡️',
                xp: 150,
                condition: (stats, session) => session && session.survivalTime >= 300
            },
            PACIFIST: {
                id: 'PACIFIST',
                name: '평화주의자',
                description: '아무도 죽이지 않고 5,000점 달성',
                icon: '🕊️',
                xp: 300,
                condition: (stats, session) => session && session.score >= 5000 && session.kills === 0
            },
            GIANT_SLAYER: {
                id: 'GIANT_SLAYER',
                name: '거인 사냥꾼',
                description: '자신보다 2배 큰 뱀 처치',
                icon: '🗡️',
                xp: 250,
                special: true
            },
            
            // Speed achievements
            SPEED_DEMON: {
                id: 'SPEED_DEMON',
                name: '스피드 악마',
                description: '부스트로 10초 연속 이동',
                icon: '💨',
                xp: 150,
                special: true
            },
            BOOST_MASTER: {
                id: 'BOOST_MASTER',
                name: '부스트 마스터',
                description: '부스트 중 5마리 처치',
                icon: '⚡',
                xp: 300,
                special: true
            },
            
            // Win streaks
            WIN_STREAK_3: {
                id: 'WIN_STREAK_3',
                name: '연승왕',
                description: '3연승 달성',
                icon: '🔥',
                xp: 200,
                condition: (stats) => stats.currentWinStreak >= 3
            },
            WIN_STREAK_5: {
                id: 'WIN_STREAK_5',
                name: '무적',
                description: '5연승 달성',
                icon: '💪',
                xp: 400,
                condition: (stats) => stats.currentWinStreak >= 5
            },
            
            // Play time
            DEDICATED_1H: {
                id: 'DEDICATED_1H',
                name: '헌신적인 플레이어',
                description: '총 1시간 플레이',
                icon: '⏰',
                xp: 100,
                condition: (stats) => stats.totalPlayTime >= 3600
            },
            DEDICATED_5H: {
                id: 'DEDICATED_5H',
                name: '뱀 중독자',
                description: '총 5시간 플레이',
                icon: '🎮',
                xp: 300,
                condition: (stats) => stats.totalPlayTime >= 18000
            },
            
            // Level achievements
            LEVEL_10: {
                id: 'LEVEL_10',
                name: '성장하는 뱀',
                description: '레벨 10 달성',
                icon: '📈',
                xp: 200,
                condition: (stats) => stats.level >= 10
            },
            LEVEL_25: {
                id: 'LEVEL_25',
                name: '숙련된 뱀',
                description: '레벨 25 달성',
                icon: '🎯',
                xp: 400,
                condition: (stats) => stats.level >= 25
            },
            LEVEL_50: {
                id: 'LEVEL_50',
                name: '뱀 마스터',
                description: '레벨 50 달성',
                icon: '🏅',
                xp: 1000,
                condition: (stats) => stats.level >= 50
            }
        };
    }
    
    loadUnlocked() {
        const saved = localStorage.getItem('snakeAchievements');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.unlockedAchievements = new Set(data);
            } catch (e) {
                console.error('Failed to load achievements:', e);
            }
        }
    }
    
    saveUnlocked() {
        const data = Array.from(this.unlockedAchievements);
        localStorage.setItem('snakeAchievements', JSON.stringify(data));
    }
    
    checkAchievements(stats, sessionStats = null) {
        const newlyUnlocked = [];
        
        for (const [key, achievement] of Object.entries(this.achievements)) {
            if (!this.unlockedAchievements.has(key) && !achievement.special) {
                if (achievement.condition && achievement.condition(stats, sessionStats)) {
                    this.unlock(key);
                    newlyUnlocked.push(achievement);
                }
            }
        }
        
        return newlyUnlocked;
    }
    
    unlock(achievementId) {
        if (this.unlockedAchievements.has(achievementId)) return false;
        
        const achievement = this.achievements[achievementId];
        if (!achievement) return false;
        
        this.unlockedAchievements.add(achievementId);
        this.saveUnlocked();
        
        // Award XP
        if (window.progressionManager && achievement.xp) {
            window.progressionManager.addXP(achievement.xp, `업적: ${achievement.name}`);
        }
        
        // Queue notification
        this.checkQueue.push(achievement);
        this.processNotificationQueue();
        
        return true;
    }
    
    async processNotificationQueue() {
        if (this.isShowingNotification || this.checkQueue.length === 0) return;
        
        this.isShowingNotification = true;
        const achievement = this.checkQueue.shift();
        
        await this.showNotification(achievement);
        
        this.isShowingNotification = false;
        
        // Process next in queue
        if (this.checkQueue.length > 0) {
            setTimeout(() => this.processNotificationQueue(), 500);
        }
    }
    
    async showNotification(achievement) {
        // Play achievement sound
        if (window.soundManager) {
            window.soundManager.playVictory();
        }
        
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-content">
                <div class="achievement-title">업적 달성!</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
                <div class="achievement-xp">+${achievement.xp} XP</div>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: -400px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 10001;
            transition: right 0.5s ease-out;
            min-width: 300px;
        `;
        
        const iconStyle = `
            font-size: 40px;
            filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.5));
        `;
        
        const contentStyle = `
            flex: 1;
        `;
        
        const titleStyle = `
            font-size: 12px;
            opacity: 0.8;
            margin-bottom: 2px;
        `;
        
        const nameStyle = `
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 2px;
        `;
        
        const descStyle = `
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 5px;
        `;
        
        const xpStyle = `
            font-size: 14px;
            color: #FFD700;
            font-weight: bold;
        `;
        
        document.body.appendChild(notification);
        
        // Apply styles to inner elements
        notification.querySelector('.achievement-icon').style.cssText = iconStyle;
        notification.querySelector('.achievement-content').style.cssText = contentStyle;
        notification.querySelector('.achievement-title').style.cssText = titleStyle;
        notification.querySelector('.achievement-name').style.cssText = nameStyle;
        notification.querySelector('.achievement-desc').style.cssText = descStyle;
        notification.querySelector('.achievement-xp').style.cssText = xpStyle;
        
        // Slide in
        await new Promise(resolve => {
            setTimeout(() => {
                notification.style.right = '20px';
                resolve();
            }, 100);
        });
        
        // Wait
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Slide out
        notification.style.right = '-400px';
        
        // Remove
        await new Promise(resolve => setTimeout(resolve, 500));
        notification.remove();
    }
    
    // Special achievement triggers
    onGiantKill(mySize, enemySize) {
        if (enemySize >= mySize * 2 && !this.unlockedAchievements.has('GIANT_SLAYER')) {
            this.unlock('GIANT_SLAYER');
        }
    }
    
    onBoostKill() {
        // Track boost kills (would need session tracking)
    }
    
    onLongBoost(duration) {
        if (duration >= 10 && !this.unlockedAchievements.has('SPEED_DEMON')) {
            this.unlock('SPEED_DEMON');
        }
    }
    
    getProgress() {
        const total = Object.keys(this.achievements).length;
        const unlocked = this.unlockedAchievements.size;
        return {
            total,
            unlocked,
            percentage: Math.round((unlocked / total) * 100)
        };
    }
    
    getAllAchievements() {
        return Object.values(this.achievements).map(achievement => ({
            ...achievement,
            unlocked: this.unlockedAchievements.has(achievement.id)
        }));
    }
}

// Create global achievement manager
window.achievementManager = new AchievementManager();