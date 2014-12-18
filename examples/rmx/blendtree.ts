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

interface RMXAnimationTime {
    /** Current time, in seconds */
    time: number;
    /** Progress: 0.0 is the begin, 1.0 the end of the animation */
    progress: number;
    /** Duration, in seconds */
    duration: number;
    /** Looping */
    loop: boolean;
}

function fixTime(time: number, duration: number, loop: boolean): number {
    if (loop) {
        time = time % duration;
        if (time < 0) {
            time = duration + time;
        }
        return time;
    } else {
        if (time < 0) {
            return 0;
        } else if (time > duration) {
            return duration;
        } else {
            return time;
        }
    }
}

interface RMXBlendTreeNode extends RMXAnimationTime {
    updateParams(params: RMXBlendTreeParameters): void;
    /** Exports the skeleton pose at the current time */
    eval(skeleton: RMXSkeleton, target: RMXPose): void;
    /** Current time, in seconds */
    time: number;
    /** Progress: 0.0 is the begin, 1.0 the end of the animation */
    progress: number;
    /** Duration, in seconds */
    duration: number;
    /** Looping */
    loop: boolean;
}

/**
* Plays back an animation track
*/
class RMXBlendTreeNodeTrack implements RMXBlendTreeNode {
    private _time: number;
    private _duration: number;

    constructor(
        skeleton: RMXSkeleton,
        public animation: RMXAnimation,
        public begin: number,
        public end: number,
        public loop: boolean
    ) {
        var frames = end - begin;
        this._duration = frames / animation.fps;
        this._time = 0;
    }

    updateParams(params: RMXBlendTreeParameters): void { }

    eval(skeleton: RMXSkeleton, target: RMXPose): void {
        var progress: number = this.progress;
        var frame: number = this.begin + progress * (this.end - this.begin);

        RMXSkeletalAnimation.sampleAnimation(this.animation, skeleton, target, frame);
    }

    get time(): number { return this._time; }
    set time(value: number) {
        this._time = fixTime(value, this._duration, this.loop);
    }

    get progress(): number { return this._time / this._duration; }
    set progress(value: number) {
        this._time = value * this._duration;
        this._time = fixTime(value, this._duration, this.loop);
    }

    get duration(): number { return this._duration; }
    set duration(value: number) {
        this._duration = value;
        this._time = fixTime(value, this._duration, this.loop);
    }
}

/**
* Interpolates between several nodes according to one float parameter
*/
class RMXBlendTreeNode1D implements RMXBlendTreeNode {
    private _progress: number;
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
        public param: string
    ) {
        this._progress = 0;
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

    updateParams(params: RMXBlendTreeParameters): void {
        var values: number[] = this.values;
        var value: number = params.floats[this.param];
        this.value = value;

        for (var i = 0; i < values.length - 1; ++i) {
            var value_left = values[i];
            var value_right = values[i + 1];
            if ((value_left <= value) && (value <= value_right)) {
                this.leftChild = this.children[i + 0];
                this.rightChild = this.children[i + 1];
                this.leftValue = value_left;
                this.rightValue = value_right;
                var t = (this.value - value_left) / (value_right - value_left);
                this.leftWeight = t;
                this.rightWeight = 1 - t;
                break;
            }
        }

        

        this.children.forEach((child) => { child.updateParams(params) });
    }

    eval(skeleton: RMXSkeleton, target: RMXPose): void {
        this.leftChild.eval(skeleton, this.leftPose);
        this.rightChild.eval(skeleton, this.rightPose);
        RMXSkeletalAnimation.blendPose(this.leftPose, this.leftPose, this.leftWeight, target);
    }

    get time(): number { return this._progress * this.duration; }
    set time(value: number) {
        this._progress = fixTime(value / this.duration, 1, true);
        this.children.forEach((child) => { child.progress = this._progress; });
    }

    get progress(): number { return this._progress; }
    set progress(value: number) {
        this._progress = fixTime(value, 1, true);
    }

    get duration(): number {
        return this.leftWeight * this.leftChild.duration + this.rightWeight * this.rightChild.duration;
    }
    set duration(value: number) { 
        throw new Error("Not supported")
    }

    get loop(): boolean { return true; }
    set loop(value: boolean) {
        throw new Error("Not supported");
    }
}