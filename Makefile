.PHONY: build test

build:
	cd build_and_deploy && npm ic && npm run build
	npx -y @vercel/ncc@0.38.4 build build_and_deploy/dist/main.js -o dist

test:
	cd build_and_deploy && npm run test
