// ABOUTME: Audio output module exports
// ABOUTME: Public API for voice playback functionality

export { AudioOutputManager } from "./manager";
export { AudioQueue } from "./queue";
export { BargeInDetector } from "./barge-in";
export type {
  AudioSegment,
  PlaybackStats,
  BargeInConfig,
  AudioOutputEvents,
  QueueItem,
} from "./types";
