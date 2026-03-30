import fs from 'fs';
import path from 'path';

export function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function writeJson(filePath: string, data: unknown) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function writeText(filePath: string, data: string) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, data, 'utf-8');
}
