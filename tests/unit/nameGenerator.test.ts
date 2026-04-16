import { describe, it, expect } from "vitest";
import {
  ANIMALS,
  ADJECTIVES,
  generateName,
  formatName,
} from "../../src/utils/nameGenerator";

const ORIGINAL_35_ANIMALS = [
  "Badger", "Falcon", "Otter", "Moose", "Cobra", "Raven", "Bison",
  "Gecko", "Panda", "Shark", "Viper", "Crane", "Hyena", "Lemur",
  "Newt", "Quail", "Sloth", "Tiger", "Whale", "Yak", "Alpaca",
  "Bobcat", "Coyote", "Dingo", "Eagle", "Ferret", "Goose", "Hawk",
  "Iguana", "Jackal", "Koala", "Llama", "Marten", "Osprey", "Parrot",
];

const ORIGINAL_35_ADJECTIVES = [
  "Rusty", "Turbo", "Chrome", "Steamy", "Clunky", "Sparky", "Greasy",
  "Riveted", "Welded", "Cranky", "Gritty", "Bolted", "Dented", "Oiled",
  "Wired", "Charged", "Plated", "Forged", "Tempered", "Galvanized",
  "Pneumatic", "Hydraulic", "Magnetic", "Atomic", "Diesel",
  "Overclocked", "Hardened", "Corroded", "Polished", "Hammered",
  "Torqued", "Pressurized", "Motorized", "Armored", "Scrappy",
];

describe("ANIMALS array", () => {
  it("3.1 every entry is a non-empty string", () => {
    for (let i = 0; i < ANIMALS.length; i++) {
      const entry = ANIMALS[i];
      expect(entry).toBeDefined();
      expect(entry).not.toBeNull();
      expect(typeof entry).toBe("string");
      expect(entry.length).toBeGreaterThan(0);
    }
  });

  it("3.2 contains no duplicate entries", () => {
    const unique = new Set(ANIMALS);
    expect(unique.size).toBe(ANIMALS.length);
  });

  it("3.3 all animals from the curated list are present", () => {
    const curatedSample = [
      "Wolf", "Lynx", "Wolverine", "Scorpion", "Mantis", "Hornet",
      "Raptor", "Condor", "Barracuda", "Panther", "Komodo", "Anaconda",
      "Rhino", "Warthog", "Vulture", "Stingray", "Piranha",
    ];
    for (const animal of curatedSample) {
      expect(ANIMALS).toContain(animal);
    }
  });

  it("3.4 all 35 original animals are present", () => {
    for (const animal of ORIGINAL_35_ANIMALS) {
      expect(ANIMALS).toContain(animal);
    }
  });

  it("3.5 has exactly 230 entries", () => {
    expect(ANIMALS).toHaveLength(230);
  });
});

describe("ADJECTIVES array", () => {
  it("3.6 every entry is a non-empty string", () => {
    for (let i = 0; i < ADJECTIVES.length; i++) {
      const entry = ADJECTIVES[i];
      expect(entry).toBeDefined();
      expect(entry).not.toBeNull();
      expect(typeof entry).toBe("string");
      expect(entry.length).toBeGreaterThan(0);
    }
  });

  it("3.7 contains no duplicate entries", () => {
    const unique = new Set(ADJECTIVES);
    expect(unique.size).toBe(ADJECTIVES.length);
  });

  it("3.8 all 35 original adjectives are present", () => {
    for (const adj of ORIGINAL_35_ADJECTIVES) {
      expect(ADJECTIVES).toContain(adj);
    }
  });

  it("3.9 has exactly 200 entries", () => {
    expect(ADJECTIVES).toHaveLength(200);
  });
});

describe("generateName()", () => {
  it("3.10 returns { adj, noun } with noun ending in 'bot'", () => {
    const result = generateName();
    expect(result).toHaveProperty("adj");
    expect(result).toHaveProperty("noun");
    expect(typeof result.adj).toBe("string");
    expect(typeof result.noun).toBe("string");
    expect(result.noun).toMatch(/bot$/);
  });
});

describe("formatName()", () => {
  it("3.11 returns the correct 'Adjective Nounbot' format", () => {
    expect(formatName("Turbo", "Falconbot")).toBe("Turbo Falconbot");
    expect(formatName("Rusty", "Sharkbot")).toBe("Rusty Sharkbot");
    expect(formatName("Chrome", "Viperbot")).toBe("Chrome Viperbot");
  });
});
