// 로컬에서 서버를 실행하고 테스트
const { spawn } = require('child_process');
const { chromium } = require('playwright');

async function testLocally() {
    // 서버 시작
    console.log('Starting local server...');
    const server = spawn('node', ['server/server.js'], {
        cwd: __dirname,
        env: { ...process.env, PORT: 3001 }
    });
    
    server.stdout.on('data', (data) => {
        console.log(`Server: ${data}`);
    });
    
    server.stderr.on('data', (data) => {
        console.error(`Server Error: ${data}`);
    });
    
    // 서버가 시작될 때까지 대기
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();
        
        // 콘솔 메시지 캡처
        page.on('console', msg => {
            console.log(`Browser console: ${msg.type()} - ${msg.text()}`);
        });
        
        console.log('Opening local game...');
        await page.goto('http://localhost:3001');
        
        await page.waitForTimeout(2000);
        
        // 마우스 움직여서 뱀 이동 테스트
        console.log('Testing snake movement...');
        for (let i = 0; i < 5; i++) {
            const x = 400 + Math.cos(i) * 200;
            const y = 300 + Math.sin(i) * 200;
            await page.mouse.move(x, y);
            await page.waitForTimeout(1000);
        }
        
        await page.screenshot({ path: 'local-test.png' });
        console.log('Screenshot saved as local-test.png');
        
        await page.waitForTimeout(5000);
        await browser.close();
    } finally {
        // 서버 종료
        server.kill();
    }
}

testLocally().catch(console.error);