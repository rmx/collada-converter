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

    export function fixTime(progress: number, loop: boolean): number {
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
        updateState(delta_time: number, state: BlendTreeState): void;
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
        private root: BlendTreeNode;
        private skeleton: Skeleton;

        constructor(root: BlendTreeNode, skeleton: Skeleton) {
            this.skeleton = skeleton;
            this.root = root;
        }

        update(delta_time: number, state: BlendTreeState) {
            this.root.updateState(delta_time, state);
            this.root.advanceTime(delta_time);
        }

        eval(target: Pose): void {
            this.root.eval(this.skeleton, target);
        }
    }

    export class BlendTreeState {
        params: BlendTreeParameters;
        state: Float32Array;

        constructor() {
            this.params = new BlendTreeParameters();
            this.state = null;
        }
    }
}
