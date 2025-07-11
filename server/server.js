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
    },
    transports: ['polling', 'websocket'] // polling을 우선으로
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
    // 초기 방향을 랜덤하게 설정하여 움직임 확인
    const initialDirection = Math.random() * Math.PI * 2;
    
    // 초기 세그먼트를 방향의 반대로 배치
    const segments = [];
    for (let i = 0; i < 3; i++) {
        segments.push({
            x: position.x - Math.cos(initialDirection) * i * 10,
            y: position.y - Math.sin(initialDirection) * i * 10
        });
    }
    
    return {
        id: playerId,
        segments: segments,
        direction: initialDirection,
        speed: SNAKE_SPEED,
        color: generateRandomColor(),
        name: `Player ${gameState.players.size + 1}`,
        score: 0,
        alive: true
    };
}

function updateSnakePosition(snake) {
    if (!snake.alive) return;
    
    // 디버그: 함수 호출 확인
    if (frameCount % 60 === 0) {
        console.log(`[DEBUG] updateSnakePosition called for snake ${snake.id}`);
    }

    // 이전 위치들을 저장
    const previousPositions = snake.segments.map(segment => ({
        x: segment.x,
        y: segment.y
    }));

    // 머리 이동
    const head = snake.segments[0];
    const oldX = head.x;
    const oldY = head.y;
    
    const moveX = Math.cos(snake.direction) * snake.speed;
    const moveY = Math.sin(snake.direction) * snake.speed;
    
    head.x += moveX;
    head.y += moveY;
    
    // 디버그: 실제 이동 확인
    if (frameCount % 60 === 0) {
        console.log(`[DEBUG] Head moved from (${oldX.toFixed(1)},${oldY.toFixed(1)}) to (${head.x.toFixed(1)},${head.y.toFixed(1)})`);
        console.log(`[DEBUG] Direction: ${snake.direction}, moveX: ${moveX}, moveY: ${moveY}`);
    }

    // 경계 처리
    if (head.x < 0) head.x = GAME_WIDTH;
    if (head.x > GAME_WIDTH) head.x = 0;
    if (head.y < 0) head.y = GAME_HEIGHT;
    if (head.y > GAME_HEIGHT) head.y = 0;

    // 나머지 세그먼트들이 앞 세그먼트의 이전 위치로 이동
    for (let i = 1; i < snake.segments.length; i++) {
        snake.segments[i].x = previousPositions[i - 1].x;
        snake.segments[i].y = previousPositions[i - 1].y;
    }
}

function checkFoodCollision(snake) {
    const head = snake.segments[0];
    
    for (let i = gameState.food.length - 1; i >= 0; i--) {
        const food = gameState.food[i];
        const distance = Math.sqrt(Math.pow(head.x - food.x, 2) + Math.pow(head.y - food.y, 2));
        
        if (distance < 15) {
            // 꼬리 끝에 새 세그먼트 추가 (마지막 세그먼트와 같은 위치)
            const lastSegment = snake.segments[snake.segments.length - 1];
            snake.segments.push({
                x: lastSegment.x,
                y: lastSegment.y
            });
            snake.score += 10;
            
            // 음식 재생성
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
    frameCount++;
    
    try {
        
        // 모든 플레이어 업데이트
        gameState.players.forEach(snake => {
            if (snake.alive) {
                updateSnakePosition(snake);
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
        if (frameCount % 60 === 0) {
            console.log(`Frame ${frameCount}: ${gameState.players.size} players, ${io.engine.clientsCount} clients connected`);
            if (gameState.players.size > 0) {
                const firstPlayer = Array.from(gameState.players.values())[0];
                console.log(`  Player at (${firstPlayer.segments[0].x.toFixed(1)}, ${firstPlayer.segments[0].y.toFixed(1)}), dir=${firstPlayer.direction.toFixed(2)}, speed=${firstPlayer.speed}`);
                // 처음 3개 세그먼트 위치 확인
                if (frameCount % 300 === 0) {
                    console.log(`  Segments: ${firstPlayer.segments.slice(0, 3).map(s => `(${s.x.toFixed(1)},${s.y.toFixed(1)})`).join(' -> ')}`);
                }
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