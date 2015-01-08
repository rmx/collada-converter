/// <reference path="./chunk.ts" />
/// <reference path="./skeleton.ts" />
/// <reference path="./material.ts" />
/// <reference path="./animation.ts" />

module rmx {

    /**
    * A skinned mesh with an animation
    */
    export class Model {
        chunks: ModelChunk[];
        skeleton: Skeleton;
        materials: Material[];
        animations: Animation[];

        constructor() {
            this.chunks = [];
            this.skeleton = new Skeleton();
            this.materials = [];
            this.animations = [];
        }
    }
}