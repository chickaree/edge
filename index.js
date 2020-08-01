import { Router } from 'service-worker-router';
import getResource from './handlers/resource';
import nextHandler from './handlers/next';
import originHandler from './handlers/origin';
import sitemapHandler from './handlers/sitemap';
import robotsHandler from './handlers/robots';

const router = new Router();

router.all('/.well-known/acme-challenge/*', originHandler);
router.all('/proxy/:domain/:hash', getResource);
router.all('/proxy/:domain', getResource);
router.all('/sitemap.xml', sitemapHandler);
router.all('/robots.txt', robotsHandler);
router.all('*', nextHandler);

// eslint-disable-next-line no-restricted-globals
addEventListener('fetch', (event) => {
  router.handleEvent(event);
});
