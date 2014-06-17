module COLLADA.Exporter {
    /**
    * An axis aligned bounding box
    */
    export interface BoundingBoxJSON {
        min: number[];
        max: number[];
    };

    export interface InfoJSON {
        /** Bounding box of the whole geometry */
        bounding_box: BoundingBoxJSON;
    };

    /**
    * An array of numbers, stored as a chunk of binary data
    */
    export interface DataChunkJSON {
        /** One of: float, double, uint8, int8, uint16, int16, uint32, int32 */
        type: string;
        /** Offset (in bytes) in the global data buffer */
        byte_offset: number;
        /** Number of values per element (e.g., a 4D vector has stride 4) */
        stride: number;
        /** Number of elements in this chunk */
        count: number;
    };

    /**
    * Material
    */
    export interface MaterialJSON {
        /** Name of the material */
        name: string;
        /** Diffuse texture */
        diffuse: string;
        /** Specular texture */
        specular: string;
        /** Normal map */
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

    /**
    * A bone for skin animated meshes
    */
    export interface BoneJSON {
        /** Bone name */
        name: string;
        /** Parent bone index */
        parent: number;
        /** Indicates whether this bone is used by the geometry */
        skinned: boolean;
        /** Inverse bind matrix */
        inv_bind_mat: number[];
        /** Rest pose position (3D vector) */
        pos: number[];
        /** Rest pose rotation (quaternion) */
        rot: number[];
        /** Rest pose scale (3D vector) */
        scl: number[];
    };

    /**
    * An animation track (one track for each bone)
    * Contains uniformely sampled keyframes
    */
    export interface AnimationTrackJSON {
        /** Index of the bone that is targeted by this track */
        bone: number;
        /** Position vectors (3 values per frame) */
        pos: DataChunkJSON;
        /** Rotation quaternions (4 values per frame) */
        rot: DataChunkJSON;
        /** Scale vectors (4 values per frame) */
        scl: DataChunkJSON;
    };

    /**
    * An animation
    */
    export interface AnimationJSON {
        /** Animation name */
        name: string;
        /** Number of keyframes */
        frames: number;
        /** Default playback speed (frames per second) */
        fps: number;
        /** Animation tracks (one per bone) */
        tracks: AnimationTrackJSON[];
    };

    export interface DocumentJSON {
        info: InfoJSON;
        materials: MaterialJSON[];
        chunks: GeometryJSON[];
        bones: BoneJSON[];
        animations: AnimationJSON[];
        /** Base64 encoded binary data, optional */
        data?: string;
    };
}