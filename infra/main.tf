terraform {
  required_version = ">= 1.0"

  backend "gcs" {
    bucket = "lumos-infra-terraform-state"
    prefix = "terraform/state"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
