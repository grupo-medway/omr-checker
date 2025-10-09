.PHONY: help install dev test lint clean audit-demo api web

# Default target
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install all dependencies (Python + Node.js)
	@echo "📦 Installing Python dependencies..."
	python3 -m pip install --user -r requirements.txt
	python3 -m pip install --user -r requirements-api.txt
	python3 -m pip install --user -r requirements.dev.txt
	@echo "📦 Installing Node.js dependencies..."
	cd web && npm install
	@echo "✅ Dependencies installed successfully!"

dev: ## Start development servers (API + Web)
	@echo "🚀 Starting development servers..."
	@echo "API: http://localhost:8000"
	@echo "Web: http://localhost:3000"
	@echo ""
	@echo "Press Ctrl+C to stop both servers"
	@trap 'kill 0' INT; \
		(uvicorn api.main:app --reload --host 0.0.0.0 --port 8000 & echo $$! > api.pid) & \
		(cd web && npm run dev & echo $$! > ../web.pid) & \
		wait

api: ## Start only the API server
	@echo "🚀 Starting API server on http://localhost:8000..."
	uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

web: ## Start only the Web frontend
	@echo "🚀 Starting Web frontend on http://localhost:3000..."
	cd web && npm run dev

test: ## Run all tests (pytest + vitest)
	@echo "🧪 Running Python tests..."
	python3 -m pytest -v
	@echo ""
	@echo "🧪 Running Frontend tests..."
	cd web && npm run test -- --run
	@echo "✅ All tests passed!"

lint: ## Run code quality checks
	@echo "🔍 Running pre-commit hooks..."
	pre-commit run --all-files

clean: ## Clean temporary files and reset environment
	@echo "🧹 Cleaning temporary files..."
	python3 scripts/cleanup.py
	@echo "✅ Environment cleaned!"

audit-demo: ## Run end-to-end audit demo
	@echo "🎯 Running audit demo..."
	@bash scripts/demo.sh
	@echo "✅ Demo completed successfully!"

format: ## Format code with black and isort
	@echo "🎨 Formatting Python code..."
	black .
	isort --profile black .
	@echo "✅ Code formatted!"

build-web: ## Build web frontend for production
	@echo "🏗️  Building web frontend..."
	cd web && npm run build
	@echo "✅ Frontend built successfully!"

docker-build: ## Build Docker image
	@echo "🐳 Building Docker image..."
	docker build -t omr-checker .
	@echo "✅ Docker image built!"

docker-run: ## Run Docker container
	@echo "🐳 Running Docker container..."
	docker run -p 8000:8000 -v $(PWD)/storage:/app/storage omr-checker
