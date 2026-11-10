import crypto from 'node:crypto';

// Language-neutral random pseudonyms, e.g. "Quiet Heron 482".
const ADJECTIVES = ['Quiet', 'Calm', 'Bright', 'Gentle', 'Swift', 'Patient', 'Curious', 'Steady', 'Clear', 'Kind',
  'Brave', 'Silver', 'Golden', 'Misty', 'Northern', 'Eastern', 'Autumn', 'Spring', 'Winter', 'Summer', 'Amber', 'Jade', 'Cobalt', 'Lunar'];
const NOUNS = ['Heron', 'Pine', 'River', 'Harbor', 'Magpie', 'Crane', 'Maple', 'Ridge', 'Lantern', 'Willow', 'Comet', 'Island',
  'Meadow', 'Falcon', 'Cedar', 'Breeze', 'Orchid', 'Badger', 'Otter', 'Swallow', 'Summit', 'Tide', 'Ginkgo', 'Camellia'];

export function randomPseudonym(): string {
  const a = ADJECTIVES[crypto.randomInt(ADJECTIVES.length)];
  const n = NOUNS[crypto.randomInt(NOUNS.length)];
  return `${a} ${n} ${crypto.randomInt(100, 1000)}`;
}
