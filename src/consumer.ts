import Redis from "ioredis";
import { groupName, streamName } from "./consumer-group";
const r = new Redis();

const consumerName = process.argv[2];
const checkBacklog = (process.argv[3] ?? "") === "true";

if (!consumerName) {
  console.error("Please specify a consumer name");
  process.exit(1);
}

main();

async function main() {
  await loop("0-0", true);
}

async function loop(nextId: string, checkBacklog: boolean): Promise<void> {
  const id = checkBacklog ? nextId : ">";
  const items = await r.xreadgroup(
    "GROUP",
    groupName,
    consumerName,
    "BLOCK",
    "2000",
    "COUNT",
    "10",
    "STREAMS",
    streamName,
    id
  );

  if (items.length === 0) {
    console.log("Timeout!");
    return loop(id, checkBacklog);
  }

  const backlogIsEmpty = items[0][1].length === 0;

  console.log(items);

  for (const item of items[0][1]) {
    console.log(item);
  }

  return Promise.resolve();
}

const processMessage = (id: string, msg: any): void => {
  console.log(`${consumerName} ${id} = ${msg.inspect}`);
};
