module COLLADA.Converter {

    export interface Option {
        type: string;
        title: string;
        value: any;
        description: string;
    }

    export class OptionBool implements Option {
        type: string;
        title: string;
        value: boolean;
        description: string;

        constructor(title: string, defaultValue: boolean, description: string) {
            this.type = "boolean";
            this.title = title;
            this.value = defaultValue;
            this.description = description;
        }
    }

    export class OptionFloat implements Option {
        type: string;
        title: string;
        value: number;
        min: number;
        max: number;
        description: string;

        constructor(title: string, defaultValue: number, min: number, max: number, description: string) {
            this.type = "number";
            this.title = title;
            this.value = defaultValue;
            this.min = min;
            this.max = max;
            this.description = description;
        }
    }

    export class OptionSelect implements Option {
        type: string;
        title: string;
        value: string;
        description: string;
        options: string[]

        constructor(title: string, defaultValue: string, options: string[], description: string) {
            this.type = "select";
            this.title = title;
            this.value = defaultValue;
            this.options = options;
            this.description = description;
        }
    }

    export class OptionArray<T> implements Option {
        type: string;
        title: string;
        value: T[];
        description: string;

        constructor(title: string, defaultValue: T[], description: string) {
            this.type = "array";
            this.title = title;
            this.value = defaultValue;
            this.description = description;
        }
    }

    export class Options {
        singleAnimation: OptionBool;
        singleGeometry: OptionBool;
        singleBufferPerGeometry: OptionBool;
        enableAnimations: OptionBool;
        useAnimationLabels: OptionBool;
        enableExtractGeometry: OptionBool;
        enableResampledAnimations: OptionBool;
        animationLabels: OptionArray<COLLADA.Converter.AnimationLabel>;
        animationFps: OptionFloat;
        removeConstAnimationTracks: OptionBool;
        applyBindShape: OptionBool;
        removeTexturePath: OptionBool;
        sortBones: OptionBool;
        worldTransform: OptionBool;
        worldTransformBake: OptionBool;
        worldTransformUnitScale: OptionBool;
        worldTransformScale: OptionFloat;
        worldTransformRotationAxis: OptionSelect;
        worldTransformRotationAngle: OptionFloat;

        constructor() {
            this.singleAnimation = new OptionBool("Single animation", true,
                "If enabled, all animations are merged into a single animation. Enable if each bone has a separate top level animation.");
            this.singleGeometry = new OptionBool("Single geometry", true,
                "If enabled, all geometries are merged into a single geometry. Only has an effect if 'enableExtractGeometry' is enabled.");
            this.singleBufferPerGeometry = new OptionBool("Single buffer", false,
                "If enabled, all chunks within one geometry use one set of vertex buffers, each chunk occupying a different part of each buffer.");
            this.enableAnimations = new OptionBool("Animations", true,
                "If enabled, animations are exported. Otherwise, all animations are ignored.");
            this.enableExtractGeometry = new OptionBool("Extract geometry", true,
                "If enabled, extracts all geometries from the scene and detaches them from their scene graph nodes. Otherwise, geometries remain attached to nodes.");
            this.enableResampledAnimations = new OptionBool("Resampled animations", true,
                "If enabled, generates resampled animations for all skeleton bones.");
            this.useAnimationLabels = new OptionBool("Animation labels", false,
                "If enabled, animations labels are used to split the global animation into separete animations.");
            this.animationLabels = new OptionArray<COLLADA.Converter.AnimationLabel>("Animation labels", [],
                "An array of animation labels ({name, begin, end, fps)} that describes how the global animation is split. Only has an effect if 'useAnimationLabels' is enabled.");
            this.animationFps = new OptionFloat("Animation samples per second", 10, 0, 100,
                "Default FPS for resampled animations.");
            this.removeConstAnimationTracks = new OptionBool("Remove static animations", true,
                "If enabled, animation tracks are removed if they only contain the rest pose transformation for all times.");
            this.applyBindShape = new OptionBool("Apply bind shape", true,
                "If enabled, the positions and normals of skin-animated meshes are pre-multiplied by the bind shape matrix.");
            this.removeTexturePath = new OptionBool("Remove texture path", true,
                "If enabled, only the filename and extension of textures are kept and the remaining path is discarded.");
            this.sortBones = new OptionBool("Sort bones", true,
                "If enabled, bones are sorted so that child bones always appear after their parent bone in the list of bones.");
            this.worldTransform = new OptionBool("World transform", false,
                "If enabled, all objects (geometries, animations, skeletons) are transformed as specified by the corresponding options.");
            this.worldTransformBake = new OptionBool("Bake world transform", true,
                "If enabled, the world transformation is applied to skinned geometry. Otherwise, it is only applied to the bones.");
            this.worldTransformUnitScale = new OptionBool("World transform no node scale", true,
                "If enabled, the world scale will not add any scaling transformation to any nodes. The world scale will instead be distributed to the translation part of all local transformations.");
            this.worldTransformScale = new OptionFloat("World transform: scale", 1.0, 1e-6, 1e6,
                "Scale factor. See the 'worldTransform' option.");
            this.worldTransformRotationAxis = new OptionSelect("World transform: rotation axis", "none", ["none", "x", "y", "z"],
                "Rotation axis. See the 'worldTransform' option.");
            this.worldTransformRotationAngle = new OptionFloat("World transform: rotation angle", 0, 0, 360,
                "Rotation angle (in degrees). See the 'worldTransform' option.");
        }

    }
}