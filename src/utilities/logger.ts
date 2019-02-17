import chalk from 'chalk';

export const log = console.log;

export function info(...values: any) {
  log('\n', ...values);
}

export function success(...values: any) {
  log('\n', chalk.green(values));
}

export function danger(...values: any) {
  log('\n', chalk.red(values));
}

export function bold(...values: any) {
  log('\n', chalk.bold(values));
}

export function underline(...values: any) {
  log('\n', chalk.underline(values));
}
