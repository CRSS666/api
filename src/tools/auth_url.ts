const url = new URL('https://discord.com/api/oauth2/authorize');

url.searchParams.append('client_id', process.env.DISCORD_CLIENT!);
url.searchParams.append('response_type', 'code');
url.searchParams.append('redirect_uri', process.env.DISCORD_REDIRECT!);
url.searchParams.append('scope', ['identify', 'email'].join(' '));
url.searchParams.append(
  'state',
  btoa(JSON.stringify({ type: 'redirect', url: 'https://crss.cc' }))
);

console.log(`Auth URL: ${url.toString()}`);
