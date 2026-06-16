import {app, dialog} from "electron";
import axios from "axios";

import fs from "node:fs";
import path from "node:path";
import packageJSON from "../package.json";
import {spawn} from "node:child_process";

class UpdateUtil {
  version = "";
  url = "";
  folder = "";
  logFile: any;
  installerPath = "";
  win: any;
  size = 0;
  log(msg: string) {
    console.log(msg);
    this.logFile.write(msg + "\n");
  }
  downloadFile() {
    return new Promise(async (resolve, reject) => {
      this.log(`开始下载`);
      const fileStream = fs.createWriteStream(this.installerPath);
      let downloadedSize = 0;
      try {
        const downloadRes = await axios({
          method: "get",
          url: this.url,
          responseType: "stream",
          headers: {"Cache-Control": "no-cache"}
        });

        downloadRes.data.on("data", (chunk: any) => {
          downloadedSize += chunk.length;

          // this.log("chunkSize" + chunk.length);
          this.win.webContents.send("downloadProcess", Math.round((downloadedSize / this.size) * 100));
        });
        fileStream.on("finish", () => {
          fileStream.close();
          this.log("下载完成");
          resolve(this.installerPath);
        });
        fileStream.on("error", (err) => {
          this.log("download error" + (err?.message || ""));
          dialog.showMessageBox({
            type: "error",
            title: "下载失败",
            message: `下载安装包异常: ${err?.message}`
          });
          fs.unlink(this.installerPath, () => {}); // 出错时清理残缺文件
          reject(err);
        });
        downloadRes.data.pipe(fileStream);
      } catch (err: any) {
        this.log("download error" + (err?.message || ""));
        dialog.showMessageBox({
          type: "error",
          title: "下载失败",
          message: `下载安装包异常: ${err?.message}`
        });
      }
    });
  }
  runInstall() {
    this.log("开始安装");
    const installer = spawn(this.installerPath, [], {
      detached: true, // 分离子进程，允许父进程（Node）继续运行
      stdio: "ignore" // 忽略标准输入输出，防止挂起
    });

    // 监听安装程序的退出事件
    installer.on("exit", (code: number) => {
      this.log("安装完成");
      if (code === 0) {
        // 返回码为 0 通常表示安装成功
        fs.unlink(this.installerPath, (err) => {
          if (!err) {
            this.log("安装成功，文件已删除");
          }
        });
      } else {
        this.log(`安装程序异常退出，返回码: ${code}`);
        dialog.showMessageBox({
          type: "error",
          title: "安装异常",
          message: `安装程序异常退出，返回码: ${code}`
        });
      }
    });
    installer.on("error", (err) => {
      this.log(err.message || "");
      dialog.showMessageBox({
        type: "error",
        title: "安装异常",
        message: err.message || "安装异常"
      });
    });

    // 允许父进程不等待子进程即可退出
    installer.unref();
  }
  close() {
    if (this.logFile) {
      this.logFile.close();
    }
  }
  async init(win: any) {
    this.win = win;
    const folder = path.join(app.getPath("appData"), packageJSON.name + "/download/");
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }
    this.folder = folder;
    const d = new Date();
    const logPath = path.join(folder, `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}.log`);
    this.logFile = fs.createWriteStream(logPath, {flags: "a"});

    try {
      const res = await fetch(import.meta.env.VITE_LATEST_DOWNLOAD).then((res) => res.json());
      if (res.version !== packageJSON.version) {
        this.size = res.size;
        this.version = res.version;
        this.log(this.version);
        this.url = res.url;
        this.log(this.url);
        dialog
          .showMessageBox({
            type: "info",
            title: "更新提示",
            message: "发现新版,是否立即下载?",
            buttons: ["确定", "关闭"]
          })
          .then(async (buttonIndex) => {
            if (buttonIndex.response === 0) {
              const fileName = this.url.substring(this.url.lastIndexOf("/") + 1);
              this.installerPath = path.join(folder, fileName);
              this.log(this.installerPath);
              if (fs.existsSync(this.installerPath)) {
                const size = fs.statSync(this.installerPath).size;
                this.log("current size" + size);
                if (this.size === size) {
                  this.log("已经下载安装包");
                } else {
                  await this.downloadFile();
                }
              } else {
                await this.downloadFile();
              }

              dialog
                .showMessageBox({
                  type: "info",
                  title: "提示",
                  message: "下载完毕，是否立即安装?",
                  buttons: ["确定", "关闭"]
                })
                .then((btnIdx) => {
                  if (btnIdx.response === 0) {
                    this.runInstall();
                    app.quit();
                    this.close();
                  }
                });
            }
          });
      } else {
        dialog.showMessageBox({type: "info", title: "提示", message: "已经是最新版本?"});
      }
    } catch (error: any) {
      dialog.showMessageBox({
        type: "info",
        title: "提示",
        message: "获取版本信息失败"
      });
      this.log("download error:" + error?.message || "");
    }
  }
}

export const updateUtil = new UpdateUtil();
