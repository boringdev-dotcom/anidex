swagger:
	swag init -g cmd/api/main.go -o docs

run:
	go run cmd/api/main.go

build:
	go build -o bin/api cmd/api/main.go

test:
	go test -v ./...

deps:
	go mod download
	go mod tidy

migrate:
	go run cmd/api/main.go

docker-build:
	docker build -t anidex-backend .

docker-run:
	docker-compose up -d

docker-down:
	docker-compose down

.PHONY: swagger run build test deps migrate docker-build docker-run docker-down