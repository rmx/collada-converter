/// <reference path="gl-matrix.d.ts" />
/// <reference path="../src/external/gl-matrix.i.ts" />
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
var RMXModel = (function () {
    function RMXModel() {
        this.chunks = [];
        this.skeleton = new RMXSkeleton();
        this.materials = [];
        this.animations = [];
    }
    return RMXModel;
})();
var RMXBone = (function () {
    function RMXBone() {
    }
    return RMXBone;
})();
var RMXSkeleton = (function () {
    function RMXSkeleton() {
        this.bones = [];
    }
    return RMXSkeleton;
})();
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
    RMXBoneMatrixTexture.optimalSize = function (bones) {
        var result = 2;
        while (RMXBoneMatrixTexture.capacity(result) < bones) {
            result = result * 2;
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
var RMXPose = (function () {
    function RMXPose(bones) {
        this.pos = new Float32Array(bones * 3);
        this.rot = new Float32Array(bones * 4);
        this.scl = new Float32Array(bones * 3);
        this.world_matrices = new Float32Array(bones * 16);
    }
    return RMXPose;
})();
var RMXAnimationTrack = (function () {
    function RMXAnimationTrack() {
        this.bone = 0;
        this.pos = null;
        this.rot = null;
        this.scl = null;
    }
    return RMXAnimationTrack;
})();
var RMXAnimation = (function () {
    function RMXAnimation() {
        this.name = "";
        this.frames = 0;
        this.fps = 0;
        this.tracks = [];
    }
    return RMXAnimation;
})();
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
/// <reference path="convert-renderer-rmx.ts" />
/// <reference path="external/threejs/three.d.ts" />
/// <reference path="external/stats/stats.d.ts" />
// ----------------------------------------------------------------------------
// Evil global data
// ----------------------------------------------------------------------------
var threejs_objects = {
    render_loops: 1
};
// ----------------------------------------------------------------------------
// Model loading
// ----------------------------------------------------------------------------
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
    ThreejsModelLoader.prototype.createMaterial = function (material) {
        var hash = material.hash();
        var cached_material = this.materialCache[hash];
        if (cached_material) {
            return cached_material;
        }
        else {
            var result = new THREE.MeshPhongMaterial();
            result.skinning = true;
            result.color = new THREE.Color(0.8, 0.8, 0.8);
            // Disable textures. They won't work due to CORS anyway.
            result.map = null; //this.createTexture(material.diffuse);
            result.specularMap = null; // this.createTexture(material.specular);
            result.normalMap = null; // this.createTexture(material.normal);
            this.materialCache[hash] = result;
            return result;
        }
    };
    ThreejsModelLoader.prototype.createModel = function (model) {
        var result = new ThreejsModel;
        for (var i = 0; i < model.chunks.length; ++i) {
            var rmx_chunk = model.chunks[i];
            var threejs_chunk = new ThreejsModelChunk;
            threejs_chunk.geometry = this.createGeometry(rmx_chunk);
            threejs_chunk.material = this.createMaterial(model.materials[rmx_chunk.material_index]);
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
// ----------------------------------------------------------------------------
// Hacking the custom animation code into three.js
// ----------------------------------------------------------------------------
var ThreejsSkeleton = (function () {
    function ThreejsSkeleton(skeleton) {
        // The skeleton stores information about the hiearchy of the bones
        this.skeleton = skeleton;
        // The pose stores information about the current bone transformations
        this.pose = new RMXPose(skeleton.bones.length);
        RMXSkeletalAnimation.resetPose(this.skeleton, this.pose);
        // Trick three.js into thinking this is a THREE.Skeleton object
        this.useVertexTexture = true;
        this.boneTexture = new RMXBoneMatrixTexture(skeleton.bones.length);
        this.boneTextureWidth = this.boneTexture.size;
        this.boneTextureHeight = this.boneTexture.size;
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
    ThreejsSkeleton.prototype.update = function () {
        RMXSkeletalAnimation.exportPose(this.skeleton, this.pose, this.boneTexture.data);
        var _gl = threejs_objects.renderer.context;
        this.boneTexture.update(_gl);
    };
    return ThreejsSkeleton;
})();
var ThreejsModelChunk = (function () {
    function ThreejsModelChunk() {
        this.geometry = null;
        this.material = null;
    }
    return ThreejsModelChunk;
})();
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
        var skeletonAdapter = null;
        if (this.skeleton) {
            skeletonAdapter = new ThreejsSkeleton(this.skeleton);
        }
        for (var i = 0; i < this.chunks.length; ++i) {
            var chunk = this.chunks[i];
            var mesh = new THREE.Mesh(chunk.geometry, chunk.material);
            // Trick three.js into thinking this is a skinned mesh.
            // This is an ugly hack that might break at any time.
            if (this.skeleton) {
                var anymesh = mesh;
                anymesh.skeleton = skeletonAdapter;
                anymesh.bindMatrixInverse = new THREE.Matrix4();
                anymesh.bindMatrixInverse.identity();
                anymesh.bindMatrix = new THREE.Matrix4();
                anymesh.bindMatrix.identity();
            }
            // Add the mesh to the container object.
            result.add(mesh);
        }
        // Store the custom skeleton in the container object.
        result.skeleton = skeletonAdapter;
        result.userData = this;
        return result;
    };
    return ThreejsModel;
})();
// ----------------------------------------------------------------------------
// Rendering
// ----------------------------------------------------------------------------
function zoomThreejsCamera(scale) {
    threejs_objects.camera.position.set(1 * scale, 0.3 * scale, 0.5 * scale);
    threejs_objects.camera.up.set(0, 0, 1);
    threejs_objects.camera.lookAt(new THREE.Vector3(0, 0, 0));
    threejs_objects.camera.far = 2 * scale + 20;
    threejs_objects.camera.updateProjectionMatrix();
}
function initThreejs(canvas) {
    threejs_objects.canvas = canvas;
    // Camera
    var camera = new THREE.PerspectiveCamera(27, canvas.width / canvas.height, 1, 10);
    threejs_objects.camera = camera;
    zoomThreejsCamera(10.0);
    // Scene
    threejs_objects.scene = new THREE.Scene();
    // Light
    threejs_objects.scene.add(new THREE.AmbientLight(0x444444));
    var light1 = new THREE.DirectionalLight(0xffffff, 0.5);
    light1.position.set(1, 1, 1);
    threejs_objects.scene.add(light1);
    var light2 = new THREE.DirectionalLight(0xffffff, 1.5);
    light2.position.set(0, -1, 0);
    threejs_objects.scene.add(light2);
    // Grid
    var gridXY = new THREE.GridHelper(5, 1);
    gridXY.rotation.x = Math.PI / 2;
    gridXY.position.z = -0.001;
    threejs_objects.scene.add(gridXY);
    // Axes
    threejs_objects.scene.add(new THREE.AxisHelper(2));
    // Renderer
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
    renderer.setSize(canvas.width, canvas.height);
    renderer.setClearColor(new THREE.Color(0.5, 0.5, 0.5), 1);
    threejs_objects.renderer = renderer;
    threejs_objects.renderer.gammaInput = true;
    threejs_objects.renderer.gammaOutput = true;
    // Stats block
    threejs_objects.stats = new Stats();
    canvas.parentNode.insertBefore(threejs_objects.stats.domElement, canvas.parentNode.firstChild);
    // Events
    window.addEventListener('resize', onWindowResize, false);
    drawSceneThreejs();
}
function onWindowResize() {
    threejs_objects.camera.aspect = threejs_objects.canvas.width / threejs_objects.canvas.height;
    threejs_objects.camera.updateProjectionMatrix();
    threejs_objects.renderer.setSize(threejs_objects.canvas.width, threejs_objects.canvas.height);
}
function tickThreejs(timestamp) {
    var delta_time = 0;
    if (timestamp === null) {
        last_timestamp = null;
        threejs_objects.time = 0;
    }
    else if (last_timestamp === null) {
        last_timestamp = timestamp;
        threejs_objects.time = 0;
    }
    else {
        delta_time = timestamp - last_timestamp;
        last_timestamp = timestamp;
    }
    if (threejs_objects.mesh) {
        requestAnimationFrame(tickThreejs);
    }
    // Increase the number of loops to measure performance
    // (type 'threejs_objects.render_loops=100' in the development console)
    // FPS is otherwise bounded by the vertical sync
    var loops = threejs_objects.render_loops;
    for (var i = 0; i < loops; ++i) {
        threejs_objects.stats.begin();
        animateThreejs(delta_time / loops);
        drawSceneThreejs();
        threejs_objects.stats.end();
    }
}
function drawSceneThreejs() {
    threejs_objects.renderer.render(threejs_objects.scene, threejs_objects.camera);
}
function animateThreejs(delta_time) {
    threejs_objects.time += delta_time / (1000);
    if (threejs_objects.mesh && threejs_objects.mesh.skeleton) {
        RMXSkeletalAnimation.sampleAnimation(threejs_objects.mesh.userData.animations[0], threejs_objects.mesh.skeleton.skeleton, threejs_objects.mesh.skeleton.pose, threejs_objects.time * 25);
        threejs_objects.mesh.skeleton.update();
    }
}
function fillBuffersThreejs(json, data) {
    var loader = new RMXModelLoader;
    var model = loader.loadModel(json, data);
    var loader2 = new ThreejsModelLoader;
    var model2 = loader2.createModel(model);
    threejs_objects.mesh = model2.instanciate();
    threejs_objects.scene.add(threejs_objects.mesh);
}
function clearBuffersThreejs() {
    if (threejs_objects.mesh) {
        threejs_objects.scene.remove(threejs_objects.mesh);
        threejs_objects.mesh = null;
    }
}
/// <reference path="../src/external/gl-matrix.i.ts" />
/// <reference path="../lib/collada.d.ts" />
/// <reference path="convert-renderer-rmx.ts" />
/// <reference path="convert-renderer-threejs.ts" />
;
;
;
;
var gl_objects = {};
var gl = null;
var gl_vao = null;
var time = 0;
var last_timestamp = null;
function initGL(canvas) {
    gl_objects.canvas = canvas;
    try {
        gl = canvas.getContext("webgl");
    }
    catch (e) {
    }
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
        return;
    }
    console.log("WebGL extensions: " + gl.getSupportedExtensions().join(", "));
    // Extensions
    gl_objects.extensions = {};
    gl_objects.extensions.vao = gl.getExtension('OES_vertex_array_object');
    gl_objects.extensions.euint = gl.getExtension('OES_element_index_uint');
    gl_objects.extensions.tex_float = gl.getExtension('OES_texture_float');
    gl_vao = gl_objects.extensions.vao;
    // Background color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    // Other resources
    gl_objects.shaders = {};
    gl_objects.shaders.normal = {};
    initShader(gl_objects.shaders.normal, "shader-vs", "shader-fs");
    gl_objects.shaders.skin = {};
    initShader(gl_objects.shaders.skin, "shader-skinning-vs", "shader-fs");
    initMatrices();
    initBoneTexture();
    clearBuffers();
}
function initBoneTexture() {
    // 32x32 pixels can store 256 bone matrices
    gl_objects.bone_matrix_size = 32;
    gl_objects.bone_matrices = new Float32Array(4 * gl_objects.bone_matrix_size * gl_objects.bone_matrix_size);
    gl_objects.bone_matrices_texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, gl_objects.bone_matrices_texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl_objects.bone_matrix_size, gl_objects.bone_matrix_size, 0, gl.RGBA, gl.FLOAT, gl_objects.bone_matrices);
    gl.bindTexture(gl.TEXTURE_2D, null);
}
function updateBoneTexture() {
    gl.bindTexture(gl.TEXTURE_2D, gl_objects.bone_matrices_texture);
    //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl_objects.bone_matrix_size, gl_objects.bone_matrix_size, 0, gl.RGBA, gl.FLOAT, gl_objects.bone_matrices);
    // Note: texSubImage is faster, but bugged in current firefox
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl_objects.bone_matrix_size, gl_objects.bone_matrix_size, gl.RGBA, gl.FLOAT, gl_objects.bone_matrices);
}
function getShaderSource(id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }
    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }
    return str;
}
function getShader(str, type) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, str);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}
function initShader(shader, vs_name, fs_name) {
    var fragmentShader = getShader(getShaderSource(fs_name), gl.FRAGMENT_SHADER);
    var vertexShader = getShader(getShaderSource(vs_name), gl.VERTEX_SHADER);
    shader.program = gl.createProgram();
    gl.attachShader(shader.program, vertexShader);
    gl.attachShader(shader.program, fragmentShader);
    gl.linkProgram(shader.program);
    if (!gl.getProgramParameter(shader.program, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }
    gl.useProgram(shader.program);
    gl.bindAttribLocation(shader.program, 0, "va_position");
    gl.bindAttribLocation(shader.program, 1, "va_normal");
    gl.bindAttribLocation(shader.program, 2, "va_texcoord");
    gl.bindAttribLocation(shader.program, 3, "va_boneweight");
    gl.bindAttribLocation(shader.program, 4, "va_boneindex");
    shader.attribs = {};
    shader.attribs.position = gl.getAttribLocation(shader.program, "va_position");
    shader.attribs.normal = gl.getAttribLocation(shader.program, "va_normal");
    shader.attribs.texcoord = gl.getAttribLocation(shader.program, "va_texcoord");
    shader.attribs.boneweight = gl.getAttribLocation(shader.program, "va_boneweight");
    shader.attribs.boneindex = gl.getAttribLocation(shader.program, "va_boneindex");
    shader.uniforms = {};
    shader.uniforms.projection_matrix = gl.getUniformLocation(shader.program, "u_projection_matrix");
    shader.uniforms.modelview_matrix = gl.getUniformLocation(shader.program, "u_modelview_matrix");
    shader.uniforms.normal_matrix = gl.getUniformLocation(shader.program, "u_normal_matrix");
    shader.uniforms.ambient_color = gl.getUniformLocation(shader.program, "u_ambient_color");
    shader.uniforms.light_direction = gl.getUniformLocation(shader.program, "u_light_direction");
    shader.uniforms.light_color = gl.getUniformLocation(shader.program, "u_light_color");
    shader.uniforms.bind_shape_matrix = gl.getUniformLocation(shader.program, "u_bind_shape_matrix");
    shader.uniforms.bone_matrix = gl.getUniformLocation(shader.program, "u_bone_matrix");
    gl.useProgram(null);
}
function initMatrices() {
    gl_objects.matrices = {};
    gl_objects.matrices.modelview = mat4.create();
    gl_objects.matrices.projection = mat4.create();
    gl_objects.matrices.normal = mat3.create();
    gl_objects.camera = {};
    gl_objects.camera.up = vec3.fromValues(0, 0, 1);
    gl_objects.camera.eye = vec3.fromValues(2, -10, 1);
    gl_objects.camera.center = vec3.fromValues(0, 0, 0);
}
function setupCamera(json) {
    var bmin = vec3.clone(json.info.bounding_box.min);
    var bmax = vec3.clone(json.info.bounding_box.max);
    var diag = vec3.create();
    vec3.subtract(diag, bmax, bmin);
    gl_objects.camera.up = vec3.fromValues(0, 0, 1);
    gl_objects.camera.radius = 1.0 * vec3.length(diag);
    vec3.scaleAndAdd(gl_objects.camera.center, bmin, diag, 0.5);
}
function setUniforms(shader) {
    // Matrices
    var matrices = gl_objects.matrices;
    gl.uniformMatrix4fv(shader.uniforms.projection_matrix, false, matrices.projection);
    gl.uniformMatrix4fv(shader.uniforms.modelview_matrix, false, matrices.modelview);
    mat3.fromMat4(matrices.normal, matrices.modelview);
    mat3.invert(matrices.normal, matrices.normal);
    mat3.transpose(matrices.normal, matrices.normal);
    gl.uniformMatrix3fv(shader.uniforms.normal_matrix, false, matrices.normal);
    // Bone matrices
    if (shader.uniforms.bone_matrix) {
        gl.activeTexture(gl.TEXTURE0 + 0);
        gl.bindTexture(gl.TEXTURE_2D, gl_objects.bone_matrices_texture);
        gl.uniform1i(shader.uniforms.bone_matrix, 0);
    }
    // Lighting
    gl.uniform3f(shader.uniforms.ambient_color, 0.2, 0.2, 0.2);
    gl.uniform3f(shader.uniforms.light_direction, 0.57735, 0.57735, 0.57735);
    gl.uniform3f(shader.uniforms.light_color, 0.8, 0.8, 0.8);
}
function setChunkUniforms(shader, geometry) {
}
function clearBuffers() {
    gl_objects.animation = null;
    gl_objects.tracks = [];
    gl_objects.geometry = null;
    gl_objects.chunks = [];
    gl_objects.bones = [];
    gl_vao.bindVertexArrayOES(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}
function copyData(srcJson, srcData, dest, destOffset, destAdd) {
    var count = srcJson.count * srcJson.stride;
    for (var i = 0; i < count; ++i) {
        dest[i + destOffset] = srcData[i] + destAdd;
    }
}
function fillBuffers(json, data) {
    var shader = (json.bones.length > 0) ? gl_objects.shaders.skin : gl_objects.shaders.normal;
    var geometry = {};
    var vertex_count = json.chunks.reduce(function (prev, e) { return prev + e.vertex_count; }, 0);
    var triangle_count = json.chunks.reduce(function (prev, e) { return prev + e.triangle_count; }, 0);
    var data_position = new Float32Array(vertex_count * 3);
    var data_normal = new Float32Array(vertex_count * 3);
    var data_texcoord = new Float32Array(vertex_count * 2);
    var data_boneweight = new Float32Array(vertex_count * 4);
    var data_boneindex = new Uint8Array(vertex_count * 4);
    var data_indices = new Uint32Array(triangle_count * 3);
    var vertex_offset = 0;
    var index_offset = 0;
    for (var i = 0; i < json.chunks.length; ++i) {
        var json_chunk = json.chunks[i];
        var geometry_chunk = {};
        geometry_chunk.name = json_chunk.name;
        geometry_chunk.triangle_count = json_chunk.triangle_count;
        geometry_chunk.index_offset = index_offset;
        geometry_chunk.vertex_count = vertex_count;
        gl_objects.chunks.push(geometry_chunk);
        if (json_chunk.position !== null) {
            var chunk_position = new Float32Array(data, json_chunk.position.byte_offset, json_chunk.position.count * json_chunk.position.stride);
            copyData(json_chunk.position, chunk_position, data_position, vertex_offset * 3, 0);
        }
        if (json_chunk.normal !== null) {
            var chunk_normal = new Float32Array(data, json_chunk.normal.byte_offset, json_chunk.normal.count * json_chunk.normal.stride);
            copyData(json_chunk.normal, chunk_normal, data_normal, vertex_offset * 3, 0);
        }
        if (json_chunk.texcoord !== null) {
            var chunk_texcoord = new Float32Array(data, json_chunk.texcoord.byte_offset, json_chunk.texcoord.count * json_chunk.texcoord.stride);
            copyData(json_chunk.texcoord, chunk_texcoord, data_texcoord, vertex_offset * 2, 0);
        }
        if (json_chunk.boneweight !== null) {
            var chunk_boneweight = new Float32Array(data, json_chunk.boneweight.byte_offset, json_chunk.boneweight.count * json_chunk.boneweight.stride);
            copyData(json_chunk.boneweight, chunk_boneweight, data_boneweight, vertex_offset * 4, 0);
        }
        if (json_chunk.boneindex !== null) {
            var chunk_boneindex = new Uint8Array(data, json_chunk.boneindex.byte_offset, json_chunk.boneindex.count * json_chunk.boneindex.stride);
            copyData(json_chunk.boneindex, chunk_boneindex, data_boneindex, vertex_offset * 4, 0);
        }
        if (json_chunk.indices !== null) {
            var chunk_indices = new Uint32Array(data, json_chunk.indices.byte_offset, json_chunk.indices.count * json_chunk.indices.stride);
            copyData(json_chunk.indices, chunk_indices, data_indices, index_offset, vertex_offset);
        }
        vertex_offset += json_chunk.vertex_count;
        index_offset += json_chunk.triangle_count * 3;
    }
    // VAO
    geometry.vao = gl_vao.createVertexArrayOES();
    gl_vao.bindVertexArrayOES(geometry.vao);
    // Vertex buffer: position
    if (shader.attribs.position >= 0) {
        geometry.position = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, geometry.position);
        gl.bufferData(gl.ARRAY_BUFFER, data_position, gl.STATIC_DRAW);
        gl.vertexAttribPointer(shader.attribs.position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shader.attribs.position);
    }
    // Vertex buffer: normal
    if (shader.attribs.normal >= 0) {
        geometry.normal = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, geometry.normal);
        gl.bufferData(gl.ARRAY_BUFFER, data_normal, gl.STATIC_DRAW);
        gl.vertexAttribPointer(shader.attribs.normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shader.attribs.normal);
    }
    // Vertex buffer: texcoord
    if (shader.attribs.texcoord >= 0) {
        geometry.texcoord = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, geometry.texcoord);
        gl.bufferData(gl.ARRAY_BUFFER, data_texcoord, gl.STATIC_DRAW);
        gl.vertexAttribPointer(shader.attribs.texcoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shader.attribs.texcoord);
    }
    // Vertex buffer: bone weight
    if (shader.attribs.boneweight >= 0) {
        geometry.boneweight = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, geometry.boneweight);
        gl.bufferData(gl.ARRAY_BUFFER, data_boneweight, gl.STATIC_DRAW);
        gl.vertexAttribPointer(shader.attribs.boneweight, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shader.attribs.boneweight);
    }
    // Vertex buffer: bone index
    if (shader.attribs.boneindex >= 0) {
        geometry.boneindex = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, geometry.boneindex);
        gl.bufferData(gl.ARRAY_BUFFER, data_boneindex, gl.STATIC_DRAW);
        gl.vertexAttribPointer(shader.attribs.boneindex, 4, gl.UNSIGNED_BYTE, false, 0, 0);
        gl.enableVertexAttribArray(shader.attribs.boneindex);
    }
    // Index buffer
    if (true) {
        geometry.indices = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data_indices, gl.STATIC_DRAW);
    }
    gl_objects.geometry = geometry;
    gl_vao.bindVertexArrayOES(null);
    // Bones
    if (json.bones.length > 0) {
        gl_objects.bones = json.bones;
    }
    // Animations
    if (json.animations.length > 0) {
        gl_objects.animation = json.animations[0];
        gl_objects.tracks = [];
        for (var i = 0; i < json.animations[0].tracks.length; ++i) {
            var json_track = json.animations[0].tracks[i];
            var track = {};
            if (json_track.pos) {
                track.pos = new Float32Array(data, json_track.pos.byte_offset, json_track.pos.count * 3);
            }
            if (json_track.rot) {
                track.rot = new Float32Array(data, json_track.rot.byte_offset, json_track.rot.count * 4);
            }
            if (json_track.scl) {
                track.scl = new Float32Array(data, json_track.scl.byte_offset, json_track.scl.count * 3);
            }
            gl_objects.tracks.push(track);
        }
    }
    else if (json.bones.length > 0) {
        // Empty animation, if none is included
        gl_objects.animation = { name: "empty", frames: 2, fps: 1, tracks: [] };
        gl_objects.tracks = [];
        for (var i = 0; i < json.bones.length; ++i) {
            var track = {};
            gl_objects.tracks.push({});
        }
    }
}
function drawScene() {
    // Recompute view matrices
    var viewportWidth = gl_objects.canvas.width;
    var viewportHeight = gl_objects.canvas.height;
    gl.viewport(0, 0, viewportWidth, viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mat4.perspective(gl_objects.matrices.projection, 45, viewportWidth / viewportHeight, 0.1, 1000.0);
    mat4.lookAt(gl_objects.matrices.modelview, gl_objects.camera.eye, gl_objects.camera.center, gl_objects.camera.up);
    // Set the shader
    if (gl_objects.bones.length > 0) {
        gl.useProgram(gl_objects.shaders.skin.program);
        setUniforms(gl_objects.shaders.skin);
    }
    else {
        gl.useProgram(gl_objects.shaders.normal.program);
        setUniforms(gl_objects.shaders.normal);
    }
    // Set the VAO
    gl_vao.bindVertexArrayOES(gl_objects.geometry.vao);
    for (var i = 0; i < gl_objects.chunks.length; ++i) {
        if (elements.mesh_parts_checkboxes[i] && !elements.mesh_parts_checkboxes[i].checked) {
            continue;
        }
        var chunk = gl_objects.chunks[i];
        gl.drawElements(gl.TRIANGLES, chunk.triangle_count * 3, gl.UNSIGNED_INT, chunk.index_offset * 4);
    }
}
function animate(delta_time) {
    time += delta_time / (1000);
    var rotation_speed = 0.5;
    var r = 1.5 * gl_objects.camera.radius || 10;
    var x = r * Math.sin(rotation_speed * time) + gl_objects.camera.center[0];
    var y = r * Math.cos(rotation_speed * time) + gl_objects.camera.center[1];
    //var z = r / 2 * Math.sin(time / 5) + gl_objects.camera.center[2];
    var z = r / 2 + gl_objects.camera.center[2];
    vec3.set(gl_objects.camera.eye, x, y, z);
    if (gl_objects.bones.length > 0) {
        animate_skeleton(time);
    }
}
function tick(timestamp) {
    var delta_time = 0;
    if (timestamp === null) {
        last_timestamp = null;
    }
    else if (last_timestamp === null) {
        time = 0;
        last_timestamp = timestamp;
    }
    else {
        delta_time = timestamp - last_timestamp;
        last_timestamp = timestamp;
    }
    if (gl_objects.chunks.length > 0) {
        requestAnimationFrame(tick);
    }
    drawScene();
    animate(delta_time);
}
function animate_skeleton(time) {
    var bones = gl_objects.bones;
    var animation = gl_objects.animation;
    var tracks = gl_objects.tracks;
    var matrices = gl_objects.bone_matrices;
    var world_matrix = mat4.create();
    var bone_matrix = mat4.create();
    var pos = vec3.create();
    var rot = quat.create();
    var rot2 = quat.create();
    var scl = vec3.create();
    var local_matrices = new Array(bones.length);
    var duration = (animation.frames - 1) / animation.fps;
    var i = (time % duration) / duration * (animation.frames - 1);
    // for debugging
    // i = 0;
    var i0 = Math.floor(i);
    var i1 = Math.ceil(i);
    var s = i - Math.floor(i);
    for (var i = 0; i < bones.length; ++i) {
        var bone = bones[i];
        var track = tracks[i];
        local_matrices[i] = mat4.create();
        var local_matrix = local_matrices[i];
        if (track.pos) {
            pos[0] = (1 - s) * track.pos[i0 * 3 + 0] + s * track.pos[i1 * 3 + 0];
            pos[1] = (1 - s) * track.pos[i0 * 3 + 1] + s * track.pos[i1 * 3 + 1];
            pos[2] = (1 - s) * track.pos[i0 * 3 + 2] + s * track.pos[i1 * 3 + 2];
        }
        else {
            vec3.copy(pos, bone.pos);
        }
        if (track.rot) {
            rot[0] = track.rot[i0 * 4 + 0];
            rot[1] = track.rot[i0 * 4 + 1];
            rot[2] = track.rot[i0 * 4 + 2];
            rot[3] = track.rot[i0 * 4 + 3];
            rot2[0] = track.rot[i1 * 4 + 0];
            rot2[1] = track.rot[i1 * 4 + 1];
            rot2[2] = track.rot[i1 * 4 + 2];
            rot2[3] = track.rot[i1 * 4 + 3];
            quat.slerp(rot, rot, rot2, s);
        }
        else {
            quat.copy(rot, bone.rot);
        }
        if (track.scl) {
            scl[0] = track.scl[i0 * 3 + 0];
            scl[1] = track.scl[i0 * 3 + 1];
            scl[2] = track.scl[i0 * 3 + 2];
        }
        else {
            vec3.copy(scl, bone.scl);
        }
        mat4.fromRotationTranslation(local_matrix, rot, pos);
        mat4.scale(local_matrix, local_matrix, scl);
    }
    for (var i = 0; i < bones.length; ++i) {
        var bone = bones[i];
        var local_matrix = local_matrices[i];
        mat4.copy(world_matrix, local_matrix);
        var parent_bone = bone;
        while (parent_bone.parent != null && parent_bone.parent >= 0) {
            mat4.multiply(world_matrix, local_matrices[parent_bone.parent], world_matrix);
            parent_bone = bones[parent_bone.parent];
        }
        mat4.multiply(bone_matrix, world_matrix, bone.inv_bind_mat);
        for (var j = 0; j < 16; ++j) {
            matrices[i * 16 + j] = bone_matrix[j];
        }
    }
    updateBoneTexture();
}
/// <reference path="../lib/collada.d.ts" />
/// <reference path="external/jquery/jquery.d.ts" />
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
/// <reference path="../lib/collada.d.ts" />
/// <reference path="external/jquery/jquery.d.ts" />
/// <reference path="convert-renderer.ts" />
/// <reference path="convert-options.ts" />
var use_threejs = true;
;
var elements = {};
var timestamps = {};
var options = new COLLADA.Converter.Options();
var optionElements = [];
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
    if (!json) {
        if (use_threejs) {
            clearBuffersThreejs();
        }
        else {
            clearBuffers();
        }
    }
    else {
        if (use_threejs) {
            fillBuffersThreejs(json, data.buffer);
        }
        else {
            fillBuffers(json, data.buffer);
            setupCamera(json);
        }
    }
}
function renderStartRendering() {
    if (use_threejs) {
        tickThreejs(null);
    }
    else {
        tick(null);
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
    loader.log = new COLLADA.LogFilter(loaderlog, 2 /* Info */);
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
    if (use_threejs) {
        initThreejs(canvas);
    }
    else {
        initGL(canvas);
    }
    // Create option elements
    var optionsForm = $("#form-options");
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
    $("#output-custom-binary .output-download").click(function () { return downloadJSON(conversion_data.s4_exported_custom.data, "model.bin"); });
    $("#output-threejs .output-download").click(function () { return downloadJSON(conversion_data.s5_exported_threejs, "model-threejs.json"); });
    // Update all UI elements
    reset();
    writeProgress("Converter initialized");
}
//# sourceMappingURL=convert.js.map