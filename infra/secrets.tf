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
