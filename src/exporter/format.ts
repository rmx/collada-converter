module COLLADA.Exporter {
    export interface BoundingBoxJSON {
        min: number[];
        max: number[];
    };

    export interface InfoJSON {
        /** Bounding box of the whole geometry */
        bounding_box: BoundingBoxJSON;
    };

    export interface DataChunkJSON {
        type: string;
        byte_offset: number;
        stride: number;
        count: number;
    };

    export interface MaterialJSON {
        name: string;
        diffuse: string;
        specular: string;
        normal: string;
    };

    /**
    * A geometry chunk.
    */
    export interface GeometryJSON {
        /** Name of this part */
        name: string;
        /** Material index */
        material: number;
        /** Total number of vertices */
        vertex_count: number;
        /** Total number of triangles */
        triangle_count: number;
        /** 3 uint16 elements per triangle */
        indices: DataChunkJSON;
        /** 3 float32 elements per vertex */
        position: DataChunkJSON;
        /** 3 float32 elements per vertex */
        normal: DataChunkJSON;
        /** 2 float32 elements per vertex */
        texcoord: DataChunkJSON;
        /** 4 float32 elements per vertex */
        boneweight: DataChunkJSON;
        /** 4 uint8 elements per vertex */
        boneindex: DataChunkJSON;
        /** Bounding box of this chunk */
        bounding_box: BoundingBoxJSON;
    };

    export interface BoneJSON {
        name: string;
        parent: number;
        skinned: boolean;
        inv_bind_mat: number[];
        pos: number[];
        rot: number[];
        scl: number[];
    };

    export interface AnimationTrackJSON {
        bone: number;
        pos: DataChunkJSON;
        rot: DataChunkJSON;
        scl: DataChunkJSON;
    };

    export interface AnimationJSON {
        name: string;
        frames: number;
        fps: number;
        tracks: AnimationTrackJSON[];
    };

    export interface DocumentJSON {
        info: InfoJSON;
        materials: MaterialJSON[];
        chunks: GeometryJSON[];
        bones: BoneJSON[];
        animations: AnimationJSON[];
        /** Base64 encoded binary data */
        data?: string;
    };
}