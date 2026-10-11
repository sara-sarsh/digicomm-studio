// src/worker/triple-buffer.ts

export class TripleBuffer<T> {
  private writeBuf: T;
  private readyBuf: T;
  private readBuf: T;
  private hasNewData = false;

  constructor(factory: () => T) {
    this.writeBuf = factory();
    this.readyBuf = factory();
    this.readBuf = factory();
  }

  getWriteBuffer(): T {
    return this.writeBuf;
  }

  commit(): void {
    const temp = this.writeBuf;
    this.writeBuf = this.readyBuf;
    this.readyBuf = temp;
    this.hasNewData = true;
  }

  consume(): T | null {
    if (!this.hasNewData) return null;
    const temp = this.readBuf;
    this.readBuf = this.readyBuf;
    this.readyBuf = temp;
    this.hasNewData = false;
    return this.readBuf;
  }
}
