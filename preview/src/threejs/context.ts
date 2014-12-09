/// <reference path="../context.ts" />

module COLLADA.Threejs {

    export class Context extends COLLADA.Context {
        log: Log;
        mat_tol: number;
        pos_tol: number;
        scl_tol: number;
        rot_tol: number;
        uvs_tol: number;
        nrm_tol: number;

        constructor(log: Log) {
            super();
            this.log = log;
            this.mat_tol = 5;
            this.pos_tol = 5;
            this.scl_tol = 3;
            this.rot_tol = 5;
            this.uvs_tol = 4;
            this.nrm_tol = 5;
        }
    }
}