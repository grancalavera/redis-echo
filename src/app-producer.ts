import Redis from "ioredis";
import { RedisStream } from "./redis-type-patch";
import * as settings from "./settings";
const redis = new Redis();

const messages = [...Array(26)].map((_, i) => String.fromCharCode(i + 97));

main();

async function main() {
  try {
    await redis.xgroup("CREATE", settings.stream, settings.group, "$", "MKSTREAM");
    console.log(`group ${settings.group} created`);
  } catch {
    console.log(`group ${settings.group} already exist (skip create)`);
  }

  await Promise.all(messages.map((m) => redis.xadd(settings.stream, "*", "message", m)));

  const result: RedisStream[] = (await redis.xread([
    "STREAMS",
    settings.stream,
    0,
  ])) as any;

  result[0][1].forEach((msg) => {
    const [id, data] = msg;
    console.log(`id: ${id}, message: ${data[1]}`);
  });
  process.exit(0);
}
