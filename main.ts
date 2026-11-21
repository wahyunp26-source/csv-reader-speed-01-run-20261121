import { setFlagsFromString } from 'node:v8';
setFlagsFromString('--no-incremental-marking');
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { run } from './solve.js';

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const cases = JSON.parse(readFileSync(`${INPUT_DIR}/cases.json`, 'utf8'));
const answers = cases.map((c) => run(c.input));
mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(`${OUTPUT_DIR}/answers.json`, JSON.stringify(answers));
