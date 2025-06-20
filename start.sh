#!/bin/bash

echo "🚀 啟動 AI 互動式反應訓練牆系統"
echo "=================================="

# 檢查是否在正確的目錄
if [ ! -f "index.html" ]; then
    echo "❌ 錯誤：找不到 index.html 檔案"
    echo "請確保您在正確的專案目錄中執行此腳本"
    exit 1
fi

echo "📁 當前目錄：$(pwd)"
echo "📋 檔案清單："
ls -la *.html *.css *.js *.md 2>/dev/null | head -10

echo ""
echo "🌐 可用的網頁檔案："
echo "• index.html - 主要應用程式（推薦）"
echo "• test.html - 測試頁面"
echo "• cdn-version.html - CDN 版本"
echo "• simple-version.html - 簡化版本"

echo ""
echo "🔧 系統需求檢查："

# 檢查是否有 Python
if command -v python3 &> /dev/null; then
    echo "✅ Python3 已安裝：$(python3 --version)"
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    echo "✅ Python 已安裝：$(python --version)"
    PYTHON_CMD="python"
else
    echo "❌ 未找到 Python"
    echo "請安裝 Python 來啟動本地伺服器"
    exit 1
fi

# 檢查是否有 Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js 已安裝：$(node --version)"
    HAS_NODE=true
else
    echo "⚠️  Node.js 未安裝（可選）"
    HAS_NODE=false
fi

echo ""
echo "🚀 啟動選項："
echo "1) 使用 Python 簡易伺服器（推薦）"
if [ "$HAS_NODE" = true ]; then
    echo "2) 使用 Node.js http-server"
fi
echo "3) 手動打開檔案"
echo "4) 只顯示說明"

read -p "請選擇選項 (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🐍 啟動 Python 伺服器..."
        echo "📍 伺服器位址：http://localhost:8000"
        echo "📋 可用頁面："
        echo "   • http://localhost:8000/index.html (主應用)"
        echo "   • http://localhost:8000/test.html (測試頁面)"
        echo ""
        echo "💡 提示：按 Ctrl+C 停止伺服器"
        echo "🔄 正在啟動伺服器..."
        
        # 嘗試在埠口 8000 啟動，如果失敗則嘗試其他埠口
        for port in 8000 8001 8002 8080 3000; do
            if ! lsof -i :$port > /dev/null 2>&1; then
                echo "✅ 使用埠口 $port"
                echo "🌐 請在瀏覽器中開啟：http://localhost:$port"
                echo ""
                $PYTHON_CMD -m http.server $port
                break
            else
                echo "⚠️  埠口 $port 已被使用"
            fi
        done
        ;;
    2)
        if [ "$HAS_NODE" = true ]; then
            echo ""
            echo "🟢 啟動 Node.js 伺服器..."
            if command -v npx &> /dev/null; then
                echo "📍 伺服器位址：http://localhost:8080"
                echo "💡 提示：按 Ctrl+C 停止伺服器"
                npx http-server -p 8080 -c-1
            else
                echo "❌ 找不到 npx，請先安裝 Node.js"
            fi
        else
            echo "❌ Node.js 未安裝"
        fi
        ;;
    3)
        echo ""
        echo "📂 手動打開檔案："
        echo "請使用瀏覽器直接開啟以下檔案："
        echo "• $(pwd)/index.html"
        echo ""
        echo "⚠️  注意：某些功能可能需要伺服器環境才能正常運作"
        
        # 嘗試自動打開瀏覽器
        if command -v open &> /dev/null; then
            echo "🚀 正在打開預設瀏覽器..."
            open index.html
        elif command -v xdg-open &> /dev/null; then
            echo "🚀 正在打開預設瀏覽器..."
            xdg-open index.html
        else
            echo "請手動在瀏覽器中開啟檔案"
        fi
        ;;
    4)
        echo ""
        echo "📖 使用說明："
        echo "=================================="
        echo ""
        echo "🎯 專案簡介："
        echo "這是一個 AI 互動式反應訓練牆系統，結合以下技術："
        echo "• Arduino 硬體控制（LED + 按鈕）"
        echo "• Google Gemini AI 分析"
        echo "• Web Serial API 通訊"
        echo "• 語音合成回饋"
        echo ""
        echo "🔧 設定步驟："
        echo "1. 取得 Google API Key"
        echo "2. 連接 Arduino 硬體"
        echo "3. 在網頁中設定 API Key"
        echo "4. 開始訓練"
        echo ""
        echo "📁 檔案說明："
        echo "• README.md - 專案說明"
        echo "• SETUP.md - 安裝指南"
        echo "• API_KEY_GUIDE.md - API Key 設定教學"
        echo ""
        ;;
    *)
        echo "❌ 無效選項"
        ;;
esac

echo ""
echo "🔗 相關連結："
echo "• Google AI Studio: https://aistudio.google.com/"
echo "• 專案文件：查看同目錄下的 .md 檔案"
echo ""
echo "✨ 祝您訓練順利！"
