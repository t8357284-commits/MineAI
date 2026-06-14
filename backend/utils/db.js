const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'socialpulse-db.json');

const initialState = {
  users: [],
  projects: [],
  scripts: [],
  usage: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) writeDb(initialState);
}

function readDb() {
  ensureDb();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    const backup = `${DB_FILE}.${Date.now()}.broken`;
    fs.copyFileSync(DB_FILE, backup);
    writeDb(initialState);
    return { ...initialState };
  }
}

function writeDb(db) {
  const payload = { ...db, updatedAt: new Date().toISOString() };
  fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2));
  return payload;
}

function uid(prefix = 'id') {
  return `${prefix}_${crypto.randomUUID()}`;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const candidate = hashPassword(password, salt).split(':')[1];
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

module.exports = { readDb, writeDb, uid, hashPassword, verifyPassword, publicUser };
