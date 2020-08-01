const text = `User-agent: *
Allow: /

Sitemap: https://chickar.ee/sitemap.xml
`;

async function robotsHandler() {
  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export default robotsHandler;
