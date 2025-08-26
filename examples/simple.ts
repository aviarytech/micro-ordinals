import * as btc from '@scure/btc-signer';
import { hex, utf8 } from '@scure/base';
import { OutOrdinalReveal, p2tr_ord_reveal, type Inscription, parseWitness } from '../src/index.ts';

// Minimal simple inscription example
(async () => {
  const NETWORK = btc.TEST_NETWORK; // or btc.NETWORK for mainnet
  const customScripts = [OutOrdinalReveal];

  // Demo key (do not use in production)
  const privKey = hex.decode('0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a');
  const pubKey = btc.utils.pubSchnorr(privKey);

  const inscription: Inscription = {
    tags: { contentType: 'text/plain;charset=utf-8' },
    body: utf8.decode('Hello, Ordinals!'),
  };

  // Address where you must first send funds before revealing inscription
  const revealPayment = btc.p2tr(
    undefined,
    p2tr_ord_reveal(pubKey, [inscription]),
    NETWORK,
    false,
    customScripts
  );
  console.log('Reveal address:', revealPayment.address);

  // After funding the address above with enough sats to cover fees, build the reveal tx
  const tx = new btc.Transaction({ customScripts });
  // Replace the following three values with your funding UTXO details
  const FUNDING_TXID = '75ddabb27b8845f5247975c8a5ba7c6f336c4570708ebe230caf6db5217ae858';
  const FUNDING_INDEX = 0;
  const FUNDING_AMOUNT = 2000n; // sats
  const FEE = 500n; // sats (ensure >= tx.vsize * feerate)

  tx.addInput({
    ...revealPayment,
    txid: FUNDING_TXID,
    index: FUNDING_INDEX,
    witnessUtxo: { script: revealPayment.script, amount: FUNDING_AMOUNT },
  });
  const changeAddr = revealPayment.address;
  tx.addOutputAddress(changeAddr, FUNDING_AMOUNT - FEE, NETWORK);
  tx.sign(privKey, undefined, new Uint8Array(32));
  tx.finalize();

  const txHex = hex.encode(tx.extract());
  console.log('Reveal tx hex:', txHex);

  // Optional: parse inscriptions from witness to verify
  const parsed = parseWitness(tx.inputs[0].finalScriptWitness);
  console.log('Parsed inscriptions:', parsed);
})();