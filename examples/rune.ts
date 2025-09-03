import * as btc from '@scure/btc-signer';
import { hex, utf8 } from '@scure/base';
import { OutOrdinalReveal, p2tr_ord_reveal, type Inscription, parseWitness } from '../src/index.ts';

const NETWORK = btc.utils.TEST_NETWORK; // or btc.NETWORK for mainnet
const customScripts = [OutOrdinalReveal];

// Demo key (do not use in production)
const privKey = hex.decode('0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a');
const pubKey = btc.utils.pubSchnorr(privKey);

// Example rune number (U128). Use a BigInt.
const RUNE = 12345678901234567890n;

const inscription: Inscription = {
  tags: { contentType: 'text/plain;charset=utf-8', rune: RUNE },
  body: utf8.decode('Inscription associated with a rune value.'),
};

const revealPayment = btc.p2tr(
  undefined,
  p2tr_ord_reveal(pubKey, [inscription]),
  NETWORK,
  false,
  customScripts
);
console.log('Reveal address:', revealPayment.address);

const tx = new btc.Transaction({ customScripts });
const FUNDING_TXID = '0000000000000000000000000000000000000000000000000000000000000000';
const FUNDING_INDEX = 0;
const FUNDING_AMOUNT = 3000n;
const FEE = 700n;

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

const parsed = parseWitness(tx.inputs[0].finalScriptWitness);
console.log('Parsed inscriptions:', parsed);