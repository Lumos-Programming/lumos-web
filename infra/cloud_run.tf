# ---------------------------------------------------------------------------
# Cloud Run services (dev / stg / prd)
# ---------------------------------------------------------------------------

resource "google_cloud_run_service" "web" {
  for_each = toset(local.cloud_run_envs)

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
          for_each = var.cloud_run_env_vars[each.key]
          content {
            name  = env.key
            value = env.value
          }
        }

        # --- secrets (per-environment) ---
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
