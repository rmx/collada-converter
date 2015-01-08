
module rmx {


    /**
    * One piece of geometry with one material
    */
    export class ModelChunk {
        name: string;
        triangle_count: number;
        index_offset: number;
        vertex_count: number;
        material_index: number;

        data_position: Float32Array;
        data_normal: Float32Array;
        data_texcoord: Float32Array;
        data_boneweight: Float32Array;
        data_boneindex: Uint8Array;
        data_indices: Uint32Array;

        constructor() {
            this.name = "";
            this.triangle_count = 0;
            this.vertex_count = 0;
            this.index_offset = 0;

            this.data_position = null;
            this.data_normal = null;
            this.data_texcoord = null;
            this.data_boneweight = null;
            this.data_boneindex = null;
            this.data_indices = null;

            this.material_index = 0;
        }
    }

}