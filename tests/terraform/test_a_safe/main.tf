resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_security_group" "private_sg" {
  vpc_id = aws_vpc.main.id
  ingress {
    from_port = 22
    to_port = 22
    protocol = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }
}

resource "aws_instance" "app" {
  ami = "ami-123456"
  instance_type = "t2.micro"
  vpc_security_group_ids = [aws_security_group.private_sg.id]
}

resource "aws_db_instance" "prod_db" {
  allocated_storage = 20
  engine = "postgres"
  instance_class = "db.t2.micro"
  password = "securepassword"
  username = "admin"
  storage_encrypted = true
  tags = {
    Environment = "production"
  }
}
