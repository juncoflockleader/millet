const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function fnv1a(input: string): number {
  let hash = FNV_OFFSET;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }

  return hash >>> 0;
}

function mix32(value: number): number {
  let mixed = value >>> 0;
  mixed += 0x6d2b79f5;
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  return (mixed ^ (mixed >>> 14)) >>> 0;
}

export class DeterministicRng {
  readonly seed: string;
  cursor: number;

  constructor(seed: string, cursor = 0) {
    this.seed = seed;
    this.cursor = cursor;
  }

  fork(label: string): DeterministicRng {
    return new DeterministicRng(`${this.seed}:${label}`, this.cursor);
  }

  nextUint32(): number {
    const value = mix32(fnv1a(`${this.seed}:${this.cursor}`));
    this.cursor += 1;
    return value;
  }

  nextFloat(): number {
    return this.nextUint32() / 0x100000000;
  }

  nextInt(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new Error(`maxExclusive must be a positive integer, got ${maxExclusive}`);
    }

    return Math.floor(this.nextFloat() * maxExclusive);
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error("Cannot pick from an empty list");
    }

    return items[this.nextInt(items.length)]!;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = this.nextInt(index + 1);
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
    }

    return shuffled;
  }
}
