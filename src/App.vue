<template>
	<div class="App">
		<header class="head">
			<img src='./assets/logo.png' alt=" " id="windowLogo" />
			<span>Typark{{filePath?' - ' + filePath.split("/")[filePath.split("/").length - 1]:''}}</span>
			<button class="windowBtn" id="closeWindowBtn" @click="closeWindow">
				<i class="el-icon-close" />
			</button>
			<button class="windowBtn" id="resizeBtn" @click="resizeWindow">
				<i class="el-icon-copy-document" />
			</button>
			<button class="windowBtn" id="miniSizeBtn" @click="minWindow">
				<i class="el-icon-minus" />
			</button>
		</header>
		<div class="toolbars">
			<el-dropdown size="mini" trigger="click" placement="bottom-start" @command="fileCommand">
				<button>文件(F)</button>
				<el-dropdown-menu slot="dropdown">
					<el-dropdown-item command="open">打开</el-dropdown-item>
					<el-dropdown-item command="save">另存为</el-dropdown-item>
					<el-dropdown-item command="html">导出为HTML</el-dropdown-item>
				</el-dropdown-menu>
			</el-dropdown>
			<el-dropdown size="mini" trigger="click" placement="bottom-start" @command="helpCommand">
				<button>帮助(H)</button>
				<el-dropdown-menu slot="dropdown">
					<el-dropdown-item command="official">访问官网</el-dropdown-item>
					<el-dropdown-item command="update">检查更新</el-dropdown-item>
				</el-dropdown-menu>
			</el-dropdown>
		</div>
		<div class="main">
			<mavon-editor style="height: 100%" :toolbars="markdownOption" v-model="rawText" @save="save" ref="md" />
		</div>
	</div>
</template>

<script>
export default {
	name: "App",
	components: {},
	data() {
		return {
			maxSize: false,
			rawText: "",
			filePath: "",
			markdownOption: {
				bold: true, // 粗体
				italic: true, // 斜体
				header: true, // 标题
				underline: true, // 下划线
				strikethrough: true, // 中划线
				mark: true, // 标记
				superscript: true, // 上角标
				subscript: true, // 下角标
				quote: true, // 引用
				ol: true, // 有序列表
				ul: true, // 无序列表
				link: true, // 链接
				imagelink: false, // 图片链接
				code: true, // code
				table: true, // 表格
				fullscreen: false, // 全屏编辑
				readmodel: false, // 沉浸式阅读
				htmlcode: true, // 展示html源码
				help: false, // 帮助
				/* 1.3.5 */
				undo: true, // 上一步
				redo: true, // 下一步
				trash: true, // 清空
				save: true, // 保存（触发events中的save事件）
				/* 1.4.2 */
				navigation: true, // 导航目录
				/* 2.1.8 */
				alignleft: true, // 左对齐
				aligncenter: true, // 居中
				alignright: true, // 右对齐
				/* 2.2.1 */
				subfield: false, // 单双栏模式
				preview: false, // 预览
			},
		};
	},
	methods: {
		closeWindow() {
			window.electron.ipcRenderer.send("quit");
		},
		minWindow() {
			window.electron.ipcRenderer.send("min");
		},
		resizeWindow() {
			window.electron.ipcRenderer.send("max");
		},
		fileCommand(command) {
			switch (command) {
				case "open":
					window.electron.ipcRenderer.send("openFile");
					break;
				case "save":
					if (this.rawText) {
						window.electron.ipcRenderer.send(
							"saveNewFile",
							this.rawText
						);
					}
					break;
				case "html":
					window.electron.ipcRenderer.send(
						"saveAsHtml",
						this.$refs.md.d_render
					);
					break;
			}
		},
		helpCommand(command) {
			switch (command) {
				case "official":
					window.electron.ipcRenderer.send("openOfficial");
					break;
				case "update":
					fetch(
						"https://api.github.com/repos/AioliaRegulus/Typark/releases",
						{
							method: "GET",
							mode: "cors",
						}
					)
						.then((response) => {
							if (response.status === 200) {
								return response.json();
							} else {
								this.$notify({
									title: "失败",
									message: "检查更新失败",
									type: "error",
								});
							}
						})
						.then((res) => {
							const tag = res[0].tag_name;
							let index = tag.indexOf("-");
							let version = tag.substring(
								1,
								index > 1 ? index : tag.length
							);
							window.electron.ipcRenderer.send(
								"getNewVersion",
								version,
								res[0].assets[0].browser_download_url
							);
						});
					break;
			}
		},
		save() {
			/**
			 * value: 原生 md 文本
			 * render: 渲染后的 html 源代码
			 */
			if (this.filePath) {
				window.electron.ipcRenderer.send(
					"saveFile",
					this.filePath,
					this.rawText
				);
			} else if (this.rawText) {
				window.electron.ipcRenderer.send("saveNewFile", this.rawText);
			}
		},
	},
	created() {
		window.electron.ipcRenderer.on("resize", (event, params) => {
			this.maxSize = params;
		});
		window.electron.ipcRenderer.on(
			"openedFile",
			(e, status, path, data) => {
				if (status === 0) {
					this.filePath = path;
					this.rawText = data;
				} else {
					console.log("读取失败");
				}
			}
		);
		window.electron.ipcRenderer.on("savedFile", (e, status) => {
			if (status === 0) {
				this.$notify({
					title: "成功",
					duration: 1000,
					message: "保存成功",
					type: "success",
					showClose: false,
				});
			} else {
				this.$notify({
					title: "失败",
					message: "保存失败",
					type: "error",
					showClose: false,
				});
			}
		});
		window.electron.ipcRenderer.on("savedNewFile", (e, status, path) => {
			if (status === 0) {
				this.filePath = path;
			}
		});
		window.electron.ipcRenderer.on("savedAsHtml", (e, status) => {
			if (status === 0) {
				this.$notify({
					title: "成功",
					duration: 1000,
					message: "导出成功",
					type: "success",
					showClose: false,
				});
			} else {
				this.$notify({
					title: "失败",
					message: "导出失败",
					type: "error",
					showClose: false,
				});
			}
		});
		window.electron.ipcRenderer.on(
			"hasNewVersion",
			(e, oldVersion, newVersion, downloadUrl) => {
				if (oldVersion !== newVersion) {
					this.$confirm(
						`当前版本为${oldVersion}，检测到新版本${newVersion}，是否更新？`,
						"检测到新版本",
						{
							confirmButtonText: "更新",
							cancelButtonText: "取消",
							type: "warning",
						}
					).then(() => {
						window.location.href = downloadUrl;
					});
				}
			}
		);
	},
};
</script>

<style>
* {
	margin: 0%;
}

#app {
	width: 100vw;
	height: 100vh;
	overflow: hidden;
}

#windowLogo {
	width: 2.5em;
	height: 2.5em;
	vertical-align: top;
}

::-webkit-scrollbar {
	width: 6px;
}

::-webkit-scrollbar-thumb {
	background-color: #a8a8a8;
	border-radius: 3px;
}

.head {
	-webkit-app-region: drag;
	width: 100vw;
	font-size: 12px;
	height: 2.5em;
	line-height: 2.5em;
	background-color: #fafafa;
	user-select: none;
}

.head img {
	-webkit-user-drag: none;
}

.windowBtn {
	-webkit-app-region: no-drag;
	float: right;
	height: 2.5em;
	width: 3em;
	line-height: 2.5em;
	border: none;
	background-color: #fafafa;
}

.windowBtn:hover {
	cursor: pointer;
}

#miniSizeBtn:hover {
	background-color: #e0e0e0;
}

#resizeBtn:hover {
	background-color: #00a2ff;
	color: white;
}

#closeWindowBtn:hover {
	background-color: red;
	color: white;
}

.toolbars {
	height: 1.5em;
}

.toolbars button {
	height: 1.5em;
	border: none;
}

.toolbars button:hover {
	background: #e0e0e0;
}

.main {
	-webkit-app-region: no-drag;
	width: 100vw;
	height: calc(100vh - 4em);
	overflow-x: hidden;
	overflow-y: overlay;
}
</style>
