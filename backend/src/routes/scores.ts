import { Router, Request, Response } from "express";
import { query } from "../lib/db";

const router = Router();

// In-memory fallback when DB is not connected
const inMemoryScores: Array<{
  playerName: string; score: number; mode: string;
  level: number; duration: number; createdAt: Date;
}> = [];

// POST /api/scores — Submit a new score
router.post("/", async (req: Request, res: Response) => {
  try {
    const { playerName, score, mode, level, duration, snakeLength } = req.body;
    if (!playerName || score === undefined || !mode) {
      return res.status(400).json({ error: "playerName, score, and mode are required" });
    }

    try {
      const result = await query(
        `INSERT INTO scores (playerName, score, mode, level, duration, snakeLength) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [playerName, score, mode, level || 1, duration || 0, snakeLength || 4]
      );
      return res.status(201).json(result.rows[0]);
    } catch (dbErr: any) {
      console.error("DB Error:", dbErr.message);
      // Fallback to in-memory
      const entry = { playerName, score, mode, level: level || 1, duration: duration || 0, createdAt: new Date() };
      inMemoryScores.push(entry);
      inMemoryScores.sort((a, b) => b.score - a.score);
      return res.status(201).json(entry);
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/scores — Get all scores
router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await query("SELECT * FROM scores ORDER BY score DESC LIMIT 100");
    return res.json(result.rows);
  } catch {
    return res.json(inMemoryScores.slice(0, 100));
  }
});

export default router;
