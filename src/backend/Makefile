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

seed:
	go run cmd/seeder/main.go -seed

seed-clear:
	go run cmd/seeder/main.go -clear

seed-stats:
	go run cmd/seeder/main.go -stats

docker-build:
	docker build -t anidex-backend .

docker-run:
	docker-compose up -d

docker-down:
	docker-compose down

.PHONY: swagger run build test deps migrate seed seed-clear seed-stats docker-build docker-run docker-run docker-down