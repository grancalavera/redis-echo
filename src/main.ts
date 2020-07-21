import redis from "redis";

const client = redis.createClient();

client.on("error", function (error) {
  console.error(error);
  console.error(Date.now());
});

client.set("key", "value", redis.print);
client.get("key", redis.print);

// ECONNREFUSED 127.0.0.1:6379
