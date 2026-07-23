import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';

export const DATA_DIR = process.env.DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), 'data');

const CONFIG_PATH = path.join(/*turbopackIgnore: true*/ DATA_DIR, 'config.json');
const CREDENTIALS_PATH = path.join(/*turbopackIgnore: true*/ DATA_DIR, 'credentials.json');
const TOKEN_PATH = path.join(/*turbopackIgnore: true*/ DATA_DIR, 'token.json');

// Legacy fallback paths
const LEGACY_CREDENTIALS_PATH = path.join(/*turbopackIgnore: true*/ process.cwd(), 'credentials.json');
const LEGACY_TOKEN_PATH = path.join(/*turbopackIgnore: true*/ process.cwd(), 'token.json');

export function ensureDataDir() {
  if (!fsSync.existsSync(DATA_DIR)) {
    fsSync.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function hashPin(pin: string, salt?: string): { hash: string; salt: string } {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pin, usedSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: usedSalt };
}

export interface ConfigData {
  pinHash?: string;
  salt?: string;
  adminPinHash?: string;
  adminSalt?: string;
}

export async function getConfig(): Promise<ConfigData> {
  ensureDataDir();
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function setPin(pin: string): Promise<void> {
  ensureDataDir();
  const currentConfig = await getConfig();
  const { hash, salt } = hashPin(pin);
  const newConfig = { ...currentConfig, pinHash: hash, salt };
  await fs.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
}

export async function setAdminPin(pin: string): Promise<void> {
  ensureDataDir();
  const currentConfig = await getConfig();
  const { hash, salt } = hashPin(pin);
  const newConfig = { ...currentConfig, adminPinHash: hash, adminSalt: salt };
  await fs.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
}

export async function setBothPins(userPin: string, adminPin: string): Promise<void> {
  ensureDataDir();
  const currentConfig = await getConfig();
  const user = hashPin(userPin);
  const admin = hashPin(adminPin);
  const newConfig = {
    ...currentConfig,
    pinHash: user.hash,
    salt: user.salt,
    adminPinHash: admin.hash,
    adminSalt: admin.salt,
  };
  await fs.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
}

export async function verifyPin(pin: string): Promise<boolean> {
  const config = await getConfig();
  // Check user PIN first
  if (config.pinHash && config.salt) {
    const { hash } = hashPin(pin, config.salt);
    if (hash === config.pinHash) return true;
  }
  
  // Also allow Admin PIN to unlock viewing
  if (config.adminPinHash && config.adminSalt) {
    const { hash } = hashPin(pin, config.adminSalt);
    if (hash === config.adminPinHash) return true;
  }

  // Fallback to ACCESS_CODE environment variable if set
  if (process.env.ACCESS_CODE && pin === process.env.ACCESS_CODE) {
    return true;
  }

  return false;
}

export async function verifyAdminPin(pin: string): Promise<boolean> {
  const config = await getConfig();

  // If explicit Admin PIN is configured
  if (config.adminPinHash && config.adminSalt) {
    const { hash } = hashPin(pin, config.adminSalt);
    return hash === config.adminPinHash;
  }

  // Backward compatibility: If no admin PIN set yet, fallback to user PIN or ACCESS_CODE
  if (config.pinHash && config.salt) {
    const { hash } = hashPin(pin, config.salt);
    return hash === config.pinHash;
  }

  if (process.env.ACCESS_CODE) {
    return pin === process.env.ACCESS_CODE;
  }

  return false;
}

export async function getCredentialsPath(): Promise<string | null> {
  ensureDataDir();
  if (fsSync.existsSync(CREDENTIALS_PATH)) {
    return CREDENTIALS_PATH;
  }
  if (fsSync.existsSync(LEGACY_CREDENTIALS_PATH)) {
    return LEGACY_CREDENTIALS_PATH;
  }
  return null;
}

export async function getTokenPath(): Promise<string | null> {
  ensureDataDir();
  if (fsSync.existsSync(TOKEN_PATH)) {
    return TOKEN_PATH;
  }
  if (fsSync.existsSync(LEGACY_TOKEN_PATH)) {
    return LEGACY_TOKEN_PATH;
  }
  return null;
}

export async function saveCredentials(credentialsContent: string | object): Promise<void> {
  ensureDataDir();
  const str = typeof credentialsContent === 'string' 
    ? credentialsContent 
    : JSON.stringify(credentialsContent, null, 2);
  
  // Validate JSON structure
  const parsed = JSON.parse(str);
  if (!parsed.installed && !parsed.web) {
    throw new Error('無效的 credentials.json 格式，必須包含 installed 或 web 設定');
  }
  
  await fs.writeFile(CREDENTIALS_PATH, str, 'utf-8');
}

export async function saveToken(tokenData: object | string): Promise<void> {
  ensureDataDir();
  const str = typeof tokenData === 'string' ? tokenData : JSON.stringify(tokenData, null, 2);
  await fs.writeFile(TOKEN_PATH, str, 'utf-8');
}

export async function getSystemStatus() {
  ensureDataDir();
  const config = await getConfig();
  const hasPin = Boolean((config.pinHash && config.salt) || process.env.ACCESS_CODE);
  const hasAdminPin = Boolean((config.adminPinHash && config.adminSalt) || config.pinHash || process.env.ACCESS_CODE);
  const credPath = await getCredentialsPath();
  const tokenPath = await getTokenPath();

  const hasCredentials = Boolean(credPath);
  const hasToken = Boolean(tokenPath);
  const initialized = hasPin && hasCredentials && hasToken;

  return {
    initialized,
    hasPin,
    hasAdminPin,
    hasCredentials,
    hasToken,
  };
}
