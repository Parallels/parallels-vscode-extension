.PHONY: help
help:
  # make version:
	# make test
	# make lint
	# make format
	# make build
	# make update-changelog
	


.PHONY: test
test:
	@echo "Running tests..."
	npm run test
	
.PHONY: lint
lint:
	@echo "Running lint..."
	npm run lint
	
.PHONY: format
format:
	@echo "Running format..."
	npm run format

.PHONY: build
build:
	@echo "Building..."
	npm run build

.PHONY: package
package:
	@echo "Releasing..."
	npm run package

.PHONY: check-for-release
check-for-release:
	@echo "Releasing..."
	npm run format-check
	npm run lint
	npm run build

.PHONY: update-changelog
update-changelog:
	@echo "Updating changelog..."
	./.github/workflow_scripts/generate-changelog.sh

.PHONY: version
version:
	@echo "Version..."
	npm run version