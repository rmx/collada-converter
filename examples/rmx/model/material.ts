
module rmx {

    /**
    * A material.
    * Does not contain coefficients, use textures instead.
    */
    export class Material {
        diffuse: string;
        specular: string;
        normal: string;

        constructor() {
            this.diffuse = null;
            this.specular = null;
            this.normal = null;
        }

        hash(): string {
            return "material|" + (this.diffuse || "") + "|" + (this.specular || "") + "|" + (this.normal || "");
        }
    }
}