/// <reference path="./blendtree.ts" />
/// <reference path="./time.ts" />

module rmx {

    /**
    * Interpolates between several nodes according to one float parameter
    */
    export class BlendTreeNodeFloat implements BlendTreeNode {
        private progress: number;
        private value: number;
        private leftWeight: number;
        private rightWeight: number;
        private leftChild: BlendTreeNode;
        private rightChild: BlendTreeNode;
        private leftValue: number;
        private rightValue: number;
        private leftPose: Pose;
        private rightPose: Pose;

        constructor(
            skeleton: Skeleton,
            public children: BlendTreeNode[],
            public values: number[],
            public param: string,
            public paramChangeSpeed: number
        ) {
            this.progress = 0;
            this.leftPose = new Pose(skeleton);
            this.rightPose = new Pose(skeleton);
            this.leftChild = null;
            this.rightChild = null;
            this.leftValue = 0;
            this.rightValue = 0;
            this.value = 0;
            this.leftWeight = 0;
            this.rightWeight = 0;
        }

        updateState(delta_time: number, state: BlendTreeState): void {
            this.children.forEach((child) => { child.updateState(delta_time, state) });

            var values: number[] = this.values;

            var value: number = state.params.floats[this.param];
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
        }

        eval(skeleton: Skeleton, target: Pose, state: BlendTreeState): void {
            if (this.rightWeight >= 1) {
                this.rightChild.eval(skeleton, target, state);
            } else if (this.rightWeight <= 0) {
                this.leftChild.eval(skeleton, target, state);
            } else {
                this.leftChild.eval(skeleton, this.leftPose, state);
                this.rightChild.eval(skeleton, this.rightPose, state);
                blendPose(this.leftPose, this.rightPose, this.rightWeight, target);
            }
        }

        /** Advances the time by the given value (in seconds)*/
        advanceTime(delta_time: number, state: BlendTreeState): void {
            this.progress += delta_time / this.getDuration(state);
            this.progress = fixTime(this.progress, true);

            this.children.forEach((child) => { child.setProgress(this.progress, state); });
        }

        /** Sets the progress of the animation (between 0 and 1) */
        setProgress(value: number, state: BlendTreeState): void {
            this.progress = fixTime(value, true);

            this.children.forEach((child) => { child.setProgress(this.progress, state); });
        }

        getDuration(state: BlendTreeState): number {
            var leftDuration: number = this.leftChild.getDuration(state);
            var rightDuration: number = this.rightChild.getDuration(state);
            return this.leftWeight * leftDuration + this.rightWeight * rightDuration;
        }
    }

}