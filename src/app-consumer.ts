import { Consumer } from "./consumer";
import { controlPanel } from "./control-panel";

(async () => {
  const consumerName = process.argv[2] ?? "";
  const controlPanelPort = Number.parseInt(process.argv[3] ?? "9000");

  if (consumerName === "") {
    console.error("Please specify a consumer name");
    process.exit(1);
  }

  console.log("ok computer");

  const consumer = new Consumer(consumerName);

  controlPanel((value) => {
    consumer.toggleLazy(value);
  }, controlPanelPort);

  consumer.begin();
})();
