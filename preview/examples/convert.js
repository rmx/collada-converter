/// <reference path="../../external/threejs/three.d.ts" />
/**
* A skinned mesh with an animation
*/
var RMXModel = (function () {
    function RMXModel() {
        this.chunks = [];
        this.skeleton = new RMXSkeleton();
        this.materials = [];
        this.animations = [];
    }
    return RMXModel;
})();
/**
* One piece of geometry with one material
*/
var RMXModelChunk = (function () {
    function RMXModelChunk() {
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
    return RMXModelChunk;
})();
/**
* A material.
* Does not contain coefficients, use textures instead.
*/
var RMXMaterial = (function () {
    function RMXMaterial() {
        this.diffuse = null;
        this.specular = null;
        this.normal = null;
    }
    RMXMaterial.prototype.hash = function () {
        return "material|" + (this.diffuse || "") + "|" + (this.specular || "") + "|" + (this.normal || "");
    };
    return RMXMaterial;
})();
/**
* A skinned mesh skeleton
*/
var RMXSkeleton = (function () {
    function RMXSkeleton() {
        this.bones = [];
    }
    return RMXSkeleton;
})();
/**
* A skeleton bone.
*/
var RMXBone = (function () {
    function RMXBone() {
    }
    return RMXBone;
})();
/**
* A skinned mesh animation
*/
var RMXAnimation = (function () {
    function RMXAnimation() {
        this.name = "";
        this.frames = 0;
        this.fps = 0;
        this.tracks = [];
    }
    return RMXAnimation;
})();
/**
* An animation track.
* Contains animation curves for the transformation of a single bone.
*/
var RMXAnimationTrack = (function () {
    function RMXAnimationTrack() {
        this.bone = 0;
        this.pos = null;
        this.rot = null;
        this.scl = null;
    }
    return RMXAnimationTrack;
})();
/// <reference path="./model.ts" />
/// <reference path="../../lib/collada.d.ts" />
/**
* Loads our custom file format
*/
var RMXModelLoader = (function () {
    function RMXModelLoader() {
    }
    RMXModelLoader.prototype.loadFloatData = function (json, data) {
        if (json) {
            return new Float32Array(data, json.byte_offset, json.count * json.stride);
        }
        else {
            return null;
        }
    };
    RMXModelLoader.prototype.loadUint8Data = function (json, data) {
        if (json) {
            return new Uint8Array(data, json.byte_offset, json.count * json.stride);
        }
        else {
            return null;
        }
    };
    RMXModelLoader.prototype.loadUint32Data = function (json, data) {
        if (json) {
            return new Uint32Array(data, json.byte_offset, json.count * json.stride);
        }
        else {
            return null;
        }
    };
    RMXModelLoader.prototype.loadModelChunk = function (json, data) {
        var result = new RMXModelChunk;
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
    };
    RMXModelLoader.prototype.loadModel = function (json, data) {
        var _this = this;
        var result = new RMXModel;
        // Load geometry
        result.chunks = json.chunks.map(function (chunk) {
            return _this.loadModelChunk(chunk, data);
        });
        // Load skeleton
        result.skeleton = this.loadSkeleton(json, data);
        // Load animations
        result.animations = json.animations.map(function (animation) {
            return _this.loadAnimation(animation, data);
        });
        // Load materials
        result.materials = json.materials.map(function (material) {
            return _this.loadMaterial(material, data);
        });
        return result;
    };
    RMXModelLoader.prototype.loadBone = function (json, data) {
        if (json == null) {
            return null;
        }
        var result = new RMXBone;
        result.name = json.name;
        result.parent = json.parent;
        result.skinned = json.skinned;
        result.inv_bind_mat = new Float32Array(json.inv_bind_mat);
        result.pos = vec3.clone(json.pos);
        result.rot = quat.clone(json.rot);
        result.scl = vec3.clone(json.scl);
        return result;
    };
    RMXModelLoader.prototype.loadSkeleton = function (json, data) {
        var _this = this;
        if (json.bones == null || json.bones.length == 0) {
            return null;
        }
        var result = new RMXSkeleton;
        result.bones = json.bones.map(function (bone) {
            return _this.loadBone(bone, data);
        });
        return result;
    };
    RMXModelLoader.prototype.loadAnimationTrack = function (json, data) {
        if (json == null) {
            return null;
        }
        var result = new RMXAnimationTrack;
        result.bone = json.bone;
        result.pos = this.loadFloatData(json.pos, data);
        result.rot = this.loadFloatData(json.rot, data);
        result.scl = this.loadFloatData(json.scl, data);
        return result;
    };
    RMXModelLoader.prototype.loadAnimation = function (json, data) {
        var _this = this;
        if (json == null) {
            return null;
        }
        var result = new RMXAnimation;
        result.name = json.name;
        result.fps = json.fps;
        result.frames = json.frames;
        result.tracks = json.tracks.map(function (track) {
            return _this.loadAnimationTrack(track, data);
        });
        return result;
    };
    RMXModelLoader.prototype.loadMaterial = function (json, data) {
        var result = new RMXMaterial;
        result.diffuse = json.diffuse;
        result.specular = json.specular;
        result.normal = json.normal;
        return result;
    };
    return RMXModelLoader;
})();
function vec3_stream_copy(out, out_offset, a, a_offset) {
    out[out_offset + 0] = a[a_offset + 0];
    out[out_offset + 1] = a[a_offset + 1];
    out[out_offset + 2] = a[a_offset + 2];
}
function quat_stream_copy(out, out_offset, a, a_offset) {
    out[out_offset + 0] = a[a_offset + 0];
    out[out_offset + 1] = a[a_offset + 1];
    out[out_offset + 2] = a[a_offset + 2];
    out[out_offset + 3] = a[a_offset + 3];
}
function vec3_stream_lerp(out, out_offset, a, a_offset, b, b_offset, t) {
    var ta = 1 - t;
    out[out_offset + 0] = ta * a[a_offset + 0] + t * a[b_offset + 0];
    out[out_offset + 1] = ta * a[a_offset + 1] + t * a[b_offset + 1];
    out[out_offset + 2] = ta * a[a_offset + 2] + t * a[b_offset + 2];
}
function quat_stream_slerp(out, out_offset, a, a_offset, b, b_offset, t) {
    var ax = a[a_offset + 0], ay = a[a_offset + 1], az = a[a_offset + 2], aw = a[a_offset + 3], bx = b[b_offset + 0], by = b[b_offset + 1], bz = b[b_offset + 2], bw = b[b_offset + 3];
    var omega, cosom, sinom, scale0, scale1;
    // calc cosine
    cosom = ax * bx + ay * by + az * bz + aw * bw;
    // adjust signs (if necessary)
    if (cosom < 0.0) {
        cosom = -cosom;
        bx = -bx;
        by = -by;
        bz = -bz;
        bw = -bw;
    }
    // calculate coefficients
    if ((1.0 - cosom) > 0.000001) {
        // standard case (slerp)
        omega = Math.acos(cosom);
        sinom = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
    }
    else {
        // "from" and "to" quaternions are very close 
        //  ... so we can do a linear interpolation
        scale0 = 1.0 - t;
        scale1 = t;
    }
    // calculate final values
    out[out_offset + 0] = scale0 * ax + scale1 * bx;
    out[out_offset + 1] = scale0 * ay + scale1 * by;
    out[out_offset + 2] = scale0 * az + scale1 * bz;
    out[out_offset + 3] = scale0 * aw + scale1 * bw;
}
function mat_stream_compose(out, out_offset, pos, pos_offset, rot, rot_offset, scl, scl_offset) {
    // Quaternion math
    var x = rot[rot_offset + 0], y = rot[rot_offset + 1], z = rot[rot_offset + 2], w = rot[rot_offset + 3], x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2, sx = scl[scl_offset + 0], sy = scl[scl_offset + 1], sz = scl[scl_offset + 2];
    out[out_offset + 0] = sx * (1 - (yy + zz));
    out[out_offset + 1] = sy * (xy + wz);
    out[out_offset + 2] = sz * (xz - wy);
    out[out_offset + 3] = 0;
    out[out_offset + 4] = sx * (xy - wz);
    out[out_offset + 5] = sy * (1 - (xx + zz));
    out[out_offset + 6] = sz * (yz + wx);
    out[out_offset + 7] = 0;
    out[out_offset + 8] = sx * (xz + wy);
    out[out_offset + 9] = sy * (yz - wx);
    out[out_offset + 10] = sz * (1 - (xx + yy));
    out[out_offset + 11] = 0;
    out[out_offset + 12] = pos[pos_offset + 0];
    out[out_offset + 13] = pos[pos_offset + 1];
    out[out_offset + 14] = pos[pos_offset + 2];
    out[out_offset + 15] = 1;
}
;
function mat4_stream_multiply(out, out_offset, a, a_offset, b, b_offset) {
    var a00 = a[a_offset + 0], a01 = a[a_offset + 1], a02 = a[a_offset + 2], a03 = a[a_offset + 3], a10 = a[a_offset + 4], a11 = a[a_offset + 5], a12 = a[a_offset + 6], a13 = a[a_offset + 7], a20 = a[a_offset + 8], a21 = a[a_offset + 9], a22 = a[a_offset + 10], a23 = a[a_offset + 11], a30 = a[a_offset + 12], a31 = a[a_offset + 13], a32 = a[a_offset + 14], a33 = a[a_offset + 15];
    // Cache only the current line of the second matrix
    var b0 = b[b_offset + 0], b1 = b[b_offset + 1], b2 = b[b_offset + 2], b3 = b[b_offset + 3];
    out[out_offset + 0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[out_offset + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[out_offset + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[out_offset + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[b_offset + 4];
    b1 = b[b_offset + 5];
    b2 = b[b_offset + 6];
    b3 = b[b_offset + 7];
    out[out_offset + 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[out_offset + 5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[out_offset + 6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[out_offset + 7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[b_offset + 8];
    b1 = b[b_offset + 9];
    b2 = b[b_offset + 10];
    b3 = b[b_offset + 11];
    out[out_offset + 8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[out_offset + 9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[out_offset + 10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[out_offset + 11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[b_offset + 12];
    b1 = b[b_offset + 13];
    b2 = b[b_offset + 14];
    b3 = b[b_offset + 15];
    out[out_offset + 12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[out_offset + 13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[out_offset + 14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[out_offset + 15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
}
;
/// <reference path="./stream-math.ts" />
/**
* Stores the transformation of all skeleton bones.
*/
var RMXPose = (function () {
    function RMXPose(bones) {
        this.pos = new Float32Array(bones * 3);
        this.rot = new Float32Array(bones * 4);
        this.scl = new Float32Array(bones * 3);
        this.world_matrices = new Float32Array(bones * 16);
    }
    return RMXPose;
})();
/**
* Stores the bone matrices in a WebGL texture.
*/
var RMXBoneMatrixTexture = (function () {
    function RMXBoneMatrixTexture(bones) {
        this.size = RMXBoneMatrixTexture.optimalSize(bones);
        this.data = new Float32Array(4 * this.size * this.size);
        this.texture = null;
    }
    /**
    * Number of bones a texture of the given width can store.
    */
    RMXBoneMatrixTexture.capacity = function (size) {
        var texels = size * size;
        var texels_per_matrix = 4;
        return texels / texels_per_matrix;
    };
    /**
    * The smallest texture size that can hold the given number of bones.
    */
    RMXBoneMatrixTexture.optimalSize = function (bones) {
        var result = 4;
        while (RMXBoneMatrixTexture.capacity(result) < bones) {
            result = result * 2;
            // A 2K x 2K texture can hold 1 million bones.
            // It is unlikely a skinned mesh will use more than that.
            if (result > 2048)
                throw new Error("Too many bones");
        }
        return result;
    };
    RMXBoneMatrixTexture.prototype.init = function (gl) {
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.size, this.size, 0, gl.RGBA, gl.FLOAT, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
    };
    RMXBoneMatrixTexture.prototype.update = function (gl) {
        if (this.texture == null) {
            this.init(gl);
        }
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        // Apparently texImage can be faster than texSubImage (?!?)
        // gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.size, this.size, gl.RGBA, gl.FLOAT, this.data);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.size, this.size, 0, gl.RGBA, gl.FLOAT, this.data);
    };
    return RMXBoneMatrixTexture;
})();
/**
* A collection of static functions to play back skeletal animations.
*/
var RMXSkeletalAnimation = (function () {
    function RMXSkeletalAnimation() {
    }
    /**
    * Exports all bone matrices (world matrix * inverse bind matrix) of a pose to a flat number array
    */
    RMXSkeletalAnimation.exportPose = function (skeleton, pose, dest) {
        var world_matrices = pose.world_matrices;
        // Loop over all bones
        var bone_length = skeleton.bones.length;
        for (var b = 0; b < bone_length; ++b) {
            var bone = skeleton.bones[b];
            var inv_bind_mat = bone.inv_bind_mat;
            // Local matrix - local translation/rotation/scale composed into a matrix
            mat_stream_compose(world_matrices, b * 16, pose.pos, b * 3, pose.rot, b * 4, pose.scl, b * 3);
            // World matrix
            if (bone.parent >= 0) {
                mat4_stream_multiply(world_matrices, b * 16, world_matrices, bone.parent * 16, world_matrices, b * 16);
            }
            // Bone matrix
            mat4_stream_multiply(dest, b * 16, world_matrices, b * 16, inv_bind_mat, 0);
        }
    };
    /**
    * Reset the pose to the bind pose of the skeleton
    */
    RMXSkeletalAnimation.resetPose = function (skeleton, pose) {
        var dest_pos = pose.pos;
        var dest_rot = pose.rot;
        var dest_scl = pose.scl;
        // Loop over all bones
        var bone_length = skeleton.bones.length;
        for (var b = 0; b < bone_length; ++b) {
            var b3 = b * 3;
            var b4 = b * 4;
            // Bone data
            var bone = skeleton.bones[b];
            var bone_pos = bone.pos;
            var bone_rot = bone.rot;
            var bone_scl = bone.scl;
            vec3_stream_copy(dest_pos, b3, bone_pos, 0);
            quat_stream_copy(dest_rot, b4, bone_rot, 0);
            vec3_stream_copy(dest_scl, b3, bone_scl, 0);
        }
    };
    /**
    * Computes an interpolation of the two poses pose_a and pose_b
    * At t==0, full weight is given to pose_a, at t==1, full weight is given to pose_b
    */
    RMXSkeletalAnimation.blendPose = function (pose_a, pose_b, t, result) {
        var a_pos = pose_a.pos;
        var a_rot = pose_a.rot;
        var a_scl = pose_a.scl;
        var b_pos = pose_b.pos;
        var b_rot = pose_b.rot;
        var b_scl = pose_b.scl;
        var r_pos = result.pos;
        var r_rot = result.rot;
        var r_scl = result.scl;
        // Loop over all bones
        var bone_length = a_pos.length / 3;
        for (var b = 0; b < bone_length; ++b) {
            var b3 = b * 3;
            var b4 = b * 4;
            vec3_stream_lerp(r_pos, b3, a_pos, b3, b_pos, b3, t);
            quat_stream_slerp(r_rot, b4, a_rot, b4, b_rot, b4, t);
            vec3_stream_lerp(r_scl, b3, a_scl, b3, b_scl, b3, t);
        }
    };
    /**
    * Sample the animation, store the result in pose
    */
    RMXSkeletalAnimation.sampleAnimation = function (animation, skeleton, pose, frame) {
        var looped = true;
        if (looped) {
            frame = frame % animation.frames;
        }
        else {
            frame = Math.max(Math.min(frame, animation.frames - 1), 0);
        }
        var f1 = Math.floor(frame);
        f1 = f1 % animation.frames;
        var f2 = Math.ceil(frame);
        f2 = f2 % animation.frames;
        var f13 = f1 * 3;
        var f14 = f1 * 4;
        var f23 = f2 * 3;
        var f24 = f2 * 4;
        var s = frame - Math.floor(frame);
        var bones = skeleton.bones;
        var tracks = animation.tracks;
        var dest_pos = pose.pos;
        var dest_rot = pose.rot;
        var dest_scl = pose.scl;
        // Loop over all bones
        var bone_length = bones.length;
        for (var b = 0; b < bone_length; ++b) {
            var b3 = b * 3;
            var b4 = b * 4;
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
            }
            else {
                vec3_stream_copy(dest_pos, b3, bone_pos, 0);
            }
            // Rotation (quaternion spherical interpolation)
            if (track_rot) {
                quat_stream_slerp(dest_rot, b4, track_rot, f14, track_rot, f24, s);
            }
            else {
                quat_stream_copy(dest_rot, b4, bone_rot, 0);
            }
            // Scale (linear interpolation)
            if (track_scl) {
                vec3_stream_lerp(dest_scl, b3, track_scl, f13, track_scl, f23, s);
            }
            else {
                vec3_stream_copy(dest_scl, b3, bone_scl, 0);
            }
        }
    };
    return RMXSkeletalAnimation;
})();
/// <reference path="./model.ts" />
/// <reference path="../../external/threejs/three.d.ts" />
/**
* Converts a RMXModel into corresponding three.js objects
*/
var ThreejsModelLoader = (function () {
    function ThreejsModelLoader() {
        this.materialCache = {};
        this.imageLoader = new THREE.ImageLoader();
    }
    ThreejsModelLoader.prototype.createGeometry = function (chunk) {
        var result = new THREE.BufferGeometry;
        if (chunk.data_position) {
            result.addAttribute("position", new THREE.BufferAttribute(chunk.data_position, 3));
        }
        if (chunk.data_normal) {
            result.addAttribute("normal", new THREE.BufferAttribute(chunk.data_normal, 3));
        }
        if (chunk.data_texcoord) {
            result.addAttribute("uv", new THREE.BufferAttribute(chunk.data_texcoord, 2));
        }
        if (chunk.data_boneindex) {
            result.addAttribute("skinIndex", new THREE.BufferAttribute(chunk.data_boneindex, 4));
        }
        if (chunk.data_boneindex) {
            result.addAttribute("skinWeight", new THREE.BufferAttribute(chunk.data_boneweight, 4));
        }
        if (chunk.data_indices) {
            result.addAttribute("index", new THREE.BufferAttribute(chunk.data_indices, 1));
        }
        return result;
    };
    ThreejsModelLoader.prototype.createTexture = function (url) {
        if (url == null || url == "") {
            return null;
        }
        var image = this.imageLoader.load(url);
        var result = new THREE.Texture(image);
        return result;
    };
    ThreejsModelLoader.prototype.createMaterial = function (material, skinned) {
        var prefix = skinned ? "skinned-" : "static-";
        var hash = prefix + material.hash();
        var cached_material = this.materialCache[hash];
        if (cached_material) {
            return cached_material;
        }
        else {
            var result = new THREE.MeshPhongMaterial();
            result.skinning = skinned;
            result.color = new THREE.Color(0.8, 0.8, 0.8);
            // Disable textures. They won't work due to CORS for local files anyway.
            result.map = null; //this.createTexture(material.diffuse);
            result.specularMap = null; // this.createTexture(material.specular);
            result.normalMap = null; // this.createTexture(material.normal);
            this.materialCache[hash] = result;
            return result;
        }
    };
    ThreejsModelLoader.prototype.createModel = function (model) {
        var result = new ThreejsModel;
        var skinned = model.skeleton != null;
        for (var i = 0; i < model.chunks.length; ++i) {
            var rmx_chunk = model.chunks[i];
            var threejs_chunk = new ThreejsModelChunk;
            threejs_chunk.geometry = this.createGeometry(rmx_chunk);
            threejs_chunk.material = this.createMaterial(model.materials[rmx_chunk.material_index], skinned);
            result.chunks.push(threejs_chunk);
        }
        // Skeleton - use custom object
        result.skeleton = model.skeleton;
        // Animation - use custom object
        result.animations = model.animations;
        return result;
    };
    return ThreejsModelLoader;
})();
/**
* A custom class that replaces THREE.Skeleton
*/
var ThreejsSkeleton = (function () {
    function ThreejsSkeleton(skeleton) {
        // The skeleton stores information about the hiearchy of the bones
        this.skeleton = skeleton;
        // The pose stores information about the current bone transformations
        this.pose = new RMXPose(skeleton.bones.length);
        RMXSkeletalAnimation.resetPose(this.skeleton, this.pose);
        // The bone texture stores the bone matrices for the use on the GPU
        this.boneTexture = new RMXBoneMatrixTexture(skeleton.bones.length);
        // Trick three.js into thinking this is a THREE.Skeleton object
        Object.defineProperty(this, "useVertexTexture", { get: function () {
            return true;
        } });
        Object.defineProperty(this, "boneTextureWidth", { get: function () {
            return this.boneTexture.size;
        } });
        Object.defineProperty(this, "boneTextureHeight", { get: function () {
            return this.boneTexture.size;
        } });
        // Trick three.js into thinking our bone texture is a THREE.DataTexture
        Object.defineProperty(this.boneTexture, "__webglTexture", { get: function () {
            return this.texture;
        } });
        Object.defineProperty(this.boneTexture, "needsUpdate", { get: function () {
            return false;
        } });
        Object.defineProperty(this.boneTexture, "width", { get: function () {
            return this.size;
        } });
        Object.defineProperty(this.boneTexture, "height", { get: function () {
            return this.size;
        } });
    }
    ThreejsSkeleton.prototype.update = function (gl) {
        // Compute the bone matrices
        RMXSkeletalAnimation.exportPose(this.skeleton, this.pose, this.boneTexture.data);
        // Upload the bone matrices to the bone texture
        this.boneTexture.update(gl);
    };
    return ThreejsSkeleton;
})();
/**
* Stores information about a piece of geometry
*/
var ThreejsModelChunk = (function () {
    function ThreejsModelChunk() {
        this.geometry = null;
        this.material = null;
    }
    return ThreejsModelChunk;
})();
var ThreejsModelInstance = (function () {
    function ThreejsModelInstance(model, skeleton) {
        this.model = model;
        this.skeleton = skeleton;
    }
    return ThreejsModelInstance;
})();
/**
* A factory for producing objects that behave like THREE.SkinnedMesh
*/
var ThreejsModel = (function () {
    function ThreejsModel() {
        this.chunks = [];
        this.skeleton = null;
        this.animations = [];
    }
    ThreejsModel.prototype.instanciate = function () {
        // Create one container object.
        var result = new THREE.Object3D;
        // Create one custom skeleton object.
        var threejsSkeleton = null;
        if (this.skeleton) {
            threejsSkeleton = new ThreejsSkeleton(this.skeleton);
        }
        for (var i = 0; i < this.chunks.length; ++i) {
            var chunk = this.chunks[i];
            var mesh = new THREE.Mesh(chunk.geometry, chunk.material);
            // Trick three.js into thinking this is a THREE.SkinnedMesh.
            if (this.skeleton) {
                mesh.userData = threejsSkeleton;
                Object.defineProperty(mesh, "skeleton", { get: function () {
                    return this.userData;
                } });
                Object.defineProperty(mesh, "bindMatrix", { get: function () {
                    return ThreejsModel.identityMatrix;
                } });
                Object.defineProperty(mesh, "bindMatrixInverse", { get: function () {
                    return ThreejsModel.identityMatrix;
                } });
            }
            // Add the mesh to the container object.
            result.add(mesh);
        }
        // Store the custom skeleton in the container object.
        result.userData = new ThreejsModelInstance(this, threejsSkeleton);
        return result;
    };
    return ThreejsModel;
})();
ThreejsModel.identityMatrix = new THREE.Matrix4();
ThreejsModel.identityMatrix.identity();
/// <reference path="./rmx/model.ts" />
/// <reference path="./rmx/model-loader.ts" />
/// <reference path="./rmx/model-animation.ts" />
/// <reference path="./rmx/threejs-loader.ts" />
/// <reference path="../external/threejs/three.d.ts" />
/// <reference path="../external/stats/stats.d.ts" />
var ThreejsRenderer = (function () {
    function ThreejsRenderer() {
        this.canvas = null;
        this.camera = null;
        this.scene = null;
        this.renderer = null;
        this.mesh = null;
        this.lights = [];
        this.grid = null;
        this.axes = null;
        this.stats = null;
        this.last_timestamp = null;
        this.time = 0;
        this.render_loops = 1;
    }
    ThreejsRenderer.prototype.init = function (canvas) {
        var _this = this;
        this.canvas = canvas;
        // Camera
        this.camera = new THREE.PerspectiveCamera(27, canvas.width / canvas.height, 1, 10);
        this.zoomToObject(10);
        // Scene
        this.scene = new THREE.Scene();
        // Lights
        var light0 = new THREE.AmbientLight(0x444444);
        this.lights.push(light0);
        this.scene.add(light0);
        var light1 = new THREE.DirectionalLight(0xffffff, 0.5);
        light1.position.set(1, 1, 1);
        this.lights.push(light1);
        this.scene.add(light1);
        var light2 = new THREE.DirectionalLight(0xffffff, 1.5);
        light2.position.set(0, -1, 0);
        this.lights.push(light2);
        this.scene.add(light2);
        // Grid
        var gridXY = new THREE.GridHelper(5, 1);
        gridXY.rotation.x = Math.PI / 2;
        gridXY.position.z = -0.001;
        this.scene.add(gridXY);
        // Axes
        this.axes = new THREE.AxisHelper(2);
        this.scene.add(this.axes);
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
        this.renderer.setSize(canvas.width, canvas.height);
        this.renderer.setClearColor(new THREE.Color(0.5, 0.5, 0.5), 1);
        this.renderer.gammaInput = true;
        this.renderer.gammaOutput = true;
        // Stats block
        this.stats = new Stats();
        canvas.parentNode.insertBefore(this.stats.domElement, canvas.parentNode.firstChild);
        // Events
        window.addEventListener('resize', function () {
            _this.camera.aspect = _this.canvas.width / _this.canvas.height;
            _this.camera.updateProjectionMatrix();
            _this.renderer.setSize(_this.canvas.width, _this.canvas.height);
        }, false);
        this.drawScene();
    };
    ThreejsRenderer.getObjectRadius = function (object) {
        var _this = this;
        if (object instanceof THREE.Mesh) {
            // Object is a mesh
            var mesh = object;
            if (mesh.geometry) {
                if (!mesh.geometry.boundingSphere) {
                    mesh.geometry.computeBoundingSphere();
                }
                return mesh.geometry.boundingSphere.radius;
            }
            else {
                return 0;
            }
        }
        else if (object.children.length > 0) {
            // Object is a container object
            var result = 0;
            object.children.forEach(function (child) {
                result = Math.max(result, _this.getObjectRadius(child) + child.position.length());
            });
            return result;
        }
        else {
            // Object is empty
            return 0;
        }
    };
    /** Zooms the camera so that it shows the object */
    ThreejsRenderer.prototype.zoomToObject = function (scale) {
        if (this.mesh) {
            var r = Math.max(0.01, ThreejsRenderer.getObjectRadius(this.mesh));
            this.zoomTo(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, r * scale);
        }
        else {
            this.zoomTo(0, 0, 0, 1 * scale);
        }
    };
    /** Zooms the camera so that it shows the given coordinates */
    ThreejsRenderer.prototype.zoomTo = function (x, y, z, r) {
        this.camera.position.set(x + 1 * r, y + 0.3 * r, z + 0.5 * r);
        this.camera.up.set(0, 0, 1);
        this.camera.lookAt(new THREE.Vector3(x, y, z));
        this.camera.far = 2 * r + 20;
        this.camera.updateProjectionMatrix();
    };
    /** Main render loop */
    ThreejsRenderer.prototype.tick = function (timestamp) {
        // Abort if there is nothing to render
        if (!this.mesh) {
            return false;
        }
        // Timing
        var delta_time = 0;
        if (timestamp === null) {
            this.last_timestamp = null;
            this.time = 0;
        }
        else if (this.last_timestamp === null) {
            this.last_timestamp = timestamp;
            this.time = 0;
        }
        else {
            delta_time = timestamp - this.last_timestamp;
            this.last_timestamp = timestamp;
        }
        // Increase the number of loops to measure performance
        // FPS is otherwise bounded by the vertical sync
        var loops = this.render_loops || 1;
        for (var i = 0; i < loops; ++i) {
            this.stats.begin();
            this.updateAnimation(delta_time / loops);
            this.drawScene();
            this.stats.end();
        }
        return true;
    };
    /** Draws the scene */
    ThreejsRenderer.prototype.drawScene = function () {
        this.renderer.render(this.scene, this.camera);
    };
    /** Updates skeletal animation data */
    ThreejsRenderer.prototype.updateAnimation = function (delta_time) {
        this.time += delta_time / (1000);
        var mesh = this.mesh;
        var data = mesh.userData;
        if (data.skeleton) {
            if (data.model.animations.length > 0) {
                RMXSkeletalAnimation.sampleAnimation(data.model.animations[0], data.model.skeleton, data.skeleton.pose, this.time * 25);
            }
            else {
                RMXSkeletalAnimation.resetPose(data.model.skeleton, data.skeleton.pose);
            }
            var gl = this.renderer.context;
            data.skeleton.update(gl);
        }
    };
    ThreejsRenderer.prototype.setMesh = function (json, data) {
        this.resetMesh();
        if (!json || !data) {
            return;
        }
        var loader = new RMXModelLoader;
        var model = loader.loadModel(json, data.buffer);
        var loader2 = new ThreejsModelLoader;
        var model2 = loader2.createModel(model);
        this.mesh = model2.instanciate();
        this.scene.add(this.mesh);
        this.zoomToObject(5);
    };
    ThreejsRenderer.prototype.resetMesh = function () {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh = null;
        }
    };
    return ThreejsRenderer;
})();
/// <reference path="../lib/collada.d.ts" />
/// <reference path="../external/jquery/jquery.d.ts" />
var ColladaConverterOption = (function () {
    function ColladaConverterOption(option, parent) {
        var _this = this;
        this.option = option;
        // Label
        var label = $("<label>").addClass("col-sm-6").addClass("control-label").text(option.title);
        // Control
        var control_content = null;
        switch (option.type) {
            case "boolean":
                this.control = $("<input>").attr("type", "checkbox");
                control_content = $("<div>").addClass("checkbox").append($("<label>").append(this.control).append("Enabled"));
                this.getFn = function () { return _this.control.prop("checked"); };
                this.setFn = function (value) { return _this.control.prop("checked", value); };
                break;
            case "number":
                this.control = $("<input>").attr("type", "number").addClass("form-control");
                control_content = this.control;
                this.getFn = function () { return _this.control.val(); };
                this.setFn = function (value) { return _this.control.val(value); };
                break;
            case "select":
                var src_option = option;
                this.control = $("<select>").addClass("form-control");
                control_content = this.control;
                src_option.options.forEach(function (value) {
                    _this.control.append($("<option>").attr("value", value).text(value));
                });
                this.getFn = function () { return _this.control.val(); };
                this.setFn = function (value) { return _this.control.val(value); };
                break;
            default:
                throw new Error("Unknown option type");
        }
        var control_group = $("<div>").addClass("col-sm-4");
        control_group.append(control_content);
        // Initialize
        this.setFn(option.value);
        // Events
        this.control.change(function () {
            _this.option.value = _this.getFn();
        });
        // Info
        var info_icon = $("<span>").addClass("glyphicon glyphicon-info-sign");
        var info_button = $("<button>").addClass("btn btn-info btn-block").attr("type", "button");
        info_button.popover({ 'title': option.title, 'content': option.description, 'placement': top, 'trigger': 'click hover' });
        info_button.append(info_icon);
        var info_group = $("<div>").addClass("col-sm-2");
        info_group.append(info_button);
        // Group
        this.group = $("<div>").addClass("form-group");
        this.group.append(label);
        this.group.append(control_group);
        this.group.append(info_group);
        if (parent) {
            parent.append(this.group);
        }
    }
    return ColladaConverterOption;
})();
// Code from https://github.com/lydell/json-stringify-pretty-compact
// Copyright 2014 Simon Lydell
// X11 (“MIT”) Licensed. (See LICENSE.)
var stringify;
(function (_stringify) {
    function stringify(obj, options) {
        options = options || {};
        var indent = JSON.stringify([1], null, get(options, "indent", 2)).slice(2, -3);
        var maxLength = (indent === "" ? Infinity : get(options, "maxLength", 80));
        return (function _stringify(obj, currentIndent, reserved) {
            if (obj && typeof obj.toJSON === "function") {
                obj = obj.toJSON();
            }
            var string = JSON.stringify(obj);
            if (string === undefined) {
                return string;
            }
            var length = maxLength - currentIndent.length - reserved;
            if (string.length <= length) {
                var prettified = prettify(string);
                if (prettified.length <= length) {
                    return prettified;
                }
            }
            if (typeof obj === "object" && obj !== null) {
                var nextIndent = currentIndent + indent;
                var items = [];
                var delimiters;
                var comma = function (array, index) {
                    return (index === array.length - 1 ? 0 : 1);
                };
                if (Array.isArray(obj)) {
                    for (var index = 0; index < obj.length; index++) {
                        items.push(_stringify(obj[index], nextIndent, comma(obj, index)) || "null");
                    }
                    delimiters = "[]";
                }
                else {
                    Object.keys(obj).forEach(function (key, index, array) {
                        var keyPart = JSON.stringify(key) + ": ";
                        var value = _stringify(obj[key], nextIndent, keyPart.length + comma(array, index));
                        if (value !== undefined) {
                            items.push(keyPart + value);
                        }
                    });
                    delimiters = "{}";
                }
                if (items.length > 0) {
                    return [
                        delimiters[0],
                        indent + items.join(",\n" + nextIndent),
                        delimiters[1]
                    ].join("\n" + currentIndent);
                }
            }
            return string;
        }(obj, "", 0));
    }
    _stringify.stringify = stringify;
    // Note: This regex matches even invalid JSON strings, but since we’re
    // working on the output of `JSON.stringify` we know that only valid strings
    // are present (unless the user supplied a weird `options.indent` but in
    // that case we don’t care since the output would be invalid anyway).
    var stringOrChar = /("(?:[^"]|\\.)*")|[:,]/g;
    function prettify(string) {
        return string.replace(stringOrChar, function (match, string) {
            if (string) {
                return match;
            }
            return match + " ";
        });
    }
    function get(options, name, defaultValue) {
        return (name in options ? options[name] : defaultValue);
    }
})(stringify || (stringify = {}));
/// <reference path="../lib/collada.d.ts" />
/// <reference path="../external/jquery/jquery.d.ts" />
/// <reference path="./threejs-renderer.ts" />
/// <reference path="./convert-options.ts" />
/// <reference path="./stringify.ts" />
// ----------------------------------------------------------------------------
// Evil global data
// ----------------------------------------------------------------------------
var timestamps = {};
var options = new COLLADA.Converter.Options();
var optionElements = [];
var renderer;
var conversion_data = {
    stage: null,
    exception: null,
    s0_source: null,
    s1_xml: null,
    s2_loaded: null,
    s3_converted: null,
    s4_exported_custom: null,
    s5_exported_threejs: null
};
// ----------------------------------------------------------------------------
// Misc
// ----------------------------------------------------------------------------
function fileSizeStr(bytes) {
    var kilo = 1024;
    var mega = 1024 * 1024;
    var giga = 1024 * 1024 * 1024;
    var tera = 1024 * 1024 * 1024 * 1024;
    var value = 0;
    var unit = "";
    if (bytes < kilo) {
        value = bytes;
        unit = "B";
    }
    else if (bytes < mega) {
        value = bytes / kilo;
        unit = "kB";
    }
    else if (bytes < giga) {
        value = bytes / mega;
        unit = "MB";
    }
    else if (bytes < tera) {
        value = bytes / giga;
        unit = "GB";
    }
    else {
        return ">1TB";
    }
    if (value < 10) {
        return value.toFixed(3) + " " + unit;
    }
    else if (value < 100) {
        return value.toFixed(2) + " " + unit;
    }
    else {
        return value.toFixed(1) + " " + unit;
    }
}
// ----------------------------------------------------------------------------
// Log
// ----------------------------------------------------------------------------
function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function writeProgress(msg) {
    $("#log").append(msg + "\n");
}
function writeLog(name, message, level) {
    var line = COLLADA.LogLevelToString(level) + ": " + escapeHTML(message);
    $("#log").append("[" + name + "] " + line + "\n");
}
function clearLog() {
    $("#log").text("");
}
function timeStart(name) {
    timestamps[name] = performance.now();
    writeProgress(name + " started");
}
function timeEnd(name) {
    var endTime = performance.now();
    var startTime = timestamps[name];
    writeProgress(name + " finished (" + (endTime - startTime).toFixed(2) + "ms)");
}
// ----------------------------------------------------------------------------
// Reset
// ----------------------------------------------------------------------------
function reset() {
    resetInput();
    resetOutput();
}
function resetInput() {
    conversion_data.s0_source = "";
    updateUIInput();
}
function resetOutput() {
    conversion_data.stage = -1;
    conversion_data.exception = null;
    conversion_data.s1_xml = null;
    conversion_data.s2_loaded = null;
    conversion_data.s3_converted = null;
    conversion_data.s4_exported_custom = null;
    conversion_data.s5_exported_threejs = null;
    renderSetModel(null, null);
    clearLog();
    updateUIOutput();
    updateUIProgress();
}
// ----------------------------------------------------------------------------
// Renderer
// ----------------------------------------------------------------------------
function renderSetModel(json, data) {
    renderer.setMesh(json, data);
}
function renderStartRendering() {
    renderTick(null);
}
function renderTick(timestamp) {
    if (renderer.tick(timestamp)) {
        requestAnimationFrame(renderTick);
    }
}
// ----------------------------------------------------------------------------
// Download
// ----------------------------------------------------------------------------
function downloadJSON(data, name) {
    var mime = "application/json";
    var url = COLLADA.Exporter.Utils.jsonToBlobURI(data, mime);
    downloadUrl(url, name, mime);
}
function previewJSON(data) {
    var str = stringify.stringify(data, { maxLength: 120 });
    $("#preview-data").val(str);
    $("#preview-modal").modal('show');
}
function downloadBinary(data, name) {
    var mime = "application/octet-stream";
    var url = COLLADA.Exporter.Utils.bufferToBlobURI(data, mime);
    downloadUrl(url, name, mime);
}
function downloadUrl(url, name, mime) {
    var a = $("#download-link")[0];
    a.href = url;
    a.download = name;
    a.type = mime;
    a.click();
    // TODO: Find a reliable way of releasing the blob URI,
    // so that the blob can be freed from memory.
}
// ----------------------------------------------------------------------------
// UI
// ----------------------------------------------------------------------------
function updateUIProgress() {
    if (conversion_data.stage >= 0) {
        $("#progress-container").removeClass("hidden");
        $("#progress-container").css("display", "");
        $("#progress").css("width", (100 * conversion_data.stage / 5).toFixed(1) + "%");
    }
    else {
        $("#progress-container").addClass("hidden");
    }
    if (conversion_data.stage >= 6) {
        $("#progress-container").fadeOut(2000);
    }
}
function updateUIInput() {
    if (conversion_data.s0_source.length > 0) {
        $("#drop-target-result").removeClass("hidden");
        $("#drop-target-instructions").addClass("hidden");
        $("#input_file_size").text("File loaded (" + fileSizeStr(conversion_data.s0_source.length) + ")");
        $("#convert").removeAttr("disabled");
    }
    else {
        $("#drop-target-result").addClass("hidden");
        $("#drop-target-instructions").removeClass("hidden");
        $("#convert").attr("disabled", "disabled");
    }
}
function updateUIOutput() {
    if (conversion_data.s4_exported_custom) {
        var data = conversion_data.s4_exported_custom.json;
        var binary = conversion_data.s4_exported_custom.data;
        // Geometry complexity
        var geometry_complexity = "";
        geometry_complexity += data.chunks.length + " chunks";
        var tris = 0;
        var verts = 0;
        data.chunks.forEach(function (chunk) {
            tris += chunk.triangle_count;
            verts += chunk.vertex_count;
        });
        geometry_complexity += ", " + tris + " triangles, " + verts + " vertices";
        $("#output-geometry-complexity").text(geometry_complexity);
        // Animation complexity
        var animation_complexity = "";
        animation_complexity += data.bones.length + " bones";
        animation_complexity += ", ";
        animation_complexity += ((data.animations.length > 0) ? data.animations[0].frames : 0) + " keyframes";
        $("#output-animation-complexity").text(animation_complexity);
        // Geometry size
        var bbox = data.info.bounding_box;
        var geometry_size = "";
        if (bbox) {
            geometry_size += "[" + bbox.min[0].toFixed(2) + "," + bbox.min[1].toFixed(2) + "," + bbox.min[2].toFixed(2) + "]";
            geometry_size += "  -  ";
            geometry_size += "[" + bbox.max[0].toFixed(2) + "," + bbox.max[1].toFixed(2) + "," + bbox.max[2].toFixed(2) + "]";
        }
        $("#output-geometry-size").text(geometry_size);
        for (var i = 0; i < data.chunks.length; ++i) {
            $("#chunk-" + i).removeClass("hidden");
            $("#chunk-" + i + " > span").text(data.chunks[i].name || ("" + i));
        }
        // File sizes
        $("#output-custom-json .output-size").text(fileSizeStr(JSON.stringify(data).length));
        $("#output-custom-binary .output-size").text(fileSizeStr(binary.length));
        $("#output-custom-json button").removeAttr("disabled");
        $("#output-custom-binary button").removeAttr("disabled");
    }
    else {
        $("#output-geometry-complexity").text("");
        $("#output-animation-complexity").text("");
        $("#output-geometry-size").text("");
        $(".chunk-checkbox-container").addClass("hidden");
        // Output
        $("#output-custom-json .output-size").text("");
        $("#output-custom-binary .output-size").text("");
        $("#output-custom-json button").attr("disabled", "disabled");
        $("#output-custom-binary button").attr("disabled", "disabled");
    }
    if (conversion_data.s5_exported_threejs) {
        var threejs_data = conversion_data.s5_exported_threejs;
        $("#output-threejs .output-size").text(fileSizeStr(JSON.stringify(threejs_data).length));
        $("#output-threejs button").removeAttr("disabled");
    }
    else {
        $("#output-threejs .output-size").text("");
        $("#output-threejs button").attr("disabled", "disabled");
    }
}
// ----------------------------------------------------------------------------
// Drag & Drop
// ----------------------------------------------------------------------------
function onFileDrag(ev) {
    ev.preventDefault();
}
function onFileDrop(ev) {
    writeProgress("Something dropped.");
    ev.preventDefault();
    var dt = ev.originalEvent.dataTransfer;
    if (!dt) {
        writeProgress("Your browser does not support drag&drop for files (?).");
        return;
    }
    var files = dt.files;
    if (files.length == 0) {
        writeProgress("You did not drop a file. Try dragging and dropping a file instead.");
        return;
    }
    if (files.length > 1) {
        writeProgress("You dropped multiple files. Please only drop a single file.");
        return;
    }
    onFileLoad(files[0]);
}
function onFileLoad(file) {
    // Reset all data
    reset();
    // File reader
    var reader = new FileReader();
    reader.onload = function () {
        timeEnd("Reading file");
        var result = reader.result;
        convertSetup(result);
    };
    reader.onerror = function () {
        writeProgress("Error reading file.");
    };
    timeStart("Reading file");
    // Read
    reader.readAsText(file);
}
// ----------------------------------------------------------------------------
// Conversion
// ----------------------------------------------------------------------------
function convertSetup(src) {
    // Set the source data
    conversion_data.s0_source = src;
    conversion_data.stage = 1;
    updateUIInput();
}
function convertTick() {
    try {
        switch (conversion_data.stage) {
            case 1:
                convertParse();
                break;
            case 2:
                convertLoad();
                break;
            case 3:
                convertConvert();
                break;
            case 4:
                convertExportCustom();
                break;
            case 5:
                convertExportThreejs();
                updateUIOutput();
                break;
            case 6:
                convertRenderPreview();
                break;
            case 7:
                break;
            default:
                throw new Error("Unknown stage");
        }
    }
    catch (e) {
        conversion_data.exception = true;
    }
    // Update the progress bar
    updateUIProgress();
}
function convertNextStage() {
    conversion_data.stage++;
    setTimeout(convertTick, 10);
}
function convertParse() {
    // Parser
    var parser = new DOMParser();
    // Parse
    timeStart("XML parsing");
    conversion_data.s1_xml = parser.parseFromString(conversion_data.s0_source, "text/xml");
    timeEnd("XML parsing");
    // Next stage
    convertNextStage();
}
function convertLoad() {
    // Loader
    var loader = new COLLADA.Loader.ColladaLoader();
    var loaderlog = new COLLADA.LogCallback;
    loaderlog.onmessage = function (message, level) {
        writeLog("loader", message, level);
    };
    loader.log = new COLLADA.LogFilter(loaderlog, 3 /* Info */);
    // Load
    timeStart("COLLADA parsing");
    conversion_data.s2_loaded = loader.loadFromXML("id", conversion_data.s1_xml);
    timeEnd("COLLADA parsing");
    // Next stage
    convertNextStage();
}
function convertConvert() {
    // Converter
    var converter = new COLLADA.Converter.ColladaConverter();
    var converterlog = converter.log = new COLLADA.LogCallback;
    converterlog.onmessage = function (message, level) {
        writeLog("converter", message, level);
    };
    converter.options = options;
    // Convert
    timeStart("COLLADA conversion");
    conversion_data.s3_converted = converter.convert(conversion_data.s2_loaded);
    timeEnd("COLLADA conversion");
    // Next stage
    convertNextStage();
}
function convertExportCustom() {
    // Exporter
    var exporter = new COLLADA.Exporter.ColladaExporter();
    var exporterlog = exporter.log = new COLLADA.LogCallback;
    exporterlog.onmessage = function (message, level) {
        writeLog("converter", message, level);
    };
    // Export
    timeStart("COLLADA export");
    conversion_data.s4_exported_custom = exporter.export(conversion_data.s3_converted);
    timeEnd("COLLADA export");
    // Next stage
    convertNextStage();
}
function convertExportThreejs() {
    // Exporter2
    var exporter = new COLLADA.Threejs.ThreejsExporter();
    var exporterlog = exporter.log = new COLLADA.LogCallback;
    exporterlog.onmessage = function (message, level) {
        writeLog("threejs", message, level);
    };
    // Export2
    timeStart("Threejs export");
    conversion_data.s5_exported_threejs = exporter.export(conversion_data.s3_converted);
    timeEnd("Threejs export");
    // Next stage
    convertNextStage();
}
function convertRenderPreview() {
    timeStart("WebGL loading");
    renderSetModel(conversion_data.s4_exported_custom.json, conversion_data.s4_exported_custom.data);
    timeEnd("WebGL loading");
    timeStart("WebGL rendering");
    renderStartRendering();
    timeEnd("WebGL rendering");
    // Next stage
    convertNextStage();
}
function onConvertClick() {
    // Delete any previously converted data
    resetOutput();
    // Start the conversion
    conversion_data.stage = 1;
    setTimeout(convertTick, 10);
}
// ----------------------------------------------------------------------------
// Initialization
// ----------------------------------------------------------------------------
function init() {
    // Initialize WebGL
    var canvas = $("#canvas")[0];
    renderer = new ThreejsRenderer();
    renderer.init(canvas);
    // Create option elements
    var optionsForm = $("#form-options");
    optionElements.push(new ColladaConverterOption(options.createSkeleton, optionsForm));
    optionElements.push(new ColladaConverterOption(options.enableAnimations, optionsForm));
    optionElements.push(new ColladaConverterOption(options.animationFps, optionsForm));
    optionElements.push(new ColladaConverterOption(options.worldTransform, optionsForm));
    optionElements.push(new ColladaConverterOption(options.worldTransformScale, optionsForm));
    optionElements.push(new ColladaConverterOption(options.worldTransformRotationAxis, optionsForm));
    optionElements.push(new ColladaConverterOption(options.worldTransformRotationAngle, optionsForm));
    optionElements.push(new ColladaConverterOption(options.sortBones, optionsForm));
    optionElements.push(new ColladaConverterOption(options.applyBindShape, optionsForm));
    optionElements.push(new ColladaConverterOption(options.singleBufferPerGeometry, optionsForm));
    // Register events
    $("#drop-target").on("dragover", onFileDrag);
    $("#drop-target").on("drop", onFileDrop);
    $("#drop-target").on("drop", onFileDrop);
    $("#convert").click(onConvertClick);
    $("#output-custom-json .output-download").click(function () { return downloadJSON(conversion_data.s4_exported_custom.json, "model.json"); });
    $("#output-custom-binary .output-download").click(function () { return downloadBinary(conversion_data.s4_exported_custom.data, "model.bin"); });
    $("#output-threejs .output-download").click(function () { return downloadJSON(conversion_data.s5_exported_threejs, "model-threejs.json"); });
    $("#output-custom-json .output-view").click(function () { return previewJSON(conversion_data.s4_exported_custom.json); });
    $("#output-custom-binary .output-view").click(function () { return alert("Binary preview not implemented"); });
    $("#output-threejs .output-view").click(function () { return previewJSON(conversion_data.s5_exported_threejs); });
    $("#close-preview").click(function () { return $("#preview-modal").modal('hide'); });
    // Update all UI elements
    reset();
    writeProgress("Converter initialized");
}
//# sourceMappingURL=convert.js.map