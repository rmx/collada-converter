/// <reference path="external/gl-matrix.i.ts" />

module COLLADA {

    export interface NumberArray {
        length: number;
        [index: number]: number;
    }

    export class MathUtils {
        contructor() {
        }

        static TO_RADIANS: number = Math.PI / 180.0;

        static round(num: number, decimals: number): number {
            if (decimals !== null) {
                // Nice, but does not work for scientific notation numbers
                // return +(Math.round(+(num + "e+" + decimals)) + "e-" + decimals);
                return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
            } else {
                return num;
            }
        }

        static copyNumberArray(src: NumberArray, dest: NumberArray, count: number) {
            for (var i: number = 0; i < count; ++i) {
                dest[i] = src[i];
            }
        }

        static copyNumberArrayOffset(src: NumberArray, srcOffset: number, dest: NumberArray, destOffset: number, count: number) {
            for (var i: number = 0; i < count; ++i) {
                dest[destOffset + i] = src[srcOffset + i];
            }
        }

        /**
        * Calls the given function for each src[i*stride + offset]
        */
        static forEachElement(src: NumberArray, stride: number, offset: number, fn: (x: number) => void) {
            var count = src.length / stride;
            for (var i: number = 0; i < count; ++i) {
                fn(src[i * stride + offset]);
            }
        }

        /**
        * Extracts a 4D matrix from an array of matrices (stored as an array of numbers)
        */
        static mat4Extract(src: NumberArray, srcOff: number, dest: Mat4) {
            for (var i: number = 0; i < 16; ++i) {
                dest[i] = src[srcOff * 16 + i];
            }
            // Collada matrices are row major
            // glMatrix matrices are column major
            // webgl matrices are column major
            mat4.transpose(dest, dest);
        }

        private static _decomposeVec3: Vec3 = vec3.create();
        private static _decomposeMat3: Mat3 = mat3.create();
        private static _decomposeMat4: Mat4 = mat4.create();
        static decompose(mat: Mat4, pos: Vec3, rot: Quat, scl: Vec3) {
            var tempVec3: Vec3 = MathUtils._decomposeVec3;
            var tempMat3: Mat3 = MathUtils._decomposeMat3;
            var tempMat4: Mat4 = MathUtils._decomposeMat4;

            // Translation
            vec3.set(pos, mat[12], mat[13], mat[14]);

            // Scale
            scl[0] = vec3.length(vec3.fromValues(mat[0], mat[1], mat[2]));
            scl[1] = vec3.length(vec3.fromValues(mat[4], mat[5], mat[6]));
            scl[2] = vec3.length(vec3.fromValues(mat[8], mat[9], mat[10]));

            // Remove the scaling from the remaining transformation matrix
            // This will greatly improve the precision of the matrix -> quaternion conversion
            // FIXME: for non-uniform scale, this might not be the correct order of scale and rotation
            vec3.set(tempVec3, 1 / scl[0], 1 / scl[1], 1 / scl[2]);
            mat4.scale(tempMat4, mat, tempVec3);

            // Rotation
            mat3.fromMat4(tempMat3, tempMat4);
            quat.fromMat3(rot, tempMat3);
            quat.normalize(rot, rot);
            rot[3] = -rot[3]; // Because glmatrix matrix-to-quaternion somehow gives the inverse rotation

            // Checking the precision of the conversion
            if (false) {
                MathUtils.compose(pos, rot, scl, tempMat4);
                for (var i = 0; i < 16; ++i) {
                    if (Math.abs(tempMat4[i] - mat[i]) > 1e-6) {
                        throw new Error("Low precision decomposition");
                    }
                }
            }
        }

        static compose(pos: Vec3, rot: Quat, scl: Vec3, mat: Mat4): void {
            mat4.identity(mat);
            mat4.scale(mat, mat, scl);
            mat4.fromRotationTranslation(mat, rot, pos);
        }

        static bakeTransform(mat: Mat4, scale: Vec3, rotation: Mat4, transform: Mat4) {

            // Old translation
            var translation: Vec3 = vec3.fromValues(mat[12], mat[13], mat[14]);

            // Compute new translation
            vec3.transformMat4(translation, translation, transform);

            // Compute new rotation
            mat4.multiply(mat, rotation, mat);

            // Set new translation
            mat[12] = translation[0];
            mat[13] = translation[1];
            mat[14] = translation[2];
        }

        static bezier(p0: number, c0: number, c1: number, p1: number, s: number): number {
            if (s < 0 || s > 1) throw new Error("Invalid Bezier parameter: " + s);
            return p0 * (1 - s) * (1 - s) * (1 - s) + 3 * c0 * s * (1 - s) * (1 - s) + 3 * c1 * s * s * (1 - s) + p1 * s * s * s;
        }

        static hermite(p0: number, t0: number, t1: number, p1: number, s: number): number {
            if (s < 0 || s > 1) throw new Error("Invalid Hermite parameter: " + s);
            var s2: number = s * s;
            var s3: number = s2 * s;
            return p0 * (2 * s3 - 3 * s2 + 1) + t0 * (s3 - 2 * s2 + s) + p1 * (-2 * s3 + 3 * s2) + t1 * (s3 - s2);
        }

        /**
        * Given a monotonously increasing function fn and a value target_y, finds a value x with 0<=x<=1 such that fn(x)=target_y
        */
        static bisect(target_y: number, fn: (x: number) => number, tol_y: number, max_iterations: number): number {
            var x0: number = 0;
            var x1: number = 1;
            var y0: number = fn(x0);
            var y1: number = fn(x1);
            if (target_y <= y0) return x0;
            if (target_y >= y1) return x1;

            var x: number = 0.5 * (x0 + x1);
            var y: number = fn(x);

            var iteration: number = 0;
            while (Math.abs(y - target_y) > tol_y) {

                // Update bounds
                if (y < target_y) {
                    x0 = x;
                } else if (y > target_y) {
                    x1 = x;
                } else {
                    return x;
                }

                // Update values
                x = 0.5 * (x0 + x1);
                y = fn(x);

                // Check iteration count
                ++iteration;
                if (iteration > max_iterations) {
                    throw new Error("Too many iterations");
                }
            }
            return x;
        }
    };
}