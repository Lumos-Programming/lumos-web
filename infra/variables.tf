variable "project_id" {
  type    = string
  default = "lumos-infra"
}

variable "region" {
  type    = string
  default = "asia-northeast1"
}

variable "environments" {
  type    = list(string)
  default = ["local", "dev", "stg", "prd"]
}

# ---------------------------------------------------------------------------
# Cloud Run – plain-text environment variables per environment
# ---------------------------------------------------------------------------
variable "cloud_run_env_vars" {
  type = map(map(string))
  default = {
    dev = {
      AUTH_GITHUB_ID       = "Ov23liN6oGK1lfbZm3P2"
      AUTH_X_ID            = "eW5jSnZRbEFBLWJMY1Z3NTFmVXQ6MTpjaQ"
      AUTH_LINE_ID         = "2009690509"
      AUTH_LINKEDIN_ID     = "86hiyrhp1dyb83"
      AUTH_DISCORD_ID      = "1489548152779309197"
      AUTH_SECRET          = "0c2fc3086369094cd28a129808841a91"
      AUTH_URL             = "https://dev.lumos-ynu.jp"
      FIRESTORE_DATABASE_ID = "development"
      FIREBASE_PROJECT_ID  = "lumos-infra"
      GCS_BUCKET_NAME      = "lumos-ynu-profile-dev"
      LINE_PUSH_TARGET_ID  = "C39f62528b0c75c22e5feb50620989bd3"
    }
    stg = {
      AUTH_GITHUB_ID       = "Ov23liN6oGK1lfbZm3P2"
      AUTH_X_ID            = "eW5jSnZRbEFBLWJMY1Z3NTFmVXQ6MTpjaQ"
      AUTH_LINE_ID         = "2007506282"
      AUTH_LINKEDIN_ID     = "86hiyrhp1dyb83"
      AUTH_DISCORD_ID      = ""
      AUTH_SECRET          = ""
      AUTH_URL             = "https://stg.lumos-ynu.jp"
      FIRESTORE_DATABASE_ID = "development"
      FIREBASE_PROJECT_ID  = "lumos-infra"
      GCS_BUCKET_NAME      = "lumos-ynu-profile-stg"
      LINE_PUSH_TARGET_ID  = "C39f62528b0c75c22e5feb50620989bd3"
    }
    prd = {
      AUTH_GITHUB_ID       = "Ov23liaSCNoELzDDQ71W"
      AUTH_X_ID            = "eW5jSnZRbEFBLWJMY1Z3NTFmVXQ6MTpjaQ"
      AUTH_LINE_ID         = "2007506282"
      AUTH_LINKEDIN_ID     = "86hiyrhp1dyb83"
      AUTH_DISCORD_ID      = ""
      AUTH_SECRET          = ""
      AUTH_URL             = "https://lumos-ynu.jp"
      FIRESTORE_DATABASE_ID = "production"
      FIREBASE_PROJECT_ID  = "lumos-infra"
      GCS_BUCKET_NAME      = "lumos-ynu-profile-prd"
      LINE_PUSH_TARGET_ID  = "C39f62528b0c75c22e5feb50620989bd3"
    }
  }
}
