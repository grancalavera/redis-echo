import Redis from "ioredis";
const redis = new Redis();

type RedisStream = [RedisId, RedisMessage[]];
type RedisMessage = [RedisId, string[]];
type RedisId = string;

const messages = ["a", "b", "c", "d", "e", "f"];

main();

async function main() {
  const stream1 = "stream-1";
  const stream2 = "stream-2";

  await Promise.all(
    messages.flatMap((m) => [
      redis.xadd(stream1, "*", "message", m),
      redis.xadd(stream2, "*", "message", m),
    ])
  );

  const result: RedisStream[] = (await redis.xread([
    "STREAMS",
    stream1,
    stream2,
    0,
    0,
  ])) as any;

  result[0][1].forEach((msg) => {
    const [id, data] = msg;
    console.log(`msg id: ${id}, message: ${data[1]}`);
  });

  await redis.del(stream1, stream2);
  process.exit(0);
}
