
module rmx {

    export function fixTime(progress: number, loop: boolean): number {
        if (loop) {
            return progress - Math.floor(progress);
        } else if (progress < 0) {
            return 0;
        } else if (progress > 1) {
            return 1;
        } else {
            return progress;
        }
    }
}