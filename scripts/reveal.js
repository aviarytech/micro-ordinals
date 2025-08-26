import * as btc from '@scure/btc-signer';
import { hex, utf8 } from '@scure/base';
import { OutOrdinalReveal, p2tr_ord_reveal, parseWitness } from '../index.js';

// Usage:
// MODE=simple|metadata|batch node scripts/reveal.js
// Optionally set PRIV_HEX, FEE, FUNDING_TXID, FUNDING_INDEX, FUNDING_AMOUNT
// Prints lines prefixed with KEY=VALUE for easy parsing.

const MODE = process.env.MODE || 'simple';
const PRIV_HEX = process.env.PRIV_HEX || '0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a';
const FEE = BigInt(process.env.FEE || '500');
const FUNDING_TXID = process.env.FUNDING_TXID || '';
const FUNDING_INDEX = Number.isFinite(Number(process.env.FUNDING_INDEX)) ? Number(process.env.FUNDING_INDEX) : undefined;
const FUNDING_AMOUNT = process.env.FUNDING_AMOUNT ? BigInt(process.env.FUNDING_AMOUNT) : undefined;

// Construct a regtest network from testnet params with bech32 hrp 'bcrt'
// This works for taproot bech32m addresses and WIF (same as testnet)
const REGTEST = { ...btc.TEST_NETWORK, bech32: 'bcrt' };
const customScripts = [OutOrdinalReveal];

function buildInscriptions(mode) {
  if (mode === 'simple') {
    return [{ tags: { contentType: 'text/plain;charset=utf-8' }, body: utf8.decode('Hello, Ordinals!') }];
  }
  if (mode === 'metadata') {
    const metadata = { app: 'my.cool.app', version: 1, author: 'alice' };
    return [{ tags: { contentType: 'application/json', metadata }, body: utf8.decode(JSON.stringify({ hello: 'world' })) }];
  }
  if (mode === 'batch') {
    return [
      { tags: { contentType: 'text/plain;charset=utf-8' }, body: utf8.decode('First inscription in batch') },
      { tags: { contentType: 'application/json' }, body: utf8.decode(JSON.stringify({ name: 'second', kind: 'json' })) },
      { tags: { contentType: 'text/markdown;charset=utf-8' }, body: utf8.decode('# Third inscription\nSome markdown text.') },
    ];
  }
  throw new Error(`Unknown MODE=${mode}`);
}

function main() {
  const privKey = hex.decode(PRIV_HEX);
  const pubKey = btc.utils.pubSchnorr(privKey);
  const inscriptions = buildInscriptions(MODE);

  const revealPayment = btc.p2tr(undefined, p2tr_ord_reveal(pubKey, inscriptions), REGTEST, false, customScripts);
  console.log(`MODE=${MODE}`);
  console.log(`REVEAL_ADDRESS=${revealPayment.address}`);

  if (FUNDING_TXID && Number.isInteger(FUNDING_INDEX) && typeof FUNDING_AMOUNT === 'bigint') {
    const tx = new btc.Transaction({ customScripts });
    tx.addInput({ ...revealPayment, txid: FUNDING_TXID, index: FUNDING_INDEX, witnessUtxo: { script: revealPayment.script, amount: FUNDING_AMOUNT } });
    const changeAddr = revealPayment.address;
    tx.addOutputAddress(changeAddr, FUNDING_AMOUNT - FEE, REGTEST);
    tx.sign(privKey, undefined, new Uint8Array(32));
    tx.finalize();

    const txHex = hex.encode(tx.extract());
    console.log(`REVEAL_TX_HEX=${txHex}`);
    const parsed = parseWitness(tx.inputs[0].finalScriptWitness);
    console.log(`PARSED_COUNT=${parsed?.length || 0}`);
  }
}

try {
  main();
} catch (e) {
  console.error(`ERROR=${e?.message || e}`);
  process.exit(1);
}