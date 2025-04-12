export interface ServerInfo {
  version: string;
  players: {
    online: number;
    max: number;
  };
  worlds: string[];
}

export interface Player {
  uuid: string;
  name: string;
  position: {
    x: number;
    y: number;
    z: number;
    world: string;
  };
}
