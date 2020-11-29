import { Router } from 'service-worker-router';
import { getAsset } from '@cinematix/next-cloudflare';
import {
  routesManifest, MIME_TYPES, getResponseDataJson, getResourceMetadata,
} from '@chickaree/web';
import getResource from './resource';

const JSON_TYPES = new Set(['application/feed+json', 'application/json']);

// Instantiate a new router for sub requests.
const router = new Router();

router.get('/:domain/:hash', getResource);
router.get('/:domain', getResource);

async function recordDomain(domain) {
  const value = await RESOURCE_DOMAINS.get(domain);

  if (value === null) {
    await RESOURCE_DOMAINS.put(domain, domain, {
      metadata: {
        created: (new Date()).toISOString(),
      },
    });
  }
}

async function getAssetWithMetadata({ event, request, url }) {
  const cache = caches.default;
  const asset = await getAsset(event, routesManifest);

  if (asset.headers.has('Content-Location')) {
    const location = new URL(asset.headers.get('Content-Location'), url);

    if (location.pathname === '/[...resource].html') {
      const { match, handlerPromise } = router.handleRequest(request);
      const { params } = match;
      const response = await handlerPromise;

      if (response.headers.has('Location')) {
        return response;
      }

      if (!response.ok) {
        return asset;
      }

      if (!response.headers.has('Content-Type')) {
        return asset;
      }

      const mimeType = response.headers.get('Content-Type').split(';').shift().trim();

      if (!MIME_TYPES.has(mimeType)) {
        return asset;
      }

      const { hostname } = new URL(`https://${params.domain}`);

      event.waitUntil(recordDomain(hostname));

      let data;
      if (JSON_TYPES.has(mimeType)) {
        data = await getResponseDataJson(response.headers.get('Content-Location'), await response.json());
      } else {
        const parseURL = new URL(`/api/parse${url.pathname}`, url);

        const parsedResponse = await fetch(parseURL.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': response.headers.get('Content-Type'),
          },
          body: response.body,
        });

        if (!parsedResponse.ok) {
          // @TODO Log this somehow?
          return asset;
        }

        data = await parsedResponse.json();
      }

      if (!data) {
        return asset;
      }

      const {
        title, robots, og, schema,
      } = getResourceMetadata(data);

      // eslint-disable-next-line no-undef
      const rewritter = new HTMLRewriter();

      if (data) {
        rewritter.on('head', {
          element(element) {
            const html = `<script id="resource" type="application/activity+json" data-domain="${hostname}" data-hash="${params.hash || ''}">${JSON.stringify(data)}</script>`;
            element.append(html, {
              html: true,
            });
          },
        });
      }

      if (schema) {
        rewritter.on('script[type="application/ld+json"]', {
          element(element) {
            element.setInnerContent(JSON.stringify(schema));
          },
        });
      }

      if (title) {
        rewritter.on('title', {
          element(element) {
            element.setInnerContent(title);
          },
        });
      }

      if (og.title) {
        rewritter.on('meta[property="og:title"]', {
          element(element) {
            element.setAttribute('content', og.title);
          },
        });
      }

      if (og.description) {
        rewritter.on('meta[property="og:description"]', {
          element(element) {
            element.setAttribute('content', og.description);
          },
        });
      }

      if (og.image) {
        rewritter.on('meta[property="og:image"]', {
          element(element) {
            element.setAttribute('content', og.image);
          },
        });
      }

      if (og.type) {
        rewritter.on('meta[property="og:type"]', {
          element(element) {
            element.setAttribute('content', og.type);
          },
        });
      }

      if (og.url) {
        rewritter.on('meta[property="og:url"]', {
          element(element) {
            element.setAttribute('content', og.url);
          },
        });
      }

      if (robots) {
        rewritter.on('meta[name="robots"]', {
          element(element) {
            element.setAttribute('content', robots);
          },
        });
      }

      const transformed = rewritter.transform(asset);
      cache.put(request, transformed.clone());

      return transformed;
    }
  }

  return asset;
}

async function nextHandler(context) {
  const { event, request } = context;
  const cache = caches.default;

  const response = await cache.match(request);

  // If the response was in the cache, respond with that, but updated in the background.
  if (response) {
    event.waitUntil(getAssetWithMetadata(context));
    return response;
  }

  return getAssetWithMetadata(context);
}

export default nextHandler;
