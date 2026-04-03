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
