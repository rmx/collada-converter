#!/bin/sh

./node_modules/.bin/tsc src/loader.ts src/converter.ts src/exporter.ts -t ES5 -sourcemap -d --out lib/collada.js
./node_modules/.bin/uglifyjs lib/collada.js > lib/collada.min.js
./node_modules/.bin/tsc examples/convert.ts -t ES5 -sourcemap --out examples/convert.js