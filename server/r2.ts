/**
 * Cloudflare R2 (S3-compatible) storage for 3D models. Objects are served publicly from
 * R2_PUBLIC_URL (a custom domain on the bucket, cached by Cloudflare's CDN).
 */
import { AwsClient } from 'aws4fetch';

export const r2Enabled = () =>
  !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET);

let client: AwsClient | null = null;
function endpoint(key: string) {
  if (!r2Enabled()) throw new Error('R2 is not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET)');
  client ??= new AwsClient({ accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!, service: 's3', region: 'auto' });
  return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export async function putObject(key: string, body: Uint8Array, contentType: string, cacheControl: string) {
  const url = endpoint(key);
  const res = await client!.fetch(url, { method: 'PUT', body, headers: { 'content-type': contentType, 'cache-control': cacheControl } });
  if (!res.ok) throw new Error(`R2 upload of ${key} failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
}

export async function hasObject(key: string): Promise<boolean> {
  const url = endpoint(key);
  const res = await client!.fetch(url, { method: 'HEAD' });
  return res.ok;
}
