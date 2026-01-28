# lightshell

a shell of light for your squishy meat human

PORTED FROM:

# Discord Stage AI Bot

A Discord Stage Channel AI bot with long-term memory via Letta, voice conversation capabilities, and intelligent turn-taking.

## Features (In Development)

### Implemented (Wave 1 - Foundation)

- ✅ **Project Setup**: TypeScript, Vitest, modular directory structure
- ✅ **Configuration**: Environment variable loading with validation
- ✅ **Discord Client**: Proper gateway intents for Stage channels and voice
- ✅ **Error Handling**: Process-level and client error handlers
- ✅ **Graceful Shutdown**: SIGINT/SIGTERM handling
- ✅ **Stage Channel Utilities**: Detection and permission checking

### In Progress

- 🚧 **Stage Instance Management**: Creation, termination, speaker state
- 🚧 **Slash Commands**: /join, /leave, /stage-start, /stage-stop, /promote
- 🚧 **Voice Connection**: @discordjs/voice lifecycle management

### Planned (Wave 2+)

- ⏳ **Memory System**: Letta SDK integration with per-user memory blocks
- ⏳ **Voice Input**: Audio capture, STT (Deepgram), speaker tracking
- ⏳ **Voice Output**: TTS, audio queue, barge-in support
- ⏳ **Wake Word Detection**: Picovoice Porcupine integration
- ⏳ **Turn-Taking**: Semantic relevance scoring, floor detection
- ⏳ **MCP Integration**: Tool servers, LangChain adapters

## Prerequisites

- Node.js 18+ (managed via mise)
- Discord Bot with proper permissions
- Letta server (running locally or remote)

## Installation

```bash
# Install dependencies
npm install

# Copy and configure environment variables
cp .env.template .env
# Edit .env with your Discord and Letta credentials
```

## Configuration

Required environment variables:

```bash
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
APP_ID=your_discord_application_id_here
PUBLIC_KEY=your_discord_public_key_here

# Letta Configuration
LETTA_AGENT_ID=your_letta_agent_id_here
LETTA_BASE_URL=http://localhost:8283
```

## Development

```bash
# Run in development mode (auto-reload)
npm run dev

# Build TypeScript
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Testing

This project follows Test-Driven Development (TDD):

1. Write a failing test (RED)
2. Write minimal code to pass (GREEN)
3. Refactor while keeping tests green (REFACTOR)

Current test coverage:

- ✅ Configuration validation
- ✅ Discord client creation and intents
- ✅ Stage Channel detection and permissions
- 🚧 Stage Instance management (in progress)
- 🚧 Slash commands (in progress)

## Project Structure

```
src/
├── config/           # Configuration loading and validation
├── discord/          # Discord client and utilities
│   ├── client.ts    # Client creation with intents
│   └── stage.ts     # Stage Channel management
├── commands/         # Slash command definitions
├── text/            # Text message processing
├── voice/           # Voice processing (input/output)
└── index.ts         # Main entry point

tests/
├── unit/            # Unit tests
├── integration/     # Integration tests
└── fixtures/        # Test fixtures and mocks
```

## Architecture

See `openspec/project.md` for full architecture details.

### Core Patterns

**Per-User Memory Blocks** (Planned):

```typescript
const blockIds = await attachUserBlocks(senderId, messageContent);
try {
  // Process message with agent
} finally {
  await detachUserBlocks(blockIds);
}
```

**Audio Pipeline** (Planned):

```
Discord (48kHz stereo Opus) → Decode → Resample (16kHz mono) → Wake Word/STT
```

**Relevance-Threshold Speaking** (Planned):

```typescript
function shouldSpeak(context, transcription): boolean {
  if (containsWakeWord(transcription)) return true;
  if (wasDirectlyAddressed(transcription)) return true;

  const relevance = scoreRelevance(context.topic, botKnowledge);
  const floorOpen = turnDetector.isFloorOpen();

  return relevance > 0.8 && floorOpen;
}
```

## Workstreams

Development is organized into parallelizable workstreams using Beads:

```bash
# Show work ready to start
bd ready

# List all open issues
bd list

# Project health statistics
bd stats
```

## Contributing

This project uses:

- **Trunk Check** for linting and formatting
- **Vitest** for testing
- **TypeScript** strict mode
- **TDD** workflow (RED-GREEN-REFACTOR)

## License

shits gpl dawg, fork me and stay oss
