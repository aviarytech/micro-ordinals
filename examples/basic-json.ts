import * as btc from '@scure/btc-signer';
import { hex, utf8 } from '@scure/base';
import * as ordinals from '../src/index.ts';

// Single JSON inscription
(async () => {
  const TESTNET = btc.utils.TEST_NETWORK;
  const privKey = hex.decode('0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a');
  const pubKey = btc.utils.pubSchnorr(privKey);
  const customScripts = [ordinals.OutOrdinalReveal];

  const inscription: ordinals.Inscription = {
    tags: {
      contentType: 'application/json',
    },
    body: utf8.decode(JSON.stringify({ type: 'example', format: 'json', version: 1 })),
  };

  const revealPayment = btc.p2tr(
    undefined,
    ordinals.p2tr_ord_reveal(pubKey, [inscription]),
    TESTNET,
    false,
    customScripts
  );

  // Fund this address before revealing
  console.log('Address', revealPayment.address);

  const changeAddr = revealPayment.address;
  const revealAmount = 2000n;
  const fee = 500n;

  const tx = new btc.Transaction({ customScripts });
  tx.addInput({
    ...revealPayment,
    // Replace with real funding UTXO txid
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