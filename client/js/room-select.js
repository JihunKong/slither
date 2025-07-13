let socket;
let userId = null;

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

// userId 표시 업데이트
function updateUserIdDisplay() {
    const userIdElement = document.getElementById('userId');
    if (userIdElement && userId) {
        userIdElement.textContent = userId;
    }
}

// 서버 연결
function connectToServer() {
    console.log('Connecting to server...');
    
    socket = io({
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });
    
    socket.on('connect', () => {
        console.log('Connected to server');
        
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
        
        // 방 목록 요청
        socket.emit('getRoomList');
    });
    
    socket.on('roomList', (rooms) => {
        console.log('Received room list:', rooms);
        displayRoomList(rooms);
    });
    
    socket.on('roomCreated', (data) => {
        console.log('Room created:', data);
        // 방이 생성되면 게임 페이지로 이동
        localStorage.setItem('roomId', data.roomId);
        window.location.href = '/index.html';
    });
    
    socket.on('roomJoined', (data) => {
        console.log('Joined room:', data);
        // 방에 입장하면 게임 페이지로 이동
        localStorage.setItem('roomId', data.roomId);
        window.location.href = '/index.html';
    });
    
    socket.on('roomError', (error) => {
        alert(error.message);
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
}

// 방 목록 표시
function displayRoomList(rooms) {
    const roomListElement = document.getElementById('roomList');
    
    if (rooms.length === 0) {
        roomListElement.innerHTML = '<div class="loading">현재 열려있는 공개 방이 없습니다.</div>';
        return;
    }
    
    roomListElement.innerHTML = rooms.map(room => `
        <div class="room-item">
            <div class="room-info">
                <span class="room-id">${room.id}</span>
                <span class="room-players">👥 ${room.playerCount}/${room.maxPlayers}</span>
                <span class="room-status ${room.gameStarted ? 'in-game' : ''}">
                    ${room.gameStarted ? '게임 중' : '대기 중'}
                </span>
            </div>
            <button class="join-btn" onclick="joinRoom('${room.id}')" 
                    ${room.gameStarted ? 'disabled' : ''}>
                ${room.gameStarted ? '진행 중' : '입장'}
            </button>
        </div>
    `).join('');
}

// 방 입장
function joinRoom(roomId) {
    if (socket && userId) {
        socket.emit('joinRoom', { roomId, userId });
    }
}

// 빠른 시작
function quickPlay() {
    if (socket && userId) {
        socket.emit('quickPlay', { userId });
    }
}

// DOM 이벤트 리스너
document.addEventListener('DOMContentLoaded', () => {
    // 새 방 만들기
    document.getElementById('createRoomBtn').addEventListener('click', () => {
        if (socket && userId) {
            socket.emit('createRoom', { userId, isPublic: true });
        }
    });
    
    // 방 코드로 입장 버튼
    document.getElementById('joinRoomBtn').addEventListener('click', () => {
        document.getElementById('roomCodeInput').style.display = 'block';
        document.getElementById('roomCodeField').focus();
    });
    
    // 코드 입력 후 입장
    document.getElementById('joinWithCodeBtn').addEventListener('click', () => {
        const roomCode = document.getElementById('roomCodeField').value.trim();
        if (roomCode && socket && userId) {
            socket.emit('joinRoom', { roomId: roomCode, userId });
        }
    });
    
    // 코드 입력 취소
    document.getElementById('cancelCodeBtn').addEventListener('click', () => {
        document.getElementById('roomCodeInput').style.display = 'none';
        document.getElementById('roomCodeField').value = '';
    });
    
    // 빠른 시작
    document.getElementById('quickPlayBtn').addEventListener('click', quickPlay);
    
    // 솔로 플레이 버튼
    document.getElementById('soloPlayBtn').addEventListener('click', () => {
        if (!userId || !socket) return;
        
        // 비공개 방 생성 (솔로 플레이용)
        socket.emit('createRoom', { userId, isPublic: false, isSolo: true });
    });
    
    // 방 목록 새로고침
    document.getElementById('refreshRoomsBtn').addEventListener('click', () => {
        if (socket) {
            socket.emit('getRoomList');
        }
    });
    
    // Enter 키로 방 코드 입력
    document.getElementById('roomCodeField').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('joinWithCodeBtn').click();
        }
    });
    
    // 서버 연결
    connectToServer();
});

// 주기적으로 방 목록 새로고침 (5초마다)
setInterval(() => {
    if (socket && socket.connected) {
        socket.emit('getRoomList');
    }
}, 5000);