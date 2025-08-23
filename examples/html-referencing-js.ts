import * as btc from '@scure/btc-signer';
import { hex, utf8 } from '@scure/base';
import * as ordinals from '../src/index.ts';

// HTML referencing a JS inscription
(async () => {
  const TESTNET = btc.utils.TEST_NETWORK;
  const privKey = hex.decode('0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a');
  const pubKey = btc.utils.pubSchnorr(privKey);
  const customScripts = [ordinals.OutOrdinalReveal];

  // Step 1: JS inscription
  const jsInscription: ordinals.Inscription = {
    tags: { contentType: 'text/javascript' },
    body: utf8.decode(`console.log('hi from onchain script');`),
  };
  const jsReveal = btc.p2tr(undefined, ordinals.p2tr_ord_reveal(pubKey, [jsInscription]), TESTNET, false, customScripts);
  console.log('JS Address', jsReveal.address);

  // Suppose after reveal we get js inscription id
  const jsInscriptionId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaai0';

  // Step 2: HTML inscription that references the JS
  const html = `<html><head></head><body><script src="/content/${jsInscriptionId}"></script><h1>Hello</h1></body></html>`;
  const htmlInscription: ordinals.Inscription = {
    tags: { contentType: 'text/html;charset=utf-8' },
    body: utf8.decode(html),
  };
  const htmlReveal = btc.p2tr(undefined, ordinals.p2tr_ord_reveal(pubKey, [htmlInscription]), TESTNET, false, customScripts);
  console.log('HTML Address', htmlReveal.address);
})();