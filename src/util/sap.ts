import net from 'node:net';

import Logger from '@/util/logger';

import { Player, ServerInfo } from '@/interfaces/server';

enum Packet {
  // Client
  KeepAlive = 0x00,
  Hello = 0x01,
  Bye = 0x0f,

  // Server
  Ack = 0xff,

  // Universal
  Error = 0xfe,

  Info = 0x10,
  Players = 0x11,
  Player = 0x12
}

export default class ServerApi {
  private static instances: Map<string, ServerApi> = new Map();

  public status: boolean = false;
  public version: string = '0.0.0';

  private socket: net.Socket | null = null;

  private name: string = 'localhost';
  private logger: Logger = new Logger('tmp');

  private keepAliveInterval: NodeJS.Timeout | null = null;

  private handlers: Map<Packet, (data: Buffer) => void> = new Map();

  private constructor(address: string = 'localhost:25580', name: string) {
    this.name = name;
    this.logger = new Logger(`crss::api::sap::${this.name}`);

    this.createConnection(address);
  }

  public static getInstance(id: string, address?: string): ServerApi {
    if (!ServerApi.instances.has(id))
      ServerApi.instances.set(id, new ServerApi(address, id));
    return ServerApi.instances.get(id)!;
  }

  private createConnection(address: string) {
    const [host, port] = address.split(':');
    this.socket = net.createConnection(parseInt(port), host, () => {
      this.status = true;

      const serverKey = process.env.SERVER_KEY ?? 'undefined';

      this.socket?.write(this.encode(Packet.Hello, Buffer.from(serverKey)));
      this.keepAliveInterval = setInterval(() => {
        if (this.socket) {
          this.socket.write(
            this.encode(Packet.KeepAlive, Buffer.from(createRandomString(4)))
          );
        }
      }, 10000);
    });

    this.socket.on('data', (data: Buffer) => {
      const { packet, data: payload } = this.decode(data);

      if (packet === Packet.Bye) {
        this.status = false;

        this.socket?.destroy();
        this.socket = null;

        clearInterval(this.keepAliveInterval!);
        this.keepAliveInterval = null;

        setTimeout(() => {
          this.createConnection(address);
        }, 60000);
      }

      if (packet === Packet.Ack) {
        if (payload![0] == Packet.Hello) {
          this.socket?.write(this.encode(Packet.Info));
        }
      }

      if (packet === Packet.Info) {
        this.version = JSON.parse(payload!.toString('utf-8')).version;
      }

      if (this.handlers.has(packet)) {
        this.handlers.get(packet)!(payload!);
      }
    });

    this.socket.on('error', (err: any) => {
      this.status = false;

      this.socket?.destroy();
      this.socket = null;

      clearInterval(this.keepAliveInterval!);
      this.keepAliveInterval = null;

      if (!err['errors']) this.logger.error(err.message);
      else
        err['errors'].forEach((e: any) => {
          this.logger.error(e.message);
        });

      setTimeout(() => {
        this.createConnection(address);
      }, 5000);
    });
  }

  public getInfo(): Promise<ServerInfo> {
    return new Promise((resolve, reject) => {
      if (this.status) {
        this.handlers.set(Packet.Info, (data: Buffer) => {
          resolve(JSON.parse(data.toString('utf-8')));
          this.handlers.delete(Packet.Info);
        });
        this.socket?.write(this.encode(Packet.Info));
      } else {
        reject(new Error('Server is not connected!'));
      }
    });
  }

  public getPlayers(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      if (this.status) {
        this.handlers.set(Packet.Players, (data: Buffer) => {
          resolve(JSON.parse(data.toString('utf-8')));
          this.handlers.delete(Packet.Players);
        });
        this.socket?.write(this.encode(Packet.Players));
      } else {
        reject(new Error('Server is not connected!'));
      }
    });
  }

  public getPlayer(id: string): Promise<Player> {
    return new Promise((resolve, reject) => {
      if (this.status) {
        this.handlers.set(Packet.Player, (data: Buffer) => {
          resolve(JSON.parse(data.toString('utf-8')));
          this.handlers.delete(Packet.Player);
        });
        this.socket?.write(this.encode(Packet.Player, Buffer.from(id)));
      } else {
        reject(new Error('Server is not connected!'));
      }
    });
  }

  private encode(packet: Packet, data?: Buffer): Buffer {
    const buffer = Buffer.alloc(5 + (data?.length ?? 0));
    buffer.set([packet], 0);
    buffer.writeInt32BE(data?.length ?? 0, 1);

    if (data) data.copy(buffer, 5);

    return buffer;
  }

  private decode(buffer: Buffer): {
    packet: Packet;
    length: number;
    data?: Buffer;
  } {
    const packet = buffer[0] as Packet;
    const length = buffer.readInt32BE(1);
    const data = length > 0 ? buffer.subarray(5) : undefined;

    return { packet, length, data };
  }
}

function createRandomString(length: number): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
