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

  // @TODO Forward more headers!
  const response = await fetch(url.toString(), {
    redirect: 'manual',
    headers: {
      'User-Agent': request.headers.get('User-Agent'),
      Accept: request.headers.get('Accept'),
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
    const redirectPath = redirectURL.pathname === '/'
      ? `/${redirectURL.host}`
      : `/${redirectURL.host}/${encode(redirectURL.pathname.substr(1))}`;
    return new Response(undefined, {
      status: response.status,
      headers: {
        Location: (new URL(`/api/${redirectPath.substr(1)}`, requestURL.origin)).toString(),
      },
    });
  }

  return response;
}

export default getResource;
