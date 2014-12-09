/// <reference path="./model-animation.ts" />

class RMXBlendTreeParameters {
    floats: { [name: string]: number };
    strings: { [name: string]: string };

    constructor() {
        this.floats = {};
        this.strings = {};
    }
}

interface RMXBlendTreeNode {
    eval(delta_time: number, skeleton: RMXSkeleton, target: RMXPose, params: RMXBlendTreeParameters): void;
}

/**
* Plays back an animation track
*/
class RMXBlendTreeNodeTrack implements RMXBlendTreeNode {
    time: number;

    constructor(
        skeleton: RMXSkeleton,
        public animation: RMXAnimation,
        public begin: number,
        public end: number,
        public duration: number,
        public loop: boolean
    ) {
        this.time = 0;
    }

    eval(delta_time: number, skeleton: RMXSkeleton, target: RMXPose, params: RMXBlendTreeParameters): void {
        this.time += delta_time;

        if (this.loop) {
            this.time = this.time % this.duration;
            if (this.time < 0) {
                this.time = this.duration + this.time
            }
        } else {
            this.time = Math.min(this.time, this.duration);
            this.time = Math.max(this.time, 0);
        }

        var progress: number = this.time / this.duration;
        var frame: number = this.begin + progress * (this.end - this.begin);

        RMXSkeletalAnimation.sampleAnimation(this.animation, skeleton, target, frame);
    }
}

/**
* Interpolates between several nodes according to one float parameter
*/
class RMXBlendTreeNode1D implements RMXBlendTreeNode {
    left: RMXPose;
    right: RMXPose;

    constructor(
        skeleton: RMXSkeleton,
        public children: RMXBlendTreeNode[],
        public values: number[],
        public param: string
    ) {
        this.left = new RMXPose(skeleton);
        this.right = new RMXPose(skeleton);
    }

    eval(delta_time: number, skeleton: RMXSkeleton, target: RMXPose, params: RMXBlendTreeParameters): void {

        var value: number = params.floats[this.param];
        var values: number[] = this.values;

        for (var i = 0; i < values.length - 1; ++i) {
            var value_left = values[i];
            var value_right = values[i + 1];
            if ((value_left <= value) && (value <= value_right)) {
                // TODO: This design with delta_time won't work.
                // TODO: Need to update the time on children even if they are not used for blending
                this.children[i+0].eval(delta_time, skeleton, this.left, params);
                this.children[i + 1].eval(delta_time, skeleton, this.right, params);
                var t = (value - value_left) / (value_right - value_left);
                RMXSkeletalAnimation.blendPose(this.left, this.right, t, target);
            }
        }
    }
}