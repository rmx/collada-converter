// Code from https://github.com/lydell/json-stringify-pretty-compact
// Copyright 2014 Simon Lydell
// X11 (“MIT”) Licensed. (See LICENSE.)

module stringify {

    export function stringify(obj: any, options?: any) {
        options = options || {}
        var indent: string = JSON.stringify([1], null, get(options, "indent", 2)).slice(2, -3)
        var maxLength: number = (indent === "" ? Infinity : get(options, "maxLength", 80))

        return (function _stringify(obj: any, currentIndent: string, reserved: number) {
            if (obj && typeof obj.toJSON === "function") {
                obj = obj.toJSON()
            }

            var string = JSON.stringify(obj)

            if (string === undefined) {
                return string
            }

            var length = maxLength - currentIndent.length - reserved

            if (string.length <= length) {
                var prettified = prettify(string)
                if (prettified.length <= length) {
                    return prettified
                }
            }

            if (typeof obj === "object" && obj !== null) {
                var nextIndent = currentIndent + indent
                var items: string[] = []
                var delimiters: string
                var comma = function (array: any[], index: number) {
                    return (index === array.length - 1 ? 0 : 1)
                }

                if (Array.isArray(obj)) {
                    for (var index = 0; index < obj.length; index++) {
                        items.push(
                            _stringify(obj[index], nextIndent, comma(obj, index)) || "null"
                            )
                    }
                    delimiters = "[]"
                } else {
                    Object.keys(obj).forEach(function (key, index, array) {
                        var keyPart = JSON.stringify(key) + ": "
                        var value = _stringify(obj[key], nextIndent,
                            keyPart.length + comma(array, index))
                        if (value !== undefined) {
                            items.push(keyPart + value)
                        }
                    })
                    delimiters = "{}"
                }

                if (items.length > 0) {
                    return [
                        delimiters[0],
                        indent + items.join(",\n" + nextIndent),
                        delimiters[1]
                    ].join("\n" + currentIndent)
                }
            }

            return string
        } (obj, "", 0))
    }

    // Note: This regex matches even invalid JSON strings, but since we’re
    // working on the output of `JSON.stringify` we know that only valid strings
    // are present (unless the user supplied a weird `options.indent` but in
    // that case we don’t care since the output would be invalid anyway).
    var stringOrChar = /("(?:[^"]|\\.)*")|[:,]/g

    function prettify(string: string) {
        return string.replace(stringOrChar, function (match, string) {
            if (string) {
                return match
            }
            return match + " "
        })
    }

    function get<T>(options: any, name: string, defaultValue: T): T {
        return (name in options ? options[name] : defaultValue)
    }

}