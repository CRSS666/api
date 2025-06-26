import Status from '@/enum/status';
import { Connection } from '@/interfaces';
import db from '@/util/database';

import { Request, Response } from '@/util/handler';

export const get = async (
  req: Request,
  res: Response<Omit<Connection, 'user_id'>[]>
) => {
  const user = await req.user();
  if (!user) return res.error(Status.Unauthorized, 'Unauthorized');

  const connections = await db.query<Connection>(
    'SELECT id, type, url, created, updated FROM user_connections WHERE user_id = $1',
    [user.id]
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
