const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const playerCountElement = document.getElementById('playerCount');
const leaderboardList = document.getElementById('leaderboardList');
const respawnBtn = document.getElementById('respawnBtn');
const gameFullMessage = document.getElementById('gameFullMessage');

let socket;
let playerId;
let gameWidth = 2400;
let gameHeight = 1800;
let camera = { x: 0, y: 0 };
let mouseX = 0;
let mouseY = 0;
let gameData = { players: [], food: [] };
let myPlayer = null;
let isHost = false;
let gameStarted = false;

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
    });
    
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
    });
    
    socket.on('init', (data) => {
        console.log('Initialized with data:', data);
        playerId = data.playerId;
        gameWidth = data.gameWidth;
        gameHeight = data.gameHeight;
        isHost = data.isHost;
        gameStarted = data.gameStarted;
        console.log('Init - isHost:', isHost, 'gameStarted:', gameStarted);
        // updateStartButton을 약간의 지연 후 호출하여 DOM이 준비되도록 함
        setTimeout(() => {
            updateStartButton();
        }, 100);
    });
    
    socket.on('gameStarted', (data) => {
        gameStarted = true;
        console.log('Game started!', data);
        updateStartButton();
    });
    
    socket.on('newHost', (data) => {
        isHost = data.hostId === playerId;
        updateStartButton();
    });
    
    socket.on('needMorePlayers', () => {
        alert('최소 2명 이상의 플레이어가 필요합니다!');
    });
    
    socket.on('gameWon', (data) => {
        console.log('Game won!', data);
        // 승리 메시지 표시
        const winMessage = document.createElement('div');
        winMessage.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(255, 215, 0, 0.9);
            color: black;
            padding: 30px;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            z-index: 1000;
        `;
        winMessage.innerHTML = `
            <h2>🎆 축하합니다! 🎆</h2>
            <p>${data.winnerName}님이 ${data.score}점으로 승리하셨습니다!</p>
            <p>5초 후 새 게임이 시작됩니다...</p>
        `;
        document.body.appendChild(winMessage);
        
        setTimeout(() => {
            winMessage.remove();
        }, 5000);
    });
    
    socket.on('gameReset', () => {
        console.log('Game reset');
        gameStarted = false;
        updateStartButton();
    });
    
    let updateCount = 0;
    let lastPosition = null;
    socket.on('gameUpdate', (data) => {
        gameData = data;
        myPlayer = gameData.players.find(p => p.id === playerId);
        if (!myPlayer && playerId) {
            console.log('Player not found in game data. PlayerId:', playerId);
            console.log('Available players:', data.players.map(p => p.id));
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
    
    socket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
    });
}

function updateUI() {
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
    
    const sortedPlayers = [...gameData.players]
        .sort((a, b) => (b.displayScore || b.score) - (a.displayScore || a.score))
        .slice(0, 5);
    
    leaderboardList.innerHTML = sortedPlayers
        .map((player, index) => `
            <li>
                <span>${index + 1}. ${player.name}</span>
                <span>${player.displayScore || player.score}</span>
            </li>
        `)
        .join('');
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

function drawSnake(snake) {
    if (!snake.alive) {
        ctx.globalAlpha = 0.5;
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
    
    const head = snake.segments[0];
    const headX = head.x - camera.x;
    const headY = head.y - camera.y;
    
    ctx.beginPath();
    ctx.arc(headX, headY, 7, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(snake.name, headX, headY - 15);
    
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    updateCamera();
    drawGrid();
    drawFood();
    
    gameData.players.forEach(player => {
        drawSnake(player);
    });
    
    // 미니맵 그리기
    if (gameData.players.length > 0) {
        drawMinimap();
    }
    
    // 부스트 바 그리기
    drawBoostBar();
    
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
    
    console.log('updateStartButton - isHost:', isHost, 'gameStarted:', gameStarted);
    
    if (isHost && !gameStarted) {
        // Only create button if it doesn't exist
        if (!existingBtn) {
            const startBtn = document.createElement('button');
            startBtn.id = 'startGameBtn';
            startBtn.textContent = '게임 시작';
            startBtn.style.cssText = `
                width: 100%;
                padding: 10px;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                transition: background-color 0.3s;
                margin-top: 20px;
            `;
            startBtn.addEventListener('click', () => {
                console.log('Start button clicked!');
                if (socket && socket.connected) {
                    console.log('Emitting startGame event');
                    socket.emit('startGame');
                } else {
                    console.log('Socket not connected');
                }
            });
            
            // 순위표 아래에 추가
            const leaderboard = document.getElementById('leaderboard');
            if (leaderboard) {
                leaderboard.insertAdjacentElement('afterend', startBtn);
                console.log('Start button added to DOM');
            } else {
                console.error('Leaderboard element not found');
            }
        }
    } else {
        // Remove button if conditions are not met
        if (existingBtn) {
            existingBtn.remove();
        }
    }
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
    if (socket && socket.connected) {
        socket.emit('respawn');
        respawnBtn.style.display = 'none';
    }
});

// 페이지 로드 완료 후 연결 시작
window.addEventListener('load', () => {
    connectToServer();
    draw();
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