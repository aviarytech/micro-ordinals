import * as btc from '@scure/btc-signer';
import { hex, utf8 } from '@scure/base';
import { OutOrdinalReveal, p2tr_ord_reveal, type Inscription, parseWitness } from '../src/index.ts';

const NETWORK = btc.utils.TEST_NETWORK; // or btc.NETWORK for mainnet
const customScripts = [OutOrdinalReveal];

// Demo key (do not use in production)
const privKey = hex.decode('0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a');
const pubKey = btc.utils.pubSchnorr(privKey);

const metadata = {
  app: 'my.cool.app',
  version: 1,
  author: 'alice',
  description: 'Asset with metadata stored via CBOR tag',
};

const inscription: Inscription = {
  tags: {
    contentType: 'application/json',
    metadata,
    // metaprotocol: 'my-proto-v1', // optional if you need to declare a protocol
  },
  body: utf8.decode(JSON.stringify({ hello: 'world', features: ['meta', 'tags'] })),
};

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
const FUNDING_TXID = '75ddabb27b8845f5247975c8a5ba7c6f336c4570708ebe230caf6db5217ae858';
const FUNDING_INDEX = 0;
const FUNDING_AMOUNT = 2500n;
const FEE = 600n;

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