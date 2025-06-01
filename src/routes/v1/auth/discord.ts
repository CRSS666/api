import Status from '@/enum/status';

import { Request, Response } from '@/util/handler';
import { ms } from '@/util/time';
import snowflake from '@/util/snowflake';
import s3 from '@/util/storage';
import db from '@/util/database';
import Discord from '@/util/discord';

import { User } from '@/interfaces';

import z, { ZodError } from 'zod';
import { sign } from 'jsonwebtoken';

import crypto from 'node:crypto';

const schema = z.object({
  code: z.string(),
  state: z.string().base64()
});

const validHosts = ['crss.cc', 'theclashfruit.me', 'localhost'];

export const get = async (req: Request, res: Response<any>) => {
  try {
    const { code, state } = schema.parse(req.query);

    const stateData = JSON.parse(atob(state));
    if (stateData.type !== 'redirect')
      return res.error(
        Status.BadRequest,
        'Invalid state type. Expected "redirect".'
      );
    if (!validHosts.includes(new URL(stateData.url).hostname))
      return res.error(
        Status.BadRequest,
        'Redirect uri is not in the approved list of hostnames.'
      );

    const params = new URLSearchParams();
    params.append('client_id', process.env.DISCORD_CLIENT!);
    params.append('client_secret', process.env.DISCORD_SECRET!);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', process.env.DISCORD_REDIRECT!);

    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': 'CRSS/1.0 (https://crss.cc)'
      },
      body: params
    });

    if (!response.ok)
      return res.error(
        Status.InternalServerError,
        'Failed to get access token.'
      );
    const data = await response.json();
    const dc = new Discord(data.access_token);
    const user = await dc.me();

    const db_user = await db.query<User>(
      'SELECT * FROM users WHERE discord_id = $1',
      [user.id]
    );

    let uid = BigInt(0);
    if (db_user && db_user.length === 0) {
      uid = snowflake.getUniqueID() as bigint;

      const hashes: {
        avatar: string | null;
        banner: string | null;
      } = {
        avatar: null,
        banner: null
      };

      // create user in the database.
      await db.query(
        'INSERT INTO users (id, discord_id, username, display_name, email, avatar, banner, accent_color) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          uid,
          user.id,
          user.username,
          user.global_name,
          user.email,
          hashes.avatar,
          hashes.banner,
          user.accent_color
        ]
      );

      if (user.avatar || user.banner) {
        const promises = [];

        // upload user avatar if user has an avatar.
        if (user.avatar) {
          const avatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=256`;
          hashes.avatar = crypto
            .createHash('sha1')
            .update(`${user.avatar};${Date.now() / 1000}`)
            .digest('hex');

          promises.push(
            (async () => {
              const arrayBuffer = await (await fetch(avatar)).arrayBuffer();
              await s3.upload(
                `avatars/${uid}/${hashes.avatar}.webp`,
                'image/webp',
                Buffer.from(arrayBuffer)
              );
            })()
          );
        }

        // upload user banner if user has a banner.
        if (user.banner) {
          const banner = `https://cdn.discordapp.com/banners/${user.id}/${user.banner}.webp?size=1024`;
          hashes.banner = crypto
            .createHash('sha1')
            .update(`${user.banner};${Date.now() / 1000}`)
            .digest('hex');

          promises.push(
            (async () => {
              const arrayBuffer = await (await fetch(banner)).arrayBuffer();
              await s3.upload(
                `banners/${uid}/${hashes.banner}.webp`,
                'image/webp',
                Buffer.from(arrayBuffer)
              );
            })()
          );
        }

        Promise.allSettled(promises)
          .then(() => {
            db.query(
              'UPDATE users SET avatar = $1, banner = $2 WHERE id = $3',
              [hashes.avatar, hashes.banner, uid]
            );
          })
          .catch(() => {
            // ignore :3
          });
      }
    } else {
      uid = db_user![0].id;

      // Update user email if it changed on discord.
      if (user.email !== db_user![0].email) {
        await db.query('UPDATE users SET email = $1 WHERE id = $2', [
          user.email,
          uid
        ]);
      }
    }

    // Create session in the db.
    const sid = snowflake.getUniqueID();
    const exp = new Date(new Date().getTime() + data.expires_in * 1000);
    await db.query(
      'INSERT INTO sessions (id, user_id, access_token, refresh_token, user_agent, expires) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        sid,
        uid,
        data.access_token,
        data.refresh_token,
        req.getHeader('user-agent'),
        exp
      ]
    );

    // Create the session token.
    const token = sign(
      {
        uid,
        sid,
        dcexp: exp
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: '30d'
      }
    );

    res.cookie('session', token, {
      domain: new URL(stateData.url).hostname,
      path: '/',
      maxAge: ms('30d')
    });
    res.redirect(stateData.url);
  } catch (err: any) {
    console.error(err);

    if (err instanceof ZodError)
      res.error(
        Status.BadRequest,
        'The field ' +
          err.issues
            .map((issue) => {
              return (
                '`' +
                issue.path.join('.') +
                '` is ' +
                issue.message.toLowerCase()
              );
            })
            .join(', the field ') +
          '.'
      );
    else res.error(Status.InternalServerError, 'Internal Server Error');
  }
};
