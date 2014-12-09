/// <reference path="../math.ts" />

module COLLADA.Converter {

    export class BoundingBox {
        public min: Vec3;
        public max: Vec3;

        constructor() {
            this.min = vec3.create();
            this.max = vec3.create();
            this.reset();
        }

        reset() {
            vec3.set(this.min, Infinity, Infinity, Infinity);
            vec3.set(this.max, -Infinity, -Infinity, -Infinity);
        }

        fromPositions(p: Float32Array, offset: number, count: number) {
            this.reset();
            for (var i: number = 0; i < count; ++i) {
                for (var d: number = 0; d < 3; ++d) {
                    var value: number = p[(offset + i) * 3 + d];
                    this.min[d] = Math.min(this.min[d], value);
                    this.max[d] = Math.max(this.max[d], value);
                }
            }
        }

        extend(p: Vec3) {
            vec3.max(this.max, this.max, p);
            vec3.min(this.min, this.min, p);
        }

        extendBox(b: BoundingBox) {
            vec3.max(this.max, this.max, b.max);
            vec3.min(this.min, this.min, b.min);
        }
    }
}