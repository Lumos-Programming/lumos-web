# ---------------------------------------------------------------------------
# Cloud Run services (dev / stg / prd)
# ---------------------------------------------------------------------------

resource "google_cloud_run_service" "web" {
  for_each = toset(local.cloud_run_envs)

  depends_on = [google_secret_manager_secret_iam_member.database_migration]

  name     = "lumos-web-${each.key}"
  location = var.region
  project  = var.project_id

  metadata {
    annotations = {
      "run.googleapis.com/ingress" = "all"
    }
  }

  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale"     = "100"
        "run.googleapis.com/startup-cpu-boost" = "true"
        "run.googleapis.com/client-name"       = "terraform"
      }
    }

    spec {
      service_account_name = google_service_account.cloud_run[each.key].email

      containers {
        image = "asia-northeast1-docker.pkg.dev/${var.project_id}/lumos-web/${each.key}:latest"

        ports {
          name           = "http1"
          container_port = 8080
        }

        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }

        # --- plain-text env vars (per-environment values from variables) ---
        dynamic "env" {
          for_each = merge(var.cloud_run_env_vars[each.key], {
            DATABASE_MIGRATION_STAGE = local.database_migration[each.key].stage
            DATABASE_WRITES_PAUSED   = tostring(contains(var.database_migration_writes_paused, each.key))
            }, local.database_migration[each.key].stage == "firestore-only" ? {} : {
            CLOUDFLARE_ACCOUNT_ID     = local.database_migration[each.key].account_id
            CLOUDFLARE_D1_DATABASE_ID = local.database_migration[each.key].database_id
          })
          content {
            name  = env.key
            value = env.value
          }
        }

        # --- secrets (per-environment) ---
        dynamic "env" {
          for_each = local.database_migration[each.key].stage == "firestore-only" ? [] : [local.database_migration[each.key].api_token_secret_id]
          content {
            name = "CLOUDFLARE_API_TOKEN"
            value_from {
              secret_key_ref {
                name = env.value
                key  = "latest"
              }
            }
          }
        }
        env {
          name = "AUTH_SECRET"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.per_env["auth-secret-${each.key}"].secret_id
              key  = "latest"
            }
          }
        }
        env {
          name = "AUTH_GITHUB_SECRET"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.per_env["github-oauth-secret-${each.key}"].secret_id
              key  = "latest"
            }
          }
        }
        env {
          name = "AUTH_X_SECRET"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.per_env["x-oauth-secret-${each.key}"].secret_id
              key  = "latest"
            }
          }
        }
        env {
          name = "AUTH_LINE_SECRET"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.per_env["line-oauth-secret-${each.key}"].secret_id
              key  = "latest"
            }
          }
        }
        env {
          name = "AUTH_DISCORD_SECRET"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.per_env["discord-oauth-secret-${each.key}"].secret_id
              key  = "latest"
            }
          }
        }
        env {
          name = "DISCORD_BOT_TOKEN"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.per_env["discord-token-${each.key}"].secret_id
              key  = "latest"
            }
          }
        }
        env {
          name = "LINE_GROUP_INVITE_URL"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.per_env["line-group-url-${each.key}"].secret_id
              key  = "latest"
            }
          }
        }
        env {
          name = "LINE_INVITE_SUPPORT_URL"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.per_env["line-support-friend-url-${each.key}"].secret_id
              key  = "latest"
            }
          }
        }
        env {
          name = "LINE_WEBHOOK_SECRET"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.per_env["line-webhook-secret-${each.key}"].secret_id
              key  = "latest"
            }
          }
        }
        env {
          name = "LINE_CHANNEL_ACCESS_TOKEN"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.per_env["line-channel-access-token-${each.key}"].secret_id
              key  = "latest"
            }
          }
        }
        env {
          name = "LINE_BOT_FRIEND_URL"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.per_env["line-bot-friend-url-${each.key}"].secret_id
              key  = "latest"
            }
          }
        }
        env {
          name = "ADMIN_NOTIFICATION_CHANNEL_WEBHOOK"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.per_env["admin-notification-channel-webhook-${each.key}"].secret_id
              key  = "latest"
            }
          }
        }
        env {
          name = "CRON_SECRET"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.per_env["cron-secret-${each.key}"].secret_id
              key  = "latest"
            }
          }
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  lifecycle {
    ignore_changes = [
      # CI/CD deploys new images – don't revert on terraform apply
      template[0].metadata[0].annotations["run.googleapis.com/client-name"],
      template[0].spec[0].containers[0].image,
    ]
  }
}

# Allow unauthenticated access (public)
resource "google_cloud_run_service_iam_member" "public_invoker" {
  for_each = toset(local.cloud_run_envs)

  service  = google_cloud_run_service.web[each.key].name
  location = var.region
  project  = var.project_id
  role     = "roles/run.invoker"
  member   = "allUsers"
}
