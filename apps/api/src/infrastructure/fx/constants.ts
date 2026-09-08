/** Pair Conversion already returns DOP per 1 USD. Do not invert this rate. */
export const EXCHANGE_RATE_API_BASE_URL = 'https://v6.exchangerate-api.com/v6';

export const EXCHANGE_RATE_API_PAIR_PATH = 'pair/USD/DOP';

export const EXCHANGE_RATE_API_KEY_ENV = 'EXCHANGE_RATE_API_KEY';

/** Bounded so a hung provider cannot stall confirmation indefinitely. */
export const EXCHANGE_RATE_API_TIMEOUT_MS = 3_000;

export const EXCHANGE_RATE_API_SOURCE = 'ExchangeRate-API';
