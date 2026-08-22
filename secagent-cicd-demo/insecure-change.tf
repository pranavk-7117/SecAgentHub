# Insecure Pull Request Change (feature/insecure-change branch)
# Introduces:
# 1. Open SSH ingress to 0.0.0.0/0 on security group (T1190 Exploit Public-Facing App)
# 2. Wildcard IAM Role with Action: "*" and Resource: "*" (T1078.004 Cloud Account Takeover)
# 3. Instance profile connecting public compute to wildcard IAM
# 4. Public access to production database (T1530 Data Exfiltration)
#
# Result: Creates deterministic attack path:
# Internet -> Public SG -> EC2 -> IAM Wildcard -> Production RDS Database

resource "aws_security_group" "public_web_sg" {
  name        = "public-web-security-group"
  description = "Dangerous open SSH ingress"
  vpc_id      = aws_vpc.production_vpc.id

  ingress {
    description = "SSH from anywhere - VULNERABILITY"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
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

resource "aws_iam_role" "wildcard_admin_role" {
  name = "production-admin-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "wildcard_admin_policy" {
  name = "wildcard-admin-policy"
  role = aws_iam_role.wildcard_admin_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = "*"
      Effect   = "Allow"
      Resource = "*"
    }]
  })
}

resource "aws_iam_instance_profile" "web_admin_profile" {
  name = "web-admin-profile"
  role = aws_iam_role.wildcard_admin_role.name
}

resource "aws_instance" "exposed_web_server" {
  ami                  = "ami-0c55b159cbfafe1f0"
  instance_type        = "t3.micro"
  vpc_security_group_ids = [aws_security_group.public_web_sg.id]
  iam_instance_profile = aws_iam_instance_profile.web_admin_profile.name

  tags = {
    Name        = "exposed-web-server"
    Environment = "production"
  }
}
