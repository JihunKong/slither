const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const playerCountElement = document.getElementById('playerCount');
const leaderboardList = document.getElementById('leaderboardList');
const respawnBtn = document.getElementById('respawnBtn');
const gameFullMessage = document.getElementById('gameFullMessage');

let socket;
let playerId;
let userId = null;
let gameWidth = 2400;
let gameHeight = 1800;
let camera = { x: 0, y: 0 };
let mouseX = 0;
let mouseY = 0;
let gameData = { players: [], food: [], powerUps: [] };
let myPlayer = null;
let isHost = false;
let gameStarted = false;
let joystick = null;
let playerName = '';
let playerColor = '#FF6B6B';
let sessionKills = 0;
let sessionFoodEaten = 0;
let sessionStartTime = null;
let roomId = null;
let respawnCountdownInterval = null;
let respawnCountdownElement = null;
let lastFrameTime = 0;
const targetFPS = 60; // Increase back to 60 FPS for smoother gameplay
let frameCount = 0;
let lastFPSTime = 0;
let currentFPS = 0;

// localStorage에서 roomId 불러오기
function loadRoomId() {
    const stored = localStorage.getItem('roomId');
    if (stored) {
        roomId = stored;
        updateRoomDisplay();
    }
}

// localStorage에서 userId 불러오기
function loadUserId() {
    const stored = localStorage.getItem('snakeGameUserId');
    if (stored) {
        console.log('Loaded userId from localStorage:', stored);
        return stored;
    }
    return null;
}

// localStorage에 userId 저장
function saveUserId(id) {
    localStorage.setItem('snakeGameUserId', id);
    console.log('Saved userId to localStorage:', id);
}

// Load player preferences
function loadPlayerPreferences() {
    const savedName = localStorage.getItem('snakePlayerName');
    const savedColor = localStorage.getItem('snakePlayerColor');
    
    if (savedName) {
        playerName = savedName;
        document.getElementById('playerName').value = savedName;
    }
    
    if (savedColor) {
        playerColor = savedColor;
        selectColor(savedColor);
    }
}

// Save player preferences
function savePlayerPreferences() {
    if (playerName) {
        localStorage.setItem('snakePlayerName', playerName);
    }
    if (playerColor) {
        localStorage.setItem('snakePlayerColor', playerColor);
    }
}

// Select color in UI
function selectColor(color) {
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.color === color) {
            option.classList.add('selected');
        }
    });
}

canvas.width = 800;
canvas.height = 600;

function connectToServer() {
    console.log('Attempting to connect to server...');
    
    socket = io({
        transports: ['polling', 'websocket'], // polling 우선
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });
    
    socket.on('connect', () => {
        console.log('Connected to server with ID:', socket.id);
        
        // 기존 userId 확인 요청
        const existingUserId = loadUserId();
        socket.emit('checkUserId', existingUserId);
    });
    
    socket.on('userIdAssigned', (data) => {
        userId = data.userId;
        if (data.isNewUser) {
            saveUserId(userId);
        }
        console.log('User ID assigned:', userId);
        updateUserIdDisplay();
        
        // 방 ID가 있는 경우에만 게임 참가 (방에서 온 경우)
        const savedRoomId = localStorage.getItem('roomId');
        if (savedRoomId) {
            console.log('Joining game in room:', savedRoomId);
            socket.emit('joinGame', {
                userId: userId,
                name: playerName || userId,
                color: playerColor
            });
        } else {
            console.log('No room ID found, not joining game');
        }
    });
    
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
    });
    
    socket.on('init', (data) => {
        console.log('Initialized with data:', data);
        playerId = data.playerId;
        userId = data.userId || userId;
        gameWidth = data.gameWidth;
        gameHeight = data.gameHeight;
        isHost = data.isHost;
        gameStarted = data.gameStarted;
        console.log('Init - isHost:', isHost, 'gameStarted:', gameStarted, 'userId:', userId);
        updateUserIdDisplay();
        updateRoomDisplay();
        // updateStartButton을 약간의 지연 후 호출하여 DOM이 준비되도록 함
        setTimeout(() => {
            updateStartButton();
            
            // 튜토리얼은 자동 시작하지 않음 - 도움말 버튼으로만 접근 가능
        }, 100);
    });
    
    socket.on('gameStarted', (data) => {
        gameStarted = true;
        console.log('Game started!', data);
        updateStartButton();
        showCountdown();
        
        // Reset session stats
        sessionKills = 0;
        sessionFoodEaten = 0;
        sessionStartTime = Date.now();
        
        // Start progression session
        window.progressionManager.onGameStart();
    });
    
    socket.on('newHost', (data) => {
        isHost = data.hostId === playerId;
        updateStartButton();
        updateHostStatus();
    });
    
    socket.on('needMorePlayers', () => {
        alert('최소 2명 이상의 플레이어가 필요합니다!');
    });
    
    socket.on('personalVictory', (data) => {
        console.log('Personal victory!', data);
        window.soundManager.playVictory();
        
        // Update progression - we won!
        const finalScore = myPlayer ? (myPlayer.displayScore || myPlayer.score) : 0;
        window.progressionManager.onGameEnd(finalScore, true, sessionFoodEaten, sessionKills);
        
        // 개인 승리 메시지 표시
        const winMessage = document.createElement('div');
        winMessage.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(255, 215, 0, 0.95);
            color: black;
            padding: 40px;
            border-radius: 15px;
            font-size: 28px;
            font-weight: bold;
            text-align: center;
            z-index: 1000;
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
            animation: bounce 0.6s ease-out;
        `;
        winMessage.innerHTML = `
            <h2>🏆 승리하셨습니다! 🏆</h2>
            <p>축하합니다! ${data.score}점 달성!</p>
            <p style="font-size: 18px; margin-top: 15px;">3초 후 새로 시작합니다...</p>
        `;
        document.body.appendChild(winMessage);
        
        // CSS animation keyframes 추가
        if (!document.getElementById('bounce-style')) {
            const style = document.createElement('style');
            style.id = 'bounce-style';
            style.textContent = `
                @keyframes bounce {
                    0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
                    50% { transform: translate(-50%, -50%) scale(1.1); }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        setTimeout(() => {
            winMessage.remove();
        }, 3000);
    });
    
    socket.on('playerAchievedVictory', (data) => {
        console.log('Another player achieved victory:', data);
        
        // 다른 플레이어 승리 알림 (작고 간단하게)
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: rgba(76, 175, 80, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-size: 16px;
            z-index: 1000;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            animation: slideIn 0.3s ease-out;
        `;
        notification.innerHTML = `
            🎉 ${data.winnerName}님이 ${data.score}점 달성!
        `;
        document.body.appendChild(notification);
        
        // CSS animation for slideIn
        if (!document.getElementById('slideIn-style')) {
            const style = document.createElement('style');
            style.id = 'slideIn-style';
            style.textContent = `
                @keyframes slideIn {
                    0% { transform: translateX(100%); opacity: 0; }
                    100% { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    });
    
    socket.on('gameReset', () => {
        console.log('Game reset');
        gameStarted = false;
        updateStartButton();
        updateGameStatus();
    });
    
    let updateCount = 0;
    let lastPosition = null;
    socket.on('gameUpdate', (data) => {
        const prevPlayer = myPlayer;
        gameData = data;
        myPlayer = gameData.players.find(p => p.id === playerId);
        if (!myPlayer && playerId) {
            console.log('Player not found in game data. PlayerId:', playerId);
            console.log('Available players:', data.players.map(p => p.id));
        }
        
        // Check for score changes (food eaten)
        if (prevPlayer && myPlayer && myPlayer.score > prevPlayer.score) {
            const scoreDiff = myPlayer.score - prevPlayer.score;
            window.soundManager.playEat(scoreDiff);
            sessionFoodEaten++; // Track food eaten
        }
        
        // Check for death
        if (prevPlayer && prevPlayer.alive && myPlayer && !myPlayer.alive) {
            window.soundManager.playDeath();
            
            // End game session for progression
            const finalScore = prevPlayer.displayScore || prevPlayer.score;
            window.progressionManager.onGameEnd(finalScore, false, sessionFoodEaten, sessionKills);
            
            // Start auto-respawn countdown
            startRespawnCountdown();
        }
        
        // Check for kills (other players dying)
        if (prevPlayer && prevPlayer.alive && gameData.players.length < data.players.length) {
            // Someone died, might be our kill
            sessionKills++; // Simple approximation
        }
        
        // Only update button if game state or host status changed
        const prevGameStarted = gameStarted;
        const prevIsHost = isHost;
        
        gameStarted = data.gameStarted;
        isHost = data.roomHost === playerId;
        updateUI();
        
        // Only update button if status changed
        if (prevGameStarted !== gameStarted || prevIsHost !== isHost) {
            updateStartButton();
        }
        
        // 디버깅: 업데이트 횟수와 위치 변화 확인
        updateCount++;
        if (myPlayer && myPlayer.segments.length > 0) {
            const currentPos = myPlayer.segments[0];
            if (updateCount % 60 === 0) {
                console.log(`Update #${updateCount}: Player at (${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)})`);
                if (lastPosition) {
                    const distance = Math.sqrt(
                        Math.pow(currentPos.x - lastPosition.x, 2) + 
                        Math.pow(currentPos.y - lastPosition.y, 2)
                    );
                    console.log(`  Moved ${distance.toFixed(1)} units since last check`);
                }
                lastPosition = { x: currentPos.x, y: currentPos.y };
            }
        }
    });
    
    socket.on('gameFull', () => {
        gameFullMessage.style.display = 'block';
    });
    
    socket.on('playerKilled', (data) => {
        // Check for achievements
        if (data.killerId === playerId && data.killerSize && data.victimSize) {
            // Check for giant slayer achievement
            if (data.victimSize >= data.killerSize * 2) {
                window.achievementManager.onGiantKill(data.killerSize, data.victimSize);
            }
            sessionKills++;
        }
    });
    
    socket.on('powerUpCollected', (data) => {
        console.log('Power-up collected:', data);
        if (data.playerId === playerId) {
            window.powerUpManager.activatePowerUp(playerId, data.type);
        }
    });
    
    socket.on('userIdChangeSuccess', (data) => {
        console.log('User ID changed successfully:', data);
        userId = data.newUserId;
        saveUserId(userId);
        updateUserIdDisplay();
        
        // Reset button state
        const updateUserIdBtn = document.getElementById('updateUserIdBtn');
        if (updateUserIdBtn) {
            updateUserIdBtn.textContent = '✓';
            updateUserIdBtn.style.backgroundColor = '#4CAF50';
            updateUserIdBtn.disabled = false;
            
            setTimeout(() => {
                updateUserIdBtn.textContent = '변경';
                updateUserIdBtn.style.backgroundColor = '#FF6B6B';
            }, 2000);
        }
        
        // Show success message
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 10000;
            font-size: 14px;
        `;
        successDiv.textContent = `사용자 ID가 "${data.newUserId}"로 변경되었습니다.`;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    });
    
    socket.on('userIdChangeError', (data) => {
        console.log('User ID change error:', data);
        
        // Reset button state
        const updateUserIdBtn = document.getElementById('updateUserIdBtn');
        if (updateUserIdBtn) {
            updateUserIdBtn.textContent = '변경';
            updateUserIdBtn.style.backgroundColor = '#FF6B6B';
            updateUserIdBtn.disabled = false;
        }
        
        // Show error message
        showUserIdError(data.message || '사용자 ID 변경에 실패했습니다.');
    });
    
    socket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
    });
}

function updateUserIdDisplay() {
    const userIdElement = document.getElementById('userId');
    const userIdInput = document.getElementById('userIdInput');
    
    if (userIdElement && userId) {
        // Add badge to user ID display
        if (window.playerBadgeManager && window.progressionManager) {
            const level = window.progressionManager.level;
            const badge = window.playerBadgeManager.getBadgeForLevel(level);
            userIdElement.innerHTML = `${badge.emoji} <span style="color: ${badge.color};">${userId}</span> <span style="font-size: 12px; color: #888;">(Lv.${level})</span>`;
        } else {
            userIdElement.textContent = userId;
        }
    }
    if (userIdInput && userId) {
        userIdInput.value = userId;
    }
}

// 방 정보 표시 업데이트
function updateRoomDisplay() {
    const roomIdElement = document.getElementById('roomId');
    if (roomIdElement && roomId) {
        roomIdElement.textContent = roomId;
    }
    
    updateHostStatus();
    updateGameStatus();
}

// 호스트 상태 업데이트
function updateHostStatus() {
    const hostStatusElement = document.getElementById('hostStatus');
    if (hostStatusElement) {
        if (isHost) {
            hostStatusElement.textContent = '당신이 방장입니다';
            hostStatusElement.style.color = '#4CAF50';
        } else {
            hostStatusElement.textContent = '플레이어';
            hostStatusElement.style.color = '#FFD700';
        }
    }
}

// 게임 상태 업데이트
function updateGameStatus() {
    const gameStatusElement = document.getElementById('gameStatus');
    const waitingMessage = document.getElementById('waitingMessage');
    
    if (gameStatusElement) {
        if (gameStarted) {
            gameStatusElement.textContent = '게임 진행 중';
            gameStatusElement.style.color = '#4CAF50';
        } else {
            gameStatusElement.textContent = '대기 중';
            gameStatusElement.style.color = '#FFA726';
        }
    }
    
    // 대기 메시지 표시/숨김
    if (waitingMessage) {
        if (!gameStarted && !isHost) {
            waitingMessage.style.display = 'block';
        } else {
            waitingMessage.style.display = 'none';
        }
    }
}

// 카운트다운 표시
function showCountdown() {
    const countdownDisplay = document.getElementById('countdownDisplay');
    const countdownNumber = document.getElementById('countdownNumber');
    const waitingMessage = document.getElementById('waitingMessage');
    
    if (!countdownDisplay || !countdownNumber) return;
    
    // 대기 메시지 숨기기
    if (waitingMessage) {
        waitingMessage.style.display = 'none';
    }
    
    let count = 3;
    countdownDisplay.style.display = 'block';
    countdownNumber.textContent = count;
    
    const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownNumber.textContent = count;
            window.soundManager.playClick();
        } else {
            clearInterval(countdownInterval);
            countdownDisplay.style.display = 'none';
            
            // 게임 시작 사운드
            if (window.soundManager) {
                window.soundManager.playClick();
            }
        }
    }, 1000);
}

// 리스폰 카운트다운 시작
function startRespawnCountdown() {
    // 기존 카운트다운이 있다면 정리
    if (respawnCountdownInterval) {
        clearInterval(respawnCountdownInterval);
        respawnCountdownInterval = null;
    }
    
    if (respawnCountdownElement) {
        respawnCountdownElement.remove();
        respawnCountdownElement = null;
    }
    
    // 카운트다운 UI 생성
    respawnCountdownElement = document.createElement('div');
    respawnCountdownElement.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(244, 67, 54, 0.95);
        color: white;
        padding: 30px 40px;
        border-radius: 15px;
        font-size: 24px;
        font-weight: bold;
        text-align: center;
        z-index: 1000;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        cursor: pointer;
    `;
    
    let countdown = 3;
    const updateCountdownDisplay = () => {
        respawnCountdownElement.innerHTML = `
            <h3 style="margin-bottom: 15px;">💀 게임 오버</h3>
            <p style="margin: 10px 0; font-size: 20px;">${countdown}초 후 자동 리스폰</p>
            <p style="font-size: 16px; opacity: 0.8; margin-top: 15px;">
                <span style="background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 5px;">스페이스</span> 
                또는 
                <span style="background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 5px;">클릭</span>
                으로 즉시 리스폰
            </p>
        `;
    };
    
    updateCountdownDisplay();
    document.body.appendChild(respawnCountdownElement);
    
    // 즉시 리스폰 이벤트 리스너
    const immediateRespawn = () => {
        clearInterval(respawnCountdownInterval);
        respawnCountdownInterval = null;
        respawn();
    };
    
    respawnCountdownElement.addEventListener('click', immediateRespawn);
    
    // 스페이스바 이벤트 리스너
    const spaceKeyHandler = (e) => {
        if (e.code === 'Space' && respawnCountdownElement) {
            e.preventDefault();
            document.removeEventListener('keydown', spaceKeyHandler);
            immediateRespawn();
        }
    };
    document.addEventListener('keydown', spaceKeyHandler);
    
    // 카운트다운 시작
    respawnCountdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            updateCountdownDisplay();
        } else {
            clearInterval(respawnCountdownInterval);
            respawnCountdownInterval = null;
            document.removeEventListener('keydown', spaceKeyHandler);
            respawn();
        }
    }, 1000);
}

// 리스폰 실행
function respawn() {
    if (respawnCountdownElement) {
        respawnCountdownElement.remove();
        respawnCountdownElement = null;
    }
    
    if (socket && socket.connected) {
        window.soundManager.playClick();
        socket.emit('respawn');
        respawnBtn.style.display = 'none';
    }
}

let lastUIUpdate = 0;
function updateUI() {
    // UI 업데이트 빈도 제한 (성능 최적화)
    const now = Date.now();
    if (now - lastUIUpdate < 100) return; // 100ms마다만 업데이트
    lastUIUpdate = now;
    
    if (myPlayer) {
        // displayScore 표시 (보너스 적용된 점수)
        scoreElement.textContent = myPlayer.displayScore || myPlayer.score;
        
        // 먹은 개수에 따른 보너스 표시
        if (myPlayer.foodEaten >= 10) {
            let multiplier = '1.0x';
            if (myPlayer.foodEaten >= 30) multiplier = '1.6x';
            else if (myPlayer.foodEaten >= 20) multiplier = '1.4x';
            else if (myPlayer.foodEaten >= 10) multiplier = '1.2x';
            scoreElement.textContent += ` (${multiplier})`;
        }
        
        // 승리 목표 표시
        scoreElement.textContent += ' / 10,000';
        
        if (!myPlayer.alive) {
            respawnBtn.style.display = 'block';
        } else {
            respawnBtn.style.display = 'none';
        }
    }
    
    playerCountElement.textContent = gameData.players.length;
    
    // 리더보드 업데이트 빈도 제한
    if (now - (window.lastLeaderboardUpdate || 0) > 500) { // 500ms마다만 업데이트
        window.lastLeaderboardUpdate = now;
        
        const sortedPlayers = [...gameData.players]
            .sort((a, b) => (b.displayScore || b.score) - (a.displayScore || a.score))
            .slice(0, 5);
        
        // Update leaderboard with badge system
        if (window.playerBadgeManager) {
            window.playerBadgeManager.updateLeaderboardWithBadges(leaderboardList, sortedPlayers);
        } else {
            // Fallback to original leaderboard
            leaderboardList.innerHTML = sortedPlayers
                .map((player, index) => `
                    <li>
                        <span>${index + 1}. ${player.name}</span>
                        <span>${player.displayScore || player.score}</span>
                    </li>
                `)
                .join('');
        }
    }
    
    // Update progression UI (빈도 제한)
    if (now - (window.lastProgressionUpdate || 0) > 1000) { // 1초마다만 업데이트
        window.lastProgressionUpdate = now;
        updateProgressionUI();
    }
}

function updateProgressionUI() {
    const stats = window.progressionManager.getStats();
    
    document.getElementById('playerLevel').textContent = stats.level;
    document.getElementById('xpNeeded').textContent = stats.xpForNext;
    document.getElementById('xpBar').style.width = (stats.progress * 100) + '%';
}

function updateCamera() {
    if (myPlayer && myPlayer.alive) {
        camera.x = myPlayer.segments[0].x - canvas.width / 2;
        camera.y = myPlayer.segments[0].y - canvas.height / 2;
    }
}

function drawGrid() {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    
    const gridSize = 50;
    const startX = Math.floor(camera.x / gridSize) * gridSize - camera.x;
    const startY = Math.floor(camera.y / gridSize) * gridSize - camera.y;
    
    for (let x = startX; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = startY; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawFood() {
    gameData.food.forEach(food => {
        const x = food.x - camera.x;
        const y = food.y - camera.y;
        
        if (x > -20 && x < canvas.width + 20 && y > -20 && y < canvas.height + 20) {
            ctx.fillStyle = food.color;
            
            // 특별 먹이는 더 크고 빛나게
            if (food.value && food.value > 10) {
                // 빛나는 효과
                ctx.shadowBlur = food.value >= 50 ? 15 : 10;
                ctx.shadowColor = food.color;
                ctx.fillStyle = food.color;
                ctx.beginPath();
                ctx.arc(x, y, food.size || 8, 0, Math.PI * 2);
                ctx.fill();
                
                // 내부 하이라이트
                ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.beginPath();
                ctx.arc(x, y, (food.size || 8) * 0.6, 0, Math.PI * 2);
                ctx.fill();
                
                // 점수 표시
                if (food.value >= 20) {
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 10px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(food.value, x, y + 3);
                }
            } else {
                // 일반 먹이
                ctx.beginPath();
                ctx.arc(x, y, food.size || 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    });
    
    ctx.shadowBlur = 0;
}

function drawPowerUps() {
    const powerUpTypes = window.powerUpManager.powerUpTypes;
    
    gameData.powerUps.forEach(powerUp => {
        const x = powerUp.x - camera.x;
        const y = powerUp.y - camera.y;
        
        if (x > -30 && x < canvas.width + 30 && y > -30 && y < canvas.height + 30) {
            const type = powerUpTypes[powerUp.type];
            if (!type) return;
            
            // Pulsing effect
            const pulse = Math.sin(Date.now() * 0.003) * 0.2 + 1;
            const size = (powerUp.size || 15) * pulse;
            
            // Background circle
            ctx.save();
            ctx.fillStyle = type.color + '33';
            ctx.strokeStyle = type.color;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = type.color;
            
            ctx.beginPath();
            ctx.arc(x, y, size + 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Icon
            ctx.shadowBlur = 0;
            ctx.font = `${size * 1.5}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'white';
            ctx.fillText(type.icon, x, y);
            
            ctx.restore();
        }
    });
}

function drawSnake(snake) {
    // 성능 최적화: 화면 밖 플레이어는 간단하게 렌더링
    const head = snake.segments[0];
    const headX = head.x - camera.x;
    const headY = head.y - camera.y;
    const isOnScreen = headX >= -50 && headX <= canvas.width + 50 && 
                      headY >= -50 && headY <= canvas.height + 50;
    
    // Get power-up effects for this snake (성능을 위해 필요한 경우만)
    const effects = isOnScreen ? window.powerUpManager.getActiveEffects(snake.id) : {};
    
    // Pre-draw effects (화면에 있는 경우만)
    if (isOnScreen) {
        window.powerUpManager.drawEffects(ctx, snake, camera, effects);
    }
    
    if (!snake.alive) {
        ctx.globalAlpha = 0.5;
    }
    
    // Ghost effect
    if (effects.ghost) {
        ctx.globalAlpha = 0.5;
    }
    
    // Invincibility effect (simplified for performance)
    if (isOnScreen && (snake.invincible || effects.invincible)) {
        // Simplified flashing effect
        const flash = Math.floor(Date.now() / 200) % 2;
        ctx.globalAlpha = flash ? 0.5 : 0.8;
        
        // Simplified shield effect
        ctx.save();
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(headX, headY, 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    
    ctx.strokeStyle = snake.color;
    ctx.fillStyle = snake.color;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    snake.segments.forEach((segment, index) => {
        const x = segment.x - camera.x;
        const y = segment.y - camera.y;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    // head 변수는 이미 함수 시작에서 선언됨
    ctx.beginPath();
    ctx.arc(headX, headY, 7, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw player name with badge (성능 최적화)
    if (isOnScreen) {
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        
        if (window.playerBadgeManager) {
            const level = window.playerBadgeManager.getPlayerLevel(snake);
            const badge = window.playerBadgeManager.getBadgeForLevel(level);
            
            // Draw badge emoji above name (프레임 건너뛰기)
            if (!window.animationOptimizer.shouldSkipFrame(3)) {
                ctx.font = '10px Arial';
                ctx.fillText(badge.emoji, headX, headY - 25);
            }
            
            // Draw name
            ctx.font = '12px Arial';
            ctx.fillText(snake.name, headX, headY - 15);
            
            // Draw level
            ctx.fillStyle = badge.color;
            ctx.font = '9px Arial';
            ctx.fillText(`Lv.${level}`, headX, headY - 5);
        } else {
            // Fallback to original name display
            ctx.fillText(snake.name, headX, headY - 15);
        }
        
        // Draw power-up indicators (프레임 건너뛰기로 최적화)
        if (!window.animationOptimizer.shouldSkipFrame(2)) {
            window.powerUpManager.drawPowerUpUI(ctx, snake, camera);
        }
    }
    
    ctx.globalAlpha = 1;
}

function drawMinimap() {
    const minimapSize = 150;
    const minimapX = canvas.width - minimapSize - 10;
    const minimapY = 10;
    const scale = minimapSize / Math.max(gameWidth, gameHeight);
    
    // 미니맵 배경
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
    
    // 미니맵 테두리
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);
    
    // 1등 플레이어 찾기
    const leader = [...gameData.players]
        .sort((a, b) => (b.displayScore || b.score) - (a.displayScore || a.score))[0];
    
    // 모든 플레이어 표시
    gameData.players.forEach(player => {
        if (!player.alive) return;
        
        const head = player.segments[0];
        const x = minimapX + head.x * scale;
        const y = minimapY + head.y * scale;
        
        if (player === leader) {
            // 1등은 황금색으로 크게
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(x - 2, y - 2, 4, 4);
        } else if (player.id === playerId) {
            // 자신은 흰색으로
            ctx.fillStyle = 'white';
            ctx.fillRect(x - 2, y - 2, 4, 4);
        } else {
            // 다른 플레이어는 회색 점
            ctx.fillStyle = '#666';
            ctx.fillRect(x - 1, y - 1, 2, 2);
        }
    });
    
    // 특별 먹이 표시 (황금색)
    ctx.fillStyle = '#FFD700';
    gameData.food.forEach(food => {
        if (food.value && food.value > 10) {
            const x = minimapX + food.x * scale;
            const y = minimapY + food.y * scale;
            ctx.fillRect(x, y, 1, 1);
        }
    });
}

function drawBoostBar() {
    // 부스트 바를 제거하여 하단의 초록색 줄 문제 해결
    return;
}

function draw() {
    // 성능 모니터링 시작
    window.performanceManager.startFrame();
    
    // FPS 제한 제거 - 더 부드러운 렌더링을 위해
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    updateCamera();
    drawGrid();
    drawFood();
    drawPowerUps();
    
    // 플레이어 렌더링 최적화 (frustum culling)
    const playersToRender = gameData.players.filter(player => {
        const head = player.segments[0];
        return window.performanceManager.isInViewport(head.x, head.y, camera);
    });
    
    playersToRender.forEach(player => {
        drawSnake(player);
    });
    
    // 미니맵 그리기 (프레임 건너뛰기로 최적화)
    if (gameData.players.length > 0 && !window.animationOptimizer.shouldSkipFrame(2)) {
        drawMinimap();
    }
    
    // 부스트 바 그리기
    drawBoostBar();
    
    // 성능 통계 표시
    window.performanceManager.drawPerformanceStats(ctx);
    
    // 성능 모니터링 종료
    window.performanceManager.endFrame();
    
    // 게임 상태 표시
    if (!gameStarted) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('게임 시작 대기 중', canvas.width / 2, canvas.height / 2 - 20);
        
        if (isHost) {
            ctx.font = '20px Arial';
            ctx.fillText('당신이 방장입니다. 시작 버튼을 눌러주세요!', canvas.width / 2, canvas.height / 2 + 20);
        } else {
            ctx.font = '20px Arial';
            ctx.fillText('방장이 게임을 시작할 때까지 기다려주세요...', canvas.width / 2, canvas.height / 2 + 20);
        }
    } else if (!myPlayer) {
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('연결 중...', canvas.width / 2, canvas.height / 2);
    }
    
    // 부드러운 애니메이션을 위해 FPS 제한 제거
    requestAnimationFrame(draw);
}

function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    
    if (myPlayer && myPlayer.alive && socket && socket.connected && gameStarted) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
        socket.emit('updateDirection', angle);
    }
}

function updateStartButton() {
    const existingBtn = document.getElementById('startGameBtn');
    const startButtonContainer = document.getElementById('startButtonContainer');
    
    console.log('updateStartButton - isHost:', isHost, 'gameStarted:', gameStarted);
    
    if (isHost && !gameStarted) {
        // Only create button if it doesn't exist
        if (!existingBtn && startButtonContainer) {
            const startBtn = document.createElement('button');
            startBtn.id = 'startGameBtn';
            startBtn.textContent = '🎮 게임 시작';
            startBtn.style.cssText = `
                width: 100%;
                padding: 15px;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 18px;
                font-weight: bold;
                transition: all 0.3s;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            `;
            
            startBtn.addEventListener('mouseenter', () => {
                startBtn.style.backgroundColor = '#45a049';
                startBtn.style.transform = 'scale(1.05)';
                startBtn.style.boxShadow = '0 6px 8px rgba(0, 0, 0, 0.2)';
            });
            
            startBtn.addEventListener('mouseleave', () => {
                startBtn.style.backgroundColor = '#4CAF50';
                startBtn.style.transform = 'scale(1)';
                startBtn.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            });
            
            startBtn.addEventListener('click', () => {
                console.log('Start button clicked!');
                window.soundManager.playClick();
                if (socket && socket.connected) {
                    console.log('Emitting startGame event');
                    socket.emit('startGame');
                } else {
                    console.log('Socket not connected');
                }
            });
            
            startButtonContainer.appendChild(startBtn);
            console.log('Start button added to container');
        }
    } else {
        // Remove button if conditions are not met
        if (existingBtn) {
            existingBtn.remove();
        }
    }
    
    // Update room display when button state changes
    updateGameStatus();
}

// 터치 이벤트 지원 추가
function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
    
    if (myPlayer && myPlayer.alive && socket && socket.connected && gameStarted) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
        socket.emit('updateDirection', angle);
    }
}

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
    
    if (myPlayer && myPlayer.alive && socket && socket.connected && gameStarted) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
        socket.emit('updateDirection', angle);
    }
}

// 부스트 기능을 위한 더블탭 감지
let lastTapTime = 0;
function handleDoubleTap(e) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;
    
    if (tapLength < 300 && tapLength > 0) {
        e.preventDefault();
        if (myPlayer && myPlayer.alive && socket && socket.connected) {
            socket.emit('boost', true);
            window.soundManager.playBoost();
            setTimeout(() => {
                if (socket && socket.connected) {
                    socket.emit('boost', false);
                }
            }, 1000); // 1초간 부스트
        }
    }
    lastTapTime = currentTime;
}

// 키보드 이벤트 (부스트)
let isBoosting = false;
function handleKeyDown(e) {
    if (e.code === 'Space' && !isBoosting && myPlayer && myPlayer.alive && socket && socket.connected) {
        e.preventDefault();
        isBoosting = true;
        socket.emit('boost', true);
        window.soundManager.playBoost();
    }
}

function handleKeyUp(e) {
    if (e.code === 'Space' && isBoosting) {
        e.preventDefault();
        isBoosting = false;
        if (socket && socket.connected) {
            socket.emit('boost', false);
        }
    }
}

canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchend', handleDoubleTap, { passive: false });
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

respawnBtn.addEventListener('click', () => {
    // 카운트다운이 진행 중이면 정리
    if (respawnCountdownInterval) {
        clearInterval(respawnCountdownInterval);
        respawnCountdownInterval = null;
    }
    respawn();
});

// 방 나가기 버튼 추가
const leaveRoomBtn = document.createElement('button');
leaveRoomBtn.id = 'leaveRoomBtn';
leaveRoomBtn.textContent = '방 나가기';
leaveRoomBtn.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 10px 20px;
    background-color: #f44336;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
    z-index: 100;
`;
leaveRoomBtn.addEventListener('click', () => {
    if (confirm('정말 방을 나가시겠습니까?')) {
        // 서버에 연결 해제 신호
        if (socket && socket.connected) {
            socket.disconnect();
        }
        
        // 로컬 스토리지 정리
        localStorage.removeItem('roomId');
        
        // 명시적으로 루트로 이동 (index.html이 기본)
        window.location.href = '/';
    }
});
document.body.appendChild(leaveRoomBtn);

// 페이지 로드 완료 후 연결 시작
window.addEventListener('load', () => {
    // Load player preferences first
    loadPlayerPreferences();
    loadRoomId();
    
    connectToServer();
    draw();
    
    // Initialize player customization
    const updateNameBtn = document.getElementById('updateNameBtn');
    const playerNameInput = document.getElementById('playerName');
    
    updateNameBtn.addEventListener('click', () => {
        const newName = playerNameInput.value.trim();
        if (newName && newName !== playerName) {
            playerName = newName;
            savePlayerPreferences();
            window.soundManager.playClick();
            
            // Update server
            if (socket && socket.connected) {
                socket.emit('updatePlayerInfo', { name: playerName, color: playerColor });
            }
            
            // Visual feedback
            updateNameBtn.textContent = '✓';
            updateNameBtn.style.backgroundColor = '#5cbf60';
            setTimeout(() => {
                updateNameBtn.textContent = '변경';
                updateNameBtn.style.backgroundColor = '#4CAF50';
            }, 1000);
        }
    });
    
    // Handle enter key
    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            updateNameBtn.click();
        }
    });
    
    // User ID editing functionality
    const updateUserIdBtn = document.getElementById('updateUserIdBtn');
    const userIdInput = document.getElementById('userIdInput');
    
    updateUserIdBtn.addEventListener('click', () => {
        const newUserId = userIdInput.value.trim();
        if (newUserId && newUserId !== userId && validateUserId(newUserId)) {
            window.soundManager.playClick();
            
            // Send request to server for validation and update
            if (socket && socket.connected) {
                socket.emit('requestUserIdChange', { 
                    oldUserId: userId, 
                    newUserId: newUserId 
                });
                
                // Show loading state
                updateUserIdBtn.textContent = '확인중...';
                updateUserIdBtn.disabled = true;
                updateUserIdBtn.style.backgroundColor = '#888';
            }
        } else if (!validateUserId(newUserId)) {
            showUserIdError('사용자 ID는 3-15자의 영문, 숫자, 하이픈만 사용 가능합니다.');
        }
    });
    
    // Handle enter key for user ID
    userIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            updateUserIdBtn.click();
        }
    });
    
    function validateUserId(id) {
        // 3-15 characters, alphanumeric and hyphens only, must start with letter or number
        const regex = /^[a-zA-Z0-9][a-zA-Z0-9-]{2,14}$/;
        return regex.test(id) && !id.startsWith('-') && !id.endsWith('-');
    }
    
    function showUserIdError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #f44336;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 10000;
            font-size: 14px;
            text-align: center;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }
    
    // Color picker
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', () => {
            const newColor = option.dataset.color;
            if (newColor !== playerColor) {
                playerColor = newColor;
                selectColor(newColor);
                savePlayerPreferences();
                window.soundManager.playClick();
                
                // Update server
                if (socket && socket.connected) {
                    socket.emit('updatePlayerInfo', { name: playerName, color: playerColor });
                }
            }
        });
    });
    
    // Initialize sound controls
    const soundToggle = document.getElementById('soundToggle');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    
    // Set initial values
    volumeSlider.value = window.soundManager.volume * 100;
    volumeValue.textContent = Math.round(window.soundManager.volume * 100) + '%';
    soundToggle.textContent = window.soundManager.enabled ? '🔊' : '🔇';
    
    // Sound toggle handler
    soundToggle.addEventListener('click', () => {
        window.soundManager.playClick();
        const enabled = window.soundManager.toggle();
        soundToggle.textContent = enabled ? '🔊' : '🔇';
    });
    
    // Volume slider handler
    volumeSlider.addEventListener('input', (e) => {
        const value = e.target.value / 100;
        window.soundManager.setVolume(value);
        volumeValue.textContent = e.target.value + '%';
    });
    
    volumeSlider.addEventListener('change', () => {
        window.soundManager.playClick();
    });
    
    // Help button handler
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            window.soundManager.playClick();
            window.tutorialManager.reset();
            window.tutorialManager.start();
        });
    }
    
    // Stats button handler
    const statsBtn = document.getElementById('statsBtn');
    if (statsBtn) {
        statsBtn.addEventListener('click', () => {
            window.soundManager.playClick();
            showStatsModal();
        });
    }
    
    // Achievements button handler
    const achievementsBtn = document.getElementById('achievementsBtn');
    if (achievementsBtn) {
        achievementsBtn.addEventListener('click', () => {
            window.soundManager.playClick();
            showAchievementsModal();
        });
    }
    
    // 방 ID 표시
    const roomIdDisplay = document.createElement('div');
    roomIdDisplay.style.cssText = `
        position: absolute;
        top: 10px;
        left: 10px;
        padding: 10px;
        background-color: rgba(0, 0, 0, 0.7);
        color: #FFD700;
        border-radius: 5px;
        font-size: 14px;
        z-index: 100;
    `;
    roomIdDisplay.textContent = `방 코드: ${localStorage.getItem('roomId') || 'Unknown'}`;
    document.body.appendChild(roomIdDisplay);
    
    // Mobile controls setup
    const isMobile = window.innerWidth <= 768;
    const mobileControlsDiv = document.getElementById('mobileControls');
    
    if (isMobile && mobileControlsDiv) {
        mobileControlsDiv.style.display = 'block';
        
        // Get saved control type
        const savedControlType = localStorage.getItem('snakeControlType') || 'joystick';
        document.querySelector(`input[name="controlType"][value="${savedControlType}"]`).checked = true;
        
        // Setup initial control
        setupMobileControl(savedControlType);
        
        // Handle control type change
        document.querySelectorAll('input[name="controlType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                window.soundManager.playClick();
                const controlType = e.target.value;
                localStorage.setItem('snakeControlType', controlType);
                setupMobileControl(controlType);
                updateControlSettingsVisibility(controlType);
            });
        });
        
        // Initialize control settings visibility
        updateControlSettingsVisibility(savedControlType);
        
        // Setup slider controls
        setupSliderControls();
    }
    
    function setupMobileControl(type) {
        // Disable all controls first
        if (joystick) {
            joystick.hide();
            joystick.setOnChange(null);
        }
        if (window.swipeControls) {
            window.swipeControls.setEnabled(false);
        }
        
        // Remove existing touch handlers
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchstart', handleTouchStart);
        
        // Setup selected control
        switch(type) {
            case 'joystick':
                if (window.VirtualJoystick) {
                    if (!joystick) {
                        joystick = new VirtualJoystick('joystickContainer');
                    }
                    joystick.show();
                    joystick.setOnChange((angle, distance) => {
                        if (myPlayer && myPlayer.alive && socket && socket.connected && gameStarted && distance > 0.1) {
                            socket.emit('updateDirection', angle);
                        }
                    });
                }
                break;
                
            case 'swipe':
                if (window.swipeControls) {
                    window.swipeControls.setEnabled(true);
                    window.swipeControls.setOnChange((angle, distance) => {
                        if (myPlayer && myPlayer.alive && socket && socket.connected && gameStarted) {
                            socket.emit('updateDirection', angle);
                        }
                    });
                }
                break;
                
            case 'touch':
                // Re-enable default touch handlers
                canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
                canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
                break;
        }
    }
    
    function updateControlSettingsVisibility(controlType) {
        const joystickSettings = document.getElementById('joystickSettings');
        const swipeSettings = document.getElementById('swipeSettings');
        
        if (joystickSettings) {
            joystickSettings.style.display = controlType === 'joystick' ? 'block' : 'none';
        }
        if (swipeSettings) {
            swipeSettings.style.display = controlType === 'swipe' ? 'block' : 'none';
        }
    }
    
    function setupSliderControls() {
        // Joystick sensitivity slider
        const joystickSensitivitySlider = document.getElementById('joystickSensitivity');
        const joystickSensitivityValue = document.getElementById('joystickSensitivityValue');
        const joystickDeadZoneSlider = document.getElementById('joystickDeadZone');
        const joystickDeadZoneValue = document.getElementById('joystickDeadZoneValue');
        
        // Load saved values with improved defaults
        const savedJoystickSensitivity = localStorage.getItem('joystickSensitivity') || '1.5';
        const savedJoystickDeadZone = localStorage.getItem('joystickDeadZone') || '0.05';
        
        if (joystickSensitivitySlider) {
            joystickSensitivitySlider.value = savedJoystickSensitivity;
            joystickSensitivityValue.textContent = parseFloat(savedJoystickSensitivity).toFixed(1);
            
            joystickSensitivitySlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                joystickSensitivityValue.textContent = value.toFixed(1);
                if (joystick) {
                    joystick.setSensitivity(value);
                }
            });
        }
        
        if (joystickDeadZoneSlider) {
            joystickDeadZoneSlider.value = savedJoystickDeadZone;
            joystickDeadZoneValue.textContent = parseFloat(savedJoystickDeadZone).toFixed(2);
            
            joystickDeadZoneSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                joystickDeadZoneValue.textContent = value.toFixed(2);
                if (joystick) {
                    joystick.setDeadZone(value);
                }
            });
        }
        
        // Swipe sensitivity slider
        const swipeSensitivitySlider = document.getElementById('swipeSensitivity');
        const swipeSensitivityValue = document.getElementById('swipeSensitivityValue');
        
        const savedSwipeSensitivity = localStorage.getItem('swipeSensitivity') || '3';
        
        if (swipeSensitivitySlider) {
            swipeSensitivitySlider.value = savedSwipeSensitivity;
            swipeSensitivityValue.textContent = parseFloat(savedSwipeSensitivity).toFixed(1);
            
            swipeSensitivitySlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                swipeSensitivityValue.textContent = value.toFixed(1);
                if (window.swipeControls) {
                    window.swipeControls.setSensitivity(value);
                }
            });
        }
    }
    
    // 모바일 UI 컨트롤 추가
    if (window.innerWidth <= 768) {
        const mobileControls = document.createElement('div');
        mobileControls.className = 'mobile-controls';
        mobileControls.innerHTML = `
            <button class="mobile-control-btn" id="toggleInfoBtn">📊</button>
            <button class="mobile-control-btn" id="fullscreenBtn">⛶</button>
        `;
        document.body.appendChild(mobileControls);
        
        // 정보 패널 토글
        document.getElementById('toggleInfoBtn').addEventListener('click', () => {
            window.soundManager.playClick();
            const infoPanel = document.querySelector('.info-panel');
            infoPanel.classList.toggle('show');
        });
        
        // 전체화면 토글
        document.getElementById('fullscreenBtn').addEventListener('click', () => {
            window.soundManager.playClick();
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.log('Fullscreen error:', err);
                });
            } else {
                document.exitFullscreen();
            }
        });
        
        // 화면 방향 고정 시도
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(err => {
                console.log('Orientation lock not supported');
            });
        }
    }
});

// 전역으로 디버깅 함수 추가
window.debugStartGame = () => {
    console.log('Debug info:');
    console.log('- socket:', socket);
    console.log('- socket.connected:', socket?.connected);
    console.log('- isHost:', isHost);
    console.log('- gameStarted:', gameStarted);
    console.log('- playerId:', playerId);
    if (socket && socket.connected) {
        console.log('Manually emitting startGame');
        socket.emit('startGame');
    }
};

// Stats modal function
function showStatsModal() {
    const stats = window.progressionManager.getStats();
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: #2a2a2a;
        border-radius: 10px;
        padding: 30px;
        max-width: 500px;
        width: 90%;
        color: white;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    `;
    
    content.innerHTML = `
        <h2 style="text-align: center; margin-bottom: 20px; color: #667eea;">📊 게임 통계</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div style="background: #333; padding: 15px; border-radius: 5px;">
                <h3 style="color: #4ECDC4; margin-bottom: 10px;">레벨 & XP</h3>
                <p>레벨: <strong>${stats.level}</strong></p>
                <p>총 XP: <strong>${stats.xp.toLocaleString()}</strong></p>
                <p>다음 레벨까지: <strong>${stats.xpForNext.toLocaleString()} XP</strong></p>
            </div>
            <div style="background: #333; padding: 15px; border-radius: 5px;">
                <h3 style="color: #FF6B6B; margin-bottom: 10px;">게임 기록</h3>
                <p>총 게임 수: <strong>${stats.totalGamesPlayed}</strong></p>
                <p>승리: <strong>${stats.totalWins}</strong></p>
                <p>승률: <strong>${stats.winRate}%</strong></p>
            </div>
            <div style="background: #333; padding: 15px; border-radius: 5px;">
                <h3 style="color: #F7DC6F; margin-bottom: 10px;">점수 & 성과</h3>
                <p>최고 점수: <strong>${stats.highScore.toLocaleString()}</strong></p>
                <p>총 먹은 먹이: <strong>${stats.totalFoodEaten.toLocaleString()}</strong></p>
            </div>
            <div style="background: #333; padding: 15px; border-radius: 5px;">
                <h3 style="color: #A29BFE; margin-bottom: 10px;">플레이 시간</h3>
                <p>총 플레이: <strong>${stats.playTimeFormatted}</strong></p>
            </div>
        </div>
        <button id="closeStatsBtn" style="
            width: 100%;
            margin-top: 20px;
            padding: 10px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        ">닫기</button>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close button
    document.getElementById('closeStatsBtn').addEventListener('click', () => {
        window.soundManager.playClick();
        modal.remove();
    });
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            window.soundManager.playClick();
            modal.remove();
        }
    });
}

// Achievements modal function
function showAchievementsModal() {
    const achievements = window.achievementManager.getAllAchievements();
    const progress = window.achievementManager.getProgress();
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: #2a2a2a;
        border-radius: 10px;
        padding: 30px;
        max-width: 700px;
        width: 90%;
        max-height: 80vh;
        color: white;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        overflow-y: auto;
    `;
    
    const achievementItems = achievements.map(achievement => {
        const unlocked = achievement.unlocked;
        return `
            <div style="
                background: ${unlocked ? '#333' : '#222'};
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 15px;
                opacity: ${unlocked ? '1' : '0.6'};
                border: 2px solid ${unlocked ? '#4CAF50' : 'transparent'};
            ">
                <div style="font-size: 30px; filter: ${unlocked ? 'none' : 'grayscale(100%)'};">
                    ${achievement.icon}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: ${unlocked ? '#4CAF50' : '#888'};">
                        ${achievement.name}
                    </div>
                    <div style="font-size: 14px; opacity: 0.8; margin: 5px 0;">
                        ${achievement.description}
                    </div>
                    <div style="font-size: 12px; color: #FFD700;">
                        +${achievement.xp} XP
                    </div>
                </div>
                ${unlocked ? '<div style="color: #4CAF50; font-size: 20px;">✓</div>' : ''}
            </div>
        `;
    }).join('');
    
    content.innerHTML = `
        <h2 style="text-align: center; margin-bottom: 20px; color: #FFD700;">🏆 업적</h2>
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 24px; color: #4CAF50; margin-bottom: 5px;">
                ${progress.unlocked} / ${progress.total}
            </div>
            <div style="background: #333; height: 20px; border-radius: 10px; overflow: hidden;">
                <div style="
                    background: linear-gradient(90deg, #4CAF50, #45B7D1);
                    height: 100%;
                    width: ${progress.percentage}%;
                    transition: width 0.3s ease;
                "></div>
            </div>
            <div style="margin-top: 5px; opacity: 0.8;">
                ${progress.percentage}% 완료
            </div>
        </div>
        <div style="max-height: 50vh; overflow-y: auto;">
            ${achievementItems}
        </div>
        <button id="closeAchievementsBtn" style="
            width: 100%;
            margin-top: 20px;
            padding: 10px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        ">닫기</button>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close button
    document.getElementById('closeAchievementsBtn').addEventListener('click', () => {
        window.soundManager.playClick();
        modal.remove();
    });
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            window.soundManager.playClick();
            modal.remove();
        }
    });
}