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
    transports: ['websocket', 'polling'], // websocket을 우선으로 변경
    pingInterval: 10000,
    pingTimeout: 5000
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const GAME_WIDTH = 2400;
const GAME_HEIGHT = 1800;
const MAX_PLAYERS = 20;
const SNAKE_SPEED = 3.5; // 기본 속도 증가
const FOOD_COUNT = 150; // 맵 확장에 맞춰 먹이 증가
const ROOM_WAIT_TIME = 5000; // 5초 대기 후 게임 시작

app.use(express.static(path.join(__dirname, '../client')));

const gameState = {
    players: new Map(),
    food: [],
    roomHost: null,
    gameStarted: false,
    readyPlayers: new Set(),
    gameStartTime: null
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
    const foodTypes = [
        { value: 5, size: 4, weight: 50, colors: ['#FF6B6B', '#4ECDC4', '#45B7D1'] }, // 작은 먹이 (50%)
        { value: 10, size: 5, weight: 30, colors: ['#F7DC6F', '#B8E994', '#FD79A8'] }, // 중간 먹이 (30%)
        { value: 20, size: 6, weight: 15, colors: ['#A29BFE', '#FFEAA7', '#74B9FF'] }, // 큰 먹이 (15%)
        { value: 50, size: 8, weight: 5, colors: ['#FFD700', '#FFA500', '#FF69B4'] }   // 특별 먹이 (5%)
    ];
    
    let id = 0;
    for (let i = 0; i < FOOD_COUNT; i++) {
        const rand = Math.random() * 100;
        let cumulativeWeight = 0;
        let selectedType = foodTypes[0];
        
        for (const type of foodTypes) {
            cumulativeWeight += type.weight;
            if (rand <= cumulativeWeight) {
                selectedType = type;
                break;
            }
        }
        
        gameState.food.push({
            id: id++,
            ...generateRandomPosition(),
            color: selectedType.colors[Math.floor(Math.random() * selectedType.colors.length)],
            size: selectedType.size,
            value: selectedType.value
        });
    }
}

function createSnake(playerId) {
    const position = generateRandomPosition();
    // 초기 방향을 랜덤하게 설정하여 움직임 확인
    const initialDirection = Math.random() * Math.PI * 2;
    
    // 초기 세그먼트를 방향의 반대로 배치 (충돌 방지를 위해 12 단위로 간격 설정)
    const segments = [];
    for (let i = 0; i < 3; i++) {
        segments.push({
            x: position.x - Math.cos(initialDirection) * i * 12,
            y: position.y - Math.sin(initialDirection) * i * 12
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
        foodEaten: 0, // 먹은 먹이 개수
        displayScore: 0, // 보너스가 적용된 표시 점수
        alive: true,
        isBoosting: false, // 부스트 상태
        boostEnergy: 100 // 부스트 에너지 (최대 100)
    };
}

function calculateSpeed(segmentCount) {
    // 길이에 따른 속도 조정
    if (segmentCount <= 10) return 3.5;
    if (segmentCount <= 20) return 3.2;
    if (segmentCount <= 30) return 2.9;
    // 30 이상일 때는 점진적으로 감소
    const speed = 2.6 - (segmentCount - 30) * 0.01;
    return Math.max(2.0, speed); // 최소 속도 2.0
}

function updateSnakePosition(snake) {
    if (!snake.alive) return;

    // 길이 기반 속도 계산
    let baseSpeed = calculateSpeed(snake.segments.length);
    
    // 부스트 처리
    if (snake.isBoosting && snake.boostEnergy > 0) {
        baseSpeed *= 1.5; // 부스트시 1.5배 속도
        snake.boostEnergy -= 2; // 에너지 소모
        
        // 부스트 중에는 세그먼트를 소모 (10프레임마다 1개)
        if (frameCount % 10 === 0 && snake.segments.length > 3) {
            snake.segments.pop(); // 꼬리 제거
        }
    } else {
        // 부스트 에너지 회복
        if (snake.boostEnergy < 100) {
            snake.boostEnergy = Math.min(100, snake.boostEnergy + 0.5);
        }
        // 부스트 종료
        if (snake.isBoosting) {
            snake.isBoosting = false;
        }
    }
    
    snake.speed = baseSpeed;

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
    
    // 디버그: 이동 후 위치
    if (frameCount <= 130) {
        console.log(`  After: (${head.x.toFixed(1)},${head.y.toFixed(1)})`);
        console.log(`  Move was: (${moveX.toFixed(2)},${moveY.toFixed(2)})`);
    }

    // 경계 처리 - 안전한 반사
    const margin = 10; // 벽과의 안전 거리
    
    if (head.x <= margin) {
        head.x = margin;
        // 왼쪽 벽에서 반사
        if (Math.cos(snake.direction) < 0) { // 왼쪽으로 향하고 있을 때만
            snake.direction = Math.PI - snake.direction;
        }
    } else if (head.x >= GAME_WIDTH - margin) {
        head.x = GAME_WIDTH - margin;
        // 오른쪽 벽에서 반사
        if (Math.cos(snake.direction) > 0) { // 오른쪽으로 향하고 있을 때만
            snake.direction = Math.PI - snake.direction;
        }
    }
    
    if (head.y <= margin) {
        head.y = margin;
        // 위쪽 벽에서 반사
        if (Math.sin(snake.direction) < 0) { // 위쪽으로 향하고 있을 때만
            snake.direction = -snake.direction;
        }
    } else if (head.y >= GAME_HEIGHT - margin) {
        head.y = GAME_HEIGHT - margin;
        // 아래쪽 벽에서 반사
        if (Math.sin(snake.direction) > 0) { // 아래쪽으로 향하고 있을 때만
            snake.direction = -snake.direction;
        }
    }
    
    // 각도 정규화 (0 ~ 2PI)
    while (snake.direction < 0) snake.direction += 2 * Math.PI;
    while (snake.direction >= 2 * Math.PI) snake.direction -= 2 * Math.PI;

    // 나머지 세그먼트들이 앞 세그먼트의 이전 위치로 이동 (최소 거리 유지)
    for (let i = 1; i < snake.segments.length; i++) {
        const prevSegment = snake.segments[i - 1];
        const currentSegment = snake.segments[i];
        const targetX = previousPositions[i - 1].x;
        const targetY = previousPositions[i - 1].y;
        
        // 앞 세그먼트와의 거리 확인
        const dx = prevSegment.x - targetX;
        const dy = prevSegment.y - targetY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 너무 가까우면 약간 뒤로
        if (distance < 5) {
            const angle = Math.atan2(dy, dx);
            snake.segments[i].x = prevSegment.x - Math.cos(angle) * 6;
            snake.segments[i].y = prevSegment.y - Math.sin(angle) * 6;
        } else {
            snake.segments[i].x = targetX;
            snake.segments[i].y = targetY;
        }
    }
}

function calculateScoreMultiplier(foodEaten) {
    if (foodEaten >= 30) return 1.6;
    if (foodEaten >= 20) return 1.4;
    if (foodEaten >= 10) return 1.2;
    return 1.0;
}

function checkFoodCollision(snake) {
    const head = snake.segments[0];
    
    for (let i = gameState.food.length - 1; i >= 0; i--) {
        const food = gameState.food[i];
        const distance = Math.sqrt(Math.pow(head.x - food.x, 2) + Math.pow(head.y - food.y, 2));
        
        if (distance < 15) {
            // 먹이 값에 따라 여러 개의 세그먼트 추가
            const foodValue = food.value || 10;
            const segmentsToAdd = Math.max(1, Math.floor(foodValue / 10)); // 10점당 1세그먼트
            
            for (let j = 0; j < segmentsToAdd; j++) {
                const lastSegment = snake.segments[snake.segments.length - 1];
                const secondLastSegment = snake.segments[snake.segments.length - 2] || lastSegment;
                
                // 마지막 두 세그먼트 사이의 방향에 맞춰 추가
                const dx = lastSegment.x - secondLastSegment.x;
                const dy = lastSegment.y - secondLastSegment.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                
                snake.segments.push({
                    x: lastSegment.x + (dx / dist) * 2,
                    y: lastSegment.y + (dy / dist) * 2
                });
            }
            
            // 점수 계산
            const foodValue = food.value || 10; // 특별 먹이는 더 높은 점수
            snake.score += foodValue;
            snake.foodEaten += 1;
            
            // 보너스 적용된 표시 점수 계산
            const multiplier = calculateScoreMultiplier(snake.foodEaten);
            snake.displayScore = Math.floor(snake.score * multiplier);
            
            // 음식 재생성 또는 제거
            if (food.value && food.value > 10) {
                // 특별 먹이는 제거
                gameState.food.splice(i, 1);
            } else {
                // 일반 먹이는 같은 타입으로 재생성
                const foodTypes = [
                    { value: 5, size: 4, colors: ['#FF6B6B', '#4ECDC4', '#45B7D1'] },
                    { value: 10, size: 5, colors: ['#F7DC6F', '#B8E994', '#FD79A8'] },
                    { value: 20, size: 6, colors: ['#A29BFE', '#FFEAA7', '#74B9FF'] }
                ];
                const type = foodTypes.find(t => t.value === food.value) || foodTypes[0];
                gameState.food[i] = {
                    id: food.id,
                    ...generateRandomPosition(),
                    color: type.colors[Math.floor(Math.random() * type.colors.length)],
                    size: type.size,
                    value: type.value
                };
            }
            
            return true;
        }
    }
    return false;
}

function dropSpecialFood(snake) {
    // 죽은 뱀이 특별한 먹이를 떨어뜨림
    const dropCount = Math.min(snake.segments.length, 10); // 최대 10개
    for (let i = 0; i < dropCount; i++) {
        const segment = snake.segments[Math.floor(i * snake.segments.length / dropCount)];
        gameState.food.push({
            id: Date.now() + i,
            x: segment.x + (Math.random() - 0.5) * 20,
            y: segment.y + (Math.random() - 0.5) * 20,
            color: '#FFD700', // 황금색 특별 먹이
            size: 8,
            value: 30 // 3배 점수
        });
    }
}

function resetSnake(snake) {
    // 뱀을 기본 크기로 리셋
    const position = generateRandomPosition();
    const initialDirection = Math.random() * Math.PI * 2;
    
    snake.segments = [];
    for (let i = 0; i < 3; i++) {
        snake.segments.push({
            x: position.x - Math.cos(initialDirection) * i * 12,
            y: position.y - Math.sin(initialDirection) * i * 12
        });
    }
    
    snake.direction = initialDirection;
    snake.score = 0;
    snake.foodEaten = 0;
    snake.displayScore = 0;
    snake.alive = true;
    snake.isBoosting = false;
    snake.boostEnergy = 100;
}

function checkSnakeCollisions() {
    const players = Array.from(gameState.players.values());
    const collisions = [];
    
    for (let i = 0; i < players.length; i++) {
        const snake1 = players[i];
        if (!snake1.alive) continue;
        
        const head1 = snake1.segments[0];
        
        for (let j = 0; j < players.length; j++) {
            const snake2 = players[j];
            if (!snake2.alive) continue;
            
            // 자기 자신과의 충돌 검사시 충분한 세그먼트 건너뛰기
            const startIndex = i === j ? 6 : 0; // 처음 6개 세그먼트는 무조건 건너뛰기
            const minDistance = i === j ? 9 : 10; // 자기 충돌 거리를 더 크게 (9 pixels)
            
            for (let k = startIndex; k < snake2.segments.length; k++) {
                const segment = snake2.segments[k];
                const distance = Math.sqrt(Math.pow(head1.x - segment.x, 2) + Math.pow(head1.y - segment.y, 2));
                
                if (distance < minDistance) {
                    if (i === j) {
                        // 자기 자신과 충돌 - 디버그 후 죽음
                        console.log(`Self-collision detected for ${snake1.name}:`);
                        console.log(`  Head at: (${head1.x.toFixed(1)}, ${head1.y.toFixed(1)})`);
                        console.log(`  Collided with segment ${k} at: (${segment.x.toFixed(1)}, ${segment.y.toFixed(1)})`);
                        console.log(`  Distance: ${distance.toFixed(2)}, threshold: ${minDistance}`);
                        console.log(`  Snake length: ${snake1.segments.length}`);
                        snake1.alive = false;
                        dropSpecialFood(snake1);
                    } else {
                        // 다른 뱀과 충돌
                        collisions.push({ snake1: i, snake2: j });
                    }
                    break;
                }
            }
        }
    }
    
    // 충돌 처리
    const processedPairs = new Set();
    collisions.forEach(({ snake1: i, snake2: j }) => {
        const pairKey = `${Math.min(i, j)}-${Math.max(i, j)}`;
        if (processedPairs.has(pairKey)) return;
        processedPairs.add(pairKey);
        
        const snake1 = players[i];
        const snake2 = players[j];
        
        if (!snake1.alive || !snake2.alive) return;
        
        const size1 = snake1.segments.length;
        const size2 = snake2.segments.length;
        
        if (Math.abs(size1 - size2) <= 2) {
            // 비슷한 크기 - 둘 다 리셋
            dropSpecialFood(snake1);
            dropSpecialFood(snake2);
            resetSnake(snake1);
            resetSnake(snake2);
        } else if (size1 > size2) {
            // snake1이 더 큼
            dropSpecialFood(snake2);
            const reduction = Math.min(size2, snake1.segments.length - 3);
            snake1.segments.splice(-reduction); // 꼬리 부분 제거
            resetSnake(snake2);
        } else {
            // snake2가 더 큼
            dropSpecialFood(snake1);
            const reduction = Math.min(size1, snake2.segments.length - 3);
            snake2.segments.splice(-reduction); // 꼬리 부분 제거
            resetSnake(snake1);
        }
    });
}

let frameCount = 0;
let lastBroadcast = 0;
let lastUpdateFrame = -1;

// 게임 루프 실행 확인
console.log('Starting game loop...');

// 간단한 게임 루프
const gameLoopInterval = setInterval(() => {
    frameCount++;
    
    try {
        // 게임이 시작된 경우에만 업데이트
        if (gameState.gameStarted) {
            // 모든 플레이어 업데이트
            gameState.players.forEach(snake => {
                if (snake.alive) {
                    updateSnakePosition(snake);
                    checkFoodCollision(snake);
                    
                    // 승리 조건 검사
                    if (snake.displayScore >= gameState.winScore && !gameState.winner) {
                        gameState.winner = snake.id;
                        console.log('Winner:', snake.name, 'with score:', snake.displayScore);
                        io.emit('gameWon', {
                            winnerId: snake.id,
                            winnerName: snake.name,
                            score: snake.displayScore
                        });
                        // 게임 리셋
                        setTimeout(() => {
                            resetGame();
                        }, 5000);
                    }
                }
            });
            
            // 충돌 검사
            if (gameState.players.size > 0 && !gameState.winner) {
                checkSnakeCollisions();
            }
        }
        
        // 게임 상태 전송 (초당 20번으로 제한)
        if (frameCount - lastBroadcast >= 3) { // 60fps / 3 = 20 updates per second
            const gameData = {
                players: Array.from(gameState.players.values()),
                food: gameState.food,
                gameStarted: gameState.gameStarted,
                roomHost: gameState.roomHost
            };
            
            // 디버깅: emit 전에 확인
            if (frameCount % 60 === 0 && io.engine.clientsCount > 0) {
                console.log(`[EMIT] Sending gameUpdate to ${io.engine.clientsCount} clients`);
            }
            
            io.emit('gameUpdate', gameData);
            lastBroadcast = frameCount;
        }
        
        // 디버깅 로그 (1초마다)
        if (frameCount % 60 === 0) {
            console.log(`Frame ${frameCount}: ${gameState.players.size} players, ${io.engine.clientsCount} clients connected`);
            if (gameState.players.size > 0) {
                const firstPlayer = Array.from(gameState.players.values())[0];
                console.log(`  Player at (${firstPlayer.segments[0].x.toFixed(1)}, ${firstPlayer.segments[0].y.toFixed(1)}), dir=${firstPlayer.direction.toFixed(2)}, speed=${firstPlayer.speed}`);
                console.log(`  Debug ID: ${firstPlayer._debug_id}`);
                // 처음 3개 세그먼트 위치 확인
                if (frameCount % 300 === 0) {
                    console.log(`  Segments: ${firstPlayer.segments.slice(0, 3).map(s => `(${s.x.toFixed(1)},${s.y.toFixed(1)})`).join(' -> ')}`);
                }
            }
        }
    } catch (error) {
        console.error('!!! GAME LOOP ERROR !!!');
        console.error('Error:', error.message);
        console.error('Stack trace:', error.stack);
        console.error('Frame:', frameCount);
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
// 서버 시작 시 게임 상태 초기화
gameState.gameStarted = false;
gameState.roomHost = null;
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
    
    // 첫 번째 플레이어가 방장
    if (!gameState.roomHost) {
        gameState.roomHost = socket.id;
        console.log('Room host set to:', socket.id);
    }
    
    socket.emit('init', {
        playerId: socket.id,
        gameWidth: GAME_WIDTH,
        gameHeight: GAME_HEIGHT,
        isHost: gameState.roomHost === socket.id,
        gameStarted: gameState.gameStarted
    });
    
    socket.on('updateDirection', (direction) => {
        const player = gameState.players.get(socket.id);
        if (player && player.alive && typeof direction === 'number' && gameState.gameStarted) {
            player.direction = direction;
        }
    });
    
    // 방장의 게임 시작 요청
    socket.on('startGame', () => {
        console.log('startGame received from:', socket.id);
        console.log('Current roomHost:', gameState.roomHost);
        console.log('gameStarted:', gameState.gameStarted);
        console.log('players.size:', gameState.players.size);
        
        if (socket.id === gameState.roomHost && !gameState.gameStarted) {
            // 솔로 플레이 허용 (1명 이상이면 시작 가능)
            if (gameState.players.size >= 1) {
                gameState.gameStarted = true;
                gameState.gameStartTime = Date.now();
                console.log('Game started by host');
                io.emit('gameStarted', {
                    startTime: gameState.gameStartTime,
                    playerCount: gameState.players.size
                });
            }
        } else {
            console.log('Start game conditions not met');
        }
    });
    
    socket.on('boost', (isBoostActive) => {
        const player = gameState.players.get(socket.id);
        if (player && player.alive) {
            player.isBoosting = isBoostActive;
        }
    });
    
    // 즉시 현재 게임 상태 전송
    socket.emit('gameUpdate', {
        players: Array.from(gameState.players.values()),
        food: gameState.food,
        gameStarted: gameState.gameStarted,
        roomHost: gameState.roomHost
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
        
        // 방장이 나갔으면 새로운 방장 지정
        if (socket.id === gameState.roomHost && gameState.players.size > 0) {
            gameState.roomHost = gameState.players.keys().next().value;
            console.log('New room host:', gameState.roomHost);
            io.emit('newHost', { hostId: gameState.roomHost });
        }
        
        // 모든 플레이어가 나갔으면 게임 리셋
        if (gameState.players.size === 0) {
            gameState.gameStarted = false;
            gameState.roomHost = null;
            gameState.readyPlayers.clear();
            console.log('Game reset - no players');
        }
    });
});

server.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log('Game initialized with:');
    console.log(`- Game size: ${GAME_WIDTH}x${GAME_HEIGHT}`);
    console.log(`- Max players: ${MAX_PLAYERS}`);
    console.log(`- Food count: ${FOOD_COUNT}`);
});