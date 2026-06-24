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
