const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { EdgeTTS } = require('node-edge-tts');
const https = require('https');
const http = require('http');
const handler = require('serve-handler');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false
        },
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#0f172a',
    });

    const isDev = !app.isPackaged;

    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        // Serve the 'out' directory
        const server = http.createServer((request, response) => {
            return handler(request, response, {
                public: path.join(__dirname, 'out')
            });
        });

        server.listen(0, () => {
            const port = server.address().port;
            mainWindow.loadURL(`http://localhost:${port}`);
        });
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// IPC Handlers
ipcMain.handle('generate-tts', async (event, { text, voice, rate }) => {
    try {
        const tts = new EdgeTTS({
            voice: voice || "zh-CN-XiaoxiaoNeural",
            lang: "zh-CN",
            outputFormat: "audio-24khz-48kbitrate-mono-mp3",
            rate: rate || "0%",
        });

        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, `tts-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`);

        await tts.ttsPromise(text, tempFile);
        const audioBuffer = await fs.promises.readFile(tempFile);
        await fs.promises.unlink(tempFile);

        // Convert buffer to base64 for sending to renderer
        return `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;
    } catch (error) {
        console.error("TTS Error:", error);
        throw error;
    }
});

ipcMain.on('generate-meditation', async (event, { prompt, apiKey }) => {
    const key = apiKey || process.env.DEEPSEEK_API_KEY;

    try {
        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "text/event-stream",
                "Authorization": `Bearer ${key}`,
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "你是一个专业的冥想引导师。请用舒缓、温柔、自然的中文语调创作冥想脚本。脚本应该包含适当的停顿指示（如...）。请直接输出冥想内容，不要包含任何开场白或结束语。确保语言优美、充满意境。\n\n你可以使用标签来控制节奏：\n- 使用 [pause Ns] 来插入 N 秒的停顿（例如 [pause 5s]）。\n- 使用 [rate +/-N%] 来调整语速（例如 [rate -10%] 表示慢 10%，[rate +10%] 表示快 10%）。\n\n请在脚本中合理使用这些标签，特别是建议在开始时使用 [rate -10%] 来营造舒缓的氛围，并在段落之间插入适当的 [pause]。"
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                stream: true,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error("DeepSeek API Error:", error);
            event.reply('meditation-error', `API Error: ${response.status}`);
            return;
        }

        if (!response.body) {
            event.reply('meditation-error', 'No response body');
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const data = line.slice(6);
                    if (data === "[DONE]") {
                        event.reply('meditation-done');
                        continue;
                    }

                    try {
                        const json = JSON.parse(data);
                        const content = json.choices[0]?.delta?.content;
                        if (content) {
                            event.reply('meditation-chunk', content);
                        }
                    } catch (e) {
                        // Ignore parse errors
                    }
                }
            }
        }
        event.reply('meditation-done');

    } catch (error) {
        console.error("Generation failed:", error);
        event.reply('meditation-error', error.message);
    }
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
