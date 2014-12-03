/// <reference path="stream-math.ts" />
/// <reference path="../../lib/collada.d.ts" />

class RMXModelLoader {

    constructor() {
    }

    loadFloatData(json: COLLADA.Exporter.DataChunkJSON, data: ArrayBuffer): Float32Array {
        if (json) {
            return new Float32Array(data, json.byte_offset, json.count * json.stride);
        } else {
            return null;
        }
    }

    loadUint8Data(json: COLLADA.Exporter.DataChunkJSON, data: ArrayBuffer): Uint8Array {
        if (json) {
            return new Uint8Array(data, json.byte_offset, json.count * json.stride);
        } else {
            return null;
        }
    }

    loadUint32Data(json: COLLADA.Exporter.DataChunkJSON, data: ArrayBuffer): Uint32Array {
        if (json) {
            return new Uint32Array(data, json.byte_offset, json.count * json.stride);
        } else {
            return null;
        }
    }



    loadModelChunk(json: COLLADA.Exporter.GeometryJSON, data: ArrayBuffer): RMXModelChunk {
        var result = new RMXModelChunk;

        result.name = json.name;
        result.triangle_count = json.triangle_count;
        result.material_index = json.material;

        result.data_position   = this.loadFloatData(json.position,   data);
        result.data_normal     = this.loadFloatData(json.normal,     data);
        result.data_texcoord   = this.loadFloatData(json.texcoord,   data);
        result.data_boneweight = this.loadFloatData(json.boneweight, data);
        result.data_boneindex  = this.loadUint8Data(json.boneindex,  data);
        result.data_indices    = this.loadUint32Data(json.indices,   data);

        // Three.js wants float data
        if (result.data_boneindex) {
            result.data_boneindex = new Float32Array(result.data_boneindex);
        }

        return result;
    }

    loadModel(json: COLLADA.Exporter.DocumentJSON, data: ArrayBuffer): RMXModel {
        var result = new RMXModel;

        // Load geometry
        result.chunks = json.chunks.map((chunk) => { return this.loadModelChunk(chunk, data) });

        // Load skeleton
        result.skeleton = this.loadSkeleton(json, data);

        // Load animations
        result.animations = json.animations.map((animation) => { return this.loadAnimation(animation, data) });

        // Load materials
        result.materials = json.materials.map((material) => { return this.loadMaterial(material, data) });

        return result;
    }


    loadBone(json: COLLADA.Exporter.BoneJSON, data: ArrayBuffer): RMXBone {
        if (json == null) {
            return null;
        }

        var result: RMXBone = new RMXBone;

        result.name = json.name;
        result.parent = json.parent;
        result.skinned = json.skinned;
        result.inv_bind_mat = new Float32Array(json.inv_bind_mat);
        result.pos = vec3.clone(json.pos);
        result.rot = quat.clone(json.rot);
        result.scl = vec3.clone(json.scl);

        return result;
    }

    loadSkeleton(json: COLLADA.Exporter.DocumentJSON, data: ArrayBuffer): RMXSkeleton {
        if (json.bones == null || json.bones.length == 0) {
            return null;
        }

        var result = new RMXSkeleton;

        result.bones = json.bones.map((bone) => { return this.loadBone(bone, data) });

        return result;
    }

    loadAnimationTrack(json: COLLADA.Exporter.AnimationTrackJSON, data: ArrayBuffer): RMXAnimationTrack {
        if (json == null) {
            return null;
        }

        var result = new RMXAnimationTrack;
        result.bone = json.bone;
        result.pos = this.loadFloatData(json.pos, data);
        result.rot = this.loadFloatData(json.rot, data);
        result.scl = this.loadFloatData(json.scl, data);
        return result;
    }

    loadAnimation(json: COLLADA.Exporter.AnimationJSON, data: ArrayBuffer): RMXAnimation {
        if (json == null) {
            return null;
        }

        var result = new RMXAnimation;
        result.name = json.name;
        result.fps = json.fps;
        result.frames = json.frames;
        result.tracks = json.tracks.map((track) => { return this.loadAnimationTrack(track, data) });

        return result;
    }

    loadMaterial(json: COLLADA.Exporter.MaterialJSON, data: ArrayBuffer): RMXMaterial {
        var result = new RMXMaterial;
        result.diffuse = json.diffuse;
        result.specular = json.specular;
        result.normal = json.normal;

        return result;
    }
}

class RMXModelChunk {
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

class RMXMaterial {
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

class RMXModel {
    chunks: RMXModelChunk[];
    skeleton: RMXSkeleton;
    materials: RMXMaterial[];
    animations: RMXAnimation[];

    constructor() {
        this.chunks = [];
        this.skeleton = new RMXSkeleton();
        this.materials = [];
        this.animations = [];
    }
}

class RMXBone {
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

class RMXSkeleton {
    bones: RMXBone[];

    constructor() {
        this.bones = [];
    }
}

class RMXBoneMatrixTexture {
    size: number;
    texture: WebGLTexture;
    data: Float32Array;

    /**
    * Number of bones a texture of the given width can store.
    */
    static capacity(size: number): number {
        var texels = size * size;
        var texels_per_matrix = 4;
        return texels / texels_per_matrix;
    }

    static optimalSize(bones: number): number {
        var result = 2;
        while (RMXBoneMatrixTexture.capacity(result) < bones) {
            result = result * 2;
            if (result > 2048) throw new Error("Too many bones");
        }

        return result;
    }

    constructor(bones: number) {
        this.size = RMXBoneMatrixTexture.optimalSize(bones);
        this.data = new Float32Array(4 * this.size * this.size);
        this.texture = null;
    }

    init(gl: WebGLRenderingContext) {
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.size, this.size, 0, gl.RGBA, gl.FLOAT, null);

        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    update(gl: WebGLRenderingContext) {
        if (this.texture == null) {
            this.init(gl);
        }

        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        // Apparently texImage can be faster than texSubImage (?!?)
        // gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.size, this.size, gl.RGBA, gl.FLOAT, this.data);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.size, this.size, 0, gl.RGBA, gl.FLOAT, this.data);
    }
}


class RMXPose {
    pos: Float32Array;
    rot: Float32Array;
    scl: Float32Array;
    world_matrices: Float32Array;

    constructor(bones: number) {
        this.pos = new Float32Array(bones * 3);
        this.rot = new Float32Array(bones * 4);
        this.scl = new Float32Array(bones * 3);
        this.world_matrices = new Float32Array(bones * 16);
    }
}

class RMXAnimationTrack {
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

class RMXAnimation {
    name: string;
    frames: number;
    fps: number;
    tracks: RMXAnimationTrack[];

    constructor() {
        this.name = "";
        this.frames = 0;
        this.fps = 0;
        this.tracks = [];
    }
}


class RMXSkeletalAnimation {

    /** 
    * Exports all bone matrices (world matrix * inverse bind matrix) of a pose to a flat number array
    */
    static exportPose(skeleton: RMXSkeleton, pose: RMXPose, dest: Float32Array) {
        var world_matrices = pose.world_matrices;

        // Loop over all bones
        var bone_length: number = skeleton.bones.length;
        for (var b: number = 0; b < bone_length; ++b) {
            var bone = skeleton.bones[b];
            var inv_bind_mat = <Float32Array>bone.inv_bind_mat;

            // Local matrix - local translation/rotation/scale composed into a matrix
            mat_stream_compose(world_matrices, b * 16, pose.pos, b * 3, pose.rot, b * 4, pose.scl, b * 3);

            // World matrix
            if (bone.parent >= 0) {
                mat4_stream_multiply(world_matrices, b * 16, world_matrices, bone.parent * 16, world_matrices, b * 16);
            }

            // Bone matrix
            mat4_stream_multiply(dest, b * 16, world_matrices, b * 16, inv_bind_mat, 0);
        }
    }

    /** 
    * Reset the pose to the bind pose of the skeleton
    */
    static resetPose(skeleton: RMXSkeleton, pose: RMXPose) {
        var dest_pos: Float32Array = pose.pos;
        var dest_rot: Float32Array = pose.rot;
        var dest_scl: Float32Array = pose.scl;

        // Loop over all bones
        var bone_length: number = skeleton.bones.length;
        for (var b = 0; b < bone_length; ++b) {
            var b3: number = b * 3;
            var b4: number = b * 4;

            // Bone data
            var bone = skeleton.bones[b];
            var bone_pos = bone.pos;
            var bone_rot = bone.rot;
            var bone_scl = bone.scl;

            vec3_stream_copy(dest_pos, b3, <Float32Array>bone_pos, 0);
            quat_stream_copy(dest_rot, b4, <Float32Array>bone_rot, 0);
            vec3_stream_copy(dest_scl, b3, <Float32Array>bone_scl, 0);
        }
    }

    /** 
    * Computes an interpolation of the two poses pose_a and pose_b
    * At t==0, full weight is given to pose_a, at t==1, full weight is given to pose_b
    */
    static blendPose(pose_a: RMXPose, pose_b: RMXPose, t: number, result: RMXPose) {
        var a_pos: Float32Array = pose_a.pos;
        var a_rot: Float32Array = pose_a.rot;
        var a_scl: Float32Array = pose_a.scl;

        var b_pos: Float32Array = pose_b.pos;
        var b_rot: Float32Array = pose_b.rot;
        var b_scl: Float32Array = pose_b.scl;

        var r_pos: Float32Array = result.pos;
        var r_rot: Float32Array = result.rot;
        var r_scl: Float32Array = result.scl;

        // Loop over all bones
        var bone_length: number = a_pos.length / 3;
        for (var b = 0; b < bone_length; ++b) {
            var b3: number = b * 3;
            var b4: number = b * 4;

            vec3_stream_lerp(r_pos, b3, a_pos, b3, b_pos, b3, t);
            quat_stream_slerp(r_rot, b4, a_rot, b4, b_rot, b4, t);
            vec3_stream_lerp(r_scl, b3, a_scl, b3, b_scl, b3, t);
        }

    }

    /** 
    * Sample the animation, store the result in pose
    */
    static sampleAnimation(animation: RMXAnimation, skeleton: RMXSkeleton, pose: RMXPose, frame: number) {

        var looped = true;
        if (looped) {
            frame = frame % animation.frames;
        } else {
            frame = Math.max(Math.min(frame, animation.frames - 1), 0);
        }

        var f1: number = Math.floor(frame);
        f1 = f1 % animation.frames;
        var f2: number = Math.ceil(frame);
        f2 = f2 % animation.frames;

        var f13: number = f1 * 3;
        var f14: number = f1 * 4;
        var f23: number = f2 * 3;
        var f24: number = f2 * 4;

        var s: number = frame - Math.floor(frame);

        var bones = skeleton.bones;
        var tracks = animation.tracks;

        var dest_pos: Float32Array = pose.pos;
        var dest_rot: Float32Array = pose.rot;
        var dest_scl: Float32Array = pose.scl;

        // Loop over all bones
        var bone_length: number = bones.length;
        for (var b = 0; b < bone_length; ++b) {
            var b3: number = b * 3;
            var b4: number = b * 4;

            // Animation track data
            var track = tracks[b];
            var track_pos = track.pos;
            var track_rot = track.rot;
            var track_scl = track.scl;

            // Bone data
            var bone = bones[b];
            var bone_pos = bone.pos;
            var bone_rot = bone.rot;
            var bone_scl = bone.scl;

            // Position (linear interpolation)
            if (track_pos) {
                vec3_stream_lerp(dest_pos, b3, track_pos, f13, track_pos, f23, s);
            } else {
                vec3_stream_copy(dest_pos, b3, <Float32Array>bone_pos, 0);
            }

            // Rotation (quaternion spherical interpolation)
            if (track_rot) {
                quat_stream_slerp(dest_rot, b4, track_rot, f14, track_rot, f24, s);
            } else {
                quat_stream_copy(dest_rot, b4, <Float32Array>bone_rot, 0);
            }

            // Scale (linear interpolation)
            if (track_scl) {
                vec3_stream_lerp(dest_scl, b3, track_scl, f13, track_scl, f23, s);
            } else {
                vec3_stream_copy(dest_scl, b3, <Float32Array>bone_scl, 0);
            }
        }
    }
}
