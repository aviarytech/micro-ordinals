#!/usr/bin/env bash
set -euo pipefail

# Requirements: bitcoind and bitcoin-cli in PATH.
# This script initializes a fresh regtest datadir, starts bitcoind, funds reveal addresses for each mode,
# and asks the Node helper to build reveal tx hex. Logs are saved under logs/.

DIR=$(cd "$(dirname "$0")/.." && pwd)
LOGS="$DIR/logs"
DATADIR="$DIR/.regtest"
mkdir -p "$LOGS" "$DATADIR"

# Prefer locally downloaded Bitcoin Core if present
if [ -d "/workspace/.bitcoin-core/bin" ]; then
  export PATH="/workspace/.bitcoin-core/bin:$PATH"
fi

BITCOIND=${BITCOIND:-bitcoind}
CLI=${CLI:-bitcoin-cli}
RPCPORT=${RPCPORT:-18443}
PORT=${PORT:-18444}
WALLET_NAME=${WALLET_NAME:-w1}
WALLET_ARG="-rpcwallet=$WALLET_NAME"

start_node() {
  "$BITCOIND" -regtest \
    -datadir="$DATADIR" \
    -server -daemon \
    -txindex=1 \
    -rpcuser=user -rpcpassword=pass \
    -rpcallowip=127.0.0.1 \
    -rpcport=$RPCPORT \
    -port=$PORT \
    -fallbackfee=0.0002 \
    -prune=0 >/dev/null
  # Wait for RPC
  for i in {1..30}; do
    if "$CLI" -regtest -rpcuser=user -rpcpassword=pass -rpcport=$RPCPORT getblockchaininfo >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
}

ensure_wallet() {
  # Create wallet if not exists; ignore error if already exists
  if ! "$CLI" -regtest -rpcuser=user -rpcpassword=pass -rpcport=$RPCPORT listwallets | jq -e '.[] | select(.=="'$WALLET_NAME'")' >/dev/null; then
    "$CLI" -regtest -rpcuser=user -rpcpassword=pass -rpcport=$RPCPORT createwallet "$WALLET_NAME" >/dev/null
  fi
  # Load wallet (ignore error if already loaded)
  "$CLI" -regtest -rpcuser=user -rpcpassword=pass -rpcport=$RPCPORT loadwallet "$WALLET_NAME" >/dev/null 2>&1 || true
}

stop_node() {
  "$CLI" -regtest -rpcuser=user -rpcpassword=pass -rpcport=$RPCPORT stop >/dev/null || true
}

new_address() {
  "$CLI" -regtest -rpcuser=user -rpcpassword=pass -rpcport=$RPCPORT $WALLET_ARG getnewaddress '' bech32m
}

mine() {
  local blocks=${1:-1}
  local addr
  addr=$(new_address)
  "$CLI" -regtest -rpcuser=user -rpcpassword=pass -rpcport=$RPCPORT generatetoaddress "$blocks" "$addr" >/dev/null
}

send_to() {
  local addr=$1
  local amount=$2 # BTC
  "$CLI" -regtest -rpcuser=user -rpcpassword=pass -rpcport=$RPCPORT $WALLET_ARG -named sendtoaddress address="$addr" amount="$amount"
}

# Clean previous run
stop_node || true
rm -rf "$DATADIR/regtest"
start_node
ensure_wallet

# Prefund wallet
mine 101

run_mode() {
  local mode=$1
  local fee_sat=$2
  local log="$LOGS/$mode.log"
  echo "Running $mode ..." | tee "$log"
  local out
  out=$(MODE="$mode" node "$DIR/scripts/reveal.js" | tee -a "$log")
  local addr
  addr=$(echo "$out" | grep '^REVEAL_ADDRESS=' | cut -d= -f2)
  echo "Funding $addr" | tee -a "$log"
  local txid
  txid=$(send_to "$addr" 0.001)
  echo "FUNDING_TXID=$txid" | tee -a "$log"
  mine 1
  # Fetch vout and amount
  local vout amount
  vout=$($CLI -regtest -rpcuser=user -rpcpassword=pass -rpcport=$RPCPORT $WALLET_ARG gettransaction "$txid" | jq -r '.details[] | select(.address=="'$addr'") | .vout' | head -n1)
  amount=$($CLI -regtest -rpcuser=user -rpcpassword=pass -rpcport=$RPCPORT gettxout "$txid" "$vout" | jq -r '.value' )
  # Convert BTC to sat
  local amount_sat
  amount_sat=$(python3 - <<PY
from decimal import Decimal
print(int(Decimal("$amount")*Decimal(10**8)))
PY
)
  echo "FUNDING_INDEX=$vout" | tee -a "$log"
  echo "FUNDING_AMOUNT_SAT=$amount_sat" | tee -a "$log"
  # Build reveal tx
  local reveal
  reveal=$(MODE="$mode" FEE="$fee_sat" FUNDING_TXID="$txid" FUNDING_INDEX="$vout" FUNDING_AMOUNT="$amount_sat" node "$DIR/scripts/reveal.js" | tee -a "$log")
  local hex
  hex=$(echo "$reveal" | grep '^REVEAL_TX_HEX=' | cut -d= -f2)
  echo "Broadcasting reveal tx" | tee -a "$log"
  local rid
  rid=$($CLI -regtest -rpcuser=user -rpcpassword=pass -rpcport=$RPCPORT sendrawtransaction "$hex")
  echo "REVEAL_TXID=$rid" | tee -a "$log"
  mine 1
}

run_mode simple 500
run_mode metadata 600
run_mode batch 1200

stop_node

echo "Done. Logs in $LOGS"