const ADJECTIVES = [
  "Rusty", "Turbo", "Chrome", "Steamy", "Clunky", "Sparky", "Greasy",
  "Riveted", "Welded", "Cranky", "Gritty", "Bolted", "Dented", "Oiled",
  "Wired", "Charged", "Plated", "Forged", "Tempered", "Galvanized",
  "Pneumatic", "Hydraulic", "Magnetic", "Atomic", "Diesel",
  "Overclocked", "Hardened", "Corroded", "Polished", "Hammered",
  "Torqued", "Pressurized", "Motorized", "Armored", "Scrappy",
];

const ANIMALS = [
  "Badger", "Falcon", "Otter", "Moose", "Cobra", "Raven", "Bison",
  "Gecko", "Panda", "Shark", "Viper", "Crane", "Hyena", "Lemur",
  "Newt", "Quail", "Sloth", "Tiger", "Whale", "Yak", "Alpaca",
  "Bobcat", "Coyote", "Dingo", "Eagle", "Ferret", "Goose", "Hawk",
  "Iguana", "Jackal", "Koala", "Llama", "Marten", "Osprey", "Parrot",
];

export function generateName(): { adj: string; noun: string } {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return { adj, noun: `${animal}bot` };
}

export function formatName(adj: string, noun: string): string {
  return `${adj} ${noun}`;
}
