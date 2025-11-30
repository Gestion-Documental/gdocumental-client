export interface StoredFile {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface IFileStorage {
  save(params: { buffer: Buffer; filename: string; contentType: string }): Promise<StoredFile>;
  delete(key: string): Promise<void>;
  getUrl(key: string): Promise<string>;
}
