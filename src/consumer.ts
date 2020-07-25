import r from "ioredis";
import { RedisStream, RedisMessage } from "./redis-type-patch";
import * as settings from "./settings";
const redis = new r();
import { controlPanel } from "./control-panel";

type NextId = string;

class Consumer {
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

  public async begin(): Promise<void> {
    return this.readFromGroup();
  }

  private async readFromGroup(): Promise<void> {
    const result: RedisStream[] | null = (await redis.xreadgroup(
      "GROUP",
      settings.group,
      this.name,
      "BLOCK",
      "2000",
      "COUNT",
      "10",
      "STREAMS",
      settings.stream,
      this.nextId
    )) as any;

    if (result === null) {
      console.log(`Timeout! nextId=${this.nextId}`);
      return this.readFromGroup();
    }

    if (result[0][1].length === 0) {
      this.nextId = ">";
      console.log(`Backlog empty! nextId=${this.nextId}`);
      return this.readFromGroup();
    }

    this.nextId = await this.processMessages(result[0][1]);
    return this.readFromGroup();
  }
}

main();

async function main() {
  const consumerName = process.argv[2] ?? "";

  if (consumerName === "") {
    console.error("Please specify a consumer name");
    process.exit(1);
  }

  const consumer = new Consumer(consumerName);

  controlPanel((value) => {
    consumer.toggleLazy(value);
  });

  consumer.begin();
}
