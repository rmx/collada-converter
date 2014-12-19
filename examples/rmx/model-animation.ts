/// <reference path="./stream-math.ts" />
/// <reference path="./model.ts" />

module rmx {

    /**
    * Stores the transformation of all skeleton bones (in decomposed pos/rot/scl form).
    */
    export class Pose {
        pos: Float32Array;
        rot: Float32Array;
        scl: Float32Array;

        constructor(skeleton: Skeleton) {
            this.pos = new Float32Array(skeleton.bones.length * 3);
            this.rot = new Float32Array(skeleton.bones.length * 4);
            this.scl = new Float32Array(skeleton.bones.length * 3);
        }
    }

    /**
    * A stack of poses.
    * Use if you need temporary poses, e.g., in a complex pose blending setup.
    */
    export class PoseStack {
        private poses: Pose[];
        private pointer: number;
        private skeleton: Skeleton;

        constructor(skeleton: Skeleton) {
            this.poses = [];
            this.skeleton = skeleton;
            this.reset();
        }

        reset(): void {
            this.pointer = 0;
        }

        push(): Pose {
            while (this.poses.length <= this.pointer) {
                this.poses.push(new Pose(this.skeleton));
            }

            var result = this.poses[this.pointer];
            this.pointer++;
            return result;
        }

        pop(): void {
            this.pointer--;
        }
    }

    /**
    * Stores the transformation of all skeleton bones (in composed matrix form)
    */
    export class SkeletonMatrices {
        world_matrices: Float32Array;
        skin_matrices: Float32Array;

        constructor(texture: BoneMatrixTexture) {
            this.world_matrices = new Float32Array(texture.capacity() * 16);
            this.skin_matrices = new Float32Array(texture.capacity() * 16);
        }
    }

    /**
    * Stores the bone matrices in a WebGL texture.
    */
    export class BoneMatrixTexture {
        size: number;
        texture: WebGLTexture;

        /**
        * Number of bones a texture of the given width can store.
        */
        static capacity(size: number): number {
            var texels = size * size;
            var texels_per_matrix = 4;
            return texels / texels_per_matrix;
        }

        /**
        * Number of bones this texture can store.
        */
        capacity(): number {
            return BoneMatrixTexture.capacity(this.size);
        }

        /**
        * The smallest texture size that can hold the given number of bones.
        */
        static optimalSize(bones: number): number {
            var result = 2;
            while (BoneMatrixTexture.capacity(result) < bones) {
                result = result * 2;

                // A 2K x 2K texture can hold 1 million bones.
                // It is unlikely a skinned mesh will use more than that.
                if (result > 2048) throw new Error("Too many bones");
            }

            return result;
        }

        constructor(skeleton: Skeleton) {
            this.size = BoneMatrixTexture.optimalSize(skeleton.bones.length);
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

        update(data: SkeletonMatrices, gl: WebGLRenderingContext) {
            if (this.texture == null) {
                this.init(gl);
            }

            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            // Apparently texImage can be faster than texSubImage (?!?)
            // gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.size, this.size, gl.RGBA, gl.FLOAT, data.skin_matrices);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.size, this.size, 0, gl.RGBA, gl.FLOAT, data.skin_matrices);
        }
    }

    /** 
    * Exports all bone matrices (world matrix * inverse bind matrix) of a pose to a flat number array
    */
    export function exportPose(skeleton: Skeleton, pose: Pose, dest: SkeletonMatrices) {
        var world_matrices = dest.world_matrices;
        var skin_matrices = dest.skin_matrices;
        var pos: Float32Array = pose.pos;
        var rot: Float32Array = pose.rot;
        var scl: Float32Array = pose.scl;

        // Loop over all bones
        var bones: Bone[] = skeleton.bones;
        var bone_length: number = bones.length;
        for (var b: number = 0; b < bone_length; ++b) {
            var bone: Bone = bones[b];
            var inv_bind_mat: Float32Array = bone.inv_bind_mat;
            var parent: number = bone.parent;

            // Local matrix - local translation/rotation/scale composed into a matrix
            mat_stream_compose(world_matrices, b * 16, pos, b * 3, rot, b * 4, scl, b * 3);

            // World matrix
            if (parent >= 0) {
                mat4_stream_multiply(world_matrices, b * 16, world_matrices, parent * 16, world_matrices, b * 16);
            }

            // Bone matrix
            mat4_stream_multiply(skin_matrices, b * 16, world_matrices, b * 16, inv_bind_mat, 0);
        }
    }

    /** 
    * Reset the pose to the bind pose of the skeleton
    */
    export function resetPose(skeleton: Skeleton, pose: Pose) {
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
    export function blendPose(pose_a: Pose, pose_b: Pose, t: number, result: Pose) {
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
    export function sampleAnimation(animation: Animation, skeleton: Skeleton, pose: Pose, frame: number) {

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