# Stage changes are applied independently per environment after copy/replay/verify.
# Empty defaults keep every Cloud Run service on Firestore with no Cloudflare
# account, secret or scheduled migration job required.
variable "database_migration" {
  type = map(object({
    stage               = string
    account_id          = string
    database_id         = string
    api_token_secret_id = string
  }))
  default = {}

  validation {
    condition = alltrue([
      for env, config in var.database_migration :
      contains(["dev", "stg", "prd"], env) &&
      contains(["firestore-only", "firestore-primary", "d1-primary", "d1-only"], config.stage) &&
      (config.stage == "firestore-only" || (config.account_id != "" && config.database_id != "" && config.api_token_secret_id != ""))
    ])
    error_message = "Each dev/stg/prd entry must use a valid migration stage; D1 stages require account_id, database_id and an existing Secret Manager api_token_secret_id."
  }
}

variable "database_migration_writes_paused" {
  description = "Environments under a migration write freeze. Drain old revisions before running copy or verification."
  type        = set(string)
  default     = []
  validation {
    condition     = alltrue([for env in var.database_migration_writes_paused : contains(["dev", "stg", "prd"], env)])
    error_message = "Only dev, stg and prd can be paused."
  }
}

locals {
  database_migration = {
    for env in local.cloud_run_envs : env => lookup(var.database_migration, env, {
      stage               = "firestore-only"
      account_id          = ""
      database_id         = ""
      api_token_secret_id = ""
    })
  }
  database_migration_d1 = {
    for env, config in local.database_migration : env => config if config.stage != "firestore-only"
  }
  database_migration_dual = {
    for env, config in local.database_migration : env => config if contains(["firestore-primary", "d1-primary"], config.stage)
  }
}

# The token value is populated outside Terraform; it is never a plaintext env var.
resource "google_secret_manager_secret_iam_member" "database_migration" {
  for_each  = local.database_migration_d1
  project   = var.project_id
  secret_id = each.value.api_token_secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run[each.key].email}"
}

resource "google_cloud_scheduler_job" "database_migration" {
  for_each         = local.database_migration_dual
  name             = "database-migration-${each.key}"
  project          = var.project_id
  region           = var.region
  schedule         = "* * * * *"
  time_zone        = "Asia/Tokyo"
  attempt_deadline = "300s"

  http_target {
    http_method = "GET"
    uri         = "${var.cloud_run_env_vars[each.key]["AUTH_URL"]}/api/cron/database-migration"
    headers = {
      Authorization = "Bearer ${random_password.cron_secret[each.key].result}"
    }
  }

  depends_on = [google_project_service.cloudscheduler]
}
