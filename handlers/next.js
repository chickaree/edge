import { getAsset } from '@cinematix/next-cloudflare';
import { routesManifest } from '@chickaree/web';

async function nextHandler({ event }) {
  return getAsset(event, routesManifest);
}

export default nextHandler;
