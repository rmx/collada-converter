/// <reference path="../context.ts" />

module COLLADA.Threejs {

    export class Context extends COLLADA.Context {
        log: Log;
        

        constructor(log: Log) {
            super();
            this.log = log;
        }
    }
}