import sqlite3 from 'sqlite3';

import Status from '@/enum/status';

import { ms } from '@/util/time';

import type { Request, Response, NextFunction } from 'express';

const sql = sqlite3.verbose();
const db = new sql.Database(':memory:');

db.serialize(() => {
  db.run('CREATE TABLE ratelimit (ip VARCHAR(39), requests INT, reset DATE)');
});

interface RateLimitRow {
  ip: string;
  requests: number;
  reset: number;
}

const LIMIT = 300;
const RESET = ms('1m');

export default function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.setHeader('X-RateLimit-Limit', LIMIT);

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  db.get(
    'SELECT * FROM ratelimit WHERE ip = ?',
    [ip],
    (err: any, row: RateLimitRow) => {
      if (err) {
        return res.status(Status.InternalServerError).json({
          error: Status.InternalServerError,
          message: 'Internal Server Error'
        });
      }

      if (!row) {
        db.run('INSERT INTO ratelimit VALUES (?, ?, ?)', [
          ip,
          1,
          new Date(Date.now() + RESET)
        ]);

        res.setHeader('X-RateLimit-Remaining', LIMIT - 1);
        res.setHeader('X-RateLimit-Reset', '60');

        return next();
      }

      if (new Date(row.reset) <= new Date()) {
        const newTime = new Date(Date.now() + RESET);

        db.run('UPDATE ratelimit SET requests = 1, reset = ? WHERE ip = ?', [
          newTime,
          ip
        ]);

        res.setHeader('X-RateLimit-Remaining', LIMIT - 1);
        res.setHeader(
          'X-RateLimit-Reset',
          Math.floor((newTime.getTime() - Date.now()) / 1000)
        );

        return next();
      }

      if (row.requests > LIMIT) {
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader(
          'X-RateLimit-Reset',
          Math.floor((new Date(row.reset).getTime() - Date.now()) / 1000)
        );

        return res.status(Status.TooManyRequests).json({
          error: Status.TooManyRequests,
          message: 'Too Many Requests'
        });
      }

      res.setHeader('X-RateLimit-Remaining', LIMIT - row.requests);
      res.setHeader(
        'X-RateLimit-Reset',
        Math.floor((new Date(row.reset).getTime() - Date.now()) / 1000)
      );

      db.run('UPDATE ratelimit SET requests = requests + 1 WHERE ip = ?', [ip]);

      next();
    }
  );
}
