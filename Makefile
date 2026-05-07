.PHONY: build dev clean help

PYTHON ?= python
PORT   ?= 8080

help:
	@echo "make build   - generate public/data/repos.json + build.json"
	@echo "make dev     - serve public/ on http://localhost:$(PORT)"
	@echo "make clean   - remove generated artifacts"

build:
	$(PYTHON) build.py

dev:
	$(PYTHON) -m http.server -d public $(PORT)

clean:
	rm -f public/data/repos.json public/data/build.json
