const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const MAX_PLAYERS = 20;
const SNAKE_SPEED = 2;
const FOOD_COUNT = 50;

app.use(express.static(path.join(__dirname, '../client')));

const gameState = {
    players: new Map(),
    food: [],
    lastUpdateTime: Date.now()
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
        direction: 0,
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
    head.x += Math.cos(snake.direction) * snake.speed;
    head.y += Math.sin(snake.direction) * snake.speed;

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

function gameLoop() {
    const currentTime = Date.now();
    const deltaTime = currentTime - gameState.lastUpdateTime;
    
    if (deltaTime < 16) return;
    
    gameState.players.forEach(snake => {
        updateSnakePosition(snake);
        checkFoodCollision(snake);
    });
    
    checkSnakeCollisions();
    
    const gameData = {
        players: Array.from(gameState.players.values()),
        food: gameState.food
    };
    
    io.emit('gameUpdate', gameData);
    
    gameState.lastUpdateTime = currentTime;
}

initializeFood();
setInterval(gameLoop, 16);

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
        if (player && player.alive) {
            player.direction = direction;
        }
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

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});