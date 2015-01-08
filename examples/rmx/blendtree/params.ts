
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

}