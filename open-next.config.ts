import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No remote cache resources are required during the database migration.
// SSR remains available; a shared incremental cache can be added separately.
export default defineCloudflareConfig();
