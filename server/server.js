const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const MAX_PLAYERS = 20;
const SNAKE_SPEED = 3;
const FOOD_COUNT = 50;

app.use(express.static(path.join(__dirname, '../client')));

const gameState = {
    players: new Map(),
    food: []
};

function generateRandomPosition() {
    return {
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT
    };
}

function generateRandomColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', '#B8E994', '#FD79A8', '#A29BFE', '#FFEAA7'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function initializeFood() {
    gameState.food = [];
    for (let i = 0; i < FOOD_COUNT; i++) {
        gameState.food.push({
            id: i,
            ...generateRandomPosition(),
            color: generateRandomColor(),
            size: 5
        });
    }
}

function createSnake(playerId) {
    const position = generateRandomPosition();
    return {
        id: playerId,
        segments: [
            { x: position.x, y: position.y },
            { x: position.x - 10, y: position.y },
            { x: position.x - 20, y: position.y }
        ],
        direction: 0, // 오른쪽으로 시작
        speed: SNAKE_SPEED,
        color: generateRandomColor(),
        name: `Player ${gameState.players.size + 1}`,
        score: 0,
        alive: true
    };
}

function updateSnakePosition(snake) {
    if (!snake.alive) return;

    const head = { ...snake.segments[0] };
    const moveX = Math.cos(snake.direction) * snake.speed;
    const moveY = Math.sin(snake.direction) * snake.speed;
    
    head.x += moveX;
    head.y += moveY;

    // 경계 처리
    if (head.x < 0) head.x = GAME_WIDTH;
    if (head.x > GAME_WIDTH) head.x = 0;
    if (head.y < 0) head.y = GAME_HEIGHT;
    if (head.y > GAME_HEIGHT) head.y = 0;

    snake.segments.unshift(head);
    snake.segments.pop();
}

function checkFoodCollision(snake) {
    const head = snake.segments[0];
    
    for (let i = gameState.food.length - 1; i >= 0; i--) {
        const food = gameState.food[i];
        const distance = Math.sqrt(Math.pow(head.x - food.x, 2) + Math.pow(head.y - food.y, 2));
        
        if (distance < 15) {
            snake.segments.push({ ...snake.segments[snake.segments.length - 1] });
            snake.score += 10;
            
            gameState.food[i] = {
                id: food.id,
                ...generateRandomPosition(),
                color: generateRandomColor(),
                size: 5
            };
            
            return true;
        }
    }
    return false;
}

function checkSnakeCollisions() {
    const players = Array.from(gameState.players.values());
    
    for (let i = 0; i < players.length; i++) {
        const snake1 = players[i];
        if (!snake1.alive) continue;
        
        const head1 = snake1.segments[0];
        
        for (let j = 0; j < players.length; j++) {
            const snake2 = players[j];
            if (!snake2.alive) continue;
            
            const startIndex = i === j ? 1 : 0;
            
            for (let k = startIndex; k < snake2.segments.length; k++) {
                const segment = snake2.segments[k];
                const distance = Math.sqrt(Math.pow(head1.x - segment.x, 2) + Math.pow(head1.y - segment.y, 2));
                
                if (distance < 10) {
                    snake1.alive = false;
                    return;
                }
            }
        }
    }
}

let frameCount = 0;

// 게임 루프 실행 확인
console.log('Starting game loop...');

// 간단한 게임 루프
const gameLoopInterval = setInterval(() => {
    try {
        // 모든 플레이어 업데이트
        gameState.players.forEach(snake => {
            if (snake.alive) {
                // 이전 위치 저장 (디버깅용)
                const oldX = snake.segments[0].x;
                const oldY = snake.segments[0].y;
                
                updateSnakePosition(snake);
                
                // 위치 변화 확인
                if (frameCount % 60 === 0) {
                    const deltaX = snake.segments[0].x - oldX;
                    const deltaY = snake.segments[0].y - oldY;
                    if (Math.abs(deltaX) > 0.01 || Math.abs(deltaY) > 0.01) {
                        console.log(`Snake ${snake.id} moved: deltaX=${deltaX.toFixed(2)}, deltaY=${deltaY.toFixed(2)}`);
                    }
                }
                
                checkFoodCollision(snake);
            }
        });
        
        // 충돌 검사
        if (gameState.players.size > 0) {
            checkSnakeCollisions();
        }
        
        // 게임 상태 전송
        const gameData = {
            players: Array.from(gameState.players.values()),
            food: gameState.food
        };
        
        io.emit('gameUpdate', gameData);
        
        // 디버깅 로그 (1초마다)
        frameCount++;
        if (frameCount % 60 === 0) {
            console.log(`Frame ${frameCount}: ${gameState.players.size} players, ${io.engine.clientsCount} clients connected`);
            if (gameState.players.size > 0) {
                const firstPlayer = Array.from(gameState.players.values())[0];
                console.log(`  Player at (${firstPlayer.segments[0].x.toFixed(1)}, ${firstPlayer.segments[0].y.toFixed(1)}), dir=${firstPlayer.direction.toFixed(2)}, speed=${firstPlayer.speed}`);
            }
        }
    } catch (error) {
        console.error('Game loop error:', error);
    }
}, 1000 / 60); // 60 FPS

console.log('Game loop started successfully');

// 즉시 첫 번째 게임 업데이트 전송
setTimeout(() => {
    const gameData = {
        players: Array.from(gameState.players.values()),
        food: gameState.food
    };
    io.emit('gameUpdate', gameData);
}, 100);

initializeFood();
console.log('Server initialized, game loop running at 60 FPS');

io.on('connection', (socket) => {
    console.log('New player connected:', socket.id);
    
    if (gameState.players.size >= MAX_PLAYERS) {
        socket.emit('gameFull');
        socket.disconnect();
        return;
    }
    
    const snake = createSnake(socket.id);
    gameState.players.set(socket.id, snake);
    
    socket.emit('init', {
        playerId: socket.id,
        gameWidth: GAME_WIDTH,
        gameHeight: GAME_HEIGHT
    });
    
    socket.on('updateDirection', (direction) => {
        const player = gameState.players.get(socket.id);
        if (player && player.alive && typeof direction === 'number') {
            player.direction = direction;
            console.log(`Player ${socket.id} direction updated to: ${direction.toFixed(2)}`);
        } else {
            console.log(`Failed to update direction. Player exists: ${!!player}, Alive: ${player?.alive}, Direction type: ${typeof direction}`);
        }
    });
    
    // 즉시 현재 게임 상태 전송
    socket.emit('gameUpdate', {
        players: Array.from(gameState.players.values()),
        food: gameState.food
    });
    
    socket.on('respawn', () => {
        const player = gameState.players.get(socket.id);
        if (player && !player.alive) {
            const newSnake = createSnake(socket.id);
            newSnake.name = player.name;
            gameState.players.set(socket.id, newSnake);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        gameState.players.delete(socket.id);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log('Game initialized with:');
    console.log(`- Game size: ${GAME_WIDTH}x${GAME_HEIGHT}`);
    console.log(`- Max players: ${MAX_PLAYERS}`);
    console.log(`- Food count: ${FOOD_COUNT}`);
});