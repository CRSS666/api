import Status from '@/enum/status';

import { ServerInfo } from '@/interfaces/server';

import { Request, Response } from '@/util/handler';
import ServerApi from '@/util/sap';

interface ServerRes {
  status: boolean;
  info?: ServerInfo;
}

export const get = async (req: Request, res: Response<ServerRes>) => {
  const validServers = ['main'];
  const serverId = req.getParam('id');
  if (!validServers.includes(serverId as string)) {
    return res.error(Status.BadRequest, 'Invalid server id.');
  }

  const server = ServerApi.getInstance(serverId as string);
  if (!server.status) {
    return res.status(Status.ServiceUnavailable).json({
      status: false
    });
  }

  try {
    const info = await server.getInfo();

    res.status(Status.Ok).json({
      status: true,
      info
    });
  } catch {
    res.error(Status.InternalServerError, 'Failed to fetch server info.');
  }
};
