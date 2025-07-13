// Tutorial System for Snake Game
class TutorialManager {
    constructor() {
        this.currentStep = 0;
        this.tutorialActive = false;
        this.tutorialCompleted = localStorage.getItem('snakeTutorialCompleted') === 'true';
        this.overlay = null;
        this.messageBox = null;
        
        this.steps = [
            {
                title: "Snake.io에 오신 것을 환영합니다! 🐍",
                message: "마우스나 터치로 뱀을 조종하여 먹이를 먹고 성장하세요!",
                highlight: null,
                action: null
            },
            {
                title: "조작 방법",
                message: "마우스를 움직여 방향을 조종하세요. 모바일에서는 화면을 터치하거나 조이스틱을 사용하세요.",
                highlight: "gameCanvas",
                action: null
            },
            {
                title: "먹이 시스템",
                message: "작은 먹이(5점), 중간 먹이(10점), 큰 먹이(20점), 특별 먹이(50점)가 있습니다!",
                highlight: null,
                showFoodDemo: true
            },
            {
                title: "부스트 기능",
                message: "스페이스바를 누르거나 화면을 두 번 탭하여 부스트! 단, 꼬리가 줄어듭니다.",
                highlight: null,
                action: null
            },
            {
                title: "점수 보너스",
                message: "10개 먹으면 1.2배, 20개는 1.4배, 30개는 1.6배 보너스!",
                highlight: "score",
                action: null
            },
            {
                title: "충돌 규칙",
                message: "작은 뱀과 충돌하면 리셋, 큰 뱀은 세그먼트를 잃습니다. 벽은 반사됩니다!",
                highlight: null,
                action: null
            },
            {
                title: "미니맵",
                message: "오른쪽 상단의 미니맵에서 1등(금색)과 나의 위치(흰색)를 확인하세요!",
                highlight: null,
                showMinimap: true
            },
            {
                title: "승리 조건",
                message: "10,000점을 먼저 달성하면 승리! 행운을 빕니다! 🎮",
                highlight: null,
                action: null
            },
            {
                title: "솔로 플레이",
                message: "혼자서 연습하고 싶다면 방 선택 화면에서 '솔로 플레이'를 선택하세요!",
                highlight: null,
                action: null
            }
        ];
    }
    
    start() {
        if (this.tutorialCompleted || this.tutorialActive) return;
        
        this.tutorialActive = true;
        this.currentStep = 0;
        this.createUI();
        this.showStep();
    }
    
    createUI() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'tutorial-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 9998;
            display: none;
        `;
        
        // Create message box
        this.messageBox = document.createElement('div');
        this.messageBox.className = 'tutorial-message';
        this.messageBox.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #2a2a2a;
            border: 2px solid #FFD700;
            border-radius: 10px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            z-index: 9999;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
            text-align: center;
            color: white;
        `;
        
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.messageBox);
    }
    
    showStep() {
        const step = this.steps[this.currentStep];
        
        // Show overlay
        this.overlay.style.display = 'block';
        
        // Clear highlights
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
        
        // Apply highlight if needed
        if (step.highlight) {
            const element = document.getElementById(step.highlight);
            if (element) {
                element.classList.add('tutorial-highlight');
                
                // Add highlight styles
                const style = document.createElement('style');
                style.textContent = `
                    .tutorial-highlight {
                        position: relative;
                        z-index: 10000 !important;
                        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7),
                                    0 0 20px rgba(255, 215, 0, 0.8) !important;
                        border-radius: 5px;
                    }
                `;
                style.id = 'tutorial-highlight-style';
                
                const oldStyle = document.getElementById('tutorial-highlight-style');
                if (oldStyle) oldStyle.remove();
                document.head.appendChild(style);
            }
        }
        
        // Build message content
        let content = `
            <h2 style="color: #FFD700; margin-bottom: 15px;">${step.title}</h2>
            <p style="font-size: 18px; margin-bottom: 20px;">${step.message}</p>
        `;
        
        // Add visual demos
        if (step.showFoodDemo) {
            content += `
                <div style="display: flex; justify-content: space-around; margin: 20px 0;">
                    <div style="text-align: center;">
                        <div style="width: 30px; height: 30px; background: #FF6B6B; border-radius: 50%; margin: 0 auto;"></div>
                        <small>5점</small>
                    </div>
                    <div style="text-align: center;">
                        <div style="width: 40px; height: 40px; background: #F7DC6F; border-radius: 50%; margin: 0 auto;"></div>
                        <small>10점</small>
                    </div>
                    <div style="text-align: center;">
                        <div style="width: 50px; height: 50px; background: #A29BFE; border-radius: 50%; margin: 0 auto;"></div>
                        <small>20점</small>
                    </div>
                    <div style="text-align: center;">
                        <div style="width: 60px; height: 60px; background: #FFD700; border-radius: 50%; margin: 0 auto; box-shadow: 0 0 10px #FFD700;"></div>
                        <small>50점!</small>
                    </div>
                </div>
            `;
        }
        
        if (step.showMinimap) {
            content += `
                <div style="margin: 20px auto; width: 150px; height: 150px; background: rgba(0,0,0,0.8); border: 2px solid #444; position: relative;">
                    <div style="position: absolute; top: 70px; left: 70px; width: 6px; height: 6px; background: #FFD700;"></div>
                    <div style="position: absolute; top: 40px; left: 100px; width: 6px; height: 6px; background: white;"></div>
                    <div style="position: absolute; top: 90px; left: 30px; width: 4px; height: 4px; background: #666;"></div>
                    <div style="position: absolute; bottom: 5px; width: 100%; text-align: center; font-size: 12px; color: #888;">미니맵</div>
                </div>
            `;
        }
        
        // Add navigation buttons
        content += `
            <div style="margin-top: 25px;">
                ${this.currentStep > 0 ? '<button id="tutorialPrev" style="margin-right: 10px; padding: 10px 20px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer;">이전</button>' : ''}
                <button id="tutorialNext" style="padding: 10px 30px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    ${this.currentStep < this.steps.length - 1 ? '다음' : '시작하기!'}
                </button>
                <button id="tutorialSkip" style="margin-left: 10px; padding: 10px 20px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer;">건너뛰기</button>
            </div>
        `;
        
        this.messageBox.innerHTML = content;
        
        // Add event listeners
        const nextBtn = document.getElementById('tutorialNext');
        const prevBtn = document.getElementById('tutorialPrev');
        const skipBtn = document.getElementById('tutorialSkip');
        
        nextBtn.addEventListener('click', () => {
            window.soundManager.playClick();
            this.nextStep();
        });
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                window.soundManager.playClick();
                this.prevStep();
            });
        }
        
        skipBtn.addEventListener('click', () => {
            window.soundManager.playClick();
            this.complete();
        });
    }
    
    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.showStep();
        } else {
            this.complete();
        }
    }
    
    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showStep();
        }
    }
    
    complete() {
        this.tutorialActive = false;
        this.tutorialCompleted = true;
        localStorage.setItem('snakeTutorialCompleted', 'true');
        
        // Clean up
        if (this.overlay) this.overlay.remove();
        if (this.messageBox) this.messageBox.remove();
        
        // Remove highlights
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
        
        const highlightStyle = document.getElementById('tutorial-highlight-style');
        if (highlightStyle) highlightStyle.remove();
        
        // Show completion message
        const completeMsg = document.createElement('div');
        completeMsg.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #4CAF50;
            color: white;
            padding: 15px 30px;
            border-radius: 5px;
            font-size: 16px;
            z-index: 1000;
            animation: slideUp 0.3s ease-out;
        `;
        completeMsg.textContent = '튜토리얼 완료! 게임을 즐기세요! 🎮';
        document.body.appendChild(completeMsg);
        
        setTimeout(() => completeMsg.remove(), 3000);
    }
    
    reset() {
        this.tutorialCompleted = false;
        localStorage.removeItem('snakeTutorialCompleted');
    }
}

// Create global tutorial manager
window.tutorialManager = new TutorialManager();

// Add tutorial reset button for testing
if (window.location.search.includes('debug')) {
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset Tutorial';
    resetBtn.style.cssText = 'position: fixed; bottom: 10px; right: 10px; z-index: 9999;';
    resetBtn.addEventListener('click', () => {
        window.tutorialManager.reset();
        window.tutorialManager.start();
    });
    document.body.appendChild(resetBtn);
}