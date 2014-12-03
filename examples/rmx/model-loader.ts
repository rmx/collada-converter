/// <reference path="model.ts" />
/// <reference path="../../lib/collada.d.ts" />

/**
* Loads our custom file format
*/
class RMXModelLoader {

    constructor() {
    }

    private loadFloatData(json: COLLADA.Exporter.DataChunkJSON, data: ArrayBuffer): Float32Array {
        if (json) {
            return new Float32Array(data, json.byte_offset, json.count * json.stride);
        } else {
            return null;
        }
    }

    private loadUint8Data(json: COLLADA.Exporter.DataChunkJSON, data: ArrayBuffer): Uint8Array {
        if (json) {
            return new Uint8Array(data, json.byte_offset, json.count * json.stride);
        } else {
            return null;
        }
    }

    private loadUint32Data(json: COLLADA.Exporter.DataChunkJSON, data: ArrayBuffer): Uint32Array {
        if (json) {
            return new Uint32Array(data, json.byte_offset, json.count * json.stride);
        } else {
            return null;
        }
    }

    private loadModelChunk(json: COLLADA.Exporter.GeometryJSON, data: ArrayBuffer): RMXModelChunk {
        var result = new RMXModelChunk;

        result.name = json.name;
        result.triangle_count = json.triangle_count;
        result.material_index = json.material;

        result.data_position   = this.loadFloatData(json.position, data);
        result.data_normal     = this.loadFloatData(json.normal, data);
        result.data_texcoord   = this.loadFloatData(json.texcoord, data);
        result.data_boneweight = this.loadFloatData(json.boneweight, data);
        result.data_boneindex  = this.loadUint8Data(json.boneindex, data);
        result.data_indices    = this.loadUint32Data(json.indices, data);

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

    private loadBone(json: COLLADA.Exporter.BoneJSON, data: ArrayBuffer): RMXBone {
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

    private loadSkeleton(json: COLLADA.Exporter.DocumentJSON, data: ArrayBuffer): RMXSkeleton {
        if (json.bones == null || json.bones.length == 0) {
            return null;
        }

        var result = new RMXSkeleton;

        result.bones = json.bones.map((bone) => { return this.loadBone(bone, data) });

        return result;
    }

    private loadAnimationTrack(json: COLLADA.Exporter.AnimationTrackJSON, data: ArrayBuffer): RMXAnimationTrack {
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

    private loadAnimation(json: COLLADA.Exporter.AnimationJSON, data: ArrayBuffer): RMXAnimation {
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

    private loadMaterial(json: COLLADA.Exporter.MaterialJSON, data: ArrayBuffer): RMXMaterial {
        var result = new RMXMaterial;
        result.diffuse = json.diffuse;
        result.specular = json.specular;
        result.normal = json.normal;

        return result;
    }
}