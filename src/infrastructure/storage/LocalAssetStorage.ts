import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join } from "node:path";
import type { AssetStorage } from "../../domain/providers/AssetStorage";

export class LocalAssetStorage implements AssetStorage {
  constructor(private readonly basePath: string) {}

  async save(path: string, data: Buffer, _mimeType: string): Promise<string> {
    const fullPath = join(this.basePath, path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, data);
    return path;
  }

  async read(path: string): Promise<Buffer> {
    const fullPath = join(this.basePath, path);
    return readFile(fullPath);
  }

  getUrl(path: string): string {
    return `/assets/${path}`;
  }

  async exists(path: string): Promise<boolean> {
    const fullPath = join(this.basePath, path);
    try {
      await access(fullPath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}
