import r from "ioredis";
import { RedisStream } from "./redis-type-patch";
import * as settings from "./settings";
const redis = new r();
import { controlPanel } from "./control-panel";

class Consumer {
  private lazy: boolean = false;

  constructor(private name: string) {}

  public onToggleLazy(value: boolean): void {
    if (this.lazy === value) return;
    this.lazy = value;
    console.log(
      this.lazy
        ? `consumer "${this.name}" is now lazy and will stop acknowledging new messages`
        : `consumer "${this.name}" is not lazy anymore and will resume acknowledging new messages now`
    );
  }

  private processMessage(id: string, fields: string[]) {
    console.log(`[${Date.now()}] ${this.name} read: ${id}, ${fields.join(", ")}`);
  }

  public async readFromGroup(id: string): Promise<void> {
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
      id
    )) as any;

    if (result === null) {
      console.log("Timeout!");
      return this.readFromGroup(id);
    }
    if (result[0][1].length === 0) {
      console.log("Backlog empty!");
      return this.readFromGroup(">");
    }

    let nextId: string = id;

    for (const item of result[0][1]) {
      const [messageId, messageFields] = item;
      this.processMessage(messageId, messageFields);
      await redis.xack(settings.stream, settings.group, messageId);
      nextId = messageId;
    }

    return this.readFromGroup(nextId);
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
    consumer.onToggleLazy(value);
  });

  consumer.readFromGroup("0-0");
}
