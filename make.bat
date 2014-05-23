@REM Build library
@ECHO building collada.js
@CALL node node_modules/typescript/bin/tsc src/loader.ts src/converter.ts src/exporter.ts -t ES5 -sourcemap -d --out lib/collada.js

@REM UglifyJS library
@ECHO building collada.min.js
@CALL node node_modules/uglify-js/bin/uglifyjs lib/collada.js > lib/collada.min.js

@REM Build example
@ECHO building convert.js
@CALL node node_modules/typescript/bin/tsc examples/convert.ts -t ES5 -sourcemap --out examples/convert.js

@PAUSE