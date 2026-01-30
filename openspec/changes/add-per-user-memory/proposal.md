# Change: Add Per-User Memory Block Integration

## Why

The Letta memory primitives (client, blocks, labels) exist but aren't wired into the conversation flow. Users don't get personalized interactions because the voice orchestrator sends raw messages to Letta without attaching user-specific memory blocks. This defeats the purpose of having per-user memory.

## What Changes

- Create MemoryManager to orchestrate block lifecycle during conversations
- Wire memory attachment into VoiceOrchestrator before LLM calls
- Implement attach-process-detach pattern with proper cleanup
- Extract Discord user IDs from voice context (speaker tracking)
- Add conversation context building with user identification

## Impact

- Affected specs: `memory-system` (new capability)
- Affected code: 
  - `src/memory/` (add manager.ts)
  - `src/voice/orchestration/voice-orchestrator.ts` (integrate memory)
- **Dependency**: Uses existing `src/memory/blocks.ts`, `src/memory/labels.ts`, `src/memory/client.ts`

## Technical Approach

```typescript
// Before processing any user input:
const memoryManager = new MemoryManager(lettaClient, agentId);

async function processUserMessage(userId: string, text: string) {
  const blockIds = await memoryManager.attachUserBlocks(userId);
  try {
    const response = await lettaClient.agents.messages.create(agentId, { ... });
    return response;
  } finally {
    await memoryManager.detachUserBlocks(blockIds);
  }
}
```

## Scope Boundaries

**In scope:**
- MemoryManager class for block lifecycle
- Integration with VoiceOrchestrator
- User ID extraction from voice events
- Basic error handling for attach/detach failures

**Out of scope (future work):**
- Conversation context/history fetching (separate change)
- Streaming responses (separate change)  
- Agent templates and persona blocks (separate change)
- Text channel integration (voice-first for now)

## Dependencies

- Existing memory primitives in `src/memory/`
- VoiceOrchestrator from `add-voice-orchestration`

## Blocked By

- Nothing (primitives exist)

## Blocks

- `add-mcp-integration` (may want memory context for tool calls)
