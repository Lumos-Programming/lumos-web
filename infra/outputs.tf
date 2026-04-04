output "profile_bucket_urls" {
  value = {
    for env, bucket in google_storage_bucket.profile :
    env => "https://storage.googleapis.com/${bucket.name}"
  }
}

output "local_service_account_email" {
  value = google_service_account.local.email
}

output "cloud_run_service_accounts" {
  value = {
    for env, sa in google_service_account.cloud_run :
    env => sa.email
  }
}

output "cloud_run_urls" {
  value = {
    for env, svc in google_cloud_run_service.web :
    env => svc.status[0].url
  }
}
