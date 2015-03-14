/// <reference path="bone.ts" />

module COLLADA.Converter {

    export class Skeleton {
        /** All bones */
        bones: Bone[];

        constructor(bones: Bone[]) {
            this.bones = bones;
        }

        /**
        * Checks whether a list contains a bone equivalent to the given bone
        */
        static findBone(bones: Bone[], bone: Bone): Bone {
            for (var i = 0; i < bones.length; ++i) {
                if (Bone.sameBone(bones[i], bone)) {
                    return bones[i];
                }
            }
            return null;
        }

        static indexOf(skeleton: Skeleton, bone: Bone): number {
            bone = Skeleton.findBone(skeleton.bones, bone);
            return skeleton.bones.indexOf(bone);
        }

        static checkConsistency(skeleton: Skeleton, context: Context): void {
            skeleton.bones.forEach((b1, i1) => {
                skeleton.bones.forEach((b2, i2) => {
                    if (i1 !== i2 && Bone.sameBone(b1, b2)) {
                        throw new Error("Duplicate bone");
                    }
                });
            });

            skeleton.bones.forEach((b) => {
                if (b.parent !== null && b.node.parent === null) {
                    throw new Error("Invalid parent");
                }
            });

            skeleton.bones.forEach((b) => {
                if (b.parent !== null && Skeleton.findBone(skeleton.bones, b.parent)===null) {
                    throw new Error("Invalid parent");
                }
            });
        }

        /**
        * Creates a skeleton from a skin
        */
        static createFromSkin(jointSids: string[], skeletonRootNodes: COLLADA.Loader.VisualSceneNode[], bindShapeMatrix: Mat4,
            invBindMatrices: Float32Array, context: COLLADA.Converter.Context): COLLADA.Converter.Skeleton {
            var bones: COLLADA.Converter.Bone[] = [];

            // Add all bones referenced by the skin
            for (var i: number = 0; i < jointSids.length; i++) {
                var jointSid: string = jointSids[i];
                var jointNode: COLLADA.Loader.VisualSceneNode = COLLADA.Converter.Bone.findBoneNode(jointSid, skeletonRootNodes, context);
                if (jointNode === null) {
                    context.log.write("Joint " + jointSid + " not found for skeleton, no bones created", LogLevel.Warning);
                    return new Skeleton([]);
                }
                var converterNode: COLLADA.Converter.Node = context.nodes.findConverter(jointNode);
                if (converterNode === null) {
                    context.log.write("Joint " + jointSid + " not converted for skeleton, no bones created", LogLevel.Warning);
                    return new Skeleton([]);
                }
                var bone: COLLADA.Converter.Bone = COLLADA.Converter.Bone.create(converterNode);
                bone.attachedToSkin = true;

                COLLADA.MathUtils.mat4Extract(invBindMatrices, i, bone.invBindMatrix);
                // Collada skinning equation: boneWeight*boneMatrix*invBindMatrix*bindShapeMatrix*vertexPos
                // (see chapter 4: "Skin Deformation (or Skinning) in COLLADA")
                // Here we could pre-multiply the inverse bind matrix and the bind shape matrix
                // We do not pre-multiply the bind shape matrix, because the same bone could be bound to
                // different meshes using different bind shape matrices and we would have to duplicate the bones
                // mat4.multiply(bone.invBindMatrix, bone.invBindMatrix, bindShapeMatrix);
                bones.push(bone);
            }

            var result = new Skeleton(bones);

            // Add all missing bones of the skeleton
            result = COLLADA.Converter.Skeleton.addBoneParents(result, context);

            Skeleton.checkConsistency(result, context);
            return result;
        }

        /**
        * Creates a skeleton from a node
        */
        static createFromNode(node: COLLADA.Converter.Node, context: COLLADA.Converter.Context): COLLADA.Converter.Skeleton {
            // Create a single node
            var colladaNode: COLLADA.Loader.VisualSceneNode = context.nodes.findCollada(node);
            var bone: COLLADA.Converter.Bone = COLLADA.Converter.Bone.create(node);
            mat4.identity(bone.invBindMatrix);
            bone.attachedToSkin = true;

            var result = new Skeleton([bone]);

            // Add all parent bones of the skeleton
            result = COLLADA.Converter.Skeleton.addBoneParents(result, context);

            Skeleton.checkConsistency(result, context);
            return result;
        }

        /**
        * Merges the two skeletons
        */
        static mergeSkeletons(skeleton1: Skeleton, skeleton2: Skeleton, context: Context): Skeleton {
            var bones: Bone[] = [];
            var skinBones: Bone[] = [];

            // Add all bones from skeleton1
            skeleton1.bones.forEach((b) => {
                bones.push(b.clone());
            });

            // Add all bones from skeleton2 (if not already present)
            skeleton2.bones.forEach((b) => {
                var bone = Skeleton.findBone(bones, b);
                if (bone === null) {
                    bones.push(b.clone());
                } else {
                    bone.attachedToSkin = bone.attachedToSkin || b.attachedToSkin;
                }
            });

            // Fix all parents
            bones.forEach((b) => {
                if (b.parent !== null) {
                    b.parent = Skeleton.findBone(bones, b.parent);
                }
            });

            var result = new Skeleton(bones);

            Skeleton.checkConsistency(result, context);
            return result;
        }

        /**
        * Assembles a list of skeleton root nodes
        */
        static getSkeletonRootNodes(skeletonLinks: COLLADA.Loader.Link[], context: COLLADA.Converter.Context): COLLADA.Loader.VisualSceneNode[] {
            var skeletonRootNodes: COLLADA.Loader.VisualSceneNode[] = [];
            for (var i: number = 0; i < skeletonLinks.length; i++) {
                var skeletonLink: COLLADA.Loader.Link = skeletonLinks[i];
                var skeletonRootNode: COLLADA.Loader.VisualSceneNode = COLLADA.Loader.VisualSceneNode.fromLink(skeletonLink, context);
                if (skeletonRootNode === null) {
                    context.log.write("Skeleton root node " + skeletonLink.getUrl() + " not found, skeleton root ignored", LogLevel.Warning);
                    continue;
                }
                skeletonRootNodes.push(skeletonRootNode);
            }

            if (skeletonRootNodes.length === 0) {
                context.log.write("Controller has no skeleton, using the whole scene as the skeleton root", LogLevel.Warning);
                skeletonRootNodes = context.nodes.collada.filter((node: COLLADA.Loader.VisualSceneNode) => (context.isInstanceOf(node.parent, "VisualScene")));
            }

            return skeletonRootNodes;
        }

        /**
        * Find the parent for each bone
        * The skeleton(s) may contain more bones than referenced by the skin
        * This function also adds all bones that are not referenced but used for the skeleton transformation
        */
        static addBoneParents(skeleton: COLLADA.Converter.Skeleton, context: COLLADA.Converter.Context): COLLADA.Converter.Skeleton {
            var bones = skeleton.bones.slice(0);

            var i: number = 0;
            // The bones array will grow during traversal, therefore the while loop
            while (i < bones.length) {
                // Select the next unprocessed bone
                var bone: COLLADA.Converter.Bone = bones[i];
                ++i;

                // Find a bone that corresponds to this bone's node parent
                for (var k: number = 0; k < bones.length; k++) {
                    var parentBone: COLLADA.Converter.Bone = bones[k];
                    if (bone.node.parent === parentBone.node) {
                        bone.parent = parentBone;
                        break;
                    }
                }

                // If no parent bone found, add it to the list
                if ((bone.node.parent != null) && (bone.parent == null)) {
                    bone.parent = COLLADA.Converter.Bone.create(bone.node.parent);
                    bones.push(bone.parent);
                }
            }

            var result = new Skeleton(bones);

            Skeleton.checkConsistency(result, context);
            return result;
        }

        /**
        * Given two arrays a and b, such that each bone from a is contained in b,
        * compute a map that maps the old index (a) of each bone to the new index (b).
        */
        static getBoneIndexMap(a: COLLADA.Converter.Skeleton, b: COLLADA.Converter.Skeleton): Uint32Array {
            var result: Uint32Array = new Uint32Array(a.bones.length);
            for (var i: number = 0; i < a.bones.length; ++i) {
                var bone_a: COLLADA.Converter.Bone = a.bones[i];

                // Find the index of the current bone in b
                var new_index: number = -1;
                for (var j: number = 0; j < b.bones.length; ++j) {
                    var bone_b: COLLADA.Converter.Bone = b.bones[j];
                    if (COLLADA.Converter.Bone.sameBone(bone_a, bone_b)) {
                        new_index = j;
                        break;
                    }
                }

                if (new_index < 0) {
                    var a_name: string = bone_a.name;
                    var b_names: string[] = b.bones.map((b: COLLADA.Converter.Bone) => b.name);
                    throw new Error("Bone " + a_name + " not found in " + b_names);
                }
                result[i] = new_index;
            }
            return result;
        }


        /**
        * Sorts bones so that child bones appear after their parents in the list.
        */
        static sortBones(skeleton: COLLADA.Converter.Skeleton, context: Context): COLLADA.Converter.Skeleton {
            var bones = skeleton.bones.slice(0);

            bones = bones.sort((a, b) => {
                // First, sort by depth
                var ad = a.depth();
                var bd = b.depth();
                if (ad !== bd) {
                    return ad - bd;
                }

                // Next, sort by previous position of parent
                if (a.parent !== b.parent && a.parent !== null) {
                    var ai = skeleton.bones.indexOf(a.parent);
                    var bi = skeleton.bones.indexOf(b.parent);
                    return ai - bi;
                }

                // Finally, sort by previous position of the bone
                var ai = skeleton.bones.indexOf(a);
                var bi = skeleton.bones.indexOf(b);
                return ai - bi;
            });

            if (bones.length != skeleton.bones.length || Skeleton.bonesSorted(bones) == false) {
                throw new Error("Error while sorting bones");
            }

            var result = new Skeleton(bones);

            Skeleton.checkConsistency(result, context);
            return result;
        }


        /**
        * Returns true if the bones are sorted so that child bones appear after their parents in the list.
        */
        static bonesSorted(bones: COLLADA.Converter.Bone[]): boolean {
            var errors: number = 0;
            bones.forEach((bone) => {
                if (bone.parent !== null) {
                    var boneIndex = bones.indexOf(bone);
                    var parentIndex = bones.indexOf(bone.parent);
                    if (boneIndex < parentIndex) {
                        ++errors;
                    }
                }
            });
            return errors === 0;
        }
    }

}