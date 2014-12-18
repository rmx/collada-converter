/// <reference path="../blendtree.ts" />

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

        updateParams(delta_time: number, params: BlendTreeParameters): void {
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

        eval(skeleton: Skeleton, target: Pose): void {
            if (this.rightWeight >= 1) {
                this.rightChild.eval(skeleton, target);
            } else if (this.rightWeight <= 0) {
                this.leftChild.eval(skeleton, target);
            } else {
                this.leftChild.eval(skeleton, this.leftPose);
                this.rightChild.eval(skeleton, this.rightPose);
                blendPose(this.leftPose, this.rightPose, this.rightWeight, target);
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

}