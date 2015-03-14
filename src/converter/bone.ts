/// <reference path="../math.ts" />
/// <reference path="context.ts" />
/// <reference path="utils.ts" />
/// <reference path="node.ts" />

module COLLADA.Converter {

    export class Bone {
        node: COLLADA.Converter.Node;
        name: string;
        parent: COLLADA.Converter.Bone;
        invBindMatrix: Mat4;
        attachedToSkin: boolean;

        constructor(node: COLLADA.Converter.Node) {
            this.node = node;
            this.name = node.name;
            this.parent = null;
            this.invBindMatrix = mat4.create();
            this.attachedToSkin = false;
        }

        clone(): Bone {
            var result = new Bone(this.node);
            result.name = this.name;
            result.parent = this.parent;
            result.invBindMatrix = mat4.clone(this.invBindMatrix);
            result.attachedToSkin = this.attachedToSkin;
            return result;
        }

        depth(): number {
            return this.parent === null ? 0 : (this.parent.depth() + 1);
        }

        static create(node: COLLADA.Converter.Node): COLLADA.Converter.Bone {
            return new COLLADA.Converter.Bone(node);
        }

        /**
        * Finds the visual scene node that is referenced by the joint SID.
        * The skin element contains the skeleton root nodes.
        */
        static findBoneNode(boneSid: string, skeletonRootNodes: COLLADA.Loader.VisualSceneNode[], context: COLLADA.Converter.Context): COLLADA.Loader.VisualSceneNode {
            // The spec is inconsistent here.
            // The joint ids do not seem to be real scoped identifiers(chapter 3.3, "COLLADA Target Addressing"), since they lack the first part (the anchor id)
            // The skin element(chapter 5, "skin" element) *implies* that the joint ids are scoped identifiers relative to the skeleton root node,
            // so perform a SID-like breadth-first search.
            var boneNode: COLLADA.Loader.Element = null;
            var warnings: string[] = [];
            for (var i: number = 0; i < skeletonRootNodes.length; i++) {
                var skeletonRoot: COLLADA.Loader.VisualSceneNode = skeletonRootNodes[i];
                var sids: string[] = boneSid.split("/");
                var result = COLLADA.Loader.SidLink.findSidTarget(boneSid, skeletonRoot, sids, context);
                if (result.result != null) {
                    boneNode = result.result;
                    break;
                } else {
                    warnings.push(result.warning);
                }
            }
            if (boneNode === null) {
                context.log.write("Joint with SID " + boneSid + " not found, joint ignored. Related warnings:\n" + warnings.join("\n"), LogLevel.Warning);
                return null;
            } else if (context.isInstanceOf(boneNode, "VisualSceneNode")) {
                return <COLLADA.Loader.VisualSceneNode> boneNode;
            } else {
                context.log.write("Joint " + boneSid + " does not point to a visual scene node, joint ignored", LogLevel.Warning);
                return null;
            }
        }

        /**
        * Returns true if the two bones can safely be merged, i.e.,
        * they reference the same scene graph node and have the same inverse bind matrix
        */
        static sameBone(a: COLLADA.Converter.Bone, b: COLLADA.Converter.Bone): boolean {
            if (a === b) {
                return true;
            }
            if (a.node !== b.node) {
                return false;
            }
            for (var i = 0; i < 16; ++i) {
                var ai = a.invBindMatrix[i];
                var bi = b.invBindMatrix[i];
                if (Math.abs(ai - bi) > 1e-5) {
                    return false;
                }
            }
            return true;
        }

    }
}