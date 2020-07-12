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
      'User-Agent': request.headers.get('User-Agent'),
      Accept: request.headers.get('Accept'),
      'Accept-Encoding': request.headers.get('Accept-Encoding'),
      'Accept-Language': request.headers.get('Accept-Language'),
    },
    cf: {
      cacheEverything: true,
    },
  };

  let response;
  try {
    response = await fetch(url.toString(), options);
  } catch (e) {
    // Try again with http.
    url.protocol = 'http:';
    response = await fetch(url.toString(), options);
  }


  // Redirect?
  if (response.status >= 300 && response.status <= 308 && response.headers.has('Location')) {
    const requestURL = new URL(request.url);
    const redirectURL = new URL(response.headers.get('Location'), response.url);
    const redirectPath = redirectURL.href.substr(redirectURL.origin.length);
    const relative = redirectPath === '/' ? `/${redirectURL.host}` : `/${redirectURL.host}/${encode(redirectPath.substr(1))}`;
    const locationBaseURL = requestURL.pathname.startsWith('/proxy/') ? new URL('/proxy/', requestURL.origin) : new URL(requestURL.origin);
    const locationURL = new URL(relative.substr(1), locationBaseURL);

    // If we aren't redirecting anywhere, throw an error instead.
    if (requestURL.toString() === locationURL.toString()) {
      return new Response(undefined, {
        status: 502,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Location': response.url,
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

  const mimeType = response.headers.get('Content-Type').split(';').shift().trim();

  // Remove headers from the repsonse (especially Set-Cookie).
  const resource = new Response(response.body, {
    ...response,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Location': response.url,
      'Content-Type': response.headers.get('Content-Type'),
    },
  });

  // If the resource is HTML, remove the body.
  if (mimeType === 'text/html') {
    // eslint-disable-next-line no-undef
    const rewritter = new HTMLRewriter();
    rewritter.on('body', {
      element(element) {
        element.setInnerContent('');
      },
    });

    return rewritter.transform(resource);
  }

  return resource;
}

export default getResource;
