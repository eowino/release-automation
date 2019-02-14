import chalk from 'chalk';

export const log = console.log;

export function success(...values: any) {
  log(chalk.green(values));
}

export function danger(...values: any) {
  log(chalk.red(values));
}

export function bold(...values: any) {
  log(chalk.bold(values));
}

export function underline(...values: any) {
  log(chalk.underline(values));
}
