import { add, multiply } from './utils';

export function computeScore(x: number, y: number): number {
  return multiply(add(x, y), 2);
}

export function run(): number {
  return computeScore(1, 2);
}
