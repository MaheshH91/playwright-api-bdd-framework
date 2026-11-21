const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

const timestamp = (): string => new Date().toISOString().slice(11, 23);

const write = (color: string, label: string, message: string): void =>
  // eslint-disable-next-line no-console
  console.log(`${COLORS.dim}[${timestamp()}]${COLORS.reset} ${color}${label}${COLORS.reset} ${message}`);

export const logger = {
  info: (message: string): void => write(COLORS.cyan, 'INFO ', message),
  success: (message: string): void => write(COLORS.green, 'PASS ', message),
  warn: (message: string): void => write(COLORS.yellow, 'WARN ', message),
  error: (message: string): void => write(COLORS.red, 'FAIL ', message),
  step: (message: string): void => write(COLORS.dim, 'STEP ', message)
};
