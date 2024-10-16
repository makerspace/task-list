watch: install
	NODE_ENV=development node build.mjs

install:
	npm install

build: install
	NODE_ENV=production node build.mjs