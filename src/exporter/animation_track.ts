/// <reference path="context.ts" />
/// <reference path="data_chunk.ts" />
/// <reference path="format.ts" />

module COLLADA.Exporter {

    export class AnimationTrack {

        static toJSON(track: COLLADA.Converter.AnimationDataTrack, index: number, context: COLLADA.Exporter.Context): COLLADA.Exporter.AnimationTrackJSON {
            if (track === null) {
                return null;
            }

            var pos = COLLADA.Exporter.DataChunk.create(track.pos, 3, context);
            var rot = COLLADA.Exporter.DataChunk.create(track.rot, 4, context);
            var scl = COLLADA.Exporter.DataChunk.create(track.scl, 3, context);

            return {
                bone: index,
                pos: DataChunk.toJSON(pos),
                rot: DataChunk.toJSON(rot),
                scl: DataChunk.toJSON(scl)
            };
        }
    }
}