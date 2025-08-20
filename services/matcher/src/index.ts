import { initKafka } from "./kafka";
import { startMatcher } from "./engine";

async function main() {
  await initKafka();
  await startMatcher();
  console.log("Matcher up…");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
