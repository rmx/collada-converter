/// <reference path="../model/skeleton.ts" />
/// <reference path="../animation/pose.ts" />
/// <reference path="./state.ts" />

module rmx {

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
}