import * as btc from '@scure/btc-signer';
import { hex, utf8 } from '@scure/base';
import * as ordinals from '../src/index.ts';

// Multi-inscription in a single reveal: manifest + js + binary asset
(async () => {
  const TESTNET = btc.utils.TEST_NETWORK;
  const privKey = hex.decode('0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a');
  const pubKey = btc.utils.pubSchnorr(privKey);
  const customScripts = [ordinals.OutOrdinalReveal];

  const manifest = {
    tags: { contentType: 'application/json' },
    body: utf8.decode(JSON.stringify({
      name: 'multi-asset-demo',
      version: 1,
      files: [
        { name: 'app.js', type: 'text/javascript' },
        { name: 'logo.png', type: 'image/png' },
      ],
    })),
  } satisfies ordinals.Inscription;

  const appJs = {
    tags: { contentType: 'text/javascript' },
    body: utf8.decode(`console.log('hello from onchain js');`),
  } satisfies ordinals.Inscription;

  // Example binary content (not a real PNG; replace in real use)
  const logoPngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  const logoPng = {
    tags: { contentType: 'image/png' },
    body: logoPngBytes,
  } satisfies ordinals.Inscription;

  const inscriptions: ordinals.Inscription[] = [manifest, appJs, logoPng];

  const revealPayment = btc.p2tr(
    undefined,
    ordinals.p2tr_ord_reveal(pubKey, inscriptions),
    TESTNET,
    false,
    customScripts
  );

  console.log('Address', revealPayment.address);

  const changeAddr = revealPayment.address;
  const revealAmount = 4000n;
  const fee = 800n;

  const tx = new btc.Transaction({ customScripts });
  tx.addInput({
    ...revealPayment,
    txid: '75ddabb27b8845f5247975c8a5ba7c6f336c4570708ebe230caf6db5217ae858',
    index: 0,
    witnessUtxo: { script: revealPayment.script, amount: revealAmount },
  });
  tx.addOutputAddress(changeAddr, revealAmount - fee, TESTNET);
  tx.sign(privKey, undefined, new Uint8Array(32));
  tx.finalize();

  const txHex = hex.encode(tx.extract());
  console.log('txHex', txHex);
  console.log('vsize', tx.vsize);
  console.log('parsed', ordinals.parseWitness(tx.inputs[0].finalScriptWitness));
})();