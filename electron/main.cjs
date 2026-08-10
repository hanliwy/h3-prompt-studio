const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow;

// Wait for local Express server to start responding
function waitForServer(url, timeout = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          resolve(true);
        } else {
          retry();
        }
      }).on('error', retry);
    };

    const retry = () => {
      if (Date.now() - start > timeout) {
        reject(new Error('Server timeout on ' + url));
      } else {
        setTimeout(check, 400);
      }
    };

    check();
  });
}

// Start embedded Express backend
function startBackendServer() {
  process.env.NODE_ENV = 'production';
  process.env.PORT = process.env.PORT || '3000';
  
  try {
    const serverPath = path.join(__dirname, '../dist/server.cjs');
    console.log('[Electron Main] Launching embedded Express backend from:', serverPath);
    require(serverPath);
  } catch (err) {
    console.error('[Electron Main] Failed to load server.cjs:', err);
  }
}

async function createWindow() {
  // 1. Boot embedded backend
  startBackendServer();

  const serverUrl = `http://localhost:${process.env.PORT || '3000'}`;

  // 2. Wait for backend readiness
  try {
    await waitForServer(serverUrl, 12000);
  } catch (err) {
    console.warn('[Electron Main] Wait for server warning:', err?.message || err);
  }

  // 3. Create Desktop Window
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 720,
    title: 'MiniMax-H3 视频 Prompt 提示词大师',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    autoHideMenuBar: true,
    backgroundColor: '#020617', // Match Slate-950 theme
    show: false,
  });

  mainWindow.loadURL(serverUrl);

  // Show window smoothly once ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links (e.g. API docs, GitHub) in system default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
