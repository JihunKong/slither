const { chromium } = require('playwright');

async function testSnakeGame() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 콘솔 메시지 캡처 설정 (페이지 열기 전에 설정)
    page.on('console', msg => {
        const text = msg.text();
        console.log(`Browser [${msg.type()}]: ${text}`);
    });
    
    console.log('Opening game...');
    await page.goto('https://slither-slither.up.railway.app');
    
    // Wait for game to load
    await page.waitForTimeout(3000);
    
    // Check if canvas exists
    const canvas = await page.$('#gameCanvas');
    if (canvas) {
        console.log('✓ Game canvas found');
    }
    
    // Wait to see console logs
    console.log('Waiting for game updates...');
    await page.waitForTimeout(10000); // Wait 10 seconds to see update logs
    
    // Move mouse to test direction updates
    console.log('Moving mouse to trigger direction updates...');
    for (let i = 0; i < 3; i++) {
        await page.mouse.move(600, 300);
        await page.waitForTimeout(2000);
        await page.mouse.move(200, 300);
        await page.waitForTimeout(2000);
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'game-console-test.png' });
    console.log('✓ Screenshot taken');
    
    console.log('Test completed!');
    
    await page.waitForTimeout(3000);
    await browser.close();
}

// Run the test
testSnakeGame().catch(console.error);