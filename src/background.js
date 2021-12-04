'use strict'

import { app, protocol, BrowserWindow, screen, dialog, shell } from 'electron'
import fs from 'fs-extra'; // 使用fs模块
import { autoUpdater } from 'electron-updater';
import path from 'path';
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import packageJson from '../package.json'

// import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'

const isDevelopment = process.env.NODE_ENV !== 'production'

let initTimeStamp; // 应用启动时间戳

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

let mainWindow, loadingWindow;
let screenWidth, screenHeight;

async function createLoadingWindow() { //加载页面窗口
  loadingWindow = new BrowserWindow({
    width: parseInt(screenWidth * 0.5),
    height: parseInt(screenHeight * 0.5),
    transparent: true,
    frame: false, // 是否使用默认窗口
    resizable: false,
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await loadingWindow.loadURL(path.join(__dirname, '../public/loading.html'))
  } else {
    createProtocol('app')
    // Load the loading.html when not in development
    loadingWindow.loadURL('app://./loading.html')
  }

  loadingWindow.on('closed', () => {
    loadingWindow = null
  })
}

async function createMainWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: parseInt(screenWidth * 0.8),
    height: parseInt(screenHeight * 0.8),
    frame: false, // 是否显示默认窗口
    transparent: true, // 透明窗口
    show: false,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      contextIsolation: false, // 禁用上下文隔离
      preload: path.join(__dirname, 'preload.js')
    },
  })

  //接收渲染进程的信息
  const ipc = require('electron').ipcMain;
  ipc.on('argv', () => {
    if (process.argv[1]) {
      fs.readFile(process.argv[1], "utf8", (err, data) => {
        if (err) {
          mainWindow.webContents.send('openedFile', -1)
        } else {
          mainWindow.webContents.send('openedFile', 0, process.argv[1], data)
        }
      })
    }
  })
  ipc.on('vue-ready', () => {

  })
  ipc.on('min', function () {
    mainWindow.minimize();
  });
  ipc.on('max', function () {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize();
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
            mainWindow.webContents.send('openedFile', -1)
          } else {
            mainWindow.webContents.send('openedFile', 0, res.filePaths[0], data)
          }
        })
      }
    })
  })
  ipc.on('saveFile', (event, path, data) => {
    fs.writeFile(path, data, "utf8", (err) => {
      if (err) {
        mainWindow.webContents.send('savedFile', -1);
      } else {
        mainWindow.webContents.send('savedFile', 0);
      }
    })
  })
  ipc.on('saveNewFile', (event, data) => {
    dialog.showSaveDialog({
      title: "文件另存为",
      defaultPath: path.join(__dirname, `${data.replace(/\\|\/|\?|\？|\*|\"|\“|\”|\'|\‘|\’|\<|\>|\{|\}|\[|\]|\【|\】|\：|\:|\、|\^|\$|\!|\~|\`|\|/g, '').substring(0, 10)}.md`),
      filters: [
        { name: 'Markdown File', extensions: ['md', 'markdown', 'mmd', 'mkd', 'mdwn', 'mdown', 'mdx', 'mdtxt', 'apib', 'rmarkdown', 'rmd', 'txt', 'text'] }
      ],
    }).then((res) => {
      if (res && res.filePath) {
        fs.writeFile(res.filePath, data, "utf8", (err) => {
          if (err) {
            mainWindow.webContents.send('savedNewFile', -1);
          } else {
            mainWindow.webContents.send('savedNewFile', 0, res.filePath);
          }
        })
      }
    })
  })
  ipc.on('saveAsHtml', (event, filename, data) => {
    let htmlpath;
    if (filename) {
      htmlpath = path.join(__dirname, filename)
    } else {
      htmlpath = path.join(__dirname, `${data.replace(/\\|\/|\?|\？|\*|\"|\“|\”|\'|\‘|\’|\<|\>|\{|\}|\[|\]|\【|\】|\：|\:|\、|\^|\$|\!|\~|\`|\|/g, '').substring(0, 10)}.html`)
    }
    dialog.showSaveDialog({
      title: "导出为HTML",
      defaultPath: htmlpath,
      filters: [
        { name: 'HTML', extensions: ['html'] }
      ],
    }).then((res) => {
      if (res) {
        if (res.canceled) {
          mainWindow.webContents.send('savedAsHtml', -1);
        } else if (res.filePath) {
          const title = res.filePath.split('\\')[res.filePath.split('\\').length - 1]
          let html = `<!doctype html>\n<html>\n<head>\n<meta charset='UTF-8'><meta name='viewport' content='width=device-width initial-scale=1'>\n<link href="https://cdn.bootcss.com/github-markdown-css/2.10.0/github-markdown.min.css" rel="stylesheet">\n<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/styles/github.min.css" id="md-code-style">\n<title>${title}</title>\n</head>\n<body>\n<div class="markdown-body">\n${data}\n</div>\n</body>\n</html>`
          fs.writeFile(res.filePath, html, "utf8", (err) => {
            if (err) {
              mainWindow.webContents.send('savedAsHtml', 1, err);
            } else {
              mainWindow.webContents.send('savedAsHtml', 0);
            }
          })
        }
      }
    })
  })
  ipc.on('pastePicture', (event, imgdata, imgtype, timestamp, filename, tagname) => {
    let destpath
    if (process.env.NODE_ENV === 'development') {
      destpath = path.join(__dirname, 'user-images')
    } else {
      destpath = path.join(__dirname, '../user-images')
    }
    console.log(`destpath = ${destpath}`);
    const dirExists = fs.pathExistsSync(destpath)
    if (!dirExists) {
      fs.mkdirSync(destpath)
    }
    let exists = fs.existsSync(path.join(destpath, `typark${timestamp}.${imgtype}`))
    while (exists) {
      exists = fs.existsSync(path.join(destpath, `typark${++timestamp}.${imgtype}`))
    }
    fs.writeFile(path.join(destpath, `typark${timestamp}.${imgtype}`), Buffer.from(imgdata, 'base64'), (err) => {
      if (err) {
        mainWindow.webContents.send('pastedPicture', -1);
      } else {
        mainWindow.webContents.send('pastedPicture', 0, path.join(destpath, `typark${timestamp}.${imgtype}`), filename, tagname);
      }
    })
  })
  ipc.on('openOfficial', () => {
    shell.openExternal('https://gitee.com/aioliaregulus/typark')
  })
  ipc.on('getNewVersion', (event, version, downloadUrl) => {
    mainWindow.webContents.send('hasNewVersion', packageJson.version, version, downloadUrl)
  })
  ipc.on('update', (event, downloadUrl) => {

  })

  mainWindow.on('resize', () => {
    mainWindow.webContents.send('resize', mainWindow.isMaximized())
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  mainWindow.on('ready-to-show', function () {
    mainWindow.show()
  })

  //= ==============================================================================================================
  //                            清除每次更新下载的文件，否则无法进行更新
  //= ==============================================================================================================
  // updaterCacheDirName的值与src/main/app-update.yml中的updaterCacheDirName值一致，在windows中会创建一个类似
  // C:\Users\Administrator\AppData\Local\typark\pending文件存储更新下载后的文件"*.exe"和"update-info.json"
  let updaterCacheDirName = 'typark'
  const updatePendingPath = path.join(autoUpdater.app.baseCachePath, updaterCacheDirName, 'pending')
  fs.emptyDir(updatePendingPath)
  // 设置是否自动下载，默认是true,当点击检测到新版本时，会自动下载安装包，所以设置为false
  autoUpdater.autoDownload = false
  // https://github.com/electron-userland/electron-builder/issues/1254
  if (process.env.NODE_ENV === 'development') {
    autoUpdater.updateConfigPath = path.join(__dirname, 'latest.yml')
  } else {
    autoUpdater.updateConfigPath = path.join(__dirname, '../app-update.yml')
  }
  autoUpdater.setFeedURL('http://121.4.250.38:8080/update/electron/typark')
  autoUpdater.on('error', function () {
    mainWindow.webContents.send('checkedForUpdate', -1)
  })
  autoUpdater.on('checking-for-update', function () {
    mainWindow.webContents.send('checkedForUpdate', -2)
  })
  autoUpdater.on('update-available', function (info) {
    mainWindow.webContents.send('checkedForUpdate', 1, packageJson.version, info)
  })
  autoUpdater.on('update-not-available', function (info) {
    mainWindow.webContents.send('checkedForUpdate', 0, packageJson.version, info)
  })
  // 更新下载进度事件
  autoUpdater.on('download-progress', function (progressObj) {
    // console.warn('触发下载。。。')
    // console.log(progressObj)
    // console.warn(progressObj)
    mainWindow.webContents.send('downloadProgress', progressObj)
  })
  autoUpdater.on('update-downloaded', function (event, releaseNotes, releaseName, releaseDate, updateUrl, quitAndUpdate) {
    ipc.on('isUpdateNow', (e, arg) => {
      // console.warn('开始更新')
      autoUpdater.quitAndInstall()
      mainWindow.destroy()
      // callback()
    })
    mainWindow.webContents.send('isUpdateNow')
  })
  ipc.on('checkForUpdate', () => {
    // 执行自动更新检查
    // console.warn('执行自动更新检查')
    // console.warn(__dirname)
    autoUpdater.checkForUpdates()
  })
  ipc.on('downloadUpdate', () => {
    // 下载
    // console.warn('开始下载')
    autoUpdater.downloadUpdate()
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await mainWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) mainWindow.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    mainWindow.loadURL('app://./index.html')
  }

}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    loadingWindow = null;
    mainWindow = null;
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  initTimeStamp = new Date().valueOf()
  screenWidth = screen.getPrimaryDisplay().workAreaSize.width;
  screenHeight = screen.getPrimaryDisplay().workAreaSize.height;
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    // try {
    //   await installExtension(VUEJS_DEVTOOLS)
    // } catch (e) {
    //   console.error('Vue Devtools failed to install:', e.toString())
    // }
  }
  // await createLoadingWindow()
  await createMainWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        loadingWindow = null;
        mainWindow = null;
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      loadingWindow = null;
      mainWindow = null;
      app.quit()
    })
  }
}
