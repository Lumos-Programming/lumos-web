resource "google_service_account" "local" {
  account_id   = "lumos-web-local"
  display_name = "Lumos Web Local Development"
  project      = var.project_id
}

resource "google_storage_bucket_iam_member" "local_sa_profile" {
  bucket = google_storage_bucket.profile["local"].name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.local.email}"
}

# ---------------------------------------------------------------------------
# Cloud Run service accounts (dev / stg / prd)
# ---------------------------------------------------------------------------
locals {
  cloud_run_envs = ["dev", "stg", "prd"]
}

resource "google_service_account" "cloud_run" {
  for_each = toset(local.cloud_run_envs)

  account_id   = "lumos-web-${each.key}"
  display_name = "lumos-web-${each.key}"
  project      = var.project_id
}

resource "google_project_iam_member" "cloud_run_firebase" {
  for_each = toset(local.cloud_run_envs)

  project = var.project_id
  role    = "roles/firebase.sdkAdminServiceAgent"
  member  = "serviceAccount:${google_service_account.cloud_run[each.key].email}"
}

