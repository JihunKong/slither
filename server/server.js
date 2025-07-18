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
const SNAKE_SPEED = 6.0; // 기본 속도 대폭 증가
const FOOD_COUNT = 150; // 맵 확장에 맞춰 먹이 증가
const ROOM_WAIT_TIME = 5000; // 5초 대기 후 게임 시작
const POWERUP_SPAWN_INTERVAL = 20000; // 20초마다 파워업 스폰
const MAX_POWERUPS = 5; // 최대 파워업 수

// 사용자 ID 관리
const userIdCounter = { value: 1000 };
const socketToUserId = new Map(); // socket.id -> userId 매핑
const userIdToSocket = new Map(); // userId -> socket.id 매핑

// 방 관리
const roomIdCounter = { value: 1000 };
const rooms = new Map(); // roomId -> room 객체
const socketToRoom = new Map(); // socket.id -> roomId 매핑

app.use(express.static(path.join(__dirname, '../client')));

// 루트 경로는 이제 index.html (방 선택 페이지)가 됨
// 별도 리다이렉트 불필요

// 기본 게임 상태 구조 (각 방마다 복사됨)
function createGameState() {
    return {
        players: new Map(),
        food: [],
        powerUps: [],
        roomHost: null,
        gameStarted: false,
        readyPlayers: new Set(),
        gameStartTime: null,
        winner: null,
        winScore: 10000,
        lastPowerUpSpawn: Date.now()
    };
}

// 호환성을 위한 임시 단일 gameState
let gameState = createGameState();

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

// 고유한 사용자 ID 생성
function generateUserId() {
    return `Player${userIdCounter.value++}`;
}

// 고유한 방 ID 생성
function generateRoomId() {
    return `Room-${roomIdCounter.value++}`;
}

// 사용자 ID 형식 검증
function validateUserIdFormat(id) {
    // 3-15 characters, alphanumeric and hyphens only, must start and end with letter or number
    const regex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,13}[a-zA-Z0-9]$|^[a-zA-Z0-9]{3,15}$/;
    return regex.test(id) && !id.includes('--'); // No consecutive hyphens
}

// 새 방 생성
function createRoom(roomId, hostUserId) {
    const room = {
        id: roomId,
        gameState: createGameState(),
        createdAt: Date.now(),
        hostUserId: hostUserId,
        isPublic: true,
        maxPlayers: MAX_PLAYERS
    };
    rooms.set(roomId, room);
    console.log(`Room ${roomId} created by ${hostUserId}`);
    return room;
}

// 방 제거
function removeRoom(roomId) {
    rooms.delete(roomId);
    console.log(`Room ${roomId} removed`);
}

// 플레이어가 있는 방 찾기
function getRoomBySocketId(socketId) {
    const roomId = socketToRoom.get(socketId);
    return roomId ? rooms.get(roomId) : null;
}

// 공개 방 목록 가져오기
function getPublicRooms() {
    const publicRooms = [];
    rooms.forEach((room, roomId) => {
        if (room.isPublic && room.gameState.players.size < room.maxPlayers) {
            publicRooms.push({
                id: roomId,
                playerCount: room.gameState.players.size,
                maxPlayers: room.maxPlayers,
                gameStarted: room.gameState.gameStarted,
                createdAt: room.createdAt
            });
        }
    });
    return publicRooms.sort((a, b) => b.createdAt - a.createdAt); // 최신순 정렬
}

// 모든 클라이언트에게 방 목록 브로드캐스트 (딜레이로 최적화)
let broadcastTimeout = null;
function broadcastRoomList() {
    // 기존 타임아웃이 있으면 취소
    if (broadcastTimeout) {
        clearTimeout(broadcastTimeout);
    }
    
    // 500ms 후에 브로드캐스트 (연속 호출 방지)
    broadcastTimeout = setTimeout(() => {
        const roomList = getPublicRooms();
        io.emit('roomList', roomList);
        console.log('Broadcasting room list update:', roomList.length, 'rooms');
        broadcastTimeout = null;
    }, 500);
}

// 빈 방 정리 함수
function cleanupEmptyRooms() {
    let cleanedCount = 0;
    rooms.forEach((room, roomId) => {
        if (room.gameState.players.size === 0) {
            console.log('Cleaning up empty room:', roomId);
            rooms.delete(roomId);
            cleanedCount++;
        }
    });
    
    if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} empty rooms`);
        broadcastRoomList();
    }
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
        name: `Player ${playerId}`, // 임시 이름, 나중에 userId로 업데이트
        score: 0,
        userId: null, // joinGame 시 설정됨
        foodEaten: 0, // 먹은 먹이 개수
        displayScore: 0, // 보너스가 적용된 표시 점수
        alive: true,
        isBoosting: false, // 부스트 상태
        boostEnergy: 100, // 부스트 에너지 (최대 100)
        invincible: true, // 무적 상태
        invincibleUntil: Date.now() + 3000, // 3초간 무적
        hasWon: false // 승리 상태
    };
}

function calculateSpeed(segmentCount) {
    // 길이에 따른 속도 조정 (전체적으로 속도 증가)
    if (segmentCount <= 10) return 6.0;
    if (segmentCount <= 20) return 5.5;
    if (segmentCount <= 30) return 5.0;
    // 30 이상일 때는 점진적으로 감소
    const speed = 4.5 - (segmentCount - 30) * 0.015;
    return Math.max(3.5, speed); // 최소 속도 3.5로 증가
}

function updateSnakePosition(snake) {
    if (!snake.alive) return;

    // 길이 기반 속도 계산
    let baseSpeed = calculateSpeed(snake.segments.length);
    
    // 부스트 처리
    if (snake.isBoosting && snake.boostEnergy > 0) {
        baseSpeed *= 1.8; // 부스트시 1.8배 속도로 증가
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
    snake.invincible = true;
    snake.invincibleUntil = Date.now() + 3000; // 3초간 무적
}

function checkSnakeCollisions() {
    const players = Array.from(gameState.players.values());
    const collisions = [];
    
    for (let i = 0; i < players.length; i++) {
        const snake1 = players[i];
        if (!snake1.alive) continue;
        
        // Check and update invincibility
        if (snake1.invincible && Date.now() > snake1.invincibleUntil) {
            snake1.invincible = false;
        }
        
        // Skip collision check if invincible
        if (snake1.invincible) continue;
        
        const head1 = snake1.segments[0];
        
        for (let j = 0; j < players.length; j++) {
            const snake2 = players[j];
            if (!snake2.alive) continue;
            
            // 자기 자신과의 충돌 검사시 충분한 세그먼트 건너뛰기
            const startIndex = i === j ? 8 : 0; // 처음 8개 세그먼트는 무조건 건너뛰기 (더 관대하게)
            const minDistance = i === j ? 8 : 10; // 자기 충돌 거리를 더 줄임 (8 pixels)
            
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
                        // Emit death event with killer info
                        io.emit('playerKilled', { 
                            killerId: null, 
                            victimId: snake1.id,
                            victimSize: snake1.segments.length
                        });
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
            // Emit kill events
            io.emit('playerKilled', { 
                killerId: snake2.id, 
                victimId: snake1.id,
                victimSize: size1,
                killerSize: size2
            });
            io.emit('playerKilled', { 
                killerId: snake1.id, 
                victimId: snake2.id,
                victimSize: size2,
                killerSize: size1
            });
        } else if (size1 > size2) {
            // snake1이 더 큼
            dropSpecialFood(snake2);
            const reduction = Math.min(size2, snake1.segments.length - 3);
            snake1.segments.splice(-reduction); // 꼬리 부분 제거
            resetSnake(snake2);
            // Emit kill event
            io.emit('playerKilled', { 
                killerId: snake1.id, 
                victimId: snake2.id,
                victimSize: size2,
                killerSize: size1
            });
        } else {
            // snake2가 더 큼
            dropSpecialFood(snake1);
            const reduction = Math.min(size1, snake2.segments.length - 3);
            snake2.segments.splice(-reduction); // 꼬리 부분 제거
            resetSnake(snake1);
            // Emit kill event
            io.emit('playerKilled', { 
                killerId: snake2.id, 
                victimId: snake1.id,
                victimSize: size1,
                killerSize: size2
            });
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
                    checkPowerUpCollisions(snake);
                    
                    // 승리 조건 검사 - 개별 플레이어 승리 (게임은 계속 진행)
                    if (snake.displayScore >= gameState.winScore && !snake.hasWon) {
                        snake.hasWon = true;
                        console.log('Winner:', snake.name, 'with score:', snake.displayScore);
                        
                        // 승리한 플레이어에게만 승리 메시지 전송
                        const winnerSocket = [...io.sockets.sockets.values()].find(s => s.playerId === snake.id);
                        if (winnerSocket) {
                            winnerSocket.emit('personalVictory', {
                                winnerId: snake.id,
                                winnerName: snake.name,
                                score: snake.displayScore
                            });
                        }
                        
                        // 다른 플레이어들에게는 누군가 승리했다는 알림만 전송
                        io.emit('playerAchievedVictory', {
                            winnerName: snake.name,
                            score: snake.displayScore
                        });
                        
                        // 승리한 플레이어는 3초 후 리셋 (다른 플레이어는 계속 진행)
                        setTimeout(() => {
                            if (snake && snake.hasWon) {
                                resetSnake(snake);
                                snake.hasWon = false;
                                console.log('Winner', snake.name, 'reset to continue playing');
                            }
                        }, 3000);
                    }
                }
            });
            
            // 충돌 검사
            if (gameState.players.size > 0 && !gameState.winner) {
                checkSnakeCollisions();
            }
            
            // Spawn power-ups periodically
            if (Date.now() - gameState.lastPowerUpSpawn > POWERUP_SPAWN_INTERVAL) {
                spawnPowerUp();
                gameState.lastPowerUpSpawn = Date.now();
            }
        }
        
        // 게임 상태 전송 (초당 15번으로 제한)
        if (frameCount - lastBroadcast >= 2) { // 30fps / 2 = 15 updates per second
            const gameData = {
                players: Array.from(gameState.players.values()),
                food: gameState.food,
                powerUps: gameState.powerUps,
                gameStarted: gameState.gameStarted,
                roomHost: gameState.roomHost
            };
            
            // 디버깅: emit 전에 확인 (5초마다만)
            if (frameCount % 150 === 0 && io.engine.clientsCount > 0) {
                console.log(`[EMIT] Sending gameUpdate to ${io.engine.clientsCount} clients`);
            }
            
            io.emit('gameUpdate', gameData);
            lastBroadcast = frameCount;
        }
        
        // 디버깅 로그 (10초마다만)
        if (frameCount % 300 === 0) {
            console.log(`Frame ${frameCount}: ${gameState.players.size} players, ${io.engine.clientsCount} clients connected`);
        }
    } catch (error) {
        console.error('!!! GAME LOOP ERROR !!!');
        console.error('Error:', error.message);
        console.error('Stack trace:', error.stack);
        console.error('Frame:', frameCount);
    }
}, 1000 / 60); // 60 FPS for smoother movement

console.log('Game loop started successfully');

// Power-up types definition
const POWERUP_TYPES = [
    'SPEED_BOOST',
    'SHIELD',
    'MAGNET',
    'GHOST',
    'MEGA_GROWTH',
    'SCORE_MULTIPLIER',
    'SHRINK',
    'FREEZE_FIELD'
];

function spawnPowerUp() {
    if (gameState.powerUps.length >= MAX_POWERUPS) return;
    
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    const powerUp = {
        id: Date.now(),
        type: type,
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        size: 15
    };
    
    gameState.powerUps.push(powerUp);
    console.log(`Spawned power-up: ${type} at (${powerUp.x.toFixed(0)}, ${powerUp.y.toFixed(0)})`);
}

function checkPowerUpCollisions(snake) {
    const head = snake.segments[0];
    
    for (let i = gameState.powerUps.length - 1; i >= 0; i--) {
        const powerUp = gameState.powerUps[i];
        const distance = Math.sqrt(Math.pow(head.x - powerUp.x, 2) + Math.pow(head.y - powerUp.y, 2));
        
        if (distance < 20) {
            // Player collected power-up
            gameState.powerUps.splice(i, 1);
            
            // Notify client - snake.id는 socket.id와 같음
            const playerSocket = io.sockets.sockets.get(snake.id);
            if (playerSocket) {
                playerSocket.emit('powerUpCollected', {
                    type: powerUp.type,
                    playerId: snake.id
                });
            }
            
            // Apply server-side effects for some power-ups
            if (powerUp.type === 'MEGA_GROWTH') {
                // Add 5 segments immediately
                for (let j = 0; j < 5; j++) {
                    const lastSegment = snake.segments[snake.segments.length - 1];
                    const secondLastSegment = snake.segments[snake.segments.length - 2] || lastSegment;
                    
                    const dx = lastSegment.x - secondLastSegment.x;
                    const dy = lastSegment.y - secondLastSegment.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    
                    snake.segments.push({
                        x: lastSegment.x + (dx / dist) * 2,
                        y: lastSegment.y + (dy / dist) * 2
                    });
                }
            }
            
            console.log(`${snake.name} collected ${powerUp.type}`);
            return true;
        }
    }
    return false;
}

// 불필요한 즉시 업데이트 제거 - 메인 게임 루프에서 처리

initializeFood();
// 서버 시작 시 게임 상태 초기화
gameState.gameStarted = false;
gameState.roomHost = null;
console.log('Server initialized, game loop running at 60 FPS with increased snake speed');

io.on('connection', (socket) => {
    console.log('New player connected:', socket.id);
    
    // 클라이언트가 기존 userId를 가지고 있는지 확인
    socket.on('checkUserId', (existingUserId) => {
        let userId = existingUserId;
        let isNewUser = false;
        
        // 유효한 기존 userId가 없거나 이미 다른 소켓에 연결된 경우 새로 생성
        if (!userId || !userId.startsWith('Player') || userIdToSocket.has(userId)) {
            userId = generateUserId();
            isNewUser = true;
        }
        
        // 기존 매핑 정리 (소켓이 이미 다른 userId와 연결된 경우)
        const existingUserId2 = socketToUserId.get(socket.id);
        if (existingUserId2) {
            userIdToSocket.delete(existingUserId2);
        }
        
        // 매핑 업데이트
        socketToUserId.set(socket.id, userId);
        userIdToSocket.set(userId, socket.id);
        
        socket.emit('userIdAssigned', { userId, isNewUser });
        console.log(`User ${userId} connected with socket ${socket.id}`);
    });
    
    // 방 목록 요청
    socket.on('getRoomList', () => {
        const publicRooms = getPublicRooms();
        socket.emit('roomList', publicRooms);
    });
    
    // 새 방 만들기
    socket.on('createRoom', (data) => {
        const { userId, isPublic, isSolo } = data;
        const roomId = generateRoomId();
        const room = createRoom(roomId, userId);
        room.isPublic = isPublic !== false;
        room.isSolo = isSolo === true;
        
        // 방에 참가
        socket.join(roomId);
        socketToRoom.set(socket.id, roomId);
        
        socket.emit('roomCreated', { roomId, isHost: true });
        console.log(`User ${userId} created ${room.isSolo ? 'solo' : 'multiplayer'} room ${roomId}`);
        
        // 방 목록 업데이트 브로드캐스트 (솔로 방이 아닌 경우)
        if (!room.isSolo) {
            broadcastRoomList();
        }
    });
    
    // 방 입장
    socket.on('joinRoom', (data) => {
        const { roomId, userId } = data;
        const room = rooms.get(roomId);
        
        if (!room) {
            socket.emit('roomError', { message: '존재하지 않는 방입니다.' });
            return;
        }
        
        if (room.gameState.players.size >= room.maxPlayers) {
            socket.emit('roomError', { message: '방이 가득 찼습니다.' });
            return;
        }
        
        // 방에 참가
        socket.join(roomId);
        socketToRoom.set(socket.id, roomId);
        
        socket.emit('roomJoined', { roomId, isHost: room.hostUserId === userId });
        console.log(`User ${userId} joined room ${roomId}`);
        
        // 방 목록 업데이트 브로드캐스트
        broadcastRoomList();
    });
    
    // 빠른 시작 (자동 매칭)
    socket.on('quickPlay', (data) => {
        const { userId } = data;
        
        // 참가 가능한 공개 방 찾기
        let foundRoom = null;
        for (const [roomId, room] of rooms) {
            if (room.isPublic && 
                room.gameState.players.size < room.maxPlayers && 
                !room.gameState.gameStarted) {
                foundRoom = room;
                break;
            }
        }
        
        if (foundRoom) {
            // 기존 방에 참가
            socket.join(foundRoom.id);
            socketToRoom.set(socket.id, foundRoom.id);
            socket.emit('roomJoined', { roomId: foundRoom.id, isHost: false });
            
            // 방 목록 업데이트 브로드캐스트
            broadcastRoomList();
        } else {
            // 새 방 생성
            const roomId = generateRoomId();
            const room = createRoom(roomId, userId);
            socket.join(roomId);
            socketToRoom.set(socket.id, roomId);
            socket.emit('roomCreated', { roomId, isHost: true });
            
            // 방 목록 업데이트 브로드캐스트
            broadcastRoomList();
        }
    });
    
    socket.on('joinGame', (data) => {
        // Support both old format (string) and new format (object)
        let userId, name, color;
        
        if (typeof data === 'string') {
            userId = data;
            name = null;
            color = null;
        } else {
            userId = data.userId;
            name = data.name;
            color = data.color;
        }
        
        if (!userId) return;
        
        // 플레이어가 속한 방 찾기
        const roomId = socketToRoom.get(socket.id);
        let targetGameState = gameState; // 기본값
        
        if (roomId && rooms.has(roomId)) {
            const room = rooms.get(roomId);
            targetGameState = room.gameState;
            console.log(`Player ${userId} joining game in room ${roomId}`);
        } else {
            console.log(`Player ${userId} joining legacy game (no room)`);
        }
        
        const snake = createSnake(socket.id);
        
        // Set name
        if (name && name.trim()) {
            snake.name = name.trim();
        } else {
            const userNumber = userId.replace('Player', '');
            snake.name = `Player ${userNumber}`;
        }
        
        // Set color
        if (color) {
            snake.color = color;
        }
        
        snake.userId = userId;
        
        // 올바른 gameState에 플레이어 추가
        targetGameState.players.set(socket.id, snake);
        
        // 호환성을 위해 전역 gameState에도 추가 (레거시 지원)
        if (targetGameState !== gameState) {
            gameState.players.set(socket.id, snake);
        }
    
        // 첫 번째 플레이어가 방장 (방별로 설정)
        if (!targetGameState.roomHost) {
            targetGameState.roomHost = socket.id;
            console.log('Room host set to:', socket.id, 'in room:', roomId || 'legacy');
            
            // Check if this is a solo room
            if (roomId) {
                const room = rooms.get(roomId);
                if (room && room.isSolo) {
                    // Auto-start solo games after a short delay
                    setTimeout(() => {
                        if (socket.id === targetGameState.roomHost && !targetGameState.gameStarted && targetGameState.players.size === 1) {
                            targetGameState.gameStarted = true;
                            targetGameState.gameStartTime = Date.now();
                            console.log('Solo game auto-started in room:', roomId);
                            
                            // 해당 방의 플레이어들에게만 알림
                            targetGameState.players.forEach((player, playerId) => {
                                const playerSocket = io.sockets.sockets.get(playerId);
                                if (playerSocket) {
                                    playerSocket.emit('gameStarted', {
                                        startTime: targetGameState.gameStartTime,
                                        playerCount: targetGameState.players.size
                                    });
                                }
                            });
                        }
                    }, 1000);
                }
            }
        }
        
        // 호환성을 위해 전역 gameState 방장도 설정
        if (!gameState.roomHost) {
            gameState.roomHost = socket.id;
        }
    
        socket.emit('init', {
            playerId: socket.id,
            userId: userId,
            gameWidth: GAME_WIDTH,
            gameHeight: GAME_HEIGHT,
            isHost: targetGameState.roomHost === socket.id,
            gameStarted: targetGameState.gameStarted
        });
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
    
    socket.on('updatePlayerInfo', (data) => {
        const player = gameState.players.get(socket.id);
        if (player && data) {
            if (data.name && data.name.trim()) {
                player.name = data.name.trim();
            }
            if (data.color) {
                player.color = data.color;
            }
            console.log(`Player ${socket.id} updated: name="${player.name}", color="${player.color}"`);
        }
    });
    
    socket.on('requestUserIdChange', (data) => {
        const { oldUserId, newUserId } = data;
        
        // Validate new user ID format
        if (!validateUserIdFormat(newUserId)) {
            socket.emit('userIdChangeError', { 
                message: '잘못된 사용자 ID 형식입니다. 3-15자의 영문, 숫자, 하이픈만 사용 가능합니다.' 
            });
            return;
        }
        
        // Check if the new userId is already taken by another socket
        let isIdTaken = false;
        for (const [socketId, userId] of socketToUserId.entries()) {
            if (userId === newUserId && socketId !== socket.id) {
                isIdTaken = true;
                break;
            }
        }
        
        if (isIdTaken) {
            socket.emit('userIdChangeError', { 
                message: '이미 사용 중인 사용자 ID입니다.' 
            });
            return;
        }
        
        // Update mappings
        if (oldUserId) {
            userIdToSocket.delete(oldUserId);
        }
        socketToUserId.set(socket.id, newUserId);
        userIdToSocket.set(newUserId, socket.id);
        
        // Update player data in all relevant game states
        const roomId = socketToRoom.get(socket.id);
        let targetGameState = gameState; // 기본값
        
        if (roomId && rooms.has(roomId)) {
            const room = rooms.get(roomId);
            targetGameState = room.gameState;
        }
        
        const player = targetGameState.players.get(socket.id);
        if (player) {
            player.userId = newUserId;
            player.name = newUserId; // Update name to match new ID if no custom name
        }
        
        console.log(`User ID changed: ${oldUserId} -> ${newUserId} for socket ${socket.id}`);
        
        socket.emit('userIdChangeSuccess', { 
            newUserId: newUserId 
        });
    });
    
    // 즉시 현재 게임 상태 전송
    socket.emit('gameUpdate', {
        players: Array.from(gameState.players.values()),
        food: gameState.food,
        powerUps: gameState.powerUps,
        gameStarted: gameState.gameStarted,
        roomHost: gameState.roomHost
    });
    
    socket.on('respawn', () => {
        const player = gameState.players.get(socket.id);
        if (player && !player.alive) {
            const newSnake = createSnake(socket.id);
            newSnake.name = player.name;
            newSnake.userId = player.userId; // Preserve userId
            newSnake.color = player.color; // Preserve color
            newSnake.invincible = true;
            newSnake.invincibleUntil = Date.now() + 3000; // 3초간 무적
            gameState.players.set(socket.id, newSnake);
        }
    });
    
    socket.on('disconnect', () => {
        const userId = socketToUserId.get(socket.id);
        const roomId = socketToRoom.get(socket.id);
        console.log('Player disconnected:', socket.id, 'userId:', userId, 'roomId:', roomId);
        
        // 매핑 정리
        if (userId) {
            socketToUserId.delete(socket.id);
            userIdToSocket.delete(userId);
        }
        
        if (roomId) {
            socketToRoom.delete(socket.id);
        }
        
        // 방별로 플레이어 제거 처리
        if (roomId && rooms.has(roomId)) {
            const room = rooms.get(roomId);
            room.gameState.players.delete(socket.id);
            
            // 방장이 나갔으면 새로운 방장 지정
            if (socket.id === room.gameState.roomHost && room.gameState.players.size > 0) {
                room.gameState.roomHost = room.gameState.players.keys().next().value;
                console.log('New room host for', roomId, ':', room.gameState.roomHost);
                
                // 해당 방의 플레이어들에게만 새 방장 알림
                room.gameState.players.forEach((player, playerId) => {
                    const playerSocket = io.sockets.sockets.get(playerId);
                    if (playerSocket) {
                        playerSocket.emit('newHost', { hostId: room.gameState.roomHost });
                    }
                });
            }
            
            // 방이 비었으면 방 삭제
            if (room.gameState.players.size === 0) {
                console.log('Deleting empty room:', roomId);
                rooms.delete(roomId);
                
                // 모든 클라이언트에게 방 목록 업데이트 알림
                broadcastRoomList();
            }
        }
        
        // 기존 gameState도 정리 (호환성을 위해)
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
    
    // 5분마다 빈 방 정리
    setInterval(cleanupEmptyRooms, 5 * 60 * 1000);
    console.log('Empty room cleanup scheduler started (5 minute intervals)');
});