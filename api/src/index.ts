
// Load env vars in dev/hmg/prd
import 'dotenv/config';
// Explicit file extensions are required for Node.js ESM resolution
import { startServer } from "./server.js";


startServer().catch(err => {
  console.error(err);
  process.exit(1);
});
