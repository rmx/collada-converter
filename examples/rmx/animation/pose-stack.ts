/// <reference path="../model.ts" />
/// <reference path="./pose.ts" />

module rmx {

    /**
    * A stack of poses.
    * Use if you need temporary poses, e.g., in a complex pose blending setup.
    */
    export class PoseStack {
        private poses: Pose[];
        private pointer: number;
        private skeleton: Skeleton;

        constructor(skeleton: Skeleton) {
            this.poses = [];
            this.skeleton = skeleton;
            this.reset();
        }

        reset(): void {
            this.pointer = 0;
        }

        push(): Pose {
            while (this.poses.length <= this.pointer) {
                this.poses.push(new Pose(this.skeleton));
            }

            var result = this.poses[this.pointer];
            this.pointer++;
            return result;
        }

        pop(): void {
            this.pointer--;
        }
    }
}