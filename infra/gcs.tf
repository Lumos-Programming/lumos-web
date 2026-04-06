resource "google_storage_bucket" "profile" {
  for_each = toset(var.environments)

  name     = "lumos-ynu-profile-${each.key}"
  project  = var.project_id
  location = var.region

  uniform_bucket_level_access = true

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }
}

resource "google_storage_bucket_iam_member" "profile_public" {
  for_each = google_storage_bucket.profile

  bucket = each.value.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
