module COLLADA {

    export class Context {
        log: Log;

        isInstanceOf(el: any, typeName: string): boolean {
            return el._className.indexOf("|" + typeName + "|") > -1;
        }
    }
}