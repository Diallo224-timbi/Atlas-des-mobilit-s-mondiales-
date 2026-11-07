.PHONY: serve data process test
serve:
	python3 -m http.server 8000

data:
	python3 scripts/download_data.py

process:
	python3 scripts/process_data.py

test:
	node tests/test-transformations.js
