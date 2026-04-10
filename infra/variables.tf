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
      ADMIN_ROLE_ID            = "1368939833162076200"
      RETURNING_MEMBER_ROLE_ID = "1492146121663971409"

      AUTH_GITHUB_ID = "Ov23liN6oGK1lfbZm3P2"
      AUTH_X_ID      = "eW5jSnZRbEFBLWJMY1Z3NTFmVXQ6MTpjaQ"
      AUTH_LINE_ID   = "2009690509"

      AUTH_DISCORD_ID       = "1489548152779309197"
      DISCORD_GUILD_ID      = "1368752707321729158"
      AUTH_URL              = "https://dev.lumos-ynu.jp"
      FIRESTORE_DATABASE_ID = "development"
      FIREBASE_PROJECT_ID   = "lumos-infra"
      GCS_BUCKET_NAME       = "lumos-ynu-profile-dev"
      LINE_PUSH_TARGET_ID   = "C1634d113e1d5a316077098b5776b94b5"
      LINE_GROUP_ID         = "C1634d113e1d5a316077098b5776b94b5"
    }
    stg = {
      ADMIN_ROLE_ID            = "1368939833162076200"
      RETURNING_MEMBER_ROLE_ID = "1492146121663971409"

      AUTH_GITHUB_ID = "Ov23li6SPPesKvJDqXiO"
      AUTH_X_ID      = "MktOVXFWdWNFZzN5VzI2TXJFZ2Q6MTpjaQ"
      AUTH_LINE_ID   = "2009694131"

      AUTH_DISCORD_ID       = "1377983265948041228"
      DISCORD_GUILD_ID      = "1368752707321729158"
      AUTH_URL              = "https://stg.lumos-ynu.jp"
      FIRESTORE_DATABASE_ID = "staging"
      FIREBASE_PROJECT_ID   = "lumos-infra"
      GCS_BUCKET_NAME       = "lumos-ynu-profile-stg"
      LINE_PUSH_TARGET_ID   = "C5a28521ffe1f42b16998bd506acab713"
      LINE_GROUP_ID         = "C5a28521ffe1f42b16998bd506acab713"
    }
    prd = {
      ADMIN_ROLE_ID            = "1478450042749849670"
      RETURNING_MEMBER_ROLE_ID = "1356896104351793154"

      AUTH_GITHUB_ID = "Ov23liaSCNoELzDDQ71W"
      AUTH_X_ID      = "UUthQmxHVlY1anFBU0VtWmQxUmU6MTpjaQ"
      AUTH_LINE_ID   = "1661094871"

      AUTH_DISCORD_ID       = "933021504319422544"
      DISCORD_GUILD_ID      = "894226019240800276"
      AUTH_URL              = "https://lumos-ynu.jp"
      FIRESTORE_DATABASE_ID = "" // this should use default db (default)
      FIREBASE_PROJECT_ID   = "lumos-infra"
      GCS_BUCKET_NAME       = "lumos-ynu-profile-prd"
      LINE_PUSH_TARGET_ID   = "Ca2a9d031634839fbf0e57faff0c00eb6"
      LINE_GROUP_ID         = "Ca2a9d031634839fbf0e57faff0c00eb6"
    }
  }
}
