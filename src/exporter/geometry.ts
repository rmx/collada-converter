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

        static create(box: COLLADA.Converter.BoundingBox, context: COLLADA.Exporter.Context): BoundingBox {
            var result = new BoundingBox();
            result.min = [box.min[0], box.min[1], box.min[2]];
            result.max = [box.max[0], box.max[1], box.max[2]];
            return result;
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
        vertex_offset: number;
        triangle_count: number;
        index_offset: number;
        bounding_box: BoundingBox;

        constructor() {
            this.name = null;
            this.material = null;
            this.vertex_count = null;
            this.vertex_offset = null;
            this.triangle_count = null;
            this.index_offset = null;
            this.bounding_box = null;
        }

        static create(chunk: COLLADA.Converter.GeometryChunk, context: COLLADA.Exporter.Context): COLLADA.Exporter.GeometryChunk {
            var result: COLLADA.Exporter.GeometryChunk = new COLLADA.Exporter.GeometryChunk();

            result.name = chunk.name;
            result.vertex_count = chunk.vertexCount;
            result.vertex_offset = chunk.vertexBufferOffset;
            result.triangle_count = chunk.triangleCount;
            result.index_offset = chunk.indexBufferOffset;
            result.bounding_box = BoundingBox.create(chunk.boundingBox, context);

            return result;
        }

        toJSON(): GeometryChunkJSON {
            var result: GeometryChunkJSON = {
                name: this.name,
                material: this.material,
                vertex_count: this.vertex_count,
                vertex_offset: this.vertex_offset,
                triangle_count: this.triangle_count,
                index_offset: this.index_offset
            };

            if (this.bounding_box !== null) {
                result.bounding_box = this.bounding_box.toJSON()
            }

            return result;
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
            if (geometry.chunks.length == 0) {
                context.log.write("Skipping empty geometry " + geometry.name, LogLevel.Warning);
                return null;
            }

            // Check whether all chunks use a single buffer
            var geometryData: COLLADA.Converter.GeometryData = geometry.chunks[0].data;
            for (var i: number = 0; i < geometry.chunks.length; ++i) {
                var chunk: COLLADA.Converter.GeometryChunk = geometry.chunks[i];
                if (chunk.data !== geometryData) {
                    context.log.write("Chunks of geometry '" + geometry.name + "' do not use a single buffer, geometry skipped", LogLevel.Warning);
                    return null;
                }
            }

            var result: COLLADA.Exporter.Geometry = new COLLADA.Exporter.Geometry();
            result.name = geometry.name;
            result.vertex_count = 0;
            result.triangle_count = 0;
            result.bounding_box = BoundingBox.create(geometry.boundingBox, context);

            // Geometry data
            result.indices = COLLADA.Exporter.DataChunk.create(geometryData.indices, 3, context);
            result.position = COLLADA.Exporter.DataChunk.create(geometryData.position, 3, context);
            result.normal = COLLADA.Exporter.DataChunk.create(geometryData.normal, 3, context);
            result.texcoord = COLLADA.Exporter.DataChunk.create(geometryData.texcoord, 2, context);
            result.boneweight = COLLADA.Exporter.DataChunk.create(geometryData.boneweight, 4, context);
            result.boneindex = COLLADA.Exporter.DataChunk.create(geometryData.boneindex, 4, context);

            // Vertex and triangle count
            for (var i: number = 0; i < geometry.chunks.length; ++i) {
                var chunk: COLLADA.Converter.GeometryChunk = geometry.chunks[i];
                result.vertex_count += chunk.vertexCount;
                result.triangle_count += chunk.triangleCount;
            }

            return result;
        }

        toJSON(): COLLADA.Exporter.GeometryJSON {
            // Required properties
            var result: COLLADA.Exporter.GeometryJSON = {
                name: this.name,
                vertex_count: this.vertex_count,
                triangle_count: this.triangle_count,
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

            if (this.bounding_box !== null) {
                result.bounding_box = this.bounding_box.toJSON();
            }

            return result;
        }
    }
}