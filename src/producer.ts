import Redis from "ioredis";
const r = new Redis();
import { groupName, streamName } from "./consumer-group";

main();

async function main() {
  try {
    await r.xgroup("create", streamName, groupName, "$", "mkstream");
  } catch (e) {
    console.log(e);
  }

  const messages = ["apple", "orange", "strawberry", "apricot", "banana"];

  for (const message of messages) {
    try {
      const result = await r.xadd(streamName, "*", "message", message);
      console.log(`${message}: ${result}`);
    } catch (e) {
      console.error(`failed to add message ${message}`);
    }
  }
}
