# ---------------------------------------------------------------------------
# Cloud Scheduler – アバター（LINE / Discord）の定期更新バッチ
# 各環境の Cron エンドポイントを 1 日 1 回叩く。エンドポイント側に 24h クールダウンが
# あるため重複起動は安全（429 で弾かれる）。認可は CRON_SECRET の Bearer ヘッダ。
# ---------------------------------------------------------------------------

resource "google_project_service" "cloudscheduler" {
  project            = var.project_id
  service            = "cloudscheduler.googleapis.com"
  disable_on_destroy = false
}

resource "google_cloud_scheduler_job" "refresh_avatars" {
  for_each = toset(local.cloud_run_envs)

  name      = "refresh-avatars-${each.key}"
  project   = var.project_id
  region    = var.region
  schedule  = "0 4 * * *" # 毎日 04:00
  time_zone = "Asia/Tokyo"

  http_target {
    http_method = "GET"
    uri         = "${var.cloud_run_env_vars[each.key]["AUTH_URL"]}/api/cron/refresh-avatars"

    headers = {
      Authorization = "Bearer ${random_password.cron_secret[each.key].result}"
    }
  }

  depends_on = [google_project_service.cloudscheduler]
}

# ---------------------------------------------------------------------------
# Cloud Scheduler – Lusy GitHub Reminder Bot (issue #273)
# 毎日叩き、実際に通知するかどうかはエンドポイント側の
# NOTIFICATION_INTERVAL_DAYS (既定 3 日) のクールダウンで決める。
# 3 日周期でスケジュールすると 1 回失敗したとき次の実行が 3 日後になるため、
# 「毎日叩いてアプリ側で間引く」方式にしている (refresh-avatars と同じ)。
# ---------------------------------------------------------------------------

resource "google_cloud_scheduler_job" "lusy_digest" {
  for_each = toset(local.cloud_run_envs)

  name      = "lusy-digest-${each.key}"
  project   = var.project_id
  region    = var.region
  schedule  = "0 10 * * *" # 毎日 10:00 (JST)
  time_zone = "Asia/Tokyo"

  http_target {
    http_method = "GET"
    uri         = "${var.cloud_run_env_vars[each.key]["AUTH_URL"]}/api/cron/lusy-digest"

    headers = {
      Authorization = "Bearer ${random_password.cron_secret[each.key].result}"
    }
  }

  depends_on = [google_project_service.cloudscheduler]
}
