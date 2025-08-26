import * as btc from '@scure/btc-signer';
import { hex, utf8 } from '@scure/base';
import { OutOrdinalReveal, p2tr_ord_reveal, type Inscription, parseWitness } from '../src/index.ts';
import { brotliCompressSync, constants as zlibc } from 'node:zlib';

const NETWORK = btc.utils.TEST_NETWORK; // or btc.NETWORK for mainnet
const customScripts = [OutOrdinalReveal];

// Demo key (do not use in production)
const privKey = hex.decode('0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a');
const pubKey = btc.utils.pubSchnorr(privKey);

const json = JSON.stringify({ example: 'brotli compressed json', count: 3, ok: true });
const compressed = brotliCompressSync(utf8.decode(json), {
  params: {
    [zlibc.BROTLI_PARAM_MODE]: zlibc.BROTLI_MODE_TEXT,
    [zlibc.BROTLI_PARAM_QUALITY]: zlibc.BROTLI_MAX_QUALITY,
    [zlibc.BROTLI_PARAM_SIZE_HINT]: json.length,
  },
});

const inscription: Inscription = {
  tags: { contentType: 'application/json', contentEncoding: 'br' },
  body: compressed,
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
const FUNDING_AMOUNT = 3500n;
const FEE = 800n;

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