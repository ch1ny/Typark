'use strict'

import { app, protocol, BrowserWindow, screen, dialog, shell } from 'electron'
import fs from 'fs'; // 使用fs模块
import path from 'path';
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import packageJson from '../package.json'

// import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'

const isDevelopment = process.env.NODE_ENV !== 'production'

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

async function createWindow() {
  const screenWidth = screen.getPrimaryDisplay().workAreaSize.width;
  const screenHeight = screen.getPrimaryDisplay().workAreaSize.height;
  // Create the browser window.
  const win = new BrowserWindow({
    width: parseInt(screenWidth * 0.8),
    height: parseInt(screenHeight * 0.8),
    frame: false, // 是否使用默认窗口
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // 禁用上下文隔离
      preload: path.join(__dirname, 'preload.js')
    }
  })
  //接收渲染进程的信息
  const ipc = require('electron').ipcMain;
  ipc.on("quit", function () {
    app.exit();
  });
  ipc.on('min', function () {
    win.minimize();
  });
  ipc.on('max', function () {
    if (win.isMaximized()) {
      win.restore();
    } else {
      win.maximize();
    }
  });
  ipc.on("openFile", () => {
    dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        // { name: 'Images', extensions: ['jpg', 'png', 'gif'] },
        // { name: 'Movies', extensions: ['mkv', 'avi', 'mp4'] },
        // { name: 'Custom File Type', extensions: ['as'] },
        // { name: 'All Files', extensions: ['*'] }, 
        { name: 'Markdown File', extensions: ['md', 'markdown', 'mmd', 'mkd', 'mdwn', 'mdown', 'mdx', 'mdtxt', 'apib', 'rmarkdown', 'rmd', 'txt', 'text'] }
      ],
    }).then((res) => {
      if (res && res.filePaths && res.filePaths.length > 0) {
        fs.readFile(res.filePaths[0], "utf8", (err, data) => {
          if (err) {
            win.webContents.send('openedFile', -1)
          } else {
            win.webContents.send('openedFile', 0, res.filePaths[0], data)
          }
        })
      }
    })
  })
  ipc.on('saveFile', (event, path, data) => {
    fs.writeFile(path, data, "utf8", (err) => {
      if (err) {
        win.webContents.send('savedFile', -1);
      } else {
        win.webContents.send('savedFile', 0);
      }
    })
  })
  ipc.on('saveNewFile', (event, data) => {
    dialog.showSaveDialog({
      title: "文件另存为",
      defaultPath: path.join(__dirname, `${data.substring(0, 10)}.md`),
      filters: [
        { name: 'Markdown File', extensions: ['md', 'markdown', 'mmd', 'mkd', 'mdwn', 'mdown', 'mdx', 'mdtxt', 'apib', 'rmarkdown', 'rmd', 'txt', 'text'] }
      ],
    }).then((res) => {
      if (res && res.filePath) {
        fs.writeFile(res.filePath, data, "utf8", (err) => {
          if (err) {
            win.webContents.send('savedNewFile', -1);
          } else {
            win.webContents.send('savedNewFile', 0, res.filePath);
          }
        })
      }
    })
  })
  ipc.on('saveAsHtml', (event, data) => {
    dialog.showSaveDialog({
      title: "导出为HTML",
      defaultPath: path.join(__dirname, `${data.substring(0, 10)}.html`),
      filters: [
        { name: 'HTML', extensions: ['html'] }
      ],
    }).then((res) => {
      if (res && res.filePath) {
        const title = res.filePath.split('/')[res.filePath.split('/').length - 1]
        let html = `<!doctype html>\n<html>\n<head>\n<meta charset='UTF-8'><meta name='viewport' content='width=device-width initial-scale=1'>\n<link href="https://cdn.bootcss.com/github-markdown-css/2.10.0/github-markdown.min.css" rel="stylesheet">\n<title>${title}</title>\n</head>\n<body>\n<div class="markdown-body">\n${data}\n</div>\n</body>\n</html>`
        fs.writeFile(res.filePath, html, "utf8", (err) => {
          if (err) {
            win.webContents.send('savedAsHtml', -1);
          } else {
            win.webContents.send('savedAsHtml', 0);
          }
        })
      }
    })
  })
  ipc.on('openOfficial', () => {
    shell.openExternal('https://gitee.com/aioliaregulus/typark')
  })
  ipc.on('getNewVersion', (event, version, downloadUrl) => {
    win.webContents.send('hasNewVersion', packageJson.version, version, downloadUrl)
  })
  ipc.on('update', (event, downloadUrl) => {

  })
  win.on('resize', () => {
    win.webContents.send('resize', win.isMaximized())
  })
  win.on('closed', () => {
    win = null
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}
