const { chromium } = require('playwright');

async function testSnakeGame() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('Opening game...');
    await page.goto('https://slither-slither.up.railway.app');
    
    // Wait for game to load
    await page.waitForTimeout(2000);
    
    // Check if canvas exists
    const canvas = await page.$('#gameCanvas');
    if (canvas) {
        console.log('✓ Game canvas found');
    }
    
    // Take initial screenshot
    await page.screenshot({ path: 'game-initial.png' });
    console.log('✓ Initial screenshot taken');
    
    // Move mouse to different positions to test snake movement
    const positions = [
        { x: 600, y: 300 },  // Right
        { x: 400, y: 100 },  // Up
        { x: 200, y: 300 },  // Left
        { x: 400, y: 500 },  // Down
    ];
    
    for (let i = 0; i < positions.length; i++) {
        console.log(`Moving mouse to position ${i + 1}: (${positions[i].x}, ${positions[i].y})`);
        await page.mouse.move(positions[i].x, positions[i].y);
        await page.waitForTimeout(3000); // Wait 3 seconds between movements
        
        // Take screenshot after each movement
        await page.screenshot({ path: `game-move-${i + 1}.png` });
        console.log(`✓ Screenshot ${i + 1} taken`);
    }
    
    // Check console for errors
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('Console error:', msg.text());
        }
    });
    
    // Wait a bit more to observe
    await page.waitForTimeout(5000);
    
    // Take final screenshot
    await page.screenshot({ path: 'game-final.png' });
    console.log('✓ Final screenshot taken');
    
    console.log('Test completed! Check the screenshot files.');
    
    await browser.close();
}

// Run the test
testSnakeGame().catch(console.error);