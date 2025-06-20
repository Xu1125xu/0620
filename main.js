/**
 * AI 互動式反應訓練牆 - Google AI 版本（修正版）
 * 基於測試成功的代碼重建
 */

class ReactionTrainingSystem {
    constructor() {
        console.log('🚀 初始化反應訓練系統...');
        
        this.isTraining = false;
        this.currentRound = 0;
        this.totalRounds = 10;
        this.difficulty = 3;
        this.reactionTimes = [];
        this.waitingForReaction = false;
        this.connectionStatus = false;
        this.serialPort = null;
        this.reader = null;
        this.writer = null;
        this.roundStartTime = 0;
        this.ledTimer = null;
        this.apiKey = null;
        
        this.elements = {};
        this.init();
    }
    
    init() {
        this.initializeElements();
        this.setupEventListeners();
        this.initializeLEDState();
        this.loadSettings();
        console.log('✅ 系統初始化完成');
    }
    
    initializeElements() {
        const elementIds = [
            'startBtn', 'stopBtn', 'connectBtn', 'settingsBtn',
            'connectionStatus', 'ledIndicator', 'instruction',
            'currentRound', 'totalRounds', 'averageTime', 'bestTime', 'reactionTime',
            'settingsPanel', 'roundsInput', 'apiKeyInput', 'quickApiKey', 'quickSaveApi',
            'saveSettingsBtn', 'speakBtn', 'aiStatus', 'systemStatus',
            'totalReactions', 'successRate', 'standardDeviation', 'improvement',
            'resultsSection', 'finalTotalReactions', 'finalSuccessRate', 
            'finalStandardDeviation', 'finalImprovement', 'aiSuggestions'
        ];
        
        elementIds.forEach(id => {
            this.elements[id] = document.getElementById(id);
            if (!this.elements[id]) {
                console.warn(`⚠️ 元素 ${id} 未找到`);
            }
        });
        
        console.log('✅ DOM 元素載入完成');
    }
    
    initializeLEDState() {
        if (this.elements.ledIndicator) {
            this.elements.ledIndicator.classList.remove('led-on');
            this.elements.ledIndicator.classList.add('led-off');
            this.elements.ledIndicator.textContent = '⚫';
            console.log('💡 LED 初始化為關閉狀態');
        }
        this.ledOn = false;
        this.waitingForReaction = false;
    }
    
    setupEventListeners() {
        // 訓練控制
        if (this.elements.startBtn) {
            this.elements.startBtn.addEventListener('click', () => this.startTraining());
        }
        if (this.elements.stopBtn) {
            this.elements.stopBtn.addEventListener('click', () => this.stopTraining());
        }
        
        // 連接控制
        if (this.elements.connectBtn) {
            this.elements.connectBtn.addEventListener('click', () => this.toggleConnection());
        }
        
        // 難度選擇
        document.addEventListener('click', (e) => {
            const difficultyBtn = e.target.closest('.difficulty-btn');
            if (difficultyBtn) {
                e.preventDefault();
                this.selectDifficulty(difficultyBtn);
            }
        });
        
        // 設定
        if (this.elements.settingsBtn) {
            this.elements.settingsBtn.addEventListener('click', () => this.toggleSettings());
        }
        if (this.elements.saveSettingsBtn) {
            this.elements.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }
        if (this.elements.quickSaveApi) {
            this.elements.quickSaveApi.addEventListener('click', () => this.saveQuickApiKey());
        }
        if (this.elements.speakBtn) {
            this.elements.speakBtn.addEventListener('click', () => this.speakSuggestions());
        }
        
        // 鍵盤事件
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.handleReaction();
            }
        });
        
        // 點擊外部關閉設定
        document.addEventListener('click', (e) => {
            if (this.elements.settingsPanel && 
                !this.elements.settingsPanel.contains(e.target) && 
                !this.elements.settingsBtn.contains(e.target)) {
                this.elements.settingsPanel.classList.remove('show');
            }
        });
    }
    
    selectDifficulty(button) {
        if (!button || !button.classList.contains('difficulty-btn')) {
            console.error('❌ 無效的難度按鈕');
            return;
        }
        
        // 移除所有活動狀態
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 設定新的活動狀態
        button.classList.add('active');
        this.difficulty = parseInt(button.dataset.level);
        
        console.log(`🎯 難度設定為: ${this.difficulty}`);
        
        // 按鈕點擊效果
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    }
    
    // Arduino 連接方法
    async toggleConnection() {
        if (!this.connectionStatus) {
            try {
                await this.connectArduino();
            } catch (error) {
                console.error('❌ Arduino 連接失敗:', error);
                alert('Arduino 連接失敗: ' + error.message);
            }
        } else {
            await this.disconnectArduino();
        }
    }
    
    async connectArduino() {
        console.log('🔗 嘗試連接 Arduino...');
        
        if (!('serial' in navigator)) {
            throw new Error('您的瀏覽器不支援 Web Serial API，請使用 Chrome 或 Edge 瀏覽器');
        }
        
        try {
            this.serialPort = await navigator.serial.requestPort();
            await this.serialPort.open({ baudRate: 115200 });
            
            this.reader = this.serialPort.readable.getReader();
            this.writer = this.serialPort.writable.getWriter();
            
            this.startSerialReading();
            
            this.connectionStatus = true;
            if (this.elements.connectionStatus) {
                this.elements.connectionStatus.textContent = '已連接';
                this.elements.connectionStatus.className = 'status-indicator connected';
            }
            if (this.elements.connectBtn) {
                this.elements.connectBtn.textContent = '斷開連接';
            }
            
            console.log('✅ Arduino 連接成功');
            await this.sendToArduino('TEST');
            
        } catch (error) {
            console.error('❌ Arduino 連接失敗:', error);
            throw error;
        }
    }
    
    async disconnectArduino() {
        console.log('🔌 斷開 Arduino 連接...');
        
        try {
            if (this.isTraining) {
                await this.sendToArduino('STOP_TRAINING');
            }
            
            if (this.reader) {
                await this.reader.cancel();
                await this.reader.releaseLock();
                this.reader = null;
            }
            
            if (this.writer) {
                await this.writer.releaseLock();
                this.writer = null;
            }
            
            if (this.serialPort) {
                await this.serialPort.close();
                this.serialPort = null;
            }
            
            this.connectionStatus = false;
            if (this.elements.connectionStatus) {
                this.elements.connectionStatus.textContent = '未連接';
                this.elements.connectionStatus.className = 'status-indicator disconnected';
            }
            if (this.elements.connectBtn) {
                this.elements.connectBtn.textContent = '連接 Arduino';
            }
            
            console.log('✅ Arduino 已斷開連接');
            
        } catch (error) {
            console.error('❌ 斷開連接時發生錯誤:', error);
        }
    }
    
    async sendToArduino(command) {
        if (!this.writer) {
            console.log('⚠️ Arduino 未連接，無法發送命令:', command);
            return false;
        }
        
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(command + '\n');
            await this.writer.write(data);
            console.log('📤 發送給 Arduino:', command);
            return true;
        } catch (error) {
            console.error('❌ 發送命令失敗:', error);
            return false;
        }
    }
    
    async startSerialReading() {
        console.log('👂 開始監聽 Arduino 串列數據...');
        
        try {
            let buffer = '';
            
            while (this.reader) {
                const { value, done } = await this.reader.read();
                
                if (done) {
                    console.log('📪 串列讀取結束');
                    break;
                }
                
                const decoder = new TextDecoder();
                const chunk = decoder.decode(value);
                buffer += chunk;
                
                const lines = buffer.split('\n');
                buffer = lines.pop();
                
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine) {
                        this.handleArduinoMessage(trimmedLine);
                    }
                }
            }
        } catch (error) {
            if (error.name !== 'NetworkError') {
                console.error('❌ 串列讀取錯誤:', error);
            }
        }
    }
    
    handleArduinoMessage(message) {
        console.log('📥 收到 Arduino 消息:', message);
        
        if (message.startsWith('BUTTON_PRESSED:')) {
            const reactionTimeStr = message.split(':')[1];
            
            if (reactionTimeStr === 'NO_LED') {
                console.log('🔘 Arduino 按鈕按下，但 LED 未亮起');
                return;
            }
            
            const reactionTime = parseInt(reactionTimeStr);
            
            if (!isNaN(reactionTime)) {
                console.log('🔘 Arduino 按鈕按下，反應時間:', reactionTime, 'ms');
                this.handleReaction(reactionTime);
            }
        } else if (message.startsWith('LED_STATUS_ON')) {
            console.log('💡 Arduino LED 已開啟');
        } else if (message.startsWith('LED_STATUS_OFF')) {
            console.log('💡 Arduino LED 已關閉');
        } else if (message.startsWith('TRAINING_STARTED')) {
            console.log('🏁 Arduino 訓練已開始');
        } else if (message.startsWith('TRAINING_STOPPED')) {
            console.log('🛑 Arduino 訓練已停止');
        } else if (message.startsWith('TEST_COMPLETE')) {
            console.log('✅ Arduino 測試完成');
        } else {
            console.log('📋 Arduino 一般消息:', message);
        }
    }
    
    // 訓練方法
    async startTraining() {
        if (this.isTraining) return;
        
        console.log('🏁 開始訓練...');
        this.isTraining = true;
        this.currentRound = 0;
        this.reactionTimes = [];
        
        if (this.elements.startBtn) this.elements.startBtn.disabled = true;
        if (this.elements.stopBtn) this.elements.stopBtn.disabled = false;
        if (this.elements.resultsSection) this.elements.resultsSection.style.display = 'none';
        
        await this.sendToArduino('START_TRAINING');
        await this.sendToArduino(`SET_DIFFICULTY:${this.difficulty}`);
        
        this.updateInstruction('準備開始... 等待紅燈亮起！');
        this.updateUI();
        this.updateStatsDisplay(); // 重置統計顯示
        this.nextRound();
    }
    
    async stopTraining() {
        if (!this.isTraining) return;
        
        console.log('🛑 停止訓練');
        this.isTraining = false;
        this.waitingForReaction = false;
        
        if (this.ledTimer) {
            clearTimeout(this.ledTimer);
            this.ledTimer = null;
        }
        
        await this.sendToArduino('STOP_TRAINING');
        
        if (this.elements.startBtn) this.elements.startBtn.disabled = false;
        if (this.elements.stopBtn) this.elements.stopBtn.disabled = true;
        
        await this.turnOffLED();
        this.updateInstruction('訓練已停止');
    }
    
    async nextRound() {
        if (!this.isTraining) return;
        
        this.currentRound++;
        console.log(`🔄 第 ${this.currentRound} 回合開始`);
        
        if (this.currentRound > this.totalRounds) {
            this.finishTraining();
            return;
        }
        
        this.updateUI();
        this.updateInstruction(`第 ${this.currentRound} 回合 - 準備...`);
        
        const waitTime = this.getRandomWaitTime();
        console.log(`⏱️ 等待 ${waitTime}ms 後亮燈`);
        
        this.ledTimer = setTimeout(async () => {
            if (this.isTraining) {
                await this.turnOnLED();
            }
        }, waitTime);
    }
    
    getRandomWaitTime() {
        const ranges = {
            1: [3000, 6000],
            2: [2500, 5000],
            3: [2000, 4000],
            4: [1500, 3000],
            5: [1000, 2500]
        };
        
        const [min, max] = ranges[this.difficulty] || ranges[3];
        return Math.random() * (max - min) + min;
    }
    
    async turnOnLED() {
        if (!this.isTraining || !this.elements.ledIndicator) return;
        
        console.log('🔴 LED 亮起');
        this.ledOn = true;
        this.waitingForReaction = true;
        this.roundStartTime = Date.now();
        
        this.elements.ledIndicator.classList.remove('led-off');
        this.elements.ledIndicator.classList.add('led-on');
        this.elements.ledIndicator.textContent = '🔴';
        
        await this.sendToArduino('LED_ON');
        
        this.updateInstruction('🔴 快按按鈕或空白鍵！');
        
        const timeouts = { 1: 3000, 2: 2500, 3: 2000, 4: 1500, 5: 1000 };
        const timeout = timeouts[this.difficulty] || 2000;
        
        this.ledTimer = setTimeout(async () => {
            if (this.waitingForReaction) {
                await this.handleTimeout();
            }
        }, timeout);
    }
    
    async turnOffLED() {
        if (!this.elements.ledIndicator) return;
        
        this.ledOn = false;
        this.elements.ledIndicator.classList.remove('led-on');
        this.elements.ledIndicator.classList.add('led-off');
        this.elements.ledIndicator.textContent = '⚫';
        
        await this.sendToArduino('LED_OFF');
    }
    
    async handleReaction(externalTime) {
        console.log('⚡ handleReaction 被調用，參數:', {
            externalTime,
            isTraining: this.isTraining,
            waitingForReaction: this.waitingForReaction
        });
        
        if (!this.isTraining || !this.waitingForReaction) {
            console.log('⚠️ 反應被忽略');
            return;
        }
        
        const reactionTime = externalTime !== undefined ? externalTime : Date.now() - this.roundStartTime;
        console.log(`⚡ 反應時間: ${reactionTime}ms`);
        
        this.waitingForReaction = false;
        await this.turnOffLED();
        
        if (this.ledTimer) {
            clearTimeout(this.ledTimer);
            this.ledTimer = null;
        }
        
        this.reactionTimes.push(reactionTime);
        
        if (this.elements.reactionTime) {
            this.elements.reactionTime.textContent = `${reactionTime} ms`;
            this.elements.reactionTime.classList.add('success-animation');
            setTimeout(() => {
                this.elements.reactionTime.classList.remove('success-animation');
            }, 600);
        }
        
        this.updateInstruction(`✅ 反應時間: ${reactionTime}ms - 很好！`);
        this.updateUI();
        this.updateStatsDisplay();
        
        setTimeout(() => {
            if (this.isTraining) {
                this.nextRound();
            }
        }, 1500);
    }
    
    async handleTimeout() {
        if (!this.isTraining) return;
        
        console.log('⏰ 反應超時');
        this.waitingForReaction = false;
        await this.turnOffLED();
        
        // 記錄超時（使用較大的時間值表示超時）
        this.reactionTimes.push(5000); // 5秒超時
        this.updateInstruction('⏰ 反應超時 - 下次更快一點！');
        this.updateUI();
        this.updateStatsDisplay();
        
        setTimeout(() => {
            if (this.isTraining) {
                this.nextRound();
            }
        }, 1500);
    }
    
    finishTraining() {
        console.log('🏁 訓練完成');
        this.isTraining = false;
        
        const finalStats = this.calculateFinalStats();
        this.showResults(finalStats);
        this.updateInstruction('訓練完成！查看您的結果。');
        
        // 生成 AI 分析
        this.generateAIAnalysis(finalStats);
    }
    
    calculateFinalStats() {
        const validTimes = this.reactionTimes.filter(time => time > 0);
        const totalReactions = this.currentRound;
        const successfulReactions = validTimes.length;
        const successRate = totalReactions > 0 ? (successfulReactions / totalReactions * 100) : 0;
        
        let average = 0;
        let standardDeviation = 0;
        
        if (validTimes.length > 0) {
            average = validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length;
            
            if (validTimes.length > 1) {
                const variance = validTimes.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / validTimes.length;
                standardDeviation = Math.sqrt(variance);
            }
        }
        
        return {
            totalReactions,
            successfulReactions,
            successRate,
            averageTime: average,
            bestTime: validTimes.length > 0 ? Math.min(...validTimes) : null,
            standardDeviation,
            difficulty: this.difficulty,
            allTimes: [...validTimes]
        };
    }
    
    showResults(stats) {
        if (this.elements.finalTotalReactions) {
            this.elements.finalTotalReactions.textContent = stats.successfulReactions;
        }
        if (this.elements.finalSuccessRate) {
            this.elements.finalSuccessRate.textContent = `${stats.successRate.toFixed(1)}%`;
        }
        if (this.elements.finalStandardDeviation) {
            this.elements.finalStandardDeviation.textContent = stats.standardDeviation > 0 ? `${stats.standardDeviation.toFixed(0)} ms` : '-- ms';
        }
        
        let performance = '需要改進';
        if (stats.successRate >= 90) performance = '優秀';
        else if (stats.successRate >= 80) performance = '良好';
        else if (stats.successRate >= 70) performance = '普通';
        
        if (this.elements.finalImprovement) {
            this.elements.finalImprovement.textContent = performance;
        }
        
        if (this.elements.resultsSection) {
            this.elements.resultsSection.style.display = 'block';
            this.elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    updateUI() {
        if (this.elements.currentRound) {
            this.elements.currentRound.textContent = this.currentRound;
        }
        
        if (this.reactionTimes.length > 0 && this.elements.averageTime) {
            const average = this.reactionTimes.reduce((sum, time) => sum + time, 0) / this.reactionTimes.length;
            this.elements.averageTime.textContent = `${Math.round(average)} ms`;
        }
        
        if (this.reactionTimes.length > 0 && this.elements.bestTime) {
            const best = Math.min(...this.reactionTimes);
            this.elements.bestTime.textContent = `${best} ms`;
        }
        
        if (this.elements.totalReactions) {
            this.elements.totalReactions.textContent = this.reactionTimes.length;
        }
        
        if (this.elements.systemStatus) {
            this.elements.systemStatus.textContent = this.isTraining ? '🏃 訓練中' : '⏸️ 等待開始';
            this.elements.systemStatus.className = this.isTraining ? 'status-badge success' : 'status-badge info';
        }
    }
    
    updateInstruction(text) {
        if (this.elements.instruction) {
            this.elements.instruction.textContent = text;
        }
    }
    
    toggleSettings() {
        if (this.elements.settingsPanel) {
            this.elements.settingsPanel.classList.toggle('show');
        }
    }
    
    saveSettings() {
        if (this.elements.roundsInput) {
            const rounds = parseInt(this.elements.roundsInput.value);
            if (rounds >= 5 && rounds <= 50) {
                this.totalRounds = rounds;
                if (this.elements.totalRounds) {
                    this.elements.totalRounds.textContent = rounds;
                }
                localStorage.setItem('trainingRounds', rounds);
            }
        }
        
        if (this.elements.apiKeyInput) {
            const apiKey = this.elements.apiKeyInput.value.trim();
            if (apiKey) {
                this.apiKey = apiKey;
                localStorage.setItem('googleApiKey', apiKey);
            }
        }
        
        if (this.elements.settingsPanel) {
            this.elements.settingsPanel.classList.remove('show');
        }
        alert('設定已儲存！');
    }
    
    saveQuickApiKey() {
        if (this.elements.quickApiKey) {
            const apiKey = this.elements.quickApiKey.value.trim();
            
            if (apiKey) {
                this.apiKey = apiKey;
                localStorage.setItem('googleApiKey', apiKey);
                if (this.elements.apiKeyInput) {
                    this.elements.apiKeyInput.value = apiKey;
                }
                this.elements.quickApiKey.value = '';
                alert('API Key 已儲存！');
            } else {
                alert('請輸入有效的 API Key');
            }
        }
    }
    
    loadSettings() {
        const savedRounds = localStorage.getItem('trainingRounds');
        const savedApiKey = localStorage.getItem('googleApiKey');
        
        if (savedRounds) {
            this.totalRounds = parseInt(savedRounds);
            if (this.elements.roundsInput) {
                this.elements.roundsInput.value = this.totalRounds;
            }
            if (this.elements.totalRounds) {
                this.elements.totalRounds.textContent = this.totalRounds;
            }
        }
        
        if (savedApiKey) {
            this.apiKey = savedApiKey;
            if (this.elements.apiKeyInput) {
                this.elements.apiKeyInput.value = savedApiKey;
            }
        }
    }
    
    speakSuggestions() {
        this.speak('訓練系統語音播報功能正常。請繼續您的反應訓練。');
    }
    
    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-TW';
            utterance.rate = 0.9;
            speechSynthesis.speak(utterance);
        } else {
            alert('您的瀏覽器不支援語音播報功能');
        }
    }
    
    // AI 分析相關方法
    async generateAIAnalysis(stats) {
        console.log('🤖 開始生成 AI 分析...');
        
        if (!this.apiKey) {
            console.log('⚠️ 未設定 API Key，顯示基本分析');
            this.showBasicAnalysis(stats);
            return;
        }
        
        try {
            this.showLoadingAnalysis();
            
            // 等待 Google AI SDK 載入
            await this.waitForGoogleAI();
            
            const analysis = await this.callGoogleAI(stats);
            this.showAIAnalysis(analysis);
            
        } catch (error) {
            console.error('❌ AI 分析失敗:', error);
            this.showErrorAnalysis(error, stats);
        }
    }
    
    async waitForGoogleAI(timeout = 5000) {
        const startTime = Date.now();
        
        while (!window.GoogleGenerativeAI && (Date.now() - startTime) < timeout) {
            console.log('⏳ 等待 Google AI SDK 載入...');
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!window.GoogleGenerativeAI) {
            throw new Error('Google AI SDK 載入超時');
        }
        
        console.log('✅ Google AI SDK 已載入');
    }
    
    async callGoogleAI(stats) {
        console.log('📡 調用 Google AI API...');
        
        if (!window.GoogleGenerativeAI) {
            throw new Error('Google AI SDK 未載入');
        }
        
        const genAI = new window.GoogleGenerativeAI.GoogleGenerativeAI(this.apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `
作為專業的反應訓練分析師，請分析以下訓練數據並提供專業建議：

訓練數據：
- 總回合數：${stats.totalReactions}
- 成功反應數：${stats.successfulReactions}
- 成功率：${stats.successRate.toFixed(1)}%
- 平均反應時間：${stats.averageTime.toFixed(0)}ms
- 最佳反應時間：${stats.bestTime}ms
- 標準差：${stats.standardDeviation.toFixed(0)}ms
- 訓練難度：等級 ${stats.difficulty}
- 所有反應時間：${stats.allTimes.join(', ')}ms

請提供：
1. 整體表現評估
2. 具體改善建議
3. 下次訓練目標
4. 注意事項

請用繁體中文回答，內容專業且實用。
        `;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }
    
    showLoadingAnalysis() {
        if (this.elements.aiSuggestions) {
            this.elements.aiSuggestions.innerHTML = `
                <div class="ai-loading">
                    <div class="loading-animation">🤖</div>
                    <p>Google AI 正在分析您的訓練數據...</p>
                </div>
            `;
        }
    }
    
    showAIAnalysis(analysis) {
        if (this.elements.aiSuggestions) {
            this.elements.aiSuggestions.innerHTML = `
                <div class="ai-header">
                    <h4>🧠 Google AI 智能分析</h4>
                    <span class="api-badge">Gemini Pro</span>
                </div>
                <div class="analysis-content">
                    ${analysis.replace(/\n/g, '<br>')}
                </div>
            `;
        }
        
        if (this.elements.aiStatus) {
            this.elements.aiStatus.textContent = '✅ AI 分析完成';
            this.elements.aiStatus.className = 'status-badge success';
        }
        
        console.log('✅ AI 分析完成');
    }
    
    showBasicAnalysis(stats) {
        let performance = '需要改進';
        let advice = '多練習以提高反應速度和穩定性。';
        
        if (stats.successRate >= 90) {
            performance = '優秀';
            advice = '表現卓越！繼續保持，可嘗試更高難度。';
        } else if (stats.successRate >= 80) {
            performance = '良好';
            advice = '表現不錯，專注於提高穩定性。';
        } else if (stats.successRate >= 70) {
            performance = '普通';
            advice = '需要更多練習來提高準確度。';
        }
        
        if (this.elements.aiSuggestions) {
            this.elements.aiSuggestions.innerHTML = `
                <div class="fallback-notice">
                    <p>💡 未設定 API Key，顯示基本分析</p>
                </div>
                <div class="basic-analysis">
                    <h4>📊 基本分析報告</h4>
                    <p><strong>整體表現：</strong>${performance}</p>
                    <p><strong>成功率：</strong>${stats.successRate.toFixed(1)}%</p>
                    <p><strong>平均反應時間：</strong>${stats.averageTime.toFixed(0)}ms</p>
                    <p><strong>建議：</strong>${advice}</p>
                </div>
            `;
        }
    }
    
    showErrorAnalysis(error, stats) {
        let errorMessage = '未知錯誤';
        let errorType = 'api-error-notice';
        
        if (error.message.includes('API')) {
            errorMessage = 'API Key 無效或已達使用限制';
            errorType = 'api-error-notice';
        } else if (error.message.includes('網路') || error.message.includes('network')) {
            errorMessage = '網路連接問題，請檢查網路狀態';
            errorType = 'network-error-notice';
        }
        
        if (this.elements.aiSuggestions) {
            this.elements.aiSuggestions.innerHTML = `
                <div class="${errorType}">
                    <p>❌ AI 分析失敗：${errorMessage}</p>
                </div>
                <div class="basic-analysis">
                    <h4>📊 基本分析報告</h4>
                    <p><strong>成功率：</strong>${stats.successRate.toFixed(1)}%</p>
                    <p><strong>平均反應時間：</strong>${stats.averageTime.toFixed(0)}ms</p>
                    <p><strong>建議：</strong>繼續練習以提高反應速度和穩定性。</p>
                </div>
                <div class="retry-section">
                    <p>🔄 您可以檢查 API Key 設定後重新分析</p>
                    <button class="retry-btn" onclick="window.trainingSystem.generateAIAnalysis(${JSON.stringify(stats)})">重新分析</button>
                </div>
            `;
        }
        
        if (this.elements.aiStatus) {
            this.elements.aiStatus.textContent = '❌ AI 分析失敗';
            this.elements.aiStatus.className = 'status-badge warning';
        }
    }
    
    updateStatsDisplay() {
        // 即時更新統計區域的數據
        const totalReactions = this.reactionTimes.length;
        const successfulReactions = this.reactionTimes.filter(time => time <= 1000).length;
        const successRate = totalReactions > 0 ? (successfulReactions / totalReactions * 100) : 0;
        
        // 計算標準差
        let standardDeviation = 0;
        if (this.reactionTimes.length > 1) {
            const average = this.reactionTimes.reduce((sum, time) => sum + time, 0) / this.reactionTimes.length;
            const variance = this.reactionTimes.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / this.reactionTimes.length;
            standardDeviation = Math.sqrt(variance);
        }
        
        // 生成改善建議
        let improvement = '需要數據';
        if (totalReactions > 0) {
            if (successRate >= 90) improvement = '優秀';
            else if (successRate >= 80) improvement = '良好';
            else if (successRate >= 70) improvement = '普通';
            else improvement = '需要改進';
        }
        
        // 更新統計區域的元素
        if (this.elements.totalReactions) {
            this.elements.totalReactions.textContent = totalReactions;
        }
        
        if (this.elements.successRate) {
            this.elements.successRate.textContent = totalReactions > 0 ? `${successRate.toFixed(1)}%` : '0%';
        }
        
        if (this.elements.standardDeviation) {
            this.elements.standardDeviation.textContent = standardDeviation > 0 ? `${standardDeviation.toFixed(0)} ms` : '-- ms';
        }
        
        if (this.elements.improvement) {
            this.elements.improvement.textContent = improvement;
        }
    }

    // 原有的 updateDisplayElements 函數
    updateDisplayElements() {
        // 更新當前回合
        if (this.elements.currentRound) {
            this.elements.currentRound.textContent = this.currentRound;
        }
        
        // 更新總回合數
        if (this.elements.totalRounds) {
            this.elements.totalRounds.textContent = this.totalRounds;
        }
        
        // 更新平均反應時間
        if (this.reactionTimes.length > 0 && this.elements.averageTime) {
            const average = this.reactionTimes.reduce((sum, time) => sum + time, 0) / this.reactionTimes.length;
            this.elements.averageTime.textContent = `${Math.round(average)} ms`;
        }
        
        // 更新最佳反應時間
        if (this.reactionTimes.length > 0 && this.elements.bestTime) {
            const best = Math.min(...this.reactionTimes);
            this.elements.bestTime.textContent = `${best} ms`;
        }
        
        // 更新總反應次數
        if (this.elements.totalReactions) {
            this.elements.totalReactions.textContent = this.reactionTimes.length;
        }
        
        // 更新系統狀態
        if (this.elements.systemStatus) {
            this.elements.systemStatus.textContent = this.isTraining ? '🏃 訓練中' : '⏸️ 等待開始';
            this.elements.systemStatus.className = this.isTraining ? 'status-badge success' : 'status-badge info';
        }
        
        // 即時更新統計區域
        this.updateStatsDisplay();
    }
}

// 頁面載入完成後初始化系統
window.addEventListener('load', () => {
    console.log('📱 頁面完全載入，初始化訓練系統...');
    
    try {
        window.trainingSystem = new ReactionTrainingSystem();
        console.log('✅ 訓練系統初始化成功');
    } catch (error) {
        console.error('❌ 系統初始化失敗:', error);
        alert('系統初始化失敗: ' + error.message);
    }
});

// 防止頁面意外關閉時丟失訓練數據
window.addEventListener('beforeunload', (e) => {
    if (window.trainingSystem && window.trainingSystem.isTraining) {
        e.preventDefault();
        e.returnValue = '訓練正在進行中，確定要離開嗎？';
        return e.returnValue;
    }
});
