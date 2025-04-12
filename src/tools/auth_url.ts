const url = new URL('https://discord.com/api/oauth2/authorize');

url.searchParams.append('client_id', process.env.DISCORD_CLIENT!);
url.searchParams.append('response_type', 'code');
url.searchParams.append('redirect_uri', process.env.DISCORD_REDIRECT!);
url.searchParams.append('scope', ['identify', 'email'].join(' '));

console.log(`Auth URL: ${url.toString()}`);
