/// <reference path="context.ts" />
/// <reference path="format.ts" />
/// <reference path="../math.ts" />

module COLLADA.Exporter {

    export class Skeleton {

        static toJSON(skeleton: COLLADA.Converter.Skeleton, context: COLLADA.Exporter.Context): COLLADA.Exporter.BoneJSON[] {
            if (skeleton === null) {
                return null;
            }

            // TODO: options for this
            var mat_tol: number = 6;
            var pos_tol: number = 6;
            var scl_tol: number = 3;
            var rot_tol: number = 6;

            var result: COLLADA.Exporter.BoneJSON[] = [];
            skeleton.bones.forEach((bone) => {

                // Bone default transform
                var mat: Mat4 = bone.node.initialLocalMatrix;
                var pos: number[] = [0, 0, 0];
                var rot: number[] = [0, 0, 0, 1];
                var scl: number[] = [1, 1, 1];
                COLLADA.MathUtils.decompose(mat, pos, rot, scl);

                // Bone inverse bind matrix
                var inv_bind_mat: number[] = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
                COLLADA.MathUtils.copyNumberArray(bone.invBindMatrix, inv_bind_mat, 16);

                result.push({
                    name: bone.name,
                    parent: skeleton.bones.indexOf(bone.parent),
                    skinned: bone.attachedToSkin,
                    inv_bind_mat: inv_bind_mat.map((x) => COLLADA.MathUtils.round(x, mat_tol)),
                    pos: pos.map((x) => COLLADA.MathUtils.round(x, pos_tol)),
                    rot: rot.map((x) => COLLADA.MathUtils.round(x, rot_tol)),
                    scl: scl.map((x) => COLLADA.MathUtils.round(x, scl_tol))
                });
            });

            return result;
        }
    }
}