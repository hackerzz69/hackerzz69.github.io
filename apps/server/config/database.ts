import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: Database | null = null;

export async function initializeDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  // If DATABASE_URL is set, use it; otherwise use relative path from this file
  const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../database.sqlite');
  
  console.log('Attempting to open database at:', dbPath);
  
  // Ensure the directory exists
  const dbDir = path.dirname(dbPath);
  console.log('Database directory:', dbDir);
  
  try {
    const fs = await import('fs');
    await fs.promises.mkdir(dbDir, { recursive: true });
  } catch (error) {
    console.warn('Could not create database directory:', error);
  }
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Create users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      discriminator TEXT,
      avatar TEXT,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create sessions table for JWT blacklisting (optional)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_jti TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Create marketplace listings table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS marketplace_listings (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      asking_price INTEGER NOT NULL,
      accepts_items BOOLEAN DEFAULT 0,
      notes TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Create marketplace offers table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS marketplace_offers (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      coin_offer INTEGER DEFAULT 0,
      message TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (listing_id) REFERENCES marketplace_listings (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Create marketplace offer items table (for item-based offers)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS marketplace_offer_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      offer_id TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY (offer_id) REFERENCES marketplace_offers (id)
    )
  `);

  // Create trade confirmations table for pending trades
  await db.exec(`
    CREATE TABLE IF NOT EXISTS trade_confirmations (
      id TEXT PRIMARY KEY,
      offer_id TEXT NOT NULL,
      listing_id TEXT NOT NULL,
      seller_confirmed BOOLEAN DEFAULT 0,
      buyer_confirmed BOOLEAN DEFAULT 0,
      seller_confirmed_at DATETIME NULL,
      buyer_confirmed_at DATETIME NULL,
      completed_at DATETIME NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (offer_id) REFERENCES marketplace_offers (id),
      FOREIGN KEY (listing_id) REFERENCES marketplace_listings (id)
    )
  `);

  console.log('Database initialized successfully');
  return db;
}

export async function getDatabase(): Promise<Database> {
  if (!db) {
    return await initializeDatabase();
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}
