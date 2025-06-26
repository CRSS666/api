import SocialConnection from '@/enum/social_connection';
import Permission from '@/enum/permission';
import Visibility from '@/enum/visibility';

interface WithSnowflake {
  id: bigint;
}

interface WithCreated {
  created: Date;
}

interface WithUpdated {
  updated: Date;
}

interface WithTimestamps extends WithCreated, WithUpdated {}
interface WithAll extends WithSnowflake, WithTimestamps {}

export interface Role extends WithAll {
  icon_id: bigint;
  name: string;
  permissions: Permission[];
  icon: string;
  color: number;
}

export interface User extends WithAll {
  discord_id: bigint;
  minecraft_id: string | null;
  username: string;
  display_name: string;
  email: string;
  pronouns: string | null;
  avatar: string | null;
  banner: string | null;
  accent_color: number;
  role: bigint | null;
  badges: bigint;
}

export interface Connection extends WithAll {
  user_id: bigint;
  type: SocialConnection;
  url: string;
}

export interface MinecraftCodes extends WithSnowflake, WithCreated {
  uuid: string;
  code: number;
  expires: Date;
}

export interface Session extends WithAll {
  user_id: bigint;
  access_token: string;
  refresh_token: string;
  user_agent: string;
  expires: Date;
}

export interface Image extends WithAll {
  user_id: bigint;
  title: string;
  alt: string;
  sha: string;
  position: number[];
  status: Visibility;
  queued: Date;
  published: Date;
}

export interface Config extends WithTimestamps {
  key: string;
  value: string;
}

export interface Server extends WithAll {
  key: string;
  name: string;
  ip: string;
  api: string;
}
