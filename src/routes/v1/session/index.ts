import Status from '@/enum/status';
import db from '@/util/database';
import Discord from '@/util/discord';

import { Request, Response } from '@/util/handler';
import { ms } from '@/util/time';

import { sign } from 'jsonwebtoken';

export const del = async (req: Request, res: Response<void>) => {
  const session = await req.session();
  if (!session) return res.error(Status.Unauthorized, 'Unauthorized');

  return res.status(Status.NoContent).end();
};

interface TokenResponse {
  token: string;
  expires: Date;
}

export const patch = async (req: Request, res: Response<TokenResponse>) => {
  const session = await req.session();
  if (!session) return res.error(Status.Unauthorized, 'Unauthorized');

  try {
    const discordRenew = await Discord.renewToken(session.refresh_token);
    const expires = new Date(
      new Date().getTime() + discordRenew.expires_in * 1000
    );
    await db.query(
      'UPDATE sessions SET access_token = $1, refresh_token = $2, expires = $3',
      [discordRenew.access_token, discordRenew.refresh_token, expires]
    );

    const token = sign(
      { uid: session.user_id, sid: session.id, dcexp: expires },
      process.env.JWT_SECRET!,
      {
        expiresIn: '30d'
      }
    );

    return res.status(Status.Ok).json({
      token,
      expires: new Date(new Date().getTime() + ms('30d'))
    });
  } catch {
    return res.error(Status.NotModified, 'Failed to renew token.');
  }
};
