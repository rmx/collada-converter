/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="utils.ts" />


module COLLADA.Loader {

    /**
    *   An <newparam> element.
    */
    export class EffectSampler extends COLLADA.Loader.Element {
        surface: Link;
        image: Link;
        wrapS: string;
        wrapT: string;
        minFilter: string;
        magFilter: string;
        borderColor: Float32Array;
        mipmapMaxLevel: number;
        mipmapBias: number;

        constructor() {
            super();
            this._className += "EffectSampler|";
            this.surface = null;
            this.image = null;
            this.wrapS = null;
            this.wrapT = null;
            this.minFilter = null;
            this.magFilter = null;
            this.borderColor = null;
            this.mipmapMaxLevel = null;
            this.mipmapBias = null;
        }

        static fromLink(link: Link, context: COLLADA.Context): COLLADA.Loader.EffectSampler {
            return COLLADA.Loader.Element._fromLink<COLLADA.Loader.EffectSampler>(link, "EffectSampler", context);
        }

        /**
        *   Parses a <newparam> element.
        */
        static parse(node: Node, parent: COLLADA.Loader.Element, context: COLLADA.Loader.Context): COLLADA.Loader.EffectSampler {
            var result: COLLADA.Loader.EffectSampler = new COLLADA.Loader.EffectSampler();

            Utils.forEachChild(node, function (child: Node) {
                switch (child.nodeName) {
                    case "source":
                        result.surface = context.createFxLink(context.getTextContent(child), parent);
                        break;
                    case "instance_image":
                        result.image = context.getAttributeAsUrlLink(child, "url", true);
                        break;
                    case "wrap_s":
                        result.wrapS = context.getTextContent(child);
                        break;
                    case "wrap_t":
                        result.wrapT = context.getTextContent(child);
                        break;
                    case "minfilter":
                        result.minFilter = context.getTextContent(child);
                        break;
                    case "magfilter":
                        result.magFilter = context.getTextContent(child);
                        break;
                    case "border_color":
                        result.borderColor = context.getFloatsContent(child);
                        break;
                    case "mipmap_maxlevel":
                        result.mipmapMaxLevel = context.getIntContent(child);
                        break;
                    case "mipmap_bias":
                        result.mipmapBias = context.getFloatContent(child);
                        break;
                    default:
                        context.reportUnexpectedChild(child);
                }
            });

            return result;
        }
    }
}