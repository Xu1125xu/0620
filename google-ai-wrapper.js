/**
 * Google Generative AI REST API 包裝器
 * 為反應訓練系統提供 Google Gemini API 支援
 */

console.log('🔄 載入 Google AI 包裝器...');

// Google Generative AI REST API 包裝器
class GoogleGenerativeAIWrapper {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://generativelanguage.googleapis.com/v1beta';
        
        if (!apiKey) {
            console.warn('⚠️ 未提供 Google API Key');
        }
    }

    getGenerativeModel(config = {}) {
        const modelName = config.model || 'gemini-1.5-flash';
        return new GenerativeModel(this.apiKey, modelName, this.baseURL);
    }
}

class GenerativeModel {
    constructor(apiKey, modelName, baseURL) {
        this.apiKey = apiKey;
        this.modelName = modelName;
        this.baseURL = baseURL;
    }

    async generateContent(prompt) {
        if (!this.apiKey) {
            throw new Error('需要 Google API Key 才能使用 AI 功能');
        }

        try {
            const url = `${this.baseURL}/models/${this.modelName}:generateContent?key=${this.apiKey}`;
            
            const requestBody = {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            };

            console.log('🤖 發送請求到 Google AI:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Google AI API 錯誤:', response.status, errorData);
                
                if (response.status === 400) {
                    throw new Error('API 請求格式錯誤，請檢查 API Key 是否正確');
                } else if (response.status === 403) {
                    throw new Error('API Key 無效或沒有權限，請檢查 API Key 設定');
                } else if (response.status === 429) {
                    throw new Error('API 使用量超限，請稍後再試');
                } else {
                    throw new Error(`Google AI API 錯誤: ${response.status}`);
                }
            }

            const data = await response.json();
            console.log('✅ Google AI 回應成功');

            return {
                response: {
                    text: () => {
                        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                            return data.candidates[0].content.parts[0].text;
                        }
                        return '無法取得 AI 回應';
                    }
                }
            };

        } catch (error) {
            console.error('❌ Google AI 請求失敗:', error);
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('網路連接失敗，請檢查網路狀態');
            }
            
            throw error;
        }
    }
}

// 兼容性檢查
(function() {
    // 檢查 fetch API 支援
    if (typeof fetch === 'undefined') {
        console.warn('⚠️ 瀏覽器不支援 fetch API，Google AI 功能可能無法正常使用');
    }
    
    // 檢查 Promise 支援
    if (typeof Promise === 'undefined') {
        console.warn('⚠️ 瀏覽器不支援 Promise，Google AI 功能可能無法正常使用');
    }
    
    console.log('🔧 Google AI 包裝器相容性檢查完成');
})();

// 導出到全局變數
if (typeof window !== 'undefined') {
    window.GoogleGenerativeAI = {
        GoogleGenerativeAI: GoogleGenerativeAIWrapper
    };
    window.GoogleGenerativeAIWrapper = GoogleGenerativeAIWrapper;
    window.GenerativeModel = GenerativeModel;
    console.log('✅ Google AI 包裝器已載入到全局變數');
} else if (typeof global !== 'undefined') {
    global.GoogleGenerativeAI = {
        GoogleGenerativeAI: GoogleGenerativeAIWrapper
    };
}

console.log('✅ Google AI 包裝器載入完成');
