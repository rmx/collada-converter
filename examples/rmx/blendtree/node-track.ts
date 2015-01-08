/// <reference path="./blendtree.ts" />
/// <reference path="./time.ts" />

module rmx {

    /**
    * Plays back an animation track
    */
    export class BlendTreeNodeTrack implements BlendTreeNode {
        private progress: number;
        public duration: number;

        constructor(
            skeleton: Skeleton,
            public animation: Animation,
            public begin: number,
            public end: number,
            public loop: boolean,
            public phase: number
        ) {
            var frames = end - begin;
            this.duration = frames / animation.fps;
            this.progress = 0;
        }

        updateState(delta_time: number, state: BlendTreeState): void {

        }

        eval(skeleton: Skeleton, target: Pose): void {
            var progress: number = this.progress + this.phase;
            progress = progress - Math.floor(progress);
            var frame: number = this.begin + progress * (this.end - this.begin);

            sampleAnimation(this.animation, skeleton, target, frame);
        }

        /** Advances the time by the given value (in seconds)*/
        advanceTime(delta_time: number): void {
            this.progress += delta_time / this.duration;
            this.progress = fixTime(this.progress, this.loop);
        }

        /** Sets the progress of the animation (between 0 and 1) */
        setProgress(value: number): void {
            this.progress = fixTime(value, this.loop);
        }

        getDuration(state: BlendTreeState): number {
            return this.duration;
        }
    }

}
