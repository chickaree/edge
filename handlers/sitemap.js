import builder from 'xmlbuilder';

async function sitemapHandler() {
  const base = new URL('https://chickar.ee/');
  let urls = [
    base.toString(),
    (new URL('/search', base)).toString(),
  ];

  let keys = [];
  // eslint-disable-next-line camelcase
  let listComplete = false;
  let cursor;
  while (listComplete === false) {
    // eslint-disable-next-line no-await-in-loop
    ({ keys, list_complete: listComplete, cursor } = await RESOURCE_DOMAINS.list({
      cursor,
    }));

    urls = keys.reduce((arr, { name }) => (
      [
        ...arr,
        (new URL(name, base)).toString(),
      ]
    ), urls);
  }

  const data = {
    urlset: {
      '@xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
      url: urls.map((url) => ({
        loc: url,
      })),
    },
  };

  const xml = builder.create(data, { encoding: 'utf-8' }).end({ pretty: true });

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export default sitemapHandler;
