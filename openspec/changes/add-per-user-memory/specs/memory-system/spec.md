## ADDED Requirements

### Requirement: Memory Manager Lifecycle

The system SHALL manage memory block attachment and detachment during conversation processing.

#### Scenario: Attach user block before processing

- **GIVEN** a user with ID "123456789" sends a voice message
- **WHEN** the voice orchestrator begins processing
- **THEN** the user's memory block is attached to the agent before the LLM call

#### Scenario: Create block for new user

- **GIVEN** a user sends their first message
- **WHEN** attachUserBlocks is called
- **THEN** a new memory block is created with label `/{agent_id}/discord/users/{user_id}`
- **AND** the block is attached to the agent

#### Scenario: Reuse block for returning user

- **GIVEN** a user has previously interacted with the bot
- **WHEN** attachUserBlocks is called
- **THEN** the existing memory block is found by label
- **AND** the block is attached to the agent

#### Scenario: Detach blocks after processing

- **GIVEN** user blocks are attached for processing
- **WHEN** message processing completes (success or failure)
- **THEN** all temporarily attached blocks are detached from the agent

#### Scenario: Cleanup on orchestrator destroy

- **GIVEN** blocks are currently attached
- **WHEN** the orchestrator is destroyed
- **THEN** all tracked blocks are detached

### Requirement: Graceful Degradation

The system SHALL continue functioning when memory operations fail.

#### Scenario: Attachment failure continues without memory

- **GIVEN** the Letta server is slow or unavailable
- **WHEN** block attachment times out or fails
- **THEN** processing continues without user memory
- **AND** the failure is logged

#### Scenario: Detachment failure is tolerated

- **GIVEN** blocks are attached for processing
- **WHEN** detachment fails after processing
- **THEN** the error is logged
- **AND** no exception is thrown to the caller

#### Scenario: Already attached block (409)

- **GIVEN** a block is already attached to the agent
- **WHEN** attachUserBlocks attempts to attach it again
- **THEN** the operation succeeds (idempotent)

#### Scenario: Not attached block (404)

- **GIVEN** a block is not attached to the agent
- **WHEN** detachUserBlocks attempts to detach it
- **THEN** the operation succeeds (idempotent)

### Requirement: Voice Orchestrator Memory Integration

The system SHALL integrate memory management into the voice conversation flow.

#### Scenario: Memory attached during voice processing

- **GIVEN** STT produces a final transcript with userId
- **WHEN** the orchestrator processes the transcript
- **THEN** the user's memory block is attached before calling Letta
- **AND** the block is detached after the response is generated

#### Scenario: Memory context affects response

- **GIVEN** a user has memory containing "prefers formal language"
- **WHEN** that user speaks to the bot
- **THEN** the Letta agent has access to that memory during response generation

#### Scenario: No userId available

- **GIVEN** a transcript event has no userId (anonymous audio)
- **WHEN** the orchestrator processes it
- **THEN** processing continues without attaching user memory
