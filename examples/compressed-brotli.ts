import * as btc from '@scure/btc-signer';
import { hex, utf8 } from '@scure/base';
import * as ordinals from '../src/index.ts';

// Brotli-compressed body with contentEncoding: 'br'
(async () => {
  const TESTNET = btc.utils.TEST_NETWORK;
  const privKey = hex.decode('0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a');
  const pubKey = btc.utils.pubSchnorr(privKey);
  const customScripts = [ordinals.OutOrdinalReveal];

  // Pretend we have pre-compressed content (brotli) as bytes.
  // In practice, compress the utf8 bytes externally and put result here.
  const compressedBody = new Uint8Array([0x1b, 0x2a, 0x3c]);

  const inscription: ordinals.Inscription = {
    tags: { contentType: 'application/json', contentEncoding: 'br' },
    body: compressedBody,
  };

  const revealPayment = btc.p2tr(undefined, ordinals.p2tr_ord_reveal(pubKey, [inscription]), TESTNET, false, customScripts);
  console.log('Address', revealPayment.address);
})();