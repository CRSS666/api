import Status from '@/enum/status';
import { User } from '@/interfaces';

import { Request, Response } from '@/util/handler';

export const get = async (req: Request, res: Response<User>) => {
  const user = await req.user();

  if (!user) return res.error(Status.Unauthorized, 'Unauthorized');
  return res.status(Status.Ok).json(user);
};
