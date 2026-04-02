output "profile_bucket_urls" {
  value = {
    for env, bucket in google_storage_bucket.profile :
    env => "https://storage.googleapis.com/${bucket.name}"
  }
}

output "local_service_account_email" {
  value = google_service_account.local.email
}
