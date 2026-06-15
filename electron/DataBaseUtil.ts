import path from "node:path";
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {createRequire} from "module";
import {BookType} from "../@types";
const require = createRequire(import.meta.url);
const sqlite3 = require("sqlite3").verbose();

const TABLE = "readerbook";
const isEmpty = (v: any) => {
  return v === undefined || v === null || v === "";
};
class DataBaseUtil {
  db: any;
  init() {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
    const dbFolder = VITE_DEV_SERVER_URL ? path.join(__dirname, "../db/") : path.join(process.env.APP_ROOT, "db/");
    if (!fs.existsSync(dbFolder)) {
      fs.mkdirSync(dbFolder);
    }
    const dbPath = VITE_DEV_SERVER_URL
      ? path.join(__dirname, "../db/readerbook.db")
      : path.join(process.env.APP_ROOT, "db/readerbook.db");
    this.db = new sqlite3.Database(dbPath);
    this.db.exec(`CREATE TABLE IF NOT EXISTS ${TABLE} (
    fileName TEXT NOT NULL,
    filePath TEXT NOT NULL,
    totalChapter INT,  
    pageIndex INT,
    currentChapter INT,
    textNum INT,
    updateTime INT,
    fileSize INT NOT NULL,
    regexType INT,
    regexStr TEXT,
    encodeStr TEXT,
    pinyinStr TEXT NOT NULL
  )`);
  }
  insert(data: Partial<BookType>) {
    return new Promise((resolve, reject) => {
      const keys: string[] = [];
      const values: any[] = [];
      for (const k in data) {
        const v = data[k as keyof typeof data];
        if (!isEmpty(v)) {
          keys.push(k);
          values.push(v);
        }
      }
      const insert = `INSERT INTO ${TABLE} (${keys.join(",")}) VALUES (${keys.map((a) => "?").join(",")})`;

      this.db.run(insert, values, (err: any) => {
        if (err) {
          reject(err);
        }
        resolve(true);
      });
    });
  }
  update(data: Partial<BookType>) {
    return new Promise((resolve, reject) => {
      const keys: string[] = [];
      const values: any[] = [];
      for (const k in data) {
        if (k === "filePath") continue;
        const v = data[k as keyof typeof data];
        if (!isEmpty(v)) {
          keys.push(k);
          values.push(v);
        }
      }
      values.push(data.filePath);
      const update = `UPDATE ${TABLE} SET ${keys.map((a) => `${a} = ?`)} WHERE filePath = ?`;
      this.db.run(update, values, (err: any) => {
        if (err) {
          reject(err);
        }
        resolve(true);
      });
    });
  }
  delete(filePath: string) {
    return new Promise((resolve, reject) => {
      const del = `DELETE FROM ${TABLE} WHERE filePath = ?`;
      this.db.run(del, [filePath], (err: any) => {
        if (err) {
          reject(err);
        }
        resolve(true);
      });
    });
  }
  clear() {
    return new Promise((resolve, reject) => {
      const del = `DELETE FROM ${TABLE}`;
      this.db.run(del, [], (err: any) => {
        if (err) {
          reject(err);
        }
        resolve(true);
      });
    });
  }
  getList() {
    return new Promise<BookType[]>((resolve, reject) => {
      const query = `SELECT * FROM ${TABLE}`;
      this.db.all(query, [], (err: any, rows: any[]) => {
        if (err) {
          reject(err);
        }
        resolve(rows as any[]);
      });
    });
  }
  getItem(filePath: string) {
    return new Promise<BookType>((resolve, reject) => {
      const query = `SELECT * FROM ${TABLE} WHERE filePath=?`;
      this.db.get(query, [filePath], (err: any, row: any) => {
        if (err) {
          reject(err);
        }
        resolve(row);
      });
    });
  }
  close() {
    this.db.close((err: any) => {
      if (err) console.error(err.message);
      console.log("数据库连接已关闭");
    });
  }
}

export const dataBaseUtil = new DataBaseUtil();
