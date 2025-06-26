import Status from '@/enum/status';
import { User } from '@/interfaces';
import db from '@/util/database';

import { Request, Response } from '@/util/handler';

export const get = async (
  req: Request,
  res: Response<Omit<User, 'email'> | User>
) => {
  const session = await req.session();

  const uid = req.getParam('id')!.toString();
  const isSnowflake = ((value) => {
    try {
      BigInt(value);
      return true;
    } catch {
      return false;
    }
  })(uid);

  let user: User[] | undefined;
  if (isSnowflake)
    user = await db.query<User>('SELECT * FROM users WHERE id = $1', [
      BigInt(uid) as bigint
    ]);
  else
    user = await db.query<User>('SELECT * FROM users WHERE username = $1', [
      uid
    ]);

  if (user!.length <= 0) {
    return res.error(Status.NotFound, 'Not Found');
  }

  if (session && session.user_id == user![0].id) {
    return res.status(Status.Ok).json(user![0]);
  } else {
    return res.status(Status.Ok).json({
      id: user![0].id,
      discord_id: user![0].discord_id,
      minecraft_id: user![0].minecraft_id,
      username: user![0].username,
      display_name: user![0].display_name,
      avatar: user![0].avatar,
      banner: user![0].banner,
      accent_color: user![0].accent_color,
      role: user![0].role,
      created: user![0].created,
      updated: user![0].updated
    });
  }
};
