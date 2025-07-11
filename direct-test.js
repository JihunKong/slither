// 직접 서버 코드를 테스트
const gameState = {
    players: new Map()
};

// 뱀 생성
const snake = {
    id: 'test',
    segments: [
        { x: 100, y: 100 },
        { x: 90, y: 100 },
        { x: 80, y: 100 }
    ],
    direction: 0,
    speed: 3,
    alive: true
};

gameState.players.set('test', snake);

console.log('Before:', snake.segments[0]);

// updateSnakePosition 직접 호출
let frameCount = 60;
updateSnakePosition(snake);

console.log('After:', snake.segments[0]);

function updateSnakePosition(snake) {
    if (!snake.alive) return;
    
    // 디버그: 처음 몇 프레임 동안 확인
    if (frameCount <= 300) {
        if (frameCount % 20 === 0) {
            console.log(`[DEBUG] updateSnakePosition called for snake ${snake.id} at frame ${frameCount}`);
        }
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
    if (frameCount <= 300 && frameCount % 20 === 0) {
        console.log(`[DEBUG] Head moved from (${oldX.toFixed(1)},${oldY.toFixed(1)}) to (${head.x.toFixed(1)},${head.y.toFixed(1)})`);
        console.log(`[DEBUG] Direction: ${snake.direction}, moveX: ${moveX}, moveY: ${moveY}`);
    }

    // 나머지 세그먼트들이 앞 세그먼트의 이전 위치로 이동
    for (let i = 1; i < snake.segments.length; i++) {
        snake.segments[i].x = previousPositions[i - 1].x;
        snake.segments[i].y = previousPositions[i - 1].y;
    }
    
    console.log('All segments after update:', snake.segments);
}