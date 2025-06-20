/*
  AI 互動式反應訓練牆 - Arduino 程式碼
  
  硬體連接：
  - 按鈕: VCC → Arduino 5V, GND → Arduino GND, OUT → Arduino D2 腳位
  - LED: 長腳(+) → 串 220Ω 電阻 → Arduino D8 腳位, 短腳(-) → Arduino GND
  
  功能：
  - 接收來自網頁的 LED 控制命令和訓練難度設定
  - 根據難度調整 LED 亮燈頻率和持續時間
  - 偵測按鈕按下並記錄反應時間
  - 支援串列通訊協定
*/

// 定義腳位
const int LED_PIN = 8;         // 外接 LED 腳位 (改為 D8)
const int BUTTON_PIN = 2;      // 按鈕腳位

// 變數定義
bool ledState = false;         // LED 狀態
bool lastButtonState = HIGH;   // 上一次按鈕狀態
bool currentButtonState = HIGH; // 目前按鈕狀態
unsigned long lastDebounceTime = 0; // 防彈跳計時器
const unsigned long debounceDelay = 50; // 防彈跳延遲時間

// 訓練相關變數
int trainingDifficulty = 3;    // 訓練難度 (1-5)
bool trainingMode = false;     // 是否在訓練模式
unsigned long ledOnTime = 0;   // LED 亮起時間
unsigned long ledDuration = 2000; // LED 持續時間 (根據難度調整)
bool waitingForResponse = false; // 是否等待玩家按鈕

// 不同難度的時間設定 (毫秒)
const unsigned long difficultySettings[6][2] = {
  {0, 0},        // 索引 0 不使用
  {3000, 6000},  // 難度 1: LED 亮 3 秒, 間隔 3-6 秒
  {2500, 5000},  // 難度 2: LED 亮 2.5 秒, 間隔 2.5-5 秒  
  {2000, 4000},  // 難度 3: LED 亮 2 秒, 間隔 2-4 秒
  {1500, 3000},  // 難度 4: LED 亮 1.5 秒, 間隔 1.5-3 秒
  {1000, 2500}   // 難度 5: LED 亮 1 秒, 間隔 1-2.5 秒
};

void setup() {
  // 初始化串列通訊 (波特率改為 115200 以配合網頁端)
  Serial.begin(115200);
  
  // 設定腳位模式
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // 初始化 LED 為關閉狀態
  digitalWrite(LED_PIN, LOW);
  ledState = false;
  
  // 傳送準備完成訊號
  Serial.println("ARDUINO_READY");
  
  // 除錯訊息
  Serial.println("=== AI 反應訓練系統 Arduino 端啟動 ===");
  Serial.println("LED 腳位: D8");
  Serial.println("按鈕腳位: D2");
  Serial.println("預設難度: 3");
  Serial.println("等待來自網頁的命令...");
}

void loop() {
  // 處理來自電腦的命令
  handleSerialCommands();
  
  // 檢查按鈕狀態
  checkButtonPress();
  
  // 處理訓練模式的 LED 控制
  handleTrainingMode();
  
  // 小延遲避免過度佔用 CPU
  delay(10);
}

void handleSerialCommands() {
  // 檢查是否有串列資料可讀取
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim(); // 移除空白字元
    
    // 處理 LED 開啟命令
    if (command == "LED_ON") {
      digitalWrite(LED_PIN, HIGH);
      ledState = true;
      ledOnTime = millis();
      waitingForResponse = true;
      Serial.println("LED_STATUS_ON");
      
    // 處理 LED 關閉命令
    } else if (command == "LED_OFF") {
      digitalWrite(LED_PIN, LOW);
      ledState = false;
      waitingForResponse = false;
      Serial.println("LED_STATUS_OFF");
      
    // 處理訓練開始命令
    } else if (command == "START_TRAINING") {
      trainingMode = true;
      waitingForResponse = false;
      Serial.println("TRAINING_STARTED");
      
    // 處理訓練停止命令
    } else if (command == "STOP_TRAINING") {
      trainingMode = false;
      digitalWrite(LED_PIN, LOW);
      ledState = false;
      waitingForResponse = false;
      Serial.println("TRAINING_STOPPED");
      
    // 處理難度設定命令 (格式: SET_DIFFICULTY:1-5)
    } else if (command.startsWith("SET_DIFFICULTY:")) {
      int newDifficulty = command.substring(15).toInt();
      if (newDifficulty >= 1 && newDifficulty <= 5) {
        trainingDifficulty = newDifficulty;
        ledDuration = difficultySettings[trainingDifficulty][0];
        Serial.print("DIFFICULTY_SET:");
        Serial.println(trainingDifficulty);
      } else {
        Serial.println("INVALID_DIFFICULTY");
      }
      
    // 處理狀態查詢命令
    } else if (command == "GET_STATUS") {
      Serial.print("LED_STATUS:");
      Serial.println(ledState ? "ON" : "OFF");
      Serial.print("BUTTON_STATUS:");
      Serial.println(digitalRead(BUTTON_PIN) == LOW ? "PRESSED" : "RELEASED");
      Serial.print("TRAINING_MODE:");
      Serial.println(trainingMode ? "ON" : "OFF");
      Serial.print("DIFFICULTY:");
      Serial.println(trainingDifficulty);
      
    // 處理測試命令
    } else if (command == "TEST") {
      // LED 閃爍測試
      for (int i = 0; i < 3; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(200);
        digitalWrite(LED_PIN, LOW);
        delay(200);
      }
      Serial.println("TEST_COMPLETE");
      
    // 未知命令
    } else if (command.length() > 0) {
      Serial.print("UNKNOWN_COMMAND:");
      Serial.println(command);
    }
  }
}

void checkButtonPress() {
  // 讀取按鈕狀態
  int reading = digitalRead(BUTTON_PIN);
  
  // 檢查按鈕狀態是否改變（防彈跳處理）
  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }
  
  // 如果狀態穩定超過防彈跳時間
  if ((millis() - lastDebounceTime) > debounceDelay) {
    // 如果按鈕狀態確實改變了
    if (reading != currentButtonState) {
      currentButtonState = reading;
      
      // 如果按鈕被按下（從 HIGH 變為 LOW，因為使用上拉電阻）
      if (currentButtonState == LOW) {
        unsigned long reactionTime = 0;
        
        // 總是計算並發送反應時間（從 LED 亮起開始計算）
        if (ledState) {
          reactionTime = millis() - ledOnTime;
          Serial.print("BUTTON_PRESSED:");
          Serial.println(reactionTime);
          
          // 關閉 LED 表示這回合結束
          digitalWrite(LED_PIN, LOW);
          ledState = false;
          waitingForResponse = false;
        } else {
          // LED 未亮時的按鈕按下，發送特殊標記
          Serial.println("BUTTON_PRESSED:NO_LED");
        }
        
        // 視覺回饋：短暫閃爍確認按鈕被偵測到
        if (!ledState) {
          digitalWrite(LED_PIN, HIGH);
          delay(50);
          digitalWrite(LED_PIN, LOW);
        }
      }
    }
  }
  
  // 保存這次的讀取值
  lastButtonState = reading;
}

void handleTrainingMode() {
  // 只在訓練模式下處理
  if (!trainingMode) {
    return;
  }
  
  // 如果 LED 亮著，檢查是否超時
  if (ledState && waitingForResponse) {
    if (millis() - ledOnTime >= ledDuration) {
      // 超時，關閉 LED
      digitalWrite(LED_PIN, LOW);
      ledState = false;
      waitingForResponse = false;
      Serial.println("LED_TIMEOUT");
    }
  }
}

/*
串列通訊協定說明：

從電腦到 Arduino 的命令：
- "LED_ON"           : 手動開啟 LED
- "LED_OFF"          : 手動關閉 LED  
- "START_TRAINING"   : 開始訓練模式
- "STOP_TRAINING"    : 停止訓練模式
- "SET_DIFFICULTY:X" : 設定難度 (X = 1-5)
- "GET_STATUS"       : 查詢目前狀態
- "TEST"             : 執行硬體測試

從 Arduino 到電腦的回應：
- "ARDUINO_READY"       : Arduino 啟動完成
- "LED_STATUS_ON"       : LED 已開啟
- "LED_STATUS_OFF"      : LED 已關閉
- "TRAINING_STARTED"    : 訓練模式已開始
- "TRAINING_STOPPED"    : 訓練模式已停止
- "DIFFICULTY_SET:X"    : 難度已設定為 X
- "BUTTON_PRESSED:XXX"  : 按鈕被按下，反應時間 XXX 毫秒
- "BUTTON_PRESSED:INVALID" : 無效的按鈕按下 (LED 未亮起時)
- "LED_TIMEOUT"         : LED 亮起超時，玩家未及時按下按鈕
- "TEST_COMPLETE"       : 測試完成
- "UNKNOWN_COMMAND:xxx" : 未知命令

狀態查詢回應格式：
- "LED_STATUS:ON/OFF"
- "BUTTON_STATUS:PRESSED/RELEASED"
- "TRAINING_MODE:ON/OFF"
- "DIFFICULTY:1-5"

硬體連接說明：
按鈕模組：
- VCC → Arduino 5V
- GND → Arduino GND  
- OUT → Arduino D2

LED 連接：
- LED 長腳(+) → 220Ω 電阻 → Arduino D8
- LED 短腳(-) → Arduino GND

訓練難度設定：
1. 簡單：LED 亮 3 秒
2. 容易：LED 亮 2.5 秒
3. 普通：LED 亮 2 秒
4. 困難：LED 亮 1.5 秒
5. 專家：LED 亮 1 秒
*/
