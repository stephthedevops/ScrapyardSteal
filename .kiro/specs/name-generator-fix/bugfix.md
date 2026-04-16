# Bugfix Requirements Document

## Introduction

The `ANIMALS` array in `src/utils/nameGenerator.ts` is corrupted. Starting around the 36th entry, array elements lose their string quotes and proper formatting, resulting in bare identifiers (e.g. `Quokka`, `Panda`) that TypeScript interprets as undefined variable references. This causes a compile/runtime error that prevents the entire module from loading, which breaks name generation for all players. Additionally, the corrupted section contains hundreds of duplicate entries and animals that don't fit the game's scrapyard/robot theme (e.g. Cow, Pig, Sheep, Chicken).

Beyond the corruption fix, both the `ADJECTIVES` and `ANIMALS` arrays need to be expanded to exactly 200 unique entries each to provide sufficient variety for player name generation. The `ADJECTIVES` array currently has 35 entries and the `ANIMALS` array currently has ~35 valid entries (before the corrupted section). Both must grow to 200 while retaining all original entries and maintaining the scrapyard/robot/mechanical theme.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the `nameGenerator.ts` module is imported THEN the system fails to compile/load due to unquoted bare identifiers in the `ANIMALS` array (e.g. `,Quokka,Panda,Koala,...` without string quotes)

1.2 WHEN the `ANIMALS` array is inspected THEN the system contains duplicate animal entries that appear in both the properly-quoted section and the corrupted unquoted section (e.g. Panda, Koala, Otter, Lemur, Cobra, Eagle, Falcon, Hawk, Iguana, Jackal, etc.)

1.3 WHEN the `ANIMALS` array is inspected THEN the system contains animals that do not fit the scrapyard/robot theme of the game (e.g. Cow, Pig, Sheep, Chicken, Rooster, Hen, Kitten, Puppy, Dog, Cat, etc.)

1.4 WHEN the `ANIMALS` array length is checked THEN the system does not have exactly 200 unique entries (the valid portion has only ~35 entries, while the corrupted portion inflates the count with invalid bare identifiers)

1.5 WHEN the `ADJECTIVES` array length is checked THEN the system has only 35 unique entries, which is insufficient for the desired variety of 200 unique name combinations per component

### Expected Behavior (Correct)

2.1 WHEN the `nameGenerator.ts` module is imported THEN the system SHALL compile and load without errors, with all entries in the `ANIMALS` array being properly quoted string literals

2.2 WHEN the `ANIMALS` array is inspected THEN the system SHALL contain no duplicate animal entries

2.3 WHEN the `ANIMALS` array is inspected THEN the system SHALL contain only animals that fit the scrapyard/robot theme (tough, wild, or mechanical-sounding animals appropriate for bot names in a scrapyard setting)

2.4 WHEN the `ANIMALS` array length is checked THEN the system SHALL contain exactly 200 unique, properly quoted, theme-appropriate animal entries

2.5 WHEN the `ADJECTIVES` array length is checked THEN the system SHALL contain exactly 200 unique, properly quoted, theme-appropriate adjective entries (scrapyard/robot/mechanical theme)

2.6 WHEN the `ADJECTIVES` array is inspected THEN the system SHALL contain no duplicate adjective entries

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `generateName()` is called with no taken names THEN the system SHALL CONTINUE TO return an object with `adj` and `noun` properties where `noun` ends with "bot"

3.2 WHEN `generateName()` is called with taken adjectives and nouns THEN the system SHALL CONTINUE TO avoid returning taken adjectives and nouns when alternatives are available

3.3 WHEN `formatName(adj, noun)` is called THEN the system SHALL CONTINUE TO return a string in the format "Adjective Nounbot" (e.g. "Turbo Falconbot")

3.4 WHEN the original properly-quoted animals from the first 35 entries are checked THEN the system SHALL CONTINUE TO include them in the array (Badger, Falcon, Otter, Moose, Cobra, Raven, Bison, Gecko, Panda, Shark, Viper, Crane, Hyena, Lemur, Newt, Quail, Sloth, Tiger, Whale, Yak, Alpaca, Bobcat, Coyote, Dingo, Eagle, Ferret, Goose, Hawk, Iguana, Jackal, Koala, Llama, Marten, Osprey, Parrot)

3.5 WHEN the original 35 adjectives are checked THEN the system SHALL CONTINUE TO include them in the `ADJECTIVES` array (Rusty, Turbo, Chrome, Steamy, Clunky, Sparky, Greasy, Riveted, Welded, Cranky, Gritty, Bolted, Dented, Oiled, Wired, Charged, Plated, Forged, Tempered, Galvanized, Pneumatic, Hydraulic, Magnetic, Atomic, Diesel, Overclocked, Hardened, Corroded, Polished, Hammered, Torqued, Pressurized, Motorized, Armored, Scrappy)
