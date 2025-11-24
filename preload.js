const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    generateTTS: (text, voice, rate) => ipcRenderer.invoke('generate-tts', { text, voice, rate }),
    generateMeditation: (prompt, apiKey) => ipcRenderer.send('generate-meditation', { prompt, apiKey }),
    onMeditationChunk: (callback) => ipcRenderer.on('meditation-chunk', (_, data) => callback(data)),
    onMeditationError: (callback) => ipcRenderer.on('meditation-error', (_, error) => callback(error)),
    onMeditationDone: (callback) => ipcRenderer.on('meditation-done', () => callback()),
    removeMeditationListeners: () => {
        ipcRenderer.removeAllListeners('meditation-chunk');
        ipcRenderer.removeAllListeners('meditation-error');
        ipcRenderer.removeAllListeners('meditation-done');
    }
});
