# ---------------------------------------------------------------------------
# Cloud Scheduler – 定期実行バッチ
# 各環境の Cron エンドポイントを 1 日 1 回叩く。認可はいずれも CRON_SECRET の
# Bearer ヘッダ（secrets.tf の random_password.cron_secret を Cloud Run と共有）。
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

# 誕生日通知: 環境ごとの BIRTHDAY_NOTIFICATION_CHANNEL_ID へ Bot で通知する。
# 対象がいない日は no-op（notified: false）で返るため毎日叩いて問題ない。
resource "google_cloud_scheduler_job" "birthday" {
  for_each = toset(local.cloud_run_envs)

  name      = "birthday-notification-${each.key}"
  project   = var.project_id
  region    = var.region
  schedule  = "0 9 * * *" # 毎朝 09:00
  time_zone = "Asia/Tokyo"

  http_target {
    http_method = "GET"
    uri         = "${var.cloud_run_env_vars[each.key]["AUTH_URL"]}/api/cron/birthday"

    headers = {
      Authorization = "Bearer ${random_password.cron_secret[each.key].result}"
    }
  }

  depends_on = [google_project_service.cloudscheduler]
}

# 週次宝くじ (#377): 毎週金曜 17:00 JST にチケットを締め切り、17:30 に抽選して
# 環境ごとの LOTTERY_NOTIFICATION_CHANNEL_ID へ結果を投稿する。抽選済みの回は結果を変えない。
resource "google_cloud_scheduler_job" "lottery" {
  for_each = toset(local.cloud_run_envs)

  name      = "weekly-lottery-${each.key}"
  project   = var.project_id
  region    = var.region
  schedule  = "30 17 * * 5" # 毎週金曜 17:30
  time_zone = "Asia/Tokyo"

  http_target {
    http_method = "GET"
    uri         = "${var.cloud_run_env_vars[each.key]["AUTH_URL"]}/api/cron/lottery"

    headers = {
      Authorization = "Bearer ${random_password.cron_secret[each.key].result}"
    }
  }

  depends_on = [google_project_service.cloudscheduler]
}
