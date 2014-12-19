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
        eval(skeleton: Skeleton, target: Pose, state: BlendTreeState): void;
        /** Advances the time by the given value (in seconds)*/
        advanceTime(delta_time: number, state: BlendTreeState): void;
        /** Sets the progress of the animation (between 0 and 1) */
        setProgress(value: number, state: BlendTreeState): void;
        /** Duration of the animation */
        getDuration(state: BlendTreeState): number;
    }

    /**
    * A blend tree
    */
    export class BlendTree {
        private root: BlendTreeNode;

        constructor(root: BlendTreeNode) {
            this.root = root;
        }

        update(delta_time: number, skeleton: Skeleton, state: BlendTreeState, target: Pose) {
            TODO 
            // rmx.PoseStack
            // all nodes use pose stack and do not create temp poses
            // rmx.BlendTreeNode.init() - reserve variables in state
            // all nodes do not use any local state - consider all members read only
            this.root.updateState(delta_time, state);
            this.root.advanceTime(delta_time, state);
            this.root.eval(skeleton, target, state);
        }
    }

    /**
    * All the state of a blend tree instance
    */
    export class BlendTreeState {
        params: BlendTreeParameters;
        state: Float32Array;

        constructor() {
            this.params = new BlendTreeParameters();
            this.state = null;
        }
    }
}
