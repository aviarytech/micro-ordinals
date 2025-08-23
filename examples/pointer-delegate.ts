import * as btc from '@scure/btc-signer';
import { hex, utf8 } from '@scure/base';
import * as ordinals from '../src/index.ts';

// Demonstrate pointer and delegate tags
(async () => {
  const TESTNET = btc.utils.TEST_NETWORK;
  const privKey = hex.decode('0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a');
  const pubKey = btc.utils.pubSchnorr(privKey);
  const customScripts = [ordinals.OutOrdinalReveal];

  // Pointer example (point to 0th output by specifying pointer=0)
  const pointerInscription: ordinals.Inscription = {
    tags: { contentType: 'text/plain;charset=utf-8', pointer: 0n },
    body: utf8.decode('This is pointed to output 0'),
  };

  const pointerReveal = btc.p2tr(undefined, ordinals.p2tr_ord_reveal(pubKey, [pointerInscription]), TESTNET, false, customScripts);
  console.log('Pointer Address', pointerReveal.address);

  // Delegate example: referencing a previous inscription id
  const someInscriptionId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbi1';
  const delegateInscription: ordinals.Inscription = {
    tags: { contentType: 'application/json', delegate: someInscriptionId },
    body: utf8.decode(JSON.stringify({ delegated: true })),
  };

  const delegateReveal = btc.p2tr(undefined, ordinals.p2tr_ord_reveal(pubKey, [delegateInscription]), TESTNET, false, customScripts);
  console.log('Delegate Address', delegateReveal.address);
})();