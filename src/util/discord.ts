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
          'User-Agent': `CRSS (https://crss.cc, ${version})`,
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
}
