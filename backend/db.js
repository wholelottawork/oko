import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, 'oko.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    otp_enabled INTEGER DEFAULT 0,
    otp_secret TEXT,
    registration_complete INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS traders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    ai_model_id TEXT,
    exchange_id TEXT,
    strategy_id TEXT,
    strategy_name TEXT,
    is_running INTEGER DEFAULT 0,
    show_in_competition INTEGER DEFAULT 0,
    initial_balance REAL DEFAULT 10000,
    scan_interval_minutes INTEGER DEFAULT 15,
    is_cross_margin INTEGER DEFAULT 0,
    custom_prompt TEXT,
    system_prompt_template TEXT,
    use_ai500 INTEGER DEFAULT 0,
    use_oi_top INTEGER DEFAULT 0,
    btc_eth_leverage REAL DEFAULT 5,
    altcoin_leverage REAL DEFAULT 3,
    trading_symbols TEXT,
    start_time TEXT,
    call_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ai_models (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    enabled INTEGER DEFAULT 0,
    api_key TEXT,
    custom_api_url TEXT,
    custom_model_name TEXT,
    has_system_key INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS exchanges (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    exchange_type TEXT NOT NULL,
    account_name TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'cex',
    enabled INTEGER DEFAULT 0,
    api_key TEXT,
    secret_key TEXT,
    passphrase TEXT,
    testnet INTEGER DEFAULT 0,
    hyperliquid_wallet_addr TEXT,
    aster_user TEXT,
    aster_signer TEXT,
    aster_private_key TEXT,
    lighter_wallet_addr TEXT,
    lighter_private_key TEXT,
    lighter_api_key_private_key TEXT,
    lighter_api_key_index INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS strategies (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    is_active INTEGER DEFAULT 0,
    is_default INTEGER DEFAULT 0,
    is_public INTEGER DEFAULT 0,
    config_visible INTEGER DEFAULT 1,
    config TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS debates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    strategy_id TEXT,
    status TEXT DEFAULT 'pending',
    symbol TEXT NOT NULL,
    interval_minutes INTEGER DEFAULT 15,
    prompt_variant TEXT DEFAULT 'balanced',
    trader_id TEXT,
    max_rounds INTEGER DEFAULT 3,
    current_round INTEGER DEFAULT 0,
    final_decision TEXT,
    final_decisions TEXT,
    auto_execute INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS debate_participants (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    ai_model_id TEXT NOT NULL,
    ai_model_name TEXT DEFAULT '',
    provider TEXT DEFAULT '',
    personality TEXT NOT NULL,
    color TEXT DEFAULT '#888',
    speak_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES debates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS debate_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    round INTEGER DEFAULT 1,
    ai_model_id TEXT,
    ai_model_name TEXT DEFAULT '',
    provider TEXT DEFAULT '',
    personality TEXT,
    message_type TEXT DEFAULT 'argument',
    content TEXT NOT NULL,
    decision TEXT,
    decisions TEXT,
    confidence REAL DEFAULT 50,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES debates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS debate_votes (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    ai_model_id TEXT,
    ai_model_name TEXT DEFAULT '',
    action TEXT,
    symbol TEXT,
    confidence REAL DEFAULT 50,
    leverage REAL,
    position_pct REAL,
    stop_loss_pct REAL,
    take_profit_pct REAL,
    reasoning TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES debates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS backtest_runs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    label TEXT,
    state TEXT DEFAULT 'idle',
    version INTEGER DEFAULT 1,
    config TEXT DEFAULT '{}',
    summary TEXT DEFAULT '{}',
    last_error TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS equity_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trader_id TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now')),
    equity REAL DEFAULT 0,
    pnl REAL DEFAULT 0,
    pnl_pct REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trader_id TEXT NOT NULL,
    cycle_number INTEGER DEFAULT 0,
    timestamp TEXT DEFAULT (datetime('now')),
    system_prompt TEXT DEFAULT '',
    input_prompt TEXT DEFAULT '',
    cot_trace TEXT DEFAULT '',
    decision_json TEXT DEFAULT '{}',
    account_state TEXT DEFAULT '{}',
    positions TEXT DEFAULT '[]',
    candidate_coins TEXT DEFAULT '[]',
    decisions_data TEXT DEFAULT '[]',
    execution_log TEXT DEFAULT '[]',
    success INTEGER DEFAULT 1,
    error_message TEXT
  );

  CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trader_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,
    entry_price REAL DEFAULT 0,
    mark_price REAL DEFAULT 0,
    quantity REAL DEFAULT 0,
    leverage REAL DEFAULT 1,
    unrealized_pnl REAL DEFAULT 0,
    unrealized_pnl_pct REAL DEFAULT 0,
    liquidation_price REAL DEFAULT 0,
    margin_used REAL DEFAULT 0,
    is_open INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS position_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trader_id TEXT NOT NULL,
    exchange_id TEXT,
    exchange_type TEXT DEFAULT 'binance',
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,
    quantity REAL DEFAULT 0,
    entry_quantity REAL DEFAULT 0,
    entry_price REAL DEFAULT 0,
    entry_order_id TEXT,
    entry_time TEXT,
    exit_price REAL DEFAULT 0,
    exit_order_id TEXT,
    exit_time TEXT,
    realized_pnl REAL DEFAULT 0,
    fee REAL DEFAULT 0,
    leverage REAL DEFAULT 1,
    status TEXT DEFAULT 'closed',
    close_reason TEXT DEFAULT 'manual',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`)

export default db
