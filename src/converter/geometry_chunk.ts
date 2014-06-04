/// <reference path="context.ts" />
/// <reference path="utils.ts" />
/// <reference path="material.ts" />
/// <reference path="bone.ts" />
/// <reference path="bounding_box.ts" />
/// <reference path="../external/gl-matrix.i.ts" />
/// <reference path="../math.ts" />

module COLLADA.Converter {

    export class GeometryData {
        indices: Uint32Array;
        position: Float32Array;
        normal: Float32Array;
        texcoord: Float32Array;
        boneweight: Float32Array;
        boneindex: Uint8Array;

        constructor() {
            this.indices = null;
            this.position = null;
            this.normal = null;
            this.texcoord = null;
            this.boneweight = null;
            this.boneindex = null;
        }
    }

    export class GeometryChunkSourceIndices {
        /** Original indices, contained in <triangles>/<p> */
        indices: Int32Array;
        /** The stride of the original indices (number of independent indices per vertex) */
        indexStride: number;
        /** The offset of the main (position) index in the original vertices */
        indexOffset: number;

        constructor() {
            this.indices = null;
            this.indexStride = null;
            this.indexOffset = null;
        }
    }

    export class GeometryChunk {
        public name: string;
        /** Number of elements in the vertex buffer (i.e., number of unique vertices) */
        public vertexCount: number;
        /** Number of triangles */
        public triangleCount: number;
        /** Vertices for this chunk start at data.vertices[vertexBufferOffset] */
        public vertexBufferOffset: number;
        /** Indices for this chunk start at data.indices[indexBufferOffset] */
        public indexBufferOffset: number;
        /** Geometry data buffer */
        public data: GeometryData;
        public material: COLLADA.Converter.Material;
        public boundingBox: BoundingBox;
        /** Bind shape matrix (skinned geometry only) */
        public bindShapeMatrix: Mat4;
        /** Backup of the original COLLADA indices, for internal use only */
        public _colladaIndices: GeometryChunkSourceIndices;

        constructor() {
            this.name = null;
            this.vertexCount = null;
            this.vertexBufferOffset = null;
            this.triangleCount = null;
            this.indexBufferOffset = null;
            this.boundingBox = new BoundingBox();
            this.data = null;
            this.bindShapeMatrix = null;
            this._colladaIndices = null;
        }

        /**
        * Creates a geometry chunk with its own geometry data buffers.
        *
        * This de-indexes the COLLADA data, so that it is usable by GPUs.
        */
        static createChunk(geometry: COLLADA.Loader.Geometry, triangles: COLLADA.Loader.Triangles, context: COLLADA.Converter.Context): COLLADA.Converter.GeometryChunk {

            // Per-triangle data input
            var inputTriVertices: COLLADA.Loader.Input = null;
            var inputTriNormal: COLLADA.Loader.Input = null;
            var inputTriColor: COLLADA.Loader.Input = null;
            var inputTriTexcoord: COLLADA.Loader.Input[] = [];
            for (var i: number = 0; i < triangles.inputs.length; i++) {
                var input: COLLADA.Loader.Input = triangles.inputs[i];
                switch (input.semantic) {
                    case "VERTEX":
                        inputTriVertices = input;
                        break;
                    case "NORMAL":
                        inputTriNormal = input;
                        break;
                    case "COLOR":
                        inputTriColor = input;
                        break;
                    case "TEXCOORD":
                        inputTriTexcoord.push(input);
                        break;
                    default:
                        context.log.write("Unknown triangles input semantic " + input.semantic + " ignored", LogLevel.Warning);
                }
            }

            // Per-triangle data source
            var srcTriVertices: COLLADA.Loader.Vertices = COLLADA.Loader.Vertices.fromLink(inputTriVertices.source, context);
            if (srcTriVertices === null) {
                context.log.write("Geometry " + geometry.id + " has no vertices, geometry ignored", LogLevel.Warning);
                return null;
            }
            var srcTriNormal: COLLADA.Loader.Source = COLLADA.Loader.Source.fromLink(inputTriNormal != null ? inputTriNormal.source : null, context);
            var srcTriColor: COLLADA.Loader.Source = COLLADA.Loader.Source.fromLink(inputTriColor != null ? inputTriColor.source : null, context);
            var srcTriTexcoord: COLLADA.Loader.Source[] = inputTriTexcoord.map((x: COLLADA.Loader.Input) => COLLADA.Loader.Source.fromLink(x != null ? x.source : null, context));

            // Per-vertex data input
            var inputVertPos: COLLADA.Loader.Input = null;
            var inputVertNormal: COLLADA.Loader.Input = null;
            var inputVertColor: COLLADA.Loader.Input = null;
            var inputVertTexcoord: COLLADA.Loader.Input[] = [];
            for (var i: number = 0; i < srcTriVertices.inputs.length; i++) {
                var input: COLLADA.Loader.Input = srcTriVertices.inputs[i];
                switch (input.semantic) {
                    case "POSITION":
                        inputVertPos = input;
                        break;
                    case "NORMAL":
                        inputVertNormal = input;
                        break;
                    case "COLOR":
                        inputVertColor = input;
                        break;
                    case "TEXCOORD":
                        inputVertTexcoord.push(input);
                        break;
                    default:
                        context.log.write("Unknown vertices input semantic " + input.semantic + " ignored", LogLevel.Warning);
                }
            }

            // Per-vertex data source
            var srcVertPos: COLLADA.Loader.Source = COLLADA.Loader.Source.fromLink(inputVertPos.source, context);
            if (srcVertPos === null) {
                context.log.write("Geometry " + geometry.id + " has no vertex positions, geometry ignored", LogLevel.Warning);
                return null;
            }
            var srcVertNormal: COLLADA.Loader.Source = COLLADA.Loader.Source.fromLink(inputVertNormal != null ? inputVertNormal.source : null, context);
            var srcVertColor: COLLADA.Loader.Source = COLLADA.Loader.Source.fromLink(inputVertColor != null ? inputVertColor.source : null, context);
            var srcVertTexcoord: COLLADA.Loader.Source[] = inputVertTexcoord.map((x: COLLADA.Loader.Input) => COLLADA.Loader.Source.fromLink(x != null ? x.source : null, context));

            // Raw data
            var dataVertPos: Float32Array = COLLADA.Converter.Utils.createFloatArray(srcVertPos, "vertex position", 3, context);
            var dataVertNormal: Float32Array = COLLADA.Converter.Utils.createFloatArray(srcVertNormal, "vertex normal", 3, context);
            var dataTriNormal: Float32Array = COLLADA.Converter.Utils.createFloatArray(srcTriNormal, "vertex normal (indexed)", 3, context);
            var dataVertColor: Float32Array = COLLADA.Converter.Utils.createFloatArray(srcVertColor, "vertex color", 4, context);
            var dataTriColor: Float32Array = COLLADA.Converter.Utils.createFloatArray(srcTriColor, "vertex color (indexed)", 4, context);
            var dataVertTexcoord: Float32Array[] = srcVertTexcoord.map((x) => COLLADA.Converter.Utils.createFloatArray(x, "texture coordinate", 2, context));
            var dataTriTexcoord: Float32Array[] = srcTriTexcoord.map((x) => COLLADA.Converter.Utils.createFloatArray(x, "texture coordinate (indexed)", 2, context));

            // Make sure the geometry only contains triangles
            if (triangles.type !== "triangles") {
                var vcount: Uint32Array = triangles.vcount;
                for (var i: number = 0; i < vcount.length; i++) {
                    var c: number = vcount[i];
                    if (c !== 3) {
                        context.log.write("Geometry " + geometry.id + " has non-triangle polygons, geometry ignored", LogLevel.Warning);
                        return null;
                    }
                }
            }

            // Security checks
            if (srcVertPos.stride !== 3) {
                context.log.write("Geometry " + geometry.id + " vertex positions are not 3D vectors, geometry ignored", LogLevel.Warning);
                return null;
            }

            // Extract indices used by this chunk
            var colladaIndices: Uint32Array = triangles.indices;
            var trianglesCount: number = triangles.count;
            var triangleStride: number = colladaIndices.length / triangles.count;
            var triangleVertexStride: number = triangleStride / 3;
            var indices: Uint32Array = COLLADA.Converter.Utils.compactIndices(colladaIndices, triangleVertexStride, inputTriVertices.offset);

            if ((indices === null) || (indices.length === 0)) {
                context.log.write("Geometry " + geometry.id + " does not contain any indices, geometry ignored", LogLevel.Error);
                return null;
            }

            // The vertex count (size of the vertex buffer) is the number of unique indices in the index buffer
            var vertexCount: number = COLLADA.Converter.Utils.maxIndex(indices) + 1;
            var triangleCount: number = indices.length / 3;

            if (triangleCount !== trianglesCount) {
                context.log.write("Geometry " + geometry.id + " has an inconsistent number of indices, geometry ignored", LogLevel.Error);
                return null;
            }

            // Position buffer
            var position = new Float32Array(vertexCount * 3);
            var indexOffsetPosition: number = inputTriVertices.offset;
            COLLADA.Converter.Utils.reIndex(dataVertPos, colladaIndices, triangleVertexStride, indexOffsetPosition, 3, position, indices, 1, 0, 3);

            // Normal buffer
            var normal = new Float32Array(vertexCount * 3);
            var indexOffsetNormal: number = inputTriNormal !== null ? inputTriNormal.offset : null;
            if (dataVertNormal !== null) {
                COLLADA.Converter.Utils.reIndex(dataVertNormal, colladaIndices, triangleVertexStride, indexOffsetPosition, 3, normal, indices, 1, 0, 3);
            } else if (dataTriNormal !== null) {
                COLLADA.Converter.Utils.reIndex(dataTriNormal, colladaIndices, triangleVertexStride, indexOffsetNormal, 3, normal, indices, 1, 0, 3);
            } else {
                context.log.write("Geometry " + geometry.id + " has no normal data, using zero vectors", LogLevel.Warning);
            }

            // Texture coordinate buffer
            var texcoord = new Float32Array(vertexCount * 2);
            var indexOffsetTexcoord: number = inputTriTexcoord.length > 0 ? inputTriTexcoord[0].offset : null;
            if (dataVertTexcoord.length > 0) {
                COLLADA.Converter.Utils.reIndex(dataVertTexcoord[0], colladaIndices, triangleVertexStride, indexOffsetPosition, 2, texcoord, indices, 1, 0, 2);
            } else if (dataTriTexcoord.length > 0) {
                COLLADA.Converter.Utils.reIndex(dataTriTexcoord[0], colladaIndices, triangleVertexStride, indexOffsetTexcoord, 2, texcoord, indices, 1, 0, 2);
            } else {
                context.log.write("Geometry " + geometry.id + " has no texture coordinate data, using zero vectors", LogLevel.Warning);
            }

            // Geometry data buffers
            var geometryData: GeometryData = new GeometryData();
            geometryData.indices = indices;
            geometryData.position = position;
            geometryData.normal = normal;
            geometryData.texcoord = texcoord;

            // Backup of the original COLLADA indices
            var sourceIndices: GeometryChunkSourceIndices = new GeometryChunkSourceIndices();
            sourceIndices.indices = colladaIndices;
            sourceIndices.indexStride = triangleVertexStride;
            sourceIndices.indexOffset = indexOffsetPosition;

            // Geometry chunk
            var result: COLLADA.Converter.GeometryChunk = new COLLADA.Converter.GeometryChunk();
            result.vertexCount = vertexCount;
            result.vertexBufferOffset = 0;
            result.triangleCount = triangleCount;
            result.indexBufferOffset = 0;
            result.data = geometryData;
            result._colladaIndices = sourceIndices;

            return result;
        }

        /**
        * Computes the bounding box of the static (unskinned) geometry
        */
        static computeBoundingBox(chunk: COLLADA.Converter.GeometryChunk, context: COLLADA.Converter.Context) {
            chunk.boundingBox.fromPositions(chunk.data.position, chunk.vertexBufferOffset, chunk.vertexCount);
        }


        /**
        * Transforms the positions and normals of the given Chunk by the given matrices
        */
        static transformChunk(chunk: COLLADA.Converter.GeometryChunk, positionMatrix: Mat4, normalMatrix: Mat3, context: COLLADA.Converter.Context) {
            var position: Float32Array = chunk.data.position;
            if (position !== null) {
                vec3.forEach<Mat4>(position, 3, 0, position.length / 3, vec3.transformMat4, positionMatrix);
            }

            var normal: Float32Array = chunk.data.normal;
            if (normal !== null) {
                vec3.forEach<Mat3>(normal, 3, 0, normal.length / 3, vec3.transformMat3, normalMatrix);
            }
        }


        /**
        * Merges the geometric data from all the chunks into a single set of buffers.
        * The old buffers of the chunks are discarded and replaced by the new (bigger) buffers.
        * Each chunk then uses the same buffers, but uses a different portion of the buffers, according to the triangleCount and triangleOffset.
        * A single new chunk containing all the geometry is returned.
        */
        static mergeChunkData(chunks: COLLADA.Converter.GeometryChunk[], context: COLLADA.Converter.Context) {

            if (chunks.length < 2) {
                return;
            }

            // Count number of data elements
            var vertexCount = 0;
            var triangleCount = 0;

            var has_position: boolean = (chunks.length > 0);
            var has_normal: boolean = (chunks.length > 0);
            var has_texcoord: boolean = (chunks.length > 0);
            var has_boneweight: boolean = (chunks.length > 0);
            var has_boneindex: boolean = (chunks.length > 0);
            for (var i: number = 0; i < chunks.length; ++i) {
                var chunk: GeometryChunk = chunks[i];
                var chunkData: GeometryData = chunk.data;

                vertexCount += chunk.vertexCount;
                triangleCount += chunk.triangleCount;

                has_position = has_position && (chunkData.position !== null);
                has_normal = has_normal && (chunkData.normal !== null);
                has_texcoord = has_texcoord && (chunkData.texcoord !== null);
                has_boneweight = has_boneweight && (chunkData.boneweight !== null);
                has_boneindex = has_boneindex && (chunkData.boneindex !== null);
            }

            // Create data buffers
            var resultData = new GeometryData();
            resultData.indices = new Uint32Array(triangleCount * 3);
            if (has_position) {
                resultData.position = new Float32Array(vertexCount * 3);
            }
            if (has_normal) {
                resultData.normal = new Float32Array(vertexCount * 3);
            }
            if (has_texcoord) {
                resultData.texcoord = new Float32Array(vertexCount * 2);
            }
            if (has_boneindex) {
                resultData.boneindex = new Uint8Array(vertexCount * 4);
            }
            if (has_boneweight) {
                resultData.boneweight = new Float32Array(vertexCount * 4);
            }

            // Copy data
            var indexBufferOffset: number = 0;
            var vertexBufferOffset: number = 0;
            for (var i: number = 0; i < chunks.length; ++i) {
                var chunk: GeometryChunk = chunks[i];
                var chunkData: GeometryData = chunk.data;

                // Copy index data
                for (var j: number = 0; j < chunk.triangleCount * 3; ++j) {
                    resultData.indices[indexBufferOffset + j] = chunkData.indices[j + chunk.indexBufferOffset] + vertexBufferOffset;
                }

                // Copy vertex data
                if (has_position) {
                    MathUtils.copyNumberArrayOffset(chunkData.position, chunk.vertexBufferOffset * 3, resultData.position, vertexBufferOffset * 3,
                        chunk.vertexCount * 3);
                }
                if (has_normal) {
                    MathUtils.copyNumberArrayOffset(chunkData.normal, chunk.vertexBufferOffset * 3, resultData.normal, vertexBufferOffset * 3,
                        chunk.vertexCount * 3);
                }
                if (has_texcoord) {
                    MathUtils.copyNumberArrayOffset(chunkData.texcoord, chunk.vertexBufferOffset * 2, resultData.texcoord, vertexBufferOffset * 2,
                        chunk.vertexCount * 2);
                }
                if (has_boneweight) {
                    MathUtils.copyNumberArrayOffset(chunkData.boneweight, chunk.vertexBufferOffset * 4, resultData.boneweight, vertexBufferOffset * 4,
                        chunk.vertexCount * 4);
                }
                if (has_boneindex) {
                    MathUtils.copyNumberArrayOffset(chunkData.boneindex, chunk.vertexBufferOffset * 4, resultData.boneindex, vertexBufferOffset * 4,
                        chunk.vertexCount * 4);
                }

                // Discard the original chunk data
                chunk.data = resultData;
                chunk.vertexBufferOffset = vertexBufferOffset;
                chunk.indexBufferOffset = indexBufferOffset;

                // Update offset
                vertexBufferOffset += chunk.vertexCount;
                indexBufferOffset += chunk.triangleCount * 3;
            }

        }

    }



}