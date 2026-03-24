.PHONY: install dev build start clean lint typecheck

# Install dependencies
install:
	npm install

# Start development server
dev:
	npm run dev

# Production build
build:
	npm run build

# Start production server (requires build first)
start:
	npm run start

# Lint the project
lint:
	npm run lint

# Type-check without emitting
typecheck:
	npx tsc --noEmit

# Remove build artifacts and dependencies
clean:
	rm -rf .next node_modules out

# Full rebuild: clean, install, build
rebuild: clean install build
