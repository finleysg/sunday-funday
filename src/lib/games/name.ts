// Random "<adjective> <animal>" game name generator (Heroku/Docker style).
// Used to avoid asking users to invent a name for every round.

const ADJECTIVES = [
  "tipsy",
  "reckless",
  "sneaky",
  "wandering",
  "rowdy",
  "sleepy",
  "fearless",
  "hopeful",
  "grumpy",
  "noble",
  "humble",
  "rambunctious",
  "spry",
  "jolly",
  "mellow",
  "stubborn",
  "lucky",
  "dapper",
  "scruffy",
  "majestic",
  "cunning",
  "drowsy",
  "spirited",
  "plucky",
  "wily",
  "feisty",
  "serene",
  "wistful",
  "cheeky",
  "rugged",
  "weary",
  "gallant",
  "earnest",
  "boisterous",
  "swift",
  "mighty",
  "patient",
  "curious",
  "stoic",
  "zealous",
  "rustic",
  "tidy",
  "tactful",
  "chatty",
  "quiet",
  "bold",
  "gentle",
  "hasty",
  "graceful",
  "clumsy",
];

const ANIMALS = [
  "albatross",
  "otter",
  "badger",
  "moose",
  "heron",
  "raccoon",
  "ferret",
  "panda",
  "marmot",
  "lynx",
  "wolverine",
  "puffin",
  "ibex",
  "narwhal",
  "kestrel",
  "jackal",
  "magpie",
  "okapi",
  "tapir",
  "stoat",
  "mongoose",
  "capybara",
  "lemur",
  "platypus",
  "axolotl",
  "armadillo",
  "porcupine",
  "wombat",
  "tortoise",
  "manatee",
  "owl",
  "raven",
  "falcon",
  "hawk",
  "osprey",
  "swan",
  "crane",
  "fox",
  "wolf",
  "bear",
  "beaver",
  "skunk",
  "weasel",
  "boar",
  "elk",
  "bison",
  "yak",
  "gazelle",
  "antelope",
  "hare",
];

export type RandomNameOptions = {
  taken?: ReadonlySet<string>;
  maxAttempts?: number;
};

export function generateGameName(opts: RandomNameOptions = {}): string {
  const taken = opts.taken;
  const maxAttempts = opts.maxAttempts ?? 25;
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = formatName(pick(ADJECTIVES), pick(ANIMALS));
    if (!taken || !taken.has(candidate)) return candidate;
  }
  // Vanishingly unlikely fallback: append a counter to keep it unique.
  let n = 2;
  while (true) {
    const candidate = `${formatName(pick(ADJECTIVES), pick(ANIMALS))} #${n}`;
    if (!taken || !taken.has(candidate)) return candidate;
    n++;
  }
}

function formatName(adj: string, animal: string): string {
  return `${capitalize(adj)} ${capitalize(animal)}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}
