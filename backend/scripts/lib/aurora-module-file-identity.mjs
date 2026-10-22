import {basename} from 'node:path';

// The MOD container has a filesystem stem, unlike its internal resource refs.
// Bounded ASCII filenames may contain internal spaces; resource refs stay strict.
export function isModuleFileStem(value) {
  return typeof value === 'string' && value === value.trim()
    && /^[a-z0-9_ -]{1,32}$/iu.test(value);
}

export function moduleFileNameMatches(path,stem) {
  return typeof path === 'string' && isModuleFileStem(stem)
    && basename(path).toLowerCase() === `${stem}.mod`.toLowerCase();
}
