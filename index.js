import { Router } from 'service-worker-router';
import getResource from './handlers/resource';

const router = new Router();

router.get('/api/:domain/:hash', getResource);
router.get('/api/:domain', getResource);

// eslint-disable-next-line no-restricted-globals
addEventListener('fetch', (event) => {
  router.handleEvent(event);
});
