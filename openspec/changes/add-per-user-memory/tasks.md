## 1. MemoryManager Class

- [x] 1.1 Create MemoryManager class with lettaClient and agentId config
- [x] 1.2 Implement attachUserBlocks(userId) - get-or-create + attach
- [x] 1.3 Implement detachUserBlocks(blockIds) - batch detach with error tolerance
- [x] 1.4 Track attached blocks for cleanup on destroy
- [x] 1.5 Add timeout handling for slow Letta API calls

## 2. Voice Orchestrator Integration

- [x] 2.1 Add MemoryManager to VoiceOrchestratorConfig
- [x] 2.2 Wrap generateResponse() with attach/detach pattern
- [x] 2.3 Pass userId from TranscriptionEvent to memory attachment
- [x] 2.4 Handle attachment failures gracefully (continue without memory)
- [x] 2.5 Ensure detach runs in finally block (cleanup on error)

## 3. Error Handling

- [x] 3.1 Log but don't fail on attachment errors (degraded mode)
- [x] 3.2 Log but don't fail on detachment errors
- [x] 3.3 Add metrics/events for memory operation latency
- [x] 3.4 Handle Letta server unavailable scenario

## 4. Testing

- [x] 4.1 Unit test MemoryManager attach/detach lifecycle
- [x] 4.2 Unit test error tolerance (409, 404 handling)
- [x] 4.3 Unit test cleanup on destroy
- [x] 4.4 Integration test with mocked Letta client
- [x] 4.5 Test VoiceOrchestrator with memory enabled
