import "dotenv/config";
import { refreshMarketData } from "../lib/services/market/refresh";

async function main() {
  console.log("Running refresh-market-data job...");
  const result = await refreshMarketData();
  console.log(`Written: ${result.written} snapshot row(s)`);
  if (result.errors.length > 0) {
    console.log(`Errors (${result.errors.length}):`);
    for (const e of result.errors) console.log(`  - ${e}`);
  } else {
    console.log("No errors.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
