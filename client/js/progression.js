// Progression System for Snake Game
class ProgressionManager {
    constructor() {
        this.xp = 0;
        this.level = 1;
        this.totalGamesPlayed = 0;
        this.totalWins = 0;
        this.totalFoodEaten = 0;
        this.totalKills = 0;
        this.highScore = 0;
        this.totalPlayTime = 0; // in seconds
        this.currentWinStreak = 0;
        this.bestWinStreak = 0;
        
        this.loadProgress();
        this.sessionStartTime = null;
        
        // XP rewards
        this.XP_REWARDS = {
            FOOD_EATEN: 1,
            KILL: 50,
            WIN: 500,
            SURVIVE_MINUTE: 10,
            HIGH_SCORE: 100, // per 1000 points above previous high score
            ACHIEVEMENT: 200
        };
        
        // Level requirements (XP needed for each level)
        this.LEVEL_REQUIREMENTS = this.generateLevelRequirements();
    }
    
    generateLevelRequirements() {
        const requirements = [0]; // Level 0 (not used)
        for (let i = 1; i <= 100; i++) {
            // Exponential curve: each level requires more XP than the last
            requirements.push(Math.floor(100 * Math.pow(1.5, i - 1)));
        }
        return requirements;
    }
    
    loadProgress() {
        const saved = localStorage.getItem('snakeProgression');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.xp = data.xp || 0;
                this.level = data.level || 1;
                this.totalGamesPlayed = data.totalGamesPlayed || 0;
                this.totalWins = data.totalWins || 0;
                this.totalFoodEaten = data.totalFoodEaten || 0;
                this.totalKills = data.totalKills || 0;
                this.highScore = data.highScore || 0;
                this.totalPlayTime = data.totalPlayTime || 0;
                this.currentWinStreak = data.currentWinStreak || 0;
                this.bestWinStreak = data.bestWinStreak || 0;
            } catch (e) {
                console.error('Failed to load progression:', e);
            }
        }
    }
    
    saveProgress() {
        const data = {
            xp: this.xp,
            level: this.level,
            totalGamesPlayed: this.totalGamesPlayed,
            totalWins: this.totalWins,
            totalFoodEaten: this.totalFoodEaten,
            totalKills: this.totalKills,
            highScore: this.highScore,
            totalPlayTime: this.totalPlayTime,
            currentWinStreak: this.currentWinStreak,
            bestWinStreak: this.bestWinStreak
        };
        localStorage.setItem('snakeProgression', JSON.stringify(data));
    }
    
    startSession() {
        this.sessionStartTime = Date.now();
    }
    
    endSession() {
        if (this.sessionStartTime) {
            const sessionTime = Math.floor((Date.now() - this.sessionStartTime) / 1000);
            this.totalPlayTime += sessionTime;
            
            // Award XP for play time
            const minutesPlayed = Math.floor(sessionTime / 60);
            if (minutesPlayed > 0) {
                this.addXP(minutesPlayed * this.XP_REWARDS.SURVIVE_MINUTE, 'Play Time');
            }
            
            this.sessionStartTime = null;
            this.saveProgress();
        }
    }
    
    addXP(amount, reason = '') {
        const prevLevel = this.level;
        this.xp += amount;
        
        // Check for level up
        while (this.level < 100 && this.xp >= this.LEVEL_REQUIREMENTS[this.level + 1]) {
            this.level++;
        }
        
        this.saveProgress();
        
        // Show XP notification
        this.showXPNotification(amount, reason);
        
        // Check if leveled up
        if (this.level > prevLevel) {
            this.onLevelUp(prevLevel, this.level);
        }
    }
    
    onLevelUp(oldLevel, newLevel) {
        console.log(`Level up! ${oldLevel} → ${newLevel}`);
        
        // Play level up sound
        if (window.soundManager) {
            window.soundManager.playVictory();
        }
        
        // Show level up notification
        const notification = document.createElement('div');
        notification.className = 'level-up-notification';
        notification.innerHTML = `
            <h2>레벨 업! 🎉</h2>
            <p>레벨 ${newLevel} 달성!</p>
            <p>보상: 새로운 뱀 색상 해금</p>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            z-index: 10000;
            animation: levelUpPulse 0.6s ease-out;
            box-shadow: 0 0 30px rgba(102, 126, 234, 0.8);
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
        
        // Unlock new content based on level
        this.unlockLevelRewards(newLevel);
    }
    
    unlockLevelRewards(level) {
        // Unlock new colors at certain levels
        const colorUnlocks = {
            5: '#FF1744',   // Red
            10: '#00E676',  // Green
            15: '#2979FF',  // Blue
            20: '#FF9100',  // Orange
            25: '#E91E63',  // Pink
            30: '#9C27B0',  // Purple
            40: '#00BCD4',  // Cyan
            50: '#FFD600'   // Gold
        };
        
        if (colorUnlocks[level]) {
            // Add new color to available colors
            console.log(`Unlocked new color at level ${level}: ${colorUnlocks[level]}`);
            // Would need to implement color unlock system in UI
        }
    }
    
    showXPNotification(amount, reason) {
        const notification = document.createElement('div');
        notification.className = 'xp-notification';
        notification.textContent = `+${amount} XP${reason ? ` (${reason})` : ''}`;
        notification.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 20px;
            background: rgba(76, 175, 80, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-weight: bold;
            z-index: 1000;
            animation: slideInRight 0.3s ease-out, fadeOut 0.3s ease-out 2s forwards;
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2300);
    }
    
    onGameStart() {
        this.totalGamesPlayed++;
        this.startSession();
        this.saveProgress();
    }
    
    onGameEnd(score, won, foodEaten, kills) {
        this.endSession();
        
        // Update stats
        this.totalFoodEaten += foodEaten;
        this.totalKills += kills;
        
        // Award XP
        if (foodEaten > 0) {
            this.addXP(foodEaten * this.XP_REWARDS.FOOD_EATEN, 'Food Eaten');
        }
        
        if (kills > 0) {
            this.addXP(kills * this.XP_REWARDS.KILL, 'Eliminations');
        }
        
        if (won) {
            this.totalWins++;
            this.currentWinStreak++;
            if (this.currentWinStreak > this.bestWinStreak) {
                this.bestWinStreak = this.currentWinStreak;
            }
            this.addXP(this.XP_REWARDS.WIN, 'Victory!');
        } else {
            this.currentWinStreak = 0;
        }
        
        // Check high score
        if (score > this.highScore) {
            const scoreDiff = score - this.highScore;
            const highScoreXP = Math.floor(scoreDiff / 1000) * this.XP_REWARDS.HIGH_SCORE;
            if (highScoreXP > 0) {
                this.addXP(highScoreXP, 'New High Score!');
            }
            this.highScore = score;
        }
        
        this.saveProgress();
        
        // Check achievements
        const sessionStats = {
            score: score,
            foodEaten: foodEaten,
            kills: kills,
            survivalTime: Math.floor((Date.now() - this.sessionStartTime) / 1000)
        };
        
        const allStats = this.getStats();
        window.achievementManager.checkAchievements(allStats, sessionStats);
    }
    
    getProgressToNextLevel() {
        if (this.level >= 100) return 1;
        
        const currentLevelXP = this.LEVEL_REQUIREMENTS[this.level];
        const nextLevelXP = this.LEVEL_REQUIREMENTS[this.level + 1];
        const progress = (this.xp - currentLevelXP) / (nextLevelXP - currentLevelXP);
        
        return Math.max(0, Math.min(1, progress));
    }
    
    getXPForNextLevel() {
        if (this.level >= 100) return 0;
        return this.LEVEL_REQUIREMENTS[this.level + 1] - this.xp;
    }
    
    getStats() {
        return {
            level: this.level,
            xp: this.xp,
            xpForNext: this.getXPForNextLevel(),
            progress: this.getProgressToNextLevel(),
            totalGamesPlayed: this.totalGamesPlayed,
            totalWins: this.totalWins,
            winRate: this.totalGamesPlayed > 0 ? (this.totalWins / this.totalGamesPlayed * 100).toFixed(1) : 0,
            totalFoodEaten: this.totalFoodEaten,
            totalKills: this.totalKills,
            highScore: this.highScore,
            totalPlayTime: this.totalPlayTime,
            playTimeFormatted: this.formatPlayTime(this.totalPlayTime),
            currentWinStreak: this.currentWinStreak,
            bestWinStreak: this.bestWinStreak
        };
    }
    
    formatPlayTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}시간 ${minutes}분`;
        }
        return `${minutes}분`;
    }
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes fadeOut {
        to {
            opacity: 0;
            transform: translateY(20px);
        }
    }
    
    @keyframes levelUpPulse {
        0% {
            transform: translate(-50%, -50%) scale(0.8);
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
`;
document.head.appendChild(style);

// Create global progression manager
window.progressionManager = new ProgressionManager();