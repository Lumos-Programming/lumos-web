resource "google_firestore_database" "production" {
  project                           = var.project_id
  name                              = "(default)"
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

resource "google_firestore_backup_schedule" "production_daily" {
  project  = var.project_id
  database = google_firestore_database.production.name

  retention = "2592000s" # 30 days

  daily_recurrence {}

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

# ---------------------------------------------------------------------------
# TTL – Lusy GitHub Reminder Bot (issue #273)
# 完了イベントと通知ログは放置すると無限に増えるため、expiresAt で自動削除する。
# 書き込み側は lib/lusy/store.ts が expiresAt を必ず入れる。
# ---------------------------------------------------------------------------

locals {
  firestore_databases = {
    prd = google_firestore_database.production.name
    dev = google_firestore_database.development.name
    stg = google_firestore_database.staging.name
  }

  lusy_ttl_collections = ["lusyCompletionEvents", "lusyNotificationLog"]

  lusy_ttl_fields = {
    for pair in flatten([
      for env, db in local.firestore_databases : [
        for c in local.lusy_ttl_collections : {
          key        = "${env}-${c}"
          database   = db
          collection = c
        }
      ]
    ]) : pair.key => pair
  }
}

resource "google_firestore_field" "lusy_ttl" {
  for_each = local.lusy_ttl_fields

  project    = var.project_id
  database   = each.value.database
  collection = each.value.collection
  field      = "expiresAt"

  ttl_config {}

  # TTL 設定のみが目的。expiresAt で検索はしないので単一フィールドインデックスは不要。
  index_config {}
}
