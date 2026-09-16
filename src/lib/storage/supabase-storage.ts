import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

export interface StorageClient {
  uploadObject(storagePath: string, buffer: Buffer, mimeType: string): Promise<void>;
  deleteObject(storagePath: string): Promise<void>;
  createSignedDownloadUrl(storagePath: string, expiresInSeconds?: number): Promise<string>;
  hasObject(storagePath: string): Promise<boolean>;
}

class SupabaseStorageClient implements StorageClient {
  private client: SupabaseClient;
  private bucket: string;

  constructor(url: string, serviceRoleKey: string, bucket: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    this.bucket = bucket;
  }

  async uploadObject(storagePath: string, buffer: Buffer, mimeType: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload to Supabase storage: ${error.message}`);
    }
  }

  async deleteObject(storagePath: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([storagePath]);

    if (error) {
      throw new Error(`Failed to delete from Supabase storage: ${error.message}`);
    }
  }

  async createSignedDownloadUrl(storagePath: string, expiresInSeconds: number = 900): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to generate signed download URL: ${error?.message || 'Unknown error'}`);
    }

    return data.signedUrl;
  }

  async hasObject(storagePath: string): Promise<boolean> {
    const dir = path.dirname(storagePath);
    const fileName = path.basename(storagePath);
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .list(dir === '.' ? '' : dir, { search: fileName });

    if (error || !data) return false;
    return data.some((item) => item.name === fileName);
  }
}

class LocalFilesystemStorageClient implements StorageClient {
  private baseDir: string;

  constructor(bucket: string) {
    this.baseDir = path.join(process.cwd(), '.storage', bucket);
  }

  private getFullPath(storagePath: string): string {
    const safePath = path.normalize(storagePath).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.baseDir, safePath);
  }

  async uploadObject(storagePath: string, buffer: Buffer, _mimeType: string): Promise<void> {
    void _mimeType;
    const fullPath = this.getFullPath(storagePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
  }

  async deleteObject(storagePath: string): Promise<void> {
    const fullPath = this.getFullPath(storagePath);
    try {
      await fs.unlink(fullPath);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== 'ENOENT') {
        throw new Error(`Failed to delete file from local storage: ${(err as Error).message}`);
      }
    }
  }

  async createSignedDownloadUrl(storagePath: string, expiresInSeconds: number = 900): Promise<string> {
    const fullPath = this.getFullPath(storagePath);
    try {
      await fs.access(fullPath);
    } catch {
      throw new Error('Object not found in local storage.');
    }

    const expiresAt = Date.now() + expiresInSeconds * 1000;
    return `/api/evidence-attachments/download?path=${encodeURIComponent(storagePath)}&expires=${expiresAt}`;
  }

  async hasObject(storagePath: string): Promise<boolean> {
    const fullPath = this.getFullPath(storagePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

let storageClientInstance: StorageClient | null = null;

export function getStorageClient(): StorageClient {
  if (typeof window !== 'undefined') {
    throw new Error('Storage client cannot be instantiated or used on the client side.');
  }

  if (!storageClientInstance) {
    const isProduction = process.env.NODE_ENV === 'production';
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_EVIDENCE_BUCKET;

    if (isProduction) {
      const missing: string[] = [];
      if (!supabaseUrl || !supabaseUrl.startsWith('http')) missing.push('SUPABASE_URL');
      if (!supabaseKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
      if (!bucket) missing.push('SUPABASE_EVIDENCE_BUCKET');

      if (missing.length > 0) {
        throw new Error(
          `Production storage configuration error: Missing required environment variable(s) for Supabase Storage: ${missing.join(
            ', '
          )}. Local filesystem storage is strictly prohibited in production.`
        );
      }

      storageClientInstance = new SupabaseStorageClient(supabaseUrl!, supabaseKey!, bucket!);
    } else {
      const activeBucket = bucket || 'assessment-evidence';
      if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
        storageClientInstance = new SupabaseStorageClient(supabaseUrl, supabaseKey, activeBucket);
      } else {
        storageClientInstance = new LocalFilesystemStorageClient(activeBucket);
      }
    }
  }

  return storageClientInstance;
}

export function _resetStorageClientForTesting(): void {
  storageClientInstance = null;
}

