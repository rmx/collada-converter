module parseAnimations {

    export class AnimationLabel {
        name: string;
        begin: number;
        end: number;
        fps: number;

        constructor() {
            this.name = null;
            this.begin = null;
            this.begin = null;
            this.fps = null;
        }
    }

    function isNumber(str: string): boolean {
        return !isNaN(parseInt(str, 10));
    }

    function isString(str: string): boolean {
        return !isNumber(str);
    }

    /** Count number of elements for which the callback returns true */
    function count<T>(data: T[], callback: (t: T) => boolean): number {
        var result = 0;
        data.forEach((t) => {
            if (callback(t)) {
                result++;
            }
        });
        return result;
    }

    /** Returns true if all elements of data have the same content at the given index */
    function sameContent<T>(data: T[][], indexFn: (element:T[])=>number): boolean {
        if (data.length < 2) {
            return false;
        }
        var contents = data.map((line) => {
            var index = indexFn(line);
            if (index < 0 || line.length <= index) {
                return null;
            } else {
                return line[index];
            }
        });
        return contents.every((content) => {
            return content !== null && content === contents[0];
        });
    }

    function guessLabel(line: string[]): AnimationLabel {
        var numbers = line.filter(isNumber).map((str) => parseInt(str, 10));
        var strings = line.filter(isString);

        if (numbers.length < 2 || strings.length < 1) {
            return null;
        }

        var result = new AnimationLabel;
        result.name = strings.join(" ");
        result.begin = numbers.reduce((prev, cur) => Math.min(prev, cur), Infinity);
        result.end = numbers.reduce((prev, cur) => Math.max(prev, cur), -Infinity);
        return result;
    }

    export function parse(source: string): AnimationLabel[]{

        var lines = source.split(/\r\n|[\n\v\f\r\x85\u2028\u2029]/);

        // Remove trailing whitespace
        lines = lines.map((line) => line.trim());

        // Split lines
        var parts = lines.map((line) => line.split(/[\s-:;,]+/));

        // Remove invalid lines
        var parts = parts.filter((line) => {
            if (line.length < 3) return false;
            if (count(line, isNumber) < 2) return false;
            if (count(line, isString) < 1) return false;
            return true;
        });

        // Longest line
        var maxLength = parts.reduce((prev, cur) => Math.max(prev, cur.length), 0);

        // Remove parts that are the same on each line (from the beginning of each line)
        var i = 0;
        while (i < maxLength) {
            if (sameContent(parts,() => i)) {
                parts = parts.map((line) => line.filter((value, index) => index !== i));
                maxLength--;
            } else {
                i++;
            }
        }

        // Remove parts that are the same on each line (from the end of each line)
        i = 0;
        while (i < maxLength) {
            if (sameContent(parts,(str) => str.length - i - 1)) {
                parts = parts.filter((value, index) => index !== i);
                maxLength--;
            } else {
                i++;
            }
        }

        // Extract labels from each line
        var labels = parts.map((line) => guessLabel(line));

        return labels.filter((label) => label !== null);
    }


}