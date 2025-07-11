const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const playerCountElement = document.getElementById('playerCount');
const leaderboardList = document.getElementById('leaderboardList');
const respawnBtn = document.getElementById('respawnBtn');
const gameFullMessage = document.getElementById('gameFullMessage');

let socket;
let playerId;
let gameWidth = 800;
let gameHeight = 600;
let camera = { x: 0, y: 0 };
let mouseX = 0;
let mouseY = 0;
let gameData = { players: [], food: [] };
let myPlayer = null;

canvas.width = 800;
canvas.height = 600;

function connectToServer() {
    console.log('Attempting to connect to server...');
    
    socket = io({
        transports: ['websocket', 'polling'],
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
    });
    
    socket.on('gameUpdate', (data) => {
        gameData = data;
        myPlayer = gameData.players.find(p => p.id === playerId);
        if (!myPlayer) {
            console.log('Player not found in game data');
        }
        updateUI();
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
        scoreElement.textContent = myPlayer.score;
        
        if (!myPlayer.alive) {
            respawnBtn.style.display = 'block';
        } else {
            respawnBtn.style.display = 'none';
        }
    }
    
    playerCountElement.textContent = gameData.players.length;
    
    const sortedPlayers = [...gameData.players]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    
    leaderboardList.innerHTML = sortedPlayers
        .map((player, index) => `
            <li>
                <span>${index + 1}. ${player.name}</span>
                <span>${player.score}</span>
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
            ctx.beginPath();
            ctx.arc(x, y, food.size, 0, Math.PI * 2);
            ctx.fill();
        }
    });
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

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    updateCamera();
    drawGrid();
    drawFood();
    
    gameData.players.forEach(player => {
        drawSnake(player);
    });
    
    requestAnimationFrame(draw);
}

function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    
    if (myPlayer && myPlayer.alive && socket && socket.connected) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
        console.log('Sending direction:', angle);
        socket.emit('updateDirection', angle);
    }
}

// 터치 이벤트 지원 추가
function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
    
    if (myPlayer && myPlayer.alive) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
        socket.emit('updateDirection', angle);
    }
}

canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

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