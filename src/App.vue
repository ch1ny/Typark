<template>
	<div class="App">
		<header class="head">
			<img src='./assets/logo.png' alt=" " id="windowLogo" />
			<span>Typark{{filePath?' - ' + filePath.split("/")[filePath.split("/").length - 1]:''}}</span>
			<button class="windowBtn" id="closeWindowBtn" @click="closeWindow">
				<i class="el-icon-close" />
			</button>
			<button class="windowBtn" id="resizeBtn" @click="resizeWindow">
				<i :class="maxSize?'el-icon-copy-document':'el-icon-full-screen'" />
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
					<el-dropdown-item command="save" :disabled="rawText===''">另存为</el-dropdown-item>
					<el-dropdown-item command="html" :disabled="rawText===''">导出为HTML</el-dropdown-item>
					<el-dropdown-item command="pdf" :disabled="rawText===''">导出为PDF</el-dropdown-item>
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
		<div class="main" v-loading="outputing" element-loading-text="拼命导出中" element-loading-spinner="el-icon-loading" element-loading-background="rgba(0, 0, 0, 0.8)">
			<mavon-editor style="height: 100%" :subfield="subfield" defaultOpen="preview" :toolbars="markdownOption" v-model="rawText" @save="save" ref="md" />
		</div>
	</div>
</template>

<script>
import Html2Canvas from "html2canvas";
import JsPdf from "jspdf";

export default {
	name: "App",
	components: {},
	data() {
		return {
			outputing: false, // 正在导出
			maxSize: false,
			rawText: "",
			filePath: "",
			subfield: true,
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
				htmlcode: false, // 展示html源码
				help: true, // 帮助
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
			window.close();
		},
		minWindow() {
			window.electron.ipcRenderer.send("min");
		},
		resizeWindow() {
			window.electron.ipcRenderer.send("max");
		},
		fileCommand(command) {
			switch (command) {
				case "open": {
					window.electron.ipcRenderer.send("openFile");
					break;
				}
				case "save": {
					if (this.rawText) {
						window.electron.ipcRenderer.send(
							"saveNewFile",
							this.rawText
						);
					}
					break;
				}
				case "html": {
					this.outputing = true;
					window.electron.ipcRenderer.send(
						"saveAsHtml",
						this.$refs.md.d_render
					);
					break;
				}
				case "pdf": {
					this.outputing = true;
					let dom = document.querySelector(".v-show-content");
					let cloneDom = dom.cloneNode(true);
					// 设置克隆节点的style属性，因为之前的层级为0，我们只需要比被克隆的节点层级低即可。
					cloneDom.style.height = dom.offsetHeight + "px";
					cloneDom.style.zIndex = "-1";
					// 将克隆节点动态追加到body后面。
					let vNoteWrapper = document.createElement("div");
					vNoteWrapper.className = "v-note-wrapper markdown-body";
					vNoteWrapper.append(cloneDom);
					document.querySelector("body").append(vNoteWrapper);
					Html2Canvas(vNoteWrapper, {
						// allowTaint: true,
						useCORS: true,
						scale: 4,
						backgroundColor: "rgb(251, 251, 251)",
						height: vNoteWrapper.scrollHeight,
					})
						.then((canvas) => {
							// 移除复制的节点
							document
								.querySelector("body")
								.removeChild(vNoteWrapper);
							let contentWidth = canvas.width;
							let contentHeight = canvas.height;
							let pageHeight = (contentWidth / 592.28) * 841.89;
							let leftHeight = contentHeight;
							let position = 0;
							let imgWidth = 595.28;
							let imgHeight =
								(592.28 / contentWidth) * contentHeight;
							let pageData = canvas.toDataURL("image/jpeg", 1.0);
							let PDF = new JsPdf("", "pt", "a4");
							if (leftHeight < pageHeight) {
								PDF.addImage(
									pageData,
									"JPEG",
									0,
									0,
									imgWidth,
									imgHeight
								);
							} else {
								while (leftHeight > 0) {
									PDF.addImage(
										pageData,
										"JPEG",
										0,
										position,
										imgWidth,
										imgHeight
									);
									leftHeight -= pageHeight;
									position -= 841.89;
									if (leftHeight > 0) {
										PDF.addPage();
									}
								}
							}
							let pdfName;
							if (this.filePath) {
								pdfName =
									this.filePath.split("\\")[
										this.filePath.split("\\").length - 1
									];
							} else {
								pdfName = this.$refs.md.d_render
									.replace(/(<([^>]+)>)/g, "")
									.substring(0, 10);
							}
							this.outputing = false;
							PDF.save(`${pdfName}.pdf`);
						})
						.catch(() => {
							this.subfield = true;
						});
					break;
				}
			}
		},
		helpCommand(command) {
			switch (command) {
				case "official": {
					window.electron.ipcRenderer.send("openOfficial");
					break;
				}
				case "update": {
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
									message: `更新检测失败 ( -${response.status} )`,
									type: "error",
									offset: 10,
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
					offset: 10,
				});
			} else {
				this.$notify({
					title: "失败",
					message: "保存失败",
					type: "error",
					offset: 10,
				});
			}
		});
		window.electron.ipcRenderer.on("savedNewFile", (e, status, path) => {
			if (status === 0) {
				this.filePath = path;
			}
		});
		window.electron.ipcRenderer.on("savedAsHtml", (e, status) => {
			this.outputing = false;
			if (status === 0) {
				this.$notify({
					title: "成功",
					duration: 1000,
					message: "导出成功",
					type: "success",
					offset: 10,
				});
			} else {
				this.$notify({
					title: "失败",
					message: "导出失败",
					type: "error",
					offset: 10,
				});
			}
		});
		window.electron.ipcRenderer.on(
			"hasNewVersion",
			(e, oldVersion, newVersion, downloadUrl) => {
				let oldVersions = oldVersion.split(".");
				let newVersions = newVersion.split(".");
				let hasNewVersion = true;
				for (
					let i = 0;
					i < Math.min(oldVersions.length, newVersions.length);
					i++
				) {
					if (parseInt(newVersions[i]) < parseInt(oldVersions[i])) {
						hasNewVersion = false;
						break;
					}
				}
				if (hasNewVersion && newVersions.length <= oldVersions.length) {
					hasNewVersion = false;
				}
				if (hasNewVersion) {
					this.$confirm(
						`当前版本为${oldVersion}，检测到新版本${newVersion}，是否更新？`,
						"检测到新版本",
						{
							confirmButtonText: "更新",
							cancelButtonText: "取消",
							type: "warning",
						}
					)
						.then(() => {
							window.location.href = downloadUrl;
						})
						.catch(() => {});
				} else {
					this.$notify({
						title: "无需更新",
						duration: 1500,
						message: `当前${oldVersion}已是最新版本`,
						type: "success",
						offset: 10,
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
	background-image: linear-gradient(to right, #c3cfe2 0%, #f5f7fa 60%);
	user-select: none;
}

.head img {
	-webkit-user-drag: none;
}

.windowBtn {
	-webkit-app-region: no-drag;
	float: right;
	height: 2.25em;
	width: 3em;
	line-height: 2.5em;
	border: none;
	background: rgba(0, 0, 0, 0);
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
	user-select: none;
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
