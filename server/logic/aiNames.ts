/**
 * AI player name generation — server-side copy to avoid cross-boundary imports.
 * AI bots get household-appliance "-roid" nouns instead of animal "-bot" nouns.
 */

const ADJECTIVES = [
  "Rusty", "Turbo", "Chrome", "Steamy", "Clunky", "Sparky", "Greasy",
  "Riveted", "Welded", "Cranky", "Gritty", "Bolted", "Dented", "Oiled",
  "Wired", "Charged", "Plated", "Forged", "Tempered", "Galvanized",
  "Pneumatic", "Hydraulic", "Magnetic", "Atomic", "Diesel",
  "Overclocked", "Hardened", "Corroded", "Polished", "Hammered",
  "Torqued", "Pressurized", "Motorized", "Armored", "Scrappy",
];

const HOUSEHOLD_ROID = [
  "Fridgeroid", "Toasteroid", "Blenderoid", "Vacuumroid", "Microwaveroid",
  "Dishwasheroid", "Ovenroid", "Kettleroid", "Mixeroid", "Grilleroid",
  "Washeroid", "Dryeroid", "Ironroid", "Fanroid", "Lamproid",
  "Clockroid", "Radioroid", "Speakeroid", "Printeroid", "Scanneroid",
  "Routeroid", "Moproid", "Broomroid", "Heateroid", "Cooleroid",
  "Juiceroid", "Chopperoid", "Steameroid", "Fryeroid", "Bakeroid",
  "Freezeroid", "Humidroid", "Showeroid", "Sinkroid", "Stoveroid",
];

export function generateAIName(
  takenAdjs: Set<string>,
  takenNouns: Set<string>
): { adj: string; noun: string } {
  const availAdjs = ADJECTIVES.filter((a) => !takenAdjs.has(a));
  const availNouns = HOUSEHOLD_ROID.filter((n) => !takenNouns.has(n));

  const adj = availAdjs.length > 0
    ? availAdjs[Math.floor(Math.random() * availAdjs.length)]
    : ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];

  const noun = availNouns.length > 0
    ? availNouns[Math.floor(Math.random() * availNouns.length)]
    : HOUSEHOLD_ROID[Math.floor(Math.random() * HOUSEHOLD_ROID.length)];

  return { adj, noun };
}
