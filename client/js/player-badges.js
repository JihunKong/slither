// Player Badge System for Level-based Status Display
class PlayerBadgeManager {
    constructor() {
        this.badges = this.defineBadges();
    }
    
    defineBadges() {
        return {
            // Level-based badges
            NEWBIE: {
                id: 'NEWBIE',
                emoji: '🌱',
                name: '새싹',
                minLevel: 1,
                maxLevel: 4,
                color: '#2ECC71'
            },
            BRONZE: {
                id: 'BRONZE',
                emoji: '🥉',
                name: '브론즈',
                minLevel: 5,
                maxLevel: 14,
                color: '#CD7F32'
            },
            SILVER: {
                id: 'SILVER',
                emoji: '🥈',
                name: '실버',
                minLevel: 15,
                maxLevel: 24,
                color: '#C0C0C0'
            },
            GOLD: {
                id: 'GOLD',
                emoji: '🥇',
                name: '골드',
                minLevel: 25,
                maxLevel: 39,
                color: '#FFD700'
            },
            PLATINUM: {
                id: 'PLATINUM',
                emoji: '💎',
                name: '플래티넘',
                minLevel: 40,
                maxLevel: 59,
                color: '#E5E4E2'
            },
            DIAMOND: {
                id: 'DIAMOND',
                emoji: '💠',
                name: '다이아몬드',
                minLevel: 60,
                maxLevel: 79,
                color: '#B9F2FF'
            },
            MASTER: {
                id: 'MASTER',
                emoji: '👑',
                name: '마스터',
                minLevel: 80,
                maxLevel: 99,
                color: '#8A2BE2'
            },
            LEGEND: {
                id: 'LEGEND',
                emoji: '⭐',
                name: '레전드',
                minLevel: 100,
                maxLevel: 999,
                color: '#FFD700'
            }
        };
    }
    
    getBadgeForLevel(level) {
        for (const badge of Object.values(this.badges)) {
            if (level >= badge.minLevel && level <= badge.maxLevel) {
                return badge;
            }
        }
        return this.badges.NEWBIE; // Default fallback
    }
    
    formatPlayerNameWithBadge(playerName, level, isTopRanked = false) {
        const badge = this.getBadgeForLevel(level);
        let displayName = `${badge.emoji} ${playerName}`;
        
        // Add special crown for top player in room
        if (isTopRanked) {
            displayName = `👑 ${displayName}`;
        }
        
        return displayName;
    }
    
    getPlayerBadgeInfo(level) {
        const badge = this.getBadgeForLevel(level);
        return {
            emoji: badge.emoji,
            name: badge.name,
            color: badge.color,
            level: level
        };
    }
    
    // Get rank position badges for leaderboard
    getRankBadge(position) {
        switch (position) {
            case 1:
                return { emoji: '🏆', color: '#FFD700', name: '1위' };
            case 2:
                return { emoji: '🥈', color: '#C0C0C0', name: '2위' };
            case 3:
                return { emoji: '🥉', color: '#CD7F32', name: '3위' };
            default:
                return { emoji: `${position}`, color: '#888888', name: `${position}위` };
        }
    }
    
    // Create HTML for badge display
    createBadgeHTML(level, isTopPlayer = false, rankPosition = null) {
        const levelBadge = this.getBadgeForLevel(level);
        let html = '';
        
        // Add rank badge if specified
        if (rankPosition !== null && rankPosition <= 3) {
            const rankBadge = this.getRankBadge(rankPosition);
            html += `<span class="rank-badge" style="color: ${rankBadge.color};">${rankBadge.emoji}</span>`;
        }
        
        // Add top player crown
        if (isTopPlayer) {
            html += `<span class="crown-badge">👑</span>`;
        }
        
        // Add level badge
        html += `<span class="level-badge" style="color: ${levelBadge.color};" title="${levelBadge.name} (레벨 ${level})">${levelBadge.emoji}</span>`;
        
        return html;
    }
    
    // Update leaderboard with badges
    updateLeaderboardWithBadges(leaderboardElement, players) {
        if (!leaderboardElement || !players) return;
        
        // Sort players by score for ranking
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
        const topPlayer = sortedPlayers[0];
        
        let html = '';
        sortedPlayers.forEach((player, index) => {
            const position = index + 1;
            const isTopPlayer = player.id === topPlayer?.id;
            const level = this.getPlayerLevel(player); // Get player level from progression system
            
            const badgeHTML = this.createBadgeHTML(level, isTopPlayer, position);
            
            html += `
                <li class="leaderboard-item ${isTopPlayer ? 'top-player' : ''}">
                    <span class="player-badges">${badgeHTML}</span>
                    <span class="player-name">${player.name || player.userId}</span>
                    <span class="player-score">${player.score}</span>
                </li>
            `;
        });
        
        leaderboardElement.innerHTML = html;
    }
    
    // Get player level from progression system
    getPlayerLevel(player) {
        // Try to get level from progression system if available
        if (window.progressionManager && player.userId === window.userId) {
            return window.progressionManager.level;
        }
        
        // Fallback to estimate level based on score
        // This is a simple estimation, could be improved with server data
        const score = player.score || 0;
        if (score < 500) return Math.floor(score / 100) + 1;
        if (score < 2000) return Math.floor(score / 200) + 5;
        if (score < 5000) return Math.floor(score / 300) + 15;
        return Math.min(100, Math.floor(score / 500) + 25);
    }
    
    // Add CSS styles for badges
    addBadgeStyles() {
        if (document.querySelector('style[data-badge-styles]')) return;
        
        const style = document.createElement('style');
        style.setAttribute('data-badge-styles', 'true');
        style.textContent = `
            .player-badges {
                display: inline-flex;
                align-items: center;
                gap: 2px;
                margin-right: 5px;
            }
            
            .rank-badge, .crown-badge, .level-badge {
                font-size: 14px;
                display: inline-block;
            }
            
            .crown-badge {
                animation: crownGlow 2s ease-in-out infinite alternate;
            }
            
            @keyframes crownGlow {
                0% { text-shadow: 0 0 5px #FFD700; }
                100% { text-shadow: 0 0 15px #FFD700, 0 0 20px #FFD700; }
            }
            
            .leaderboard-item {
                display: flex;
                align-items: center;
                padding: 5px;
                margin: 2px 0;
                border-radius: 3px;
                transition: all 0.2s ease;
            }
            
            .leaderboard-item:hover {
                background-color: rgba(255, 255, 255, 0.1);
            }
            
            .leaderboard-item.top-player {
                background-color: rgba(255, 215, 0, 0.1);
                border: 1px solid rgba(255, 215, 0, 0.3);
            }
            
            .player-name {
                flex: 1;
                margin: 0 10px;
                font-weight: bold;
            }
            
            .player-score {
                color: #4CAF50;
                font-weight: bold;
                min-width: 50px;
                text-align: right;
            }
            
            .level-badge {
                cursor: help;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Initialize badge system
    initialize() {
        this.addBadgeStyles();
    }
}

// Create global badge manager
window.playerBadgeManager = new PlayerBadgeManager();
window.playerBadgeManager.initialize();