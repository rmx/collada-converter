/// <reference path="./animation-track.ts" />

module rmx {


    /**
    * A skinned mesh animation
    */
    export class Animation {
        name: string;
        frames: number;
        fps: number;
        tracks: AnimationTrack[];

        constructor() {
            this.name = "";
            this.frames = 0;
            this.fps = 0;
            this.tracks = [];
        }
    }

}