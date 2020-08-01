import r from "ioredis";
import { RedisMessage, RedisStream } from "./redis-type-patch";
import * as settings from "./settings";
const redis = new r();

type NextId = string;

const BLOCK = 500;
const COUNT = 1;

export class Consumer {
  private lazy: boolean = false;
  private nextId: string = "0-0";

  constructor(private name: string, private checkBacklog = true) {
    this.resetNextId();
  }

  public toggleLazy(value: boolean): void {
    if (this.lazy === value) return;
    this.lazy = value;
    this.resetNextId();

    console.log(
      this.lazy
        ? `consumer "${this.name}" is now lazy and will stop acknowledging new messages`
        : `consumer "${this.name}" is not lazy anymore and will resume acknowledging new messages now`
    );
  }

  private resetNextId(): void {
    this.nextId = this.checkBacklog ? "0-0" : ">";
  }

  private async processMessage(id: string, fields: string[]): Promise<void> {
    console.log(
      `[${this.lazy ? "ignored" : "acknowledged"}][${Date.now()}] ${
        this.name
      } read: ${id}, ${fields.join(", ")}`
    );
    if (!this.lazy) {
      await redis.xack(settings.stream, settings.group, id);
    }
  }

  private async processMessages(messages: RedisMessage[]): Promise<NextId> {
    let id: string = "";
    for (const item of messages) {
      const [messageId, messageFields] = item;
      await this.processMessage(messageId, messageFields);
      id = messageId;
    }
    return id;
  }

  public begin(): void {
    this.step();
  }

  private async step(): Promise<void> {
    const messages = await this.read();

    if (messages === null) {
      console.log(`${Date.now()} Timeout! nextId "${this.nextId}"`);
      return this.step();
    }

    if (messages.length === 0) {
      this.nextId = ">";
      console.log(`${Date.now()} Backlog empty! nextId "${this.nextId}"`);
      return this.step();
    }

    this.nextId = await this.processMessages(messages);
    return this.step();
  }

  private async read(): Promise<RedisMessage[] | null> {
    const result: RedisStream[] | null = (await redis.xreadgroup(
      "GROUP",
      settings.group,
      this.name,
      "BLOCK",
      BLOCK,
      "COUNT",
      COUNT,
      "STREAMS",
      settings.stream,
      this.nextId
    )) as any;

    return result === null ? null : result[0][1];
  }
}
