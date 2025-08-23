import * as btc from '@scure/btc-signer';
import { hex, utf8 } from '@scure/base';
import * as ordinals from '../src/index.ts';

// Metadata flow: first inscribe base asset, then inscribe metadata referencing parent
(async () => {
  const TESTNET = btc.utils.TEST_NETWORK;
  const privKey = hex.decode('0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a');
  const pubKey = btc.utils.pubSchnorr(privKey);
  const customScripts = [ordinals.OutOrdinalReveal];

  // Step 1: Base asset inscription (e.g., image)
  const basePng = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  const baseInscription: ordinals.Inscription = {
    tags: { contentType: 'image/png' },
    body: basePng,
  };

  const baseReveal = btc.p2tr(undefined, ordinals.p2tr_ord_reveal(pubKey, [baseInscription]), TESTNET, false, customScripts);
  console.log('Base Address', baseReveal.address);

  // Fund and reveal base inscription, then obtain txid/index externally.
  // For demo purposes, we reference an example id here.
  const baseInscriptionId = '75ddabb27b8845f5247975c8a5ba7c6f336c4570708ebe230caf6db5217ae858i0';

  // Step 2: Metadata inscription that references the base via parent and includes metadata
  const metadataInscription: ordinals.Inscription = {
    tags: {
      contentType: 'application/json',
      parent: baseInscriptionId,
      metadata: { name: 'Logo v1', attributes: [{ trait_type: 'theme', value: 'purple' }] },
      metaprotocol: 'com.example/meta-v1',
      note: 'Metadata referencing a parent inscription',
    },
    body: utf8.decode(JSON.stringify({ type: 'metadata', schema: 'example-v1' })),
  };

  const metaReveal = btc.p2tr(undefined, ordinals.p2tr_ord_reveal(pubKey, [metadataInscription]), TESTNET, false, customScripts);
  console.log('Metadata Address', metaReveal.address);

  // Fund and reveal metaReveal, then broadcast.
})();