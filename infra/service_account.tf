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

