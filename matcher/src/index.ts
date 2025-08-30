import 'dotenv/config';
import { initKafka } from "./kafka.js";
import { startMatcher } from "./engine.js";

async function main() {
  await initKafka();
  await startMatcher();
  console.log("Matcher up…");
}

main().catch(err => {
  console.error(err);
  process.exit(1);

});
