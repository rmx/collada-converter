/// <reference path="context.ts" />
/// <reference path="utils.ts" />
/// <reference path="material.ts" />
/// <reference path="bone.ts" />
/// <reference path="../external/gl-matrix.i.ts" />
/// <reference path="../math.ts" />

module COLLADA.Converter {

    export class GeometryChunk {
        name: string;
        vertexCount: number;
        vertexBufferOffset: number;
        triangleCount: number;
        indexBufferOffset: number;
        indices: Int32Array;
        position: Float32Array;
        normal: Float32Array;
        texcoord: Float32Array;
        boneweight: Float32Array;
        boneindex: Uint8Array;
        material: COLLADA.Converter.Material;
        bbox_min: Vec3;
        bbox_max: Vec3;
        bindShapeMatrix: Mat4;

        /** Original indices, contained in <triangles>/<p> */
        _colladaVertexIndices: Int32Array;
        /** The stride of the original indices (number of independent indices per vertex) */
        _colladaIndexStride: number;
        /** The offset of the main (position) index in the original vertices */
        _colladaIndexOffset: number;

        constructor() {
            this.name = null;
            this.vertexCount = null;
            this.vertexBufferOffset = null;
            this.triangleCount = null;
            this.indexBufferOffset = null;
            this.indices = null;
            this.position = null;
            this.normal = null;
            this.texcoord = null;
            this.boneweight = null;
            this.boneindex = null;
            this.bbox_max = vec3.create();
            this.bbox_min = vec3.create();
            this.bindShapeMatrix = null;
            this._colladaVertexIndices = null;
            this._colladaIndexStride = null;
            this._colladaIndexOffset = null;
        }


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
            var dataVertPos = COLLADA.Converter.Utils.createFloatArray(srcVertPos, "vertex position", 3, context);
            var dataVertNormal = COLLADA.Converter.Utils.createFloatArray(srcVertNormal, "vertex normal", 3, context);
            var dataTriNormal = COLLADA.Converter.Utils.createFloatArray(srcTriNormal, "vertex normal (indexed)", 3, context);
            var dataVertColor = COLLADA.Converter.Utils.createFloatArray(srcVertColor, "vertex color", 4, context);
            var dataTriColor = COLLADA.Converter.Utils.createFloatArray(srcTriColor, "vertex color (indexed)", 4, context);
            var dataVertTexcoord = srcVertTexcoord.map((x) => COLLADA.Converter.Utils.createFloatArray(x, "texture coordinate", 2, context));
            var dataTriTexcoord = srcTriTexcoord.map((x) => COLLADA.Converter.Utils.createFloatArray(x, "texture coordinate (indexed)", 2, context));

            // Make sure the geometry only contains triangles
            if (triangles.type !== "triangles") {
                var vcount: Int32Array = triangles.vcount;
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
            var colladaIndices: Int32Array = triangles.indices;
            var trianglesCount: number = triangles.count;
            var triangleStride: number = colladaIndices.length / triangles.count;
            var triangleVertexStride: number = triangleStride / 3;
            var indices: Int32Array = COLLADA.Converter.Utils.compactIndices(colladaIndices, triangleVertexStride, inputTriVertices.offset);

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

            var result: COLLADA.Converter.GeometryChunk = new COLLADA.Converter.GeometryChunk();
            result.vertexCount = vertexCount;
            result.vertexBufferOffset = 0;
            result.triangleCount = triangleCount;
            result.indexBufferOffset = 0;
            result.indices = indices;
            result.position = position;
            result.normal = normal;
            result.texcoord = texcoord;
            result._colladaVertexIndices = colladaIndices;
            result._colladaIndexStride = triangleVertexStride;
            result._colladaIndexOffset = indexOffsetPosition;

            COLLADA.Converter.GeometryChunk.computeBoundingBox(result, context);

            return result;
        }

        /**
        * Computes the bounding box of the static (unskinned) geometry
        */
        static computeBoundingBox(chunk: COLLADA.Converter.GeometryChunk, context: COLLADA.Converter.Context) {
            var bbox_max = chunk.bbox_max;
            var bbox_min = chunk.bbox_min;
            var position: Float32Array = chunk.position;

            vec3.set(bbox_min, Infinity, Infinity, Infinity);
            vec3.set(bbox_max, -Infinity, -Infinity, -Infinity);

            var vec: Vec3 = vec3.create();
            for (var i: number = 0; i < position.length / 3; ++i) {
                vec[0] = position[i * 3 + 0];
                vec[1] = position[i * 3 + 1];
                vec[2] = position[i * 3 + 2];
                vec3.max(bbox_max, bbox_max, vec);
                vec3.min(bbox_min, bbox_min, vec);
            }
        }


        static transformChunk(chunk: COLLADA.Converter.GeometryChunk, positionMatrix: Mat4, normalMatrix: Mat3, context: COLLADA.Converter.Context) {
            if (chunk.position !== null) {
                vec3.forEach<Mat4>(chunk.position, 3, 0, chunk.position.length / 3, vec3.transformMat4, positionMatrix);
            }

            if (chunk.normal !== null) {
                vec3.forEach<Mat3>(chunk.normal, 3, 0, chunk.normal.length / 3, vec3.transformMat3, normalMatrix);
            }
        }


        /**
        * Merges the geometric data from all the chunks into a single set of buffers.
        * The old buffers of the chunks are discarded and replaced by the new (bigger) buffers.
        * Each chunk then uses the same buffers, but uses a different portion of the buffers, according to the triangleCount and triangleOffset.
        * A single new chunk containing all the geometry is returned.
        */
        static mergeChunkData(chunks: COLLADA.Converter.GeometryChunk[], context: COLLADA.Converter.Context): GeometryChunk {
            var result: GeometryChunk = new GeometryChunk();
            result.name = "merged geometry data";

            // Count number of data elements
            result.vertexCount = 0;
            result.triangleCount = 0;
            result.indexBufferOffset = 0;
            result.vertexBufferOffset = 0;

            var has_position: boolean = true;
            var has_normal: boolean = true;
            var has_texcoord: boolean = true;
            var has_boneweight: boolean = true;
            var has_boneindex: boolean = true;
            for (var i: number = 0; i < chunks.length; ++i) {
                var chunk: COLLADA.Converter.GeometryChunk = chunks[i];

                result.vertexCount += chunk.vertexCount;
                result.triangleCount += chunk.triangleCount;

                has_position = has_position && (chunk.position !== null);
                has_normal = has_normal && (chunk.normal !== null);
                has_texcoord = has_texcoord && (chunk.texcoord !== null);
                has_boneweight = has_boneweight && (chunk.boneweight !== null);
                has_boneindex = has_boneindex && (chunk.boneindex !== null);
            }

            // Create data buffers
            result.indices = new Uint16Array(result.triangleCount * 3);
            if (has_position) {
                result.position = new Float32Array(result.vertexCount * 3);
            }
            if (has_normal) {
                result.normal = new Float32Array(result.vertexCount * 3);
            }
            if (has_texcoord) {
                result.texcoord = new Float32Array(result.vertexCount * 2);
            }
            if (has_boneindex) {
                result.boneindex = new Uint8Array(result.vertexCount * 4);
            }
            if (has_boneweight) {
                result.boneweight = new Float32Array(result.vertexCount * 4);
            }

            // Copy data
            var indexBufferOffset: number = 0;
            var vertexBufferOffset: number = 0;
            for (var i: number = 0; i < chunks.length; ++i) {
                var chunk: GeometryChunk = chunks[i];

                // Copy index data
                for (var j = 0; j < chunk.triangleCount * 3; ++j) {
                    result.indices[indexBufferOffset + j] = chunk.indices[j + chunk.indexBufferOffset] + vertexBufferOffset;
                }

                // Copy vertex data
                if (has_position) {
                    for (var j = 0; j < chunk.vertexCount * 3; ++j) {
                        result.position[indexBufferOffset + j] = chunk.position[j + chunk.vertexBufferOffset];
                    }
                }
                if (has_normal) {
                    for (var j = 0; j < chunk.vertexCount * 3; ++j) {
                        result.normal[indexBufferOffset + j] = chunk.normal[j + chunk.vertexBufferOffset];
                    }
                }
                if (has_texcoord) {
                    for (var j = 0; j < chunk.vertexCount * 2; ++j) {
                        result.texcoord[indexBufferOffset + j] = chunk.texcoord[j + chunk.vertexBufferOffset];
                    }
                }
                if (has_boneweight) {
                    for (var j = 0; j < chunk.vertexCount * 4; ++j) {
                        result.boneweight[indexBufferOffset + j] = chunk.boneweight[j + chunk.vertexBufferOffset];
                    }
                }
                if (has_boneindex) {
                    for (var j = 0; j < chunk.vertexCount * 4; ++j) {
                        result.boneindex[indexBufferOffset + j] = chunk.boneindex[j + chunk.vertexBufferOffset];
                    }
                }

                // Discard the original chunk data
                chunk.indices = result.indices;
                chunk.position = result.position;
                chunk.normal = result.normal;
                chunk.texcoord = result.texcoord;
                chunk.boneweight = result.boneweight;
                chunk.boneindex = result.boneindex;
                chunk.vertexBufferOffset = 0;
                chunk.indexBufferOffset = indexBufferOffset;

                // Update offset
                vertexBufferOffset += chunk.vertexCount;
                indexBufferOffset += chunk.triangleCount * 3;
            }

            return result;
        }

    }



}