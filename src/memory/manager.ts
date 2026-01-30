// ABOUTME: Memory manager for per-user memory blocks with Letta integration
// ABOUTME: Handles attachment/detachment of user memory blocks and lifecycle management

import { EventEmitter } from "events";
import { Letta } from "@letta-ai/letta-client";
import { getOrCreateUserBlock, attachBlockToAgent, detachBlockFromAgent } from "./blocks";

export interface MemoryManagerConfig {
  lettaClient: Letta;
  agentId: string;
  timeoutMs?: number;
}

export class MemoryManager extends EventEmitter {
  private readonly lettaClient: Letta;
  private readonly agentId: string;
  private readonly timeoutMs: number;
  private attachedBlockIds: Set<string> = new Set();
  private serverUnavailable: boolean = false;

  constructor(config: MemoryManagerConfig) {
    super();
    this.lettaClient = config.lettaClient;
    this.agentId = config.agentId;
    this.timeoutMs = config.timeoutMs ?? 5000;
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Memory operation timed out')), this.timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]);
  }

  public isServerAvailable(): boolean {
    return !this.serverUnavailable;
  }

  public resetServerState(): void {
    this.serverUnavailable = false;
  }

  async destroy(): Promise<void> {
    const blockIds = Array.from(this.attachedBlockIds);
    await this.detachUserBlocks(blockIds);
    this.attachedBlockIds.clear();
  }

  async attachUserBlocks(userId: string): Promise<string[]> {
    if (this.serverUnavailable) {
      return [];
    }
    const startTime = Date.now();
    try {
      const block = await this.withTimeout(
        getOrCreateUserBlock(this.lettaClient, this.agentId, userId)
      );
      await this.withTimeout(
        attachBlockToAgent(this.lettaClient, this.agentId, block.id)
      );
      this.attachedBlockIds.add(block.id);
      const blockIds = [block.id];
      this.emit("memoryOperationComplete", {
        operation: "attach",
        durationMs: Date.now() - startTime,
        success: blockIds.length > 0,
        userId,
      });
      return blockIds;
     } catch (error) {
       console.warn("Failed to attach user blocks:", error);
       if (error instanceof Error && (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed'))) {
         this.serverUnavailable = true;
         this.emit('serverUnavailable', { error });
       }
       this.emit("memoryAttachFailed", { userId, error });
       this.emit("memoryOperationComplete", {
         operation: "attach",
         durationMs: Date.now() - startTime,
         success: false,
         userId,
       });
       return [];
     }
  }

    async detachUserBlocks(blockIds: string[]): Promise<void> {
       if (this.serverUnavailable) {
         return;
       }
       const startTime = Date.now();
       for (const blockId of blockIds) {
         try {
           await this.withTimeout(
             detachBlockFromAgent(this.lettaClient, this.agentId, blockId)
           );
         } catch (error) {
           console.warn(`Failed to detach block ${blockId}:`, error);
           if (error instanceof Error && (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed'))) {
             this.serverUnavailable = true;
             this.emit('serverUnavailable', { error });
           }
           this.emit("memoryDetachFailed", { blockId, error });
         }
        this.attachedBlockIds.delete(blockId);
      }
      this.emit("memoryOperationComplete", {
        operation: "detach",
        durationMs: Date.now() - startTime,
        success: true,
        blockCount: blockIds.length,
      });
    }
}
