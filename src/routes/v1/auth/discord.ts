import Status from '@/enum/status';
import { User } from '@/interfaces';
import db from '@/util/database';
import Discord from '@/util/discord';

import { Request, Response } from '@/util/handler';
import snowflake from '@/util/snowflake';

import { ms } from '@/util/time';

import z, { ZodError } from 'zod';

import { sign } from 'jsonwebtoken';

const schema = z.object({
  code: z.string(),
  state: z.string().base64()
});

const validHosts = ['crss.cc', 'theclashfruit.me', 'localhost'];

export const get = async (req: Request, res: Response<void>) => {
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
    const avatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=512`;

    const db_user = await db.query<User>(
      'SELECT * FROM users WHERE discord_id = $1',
      [user.id]
    );

    let uid = BigInt(0);
    if (db_user && db_user.length === 0) {
      uid = snowflake.getUniqueID() as bigint;

      await db.query(
        'INSERT INTO users (id, discord_id, username, display_name, email, avatar, banner, accent_color) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          uid,
          user.id,
          user.username,
          user.global_name,
          user.email,
          user.avatar,
          user.banner,
          user.accent_color
        ]
      );

      // TODO: Upload user avatar & banner to cdn.
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
    await db.query(
      'INSERT INTO sessions (id, user_id, access_token, refresh_token, user_agent, expires) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        sid,
        uid,
        data.access_token,
        data.refresh_token,
        req.getHeader('user-agent'),
        new Date(new Date().getTime() + data.expires_in * 1000)
      ]
    );

    // Create the session token.
    const token = sign(
      { uid, sid, email: user.email },
      process.env.JWT_SECRET!,
      {
        expiresIn: '30d'
      }
    );

    res.cookie('session', token, {
      domain: 'localhost',
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
