const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'client')));

const PORT = process.env.PORT || 3000;
let testX = 400;
let testY = 300;

// 매 프레임마다 위치 업데이트
setInterval(() => {
    testX += 1;
    if (testX > 800) testX = 0;
    
    io.emit('position', { x: testX, y: testY });
}, 16);

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.emit('welcome', { id: socket.id });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Minimal test server running on port ${PORT}`);
});