/// <reference path="context.ts" />


module COLLADA.Threejs {

    function roundTo(value: number, digits: number): number {
        return +value.toFixed(digits);
    }

    function vec3Key(data: Float32Array, k: number, digits: number): number[] {
        return [roundTo(data[3 * k + 0], digits), roundTo(data[3 * k + 1], digits), roundTo(data[3 * k + 2], digits)];
    }

    function vec4Key(data: Float32Array, k: number, digits: number): number[] {
        return [roundTo(data[4 * k + 0], digits), roundTo(data[4 * k + 1], digits), roundTo(data[4 * k + 2], digits), roundTo(data[4 * k + 3], digits)];
    }

    export class Animation {

        static toJSON(animation: COLLADA.Converter.AnimationData, bones: COLLADA.Converter.Bone[], threejsBones: any[], context: COLLADA.Threejs.Context): any {
            if (animation === null) {
                return null;
            }

            var original_fps: number = 30;
            var time_scale: number = original_fps / animation.fps;

            return {
                "name": animation.name || "animation",
                "length": animation.keyframes,
                "fps": animation.fps,
                "hierarchy": animation.tracks.map((track, index) => {
                    var keys: any[] = [];
                    for (var k = 0; k < animation.keyframes; ++k) {
                        var key: any = { "time": roundTo(k * time_scale, 2) }
                        if (track.pos) key.pos = vec3Key(track.pos, k, 4);
                        if (track.rot) key.rot = vec4Key(track.rot, k, 4);
                        if (track.scl) key.scl = vec3Key(track.scl, k, 3);
                        if (k == 0 || k == animation.keyframes - 1) {
                            if (!track.pos) key.pos = threejsBones[index].pos;
                            if (!track.rot) key.rot = threejsBones[index].rotq;
                            if (!track.scl) key.scl = threejsBones[index].scl;
                        }
                        keys.push(key);
                    }

                    return {
                        "parent": index - 1, /* WTF is this */
                        "keys": keys
                    };
                })
            };
        }
    }
}