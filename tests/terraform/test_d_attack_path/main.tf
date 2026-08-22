resource "aws_security_group" "public_sg" {
  ingress {
    from_port = 22
    to_port = 22
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_iam_role" "app_role" {
  name = "app_role"
}

resource "aws_iam_role_policy" "app_policy" {
  name = "app_policy"
  role = aws_iam_role.app_role.id
  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "*",
      "Resource": "*",
      "Effect": "Allow"
    }
  ]
}
EOF
}

resource "aws_iam_instance_profile" "app_profile" {
  name = "app_profile"
  role = aws_iam_role.app_role.name
}

resource "aws_instance" "app_server" {
  ami = "ami-123456"
  instance_type = "t2.micro"
  vpc_security_group_ids = [aws_security_group.public_sg.id]
  iam_instance_profile = aws_iam_instance_profile.app_profile.name
}

resource "aws_db_instance" "prod_db" {
  allocated_storage = 20
  engine = "postgres"
  instance_class = "db.t2.micro"
  password = "securepassword"
  username = "admin"
  tags = {
    Environment = "production"
  }
}
