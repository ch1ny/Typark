const { app, BrowserWindow, screen, dialog, shell } = require('electron');
const fs = require('fs') // 使用fs模块
const path = require('path');
let mainWindow = null;
//判断命令行脚本的第二参数是否含--debug
const debug = /--debug/.test(process.argv[2]);
function makeSingleInstance() {
    if (process.mas) return;
    app.requestSingleInstanceLock();
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()
        }
    })
}
function createWindow() {
    const screenWidth = screen.getPrimaryDisplay().workAreaSize.width;
    const screenHeight = screen.getPrimaryDisplay().workAreaSize.height;
    const windowOptions = {
        width: parseInt(screenWidth * 0.8),
        height: parseInt(screenHeight * 0.8),
        frame: false, // 是否使用默认窗口
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // 禁用上下文隔离
            preload: path.join(__dirname, 'preload.js')
        }
    };
    mainWindow = new BrowserWindow(windowOptions);
    // mainWindow.loadURL("http://localhost:8080/");
    mainWindow.loadURL(path.join('file://', __dirname, '/dist/index.html'));
    //接收渲染进程的信息
    const ipc = require('electron').ipcMain;
    ipc.on('min', function () {
        mainWindow.minimize();
    });
    ipc.on('max', function () {
        if (mainWindow.isMaximized()) {
            mainWindow.restore();
        } else {
            mainWindow.maximize();
        }
    });
    ipc.on("quit", function () {
        app.exit();
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
        dialog.showOpenDialog({
            title: "文件另存为",
            defaultPath: __dirname,
            properties: ['promptToCreate'],
            filters: [
                { name: 'Markdown File', extensions: ['md', 'markdown', 'mmd', 'mkd', 'mdwn', 'mdown', 'mdx', 'mdtxt', 'apib', 'rmarkdown', 'rmd', 'txt', 'text'] }
            ],
        }).then((res) => {
            if (res && res.filePaths && res.filePaths.length > 0) {
                fs.writeFile(res.filePaths[0], data, "utf8", (err) => {
                    if (err) {
                        mainWindow.webContents.send('savedNewFile', -1);
                    } else {
                        mainWindow.webContents.send('savedNewFile', 0, res.filePaths[0]);
                    }
                })
            }
        })
    })
    ipc.on('saveAsHtml', (event, data) => {
        dialog.showOpenDialog({
            title: "导出为HTML",
            defaultPath: __dirname,
            properties: ['promptToCreate'],
            filters: [
                { name: 'HTML', extensions: ['html'] }
            ],
        }).then((res) => {
            if (res && res.filePaths && res.filePaths.length > 0) {
                const title = res.filePaths[0].split('/')[res.filePaths[0].split('/').length - 1]
                let html = `<!doctype html>\n<html>\n<head>\n<meta charset='UTF-8'><meta name='viewport' content='width=device-width initial-scale=1'>\n<link href="https://cdn.bootcss.com/github-markdown-css/2.10.0/github-markdown.min.css" rel="stylesheet">\n<title>${title}</title>\n</head>\n<body>\n<div class="markdown-body">\n${data}\n</div>\n</body>\n</html>`
                fs.writeFile(res.filePaths[0], html, "utf8", (err) => {
                    if (err) {
                        mainWindow.webContents.send('savedAsHtml', -1);
                    } else {
                        mainWindow.webContents.send('savedAsHtml', 0);
                    }
                })
            }
        })
    })
    ipc.on('openOfficial', () => {
        shell.openExternal('https://gitee.com/aioliaregulus/typark')
    })
    mainWindow.on('resize', () => {
        mainWindow.webContents.send('resize', mainWindow.isMaximized())
    })
    mainWindow.on('closed', () => {
        mainWindow = null
    })

    //如果是--debug 打开开发者工具，窗口最大化，
    if (debug) {
        mainWindow.webContents.openDevTools();
        // require('devtron').install();
    }

}
makeSingleInstance();
//app主进程的事件和方法
app.on('ready', () => {
    createWindow();
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});
app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
module.exports = mainWindow;