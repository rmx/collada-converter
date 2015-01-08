
module rmx {

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

}