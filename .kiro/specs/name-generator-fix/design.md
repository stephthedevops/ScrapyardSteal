# Name Generator Fix — Bugfix Design

## Overview

The `ANIMALS` array in `src/utils/nameGenerator.ts` is corrupted starting at the 36th entry. Entries lose their string quotes, becoming bare identifiers that cause TypeScript compilation errors. The corrupted section also introduces hundreds of duplicates and theme-inappropriate animals (farm animals, pets, insects) into a scrapyard/robot-themed game. The fix will remove the entire corrupted section, deduplicate the array, curate entries for theme fitness, and expand the array to exactly 200 unique theme-appropriate entries. Additionally, the `ADJECTIVES` array must be expanded from its current 35 entries to exactly 200 unique entries, all fitting the scrapyard/robot/mechanical theme. Both arrays must retain all original entries.

## Glossary

- **Bug_Condition (C)**: An entry in the `ANIMALS` array that is either (a) an unquoted bare identifier, (b) a duplicate of another entry, or (c) not fitting the scrapyard/robot theme
- **Property (P)**: Every entry in `ANIMALS` is a properly quoted, unique, theme-appropriate string literal, and the module compiles without errors
- **Preservation**: The `generateName()` and `formatName()` functions continue to behave identically — returning `{ adj, noun }` with "bot" suffix and "Adjective Nounbot" format — and the original 35 valid animals and original 35 valid adjectives are retained
- **ANIMALS**: The `const ANIMALS` string array in `src/utils/nameGenerator.ts` used as the noun pool for player name generation
- **ADJECTIVES**: The `const ADJECTIVES` string array in `src/utils/nameGenerator.ts` used as the adjective pool for player name generation
- **generateName()**: The function in `src/utils/nameGenerator.ts` that picks a random adjective and animal (with "bot" suffix) while avoiding taken names
- **formatName()**: The function in `src/utils/nameGenerator.ts` that joins an adjective and noun into a display string

## Bug Details

### Bug Condition

The bug manifests when the `nameGenerator.ts` module is imported. Starting after the 35th entry ("Parrot"), the `ANIMALS` array contains bare identifiers without string quotes (e.g. `,Quokka,Panda,Koala,...`). TypeScript treats these as undefined variable references, causing compilation failure. Additionally, the corrupted section contains duplicates of animals already in the valid section and animals inappropriate for the game's scrapyard theme.

**Formal Specification:**
```
FUNCTION isBugCondition(entry, index, array)
  INPUT: entry from ANIMALS array, its index, full array
  OUTPUT: boolean

  isUnquoted := entry is NOT a valid string literal (bare identifier)
  isDuplicate := array.indexOf(entry) !== index
  isOffTheme := entry IN ["Cow", "Pig", "Sheep", "Chicken", "Rooster", "Hen",
                           "Kitten", "Puppy", "Dog", "Cat", "Rabbit", "Hamster",
                           "Gerbil", "Fawn", "Calf", "Colt", "Foal", "Kid",
                           "Ewe", "Ram", "Bull", "Ox", "Mule", "Donkey",
                           "Goat", "Horse", "Beehive", "Ant", "Bee", "Wasp",
                           "Mosquito", "Ladybug", "Butterfly", "Moth",
                           "Cockroach", "Aphid", "Earwig", "Silverfish",
                           "Pigeon", "Dove", "Sparrow", "Robin", "Duck",
                           "Turkey", "Peacock", "Swan", "Flamingo", "Pelican",
                           "Seagull", "Stork", "Heron", ...]

  RETURN isUnquoted OR isDuplicate OR isOffTheme
END FUNCTION
```

### Examples

- `Quokka` (unquoted) → TypeScript error "Cannot find name 'Quokka'" — should be `"Quokka"` or removed
- `"Falcon"` appears in position 2 (valid) AND `Falcon` appears again unquoted in the corrupted section — duplicate
- `Cow`, `Pig`, `Sheep`, `Chicken` — farm animals that don't fit a scrapyard/robot theme
- `Ant`, `Bee`, `Mosquito`, `Ladybug` — insects that don't evoke the mechanical/tough aesthetic
- `Kitten`, `Puppy`, `Dog`, `Cat` — domestic pets, not scrapyard-appropriate

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `generateName()` must continue to return `{ adj, noun }` where `noun` ends with "bot"
- `generateName()` must continue to avoid taken adjectives and nouns when alternatives are available
- `formatName(adj, noun)` must continue to return `"Adjective Nounbot"` format
- The original 35 properly-quoted animals must remain in the array: Badger, Falcon, Otter, Moose, Cobra, Raven, Bison, Gecko, Panda, Shark, Viper, Crane, Hyena, Lemur, Newt, Quail, Sloth, Tiger, Whale, Yak, Alpaca, Bobcat, Coyote, Dingo, Eagle, Ferret, Goose, Hawk, Iguana, Jackal, Koala, Llama, Marten, Osprey, Parrot
- The original 35 adjectives must remain in the `ADJECTIVES` array: Rusty, Turbo, Chrome, Steamy, Clunky, Sparky, Greasy, Riveted, Welded, Cranky, Gritty, Bolted, Dented, Oiled, Wired, Charged, Plated, Forged, Tempered, Galvanized, Pneumatic, Hydraulic, Magnetic, Atomic, Diesel, Overclocked, Hardened, Corroded, Polished, Hammered, Torqued, Pressurized, Motorized, Armored, Scrappy

**Scope:**
All inputs that do NOT involve the `ANIMALS` or `ADJECTIVES` array content should be completely unaffected by this fix. This includes:
- The `generateName()` function logic (no changes)
- The `formatName()` function logic (no changes)
- Any callers of these functions throughout the codebase

## Hypothesized Root Cause

Based on the bug description, the most likely cause is:

1. **Copy-Paste Corruption**: Someone pasted a large list of animals from an external source (likely a plain-text list) directly into the array without adding string quotes around each entry. The pasted content started with a comma after "Parrot" and continued as bare identifiers separated by commas.

2. **No Curation Pass**: The pasted list was a generic animal list, not curated for the scrapyard/robot theme. It included every category of animal (farm, pet, insect, bird, wild) without filtering.

3. **No Deduplication**: Many animals from the original 35 entries (Falcon, Eagle, Hawk, Cobra, etc.) were duplicated in the pasted list since it was a comprehensive animal list.

4. **No Compilation Check**: The corrupted file was committed without running `tsc` or building the project, so the syntax errors went undetected.

## Correctness Properties

Property 1: Bug Condition — All ANIMALS Entries Are Valid Strings

_For any_ entry in the `ANIMALS` array, the entry SHALL be of type `string`, non-empty, and not `undefined` or `null`, ensuring the module compiles and loads without errors.

**Validates: Requirements 2.1**

Property 2: Bug Condition — No Duplicate Animals

_For any_ pair of entries in the `ANIMALS` array at indices `i` and `j` where `i !== j`, the entries SHALL be distinct (case-insensitive), ensuring no duplicates exist.

**Validates: Requirements 2.2**

Property 3: Bug Condition — Theme-Inappropriate Animals Removed

_For any_ entry in the `ANIMALS` array, the entry SHALL NOT be in the known blocklist of theme-inappropriate animals (farm animals, domestic pets, insects, generic birds), ensuring all entries fit the scrapyard/robot theme.

**Validates: Requirements 2.3**

Property 4: Bug Condition — ANIMALS Array Has Exactly 200 Entries

_For the_ `ANIMALS` array, the array length SHALL be exactly 200, and all entries SHALL be unique, ensuring sufficient variety for player name generation.

**Validates: Requirements 2.4**

Property 5: Bug Condition — ADJECTIVES Array Has Exactly 200 Entries

_For the_ `ADJECTIVES` array, the array length SHALL be exactly 200, and all entries SHALL be unique, ensuring sufficient variety for player name generation.

**Validates: Requirements 2.5, 2.6**

Property 6: Preservation — generateName Output Shape

_For any_ call to `generateName()` with arbitrary `takenAdjs` and `takenNouns` sets, the function SHALL return an object with `adj` (string) and `noun` (string ending in "bot") properties, preserving the existing name format contract.

**Validates: Requirements 3.1**

Property 7: Preservation — generateName Avoids Taken Names

_For any_ call to `generateName(takenAdjs, takenNouns)` where alternatives exist, the returned `adj` SHALL NOT be in `takenAdjs` and the returned `noun` SHALL NOT be in `takenNouns`, preserving the uniqueness behavior.

**Validates: Requirements 3.2**

Property 8: Preservation — formatName Output Format

_For any_ strings `adj` and `noun`, `formatName(adj, noun)` SHALL return `"${adj} ${noun}"`, preserving the display format.

**Validates: Requirements 3.3**

Property 9: Preservation — Original 35 Animals Retained

_For any_ animal in the original set of 35 properly-quoted entries, that animal SHALL be present in the fixed `ANIMALS` array, preserving backward compatibility.

**Validates: Requirements 3.4**

Property 10: Preservation — Original 35 Adjectives Retained

_For any_ adjective in the original set of 35 entries, that adjective SHALL be present in the expanded `ADJECTIVES` array, preserving backward compatibility.

**Validates: Requirements 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/utils/nameGenerator.ts`

**Target**: `ANIMALS` array constant and `ADJECTIVES` array constant

**Specific Changes**:
1. **Remove corrupted entries**: Delete everything after `"Parrot"` in the ANIMALS array — the entire unquoted, comma-separated block of bare identifiers starting with `,Quokka,Panda,...`

2. **Expand ANIMALS to 200 entries**: Replace the removed entries with curated, properly-quoted animals that fit the scrapyard/robot theme (tough, wild, predatory, or mechanical-sounding). The final array must contain exactly 200 unique entries, retaining all original 35. Examples of new additions: `"Wolf"`, `"Lynx"`, `"Wolverine"`, `"Scorpion"`, `"Mantis"`, `"Hornet"`, `"Raptor"`, `"Condor"`, `"Barracuda"`, `"Panther"`, etc.

3. **Expand ADJECTIVES to 200 entries**: Add 165 new properly-quoted adjectives that fit the scrapyard/robot/mechanical theme. The final array must contain exactly 200 unique entries, retaining all original 35. Examples of new additions: `"Anodized"`, `"Burnished"`, `"Calibrated"`, `"Smelted"`, `"Tungsten"`, `"Vulcanized"`, etc.

4. **Deduplicate both arrays**: Ensure no entry appears more than once in either array (the original 35 entries in each are the source of truth; new additions must not duplicate them)

5. **Verify all entries are quoted strings**: Every entry in both arrays must be a `"string"` literal

6. **Leave function logic untouched**: The `generateName()` and `formatName()` functions must not be modified

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write tests that import the `ANIMALS` array and check each entry for type validity, uniqueness, and theme fitness. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **String Type Test**: Check every ANIMALS entry is `typeof "string"` (will fail on unfixed code — bare identifiers are `undefined`)
2. **Uniqueness Test**: Check for duplicate entries in ANIMALS (will fail on unfixed code — many duplicates)
3. **Theme Fitness Test**: Check entries against a blocklist of inappropriate animals (will fail on unfixed code — contains Cow, Pig, etc.)
4. **Array Integrity Test**: Check that ANIMALS has no `undefined`/`null` holes (will fail on unfixed code)
5. **ANIMALS Array Size Test**: Check that ANIMALS has exactly 200 entries (will fail on unfixed code)
6. **ADJECTIVES Array Size Test**: Check that ADJECTIVES has exactly 200 entries (will fail on unfixed code — currently 35)

**Expected Counterexamples**:
- Entries at index 35+ are `undefined` (bare identifiers don't resolve)
- Duplicates found: Falcon, Eagle, Hawk, Cobra, Panda, Koala, Otter, Lemur, etc.
- Theme violations: Cow, Pig, Sheep, Chicken, Kitten, Puppy, Ant, Bee, Mosquito, etc.
- ANIMALS array does not have exactly 200 valid entries
- ADJECTIVES array has only 35 entries instead of the required 200

### Fix Checking

**Goal**: Verify that for all entries in the fixed ANIMALS and ADJECTIVES arrays, the bug conditions no longer hold.

**Pseudocode:**
```
FOR ALL entry IN ANIMALS DO
  ASSERT typeof entry === "string"
  ASSERT entry.length > 0
  ASSERT ANIMALS.indexOf(entry) === ANIMALS.lastIndexOf(entry)  // no duplicates
  ASSERT entry NOT IN themeBlocklist
END FOR
ASSERT ANIMALS.length === 200

FOR ALL entry IN ADJECTIVES DO
  ASSERT typeof entry === "string"
  ASSERT entry.length > 0
  ASSERT ADJECTIVES.indexOf(entry) === ADJECTIVES.lastIndexOf(entry)  // no duplicates
END FOR
ASSERT ADJECTIVES.length === 200
```

### Preservation Checking

**Goal**: Verify that for all inputs unrelated to the ANIMALS array content, the fixed code produces the same results as the original.

**Pseudocode:**
```
FOR ALL (takenAdjs, takenNouns) DO
  result := generateName(takenAdjs, takenNouns)
  ASSERT typeof result.adj === "string"
  ASSERT result.noun.endsWith("bot")
  IF alternatives exist THEN
    ASSERT result.adj NOT IN takenAdjs
    ASSERT result.noun NOT IN takenNouns
  END IF
END FOR
```

**Testing Approach**: Property-based testing with fast-check is recommended for preservation checking because:
- It generates many random combinations of taken adjective/noun sets
- It catches edge cases like all names taken, empty sets, single-element sets
- It provides strong guarantees that `generateName` and `formatName` behavior is unchanged

**Test Plan**: Observe behavior on UNFIXED code first (if possible — module may not load), then write property-based tests capturing the expected behavior after fix.

**Test Cases**:
1. **Output Shape Preservation**: Verify `generateName()` returns `{ adj: string, noun: string }` with noun ending in "bot"
2. **Taken Name Avoidance**: Verify taken names are avoided when alternatives exist
3. **Format Preservation**: Verify `formatName(adj, noun)` returns `"adj noun"`
4. **Original Animals Retained**: Verify all 35 original animals are still in the array

### Unit Tests

- Test that ANIMALS array has no undefined/null entries
- Test that ANIMALS array has no duplicates
- Test that specific theme-inappropriate animals are absent
- Test that all 35 original animals are present
- Test that ANIMALS array has exactly 200 entries
- Test that ADJECTIVES array has no undefined/null entries
- Test that ADJECTIVES array has no duplicates
- Test that all 35 original adjectives are present
- Test that ADJECTIVES array has exactly 200 entries
- Test `generateName()` output shape
- Test `formatName()` output format

### Property-Based Tests

- Generate random indices and verify `ANIMALS[i]` is always a valid string
- Generate random indices and verify `ADJECTIVES[i]` is always a valid string
- Verify ANIMALS array length is exactly 200 with all unique entries
- Verify ADJECTIVES array length is exactly 200 with all unique entries
- Generate random `takenAdjs`/`takenNouns` subsets and verify `generateName` avoids them
- Generate random `(adj, noun)` pairs and verify `formatName` joins them correctly

### Integration Tests

- Import `nameGenerator.ts` module and verify it loads without errors
- Call `generateName()` multiple times and verify all returned names are unique and well-formed
- Simulate a lobby scenario with multiple players and verify no name collisions
