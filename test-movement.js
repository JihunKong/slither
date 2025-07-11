// 움직임 테스트
const SNAKE_SPEED = 3;

function testMovement() {
    const snake = {
        segments: [
            { x: 100, y: 100 },
            { x: 90, y: 100 },
            { x: 80, y: 100 }
        ],
        direction: 0, // 오른쪽
        speed: SNAKE_SPEED,
        alive: true
    };
    
    console.log('Initial snake:', JSON.stringify(snake.segments));
    
    // updateSnakePosition 함수를 테스트
    for (let i = 0; i < 5; i++) {
        // 이전 위치들을 저장
        const previousPositions = snake.segments.map(segment => ({
            x: segment.x,
            y: segment.y
        }));

        // 머리 이동
        const head = snake.segments[0];
        const moveX = Math.cos(snake.direction) * snake.speed;
        const moveY = Math.sin(snake.direction) * snake.speed;
        
        console.log(`Move ${i}: moveX=${moveX}, moveY=${moveY}`);
        
        head.x += moveX;
        head.y += moveY;

        // 나머지 세그먼트들이 앞 세그먼트의 이전 위치로 이동
        for (let j = 1; j < snake.segments.length; j++) {
            snake.segments[j].x = previousPositions[j - 1].x;
            snake.segments[j].y = previousPositions[j - 1].y;
        }
        
        console.log(`After move ${i}:`, JSON.stringify(snake.segments));
    }
}

testMovement();