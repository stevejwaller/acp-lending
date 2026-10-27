// Cloudflare Worker - OAuth Proxy for GitHub Authentication
// Deploy to Cloudflare Workers with your GitHub OAuth credentials

const CLIENT_ID = 'YOUR_GITHUB_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_GITHUB_CLIENT_SECRET';
const REDIRECT_URI = 'https://your-worker-url.workers.dev/callback';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/oauth') {
      return handleOAuth(request);
    } else if (path === '/callback') {
      return handleCallback(request);
    } else {
      return new Response('Not Found', { status: 404 });
    }
  }
};

async function handleOAuth(request) {
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', CLIENT_ID);
  githubAuthUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  githubAuthUrl.searchParams.set('scope', 'repo');
  githubAuthUrl.searchParams.set('state', generateState());

  return Response.redirect(githubAuthUrl.toString(), 302);
}

async function handleCallback(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) {
    return new Response('Authorization failed', { status: 400 });
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        redirect_uri: REDIRECT_URI
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return new Response(`Error: ${tokenData.error}`, { status: 400 });
    }

    const accessToken = tokenData.access_token;

    // Redirect back to admin panel with token
    return Response.redirect(
      `https://acp-lending.com/admin?token=${accessToken}`,
      302
    );
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}

function generateState() {
  return Math.random().toString(36).substring(7);
}
