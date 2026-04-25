# Requirements Document

## Introduction

The server already has a `sanitizeName()` function in `server/logic/sanitize.ts` that strips non-printable ASCII characters (keeps 0x20–0x7E) and trims whitespace. The function is currently called in the `"setName"` message handler for human players, but there are gaps: AI-generated names bypass sanitization, composed team names during absorption are not sanitized, and there is no defense-in-depth guarantee that every name field written to `GameState` (and therefore broadcast to all clients via Colyseus schema sync) has been sanitized. This spec wires `sanitizeName()` into every code path that writes player name data into `GameState`.

## Glossary

- **Server**: The Colyseus game server (`server/rooms/GameRoom.ts`)
- **sanitizeName**: The existing function in `server/logic/sanitize.ts` that strips characters outside printable ASCII (0x20–0x7E) and trims whitespace
- **GameState**: The Colyseus schema (`server/state/GameState.ts`) whose fields are automatically broadcast to all connected clients
- **Player**: A schema object within GameState containing `nameAdj`, `nameNoun`, and `teamName` string fields
- **Name_Fields**: The three string fields on a Player that carry display-name data: `nameAdj`, `nameNoun`, and `teamName`
- **Human_Player**: A player controlled by a real person who sets their name via the `"setName"` message
- **AI_Player**: A server-generated bot player added via the `"addAI"` message

## Requirements

### Requirement 1: Sanitize human player names on setName

**User Story:** As a player, I want my chosen name to be cleaned of non-printable characters before it is stored and broadcast, so that other players never see garbled or malicious text.

#### Acceptance Criteria

1. WHEN a Human_Player sends a `"setName"` message, THE Server SHALL apply sanitizeName to both the adjective and noun fields before storing them in the Player schema
2. WHEN sanitizeName produces an empty string for either the adjective or noun, THE Server SHALL reject the name and send a `"nameRejected"` message to the client
3. THE Server SHALL truncate each name field to 16 characters before applying sanitizeName

### Requirement 2: Sanitize AI player names on addAI

**User Story:** As a player in a lobby with AI bots, I want AI names to be sanitized before storage, so that the same safety guarantees apply regardless of name origin.

#### Acceptance Criteria

1. WHEN the host sends an `"addAI"` message, THE Server SHALL apply sanitizeName to the generated adjective and noun before storing them in the AI Player schema
2. THE Server SHALL apply sanitizeName to the composed `teamName` before storing it in the AI Player schema

### Requirement 3: Sanitize composed team names during absorption

**User Story:** As a player, I want team names composed during absorption to be sanitized, so that concatenating multiple adjectives cannot introduce unsanitized content.

#### Acceptance Criteria

1. WHEN a player is absorbed and the Server composes a new `teamName` by prepending the absorbed player's adjective, THE Server SHALL apply sanitizeName to the resulting `teamName` before storing it
2. WHEN the Server updates existing team members' `teamName` after absorption, THE Server SHALL apply sanitizeName to each updated `teamName`

### Requirement 4: Sanitize team names on round reset

**User Story:** As a player in a series match, I want team names recomposed at round reset to be sanitized, so that no unsanitized data leaks between rounds.

#### Acceptance Criteria

1. WHEN the Server resets player state for a new round and recomposes `teamName` from `nameAdj` and `nameNoun`, THE Server SHALL apply sanitizeName to the resulting `teamName`

### Requirement 5: Invariant — all broadcast Name_Fields contain only printable ASCII

**User Story:** As a player, I want a guarantee that every name I see from other players contains only printable ASCII characters with no leading or trailing whitespace, regardless of how the name was set.

#### Acceptance Criteria

1. THE Server SHALL guarantee that every `nameAdj` value stored in GameState contains only characters in the printable ASCII range (0x20–0x7E) with no leading or trailing whitespace
2. THE Server SHALL guarantee that every `nameNoun` value stored in GameState contains only characters in the printable ASCII range (0x20–0x7E) with no leading or trailing whitespace
3. THE Server SHALL guarantee that every `teamName` value stored in GameState contains only characters in the printable ASCII range (0x20–0x7E) with no leading or trailing whitespace
4. FOR ALL arbitrary Unicode strings provided as name input, applying sanitizeName and then checking the output SHALL confirm the output contains only printable ASCII with no leading or trailing whitespace (round-trip sanitization property)
