import Status from '@/enum/status';

import db from '@/util/database';

import { Session } from '@/interfaces';

import { Request, Response } from '@/util/handler';

export const del = async (req: Request, res: Response<void>) => {
  const session = await req.session();
  if (!session) return res.error(Status.Unauthorized, 'Unauthorized');

  try {
    const sid = req.getParam('id');
    const std = await db.query<Session>(
      'SELECT * FROM sessions WHERE id = $1',
      [sid]
    );

    if (std!.length !== 1) res.error(Status.NotFound, 'Session was not found.');
    await db.query('DELETE FROM sessions WHERE id = $1', [sid]);
  } catch {
    return res.error(Status.InternalServerError, 'Internal Server Error');
  }
};
