/// <reference path="../model/skeleton.ts" />

module rmx {

    /**
    * Stores the transformation of all skeleton bones (in decomposed pos/rot/scl form).
    */
    export class Pose {
        pos: Float32Array;
        rot: Float32Array;
        scl: Float32Array;

        constructor(skeleton: Skeleton) {
            this.pos = new Float32Array(skeleton.bones.length * 3);
            this.rot = new Float32Array(skeleton.bones.length * 4);
            this.scl = new Float32Array(skeleton.bones.length * 3);
        }
    }
}