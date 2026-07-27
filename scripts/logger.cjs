/**
 * Firebase Migration Toolkit - Logger
 * التسجيل والألوان في الطرفية
 */
const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
};

function success(message) {
  console.log(`${COLORS.green}✓${COLORS.reset} ${message}`);
}

function warn(message) {
  console.log(`${COLORS.yellow}⚠${COLORS.reset} ${message}`);
}

function error(message) {
  console.log(`${COLORS.red}✗${COLORS.reset} ${message}`);
}

function info(message) {
  console.log(`${COLORS.cyan}ℹ${COLORS.reset} ${message}`);
}

function divider() {
  console.log(`${COLORS.gray}────────────────────────────────────────${COLORS.reset}`);
}

function report(title, value) {
  console.log(`${COLORS.bold}${title.padEnd(25)}${COLORS.reset} ${value}`);
}

module.exports = {
  success,
  warn,
  error,
  info,
  divider,
  report,
};
