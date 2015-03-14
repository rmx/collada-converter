/// <reference path="context.ts" />
/// <reference path="../converter/bone.ts" />
/// <reference path="../math.ts" />

module COLLADA.Threejs {

    export class Bone {

        static toJSON(skeleton: COLLADA.Converter.Skeleton, bone: COLLADA.Converter.Bone, context: COLLADA.Threejs.Context): any {
            if (skeleton === null || bone === null) {
                return null;
            }

            // Matrices
            var mat = mat4.clone(bone.node.initialLocalMatrix);
            var matWorld = mat4.clone(bone.node.initialWorldMatrix);
            var matBindInv = mat4.clone(bone.invBindMatrix);
            var matBind = mat4.create();
            mat4.invert(matBind, matBindInv);

            if (bone.parent) {
                mat4.multiply(mat, bone.parent.invBindMatrix, matBind);
            } else {
                mat = matBind;
            }

            // Bone default transform
            var pos: number[] = [0, 0, 0];
            var rot: number[] = [0, 0, 0, 1];
            var scl: number[] = [1, 1, 1];
            COLLADA.MathUtils.decompose(mat, pos, rot, scl);

            // Bone inverse bind matrix
            var inv_bind_mat: number[] = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
            COLLADA.MathUtils.copyNumberArray(bone.invBindMatrix, inv_bind_mat, 16);

            // Compose
            return {
                "parent": skeleton.bones.indexOf(bone),
                "name": bone.name,
                "pos": pos.map((x) => COLLADA.MathUtils.round(x, context.pos_tol)),
                "rotq": rot.map((x) => COLLADA.MathUtils.round(x, context.rot_tol)),
                "scl": scl.map((x) => COLLADA.MathUtils.round(x, context.scl_tol)),
                "inv_bind_mat": inv_bind_mat.map((x) => COLLADA.MathUtils.round(x, context.mat_tol))
            };
        }
    };
}