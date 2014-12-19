/// <reference path="../blendtree.ts" />

module rmx {

    /**
    * Plays back one of two nodes, depending on a bool parameter 
    */
    export class BlendTreeNodeBool implements BlendTreeNode {
        weight: number;
        truePose: Pose;
        falsePose: Pose;

        constructor(
            skeleton: Skeleton,
            public childTrue: BlendTreeNode,
            public childFalse: BlendTreeNode,
            public param: string,
            public transitionTime: number
        ) {
            this.truePose = new Pose(skeleton);
            this.falsePose = new Pose(skeleton);
            this.weight = 0;
        }

        updateState(delta_time: number, state: BlendTreeState): void {
            this.childTrue.updateState(delta_time, state);
            this.childFalse.updateState(delta_time, state);

            var value: number = state.params.floats[this.param];
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

        }

        static smoothstep(value: number): number {
            return value * value * (3 - 2 * value);
        }

        eval(skeleton: Skeleton, target: Pose): void {
            if (this.weight >= 1) {
                this.childTrue.eval(skeleton, target);
            } else if (this.weight <= 0) {
                this.childFalse.eval(skeleton, target);
            } else {
                this.childTrue.eval(skeleton, this.truePose);
                this.childFalse.eval(skeleton, this.falsePose);
                var weight = BlendTreeNodeBool.smoothstep(this.weight);
                blendPose(this.falsePose, this.truePose, weight, target);
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
}