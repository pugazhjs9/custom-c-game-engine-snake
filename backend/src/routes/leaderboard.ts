import { Router, Request, Response } from "express";
import { query } from "../lib/db";

const router = Router();

// GET /api/leaderboard?period=daily|weekly|alltime&mode=solo|ai|multiplayer
router.get("/", async (req: Request, res: Response) => {
  try {
    const { period = "alltime", mode } = req.query;

    let sql = "SELECT * FROM scores WHERE 1=1";
    const params: any[] = [];

    if (mode && mode !== "all") {
      params.push(mode);
      sql += ` AND mode = $${params.length}`;
    }

    if (period === "daily") {
      sql += " AND createdAt >= NOW() - INTERVAL '1 day'";
    } else if (period === "weekly") {
      sql += " AND createdAt >= NOW() - INTERVAL '7 days'";
    }

    sql += " ORDER BY score DESC LIMIT 50";

    try {
      const result = await query(sql, params);
      return res.json(result.rows);
    } catch (dbErr: any) {
      console.error("Leaderboard DB Error:", dbErr.message);
      return res.json([]);
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
