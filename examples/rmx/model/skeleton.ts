/// <reference path="./bone.ts" />

module rmx {

    /**
    * A skinned mesh skeleton
    */
    export class Skeleton {
        bones: Bone[];

        constructor() {
            this.bones = [];
        }
    }
}