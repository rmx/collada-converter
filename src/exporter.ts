/// <reference path="log.ts" />
/// <reference path="exporter/document.ts" />
/// <reference path="exporter/context.ts" />
/// <reference path="exporter/material.ts" />
/// <reference path="exporter/geometry.ts" />
/// <reference path="exporter/skeleton.ts" />
/// <reference path="exporter/animation.ts" />
/// <reference path="exporter/animation_track.ts" />

module COLLADA.Exporter {

    export class ColladaExporter {
        log: Log;

        constructor() {
            this.log = new LogConsole();
        }

        export(doc: COLLADA.Converter.Document): COLLADA.Exporter.Document {
            var context: COLLADA.Exporter.Context = new COLLADA.Exporter.Context(this.log);

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

            // Geometry and materials
            var converter_materials: COLLADA.Converter.Material[] = [];
            var materials: COLLADA.Exporter.MaterialJSON[] = [];
            var converter_geometry: COLLADA.Converter.Geometry = doc.geometries[0];
            var chunks: COLLADA.Exporter.GeometryJSON[] = [];

            for (var c: number = 0; c < converter_geometry.chunks.length; ++c) {
                var chunk: COLLADA.Converter.GeometryChunk = converter_geometry.chunks[c];

                // Create the material, if it does not exist yet
                var material_index: number = converter_materials.indexOf(chunk.material);
                if (material_index === -1) {
                    var material: COLLADA.Exporter.MaterialJSON = Material.toJSON(chunk.material, context);
                    material_index = materials.length;

                    converter_materials.push(chunk.material);
                    materials.push(material);
                }

                // Create the geometry
                chunks.push(Geometry.toJSON(chunk, material_index, context));
            }

            // Result
            var result: COLLADA.Exporter.Document = new COLLADA.Exporter.Document();

            var info: COLLADA.Exporter.InfoJSON = {
                bounding_box: BoundingBox.toJSON(converter_geometry.boundingBox)
            };
            var bones: BoneJSON[] = Skeleton.toJSON(converter_geometry.getSkeleton(), context);
            var animations: AnimationJSON[] = doc.resampled_animations.map((e) => Animation.toJSON(e, context));

            // Assemble result: JSON part
            result.json = {
                info: info,
                materials: materials,
                chunks: chunks,
                bones: bones,
                animations: animations
            };

            // Assemble result: Binary data part
            result.data = context.assembleData();
            //result.json.data = COLLADA.Exporter.Utils.bufferToString(result.data);

            return result;
        }
    }
}