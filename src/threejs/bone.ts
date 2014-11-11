/// <reference path="context.ts" />
/// <reference path="../converter/bone.ts" />
/// <reference path="../math.ts" />

module COLLADA.Threejs {

    export class Bone {

        static toJSON(bone: COLLADA.Converter.Bone, context: COLLADA.Threejs.Context): any {
            if (bone === null) {
                return null;
            }

            // TODO: options for this
            var mat_tol: number = 5;
            var pos_tol: number = 4;
            var scl_tol: number = 3;
            var rot_tol: number = 4;

            // Bone default transform
            var mat: Mat4 = bone.node.getLocalMatrix();
            var pos: number[] = [0, 0, 0];
            var rot: number[] = [0, 0, 0, 1];
            var scl: number[] = [1, 1, 1];
            COLLADA.MathUtils.decompose(mat, pos, rot, scl);

            // Bone inverse bind matrix
            var inv_bind_mat: number[] = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
            COLLADA.MathUtils.copyNumberArray(bone.invBindMatrix, inv_bind_mat, 16);

            // Compose
            return {
                "parent": bone.parentIndex(),
                "name": bone.name,
                "pos": pos.map((x) => COLLADA.MathUtils.round(x, pos_tol)),
                "rotq": rot.map((x) => COLLADA.MathUtils.round(x, rot_tol)),
                "scl": scl.map((x) => COLLADA.MathUtils.round(x, scl_tol)),
                "inv_bind_mat": inv_bind_mat.map((x) => COLLADA.MathUtils.round(x, mat_tol))
            };
        }
    };
}