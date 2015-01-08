/// <reference path="../math/stream-math.ts" />
/// <reference path="../model/skeleton.ts" />
/// <reference path="./pose.ts" />
/// <reference path="./skeleton-matrices.ts" />

module rmx {

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