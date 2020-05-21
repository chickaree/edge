import { Router } from 'service-worker-router';
import getResource from './handlers/resource';
import nextHandler from './handlers/next';
import originHandler from './handlers/origin';

const router = new Router();

router.all('/.well-known/acme-challenge/*', originHandler);
router.get('/proxy/:domain/:hash', getResource);
router.get('/proxy/:domain', getResource);
router.get('*', nextHandler);

// eslint-disable-next-line no-restricted-globals
addEventListener('fetch', (event) => {
  router.handleEvent(event);
});
