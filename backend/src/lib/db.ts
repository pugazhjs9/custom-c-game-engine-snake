import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const initDb = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      playerName VARCHAR(20) NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      mode VARCHAR(20) NOT NULL,
      level INTEGER DEFAULT 1,
      duration INTEGER DEFAULT 0,
      snakeLength INTEGER DEFAULT 4,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
    CREATE INDEX IF NOT EXISTS idx_scores_mode_score ON scores(mode, score DESC);
  `;

  try {
    await query(createTableQuery);
    console.log("✅ PostgreSQL table initialized");
  } catch (err) {
    console.error("❌ Error initializing PostgreSQL table:", err);
    throw err;
  }
};

export default pool;
