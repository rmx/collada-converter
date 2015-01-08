/// <reference path="./model.ts" />
/// <reference path="../../../lib/collada.d.ts" />

module rmx {

    /**
    * Loads our custom file format
    */
    export class ModelLoader {

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

        private loadModelChunk(json: COLLADA.Exporter.GeometryJSON, data: ArrayBuffer): ModelChunk {
            var result = new ModelChunk;

            result.name = json.name;
            result.triangle_count = json.triangle_count;
            result.material_index = json.material;

            result.data_position = this.loadFloatData(json.position, data);
            result.data_normal = this.loadFloatData(json.normal, data);
            result.data_texcoord = this.loadFloatData(json.texcoord, data);
            result.data_boneweight = this.loadFloatData(json.boneweight, data);
            result.data_boneindex = this.loadUint8Data(json.boneindex, data);
            result.data_indices = this.loadUint32Data(json.indices, data);

            // Three.js wants float data
            if (result.data_boneindex) {
                result.data_boneindex = new Float32Array(result.data_boneindex);
            }

            return result;
        }

        loadModel(json: COLLADA.Exporter.DocumentJSON, data: ArrayBuffer): Model {
            var result = new Model;

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

        private loadBone(json: COLLADA.Exporter.BoneJSON, data: ArrayBuffer): Bone {
            if (json == null) {
                return null;
            }

            var result: Bone = new Bone;

            result.name = json.name;
            result.parent = json.parent;
            result.skinned = json.skinned;
            result.inv_bind_mat = new Float32Array(json.inv_bind_mat);
            result.pos = vec3.clone(json.pos);
            result.rot = quat.clone(json.rot);
            result.scl = vec3.clone(json.scl);

            return result;
        }

        private loadSkeleton(json: COLLADA.Exporter.DocumentJSON, data: ArrayBuffer): Skeleton {
            if (json.bones == null || json.bones.length == 0) {
                return null;
            }

            var result = new Skeleton;

            result.bones = json.bones.map((bone) => { return this.loadBone(bone, data) });

            return result;
        }

        private loadAnimationTrack(json: COLLADA.Exporter.AnimationTrackJSON, data: ArrayBuffer): AnimationTrack {
            if (json == null) {
                return null;
            }

            var result = new AnimationTrack;
            result.bone = json.bone;
            result.pos = this.loadFloatData(json.pos, data);
            result.rot = this.loadFloatData(json.rot, data);
            result.scl = this.loadFloatData(json.scl, data);
            return result;
        }

        private loadAnimation(json: COLLADA.Exporter.AnimationJSON, data: ArrayBuffer): Animation {
            if (json == null) {
                return null;
            }

            var result = new Animation;
            result.name = json.name;
            result.fps = json.fps;
            result.frames = json.frames;
            result.tracks = json.tracks.map((track) => { return this.loadAnimationTrack(track, data) });

            return result;
        }

        private loadMaterial(json: COLLADA.Exporter.MaterialJSON, data: ArrayBuffer): Material {
            var result = new Material;
            result.diffuse = json.diffuse;
            result.specular = json.specular;
            result.normal = json.normal;

            return result;
        }
    }
}