/// <reference path="../model.ts" />

module rmx {

    /**
    * Stores the bone matrices in a WebGL texture.
    */
    export class BoneMatrixTexture {
        size: number;
        texture: WebGLTexture;

        /**
        * Number of bones a texture of the given width can store.
        */
        static capacity(size: number): number {
            var texels = size * size;
            var texels_per_matrix = 4;
            return texels / texels_per_matrix;
        }

        /**
        * Number of bones this texture can store.
        */
        capacity(): number {
            return BoneMatrixTexture.capacity(this.size);
        }

        /**
        * The smallest texture size that can hold the given number of bones.
        */
        static optimalSize(bones: number): number {
            var result = 2;
            while (BoneMatrixTexture.capacity(result) < bones) {
                result = result * 2;

                // A 2K x 2K texture can hold 1 million bones.
                // It is unlikely a skinned mesh will use more than that.
                if (result > 2048) throw new Error("Too many bones");
            }

            return result;
        }

        constructor(skeleton: Skeleton) {
            this.size = BoneMatrixTexture.optimalSize(skeleton.bones.length);
            this.texture = null;
        }

        init(gl: WebGLRenderingContext) {
            this.texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.texture);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.size, this.size, 0, gl.RGBA, gl.FLOAT, null);

            gl.bindTexture(gl.TEXTURE_2D, null);
        }

        update(data: SkeletonMatrices, gl: WebGLRenderingContext) {
            if (this.texture == null) {
                this.init(gl);
            }

            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            // Apparently texImage can be faster than texSubImage (?!?)
            // gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.size, this.size, gl.RGBA, gl.FLOAT, data.skin_matrices);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.size, this.size, 0, gl.RGBA, gl.FLOAT, data.skin_matrices);
        }
    }

}