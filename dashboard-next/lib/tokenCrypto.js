import crypto from 'crypto';

function getKey() {
  const raw = process.env.TOKEN_ENC_KEY;
  if (!raw) {
    throw new Error('TOKEN_ENC_KEY is not set');
  }

  try {
    const buf = Buffer.from(raw, 'base64');
    if (buf.length === 32) {
      return buf;
    }
  } catch (error) {
    // ignore invalid base64
  }

  return crypto.createHash('sha256').update(String(raw), 'utf8').digest();
}

export function encryptString(plainText) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plainText), 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptString(encoded) {
  const key = getKey();
  const buf = Buffer.from(String(encoded || ''), 'base64');
  if (buf.length < 12 + 16 + 1) {
    throw new Error('Invalid encrypted payload');
  }

  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}
