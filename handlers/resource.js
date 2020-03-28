import { encode, decode } from 'base64url';

async function getResource({
  params: { domain, hash },
  request,
}) {
  if (!domain) {
    throw new Error('No Domain Provided!');
  }

  const path = hash ? `/${decode(hash)}` : '/';
  const url = new URL(path, `https://${domain}`);

  // Forward a white list of headers (Do not forward Cookie)
  const response = await fetch(url.toString(), {
    redirect: 'manual',
    headers: {
      Referer: request.headers.get('Referer'),
      Origin: request.headers.get('Origin'),
      'User-Agent': request.headers.get('User-Agent'),
      Accept: request.headers.get('Accept'),
      'Accept-Encoding': request.headers.get('Accept-Encoding'),
      'Accept-Language': request.headers.get('Accept-Language'),
    },
    cf: {
      cacheEverything: true,
    },
  });

  // If the server responded with a Location header,
  // assume a redirect and create a similar redirect.
  if (response.headers.has('Location')) {
    const requestURL = new URL(request.url);
    const redirectURL = new URL(response.headers.get('Location'));
    const redirectPath = redirectURL.href.substr(redirectURL.origin.length);
    const relative = redirectPath === '/' ? `/${redirectURL.host}` : `/${redirectURL.host}/${encode(redirectPath.substr(1))}`;
    return new Response(undefined, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        Location: (new URL(`/api/${relative.substr(1)}`, requestURL.origin)).toString(),
      },
    });
  }

  // Remove headers from the repsonse (especially Set-Cookie).
  return new Response(response.body, {
    status: response.status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': response.headers.get('Content-Type'),
    },
  });
}

export default getResource;
