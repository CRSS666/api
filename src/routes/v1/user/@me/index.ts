import Status from '@/enum/status';
import { User } from '@/interfaces';
import { InvalidToken } from '@/util/errors';

import { Request, Response } from '@/util/handler';

export const get = async (req: Request, res: Response<User>) => {
  try {
    const user = await req.user();

    if (!user) res.error(Status.InternalServerError, 'Internal Server Error');

    res.status(Status.Ok).json(user);
  } catch (e: any) {
    console.error(e);
    // Ignore the error if it's an invalid token since the `Request` class already handles it.
    if (e instanceof InvalidToken) return;
  }
};
