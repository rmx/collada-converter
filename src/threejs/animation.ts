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

            var original_fps: number = Math.floor(animation.original_fps + 0.5);
            var time_scale: number = original_fps / animation.fps;

            return {
                "name": animation.name || "animation",
                "length": animation.keyframes,
                "fps": animation.fps,
                "hierarchy": animation.tracks.map((track, index) => {

                    // Get the actual default transformation of the current bone
                    // This is not equal to the transformation stored in threejsBones[index]
                    var localMatrix = bones[index].node.initialLocalMatrix;
                    var default_pos = new Float32Array(3);
                    var default_rot = new Float32Array(4);
                    var default_scl = new Float32Array(3);
                    COLLADA.MathUtils.decompose(localMatrix, default_pos, default_rot, default_scl);

                    // Add all keyframes
                    var keys: any[] = [];
                    for (var k = 0; k < animation.keyframes; ++k) {
                        var key: any = { "time": roundTo(k * time_scale, 2) }

                        // Keyframe data
                        if (track.pos) key.pos = vec3Key(track.pos, k, 4);
                        if (track.rot) key.rot = vec4Key(track.rot, k, 4);
                        if (track.scl) key.scl = vec3Key(track.scl, k, 3);

                        // First and last keyframes must be complete
                        if (k == 0 || k == animation.keyframes - 1) {
                            if (!track.pos) key.pos = vec3Key(default_pos, 0, 4);
                            if (!track.rot) key.rot = vec4Key(default_rot, 0, 4);
                            if (!track.scl) key.scl = vec3Key(default_scl, 0, 3);
                        }

                        // Ignore empty keys
                        if (key.pos || key.rot || key.scl) {
                            keys.push(key);
                        }
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