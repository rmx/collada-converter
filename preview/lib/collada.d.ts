/// <reference path="../external/glmatrix/gl-matrix.d.ts" />
declare module COLLADA {
    class Context {
        log: Log;
        isInstanceOf(el: any, typeName: string): boolean;
    }
}
declare module COLLADA.Loader {
    class Utils {
        static forEachChild(node: Node, fn: (child: Node) => void): void;
    }
}
declare module COLLADA.Loader {
    interface LinkResolveResult {
        result: Element;
        warning: string;
    }
    /**
    * Base class for all links within a collada document
    */
    class Link {
        url: string;
        target: Element;
        constructor();
        getUrl(): string;
        resolve(context: Context): void;
    }
    /**
    *   COLLADA URL addressing
    *
    *   See chapter 3, section "Adress Syntax"
    *   Uses XML ids that are unique within the whole document.
    *   Hyperlinks to ids start with a hash.
    *   <element id="xyz">
    *   <element source="#xyz">
    */
    class UrlLink extends Link {
        constructor(url: string);
        getUrl(): string;
        resolve(context: Context): void;
    }
    /**
    *   COLLADA FX parameter addressing
    *
    *   See chapter 7, section "About Parameters"
    *   Uses scoped ids that are unique within the given scope.
    *   If the target is not defined within the same scope,
    *   the search continues in the parent scope
    *   <element sid="xyz">
    *   <element texture="xyz">
    */
    class FxLink extends Link {
        scope: Element;
        constructor(url: string, scope: Element);
        getUrl(): string;
        resolve(context: Context): void;
    }
    /**
    *   COLLADA SID addressing
    *
    *   See chapter 3, section "Adress Syntax"
    *   Uses scoped ids that are unique within the parent element.
    *   Adresses are anchored at a globally unique id and have a path of scoped ids.
    *   <elementA id="xyz"><elementB sid="abc"></elementB></elementA>
    *   <element target="xyz/abc">
    */
    class SidLink extends Link {
        parentId: string;
        id: string;
        sids: string[];
        member: string;
        indices: number[];
        dotSyntax: boolean;
        arrSyntax: boolean;
        constructor(url: string, parentId: string);
        getUrl(): string;
        private _parseUrl;
        /**
        *   Find the SID target given by the URL (array of sid parts).
        *
        *   @param url The complete URL, for debugging only
        *   @param root Root element, where the search starts.
        *   @param sids SID parts.
        *   @returns The collada element the URL points to, or an error why it wasn't found
        */
        static findSidTarget(url: string, root: Element, sids: string[], context: COLLADA.Context): LinkResolveResult;
        resolve(context: Context): void;
    }
}
declare module COLLADA.Loader {
    /**
    *   Base class for any collada element.
    *
    *   Contains members for URL, FX, and SID adressing,
    *   even if the actual element does not support those.
    */
    class Element {
        /** Class name so that we do not depend on instanceof */
        _className: string;
        /** Collada URL adressing: identifier */
        id: string;
        /** Collada SID/FX adressing: identifier */
        sid: string;
        /** Collada FX adressing: parent element */
        fxParent: Element;
        /** Collada FX adressing: child elements */
        fxChildren: {
            [x: string]: Element;
        };
        /** Collada SID adressing: child elements */
        sidChildren: Element[];
        /** Name of the element. Not used for any adressing. */
        name: string;
        /** Empty constructor */
        constructor();
        static fromLink(link: Link, context: COLLADA.Context): Element;
        static _fromLink<T extends Element>(link: Link, typeName: string, context: COLLADA.Context): T;
    }
}
declare module COLLADA.Loader {
    class Context extends COLLADA.Context {
        ids: {
            [x: string]: Element;
        };
        log: Log;
        links: Link[];
        totalBytes: number;
        loadedBytes: number;
        constructor();
        getTextContent(el: Node): string;
        getFloatsContent(el: Node): Float32Array;
        getFloatContent(el: Node): number;
        getIntsContent(el: Node): Int32Array;
        getIntContent(el: Node): number;
        getBoolsContent(el: Node): Uint8Array;
        getStringsContent(el: Node): string[];
        getAttributeAsFloat(el: Node, name: string, defaultValue: number, required: boolean): number;
        getAttributeAsInt(el: Node, name: string, defaultValue: number, required: boolean): number;
        getAttributeAsString(el: Node, name: string, defaultValue: string, required: boolean): string;
        createUrlLink(url: string): UrlLink;
        createSidLink(url: string, parentId: string): SidLink;
        createFxLink(url: string, scope: Element): FxLink;
        getAttributeAsUrlLink(el: Node, name: string, required: boolean): UrlLink;
        getAttributeAsSidLink(el: Node, name: string, parentId: string, required: boolean): SidLink;
        getAttributeAsFxLink(el: Node, name: string, scope: Element, required: boolean): FxLink;
        /**
        *   Splits a string into whitespace-separated strings
        */
        strToStrings(str: string): string[];
        /**
        *   Parses a string of whitespace-separated float numbers
        */
        strToFloats(str: string): Float32Array;
        /**
        *   Parses a string of whitespace-separated integer numbers
        */
        strToInts(str: string): Int32Array;
        /**
        *   Parses a string of whitespace-separated integer numbers
        */
        strToUints(str: string): Uint32Array;
        /**
        *   Parses a string of whitespace-separated booleans
        */
        strToBools(str: string): Uint8Array;
        /**
        *   Parses a color string
        */
        strToColor(str: string): Float32Array;
        registerUrlTarget(object: Element, needsId: boolean): void;
        registerFxTarget(object: Element, scope: Element): void;
        registerSidTarget(object: Element, parent: Element): void;
        getNodePath(node: Node): string;
        reportUnexpectedChild(child: Node): void;
        reportUnhandledChild(child: Node): void;
        resolveAllLinks(): void;
    }
}
declare module COLLADA.Loader {
    class Library<T extends Element> {
        children: T[];
        constructor();
        static parse<T extends Element>(node: Node, parser: (child: Node, context: Context) => T, childName: string, context: Context): Library<T>;
    }
}
declare module COLLADA.Loader {
    /**
    *   An <asset> element.
    */
    class Asset extends Element {
        unit: number;
        upAxis: string;
        constructor();
        static parse(node: Node, context: Context): Asset;
    }
}
declare module COLLADA.Loader {
    /**
    *   A <scene> element.
    */
    class Scene extends Element {
        instance: Link;
        constructor();
        static parse(node: Node, context: Context): Scene;
    }
}
declare module COLLADA.Loader {
    /**
    *   A <surface> element.
    *
    */
    class EffectSurface extends Element {
        type: string;
        initFrom: Link;
        format: string;
        size: Float32Array;
        viewportRatio: Float32Array;
        mipLevels: number;
        mipmapGenerate: boolean;
        constructor();
        static fromLink(link: Link, context: COLLADA.Context): EffectSurface;
        /**
        *   Parses a <surface> element.
        */
        static parse(node: Node, parent: Element, context: Context): EffectSurface;
    }
}
declare module COLLADA.Loader {
    /**
    *   An <newparam> element.
    */
    class EffectSampler extends Element {
        surface: Link;
        image: Link;
        wrapS: string;
        wrapT: string;
        minFilter: string;
        magFilter: string;
        borderColor: Float32Array;
        mipmapMaxLevel: number;
        mipmapBias: number;
        constructor();
        static fromLink(link: Link, context: COLLADA.Context): EffectSampler;
        /**
        *   Parses a <newparam> element.
        */
        static parse(node: Node, parent: Element, context: Context): EffectSampler;
    }
}
declare module COLLADA.Loader {
    /**
    *   An <newparam> element.
    *
    */
    class EffectParam extends Element {
        semantic: string;
        surface: EffectSurface;
        sampler: EffectSampler;
        floats: Float32Array;
        constructor();
        static fromLink(link: Link, context: COLLADA.Context): EffectParam;
        /**
        *   Parses a <newparam> element.
        */
        static parse(node: Node, parent: Element, context: Context): EffectParam;
    }
}
declare module COLLADA.Loader {
    class ColorOrTexture extends Element {
        color: Float32Array;
        textureSampler: Link;
        texcoord: string;
        opaque: string;
        bumptype: string;
        constructor();
        /**
        *   Parses a color or texture element  (<ambient>, <diffuse>, ...).
        */
        static parse(node: Node, parent: Element, context: Context): ColorOrTexture;
    }
}
declare module COLLADA.Loader {
    /**
    *   An <technique> element.
    *
    */
    class EffectTechnique extends Element {
        params: EffectParam[];
        shading: string;
        emission: ColorOrTexture;
        ambient: ColorOrTexture;
        diffuse: ColorOrTexture;
        specular: ColorOrTexture;
        reflective: ColorOrTexture;
        transparent: ColorOrTexture;
        bump: ColorOrTexture;
        shininess: number;
        transparency: number;
        reflectivity: number;
        index_of_refraction: number;
        double_sided: boolean;
        constructor();
        static fromLink(link: Link, context: COLLADA.Context): EffectTechnique;
        /**
        *   Parses a <technique> element.
        */
        static parse(node: Node, parent: Element, context: Context): EffectTechnique;
        /**
        *   Parses a <technique>/(<blinn>|<phong>|<lambert>|<constant>) element.
        *   In addition to <technique>, node may also be child of <technique>/<extra>
        */
        static parseParam(node: Node, technique: EffectTechnique, profile: string, context: Context): void;
        /**
        *   Parses a <technique>/<extra> element.
        */
        static parseExtra(node: Node, technique: EffectTechnique, context: Context): void;
    }
}
declare module COLLADA.Loader {
    /**
    *   An <effect> element.
    *
    */
    class Effect extends Element {
        params: EffectParam[];
        technique: EffectTechnique;
        constructor();
        static fromLink(link: Link, context: COLLADA.Context): Effect;
        /**
        *   Parses an <effect> element.
        */
        static parse(node: Node, context: Context): Effect;
        /**
        *   Parses an <effect>/<profile_COMMON> element.
        */
        static parseProfileCommon(node: Node, effect: Effect, context: Context): void;
    }
}
declare module COLLADA.Loader {
    class Material extends Element {
        effect: Link;
        constructor();
        static fromLink(link: Link, context: COLLADA.Context): Material;
        /**
        *   Parses a <material> element.
        */
        static parse(node: Node, context: Context): Material;
    }
}
declare module COLLADA.Loader {
    interface SourceData {
        length: number;
        [index: number]: any;
    }
    class Source extends Element {
        sourceId: string;
        count: number;
        stride: number;
        offset: number;
        /** Can be one of: Float32Array, Int32Array, Uint8Array, Array<string> */
        data: SourceData;
        params: {
            [x: string]: string;
        };
        constructor();
        static fromLink(link: Link, context: COLLADA.Context): Source;
        /**
        *   Parses a <source> element
        */
        static parse(node: Node, context: Context): Source;
        /**
        *   Parses a <source>/<technique_common> element
        */
        static parseSourceTechniqueCommon(node: Node, source: Source, context: Context): void;
        /**
        *   Parses a <source>/<technique_common>/<accessor> element
        */
        static parseAccessor(node: Node, source: Source, context: Context): void;
        /**
        *   Parses a <source>/<technique_common>/<accessor>/<param> element
        */
        static parseAccessorParam(node: Node, source: Source, context: Context): void;
    }
}
declare module COLLADA.Loader {
    class Input extends Element {
        /** "VERTEX", "POSITION", "NORMAL", "TEXCOORD", ... */
        semantic: string;
        /** URL of source object */
        source: UrlLink;
        /** Offset in index array */
        offset: number;
        /** Optional set identifier */
        set: number;
        constructor();
        /**
        *   Parses an <input> element.
        */
        static parse(node: Node, shared: boolean, context: Context): Input;
    }
}
declare module COLLADA.Loader {
    class Triangles extends Element {
        /** "triangles", "polylist", or "polygons" */
        type: string;
        count: number;
        /** A material "symbol", bound by <bind_material> */
        material: string;
        inputs: Input[];
        indices: Int32Array;
        vcount: Int32Array;
        constructor();
        /**
        *   Parses a <triangles> element.
        */
        static parse(node: Node, context: Context): Triangles;
    }
}
declare module COLLADA.Loader {
    class Vertices extends Element {
        inputs: Input[];
        constructor();
        static fromLink(link: Link, context: COLLADA.Context): Vertices;
        /**
        *   Parses a <vertices> element.
        */
        static parse(node: Node, context: Context): Vertices;
    }
}
declare module COLLADA.Loader {
    class Geometry extends Element {
        sources: Source[];
        vertices: Vertices[];
        triangles: Triangles[];
        constructor();
        static fromLink(link: Link, context: COLLADA.Context): Geometry;
        /**
        *   Parses a <geometry> element
        */
        static parse(node: Node, context: Context): Geometry;
        /**
        *   Parses a <geometry>/<mesh> element
        */
        static parseMesh(node: Node, geometry: Geometry, context: Context): void;
        /**
        *   Parses a <geometry>/<extra> element
        */
        static parseGeometryExtra(node: Node, geometry: Geometry, context: Context): void;
        /**
        *   Parses a <geometry>/<extra>/<technique> element
        */
        static parseGeometryExtraTechnique(node: Node, geometry: Geometry, profile: string, context: Context): void;
    }
}
declare module COLLADA.Loader {
    class Joints extends Element {
        joints: Input;
        invBindMatrices: Input;
        constructor();
        /**
        *   Parses a <joints> element.
        */
        static parse(node: Node, context: Context): Joints;
        static addInput(joints: Joints, input: Input, context: Context): void;
    }
}
declare module COLLADA.Loader {
    class VertexWeights extends Element {
        inputs: Input[];
        vcount: Int32Array;
        v: Int32Array;
        joints: Input;
        weights: Input;
        count: number;
        constructor();
        /**
        *   Parses a <vertex_weights> element.
        */
        static parse(node: Node, context: Context): VertexWeights;
        static addInput(weights: VertexWeights, input: Input, context: Context): void;
    }
}
declare module COLLADA.Loader {
    class Skin extends Element {
        source: UrlLink;
        bindShapeMatrix: Float32Array;
        sources: Source[];
        joints: Joints;
        vertexWeights: VertexWeights;
        constructor();
        /**
        *   Parses a <skin> element.
        */
        static parse(node: Node, context: Context): Skin;
    }
}
declare module COLLADA.Loader {
    class Morph extends Element {
        constructor();
        /**
        *   Parses a <morph> element.
        */
        static parse(node: Node, context: Context): Morph;
    }
}
declare module COLLADA.Loader {
    class Controller extends Element {
        skin: Skin;
        morph: Morph;
        constructor();
        static fromLink(link: Link, context: COLLADA.Context): Controller;
        /**
        *   Parses a <controller> element.
        */
        static parse(node: Node, context: Context): Controller;
    }
}
declare module COLLADA.Loader {
    class LightParam extends Element {
        value: number;
        constructor();
        /**
        *   Parses a light parameter element.
        */
        static parse(node: Node, context: Context): LightParam;
    }
}
declare module COLLADA.Loader {
    class Light extends Element {
        type: string;
        color: Float32Array;
        params: {
            [x: string]: LightParam;
        };
        constructor();
        /**
        *   Parses a <light> element.
        */
        static parse(node: Node, context: Context): Light;
        /**
        *   Parses a <light>/<technique_common> element.
        */
        static parseTechniqueCommon(node: Node, light: Light, context: Context): void;
        /**
        *   Parses a <light>/<technique_common>/(<ambient>|<directional>|<point>|<spot>) element.
        */
        static parseParams(node: Node, light: Light, profile: string, context: Context): void;
    }
}
declare module COLLADA.Loader {
    class CameraParam extends Element {
        value: number;
        constructor();
        /**
        *   Parses a camera parameter element.
        */
        static parse(node: Node, context: Context): CameraParam;
    }
}
declare module COLLADA.Loader {
    class Camera extends Element {
        type: string;
        params: {
            [x: string]: CameraParam;
        };
        constructor();
        /**
        *   Parses a <camera> element.
        */
        static parse(node: Node, context: Context): Camera;
        /**
        *   Parses a <camera>/<optics> element.
        */
        static parseOptics(node: Node, camera: Camera, context: Context): void;
        /**
        *   Parses a <camera>/<optics>/<technique_common> element.
        */
        static parseTechniqueCommon(node: Node, camera: Camera, context: Context): void;
        /**
        *   Parses a <camera>/<optics>/<technique_common>/(<orthographic>|<perspective>) element.
        */
        static parseParams(node: Node, camera: Camera, context: Context): void;
    }
}
declare module COLLADA.Loader {
    class Image extends Element {
        initFrom: string;
        constructor();
        static fromLink(link: Link, context: COLLADA.Context): Image;
        /**
        *   Parses an <image> element.
        */
        static parse(node: Node, context: Context): Image;
    }
}
declare module COLLADA.Loader {
    class InstanceCamera extends Element {
        camera: Link;
        constructor();
        /**
        *   Parses a <instance_light> element.
        */
        static parse(node: Node, parent: VisualSceneNode, context: Context): InstanceCamera;
    }
}
declare module COLLADA.Loader {
    class BindMaterial {
        /**
        *   Parses a <bind_material> element. Can be child of <instance_geometry> or <instance_controller>
        */
        static parse(node: Node, parent: InstanceMaterialContainer, context: Context): void;
        /**
        *   Parses a <instance_geometry>/<bind_material>/<technique_common> element.
        */
        static parseTechniqueCommon(node: Node, parent: InstanceMaterialContainer, context: Context): void;
    }
}
declare module COLLADA.Loader {
    interface InstanceMaterialVertexInput {
        inputSemantic: string;
        inputSet: number;
    }
    interface InstanceMaterialParam {
        target: SidLink;
    }
    interface InstanceMaterialContainer extends Element {
        materials: InstanceMaterial[];
    }
    class InstanceMaterial extends Element {
        material: UrlLink;
        symbol: string;
        /** Contains uniform parameters */
        params: {
            [x: string]: InstanceMaterialParam;
        };
        /** Contains vertex paramters */
        vertexInputs: {
            [x: string]: InstanceMaterialVertexInput;
        };
        constructor();
        /**
        *   Parses a <instance_material> element.
        */
        static parse(node: Node, parent: InstanceMaterialContainer, context: Context): InstanceMaterial;
        /**
        *   Parses a <instance_material>/<bind_vertex_input> element.
        */
        static parseBindVertexInput(node: Node, instanceMaterial: InstanceMaterial, context: Context): void;
        /**
        *   Parses a <instance_material>/<bind> element.
        */
        static parseBind(node: Node, instanceMaterial: InstanceMaterial, context: Context): void;
    }
}
declare module COLLADA.Loader {
    interface InstanceControllerContainer extends Element {
        controllers: InstanceController[];
    }
    class InstanceController extends Element {
        controller: Link;
        skeletons: Link[];
        materials: InstanceMaterial[];
        constructor();
        /**
        *   Parses a <instance_controller> element.
        */
        static parse(node: Node, parent: InstanceControllerContainer, context: Context): InstanceController;
    }
}
declare module COLLADA.Loader {
    class InstanceGeometry extends Element {
        geometry: Link;
        materials: InstanceMaterial[];
        constructor();
        /**
        *   Parses a <instance_geometry> element.
        */
        static parse(node: Node, parent: Element, context: Context): InstanceGeometry;
    }
}
declare module COLLADA.Loader {
    class InstanceLight extends Element {
        light: Link;
        constructor();
        /**
        *   Parses a <instance_light> element.
        */
        static parse(node: Node, parent: VisualSceneNode, context: Context): InstanceLight;
    }
}
declare module COLLADA.Loader {
    class NodeTransform extends Element {
        type: string;
        data: Float32Array;
        constructor();
        /**
        *   Parses a transformation element.
        */
        static parse(node: Node, parent: VisualSceneNode, context: Context): NodeTransform;
    }
}
declare module COLLADA.Loader {
    /**
    *   A <node> element (child of <visual_scene>, <library_nodes>, or another <node>).
    */
    class VisualSceneNode extends Element {
        type: string;
        layer: string;
        children: VisualSceneNode[];
        parent: Element;
        transformations: NodeTransform[];
        geometries: InstanceGeometry[];
        controllers: InstanceController[];
        lights: InstanceLight[];
        cameras: InstanceCamera[];
        constructor();
        static fromLink(link: Link, context: COLLADA.Context): VisualSceneNode;
        static registerParent(child: VisualSceneNode, parent: Element, context: Context): void;
        static parse(node: Node, context: Context): VisualSceneNode;
    }
}
declare module COLLADA.Loader {
    /**
    *   An <visual_scene> element.
    */
    class VisualScene extends Element {
        children: VisualSceneNode[];
        constructor();
        static fromLink(link: Link, context: COLLADA.Context): VisualScene;
        static parse(node: Node, context: Context): VisualScene;
    }
}
declare module COLLADA.Loader {
    class Sampler extends Element {
        input: Input;
        outputs: Input[];
        inTangents: Input[];
        outTangents: Input[];
        interpolation: Input;
        constructor();
        static fromLink(link: Link, context: COLLADA.Context): Sampler;
        /**
        *   Parses a <sampler> element.
        */
        static parse(node: Node, context: Context): Sampler;
        static addInput(sampler: Sampler, input: Input, context: Context): void;
    }
}
declare module COLLADA.Loader {
    class Channel extends Element {
        source: UrlLink;
        target: SidLink;
        constructor();
        /**
        *   Parses a <channel> element.
        */
        static parse(node: Node, parent: Animation, context: Context): Channel;
    }
}
declare module COLLADA.Loader {
    class Animation extends Element {
        parent: Animation;
        children: Animation[];
        sources: Source[];
        samplers: Sampler[];
        channels: Channel[];
        constructor();
        root(): Animation;
        /**
        *   Parses an <animation> element.
        */
        static parse(node: Node, context: Context): Animation;
    }
}
declare module COLLADA.Loader {
    class Document {
        scene: Scene;
        asset: Asset;
        libEffects: Library<Effect>;
        libMaterials: Library<Material>;
        libGeometries: Library<Geometry>;
        libControllers: Library<Controller>;
        libLights: Library<Light>;
        libCameras: Library<Camera>;
        libImages: Library<Image>;
        libVisualScenes: Library<VisualScene>;
        libAnimations: Library<Animation>;
        libNodes: Library<VisualSceneNode>;
        constructor();
        static parse(doc: XMLDocument, context: Context): Document;
        static parseCOLLADA(node: Node, context: Context): Document;
    }
}
declare module COLLADA {
    enum LogLevel {
        Debug = 1,
        Trace = 2,
        Info = 3,
        Warning = 4,
        Error = 5,
        Exception = 6,
    }
    function LogLevelToString(level: LogLevel): string;
    interface Log {
        write: (message: string, level: LogLevel) => void;
    }
    class LogCallback implements Log {
        onmessage: (message: string, level: LogLevel) => void;
        write(message: string, level: LogLevel): void;
    }
    class LogArray implements Log {
        messages: {
            message: string;
            level: LogLevel;
        }[];
        constructor();
        write(message: string, level: LogLevel): void;
    }
    class LogConsole implements Log {
        constructor();
        write(message: string, level: LogLevel): void;
    }
    class LogTextArea implements Log {
        area: HTMLTextAreaElement;
        constructor(area: HTMLTextAreaElement);
        write(message: string, level: LogLevel): void;
    }
    class LogFilter implements Log {
        level: LogLevel;
        log: Log;
        constructor(log: Log, level: LogLevel);
        write(message: string, level: LogLevel): void;
    }
}
declare module COLLADA.Loader {
    class ColladaLoader {
        onFinished: (id: string, doc: Document) => void;
        onProgress: (id: string, loaded: number, total: number) => void;
        log: Log;
        constructor();
        private _reportError(id, context);
        private _reportSuccess(id, doc, context);
        private _reportProgress(id, context);
        loadFromXML(id: string, doc: XMLDocument): Document;
        private _loadFromXML(id, doc, context);
        loadFromURL(id: string, url: string): void;
    }
}
declare module COLLADA.Converter {
    class MaterialMap {
        symbols: {
            [x: string]: Material;
        };
        constructor();
    }
    class Material {
        name: string;
        diffuse: Texture;
        specular: Texture;
        normal: Texture;
        constructor();
        static createDefaultMaterial(context: Context): Material;
        static createMaterial(instanceMaterial: Loader.InstanceMaterial, context: Context): Material;
        static getMaterialMap(instanceMaterials: Loader.InstanceMaterial[], context: Context): MaterialMap;
    }
}
declare var glMatrix: glMatrixStatic;
declare var mat3: Mat3Static;
declare var mat4: Mat4Static;
declare var vec2: Vec2Static;
declare var vec3: Vec3Static;
declare var vec4: Vec4Static;
declare var quat: QuatStatic;
declare module COLLADA {
    interface NumberArray {
        length: number;
        [index: number]: number;
    }
    class MathUtils {
        contructor(): void;
        static TO_RADIANS: number;
        static round(num: number, decimals: number): number;
        static copyNumberArray(src: NumberArray, dest: NumberArray, count: number): void;
        static copyNumberArrayOffset(src: NumberArray, srcOffset: number, dest: NumberArray, destOffset: number, count: number): void;
        /**
        * Calls the given function for each src[i*stride + offset]
        */
        static forEachElement(src: NumberArray, stride: number, offset: number, fn: (x: number) => void): void;
        /**
        * Extracts a 4D matrix from an array of matrices (stored as an array of numbers)
        */
        static mat4Extract(src: NumberArray, srcOff: number, dest: Mat4): void;
        private static _decomposeVec3;
        private static _decomposeMat3;
        private static _decomposeMat4;
        static decompose(mat: Mat4, pos: Vec3, rot: Quat, scl: Vec3): void;
        static compose(pos: Vec3, rot: Quat, scl: Vec3, mat: Mat4): void;
        static bakeTransform(mat: Mat4, scale: Vec3, rotation: Mat4, transform: Mat4): void;
        static bezier(p0: number, c0: number, c1: number, p1: number, s: number): number;
        static hermite(p0: number, t0: number, t1: number, p1: number, s: number): number;
        /**
        * Given a monotonously increasing function fn and a value target_y, finds a value x with 0<=x<=1 such that fn(x)=target_y
        */
        static bisect(target_y: number, fn: (x: number) => number, tol_y: number, max_iterations: number): number;
    }
}
declare module COLLADA.Converter {
    class Utils {
        /**
        * Re-indexes data.
        * Copies srcData[srcIndices[i*srcStride + srcOffset]] to destData[destIndices[i*destStride + destOffset]]
        *
        * Used because in COLLADA, each geometry attribute (position, normal, ...) can have its own index buffer,
        * whereas for GPU rendering, there is only one index buffer for the whole geometry.
        *
        */
        static reIndex(srcData: Float32Array, srcIndices: Uint32Array, srcStride: number, srcOffset: number, srcDim: number, destData: Float32Array, destIndices: Uint32Array, destStride: number, destOffset: number, destDim: number): void;
        /**
        * Given a list of indices stored as indices[i*stride + offset],
        * returns a similar list of indices stored as an array of consecutive numbers.
        */
        static compactIndices(indices: Uint32Array, stride: number, offset: number): Uint32Array;
        /**
        * Returns the maximum element of a list of non-negative integers
        */
        static maxIndex(indices: Uint32Array): number;
        static createFloatArray(source: Loader.Source, name: string, outDim: number, context: COLLADA.Context): Float32Array;
        static createStringArray(source: Loader.Source, name: string, outDim: number, context: COLLADA.Context): string[];
        static spawElements(array: Float32Array, i1: number, i2: number): void;
        static insertBone(indices: Float32Array, weights: Float32Array, index: number, weight: number, offsetBegin: number, offsetEnd: number): void;
        private static worldTransform;
        static getWorldTransform(context: Context): Mat4;
        private static worldInvTransform;
        static getWorldInvTransform(context: Context): Mat4;
        private static worldScale;
        static getWorldScale(context: Context): Vec3;
        private static worldInvScale;
        static getWorldInvScale(context: Context): Vec3;
        private static worldRotation;
        static getWorldRotation(context: Context): Mat4;
    }
}
declare module COLLADA.Converter {
    class Bone {
        node: Node;
        name: string;
        parent: Bone;
        invBindMatrix: Mat4;
        attachedToSkin: boolean;
        constructor(node: Node);
        clone(): Bone;
        depth(): number;
        static create(node: Node): Bone;
        /**
        * Finds the visual scene node that is referenced by the joint SID.
        * The skin element contains the skeleton root nodes.
        */
        static findBoneNode(boneSid: string, skeletonRootNodes: Loader.VisualSceneNode[], context: Context): Loader.VisualSceneNode;
        static sameInvBindMatrix(a: Bone, b: Bone, tolerance: number): boolean;
        /**
        * Returns true if the two bones can safely be merged, i.e.,
        * they reference the same scene graph node and have the same inverse bind matrix
        */
        static safeToMerge(a: Bone, b: Bone): boolean;
        /**
        * Merges the two given bones. Returns null if they cannot be merged.
        */
        static mergeBone(a: Bone, b: Bone): Bone;
    }
}
declare module COLLADA.Converter {
    class BoundingBox {
        min: Vec3;
        max: Vec3;
        constructor();
        reset(): void;
        fromPositions(p: Float32Array, offset: number, count: number): void;
        extend(p: Vec3): void;
        extendBox(b: BoundingBox): void;
    }
}
declare module COLLADA.Converter {
    class GeometryData {
        indices: Uint32Array;
        position: Float32Array;
        normal: Float32Array;
        texcoord: Float32Array;
        boneweight: Float32Array;
        boneindex: Uint8Array;
        constructor();
    }
    class GeometryChunkSourceIndices {
        /** Original indices, contained in <triangles>/<p> */
        indices: Int32Array;
        /** The stride of the original indices (number of independent indices per vertex) */
        indexStride: number;
        /** The offset of the main (position) index in the original vertices */
        indexOffset: number;
        constructor();
    }
    class GeometryChunk {
        name: string;
        /** Number of elements in the vertex buffer (i.e., number of unique vertices) */
        vertexCount: number;
        /** Number of triangles */
        triangleCount: number;
        /** Vertices for this chunk start at data.vertices[vertexBufferOffset] */
        vertexBufferOffset: number;
        /** Indices for this chunk start at data.indices[indexBufferOffset] */
        indexBufferOffset: number;
        /** Geometry data buffer */
        data: GeometryData;
        material: Material;
        boundingBox: BoundingBox;
        /** Bind shape matrix (skinned geometry only) */
        bindShapeMatrix: Mat4;
        /** Backup of the original COLLADA indices, for internal use only */
        _colladaIndices: GeometryChunkSourceIndices;
        constructor();
        /**
        * Creates a geometry chunk with its own geometry data buffers.
        *
        * This de-indexes the COLLADA data, so that it is usable by GPUs.
        */
        static createChunk(geometry: Loader.Geometry, triangles: Loader.Triangles, context: Context): GeometryChunk;
        /**
        * Computes the bounding box of the static (unskinned) geometry
        */
        static computeBoundingBox(chunk: GeometryChunk, context: Context): void;
        /**
        * Transforms the positions and normals of the given Chunk by the given matrices
        */
        static transformChunk(chunk: GeometryChunk, positionMatrix: Mat4, normalMatrix: Mat3, context: Context): void;
        /**
        * Scales the positions of the given Chunk
        */
        static scaleChunk(chunk: GeometryChunk, scale: number, context: Context): void;
        /**
        * Merges the geometric data from all the chunks into a single set of buffers.
        * The old buffers of the chunks are discarded and replaced by the new (bigger) buffers.
        * Each chunk then uses the same buffers, but uses a different portion of the buffers, according to the triangleCount and triangleOffset.
        * A single new chunk containing all the geometry is returned.
        */
        static mergeChunkData(chunks: GeometryChunk[], context: Context): void;
    }
}
declare module COLLADA.Converter {
    class Geometry {
        name: string;
        chunks: GeometryChunk[];
        private skeleton;
        boundingBox: BoundingBox;
        constructor();
        getSkeleton(): Skeleton;
        /**
        * Creates a static (non-animated) geometry
        */
        static createStatic(instanceGeometry: Loader.InstanceGeometry, node: Node, context: Context): Geometry;
        /**
        * Creates an animated (skin or morph) geometry
        */
        static createAnimated(instanceController: Loader.InstanceController, node: Node, context: Context): Geometry;
        /**
        * Creates a skin-animated geometry
        */
        static createSkin(instanceController: Loader.InstanceController, controller: Loader.Controller, context: Context): Geometry;
        static compactSkinningData(skin: Loader.Skin, weightsData: Float32Array, bonesPerVertex: number, context: Context): {
            weights: Float32Array;
            indices: Float32Array;
        };
        static getSkeletonRootNodes(skeletonLinks: Loader.Link[], context: Context): Loader.VisualSceneNode[];
        static createMorph(instanceController: Loader.InstanceController, controller: Loader.Controller, context: Context): Geometry;
        static createGeometry(geometry: Loader.Geometry, instanceMaterials: Loader.InstanceMaterial[], context: Context): Geometry;
        /**
        * Transforms the given geometry (position and normals) by the given matrix
        */
        static transformGeometry(geometry: Geometry, transformMatrix: Mat4, context: Context): void;
        /**
        * Adapts inverse bind matrices to account for any additional transformations due to the world transform
        */
        static setupWorldTransform(geometry: Geometry, context: Context): void;
        /**
        * Scales the given geometry
        */
        static scaleGeometry(geometry: Geometry, scale: number, context: Context): void;
        /**
        * Applies the bind shape matrix to the given geometry.
        *
        * This transforms the geometry by the bind shape matrix, and resets the bind shape matrix to identity.
        */
        static applyBindShapeMatrices(geometry: Geometry, context: Context): void;
        /**
        * Computes the bounding box of the static (unskinned) geometry
        */
        static computeBoundingBox(geometry: Geometry, context: Context): void;
        static addSkeleton(geometry: Geometry, node: Node, context: Context): void;
        /**
        * Moves all data from given geometries into one merged geometry.
        * The original geometries will be empty after this operation (lazy design to avoid data duplication).
        */
        static mergeGeometries(geometries: Geometry[], context: Context): Geometry;
        /**
        * Set the new skeleton for the given geometry.
        * Changes all vertex bone indices so that they point to the given skeleton bones, instead of the current geometry.skeleton bones
        */
        static setSkeleton(geometry: Geometry, skeleton: Skeleton, context: Context): void;
    }
}
declare module COLLADA.Converter {
    interface AnimationTarget {
        applyAnimation(channel: AnimationChannel, time: number, context: COLLADA.Context): void;
        registerAnimation(channel: AnimationChannel): void;
        getTargetDataRows(): number;
        getTargetDataColumns(): number;
    }
    class AnimationTimeStatistics {
        beginTime: Statistics;
        endTime: Statistics;
        duration: Statistics;
        keyframes: Statistics;
        fps: Statistics;
        constructor();
        addDataPoint(beginTime: number, endTime: number, keyframes: number): void;
    }
    class Statistics {
        data: number[];
        sorted: boolean;
        constructor();
        addDataPoint(value: number): void;
        private sort();
        private compute(fn);
        count(): number;
        min(): number;
        max(): number;
        median(): number;
        sum(): number;
        mean(): number;
    }
    class Animation {
        id: string;
        name: string;
        channels: AnimationChannel[];
        constructor();
        static create(animation: Loader.Animation, context: Context): Animation;
        static addChannelsToAnimation(collada_animation: Loader.Animation, converter_animation: Animation, context: Context): void;
        /**
        * Returns the time and fps statistics of this animation
        */
        static getTimeStatistics(animation: Animation, index_begin: number, index_end: number, result: AnimationTimeStatistics, context: Context): void;
    }
}
declare module COLLADA.Converter {
    interface AnimationChannelIndices {
        /** left index */
        i0: number;
        /** right index */
        i1: number;
    }
    class AnimationChannel {
        target: AnimationTarget;
        interpolation: string[];
        input: Float32Array;
        output: Float32Array;
        inTangent: Float32Array;
        outTangent: Float32Array;
        dataOffset: number;
        dataCount: number;
        constructor();
        findInputIndices(t: number, context: Context): AnimationChannelIndices;
        static createInputData(input: Loader.Input, inputName: string, dataDim: number, context: Context): Float32Array;
        static createInputDataFromArray(inputs: Loader.Input[], inputName: string, dataDim: number, context: Context): Float32Array;
        static create(channel: Loader.Channel, context: Context): AnimationChannel;
        static interpolateLinear(time: number, t0: number, t1: number, i0: number, i1: number, dataCount: number, dataOffset: number, channel: AnimationChannel, destData: Float32Array): void;
        static interpolateBezier(time: number, t0: number, t1: number, i0: number, i1: number, dataCount: number, dataOffset: number, channel: AnimationChannel, destData: Float32Array): void;
        static interpolateHermite(time: number, t0: number, t1: number, i0: number, i1: number, dataCount: number, dataOffset: number, channel: AnimationChannel, destData: Float32Array): void;
        static applyToData(channel: AnimationChannel, destData: Float32Array, time: number, context: Context): void;
    }
}
declare module COLLADA.Converter {
    enum TransformType {
        Translation = 1,
        Rotation = 2,
        Scale = 3,
    }
    class Transform {
        data: Float32Array;
        original_data: Float32Array;
        rows: number;
        colums: number;
        channels: AnimationChannel[];
        constructor(transform: Loader.NodeTransform, rows: number, columns: number);
        getTargetDataRows(): number;
        getTargetDataColumns(): number;
        applyAnimation(channel: AnimationChannel, time: number, context: Context): void;
        registerAnimation(channel: AnimationChannel): void;
        isAnimated(): boolean;
        isAnimatedBy(animation: Animation): boolean;
        resetAnimation(): void;
        applyTransformation(mat: Mat4): void;
        updateFromData(): void;
        hasTransformType(type: TransformType): boolean;
    }
    class TransformMatrix extends Transform implements AnimationTarget {
        matrix: Mat4;
        constructor(transform: Loader.NodeTransform);
        updateFromData(): void;
        applyTransformation(mat: Mat4): void;
        hasTransformType(type: TransformType): boolean;
    }
    class TransformRotate extends Transform implements AnimationTarget {
        /** Source data: axis */
        axis: Vec3;
        /** Source data: angle */
        radians: number;
        constructor(transform: Loader.NodeTransform);
        updateFromData(): void;
        applyTransformation(mat: Mat4): void;
        hasTransformType(type: TransformType): boolean;
    }
    class TransformTranslate extends Transform implements AnimationTarget {
        /** Source data: translation */
        pos: Vec3;
        constructor(transform: Loader.NodeTransform);
        updateFromData(): void;
        applyTransformation(mat: Mat4): void;
        hasTransformType(type: TransformType): boolean;
    }
    class TransformScale extends Transform implements AnimationTarget {
        /** Source data: scaling */
        scl: Vec3;
        constructor(transform: Loader.NodeTransform);
        updateFromData(): void;
        applyTransformation(mat: Mat4): void;
        hasTransformType(type: TransformType): boolean;
    }
}
declare module COLLADA.Converter {
    class Node {
        name: string;
        parent: Node;
        children: Node[];
        geometries: Geometry[];
        transformations: Transform[];
        transformation_pre: Mat4;
        transformation_post: Mat4;
        matrix: Mat4;
        worldMatrix: Mat4;
        initialLocalMatrix: Mat4;
        initialWorldMatrix: Mat4;
        constructor();
        addTransform(mat: Mat4): void;
        /**
        * Returns the world transformation matrix of this node
        */
        getWorldMatrix(context: Context): Mat4;
        /**
        * Returns the local transformation matrix of this node
        */
        getLocalMatrix(context: Context): Mat4;
        /**
        * Returns true if this node contains any scene graph items (geometry, lights, cameras, ...)
        */
        containsSceneGraphItems(): boolean;
        /**
        * Returns whether there exists any animation that targets the transformation of this node
        */
        isAnimated(recursive: boolean): boolean;
        /**
        * Returns whether there the given animation targets the transformation of this node
        */
        isAnimatedBy(animation: Animation, recursive: boolean): boolean;
        resetAnimation(): void;
        /**
        * Removes all nodes from that list that are not relevant for the scene graph
        */
        static pruneNodes(nodes: Node[], context: COLLADA.Context): void;
        /**
        * Recursively creates a converter node tree from the given collada node root node
        */
        static createNode(node: Loader.VisualSceneNode, parent: Node, context: Context): Node;
        static updateInitialMatrices(node: Node, context: Context): void;
        static createNodeData(converter_node: Node, context: Context): void;
        /**
        * Calls the given function for all given nodes and their children (recursively)
        */
        static forEachNode(nodes: Node[], fn: (node: Node) => void): void;
        /**
        * Extracts all geometries in the given scene and merges them into a single geometry.
        * The geometries are detached from their original nodes in the process.
        */
        static extractGeometries(scene_nodes: Node[], context: Context): Geometry[];
        static setupWorldTransform(node: Node, context: Context): void;
    }
}
declare module COLLADA.Converter {
    class Texture {
        id: string;
        url: string;
        constructor(img: Loader.Image);
        static createTexture(colorOrTexture: Loader.ColorOrTexture, context: Context): Texture;
    }
}
declare module COLLADA.Converter {
    /**
    * A map that maps various COLLADA objects to converter objects
    *
    * The converter does not store direct references to COLLADA objects,
    * so that the old COLLADA document can be garbage collected.
    */
    class ObjectMap<ColladaType, ConverterType> {
        collada: ColladaType[];
        converter: ConverterType[];
        constructor();
        register(collada: ColladaType, converter: ConverterType): void;
        findConverter(collada: ColladaType): ConverterType;
        findCollada(converter: ConverterType): ColladaType;
    }
    class Context extends COLLADA.Context {
        materials: ObjectMap<Loader.Material, Material>;
        textures: ObjectMap<Loader.Image, Texture>;
        nodes: ObjectMap<Loader.VisualSceneNode, Node>;
        animationTargets: ObjectMap<Loader.Element, AnimationTarget>;
        log: Log;
        options: Options;
        messageCount: {
            [x: string]: number;
        };
        constructor(log: Log, options: Options);
    }
}
declare module COLLADA.Converter {
    interface Option {
        type: string;
        title: string;
        value: any;
        description: string;
    }
    class OptionBool implements Option {
        type: string;
        title: string;
        value: boolean;
        description: string;
        constructor(title: string, defaultValue: boolean, description: string);
    }
    class OptionFloat implements Option {
        type: string;
        title: string;
        value: number;
        min: number;
        max: number;
        description: string;
        constructor(title: string, defaultValue: number, min: number, max: number, description: string);
    }
    class OptionSelect implements Option {
        type: string;
        title: string;
        value: string;
        description: string;
        options: string[];
        constructor(title: string, defaultValue: string, options: string[], description: string);
    }
    class OptionArray<T> implements Option {
        type: string;
        title: string;
        value: T[];
        description: string;
        constructor(title: string, defaultValue: T[], description: string);
    }
    class Options {
        singleAnimation: OptionBool;
        singleGeometry: OptionBool;
        singleBufferPerGeometry: OptionBool;
        enableAnimations: OptionBool;
        useAnimationLabels: OptionBool;
        enableExtractGeometry: OptionBool;
        enableResampledAnimations: OptionBool;
        animationLabels: OptionArray<AnimationLabel>;
        animationFps: OptionFloat;
        removeConstAnimationTracks: OptionBool;
        applyBindShape: OptionBool;
        removeTexturePath: OptionBool;
        sortBones: OptionBool;
        truncateResampledAnimations: OptionBool;
        worldTransform: OptionBool;
        worldTransformBake: OptionBool;
        worldTransformUnitScale: OptionBool;
        worldTransformScale: OptionFloat;
        worldTransformRotationAxis: OptionSelect;
        worldTransformRotationAngle: OptionFloat;
        createSkeleton: OptionBool;
        constructor();
    }
}
declare module COLLADA.Converter {
    class Skeleton {
        /** All bones */
        bones: Bone[];
        constructor(bones: Bone[]);
        /**
        * In the given list, finds a bone that can be merged with the given bone
        */
        static findBone(bones: Bone[], bone: Bone): Bone;
        /**
        * Find the parent bone of the given bone
        */
        static findParent(bones: Bone[], bone: Bone): Bone;
        static checkConsistency(skeleton: Skeleton, context: Context): void;
        /**
        * Creates a skeleton from a skin
        */
        static createFromSkin(jointSids: string[], skeletonRootNodes: Loader.VisualSceneNode[], bindShapeMatrix: Mat4, invBindMatrices: Float32Array, context: Context): Skeleton;
        /**
        * Creates a skeleton from a node
        */
        static createFromNode(node: Node, context: Context): Skeleton;
        static replaceBone(bones: Bone[], index: number, bone: Bone): Bone[];
        /**
        * Add a bone to the list of bones, merging bones where possible
        */
        static mergeBone(bones: Bone[], bone: Bone): Bone[];
        /**
        * Merges the two skeletons
        */
        static mergeSkeletons(skeleton1: Skeleton, skeleton2: Skeleton, context: Context): Skeleton;
        /**
        * Assembles a list of skeleton root nodes
        */
        static getSkeletonRootNodes(skeletonLinks: Loader.Link[], context: Context): Loader.VisualSceneNode[];
        /**
        * Find the parent for each bone
        * The skeleton(s) may contain more bones than referenced by the skin
        * This function also adds all bones that are not referenced but used for the skeleton transformation
        */
        static addBoneParents(skeleton: Skeleton, context: Context): Skeleton;
        /**
        * Given two arrays a and b, such that each bone from a is contained in b,
        * compute a map that maps the old index (a) of each bone to the new index (b).
        */
        static getBoneIndexMap(a: Skeleton, b: Skeleton): Uint32Array;
        /**
        * Sorts bones so that child bones appear after their parents in the list.
        */
        static sortBones(skeleton: Skeleton, context: Context): Skeleton;
        /**
        * Returns true if the bones are sorted so that child bones appear after their parents in the list.
        */
        static bonesSorted(bones: Bone[]): boolean;
    }
}
declare module COLLADA.Converter {
    interface AnimationLabel {
        name: string;
        begin: number;
        end: number;
        fps: number;
    }
    class AnimationDataTrack {
        /** Position (relative to parent) */
        pos: Float32Array;
        /** Rotation (relative to parent) */
        rot: Float32Array;
        /** Scale (relative to parent) */
        scl: Float32Array;
        /** Position (relative to rest pose) */
        rel_pos: Float32Array;
        /** Rotation (relative to rest pose) */
        rel_rot: Float32Array;
        /** Scale (relative to rest pose) */
        rel_scl: Float32Array;
        constructor();
    }
    class AnimationData {
        name: string;
        duration: number;
        keyframes: number;
        fps: number;
        original_fps: number;
        tracks: AnimationDataTrack[];
        constructor();
        static create(skeleton: Skeleton, animation: Animation, index_begin: number, index_end: number, fps: number, context: Context): AnimationData;
        static createFromLabels(skeleton: Skeleton, animation: Animation, labels: AnimationLabel[], context: Context): AnimationData[];
    }
}
declare module COLLADA.Converter {
    class Document {
        /** The scene graph */
        nodes: Node[];
        /** Animations (all original animation curves) */
        animations: Animation[];
        /** Animations (resampled node animations) */
        resampled_animations: AnimationData[];
        /** Geometries (detached from the scene graph) */
        geometries: Geometry[];
        constructor();
    }
}
declare module COLLADA.Converter {
    class ColladaConverter {
        log: Log;
        options: Options;
        constructor();
        private forEachGeometry(doc, fn);
        convert(doc: Loader.Document): Document;
        static createScene(doc: Loader.Document, context: Context): Node[];
        static createAnimations(doc: Loader.Document, context: Context): Animation[];
        static createResampledAnimations(doc: Loader.Document, file: Document, context: Context): AnimationData[];
    }
}
declare module COLLADA.Exporter {
    /**
    * An axis aligned bounding box
    */
    interface BoundingBoxJSON {
        min: number[];
        max: number[];
    }
    interface InfoJSON {
        /** Bounding box of the whole geometry */
        bounding_box: BoundingBoxJSON;
    }
    /**
    * An array of numbers, stored as a chunk of binary data
    */
    interface DataChunkJSON {
        /** One of: float, double, uint8, int8, uint16, int16, uint32, int32 */
        type: string;
        /** Offset (in bytes) in the global data buffer */
        byte_offset: number;
        /** Number of values per element (e.g., a 4D vector has stride 4) */
        stride: number;
        /** Number of elements in this chunk */
        count: number;
    }
    /**
    * Material
    */
    interface MaterialJSON {
        /** Name of the material */
        name: string;
        /** Diffuse texture */
        diffuse: string;
        /** Specular texture */
        specular: string;
        /** Normal map */
        normal: string;
    }
    /**
    * A geometry chunk.
    */
    interface GeometryJSON {
        /** Name of this part */
        name: string;
        /** Material index */
        material: number;
        /** Total number of vertices */
        vertex_count: number;
        /** Total number of triangles */
        triangle_count: number;
        /** 3 uint16 elements per triangle */
        indices: DataChunkJSON;
        /** 3 float32 elements per vertex */
        position: DataChunkJSON;
        /** 3 float32 elements per vertex */
        normal: DataChunkJSON;
        /** 2 float32 elements per vertex */
        texcoord: DataChunkJSON;
        /** 4 float32 elements per vertex */
        boneweight: DataChunkJSON;
        /** 4 uint8 elements per vertex */
        boneindex: DataChunkJSON;
        /** Bounding box of this chunk */
        bounding_box: BoundingBoxJSON;
    }
    /**
    * A bone for skin animated meshes
    */
    interface BoneJSON {
        /** Bone name */
        name: string;
        /** Parent bone index */
        parent: number;
        /** Indicates whether this bone is used by the geometry */
        skinned: boolean;
        /** Inverse bind matrix */
        inv_bind_mat: number[];
        /** Rest pose position (3D vector) */
        pos: number[];
        /** Rest pose rotation (quaternion) */
        rot: number[];
        /** Rest pose scale (3D vector) */
        scl: number[];
    }
    /**
    * An animation track (one track for each bone)
    * Contains uniformely sampled keyframes
    */
    interface AnimationTrackJSON {
        /** Index of the bone that is targeted by this track */
        bone: number;
        /** Position vectors (3 values per frame) */
        pos: DataChunkJSON;
        /** Rotation quaternions (4 values per frame) */
        rot: DataChunkJSON;
        /** Scale vectors (4 values per frame) */
        scl: DataChunkJSON;
    }
    /**
    * An animation
    */
    interface AnimationJSON {
        /** Animation name */
        name: string;
        /** Number of keyframes */
        frames: number;
        /** Default playback speed (frames per second) */
        fps: number;
        /** Animation tracks (one per bone) */
        tracks: AnimationTrackJSON[];
    }
    interface DocumentJSON {
        info: InfoJSON;
        materials: MaterialJSON[];
        chunks: GeometryJSON[];
        bones: BoneJSON[];
        animations: AnimationJSON[];
        /** Base64 encoded binary data, optional */
        data?: string;
    }
}
declare module COLLADA.Exporter {
    class Utils {
        static stringToBuffer(str: string): Uint8Array;
        static bufferToString(buf: Uint8Array): string;
        static bufferToDataURI(buf: Uint8Array, mime?: string): string;
        static bufferToBlobURI(buf: Uint8Array, mime?: string): string;
        static jsonToDataURI(json: any, mime?: string): string;
        static jsonToBlobURI(json: any, mime?: string): string;
    }
}
declare module COLLADA.Exporter {
    class Document {
        json: DocumentJSON;
        data: Uint8Array;
        constructor();
    }
}
declare module COLLADA.Exporter {
    class DataChunk {
        data: any;
        type: string;
        byte_offset: number;
        stride: number;
        count: number;
        bytes_per_element: number;
        constructor();
        getDataView(): Uint8Array;
        getBytesCount(): number;
        static toJSON(chunk: DataChunk): DataChunkJSON;
        static create(data: any, stride: number, context: Context): DataChunk;
    }
}
declare module COLLADA.Exporter {
    class Context extends COLLADA.Context {
        log: Log;
        chunks: DataChunk[];
        chunk_data: Uint8Array[];
        bytes_written: number;
        constructor(log: Log);
        registerChunk(chunk: DataChunk): void;
        assembleData(): Uint8Array;
    }
}
declare module COLLADA.Exporter {
    class Material {
        static toJSON(material: Converter.Material, context: Context): MaterialJSON;
    }
}
declare module COLLADA.Exporter {
    class BoundingBox {
        static toJSON(box: Converter.BoundingBox): BoundingBoxJSON;
    }
    class Geometry {
        static toJSON(chunk: Converter.GeometryChunk, material_index: number, context: Context): GeometryJSON;
    }
}
declare module COLLADA.Exporter {
    class Skeleton {
        static toJSON(skeleton: Converter.Skeleton, context: Context): BoneJSON[];
    }
}
declare module COLLADA.Exporter {
    class AnimationTrack {
        static toJSON(track: Converter.AnimationDataTrack, index: number, context: Context): AnimationTrackJSON;
    }
}
declare module COLLADA.Exporter {
    class Animation {
        static toJSON(animation: Converter.AnimationData, context: Context): AnimationJSON;
    }
}
declare module COLLADA.Exporter {
    class ColladaExporter {
        log: Log;
        constructor();
        export(doc: Converter.Document): Document;
    }
}
declare module COLLADA.Threejs {
    class Context extends COLLADA.Context {
        log: Log;
        mat_tol: number;
        pos_tol: number;
        scl_tol: number;
        rot_tol: number;
        uvs_tol: number;
        nrm_tol: number;
        constructor(log: Log);
    }
}
declare module COLLADA.Threejs {
    class Material {
        static toJSON(material: Converter.Material, context: Context): any;
    }
}
declare module COLLADA.Threejs {
    class Bone {
        static toJSON(skeleton: Converter.Skeleton, bone: Converter.Bone, context: Context): any;
    }
}
declare module COLLADA.Threejs {
    class Animation {
        static toJSON(animation: Converter.AnimationData, bones: Converter.Bone[], threejsBones: any[], context: Context): any;
    }
}
declare module COLLADA.Threejs {
    class ThreejsExporter {
        log: Log;
        constructor();
        export(doc: Converter.Document): any;
    }
}
