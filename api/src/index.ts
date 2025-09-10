
// Load env vars in dev/hmg/prd
import 'dotenv/config';
// Explicit file extensions are required for Node.js ESM resolution
import { buildApp } from "./server.js";


buildApp().catch(err => {
  console.error(err);
  process.exit(1);
});
