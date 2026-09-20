provider "aws" {
  region = "us-east-1"
}

resource "aws_security_group" "public_ssh" {
  name = "public-ssh"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_s3_bucket" "public_logs" {
  bucket = "secagent-demo-public-logs"
  acl    = "public-read"
}

resource "aws_iam_policy" "wildcard" {
  name = "wildcard-policy"
  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*"
    }
  ]
}
EOF
}
