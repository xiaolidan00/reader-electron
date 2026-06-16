import {app, dialog} from "electron";
import http from "node:http";
import {pipeline} from "node:stream";
import fs from "node:fs";
import path from "node:path";
import packageJSON from "../package.json";
import {spawn} from "node:child_process";

function downloadFile(url: string, filePath: string) {
  return new Promise((resolve, reject) => {
    // 检查本地已下载的大小
    const start = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
    const options = start > 0 ? {headers: {Range: `bytes=${start}-`}} : {};

    http.get(url, options, (response) => {
      // 以追加模式 ('a') 创建写入流
      const fileStream = fs.createWriteStream(filePath, {flags: "a"});

      pipeline(response, fileStream, (err) => {
        if (err) {
          console.log("download error", err);
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  });
}
function runInstall(installerPath: string) {
  const installer = spawn(installerPath, [], {
    detached: true, // 分离子进程，允许父进程（Node）继续运行
    stdio: "ignore" // 忽略标准输入输出，防止挂起
  });

  // 监听安装程序的退出事件
  installer.on("exit", (code: number) => {
    if (code === 0) {
      // 返回码为 0 通常表示安装成功
      fs.unlink(installerPath, (err) => {
        if (!err) console.log("安装成功，文件已删除");
      });
    } else {
      console.warn(`安装程序异常退出，返回码: ${code}`);
    }
  });

  // 允许父进程不等待子进程即可退出
  installer.unref();
}

export const initUpdate = async () => {
  const res = await fetch(import.meta.env.VITE_LATEST_DOWNLOAD).then((res) => res.json());
  if (res.version !== packageJSON.version) {
    dialog
      .showMessageBox({
        type: "info",
        title: "更新提示",
        message: "发现新版,是否立即下载?",
        buttons: ["确定", "关闭"]
      })
      .then(async (buttonIndex) => {
        if (buttonIndex.response === 0) {
          const folder = path.join(app.getPath("appData"), packageJSON.name + "/download/");
          if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder);
          }
          const url = res.url;
          const fileName = url.substring(url.lastIndexOf("/") + 1);
          const installerPath = path.join(folder, fileName);
          downloadFile(url, installerPath).then(() => {
            dialog
              .showMessageBox({
                title: "提示",
                message: "下载完毕，是否立即安装?",
                buttons: ["确定", "关闭"]
              })
              .then((btnIdx) => {
                if (btnIdx.response === 0) {
                  runInstall(installerPath);

                  app.quit();
                }
              });
          });
        }
      });
  }
};
