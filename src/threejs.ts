/// <reference path="log.ts" />
/// <reference path="threejs/context.ts" />
/// <reference path="threejs/material.ts" />
/// <reference path="threejs/bone.ts" />
/// <reference path="threejs/animation.ts" />

module COLLADA.Threejs {

    export class ThreejsExporter {
        log: Log;

        constructor() {
            this.log = new LogConsole();
        }

        export(doc: COLLADA.Converter.Document): any {
            var context: COLLADA.Threejs.Context = new COLLADA.Threejs.Context(this.log);

            if (doc === null) {
                context.log.write("No document to convert", LogLevel.Warning);
                return null;
            }

            if (doc.geometries.length === 0) {
                context.log.write("Document contains no geometry, nothing exported", LogLevel.Warning);
                return null;
            } else if (doc.geometries.length > 1) {
                context.log.write("Document contains multiple geometries, only the first geometry is exported", LogLevel.Warning);
            }
            var converter_geometry: COLLADA.Converter.Geometry = doc.geometries[0];

            // Geometry and materials
            var converter_materials: COLLADA.Converter.Material[] = [];
            var materials: any[] = [];
            var vertices: number[] = [];
            var normals: number[] = [];
            var uvs: number[] = [];
            var faces: number[] = [];
            var skinIndices: number[] = [];
            var skinWeights: number[] = [];
            var baseIndexOffset: number = 0;

            for (var c: number = 0; c < converter_geometry.chunks.length; ++c) {
                var chunk: COLLADA.Converter.GeometryChunk = converter_geometry.chunks[c];

                // Create the material, if it does not exist yet
                var material_index: number = converter_materials.indexOf(chunk.material);
                if (material_index === -1) {
                    var material: any = Material.toJSON(chunk.material, context);
                    material_index = materials.length;

                    converter_materials.push(chunk.material);
                    materials.push(material);
                }

                // Add vertices
                for (var i: number = 0; i < chunk.vertexCount; ++i) {

                    if (chunk.data.position) {
                        var i0 = 3 * chunk.vertexBufferOffset + 3 * i;
                        vertices.push(chunk.data.position[i0 + 0]);
                        vertices.push(chunk.data.position[i0 + 1]);
                        vertices.push(chunk.data.position[i0 + 2]);
                    }

                    if (chunk.data.normal) {
                        var i0 = 3 * chunk.vertexBufferOffset + 3 * i;
                        normals.push(chunk.data.normal[i0 + 0]);
                        normals.push(chunk.data.normal[i0 + 1]);
                        normals.push(chunk.data.normal[i0 + 2]);
                    }

                    if (chunk.data.texcoord) {
                        var i0: number = 2 * chunk.vertexBufferOffset + 2 * i;
                        uvs.push(chunk.data.texcoord[i0 + 0]);
                        uvs.push(chunk.data.texcoord[i0 + 1]);
                    }

                    if (chunk.data.boneindex) {
                        var i0: number = 4 * chunk.vertexBufferOffset + 4 * i;
                        skinIndices.push(chunk.data.boneindex[i0 + 0]);
                        skinIndices.push(chunk.data.boneindex[i0 + 1]);
                        //skinIndices.push(chunk.data.boneindex[i0 + 2]);
                        //skinIndices.push(chunk.data.boneindex[i0 + 3]);
                    }

                    if (chunk.data.boneweight) {
                        var i0: number = 4 * chunk.vertexBufferOffset + 4 * i;
                        var w0: number = chunk.data.boneweight[i0 + 0];
                        var w1: number = chunk.data.boneweight[i0 + 1];
                        var total = w0 + w1;
                        if (total > 0) {
                            w0 = w0 / total;
                            w1 = w1 / total;
                        }
                        skinWeights.push(w0);
                        skinWeights.push(w1);
                        //skinWeights.push(chunk.data.boneweight[i0 + 2]);
                        //skinWeights.push(chunk.data.boneweight[i0 + 3]);
                    }
                }

                // Add faces
                for (var i: number = 0; i < chunk.triangleCount; ++i) {
                    var i0 = chunk.indexBufferOffset + 3 * i;
                    var index0 = baseIndexOffset + chunk.data.indices[i0 + 0];
                    var index1 = baseIndexOffset + chunk.data.indices[i0 + 1];
                    var index2 = baseIndexOffset + chunk.data.indices[i0 + 2];

                    faces.push(42);

                    faces.push(index0);
                    faces.push(index1);
                    faces.push(index2);

                    faces.push(material_index);

                    faces.push(index0);
                    faces.push(index1);
                    faces.push(index2);

                    faces.push(index0);
                    faces.push(index1);
                    faces.push(index2);
                }

                baseIndexOffset += chunk.vertexCount;
            }

            var bones: any[] = converter_geometry.bones.map((bone) => { return COLLADA.Threejs.Bone.toJSON(bone, context); });
            var animations: any[] = doc.resampled_animations.map((e) => { return COLLADA.Threejs.Animation.toJSON(e, converter_geometry.bones, bones, context); });

            // Assemble result
            return {
                "metadata":
                {
                    "formatVersion": 3.1,
                    "generatedBy": "Collada Converter",
                },
                "scale": 1,
                "materials": materials,
                "vertices": vertices.map((x) => COLLADA.MathUtils.round(x, context.pos_tol)),
                "morphTargets": [],
                "normals": normals.map((x) => COLLADA.MathUtils.round(x, context.nrm_tol)),
                "colors": [],
                "uvs": [uvs.map((x) => COLLADA.MathUtils.round(x, context.uvs_tol))],
                "faces": faces,
                "skinIndices": skinIndices,
                "skinWeights": skinWeights.map((x) => COLLADA.MathUtils.round(x, context.uvs_tol)),
                "bones": bones,
                "animation": animations[0]
            };
        }
    }
}