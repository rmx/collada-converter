/// <reference path="context.ts" />
/// <reference path="utils.ts" />
/// <reference path="material.ts" />
/// <reference path="bone.ts" />
/// <reference path="geometry_chunk.ts" />
/// <reference path="bounding_box.ts" />
/// <reference path="../external/gl-matrix.i.ts" />
/// <reference path="../math.ts" />

module COLLADA.Converter {

    export class Geometry {
        name: string;
        chunks: COLLADA.Converter.GeometryChunk[];
        bones: COLLADA.Converter.Bone[];
        boundingBox: BoundingBox;

        constructor() {
            this.name = "";
            this.chunks = [];
            this.bones = [];
            this.boundingBox = new BoundingBox();
        }

        /**
        * Creates a static (non-animated) geometry
        */
        static createStatic(instanceGeometry: COLLADA.Loader.InstanceGeometry, context: COLLADA.Converter.Context): COLLADA.Converter.Geometry {
            var geometry: COLLADA.Loader.Geometry = COLLADA.Loader.Geometry.fromLink(instanceGeometry.geometry, context);
            if (geometry === null) {
                context.log.write("Geometry instance has no geometry, mesh ignored", LogLevel.Warning);
                return null;
            }

            return COLLADA.Converter.Geometry.createGeometry(geometry, instanceGeometry.materials, context);
        }

        /**
        * Creates an animated (skin or morph) geometry
        */
        static createAnimated(instanceController: COLLADA.Loader.InstanceController, context: COLLADA.Converter.Context): COLLADA.Converter.Geometry {
            var controller: COLLADA.Loader.Controller = COLLADA.Loader.Controller.fromLink(instanceController.controller, context);
            if (controller === null) {
                context.log.write("Controller instance has no controller, mesh ignored", LogLevel.Warning);
                return null;
            }

            if (controller.skin !== null) {
                return COLLADA.Converter.Geometry.createSkin(instanceController, controller, context);
            } else if (controller.morph !== null) {
                return COLLADA.Converter.Geometry.createMorph(instanceController, controller, context);
            }

            return null;
        }

        /**
        * Creates a skin-animated geometry
        */
        static createSkin(instanceController: COLLADA.Loader.InstanceController, controller: COLLADA.Loader.Controller, context: COLLADA.Converter.Context): COLLADA.Converter.Geometry {
            // Controller element
            var controller: COLLADA.Loader.Controller = COLLADA.Loader.Controller.fromLink(instanceController.controller, context);
            if (controller === null) {
                context.log.write("Controller instance has no controller, mesh ignored", LogLevel.Error);
                return null;
            }

            // Skin element
            var skin: COLLADA.Loader.Skin = controller.skin;
            if (skin === null) {
                context.log.write("Controller has no skin, mesh ignored", LogLevel.Error);
                return null;
            }

            // Geometry element
            var loaderGeometry: COLLADA.Loader.Geometry = COLLADA.Loader.Geometry.fromLink(skin.source, context);
            if (loaderGeometry === null) {
                context.log.write("Controller has no geometry, mesh ignored", LogLevel.Error);
                return null;
            }

            // Create skin geometry
            var geometry: COLLADA.Converter.Geometry = COLLADA.Converter.Geometry.createGeometry(loaderGeometry, instanceController.materials, context);

            // Skeleton root nodes
            var skeletonLinks: COLLADA.Loader.Link[] = instanceController.skeletons;
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
                skeletonRootNodes = context.nodes.collada.filter((node: COLLADA.Loader.VisualSceneNode) => (node.parent instanceof COLLADA.Loader.VisualScene));
            }
            if (skeletonRootNodes.length === 0) {
                context.log.write("Controller still has no skeleton, using unskinned geometry", LogLevel.Warning);
                return geometry;
            }

            // Joints
            var jointsElement: COLLADA.Loader.Joints = skin.joints;
            if (jointsElement === null) {
                context.log.write("Skin has no joints element, using unskinned mesh", LogLevel.Warning);
                return geometry;
            }
            var jointsInput: COLLADA.Loader.Input = jointsElement.joints;
            if (jointsInput === null) {
                context.log.write("Skin has no joints input, using unskinned mesh", LogLevel.Warning);
                return geometry;
            }
            var jointsSource: COLLADA.Loader.Source = COLLADA.Loader.Source.fromLink(jointsInput.source, context);
            if (jointsSource === null) {
                context.log.write("Skin has no joints source, using unskinned mesh", LogLevel.Warning);
                return geometry;
            }
            var jointSids: string[] = <string[]>jointsSource.data;

            // Bind shape matrix
            var bindShapeMatrix: Mat4 = null;
            if (skin.bindShapeMatrix !== null) {
                bindShapeMatrix = mat4.create();
                COLLADA.MathUtils.mat4Extract(skin.bindShapeMatrix, 0, bindShapeMatrix);
            }

            // InvBindMatrices
            var invBindMatricesInput: COLLADA.Loader.Input = jointsElement.invBindMatrices;
            if (invBindMatricesInput === null) {
                context.log.write("Skin has no inverse bind matrix input, using unskinned mesh", LogLevel.Warning);
                return geometry;
            }
            var invBindMatricesSource: COLLADA.Loader.Source = COLLADA.Loader.Source.fromLink(invBindMatricesInput.source, context);
            if (jointsSource === null) {
                context.log.write("Skin has no inverse bind matrix source, using unskinned mesh", LogLevel.Warning);
                return geometry;
            }
            if (invBindMatricesSource.data.length !== jointsSource.data.length * 16) {
                context.log.write("Skin has an inconsistent length of joint data sources, using unskinned mesh", LogLevel.Warning);
                return geometry;
            }
            if (!(invBindMatricesSource.data instanceof Float32Array)) {
                context.log.write("Skin inverse bind matrices data does not contain floating point data, using unskinned mesh", LogLevel.Warning);
                return geometry;
            }
            var invBindMatrices: Float32Array = <Float32Array> invBindMatricesSource.data;

            // Vertex weights
            var weightsElement: COLLADA.Loader.VertexWeights = skin.vertexWeights;
            if (weightsElement === null) {
                context.log.write("Skin contains no bone weights element, using unskinned mesh", LogLevel.Warning);
                return geometry;
            }
            var weightsInput = weightsElement.weights;
            if (weightsInput === null) {
                context.log.write("Skin contains no bone weights input, using unskinned mesh", LogLevel.Warning);
                return geometry;
            }
            var weightsSource: COLLADA.Loader.Source = COLLADA.Loader.Source.fromLink(weightsInput.source, context);
            if (weightsSource === null) {
                context.log.write("Skin has no bone weights source, using unskinned mesh", LogLevel.Warning);
                return geometry;
            }
            if (!(weightsSource.data instanceof Float32Array)) {
                context.log.write("Bone weights data does not contain floating point data, using unskinned mesh", LogLevel.Warning);
                return geometry;
            }
            var weightsData: Float32Array = <Float32Array> weightsSource.data;

            // Indices
            if (skin.vertexWeights.joints.source.url !== skin.joints.joints.source.url) {
                // Holy crap, how many indirections does this stupid format have?!?
                // If the data sources differ, we would have to reorder the elements of the "bones" array.
                context.log.write("Skin uses different data sources for joints in <joints> and <vertex_weights>, this is not supported. Using unskinned mesh.", LogLevel.Warning);
                return geometry;
            }

            // Bones
            var bones: COLLADA.Converter.Bone[] = COLLADA.Converter.Bone.createSkinBones(jointSids, skeletonRootNodes, bindShapeMatrix, invBindMatrices, context);
            if (bones === null || bones.length === 0) {
                context.log.write("Skin contains no bones, using unskinned mesh", LogLevel.Warning);
                return geometry;
            }

            // Compact skinning data
            var bonesPerVertex: number = 4;
            var weightsIndices: Int32Array = skin.vertexWeights.v;
            var weightsCounts: Int32Array = skin.vertexWeights.vcount;
            var skinVertexCount: number = weightsCounts.length;
            var skinWeights: Float32Array = new Float32Array(skinVertexCount * bonesPerVertex);
            var skinIndices: Float32Array = new Uint8Array(skinVertexCount * bonesPerVertex);

            var vindex: number = 0;
            var verticesWithTooManyInfluences: number = 0;
            var verticesWithInvalidTotalWeight: number = 0;
            for (var i = 0; i < skinVertexCount; ++i) {

                // Extract weights and indices
                var weightCount: number = weightsCounts[i];
                var totalWeight: number = 0;
                for (var w: number = 0; w < weightCount; ++w) {
                    var boneIndex: number = weightsIndices[vindex];
                    var boneWeightIndex: number = weightsIndices[vindex + 1];
                    vindex += 2;
                    var boneWeight: number = weightsData[boneWeightIndex];

                    if (w < bonesPerVertex) {
                        totalWeight += boneWeight;
                        skinIndices[i * bonesPerVertex + w] = boneIndex;
                        skinWeights[i * bonesPerVertex + w] = boneWeight;
                    } else {
                        // TODO: replace one of the existing elements if necessary
                    }
                }
                if (weightCount > bonesPerVertex) {
                    verticesWithTooManyInfluences++;
                }

                // Normalize weights (COLLADA weights should be already normalized)
                if (totalWeight < 1e-6 || totalWeight > 1e6) {
                    verticesWithInvalidTotalWeight++;
                } else {
                    for (var w: number = 0; w < weightCount; ++w) {
                        skinWeights[i * bonesPerVertex + w] /= totalWeight;
                    }
                }
            }

            if (verticesWithTooManyInfluences > 0) {
                context.log.write("" + verticesWithTooManyInfluences + " vertices are influenced by too many bones, some influences were ignored. Only " + bonesPerVertex + " bones per vertex are supported.", LogLevel.Warning);
            }
            if (verticesWithInvalidTotalWeight > 0) {
                context.log.write("" + verticesWithInvalidTotalWeight + " vertices have zero or infinite total weight, skin will be broken.", LogLevel.Warning);
            }

            // Distribute skin data to chunks
            for (var i = 0; i < geometry.chunks.length; ++i) {
                var chunk: GeometryChunk = geometry.chunks[i];
                var chunkData: GeometryData = chunk.data;
                var chunkSrcIndices: GeometryChunkSourceIndices = chunk._colladaIndices;

                // Distribute indices to chunks
                chunkData.boneindex = new Uint8Array(chunk.vertexCount * bonesPerVertex);
                COLLADA.Converter.Utils.reIndex(skinIndices, chunkSrcIndices.indices, chunkSrcIndices.indexStride, chunkSrcIndices.indexOffset,
                    bonesPerVertex, chunkData.boneindex, chunkData.indices, 1, 0, bonesPerVertex);

                // Distribute weights to chunks
                chunkData.boneweight = new Float32Array(chunk.vertexCount * bonesPerVertex);
                COLLADA.Converter.Utils.reIndex(skinWeights, chunkSrcIndices.indices, chunkSrcIndices.indexStride, chunkSrcIndices.indexOffset,
                    bonesPerVertex, chunkData.boneweight, chunkData.indices, 1, 0, bonesPerVertex);
            }

            // Copy bind shape matrices
            for (var i = 0; i < geometry.chunks.length; ++i) {
                var chunk: COLLADA.Converter.GeometryChunk = geometry.chunks[i];
                chunk.bindShapeMatrix = mat4.clone(bindShapeMatrix);
            }

            // Apply bind shape matrices
            if (context.options.applyBindShape.value === true) {
                Geometry.applyBindShapeMatrices(geometry, context);
            }

            geometry.bones = bones;
            return geometry;
        }

        static createMorph(instanceController: COLLADA.Loader.InstanceController, controller: COLLADA.Loader.Controller, context: COLLADA.Converter.Context): COLLADA.Converter.Geometry {
            context.log.write("Morph animated meshes not supported, mesh ignored", LogLevel.Warning);
            return null;
        }

        static createGeometry(geometry: COLLADA.Loader.Geometry, instanceMaterials: COLLADA.Loader.InstanceMaterial[], context: COLLADA.Converter.Context): COLLADA.Converter.Geometry {
            var materialMap: COLLADA.Converter.MaterialMap = COLLADA.Converter.Material.getMaterialMap(instanceMaterials, context);

            var result: COLLADA.Converter.Geometry = new COLLADA.Converter.Geometry();
            result.name = geometry.name || geometry.id || geometry.sid || "geometry";

            // Loop over all <triangle> elements
            var trianglesList: COLLADA.Loader.Triangles[] = geometry.triangles;
            for (var i: number = 0; i < trianglesList.length; i++) {
                var triangles = trianglesList[i];

                // Find the used material
                var material: COLLADA.Converter.Material;
                if (triangles.material !== null) {
                    material = materialMap.symbols[triangles.material];
                    if (material === null) {
                        context.log.write("Material symbol " + triangles.material + " has no bound material instance, using default material", LogLevel.Warning);
                        material = COLLADA.Converter.Material.createDefaultMaterial(context);
                    }
                } else {
                    context.log.write("Missing material index, using default material", LogLevel.Warning);
                    material = COLLADA.Converter.Material.createDefaultMaterial(context);
                }

                // Create a geometry chunk
                var chunk: COLLADA.Converter.GeometryChunk = COLLADA.Converter.GeometryChunk.createChunk(geometry, triangles, context);
                if (chunk !== null) {
                    chunk.name = result.name;
                    if (trianglesList.length > 1) {
                        chunk.name += (" #" + i)
                    }
                    chunk.material = material;
                    result.chunks.push(chunk);
                }
            }

            return result;
        }

        /**
        * Transforms the given geometry (position and normals) by the given matrix
        */
        static transformGeometry(geometry: COLLADA.Converter.Geometry, transformMatrix: Mat4, context: COLLADA.Converter.Context) {
            // Create the normal transformation matrix
            var normalMatrix: Mat3 = mat3.create();
            mat3.normalFromMat4(normalMatrix, transformMatrix);

            // Transform normals and positions of all chunks
            for (var i = 0; i < geometry.chunks.length; ++i) {
                var chunk: COLLADA.Converter.GeometryChunk = geometry.chunks[i];

                GeometryChunk.transformChunk(chunk, transformMatrix, normalMatrix, context);
            }
        }

        /**
        * Applies the bind shape matrix to the given geometry.
        *
        * This transforms the geometry by the bind shape matrix, and resets the bind shape matrix to identity.
        */
        static applyBindShapeMatrices(geometry: COLLADA.Converter.Geometry, context: COLLADA.Converter.Context) {

            // Transform normals and positions of all chunks by the corresponding bind shape matrix
            for (var i = 0; i < geometry.chunks.length; ++i) {
                var chunk: COLLADA.Converter.GeometryChunk = geometry.chunks[i];

                var bindShapeMatrix: Mat4 = chunk.bindShapeMatrix;
                if (bindShapeMatrix) {
                    var normalMatrix: Mat3 = mat3.create();
                    mat3.normalFromMat4(normalMatrix, bindShapeMatrix);

                    // Pre-multiply geometry data by the bind shape matrix
                    GeometryChunk.transformChunk(chunk, bindShapeMatrix, normalMatrix, context);

                    // Reset the bind shape matrix
                    mat4.identity(chunk.bindShapeMatrix);
                }
            }
        }

        /**
        * Computes the bounding box of the static (unskinned) geometry
        */
        static computeBoundingBox(geometry: COLLADA.Converter.Geometry, context: COLLADA.Converter.Context) {
            geometry.boundingBox.reset();

            for (var i: number = 0; i < geometry.chunks.length; ++i) {
                var chunk: GeometryChunk = geometry.chunks[i];
                GeometryChunk.computeBoundingBox(chunk, context);
                geometry.boundingBox.extendBox(chunk.boundingBox);
            }
        }

        static addSkeleton(geometry: COLLADA.Converter.Geometry, node: COLLADA.Converter.Node, context: COLLADA.Converter.Context) {
            // Create a single bone
            var colladaNode: COLLADA.Loader.VisualSceneNode = context.nodes.findCollada(node);
            var bone: COLLADA.Converter.Bone = COLLADA.Converter.Bone.create(node);
            mat4.identity(bone.invBindMatrix);
            geometry.bones.push(bone);

            COLLADA.Converter.Bone.updateIndices(geometry.bones);

            // Attach all geometry to the bone
            for (var i = 0; i < geometry.chunks.length; ++i) {
                var chunk: COLLADA.Converter.GeometryChunk = geometry.chunks[i];
                var chunkData: GeometryData = chunk.data;

                chunkData.boneindex = new Uint8Array(chunk.vertexCount * 4);
                chunkData.boneweight = new Float32Array(chunk.vertexCount * 4);
                for (var v = 0; v < chunk.vertexCount; ++v) {
                    chunkData.boneindex[4 * v + 0] = 0;
                    chunkData.boneindex[4 * v + 1] = 0;
                    chunkData.boneindex[4 * v + 2] = 0;
                    chunkData.boneindex[4 * v + 3] = 0;

                    chunkData.boneweight[4 * v + 0] = 1;
                    chunkData.boneweight[4 * v + 1] = 0;
                    chunkData.boneweight[4 * v + 2] = 0;
                    chunkData.boneweight[4 * v + 3] = 0;
                }
            }
        }

        /**
        * Moves all data from given geometries into one merged geometry.
        * The original geometries will be empty after this operation (lazy design to avoid data duplication).
        */
        static mergeGeometries(geometries: COLLADA.Converter.Geometry[], context: COLLADA.Converter.Context): COLLADA.Converter.Geometry {

            if (geometries.length === 1) {
                return geometries[0];
            }

            var result: COLLADA.Converter.Geometry = new COLLADA.Converter.Geometry();
            result.name = "merged_geometry";

            // Merge skeleton bones
            var merged_bones: COLLADA.Converter.Bone[] = [];
            for (var i = 0; i < geometries.length; ++i) {
                COLLADA.Converter.Bone.appendBones(merged_bones, geometries[i].bones);
            }
            result.bones = merged_bones;

            // Recode bone indices
            for (var i = 0; i < geometries.length; ++i) {
                COLLADA.Converter.Geometry.adaptBoneIndices(geometries[i], merged_bones, context);
            }

            // Set bone indices
            COLLADA.Converter.Bone.updateIndices(merged_bones);

            // Safety check
            for (var i = 0; i < merged_bones.length; ++i) {
                var bone: COLLADA.Converter.Bone = merged_bones[i];
                if (bone.parent !== null) {
                    if (bone.parent != merged_bones[bone.parentIndex()]) throw new Error("Inconsistent bone parent");
                }
            }

            // Merge geometry chunks
            for (var i = 0; i < geometries.length; ++i) {
                result.chunks = result.chunks.concat(geometries[i].chunks);
            }

            // We modified the original data, unlink it from the original geometries
            for (var i = 0; i < geometries.length; ++i) {
                geometries[i].chunks = [];
                geometries[i].bones = [];
            }

            return result;
        }

        /**
        * Change all vertex bone indices so that they point to the given new_bones array, instead of the current geometry.bones array
        */
        static adaptBoneIndices(geometry: COLLADA.Converter.Geometry, new_bones: COLLADA.Converter.Bone[], context: COLLADA.Converter.Context) {
            if (geometry.bones.length === 0) {
                return;
            }

            // Compute the index map
            var index_map: Uint32Array = COLLADA.Converter.Bone.getBoneIndexMap(geometry.bones, new_bones);

            // Recode indices
            for (var i = 0; i < geometry.chunks.length; ++i) {
                var chunk: COLLADA.Converter.GeometryChunk = geometry.chunks[i];
                var boneindex: Uint8Array = chunk.data.boneindex;

                for (var j = 0; j < boneindex.length; ++j) {
                    boneindex[j] = index_map[boneindex[j]];
                }
            }
        }

    }
}