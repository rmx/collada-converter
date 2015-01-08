/// <reference path="./params.ts" />

module rmx {

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
