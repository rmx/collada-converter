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

        eval(skeleton: Skeleton, target: Pose, state: BlendTreeState): void {
            if (this.weight >= 1) {
                this.childTrue.eval(skeleton, target, state);
            } else if (this.weight <= 0) {
                this.childFalse.eval(skeleton, target, state);
            } else {
                this.childTrue.eval(skeleton, this.truePose, state);
                this.childFalse.eval(skeleton, this.falsePose, state);
                var weight = BlendTreeNodeBool.smoothstep(this.weight);
                blendPose(this.falsePose, this.truePose, weight, target);
            }
        }

        /** Advances the time by the given value (in seconds)*/
        advanceTime(delta_time: number, state: BlendTreeState): void {
            if (this.weight <= 0) {
                this.childTrue.setProgress(0, state);
                this.childFalse.advanceTime(delta_time, state);
            } else if (this.weight >= 1) {
                this.childTrue.advanceTime(delta_time, state);
                this.childFalse.setProgress(0, state);
            } else {
                this.childTrue.advanceTime(delta_time, state);
                this.childFalse.advanceTime(delta_time, state);
            }
        }

        /** Sets the progress of the animation (between 0 and 1) */
        setProgress(value: number, state: BlendTreeState): void {
            // Doesn't really make sense...
            this.childTrue.setProgress(value, state);
            this.childFalse.setProgress(value, state);
        }

        getDuration(state: BlendTreeState): number {
            if (this.weight > 0.5) {
                return this.childTrue.getDuration(state);
            } else {
                return this.childFalse.getDuration(state);
            }
        }
    }
}