/// <reference path="context.ts" />
/// <reference path="animation_track.ts" />
/// <reference path="format.ts" />

module COLLADA.Exporter {

    export class Animation {

        static toJSON(animation: COLLADA.Converter.AnimationData, context: COLLADA.Exporter.Context): COLLADA.Exporter.AnimationJSON {
            if (animation === null) {
                return null;
            }

            return {
                name: animation.name,
                frames: animation.keyframes,
                fps: animation.fps,
                tracks: animation.tracks.map((e, i) => AnimationTrack.toJSON(e, i, context))
            };
        }
    }
}