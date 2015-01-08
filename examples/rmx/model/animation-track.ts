
module rmx {


    /**
    * An animation track.
    * Contains animation curves for the transformation of a single bone.
    */
    export class AnimationTrack {
        bone: number;
        pos: Float32Array;
        rot: Float32Array;
        scl: Float32Array;

        constructor() {
            this.bone = 0;
            this.pos = null;
            this.rot = null;
            this.scl = null;
        }
    }
}