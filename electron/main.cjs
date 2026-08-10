const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow;
let backendPromise;
let backend;
let backendClosing = false;

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
  if (backendPromise) return backendPromise;
  process.env.NODE_ENV = 'production';
  process.env.H3_SERVER_AUTO_START = 'false';

  backendPromise = Promise.resolve().then(() => {
    const serverPath = path.join(__dirname, '../dist/server.cjs');
    console.log('[Electron Main] Launching embedded Express backend from:', serverPath);
    const { startServer } = require(serverPath);
    if (typeof startServer !== 'function') {
      throw new Error('Embedded backend does not export startServer.');
    }
    const skillsRoot = app.isPackaged
      ? path.join(process.resourcesPath, 'skills')
      : path.join(app.getAppPath(), 'data');
    return startServer({
      dataRoot: path.join(app.getPath('userData'), 'data'),
      skillsRoot,
      distRoot: path.join(app.getAppPath(), 'dist'),
      host: '127.0.0.1',
      port: 0,
    });
  }).then((startedBackend) => {
    backend = startedBackend;
    return startedBackend;
  }).catch((err) => {
    backendPromise = null;
    throw err;
  });
  return backendPromise;
}

async function createWindow() {
  let backend;
  try {
    backend = await startBackendServer();
    await waitForServer(`${backend.url}/api/health`, 12000);
  } catch (err) {
    const message = err?.message || String(err);
    console.error('[Electron Main] Failed to start embedded backend:', err);
    dialog.showErrorBox('MiniMax-H3 PromptMaster 启动失败', message);
    app.quit();
    return;
  }
  const serverUrl = backend.url;

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

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(createWindow);

  app.on('before-quit', (event) => {
    if (backendClosing || !backend?.server?.listening) return;
    event.preventDefault();
    backendClosing = true;
    backend.server.close(() => app.quit());
  });

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
}
