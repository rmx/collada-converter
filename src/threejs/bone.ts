/// <reference path="context.ts" />
/// <reference path="../converter/bone.ts" />
/// <reference path="../math.ts" />

module COLLADA.Threejs {

    function threejsWorldMatrix(bone: COLLADA.Converter.Bone): Mat4 {
        if (bone === null) {
            var result = mat4.create();
            mat4.identity(result);
            return result;
        }

        var parentWorld = threejsWorldMatrix(bone.parent);

        var local = threejsLocalMatrix(bone);

        var result = mat4.create();
        mat4.multiply(result, parentWorld, local);
        return result;
    }

    function threejsLocalMatrix(bone: COLLADA.Converter.Bone): Mat4 {
        if (bone === null) {
            var result = mat4.create();
            mat4.identity(result);
            return result;
        }

        // The actual inverse bind matrix
        var actualInvBind = mat4.clone(bone.invBindMatrix);

        // Three.js computes the inverse bind matrix as the inverse of the world matrix
        // Compute the corresponding target world matrix
        var targetWorld = mat4.create();
        mat4.invert(targetWorld, actualInvBind);

        // The world matrix of the parent node
        var parentWorld = threejsWorldMatrix(bone.parent);

        // world = parentWorld * local
        // local = parentWorld^-1 * world
        var parentWorldInverse = mat4.create();
        mat4.invert(parentWorldInverse, parentWorld);

        var result = mat4.create();
        mat4.multiply(result, parentWorldInverse, targetWorld);
        return result;
    }

    function matToArray(mat: Mat4): number[] {
        var result: number[] = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        COLLADA.MathUtils.copyNumberArray(mat, result, 16);
        return result;
    };

    export class Bone {

        static toJSON(skeleton: COLLADA.Converter.Skeleton, bone: COLLADA.Converter.Bone, context: COLLADA.Threejs.Context): any {
            if (skeleton === null || bone === null) {
                return null;
            }

            // Bone default transform
            // This is used by tree.js to compute the inverse bind matrix,
            // so we compute the transform accordingly
            var localMatrix = threejsLocalMatrix(bone);
            var pos: number[] = [0, 0, 0];
            var rot: number[] = [0, 0, 0, 1];
            var scl: number[] = [1, 1, 1];
            COLLADA.MathUtils.decompose(localMatrix, pos, rot, scl);

            // Compose
            return {
                "parent": skeleton.bones.indexOf(bone.parent),
                "name": bone.name,
                "pos": pos.map((x) => COLLADA.MathUtils.round(x, context.pos_tol)),
                "rotq": rot.map((x) => COLLADA.MathUtils.round(x, context.rot_tol)),
                "scl": scl.map((x) => COLLADA.MathUtils.round(x, context.scl_tol)),
                "inv_bind_mat": matToArray(bone.invBindMatrix).map((x) => COLLADA.MathUtils.round(x, context.mat_tol)),
            };
        }
    };
}