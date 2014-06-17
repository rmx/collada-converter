/// <reference path="context.ts" />
/// <reference path="data_chunk.ts" />
/// <reference path="format.ts" />
/// <reference path="../math.ts" />

module COLLADA.Exporter {

    export class BoundingBox {

        static toJSON(box: COLLADA.Converter.BoundingBox): BoundingBoxJSON {
            if (box === null) {
                return null;
            }

            return {
                min: [box.min[0], box.min[1], box.min[2]],
                max: [box.max[0], box.max[1], box.max[2]]
            };
        }
    }

    export class Geometry {

        static toJSON(chunk: COLLADA.Converter.GeometryChunk, material_index: number, context: COLLADA.Exporter.Context): COLLADA.Exporter.GeometryJSON {

            var indices: DataChunk = COLLADA.Exporter.DataChunk.create(chunk.data.indices, 3, context);
            var position: DataChunk = COLLADA.Exporter.DataChunk.create(chunk.data.position, 3, context);
            var normal: DataChunk = COLLADA.Exporter.DataChunk.create(chunk.data.normal, 3, context);
            var texcoord: DataChunk = COLLADA.Exporter.DataChunk.create(chunk.data.texcoord, 2, context);
            var boneweight: DataChunk = COLLADA.Exporter.DataChunk.create(chunk.data.boneweight, 4, context);
            var boneindex: DataChunk = COLLADA.Exporter.DataChunk.create(chunk.data.boneindex, 4, context);

            return {
                name: chunk.name,
                material: material_index,
                vertex_count: chunk.vertexCount,
                triangle_count: chunk.triangleCount,
                indices: DataChunk.toJSON(indices),
                position: DataChunk.toJSON(position),
                normal: DataChunk.toJSON(normal),
                texcoord: DataChunk.toJSON(texcoord),
                boneweight: DataChunk.toJSON(boneweight),
                boneindex: DataChunk.toJSON(boneindex),
                bounding_box: BoundingBox.toJSON(chunk.boundingBox)
            }
        }
    }
}