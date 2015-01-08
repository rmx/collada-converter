/// <reference path="../model/skeleton.ts" />
/// <reference path="../animation/pose.ts" />
/// <reference path="./node.ts" />
/// <reference path="./state.ts" />

/// <reference path="./node-bool.ts" />
/// <reference path="./node-float.ts" />
/// <reference path="./node-track.ts" />

module rmx {

    /**
    * A blend tree
    */
    export class BlendTree {
        private root: BlendTreeNode;

        constructor(root: BlendTreeNode) {
            this.root = root;
        }

        update(delta_time: number, skeleton: Skeleton, state: BlendTreeState, target: Pose) {
            // TODO
            // all nodes use pose stack and do not create temp poses
            // rmx.BlendTreeNode.init() - reserve variables in state
            // all nodes do not use any local state - consider all members read only
            this.root.updateState(delta_time, state);
            this.root.advanceTime(delta_time, state);
            this.root.eval(skeleton, target, state);
        }
    }
}