export interface AssetStorage {
  save(path: string, data: Buffer, mimeType: string): Promise<string>;
  read(path: string): Promise<Buffer>;
  getUrl(path: string): string;
  exists(path: string): Promise<boolean>;
}
