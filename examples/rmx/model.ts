/// <reference path="../../external/threejs/three.d.ts" />

module rmx {

    /**
    * A skinned mesh with an animation
    */
    export class Model {
        chunks: ModelChunk[];
        skeleton: Skeleton;
        materials: Material[];
        animations: Animation[];

        constructor() {
            this.chunks = [];
            this.skeleton = new Skeleton();
            this.materials = [];
            this.animations = [];
        }
    }

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

    /**
    * A skinned mesh skeleton
    */
    export class Skeleton {
        bones: Bone[];

        constructor() {
            this.bones = [];
        }
    }

    /**
    * A skeleton bone.
    */
    export class Bone {
        /** Bone name */
        name: string;
        /** Parent bone index */
        parent: number;
        /** Indicates whether this bone is used by the geometry */
        skinned: boolean;
        /** Inverse bind matrix */
        inv_bind_mat: Float32Array;
        /** Rest pose position (3D vector) */
        pos: Vec3;
        /** Rest pose rotation (quaternion) */
        rot: Quat;
        /** Rest pose scale (3D vector) */
        scl: Vec3;
    }

    /**
    * A skinned mesh animation
    */
    export class Animation {
        name: string;
        frames: number;
        fps: number;
        tracks: AnimationTrack[];

        constructor() {
            this.name = "";
            this.frames = 0;
            this.fps = 0;
            this.tracks = [];
        }
    }

    /**
    * An animation track.
    * Contains animation curves for the transformation of a single bone.
    */
    export class AnimationTrack {
        bone: number;
        pos: Float32Array;
        rot: Float32Array;
        scl: Float32Array;

        constructor() {
            this.bone = 0;
            this.pos = null;
            this.rot = null;
            this.scl = null;
        }
    }
}