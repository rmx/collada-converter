/// <reference path="./model-animation.ts" />

/**
* Blend tree parameters
*/
class RMXBlendTreeParameters {
    floats: { [name: string]: number };
    strings: { [name: string]: string };

    constructor() {
        this.floats = {};
        this.strings = {};
    }
}

function fixTime(progress: number, loop: boolean): number {
    if (loop) {
        return progress - Math.floor(progress);
    } else if (progress < 0) {
        return 0;
    } else if (progress > 1) {
        return 1;
    } else {
        return progress;
    }
}

interface RMXBlendTreeNode {
    updateParams(delta_time: number, params: RMXBlendTreeParameters): void;
    /** Exports the skeleton pose at the current time */
    eval(skeleton: RMXSkeleton, target: RMXPose): void;
    /** Advances the time by the given value (in seconds)*/
    advanceTime(delta_time: number): void;
    /** Sets the progress of the animation (between 0 and 1) */
    setProgress(value: number): void;
    /** Duration of the animation */
    duration: number;
}

class RMXBlendTree {
    root: RMXBlendTreeNode;
    params: RMXBlendTreeParameters;

    constructor() {
        this.root = null;
        this.params = new RMXBlendTreeParameters();
    }

    eval(skeleton: RMXSkeleton, target: RMXPose): void {
        this.root.eval(skeleton, target);
    }

    animate(delta_time: number) {
        this.root.updateParams(delta_time, this.params);
        this.root.advanceTime(delta_time);
    }
}

/**
* Plays back an animation track
*/
class RMXBlendTreeNodeTrack implements RMXBlendTreeNode {
    private progress: number;
    public duration: number;

    constructor(
        skeleton: RMXSkeleton,
        public animation: RMXAnimation,
        public begin: number,
        public end: number,
        public loop: boolean,
        public phase: number
    ) {
        var frames = end - begin;
        this.duration = frames / animation.fps;
        this.progress = 0;
    }

    updateParams(delta_time: number, params: RMXBlendTreeParameters): void { }

    eval(skeleton: RMXSkeleton, target: RMXPose): void {
        var progress: number = this.progress + this.phase;
        progress = progress - Math.floor(progress);
        var frame: number = this.begin + progress * (this.end - this.begin);

        RMXSkeletalAnimation.sampleAnimation(this.animation, skeleton, target, frame);
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
}

/**
* Interpolates between several nodes according to one float parameter
*/
class RMXBlendTreeNode1D implements RMXBlendTreeNode {
    private progress: number;
    private value: number;
    private leftWeight: number;
    private rightWeight: number;
    private leftChild: RMXBlendTreeNode;
    private rightChild: RMXBlendTreeNode;
    private leftValue: number;
    private rightValue: number;
    private leftPose: RMXPose;
    private rightPose: RMXPose;

    constructor(
        skeleton: RMXSkeleton,
        public children: RMXBlendTreeNode[],
        public values: number[],
        public param: string,
        public paramChangeSpeed: number
    ) {
        this.progress = 0;
        this.leftPose = new RMXPose(skeleton);
        this.rightPose = new RMXPose(skeleton);
        this.leftChild = null;
        this.rightChild = null;
        this.leftValue = 0;
        this.rightValue = 0;
        this.value = 0;
        this.leftWeight = 0;
        this.rightWeight = 0;
    }

    updateParams(delta_time: number, params: RMXBlendTreeParameters): void {
        var values: number[] = this.values;

        var value: number = params.floats[this.param];
        var maxDelta: number = delta_time * this.paramChangeSpeed;
        var delta = Math.max(Math.min(value - this.value, maxDelta), -maxDelta);
        this.value += delta;

        for (var i = 0; i < values.length - 1; ++i) {
            var value_left = values[i];
            var value_right = values[i + 1];
            if ((value_left <= this.value) && (this.value <= value_right)) {
                this.leftChild = this.children[i + 0];
                this.rightChild = this.children[i + 1];
                this.leftValue = value_left;
                this.rightValue = value_right;
                var t = (this.value - value_left) / (value_right - value_left);
                this.leftWeight = 1 - t;
                this.rightWeight = t;
                break;
            }
        }

        this.children.forEach((child) => { child.updateParams(delta_time, params) });
    }

    eval(skeleton: RMXSkeleton, target: RMXPose): void {
        if (this.rightWeight >= 1) {
            this.rightChild.eval(skeleton, target);
        } else if (this.rightWeight <= 0) {
            this.leftChild.eval(skeleton, target);
        } else {
            this.leftChild.eval(skeleton, this.leftPose);
            this.rightChild.eval(skeleton, this.rightPose);
            RMXSkeletalAnimation.blendPose(this.leftPose, this.rightPose, this.rightWeight, target);
        }
    }

    /** Advances the time by the given value (in seconds)*/
    advanceTime(delta_time: number): void {
        this.progress += delta_time / this.duration;
        this.progress = fixTime(this.progress, true);

        this.children.forEach((child) => { child.setProgress(this.progress); });
    }

    /** Sets the progress of the animation (between 0 and 1) */
    setProgress(value: number): void {
        this.progress = fixTime(value, true);

        this.children.forEach((child) => { child.setProgress(this.progress); });
    }

    get duration(): number {
        return this.leftWeight * this.leftChild.duration + this.rightWeight * this.rightChild.duration;
    }
}



/**
* Plays back one of two nodes, depending on a bool parameter 
*/
class RMXBlendTreeNodeBool implements RMXBlendTreeNode {
    weight: number;
    truePose: RMXPose;
    falsePose: RMXPose;

    constructor(
        skeleton: RMXSkeleton,
        public childTrue: RMXBlendTreeNode,
        public childFalse: RMXBlendTreeNode,
        public param: string,
        public transitionTime: number
    ) {
        this.truePose = new RMXPose(skeleton);
        this.falsePose = new RMXPose(skeleton);
        this.weight = 0;
    }

    updateParams(delta_time: number, params: RMXBlendTreeParameters): void {
        var value: number = params.floats[this.param];
        if (value > 0.5 && this.weight < 1) {
            this.weight += delta_time / this.transitionTime;
        } else if (value < 0.5 && this.weight > 0) {
            this.weight -= delta_time / this.transitionTime;
        }

        if (this.weight < 0) {
            this.weight = 0;
        } else if (this.weight > 1) {
            this.weight = 1;
        }

        this.childTrue.updateParams(delta_time, params);
        this.childFalse.updateParams(delta_time, params);
    }

    static smoothstep(value: number): number {
        return value * value * (3 - 2 * value);
    }

    eval(skeleton: RMXSkeleton, target: RMXPose): void {
        if (this.weight >= 1) {
            this.childTrue.eval(skeleton, target);
        } else if (this.weight <= 0) {
            this.childFalse.eval(skeleton, target);
        } else {
            this.childTrue.eval(skeleton, this.truePose);
            this.childFalse.eval(skeleton, this.falsePose);
            var weight = RMXBlendTreeNodeBool.smoothstep(this.weight);
            RMXSkeletalAnimation.blendPose(this.falsePose, this.truePose, weight, target);
        }
    }

    /** Advances the time by the given value (in seconds)*/
    advanceTime(delta_time: number): void {
        if (this.weight <= 0) {
            this.childTrue.setProgress(0);
            this.childFalse.advanceTime(delta_time);
        } else if (this.weight >= 1) {
            this.childTrue.advanceTime(delta_time);
            this.childFalse.setProgress(0);
        } else {
            this.childTrue.advanceTime(delta_time);
            this.childFalse.advanceTime(delta_time);
        }
    }

    /** Sets the progress of the animation (between 0 and 1) */
    setProgress(value: number): void {
        // Doesn't really make sense...
        this.childTrue.setProgress(value);
        this.childFalse.setProgress(value);
    }

    get duration(): number {
        if (this.weight > 0.5) {
            return this.childTrue.duration;
        } else {
            return this.childFalse.duration;
        }
    }
}