# ---------------------------------------------------------------------------
# Secret Manager – secrets & accessor bindings
# ---------------------------------------------------------------------------

# Secrets that exist per environment (dev / stg / prd)
locals {
  per_env_secrets = [
    "auth-secret",
    "github-oauth-secret",
    "x-oauth-secret",
    "line-oauth-secret",
    "discord-oauth-secret",
    "discord-token",
    "line-group-url",
    "line-support-friend-url",
    "line-webhook-secret",
    "line-channel-access-token",
    "line-bot-friend-url",
    "admin-notification-channel-webhook",
    "cron-secret",
    # Lusy GitHub Reminder Bot (issue #273)
    "github-app-private-key",
    "github-webhook-secret"
  ]

  # Build a flat map: "github-oauth-secret-dev" => { secret_suffix, env }
  per_env_secret_map = {
    for pair in flatten([
      for s in local.per_env_secrets : [
        for e in local.cloud_run_envs : {
          key    = "${s}-${e}"
          suffix = s
          env    = e
        }
      ]
    ]) : pair.key => pair
  }
}

resource "google_secret_manager_secret" "per_env" {
  for_each = local.per_env_secret_map

  secret_id = "lumos-ynu-${each.key}"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_iam_member" "per_env_accessor" {
  for_each = local.per_env_secret_map

  secret_id = google_secret_manager_secret.per_env[each.key].id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run[each.value.env].email}"
}

# ---------------------------------------------------------------------------
# cron-secret – Cloud Scheduler → Cron エンドポイント認可用の値を Terraform で生成
# Cloud Scheduler の Authorization: Bearer ヘッダと Cloud Run の CRON_SECRET env で共有する
# ---------------------------------------------------------------------------
resource "random_password" "cron_secret" {
  for_each = toset(local.cloud_run_envs)

  length  = 48
  special = false
}

resource "google_secret_manager_secret_version" "cron_secret" {
  for_each = toset(local.cloud_run_envs)

  secret      = google_secret_manager_secret.per_env["cron-secret-${each.key}"].id
  secret_data = random_password.cron_secret[each.key].result
}
