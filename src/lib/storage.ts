export type StorageObject = {
  key: string;
  contentType: string;
  size: number;
};

export interface StorageProvider {
  createUploadUrl(object: StorageObject): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

export class UnconfiguredStorageProvider implements StorageProvider {
  async createUploadUrl(): Promise<string> {
    throw new Error("Object storage is not configured. Set a production storage provider before accepting uploads.");
  }

  async deleteObject(): Promise<void> {
    throw new Error("Object storage is not configured.");
  }
}

export const storage: StorageProvider = new UnconfiguredStorageProvider();
