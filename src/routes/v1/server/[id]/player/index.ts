import Status from '@/enum/status';

import { Request, Response } from '@/util/handler';
import ServerApi from '@/util/sap';

export const get = async (req: Request, res: Response<string[]>) => {
  const validServers = ['main'];
  const serverId = req.getParam('id');
  if (!validServers.includes(serverId as string)) {
    return res.error(Status.BadRequest, 'Invalid server id.');
  }

  try {
    const server = ServerApi.getInstance(serverId as string);
    const players = await server.getPlayers();

    res.status(Status.Ok).json(players);
  } catch {
    res.error(Status.InternalServerError, 'Failed to fetch server info.');
  }
};
