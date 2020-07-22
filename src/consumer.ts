import r from "ioredis";
import { RedisStream } from "./redis-type-patch";
import * as settings from "./settings";
const redis = new r();

main();

async function main() {
  const consumerName = process.argv[2] ?? "";

  if (consumerName === "") {
    console.error("Please specify a consumer name");
    process.exit(1);
  }

  console.log(`consumer ${consumerName} starting...`);
  await readGroup(consumerName, "0-0");
}

const processMessage = (consumerName: string, id: string, fields: string[]) => {
  console.log(`[${Date.now()}] ${consumerName} read: ${id}, ${fields.join(", ")}`);
};

async function readGroup(consumerName: string, id: string): Promise<void> {
  const result: RedisStream[] | null = (await redis.xreadgroup(
    "GROUP",
    settings.group,
    consumerName,
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
    return readGroup(consumerName, id);
  }

  if (result[0][1].length === 0) {
    console.log("Backlog empty!");
    return readGroup(consumerName, ">");
  }

  for (const item of result[0][1]) {
    const [id, fields] = item;
    processMessage(consumerName, id, fields);
    await redis.xack(settings.stream, settings.group, id);
  }

  return readGroup(consumerName, id);
}

async function wait(t: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), t);
  });
}
