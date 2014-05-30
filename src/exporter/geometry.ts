/// <reference path="context.ts" />
/// <reference path="data_chunk.ts" />
/// <reference path="format.ts" />
/// <reference path="../math.ts" />

module COLLADA.Exporter {

    export class BoundingBox {
        min: number[];
        max: number[];

        constructor() {
            this.min = null;
            this.max = null;
        }

        toJSON(): BoundingBoxJSON {
            return {
                min: this.min,
                max: this.max
            };
        }
    }

    export class GeometryChunk {
        name: string;
        material: number;
        vertex_count: number;
        triangle_count: number;
        triangle_offset: number;
        bounding_box: BoundingBox;

        constructor() {
            this.name = null;
            this.material = null;
            this.vertex_count = null;
            this.triangle_count = null;
            this.triangle_offset = null;
            this.bounding_box = null;
        }

        static create(chunk: COLLADA.Converter.GeometryChunk, context: COLLADA.Exporter.Context): COLLADA.Exporter.GeometryChunk {
            var result: COLLADA.Exporter.GeometryChunk = new COLLADA.Exporter.GeometryChunk();

            return result;
        }

        toJSON(): GeometryChunkJSON {
            return {
                name: this.name,
                material: this.material,
                vertex_count: this.vertex_count,
                triangle_count: this.triangle_count,
                triangle_offset: this.triangle_offset,
                bounding_box: this.bounding_box.toJSON()
            };
        }
    }

    export class Geometry {
        name: string;
        vertex_count: number;
        triangle_count: number;
        bounding_box: BoundingBox;
        indices: COLLADA.Exporter.DataChunk;
        position: COLLADA.Exporter.DataChunk;
        normal: COLLADA.Exporter.DataChunk;
        texcoord: COLLADA.Exporter.DataChunk;
        boneweight: COLLADA.Exporter.DataChunk;
        boneindex: COLLADA.Exporter.DataChunk;
        chunks: COLLADA.Exporter.GeometryChunk[];

        constructor() {
            this.name = null;
            this.vertex_count = null;
            this.triangle_count = null;
            this.bounding_box = null;
            this.indices = null;
            this.position = null;
            this.normal = null;
            this.texcoord = null;
            this.boneweight = null;
            this.boneindex = null;
            this.chunks = [];
        }

        static create(geometry: COLLADA.Converter.Geometry, context: COLLADA.Exporter.Context): COLLADA.Exporter.Geometry {
            var result: COLLADA.Exporter.Geometry = new COLLADA.Exporter.Geometry();
            result.name = geometry.name;

            result.vertex_count = chunk.vertexCount;
            result.triangle_count = chunk.triangleCount;
            result.bbox_min = [chunk.bbox_min[0], chunk.bbox_min[1], chunk.bbox_min[2]];
            result.bbox_max = [chunk.bbox_max[0], chunk.bbox_max[1], chunk.bbox_max[2]];
            result.indices = COLLADA.Exporter.DataChunk.create(chunk.indices, 3, context);
            result.position = COLLADA.Exporter.DataChunk.create(chunk.position, 3, context);
            result.normal = COLLADA.Exporter.DataChunk.create(chunk.normal, 3, context);
            result.texcoord = COLLADA.Exporter.DataChunk.create(chunk.texcoord, 2, context);
            result.boneweight = COLLADA.Exporter.DataChunk.create(chunk.boneweight, 4, context);
            result.boneindex = COLLADA.Exporter.DataChunk.create(chunk.boneindex, 4, context);

            return result;
        }

        toJSON(): COLLADA.Exporter.GeometryJSON {
            // Required properties
            var result: COLLADA.Exporter.GeometryJSON = {
                name: this.name,
                vertex_count: this.vertex_count,
                triangle_count: this.triangle_count,
                bounding_box: this.bounding_box.toJSON(),
                indices: this.indices.toJSON(),
                position: this.position.toJSON(),
                chunks: this.chunks.map((x) => x.toJSON())
            }

            // Optional properties
            if (this.normal !== null) {
                result.normal = this.normal.toJSON();
            }
            if (this.texcoord !== null) {
                result.texcoord = this.texcoord.toJSON();
            }
            if (this.boneweight !== null) {
                result.boneweight = this.boneweight.toJSON();
            }
            if (this.boneindex !== null) {
                result.boneindex = this.boneindex.toJSON();
            }

            return result;
        }
    }
}