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
        truncateResampledAnimations: OptionBool;
        worldTransform: OptionBool;
        worldTransformBake: OptionBool;
        worldTransformUnitScale: OptionBool;
        worldTransformScale: OptionFloat;
        worldTransformRotationAxis: OptionSelect;
        worldTransformRotationAngle: OptionFloat;
        createSkeleton: OptionBool;

        constructor() {
            this.singleAnimation = new OptionBool("Single animation", true,
                "Enabled: all animations are merged into a single animation (useful if each bone has a separate top level animation).<br/>" +
                "Disabled: animations are not merged.");
            this.singleGeometry = new OptionBool("Single geometry", true,
                "Enabled: all geometries are merged into a single geometry. Only has an effect if 'enableExtractGeometry' is enabled.<br/>" +
                "Disabled: geometries are not merged.");
            this.singleBufferPerGeometry = new OptionBool("Single buffer", false,
                "Enabled: all chunks within one geometry use one set of vertex buffers, each chunk occupying a different part of the buffer set.<br/>" +
                "Disabled: each chunk has its own set of buffers.");
            this.enableAnimations = new OptionBool("Animations", true,
                "Enabled: animations are exported.<br/>" +
                "Disabled: all animations are ignored.");
            this.enableExtractGeometry = new OptionBool("Extract geometry", true,
                "Enabled: extract all geometries from the scene and detach them from their scene graph nodes.<br/>" +
                "Disabled: geometries remain attached to nodes.");
            this.enableResampledAnimations = new OptionBool("Resampled animations", true,
                "Enabled: generate resampled animations for all skeleton bones.<br/>" +
                "Disabled: do not generate resampled animations.");
            this.useAnimationLabels = new OptionBool("Animation labels", false,
                "Enabled: animations labels are used to split the global animation into separete animations.<br/>" +
                "Disabled: only one global animation is exported.");
            this.animationLabels = new OptionArray<COLLADA.Converter.AnimationLabel>("Animation labels", [],
                "An array of animation labels ({name, begin, end, fps)} that describes how the global animation is split.<br/>" +
                "Only has an effect if 'useAnimationLabels' is enabled.");
            this.animationFps = new OptionFloat("Animation samples per second", 10, 0, 100,
                "Default FPS for resampled animations.");
            this.removeConstAnimationTracks = new OptionBool("Remove static animations", true,
                "Enabled: animation tracks are removed if they only contain the rest pose transformation for all times.<br/>" +
                "Disabled: all animation tracks are exported.");
            this.applyBindShape = new OptionBool("Apply bind shape", true,
                "Enabled: the positions and normals of skin-animated meshes are pre-multiplied by the bind shape matrix.<br/>" +
                "Disabled: the bind shape matrix needs to be manually exported and applied during rendering.");
            this.removeTexturePath = new OptionBool("Remove texture path", true,
                "Enabled: only the filename and extension of textures are kept and the remaining path is discarded.<br/>" +
                "Disabled: original texture paths are kept.");
            this.sortBones = new OptionBool("Sort bones", true,
                "Enabled: bones are sorted so that child bones always appear after their parent bone in the list of bones.<br/>" +
                "Disabled: bones appear in their original order.");
            this.worldTransform = new OptionBool("World transform", false,
                "Enabled: all objects (geometries, animations, skeletons) are transformed as specified by the corresponding world transform options.<br/>" +
                "Disabled: the world transform options are ignored.");
            this.worldTransformBake = new OptionBool("Bake world transform", true,
                "Enabled: the world transformation is applied to skinned geometry.<br/>" +
                "Disabled: the world transformation is applied to the bones.");
            this.worldTransformUnitScale = new OptionBool("World transform no node scale", true,
                "If enabled, the world scale will not add any scaling transformation to any nodes." +
                "The world scale will instead be distributed to the translation part of all local transformations.");
            this.worldTransformScale = new OptionFloat("World transform: scale", 1.0, 1e-6, 1e6,
                "Scale factor. See the 'worldTransform' option.");
            this.worldTransformRotationAxis = new OptionSelect("World transform: rotation axis", "none", ["none", "x", "y", "z"],
                "Rotation axis. See the 'worldTransform' option.");
            this.worldTransformRotationAngle = new OptionFloat("World transform: rotation angle", 0, 0, 360,
                "Rotation angle (in degrees). See the 'worldTransform' option.");
            this.truncateResampledAnimations = new OptionBool("Truncate resampled animations", true,
                "Enabled: animation durations are truncated in order to keep the requested FPS.<br/>" +
                "Disabled: requested FPS is slightly modified to keep the original duration.");
            this.createSkeleton = new OptionBool("Generate skeleton", true,
                "Enabled: a skeleton is generated and all geometry is attached to skeleton bones.<br/>" +
                "Disabled: no skeleton is generated and all geometry is static.");
        }

    }
}