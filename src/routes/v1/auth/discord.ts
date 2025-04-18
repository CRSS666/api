import Status from '@/enum/status';
import Discord from '@/util/discord';

import { Request, Response } from '@/util/handler';

import { ms } from '@/util/time';

import z, { ZodError } from 'zod';

const schema = z.object({
  code: z.string(),
  state: z.string().base64()
});

export const get = async (req: Request, res: Response<any>) => {
  try {
    const { code, state } = schema.parse(req.query);

    const stateData = JSON.parse(atob(state));
    if (stateData.type !== 'redirect')
      return res.error(
        Status.BadRequest,
        'Invalid state type. Expected "redirect".'
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
      return res.error(Status.BadRequest, 'Failed to get access token.');
    const data = await response.json();
    const dc = new Discord(data.access_token);
    const user = await dc.me();
    const avatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=512`;

    res.cookie('session', code, {
      domain: 'localhost',
      path: '/',
      maxAge: ms('10m')
    });
    //res.redirect(stateData.url);
    res
      .status(Status.Ok)
      .send(`* dc: ${JSON.stringify(user, null, 2)}\n* avatar: ${avatar}`);
  } catch (err: any) {
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
