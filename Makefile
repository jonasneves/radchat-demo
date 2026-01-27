.PHONY: help install dev build preview clean

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  install  Install dependencies"
	@echo "  dev      Run development server"
	@echo "  build    Build for production"
	@echo "  preview  Preview production build"
	@echo "  clean    Remove build artifacts"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

clean:
	rm -rf node_modules dist
