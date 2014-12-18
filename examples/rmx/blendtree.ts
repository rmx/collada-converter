/// <reference path="./model-animation.ts" />
/// <reference path="./blendtree/node-bool.ts" />
/// <reference path="./blendtree/node-float.ts" />
/// <reference path="./blendtree/node-track.ts" />

module rmx {

    /**
    * Blend tree parameters
    */
    export class BlendTreeParameters {
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

    /**
    * Base interface for all blend tree nodes
    */
    export interface BlendTreeNode {
        updateParams(delta_time: number, params: BlendTreeParameters): void;
        /** Exports the skeleton pose at the current time */
        eval(skeleton: Skeleton, target: Pose): void;
        /** Advances the time by the given value (in seconds)*/
        advanceTime(delta_time: number): void;
        /** Sets the progress of the animation (between 0 and 1) */
        setProgress(value: number): void;
        /** Duration of the animation */
        duration: number;
    }

    /**
    * A blend tree
    */
    export class BlendTree {
        root: BlendTreeNode;
        params: BlendTreeParameters;

        constructor() {
            this.root = null;
            this.params = new BlendTreeParameters();
        }

        eval(skeleton: Skeleton, target: Pose): void {
            this.root.eval(skeleton, target);
        }

        animate(delta_time: number) {
            this.root.updateParams(delta_time, this.params);
            this.root.advanceTime(delta_time);
        }
    }

}
