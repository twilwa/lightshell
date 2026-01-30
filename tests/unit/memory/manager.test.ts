// ABOUTME: Unit tests for MemoryManager class
// ABOUTME: Tests attach/detach lifecycle and error handling

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryManager } from "../../../src/memory/manager";

function createMockLettaClient() {
  return {
    blocks: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "block-123" }),
    },
    agents: {
      blocks: {
        attach: vi.fn().mockResolvedValue({}),
        detach: vi.fn().mockResolvedValue({}),
      },
    },
  } as any;
}

describe("MemoryManager", () => {
  let mockClient: any;
  let manager: MemoryManager;

  beforeEach(() => {
    mockClient = createMockLettaClient();
    manager = new MemoryManager({
      lettaClient: mockClient,
      agentId: "agent-123",
      timeoutMs: 5000,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with provided config", () => {
      const manager = new MemoryManager({
        lettaClient: mockClient,
        agentId: "agent-456",
        timeoutMs: 3000,
      });

      expect(manager).toBeDefined();
      expect(manager.isServerAvailable()).toBe(true);
    });

    it("should use default timeout when not provided", () => {
      const manager = new MemoryManager({
        lettaClient: mockClient,
        agentId: "agent-456",
      });

      expect(manager).toBeDefined();
    });
  });

  describe("attachUserBlocks", () => {
    it("should create and attach block for user", async () => {
      const blockIds = await manager.attachUserBlocks("user-456");

      expect(blockIds).toEqual(["block-123"]);
      expect(mockClient.blocks.list).toHaveBeenCalled();
      expect(mockClient.blocks.create).toHaveBeenCalled();
      expect(mockClient.agents.blocks.attach).toHaveBeenCalledWith("agent-123", {
        blockId: "block-123",
      });
    });

    it("should track attached block IDs", async () => {
      await manager.attachUserBlocks("user-456");
      await manager.attachUserBlocks("user-789");

      // Both blocks should be tracked
      expect(mockClient.agents.blocks.attach).toHaveBeenCalledTimes(2);
    });

    it("should return empty array on network error", async () => {
      mockClient.blocks.create.mockRejectedValue(
        new Error("Network error")
      );

      const blockIds = await manager.attachUserBlocks("user-456");

      expect(blockIds).toEqual([]);
    });

    it("should emit memoryAttachFailed on error", async () => {
      const errorHandler = vi.fn();
      manager.on("memoryAttachFailed", errorHandler);
      mockClient.blocks.create.mockRejectedValue(new Error("Network error"));

      await manager.attachUserBlocks("user-456");

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-456" })
      );
    });

    it("should emit memoryOperationComplete on success", async () => {
      const handler = vi.fn();
      manager.on("memoryOperationComplete", handler);

      await manager.attachUserBlocks("user-456");

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: "attach",
          success: true,
          userId: "user-456",
          durationMs: expect.any(Number),
        })
      );
    });

    it("should emit memoryOperationComplete on failure", async () => {
      const handler = vi.fn();
      manager.on("memoryOperationComplete", handler);
      mockClient.blocks.create.mockRejectedValue(new Error("Network error"));

      await manager.attachUserBlocks("user-456");

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: "attach",
          success: false,
          userId: "user-456",
          durationMs: expect.any(Number),
        })
      );
    });

    it("should set serverUnavailable on ECONNREFUSED", async () => {
      const error = new Error("ECONNREFUSED");
      mockClient.blocks.create.mockRejectedValue(error);

      await manager.attachUserBlocks("user-456");

      expect(manager.isServerAvailable()).toBe(false);
    });

    it("should set serverUnavailable on fetch failed", async () => {
      const error = new Error("fetch failed");
      mockClient.blocks.create.mockRejectedValue(error);

      await manager.attachUserBlocks("user-456");

      expect(manager.isServerAvailable()).toBe(false);
    });

    it("should emit serverUnavailable event on connection error", async () => {
      const handler = vi.fn();
      manager.on("serverUnavailable", handler);
      const error = new Error("ECONNREFUSED");
      mockClient.blocks.create.mockRejectedValue(error);

      await manager.attachUserBlocks("user-456");

      expect(handler).toHaveBeenCalledWith({ error });
    });

    it("should return empty array when server unavailable", async () => {
      manager.resetServerState();
      const error = new Error("ECONNREFUSED");
      mockClient.blocks.create.mockRejectedValue(error);

      // First call marks server unavailable
      await manager.attachUserBlocks("user-456");
      expect(manager.isServerAvailable()).toBe(false);

      // Reset mocks for second call
      mockClient.blocks.create.mockClear();
      mockClient.agents.blocks.attach.mockClear();

      // Second call should return empty array without calling client
      const blockIds = await manager.attachUserBlocks("user-789");

      expect(blockIds).toEqual([]);
      expect(mockClient.blocks.create).not.toHaveBeenCalled();
    });

    it("should measure operation duration", async () => {
      const handler = vi.fn();
      manager.on("memoryOperationComplete", handler);

      await manager.attachUserBlocks("user-456");

      const call = handler.mock.calls[0][0];
      expect(call.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof call.durationMs).toBe("number");
    });
  });

  describe("detachUserBlocks", () => {
    it("should detach all provided blocks", async () => {
      await manager.detachUserBlocks(["block-1", "block-2"]);

      expect(mockClient.agents.blocks.detach).toHaveBeenCalledTimes(2);
      expect(mockClient.agents.blocks.detach).toHaveBeenCalledWith(
        "agent-123",
        "block-1"
      );
      expect(mockClient.agents.blocks.detach).toHaveBeenCalledWith(
        "agent-123",
        "block-2"
      );
    });

    it("should continue on individual block failures", async () => {
      mockClient.agents.blocks.detach
        .mockRejectedValueOnce(new Error("First failed"))
        .mockResolvedValueOnce({});

      await manager.detachUserBlocks(["block-1", "block-2"]);

      expect(mockClient.agents.blocks.detach).toHaveBeenCalledTimes(2);
    });

    it("should emit memoryDetachFailed on error", async () => {
      const handler = vi.fn();
      manager.on("memoryDetachFailed", handler);
      mockClient.agents.blocks.detach.mockRejectedValue(
        new Error("Detach failed")
      );

      await manager.detachUserBlocks(["block-1"]);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ blockId: "block-1" })
      );
    });

    it("should remove blocks from tracking even on error", async () => {
      // First attach a block
      await manager.attachUserBlocks("user-456");

      // Then detach with error
      mockClient.agents.blocks.detach.mockRejectedValue(
        new Error("Detach failed")
      );

      await manager.detachUserBlocks(["block-123"]);

      // Block should still be removed from tracking
      expect(mockClient.agents.blocks.detach).toHaveBeenCalledWith(
        "agent-123",
        "block-123"
      );
    });

    it("should emit memoryOperationComplete on detach", async () => {
      const handler = vi.fn();
      manager.on("memoryOperationComplete", handler);

      await manager.detachUserBlocks(["block-1", "block-2"]);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: "detach",
          success: true,
          blockCount: 2,
          durationMs: expect.any(Number),
        })
      );
    });

    it("should set serverUnavailable on ECONNREFUSED", async () => {
      const error = new Error("ECONNREFUSED");
      mockClient.agents.blocks.detach.mockRejectedValue(error);

      await manager.detachUserBlocks(["block-1"]);

      expect(manager.isServerAvailable()).toBe(false);
    });

    it("should set serverUnavailable on fetch failed", async () => {
      const error = new Error("fetch failed");
      mockClient.agents.blocks.detach.mockRejectedValue(error);

      await manager.detachUserBlocks(["block-1"]);

      expect(manager.isServerAvailable()).toBe(false);
    });

    it("should emit serverUnavailable event on connection error", async () => {
      const handler = vi.fn();
      manager.on("serverUnavailable", handler);
      const error = new Error("ECONNREFUSED");
      mockClient.agents.blocks.detach.mockRejectedValue(error);

      await manager.detachUserBlocks(["block-1"]);

      expect(handler).toHaveBeenCalledWith({ error });
    });

    it("should return early when server unavailable", async () => {
      // Mark server as unavailable
      const error = new Error("ECONNREFUSED");
      mockClient.agents.blocks.detach.mockRejectedValue(error);
      await manager.detachUserBlocks(["block-1"]);

      expect(manager.isServerAvailable()).toBe(false);

      // Reset mocks
      mockClient.agents.blocks.detach.mockClear();

      // Second call should not call client
      await manager.detachUserBlocks(["block-2"]);

      expect(mockClient.agents.blocks.detach).not.toHaveBeenCalled();
    });

    it("should handle empty block list", async () => {
      const handler = vi.fn();
      manager.on("memoryOperationComplete", handler);

      await manager.detachUserBlocks([]);

      expect(mockClient.agents.blocks.detach).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: "detach",
          blockCount: 0,
        })
      );
    });
  });

  describe("destroy", () => {
    it("should detach all tracked blocks", async () => {
      await manager.attachUserBlocks("user-456");
      await manager.destroy();

      expect(mockClient.agents.blocks.detach).toHaveBeenCalledWith(
        "agent-123",
        "block-123"
      );
    });

    it("should clear tracked blocks after destroy", async () => {
      await manager.attachUserBlocks("user-456");
      await manager.destroy();

      // Attach another block and destroy again
      mockClient.blocks.create.mockResolvedValue({ id: "block-456" });
      await manager.attachUserBlocks("user-789");
      mockClient.agents.blocks.detach.mockClear();

      await manager.destroy();

      // Only the second block should be detached
      expect(mockClient.agents.blocks.detach).toHaveBeenCalledWith(
        "agent-123",
        "block-456"
      );
      expect(mockClient.agents.blocks.detach).toHaveBeenCalledTimes(1);
    });

    it("should handle destroy with no attached blocks", async () => {
      await manager.destroy();

      expect(mockClient.agents.blocks.detach).not.toHaveBeenCalled();
    });

    it("should handle destroy when server unavailable", async () => {
      // Mark server as unavailable
      const error = new Error("ECONNREFUSED");
      mockClient.blocks.create.mockRejectedValue(error);
      await manager.attachUserBlocks("user-456");

      expect(manager.isServerAvailable()).toBe(false);

      // Destroy should return early
      mockClient.agents.blocks.detach.mockClear();
      await manager.destroy();

      expect(mockClient.agents.blocks.detach).not.toHaveBeenCalled();
    });

    it("should handle multiple blocks from different users", async () => {
      mockClient.blocks.create
        .mockResolvedValueOnce({ id: "block-1" })
        .mockResolvedValueOnce({ id: "block-2" });

      await manager.attachUserBlocks("user-1");
      await manager.attachUserBlocks("user-2");

      mockClient.agents.blocks.detach.mockClear();
      await manager.destroy();

      expect(mockClient.agents.blocks.detach).toHaveBeenCalledTimes(2);
      expect(mockClient.agents.blocks.detach).toHaveBeenCalledWith(
        "agent-123",
        "block-1"
      );
      expect(mockClient.agents.blocks.detach).toHaveBeenCalledWith(
        "agent-123",
        "block-2"
      );
    });
  });

  describe("isServerAvailable", () => {
    it("should return true initially", () => {
      expect(manager.isServerAvailable()).toBe(true);
    });

    it("should return false after connection error", async () => {
      const error = new Error("ECONNREFUSED");
      mockClient.blocks.create.mockRejectedValue(error);

      await manager.attachUserBlocks("user-456");

      expect(manager.isServerAvailable()).toBe(false);
    });
  });

  describe("resetServerState", () => {
    it("should reset server availability", async () => {
      const error = new Error("ECONNREFUSED");
      mockClient.blocks.create.mockRejectedValue(error);

      await manager.attachUserBlocks("user-456");
      expect(manager.isServerAvailable()).toBe(false);

      manager.resetServerState();
      expect(manager.isServerAvailable()).toBe(true);
    });

    it("should allow operations after reset", async () => {
      const error = new Error("ECONNREFUSED");
      mockClient.blocks.create.mockRejectedValue(error);

      await manager.attachUserBlocks("user-456");
      expect(manager.isServerAvailable()).toBe(false);

      manager.resetServerState();
      mockClient.blocks.create.mockResolvedValue({ id: "block-789" });

      const blockIds = await manager.attachUserBlocks("user-789");

      expect(blockIds).toEqual(["block-789"]);
    });
  });

  describe("timeout handling", () => {
    it("should timeout operations that exceed timeoutMs", async () => {
      const slowManager = new MemoryManager({
        lettaClient: mockClient,
        agentId: "agent-123",
        timeoutMs: 10, // Very short timeout
      });

      mockClient.blocks.create.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ id: "block-123" }), 100);
          })
      );

      const blockIds = await slowManager.attachUserBlocks("user-456");

      expect(blockIds).toEqual([]);
    });

    it("should emit memoryAttachFailed on timeout", async () => {
      const slowManager = new MemoryManager({
        lettaClient: mockClient,
        agentId: "agent-123",
        timeoutMs: 10,
      });

      const handler = vi.fn();
      slowManager.on("memoryAttachFailed", handler);

      mockClient.blocks.create.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ id: "block-123" }), 100);
          })
      );

      await slowManager.attachUserBlocks("user-456");

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-456" })
      );
    });
  });

   describe("event emission", () => {
     it("should emit events in correct order on success", async () => {
       const events: string[] = [];
       manager.on("memoryOperationComplete", () =>
         events.push("memoryOperationComplete")
       );

       await manager.attachUserBlocks("user-456");

       expect(events).toContain("memoryOperationComplete");
     });

     it("should emit both memoryAttachFailed and memoryOperationComplete on error", async () => {
       const events: string[] = [];
       manager.on("memoryAttachFailed", () => events.push("memoryAttachFailed"));
       manager.on("memoryOperationComplete", () =>
         events.push("memoryOperationComplete")
       );

       mockClient.blocks.create.mockRejectedValue(new Error("Error"));

       await manager.attachUserBlocks("user-456");

       expect(events).toContain("memoryAttachFailed");
       expect(events).toContain("memoryOperationComplete");
     });
   });

   describe("integration scenarios", () => {
     it("should complete full attach-process-detach cycle", async () => {
       // Attach
       const blockIds = await manager.attachUserBlocks("user-456");
       expect(blockIds).toHaveLength(1);

       // Simulate processing (blocks are attached)
       expect(mockClient.agents.blocks.attach).toHaveBeenCalled();

       // Detach
       await manager.detachUserBlocks(blockIds);
       expect(mockClient.agents.blocks.detach).toHaveBeenCalledWith(
         "agent-123",
         blockIds[0]
       );
     });

     it("should use correct block label format", async () => {
       await manager.attachUserBlocks("user-456");

       expect(mockClient.blocks.list).toHaveBeenCalledWith({
         label: "/agent-123/discord/users/user-456",
       });
     });

     it("should handle multiple users in sequence", async () => {
       const blocks1 = await manager.attachUserBlocks("user-1");
       await manager.detachUserBlocks(blocks1);

       const blocks2 = await manager.attachUserBlocks("user-2");
       await manager.detachUserBlocks(blocks2);

       expect(mockClient.agents.blocks.attach).toHaveBeenCalledTimes(2);
       expect(mockClient.agents.blocks.detach).toHaveBeenCalledTimes(2);
     });

     it("should recover from server unavailable state", async () => {
       // Server goes down
       mockClient.blocks.create.mockRejectedValueOnce(
         new Error("ECONNREFUSED")
       );
       await manager.attachUserBlocks("user-1");
       expect(manager.isServerAvailable()).toBe(false);

       // Reset and try again
       manager.resetServerState();
       mockClient.blocks.create.mockResolvedValue({ id: "block-456" });
       const blockIds = await manager.attachUserBlocks("user-2");

       expect(manager.isServerAvailable()).toBe(true);
       expect(blockIds).toHaveLength(1);
     });
   });
});
