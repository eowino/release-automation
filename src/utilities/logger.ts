import chalk from 'chalk';

export const log = console.log;

export function success(str: string) {
  log(chalk.green(str));
}

export function danger(str: string) {
  log(chalk.red(str));
}

export function bold(str: string) {
  log(chalk.bold(str));
}

export function underline(str: string) {
  log(chalk.underline(str));
}
