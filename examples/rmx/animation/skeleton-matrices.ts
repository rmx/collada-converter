/// <reference path="./bone-matrix-texture.ts" />

module rmx {

    /**
    * Stores the transformation of all skeleton bones (in composed matrix form)
    */
    export class SkeletonMatrices {
        world_matrices: Float32Array;
        skin_matrices: Float32Array;

        constructor(texture: BoneMatrixTexture) {
            this.world_matrices = new Float32Array(texture.capacity() * 16);
            this.skin_matrices = new Float32Array(texture.capacity() * 16);
        }
    }
}