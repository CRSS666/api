import Status from '@/enum/status';

import { Player } from '@/interfaces/server';

import { Request, Response } from '@/util/handler';
import ServerApi from '@/util/sap';

export const get = async (req: Request, res: Response<Player>) => {
  const validServers = ['main'];
  const serverId = req.getParam('id');
  if (!validServers.includes(serverId as string)) {
    return res.error(Status.BadRequest, 'Invalid server id.');
  }

  const uuid = req.getParam('uuid');

  try {
    const server = ServerApi.getInstance(serverId as string);
    const player = await server.getPlayer(uuid as string);

    res.status(Status.Ok).json(player);
  } catch {
    res.error(Status.InternalServerError, 'Failed to fetch server info.');
  }
};
