import version from '@/util/version';

export default class Discord {
  private static api: string =
    process.env.DISCORD_API || 'https://discord.com/api/v10';

  private token?: string;

  private fetch: (url: string, options?: RequestInit) => Promise<Response>;

  public constructor(token?: string) {
    this.token = token;

    this.fetch = async (
      url: string,
      options?: RequestInit
    ): Promise<Response> => {
      const response = await fetch(Discord.api + url, {
        ...options,
        headers: {
          'User-Agent': `CRSS/${version} (https://crss.cc)`,
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
          ...options?.headers
        }
      });

      return response;
    };
  }

  public async me() {
    const response = await this.fetch('/users/@me');

    return await response.json();
  }

  public static async renewToken(refreshToken: string): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
  }> {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    params.append('client_id', process.env.DISCORD_CLIENT!);
    params.append('client_secret', process.env.DISCORD_SECRET!);

    const response = await fetch(`${Discord.api}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': `CRSS/${version} (https://crss.cc)`
      },
      body: params
    });

    if (!response.ok) throw new Error();

    return await response.json();
  }
}
