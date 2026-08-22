# Secure Baseline Infrastructure (main branch)
# - VPC scoped to private CIDR 10.0.0.0/16
# - SSH ingress restricted to internal CIDR only (no 0.0.0.0/0)
# - Encrypted RDS PostgreSQL Database with public access disabled

provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "production_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "production-vpc"
    Environment = "production"
  }
}

resource "aws_security_group" "private_app_sg" {
  name        = "private-app-security-group"
  description = "Restricted ingress for internal application tier"
  vpc_id      = aws_vpc.production_vpc.id

  ingress {
    description = "SSH from internal bastion only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Environment = "production"
  }
}

resource "aws_instance" "app_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  vpc_security_group_ids = [aws_security_group.private_app_sg.id]

  tags = {
    Name        = "production-app-server"
    Environment = "production"
  }
}

resource "aws_db_instance" "production_db" {
  allocated_storage   = 20
  engine              = "postgres"
  engine_version      = "15"
  instance_class      = "db.t3.micro"
  db_name             = "production_db"
  username            = "db_admin"
  password            = "VeryStrongPassword2026!"
  storage_encrypted   = true
  publicly_accessible = false
  skip_final_snapshot = true

  tags = {
    Name        = "production-database"
    Environment = "production"
    Sensitivity = "high"
  }
}
