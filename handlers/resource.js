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
  const options = {
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
  };

  // Forward a white list of headers (Do not forward Cookie)
  let response;
  try {
    response = await fetch(url.toString(), options);
  } catch (e) {
    // Try again with http.
    url.protocol = 'http:';
    response = await fetch(url.toString(), options);
  }

  if (!response.ok && !response.headers.has('Location')) {
    // Try again with http.
    url.protocol = 'http:';
    response = await fetch(url.toString(), options);
  }

  // Redirect?
  if (response.status >= 301 && response.status <= 308 && response.headers.has('Location')) {
    const requestURL = new URL(request.url);
    const redirectURL = new URL(response.headers.get('Location'), response.url);
    const redirectPath = redirectURL.href.substr(redirectURL.origin.length);
    const relative = redirectPath === '/' ? `/${redirectURL.host}` : `/${redirectURL.host}/${encode(redirectPath.substr(1))}`;
    const locationURL = new URL(`/api/${relative.substr(1)}`, requestURL.origin);

    // If we aren't redirecting anywhere, throw an error instead.
    if (requestURL.toString() === locationURL.toString()) {
      return new Response(undefined, {
        status: 502,
        headers: {
          'X-Debug-Err': 'Circular Redirect',
          'X-Debug-Location': response.headers.get('Location'),
        },
      });
    }

    return new Response(undefined, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        Location: locationURL.toString(),
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
