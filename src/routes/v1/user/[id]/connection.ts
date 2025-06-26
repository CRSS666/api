import Status from '@/enum/status';
import { Connection, User } from '@/interfaces';
import db from '@/util/database';

import { Request, Response } from '@/util/handler';

export const get = async (
  req: Request,
  res: Response<Omit<Connection, 'user_id'>[]>
) => {
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

  const connections = await db.query<Connection>(
    'SELECT id, type, url, created, updated FROM user_connections WHERE user_id = $1',
    [user![0].id]
  );

  if (!connections)
    return res.error(Status.InternalServerError, 'Internal Server Error');

  res.status(Status.Ok).json(
    connections.map((connection) => {
      return {
        id: connection.id,
        type: connection.type,
        url: connection.url,
        created: connection.created,
        updated: connection.updated
      };
    })
  );
};
