/// <reference path="context.ts" />


module COLLADA.Threejs {

    export class Animation {

        static toJSON(animation: COLLADA.Converter.AnimationData, bones: COLLADA.Converter.Bone[], context: COLLADA.Threejs.Context): any {
            if (animation === null) {
                return null;
            }

            return {
                "name": animation.name,
                "length": animation.keyframes,
                "fps": animation.fps,
                "hierarchy": animation.tracks.map((track, index) => {
                    var keys: any[] = [];
                    for (var k = 0; k < animation.keyframes; ++k) {
                        var key: any = {"time": k}
                        if (track.pos) key.pos = [track.pos[3 * k + 0], track.pos[3 * k + 1], track.pos[3 * k + 2]];
                        if (track.rot) key.rotq = [track.rot[4 * k + 0], track.rot[4 * k + 1], track.rot[4 * k + 2], track.rot[4 * k + 3]];
                        if (track.scl) key.scl = [track.scl[3 * k + 0], track.scl[3 * k + 1], track.scl[3 * k + 2]];
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