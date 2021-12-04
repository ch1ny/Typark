# Typark

## 前言

很难过，Typora 居然收费了。

其实收费也不算什么事，支持正版就是了。

但是我没有美国的信用卡。

自己写了一个简单的 Markdown 编辑器，凑合凑合也能用倒是。

## 更新

* 2021/11/29 **v0.1.0-alpha**：

  * 支持基本的 Markdown 文件的读写功能
  * 实现导出 Html 文件功能
* 2021/11/30 **v0.1.2-alpha**：

  * 修复上一代版本退出时的报错 bug
  * 修复初代版本保存文件用错 API 的 bug

  * 完善导出 Html 文件功能 （增加代码块样式导出）
  * 加入更新监测机制（**该功能尚不完善，用户需手动检测更新下载新版本安装包，并手动进行安装，在后续版本中将会完善更新机制**）
* 2021/12/01 **v0.2.0-alpha**：
  * 修复应用名称错误的 bug
  * 尝试性加入导出为 PDF 文件的功能（**该功能尚不完善，仍在测试中**）
  * 修改部分 UI 外观样式
  * 修改版本比对逻辑
* 2021/12/02 **v0.2.1-alpha**：
  * 已完美修复前代版本未使用退出按钮退出程序后的报错问题
* 2021/12/03 **v0.3.0-alpha**：
  * 完善软件更新机制
* 2021/12/04 **v0.3.1-alpha**：
  * 现在可以对任意 Markdown 文件右键，选择打开方式，通过 **Typark** 打开
  * 完善图片上传机制，支持本地图片及复制粘贴的图片

    >非常感谢 **mavon-editor** 项目的开发者给予的帮助

* 2021/12/04 **v0.3.2-alpha**：
  * 加入加载动画，减少启动时过长时间展示白屏带来的不适感（**在我的电脑上安装后首次启动画面会卡住，切换窗口让显卡重绘一次就恢复正常，再次启动不会有这种情况，目前还不清楚是什么原因，不过不影响使用**）
  * 修复导出文件时文件名错误的问题
  * 修复用户在中止导出为 HTML 文件后无法关闭模态屏的 bug