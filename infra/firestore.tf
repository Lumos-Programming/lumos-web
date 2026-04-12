resource "google_firestore_database" "production" {
  project                     = var.project_id
  name                        = "(default)"
  location_id                 = var.region
  type                        = "FIRESTORE_NATIVE"
  deletion_policy             = "PREVENT"
  delete_protection_state     = "DELETE_PROTECTION_ENABLED"

  lifecycle {
    prevent_destroy = true
    ignore_changes  = all
  }
}

resource "google_firestore_database" "development" {
  project                           = var.project_id
  name                              = "development"
  location_id                       = var.region
  type                              = "FIRESTORE_NATIVE"
  point_in_time_recovery_enablement = "POINT_IN_TIME_RECOVERY_ENABLED"
  deletion_policy                   = "PREVENT"
  delete_protection_state           = "DELETE_PROTECTION_ENABLED"

  lifecycle {
    prevent_destroy = true
    ignore_changes  = all
  }
}

resource "google_firestore_database" "staging" {
  project                           = var.project_id
  name                              = "staging"
  location_id                       = var.region
  type                              = "FIRESTORE_NATIVE"
  point_in_time_recovery_enablement = "POINT_IN_TIME_RECOVERY_ENABLED"
  deletion_policy                   = "PREVENT"
  delete_protection_state           = "DELETE_PROTECTION_ENABLED"

  lifecycle {
    prevent_destroy = true
    ignore_changes  = all
  }
}

resource "google_firestore_backup_schedule" "staging_daily" {
  project  = var.project_id
  database = google_firestore_database.staging.name

  retention = "2592000s" # 30 days

  daily_recurrence {}

  lifecycle {
    prevent_destroy = true
    ignore_changes  = all
  }
}
