var COLLADA;
(function (COLLADA) {
    var Context = (function () {
        function Context() {
        }
        Context.prototype.isInstanceOf = function (el, typeName) {
            return el._className.indexOf("|" + typeName + "|") > -1;
        };
        return Context;
    })();
    COLLADA.Context = Context;
})(COLLADA || (COLLADA = {}));
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var Utils = (function () {
            function Utils() {
            }
            Utils.forEachChild = function (node, fn) {
                var childNodes = node.childNodes;
                var childNodesLength = childNodes.length;
                for (var i = 0; i < childNodesLength; i++) {
                    var child = childNodes[i] || childNodes.item(i);
                    // Skip text content
                    if (child.nodeType !== 1)
                        continue;
                    // Callback for child node
                    fn(child);
                }
            };
            return Utils;
        })();
        Loader.Utils = Utils;
        ;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="utils.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        /**
        * Base class for all links within a collada document
        */
        var Link = (function () {
            function Link() {
                this.target = null;
            }
            Link.prototype.getUrl = function () {
                throw new Error("not implemented");
            };
            Link.prototype.resolve = function (context) {
                throw new Error("not implemented");
            };
            return Link;
        })();
        Loader.Link = Link;
        ;
        /**
        *   COLLADA URL addressing
        *
        *   See chapter 3, section "Adress Syntax"
        *   Uses XML ids that are unique within the whole document.
        *   Hyperlinks to ids start with a hash.
        *   <element id="xyz">
        *   <element source="#xyz">
        */
        var UrlLink = (function (_super) {
            __extends(UrlLink, _super);
            function UrlLink(url) {
                _super.call(this);
                this.url = url.trim().replace(/^#/, "");
            }
            UrlLink.prototype.getUrl = function () {
                return this.url;
            };
            UrlLink.prototype.resolve = function (context) {
                // IDs are globally unique
                var object = context.ids[this.url];
                if (object != null) {
                    this.target = object;
                }
                else {
                    context.log.write("Could not find URL target with URL " + this.url, 3 /* Warning */);
                }
            };
            return UrlLink;
        })(Link);
        Loader.UrlLink = UrlLink;
        ;
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
        var FxLink = (function (_super) {
            __extends(FxLink, _super);
            function FxLink(url, scope) {
                _super.call(this);
                this.url = url;
                this.scope = scope;
            }
            FxLink.prototype.getUrl = function () {
                return this.url;
            };
            FxLink.prototype.resolve = function (context) {
                var scope = this.scope;
                var object = null;
                while ((object == null) && (scope != null)) {
                    object = scope.fxChildren[this.url];
                    scope = scope.fxParent;
                }
                if (object != null) {
                    this.target = object;
                }
                else {
                    context.log.write("Could not find FX target with URL " + this.url, 3 /* Warning */);
                }
                ;
            };
            return FxLink;
        })(Link);
        Loader.FxLink = FxLink;
        /**
        *   COLLADA SID addressing
        *
        *   See chapter 3, section "Adress Syntax"
        *   Uses scoped ids that are unique within the parent element.
        *   Adresses are anchored at a globally unique id and have a path of scoped ids.
        *   <elementA id="xyz"><elementB sid="abc"></elementB></elementA>
        *   <element target="xyz/abc">
        */
        var SidLink = (function (_super) {
            __extends(SidLink, _super);
            function SidLink(url, parentId) {
                _super.call(this);
                this._parseUrl = function () {
                    var parts = this.url.split("/");
                    // Part 1: element id
                    this.id = parts.shift();
                    if (this.id === ".") {
                        this.id = this.parentId;
                    }
                    while (parts.length > 1) {
                        this.sids.push(parts.shift());
                    }
                    // Part 3: last sid
                    if (parts.length > 0) {
                        var lastSid = parts[0];
                        var dotSyntax = lastSid.indexOf(".") >= 0;
                        var arrSyntax = lastSid.indexOf("(") >= 0;
                        if (dotSyntax) {
                            parts = lastSid.split(".");
                            this.sids.push(parts.shift());
                            this.member = parts.shift();
                            this.dotSyntax = true;
                        }
                        else if (arrSyntax) {
                            var arrIndices = lastSid.split("(");
                            this.sids.push(arrIndices.shift());
                            this.indices = [];
                            var index;
                            for (var i = 0, len = arrIndices.length; i < len; i++) {
                                index = arrIndices[i];
                                this.indices.push(parseInt(index.replace(/\)/, ""), 10));
                            }
                            this.arrSyntax = true;
                        }
                        else {
                            this.sids.push(lastSid);
                        }
                    }
                };
                this.url = url;
                this.id = null;
                this.parentId = parentId;
                this.sids = [];
                this.member = null;
                this.indices = [];
                this.dotSyntax = false;
                this.arrSyntax = false;
                this._parseUrl();
            }
            SidLink.prototype.getUrl = function () {
                return this.url;
            };
            /**
            *   Find the SID target given by the URL (array of sid parts).
            *
            *   @param url The complete URL, for debugging only
            *   @param root Root element, where the search starts.
            *   @param sids SID parts.
            *   @returns The collada element the URL points to, or an error why it wasn't found
            */
            SidLink.findSidTarget = function (url, root, sids, context) {
                if (root == null) {
                    context.log.write("Could not resolve SID target " + sids.join("/") + ", missing root element", 3 /* Warning */);
                    return null;
                }
                var parentObject = root;
                var childObject = null;
                for (var i = 0, ilen = sids.length; i < ilen; i++) {
                    var sid = sids[i];
                    // Initialize a queue for the search
                    var queue = [parentObject];
                    while (queue.length !== 0) {
                        // Get front of search queue
                        var front = queue.shift();
                        // Stop if we found the target
                        if (front.sid === sid) {
                            childObject = front;
                            break;
                        }
                        // Add all children to the back of the queue
                        var frontChildren = front.sidChildren;
                        if (frontChildren != null) {
                            for (var j = 0, jlen = frontChildren.length; j < jlen; j++) {
                                var sidChild = frontChildren[j];
                                queue.push(sidChild);
                            }
                        }
                    }
                    // Abort if the current SID part was not found
                    if (childObject == null) {
                        context.log.write("Could not resolve SID target " + sids.join("/") + ", missing SID part " + sid, 3 /* Warning */);
                        return null;
                    }
                    parentObject = childObject;
                }
                // All parts processed, return the final target
                return childObject;
            };
            SidLink.prototype.resolve = function (context) {
                var object = null;
                if (this.id == null) {
                    context.log.write("Could not resolve SID #" + this.url + ", link has no root ID", 3 /* Warning */);
                    return;
                }
                object = context.ids[this.id];
                if (object == null) {
                    context.log.write("Could not resolve SID #" + this.url + ", could not find root element " + this.id, 3 /* Warning */);
                    return;
                }
                this.target = SidLink.findSidTarget(this.url, object, this.sids, context);
            };
            return SidLink;
        })(Link);
        Loader.SidLink = SidLink;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="link.ts" />
/// <reference path="context.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        /**
        *   Base class for any collada element.
        *
        *   Contains members for URL, FX, and SID adressing,
        *   even if the actual element does not support those.
        */
        var Element = (function () {
            /** Empty constructor */
            function Element() {
                this.name = null;
                this.id = null;
                this.sid = null;
                this.fxParent = null;
                this.fxChildren = {};
                this.sidChildren = [];
                this._className = "|Element|";
            }
            Element.fromLink = function (link, context) {
                return COLLADA.Loader.Element._fromLink(link, "Element", context);
            };
            Element._fromLink = function (link, typeName, context) {
                if (link === null) {
                    return null;
                }
                else if (link.target === null) {
                    return null;
                }
                else if (context.isInstanceOf(link.target, typeName)) {
                    return link.target;
                }
                else {
                    context.log.write("Link with url " + link.url + " does not point to a " + typeName + ", link target ignored", 4 /* Error */);
                    return null;
                }
            };
            return Element;
        })();
        Loader.Element = Element;
        ;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="../context.ts" />
/// <reference path="element.ts" />
/// <reference path="link.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var Context = (function (_super) {
            __extends(Context, _super);
            function Context() {
                _super.call(this);
                this.log = null;
                this.ids = {};
                this.links = [];
                this.totalBytes = null;
                this.loadedBytes = null;
            }
            Context.prototype.getTextContent = function (el) {
                return el.textContent || el.firstChild.getNodeValue() + "";
            };
            Context.prototype.getFloatsContent = function (el) {
                return this.strToFloats(this.getTextContent(el));
            };
            Context.prototype.getFloatContent = function (el) {
                return parseFloat(this.getTextContent(el));
            };
            Context.prototype.getIntsContent = function (el) {
                return this.strToInts(this.getTextContent(el));
            };
            Context.prototype.getIntContent = function (el) {
                return parseInt(this.getTextContent(el), 10);
            };
            Context.prototype.getBoolsContent = function (el) {
                return this.strToBools(this.getTextContent(el));
            };
            Context.prototype.getStringsContent = function (el) {
                return this.strToStrings(this.getTextContent(el));
            };
            Context.prototype.getAttributeAsFloat = function (el, name, defaultValue, required) {
                var attr = el.attributes.getNamedItem(name);
                if (attr != null) {
                    return parseFloat(attr.value);
                }
                else if (!required) {
                    return defaultValue;
                }
                else {
                    this.log.write("Element " + el.nodeName + " is missing required float attribute " + name + ". Using default value " + defaultValue + ".", 4 /* Error */);
                    return defaultValue;
                }
            };
            Context.prototype.getAttributeAsInt = function (el, name, defaultValue, required) {
                var attr = el.attributes.getNamedItem(name);
                if (attr != null) {
                    return parseInt(attr.value, 10);
                }
                else if (!required) {
                    return defaultValue;
                }
                else {
                    this.log.write("Element " + el.nodeName + " is missing required integer attribute " + name + ". Using default value " + defaultValue + ".", 4 /* Error */);
                    return defaultValue;
                }
            };
            Context.prototype.getAttributeAsString = function (el, name, defaultValue, required) {
                var attr = el.attributes.getNamedItem(name);
                if (attr != null) {
                    return attr.value + "";
                }
                else if (!required) {
                    return defaultValue;
                }
                else {
                    this.log.write("Element " + el.nodeName + " is missing required string attribute " + name + ". Using default value " + defaultValue + ".", 4 /* Error */);
                    return defaultValue;
                }
            };
            Context.prototype.createUrlLink = function (url) {
                var link = new Loader.UrlLink(url);
                this.links.push(link);
                return link;
            };
            Context.prototype.createSidLink = function (url, parentId) {
                var link = new Loader.SidLink(url, parentId);
                this.links.push(link);
                return link;
            };
            Context.prototype.createFxLink = function (url, scope) {
                var link = new Loader.FxLink(url, scope);
                this.links.push(link);
                return link;
            };
            Context.prototype.getAttributeAsUrlLink = function (el, name, required) {
                var attr = el.attributes.getNamedItem(name);
                if (attr != null) {
                    return this.createUrlLink(attr.value);
                }
                else if (!required) {
                    return null;
                }
                else {
                    this.log.write("Element " + el.nodeName + " is missing required URL link attribute " + name + ".", 4 /* Error */);
                    return null;
                }
            };
            Context.prototype.getAttributeAsSidLink = function (el, name, parentId, required) {
                var attr = el.attributes.getNamedItem(name);
                if (attr != null) {
                    return this.createSidLink(attr.value, parentId);
                }
                else if (!required) {
                    return null;
                }
                else {
                    this.log.write("Element " + el.nodeName + " is missing required SID link attribute " + name + ".", 4 /* Error */);
                    return null;
                }
            };
            Context.prototype.getAttributeAsFxLink = function (el, name, scope, required) {
                var attr = el.attributes.getNamedItem(name);
                if (attr != null) {
                    return this.createFxLink(attr.value, scope);
                }
                else if (!required) {
                    return null;
                }
                else {
                    this.log.write("Element " + el.nodeName + " is missing required FX link attribute " + name + ".", 4 /* Error */);
                    return null;
                }
            };
            /**
            *   Splits a string into whitespace-separated strings
            */
            Context.prototype.strToStrings = function (str) {
                if (str.length > 0) {
                    return str.trim().split(/\s+/);
                }
                else {
                    return [];
                }
            };
            /**
            *   Parses a string of whitespace-separated float numbers
            */
            Context.prototype.strToFloats = function (str) {
                var strings = this.strToStrings(str);
                var data = new Float32Array(strings.length);
                var len = strings.length;
                for (var i = 0; i < len; ++i) {
                    data[i] = parseFloat(strings[i]);
                }
                return data;
            };
            /**
            *   Parses a string of whitespace-separated integer numbers
            */
            Context.prototype.strToInts = function (str) {
                var strings = this.strToStrings(str);
                var data = new Int32Array(strings.length);
                var len = strings.length;
                for (var i = 0; i < len; ++i) {
                    data[i] = parseInt(strings[i], 10);
                }
                return data;
            };
            /**
            *   Parses a string of whitespace-separated integer numbers
            */
            Context.prototype.strToUints = function (str) {
                var strings = this.strToStrings(str);
                var data = new Uint32Array(strings.length);
                var len = strings.length;
                for (var i = 0; i < len; ++i) {
                    data[i] = parseInt(strings[i], 10);
                }
                return data;
            };
            /**
            *   Parses a string of whitespace-separated booleans
            */
            Context.prototype.strToBools = function (str) {
                var strings = this.strToStrings(str);
                var data = new Uint8Array(strings.length);
                var len = strings.length;
                for (var i = 0; i < len; ++i) {
                    data[i] = (strings[i] === "true" || strings[i] === "1") ? 1 : 0;
                }
                return data;
            };
            /**
            *   Parses a color string
            */
            Context.prototype.strToColor = function (str) {
                var rgba = this.strToFloats(str);
                if (rgba.length === 4) {
                    return rgba;
                }
                else {
                    this.log.write("Skipped color element because it does not contain 4 numbers", 4 /* Error */);
                    return null;
                }
            };
            Context.prototype.registerUrlTarget = function (object, needsId) {
                var id = object.id;
                // Abort if the object has no ID
                if (id == null) {
                    if (needsId) {
                        this.log.write("Object has no ID, object was not registered as a URL target.", 4 /* Error */);
                    }
                    return;
                }
                // IDs must be unique
                if (this.ids[id] != null) {
                    this.log.write("There is already an object with ID " + id + ". IDs must be globally unique.", 4 /* Error */);
                    return;
                }
                // URL links are registered globally
                this.ids[id] = object;
            };
            Context.prototype.registerFxTarget = function (object, scope) {
                var sid = object.sid;
                if (sid == null) {
                    this.log.write("Cannot add a FX target: object has no SID.", 4 /* Error */);
                    return;
                }
                if (scope.fxChildren[sid] != null) {
                    this.log.write("There is already an FX target with SID " + sid + ".", 4 /* Error */);
                    return;
                }
                // FX links are registered within the parent scope
                object.fxParent = scope;
                scope.fxChildren[sid] = object;
            };
            Context.prototype.registerSidTarget = function (object, parent) {
                // SID links are registered within the parent scope
                parent.sidChildren.push(object);
            };
            Context.prototype.getNodePath = function (node) {
                var path = "<" + node.nodeName + ">";
                var len = 1;
                var maxLen = 10;
                while (node.parentNode != null) {
                    node = node.parentNode;
                    if (node.nodeName.toUpperCase() === "COLLADA") {
                        break;
                    }
                    else if (len >= maxLen) {
                        path = ".../" + path;
                        break;
                    }
                    else {
                        path = ("<" + node.nodeName + ">/") + path;
                        len += 1;
                    }
                }
                return path;
            };
            Context.prototype.reportUnexpectedChild = function (child) {
                this.log.write("Skipped unexpected element " + (this.getNodePath(child)) + ".", 3 /* Warning */);
            };
            Context.prototype.reportUnhandledChild = function (child) {
                this.log.write("Element " + (this.getNodePath(child)) + " is legal, but not handled by this loader.", 1 /* Trace */);
            };
            Context.prototype.resolveAllLinks = function () {
                var linksLen = this.links.length;
                for (var i = 0; i < linksLen; ++i) {
                    var link = this.links[i];
                    link.resolve(this);
                }
            };
            return Context;
        })(COLLADA.Context);
        Loader.Context = Context;
        ;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var Library = (function () {
            function Library() {
                this.children = [];
            }
            Library.parse = function (node, parser, childName, context) {
                var result = new COLLADA.Loader.Library();
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case childName:
                            result.children.push(parser(child, context));
                            break;
                        case "extra":
                            context.reportUnhandledChild(child);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                            break;
                    }
                });
                return result;
            };
            return Library;
        })();
        Loader.Library = Library;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        /**
        *   An <asset> element.
        */
        var Asset = (function (_super) {
            __extends(Asset, _super);
            function Asset() {
                _super.call(this);
                this._className += "Asset|";
                this.unit = null;
                this.upAxis = null;
            }
            Asset.parse = function (node, context) {
                var result = new COLLADA.Loader.Asset();
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "unit":
                            result.unit = context.getAttributeAsFloat(child, "meter", 1, false);
                            break;
                        case "up_axis":
                            result.upAxis = context.getTextContent(child).toUpperCase().charAt(0);
                            break;
                        case "contributor":
                        case "created":
                        case "modified":
                        case "revision":
                        case "title":
                        case "subject":
                        case "keywords":
                            context.reportUnhandledChild(child);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                            break;
                    }
                });
                return result;
            };
            return Asset;
        })(COLLADA.Loader.Element);
        Loader.Asset = Asset;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        /**
        *   A <scene> element.
        */
        var Scene = (function (_super) {
            __extends(Scene, _super);
            function Scene() {
                _super.call(this);
                this._className += "Scene|";
                this.instance = null;
            }
            Scene.parse = function (node, context) {
                var result = new COLLADA.Loader.Scene();
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "instance_visual_scene":
                            result.instance = context.getAttributeAsUrlLink(child, "url", true);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                            break;
                    }
                });
                return result;
            };
            return Scene;
        })(COLLADA.Loader.Element);
        Loader.Scene = Scene;
        ;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        /**
        *   A <surface> element.
        *
        */
        var EffectSurface = (function (_super) {
            __extends(EffectSurface, _super);
            function EffectSurface() {
                _super.call(this);
                this._className += "EffectSurface|";
                this.type = null;
                this.initFrom = null;
                this.format = null;
                this.size = null;
                this.viewportRatio = null;
                this.mipLevels = null;
                this.mipmapGenerate = null;
            }
            EffectSurface.fromLink = function (link, context) {
                return COLLADA.Loader.Element._fromLink(link, "EffectSurface", context);
            };
            /**
            *   Parses a <surface> element.
            */
            EffectSurface.parse = function (node, parent, context) {
                var result = new COLLADA.Loader.EffectSurface();
                result.type = context.getAttributeAsString(node, "type", null, true);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "init_from":
                            result.initFrom = context.createUrlLink(context.getTextContent(child));
                            break;
                        case "format":
                            result.format = context.getTextContent(child);
                            break;
                        case "size":
                            result.size = context.getFloatsContent(child);
                            break;
                        case "viewport_ratio":
                            result.viewportRatio = context.getFloatsContent(child);
                            break;
                        case "mip_levels":
                            result.mipLevels = context.getIntContent(child);
                            break;
                        case "mipmap_generate":
                            result.mipmapGenerate = (context.getTextContent(child).toLowerCase() === "true");
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            return EffectSurface;
        })(COLLADA.Loader.Element);
        Loader.EffectSurface = EffectSurface;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        /**
        *   An <newparam> element.
        */
        var EffectSampler = (function (_super) {
            __extends(EffectSampler, _super);
            function EffectSampler() {
                _super.call(this);
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
            EffectSampler.fromLink = function (link, context) {
                return COLLADA.Loader.Element._fromLink(link, "EffectSampler", context);
            };
            /**
            *   Parses a <newparam> element.
            */
            EffectSampler.parse = function (node, parent, context) {
                var result = new COLLADA.Loader.EffectSampler();
                Loader.Utils.forEachChild(node, function (child) {
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
            };
            return EffectSampler;
        })(COLLADA.Loader.Element);
        Loader.EffectSampler = EffectSampler;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="effect_surface.ts" />
/// <reference path="effect_sampler.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        /**
        *   An <newparam> element.
        *
        */
        var EffectParam = (function (_super) {
            __extends(EffectParam, _super);
            function EffectParam() {
                _super.call(this);
                this._className += "EffectParam|";
                this.semantic = null;
                this.surface = null;
                this.sampler = null;
                this.floats = null;
            }
            EffectParam.fromLink = function (link, context) {
                return COLLADA.Loader.Element._fromLink(link, "EffectParam", context);
            };
            /**
            *   Parses a <newparam> element.
            */
            EffectParam.parse = function (node, parent, context) {
                var result = new COLLADA.Loader.EffectParam();
                result.sid = context.getAttributeAsString(node, "sid", null, false);
                context.registerFxTarget(result, parent);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "semantic":
                            result.semantic = context.getTextContent(child);
                            break;
                        case "float":
                            result.floats = context.getFloatsContent(child);
                            break;
                        case "float2":
                            result.floats = context.getFloatsContent(child);
                            break;
                        case "float3":
                            result.floats = context.getFloatsContent(child);
                            break;
                        case "float4":
                            result.floats = context.getFloatsContent(child);
                            break;
                        case "surface":
                            result.surface = COLLADA.Loader.EffectSurface.parse(child, result, context);
                            break;
                        case "sampler2D":
                            result.sampler = COLLADA.Loader.EffectSampler.parse(child, result, context);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            return EffectParam;
        })(COLLADA.Loader.Element);
        Loader.EffectParam = EffectParam;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var ColorOrTexture = (function (_super) {
            __extends(ColorOrTexture, _super);
            function ColorOrTexture() {
                _super.call(this);
                this._className += "ColorOrTexture|";
                this.color = null;
                this.textureSampler = null;
                this.texcoord = null;
                this.opaque = null;
                this.bumptype = null;
            }
            /**
            *   Parses a color or texture element  (<ambient>, <diffuse>, ...).
            */
            ColorOrTexture.parse = function (node, parent, context) {
                var result = new COLLADA.Loader.ColorOrTexture();
                result.opaque = context.getAttributeAsString(node, "opaque", null, false);
                result.bumptype = context.getAttributeAsString(node, "bumptype", null, false);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "color":
                            result.color = context.strToColor(context.getTextContent(child));
                            break;
                        case "texture":
                            result.textureSampler = context.getAttributeAsFxLink(child, "texture", parent, true);
                            result.texcoord = context.getAttributeAsString(child, "texcoord", null, true);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            return ColorOrTexture;
        })(COLLADA.Loader.Element);
        Loader.ColorOrTexture = ColorOrTexture;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="color_or_texture.ts" />
/// <reference path="effect_param.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        /**
        *   An <technique> element.
        *
        */
        var EffectTechnique = (function (_super) {
            __extends(EffectTechnique, _super);
            function EffectTechnique() {
                _super.call(this);
                this._className += "EffectTechnique|";
                this.params = [];
                this.shading = null;
                this.emission = null;
                this.ambient = null;
                this.diffuse = null;
                this.specular = null;
                this.reflective = null;
                this.transparent = null;
                this.bump = null;
                this.shininess = null;
                this.transparency = null;
                this.reflectivity = null;
                this.index_of_refraction = null;
                this.double_sided = null;
            }
            EffectTechnique.fromLink = function (link, context) {
                return COLLADA.Loader.Element._fromLink(link, "EffectTechnique", context);
            };
            /**
            *   Parses a <technique> element.
            */
            EffectTechnique.parse = function (node, parent, context) {
                var result = new COLLADA.Loader.EffectTechnique();
                result.sid = context.getAttributeAsString(node, "sid", null, false);
                context.registerFxTarget(result, parent);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "blinn":
                        case "phong":
                        case "lambert":
                        case "constant":
                            result.shading = child.nodeName;
                            COLLADA.Loader.EffectTechnique.parseParam(child, result, "COMMON", context);
                            break;
                        case "extra":
                            COLLADA.Loader.EffectTechnique.parseExtra(child, result, context);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            /**
            *   Parses a <technique>/(<blinn>|<phong>|<lambert>|<constant>) element.
            *   In addition to <technique>, node may also be child of <technique>/<extra>
            */
            EffectTechnique.parseParam = function (node, technique, profile, context) {
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "newparam":
                            technique.params.push(COLLADA.Loader.EffectParam.parse(child, technique, context));
                            break;
                        case "emission":
                            technique.emission = COLLADA.Loader.ColorOrTexture.parse(child, technique, context);
                            break;
                        case "ambient":
                            technique.ambient = COLLADA.Loader.ColorOrTexture.parse(child, technique, context);
                            break;
                        case "diffuse":
                            technique.diffuse = COLLADA.Loader.ColorOrTexture.parse(child, technique, context);
                            break;
                        case "specular":
                            technique.specular = COLLADA.Loader.ColorOrTexture.parse(child, technique, context);
                            break;
                        case "reflective":
                            technique.reflective = COLLADA.Loader.ColorOrTexture.parse(child, technique, context);
                            break;
                        case "transparent":
                            technique.transparent = COLLADA.Loader.ColorOrTexture.parse(child, technique, context);
                            break;
                        case "bump":
                            technique.bump = COLLADA.Loader.ColorOrTexture.parse(child, technique, context);
                            break;
                        case "shininess":
                            technique.shininess = context.getFloatContent(child.childNodes[1] || child.childNodes.item(0));
                            break;
                        case "reflectivity":
                            technique.reflectivity = context.getFloatContent(child.childNodes[1] || child.childNodes.item(0));
                            break;
                        case "transparency":
                            technique.transparency = context.getFloatContent(child.childNodes[1] || child.childNodes.item(0));
                            break;
                        case "index_of_refraction":
                            technique.index_of_refraction = context.getFloatContent(child.childNodes[1] || child.childNodes.item(0));
                            break;
                        case "double_sided":
                            technique.double_sided = context.getFloatContent(child) > 0;
                            break;
                        default:
                            if (profile === "COMMON") {
                                context.reportUnexpectedChild(child);
                            }
                    }
                });
            };
            /**
            *   Parses a <technique>/<extra> element.
            */
            EffectTechnique.parseExtra = function (node, technique, context) {
                if (technique == null) {
                    context.log.write("Ignored element <extra>, because there is no <technique>.", 3 /* Warning */);
                    return;
                }
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "technique":
                            var profile = context.getAttributeAsString(child, "profile", null, true);
                            COLLADA.Loader.EffectTechnique.parseParam(child, technique, profile, context);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
            };
            return EffectTechnique;
        })(COLLADA.Loader.Element);
        Loader.EffectTechnique = EffectTechnique;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="effect_param.ts" />
/// <reference path="effect_technique.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        /**
        *   An <effect> element.
        *
        */
        var Effect = (function (_super) {
            __extends(Effect, _super);
            function Effect() {
                _super.call(this);
                this._className += "Effect|";
                this.params = [];
                this.technique = null;
            }
            Effect.fromLink = function (link, context) {
                return COLLADA.Loader.Element._fromLink(link, "Effect", context);
            };
            /**
            *   Parses an <effect> element.
            */
            Effect.parse = function (node, context) {
                var result = new COLLADA.Loader.Effect();
                result.id = context.getAttributeAsString(node, "id", null, true);
                context.registerUrlTarget(result, true);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "profile_COMMON":
                            COLLADA.Loader.Effect.parseProfileCommon(child, result, context);
                            break;
                        case "profile":
                            context.log.write("Skipped non-common effect profile for effect " + result.id + ".", 3 /* Warning */);
                            break;
                        case "extra":
                            COLLADA.Loader.EffectTechnique.parseExtra(child, result.technique, context);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            /**
            *   Parses an <effect>/<profile_COMMON> element.
            */
            Effect.parseProfileCommon = function (node, effect, context) {
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "newparam":
                            effect.params.push(COLLADA.Loader.EffectParam.parse(child, effect, context));
                            break;
                        case "technique":
                            effect.technique = COLLADA.Loader.EffectTechnique.parse(child, effect, context);
                            break;
                        case "extra":
                            COLLADA.Loader.EffectTechnique.parseExtra(child, effect.technique, context);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
            };
            return Effect;
        })(COLLADA.Loader.Element);
        Loader.Effect = Effect;
        ;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var Material = (function (_super) {
            __extends(Material, _super);
            function Material() {
                _super.call(this);
                this._className += "Material|";
                this.effect = null;
            }
            Material.fromLink = function (link, context) {
                return COLLADA.Loader.Element._fromLink(link, "Material", context);
            };
            /**
            *   Parses a <material> element.
            */
            Material.parse = function (node, context) {
                var result = new COLLADA.Loader.Material();
                result.id = context.getAttributeAsString(node, "id", null, true);
                result.name = context.getAttributeAsString(node, "name", null, false);
                context.registerUrlTarget(result, true);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "instance_effect":
                            result.effect = context.getAttributeAsUrlLink(child, "url", true);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            return Material;
        })(COLLADA.Loader.Element);
        Loader.Material = Material;
        ;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var Source = (function (_super) {
            __extends(Source, _super);
            function Source() {
                _super.call(this);
                this._className += "Source|";
                this.sourceId = null;
                this.count = null;
                this.stride = null;
                this.offset = null;
                this.data = null;
                this.params = {};
            }
            Source.fromLink = function (link, context) {
                return COLLADA.Loader.Element._fromLink(link, "Source", context);
            };
            /**
            *   Parses a <source> element
            */
            Source.parse = function (node, context) {
                var result = new COLLADA.Loader.Source();
                result.id = context.getAttributeAsString(node, "id", null, true);
                result.name = context.getAttributeAsString(node, "name", null, false);
                context.registerUrlTarget(result, true);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "bool_array":
                            result.sourceId = context.getAttributeAsString(child, "id", null, false);
                            result.data = context.getBoolsContent(child);
                            break;
                        case "float_array":
                            result.sourceId = context.getAttributeAsString(child, "id", null, false);
                            result.data = context.getFloatsContent(child);
                            break;
                        case "int_array":
                            result.sourceId = context.getAttributeAsString(child, "id", null, false);
                            result.data = context.getIntsContent(child);
                            break;
                        case "IDREF_array":
                        case "Name_array":
                            result.sourceId = context.getAttributeAsString(child, "id", null, false);
                            result.data = context.getStringsContent(child);
                            break;
                        case "technique_common":
                            COLLADA.Loader.Source.parseSourceTechniqueCommon(child, result, context);
                            break;
                        case "technique":
                            context.reportUnhandledChild(child);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            /**
            *   Parses a <source>/<technique_common> element
            */
            Source.parseSourceTechniqueCommon = function (node, source, context) {
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "accessor":
                            COLLADA.Loader.Source.parseAccessor(child, source, context);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
            };
            /**
            *   Parses a <source>/<technique_common>/<accessor> element
            */
            Source.parseAccessor = function (node, source, context) {
                var sourceId = context.getAttributeAsString(node, "source", null, true);
                source.count = context.getAttributeAsInt(node, "count", 0, true);
                source.stride = context.getAttributeAsInt(node, "stride", 1, false);
                source.offset = context.getAttributeAsInt(node, "offset", 0, false);
                if (sourceId !== "#" + source.sourceId) {
                    context.log.write("Source " + source.id + " uses a non-local data source, this is not supported", 4 /* Error */);
                }
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "param":
                            COLLADA.Loader.Source.parseAccessorParam(child, source, context);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
            };
            /**
            *   Parses a <source>/<technique_common>/<accessor>/<param> element
            */
            Source.parseAccessorParam = function (node, source, context) {
                var name = context.getAttributeAsString(node, "name", null, false);
                var semantic = context.getAttributeAsString(node, "semantic", null, false);
                var type = context.getAttributeAsString(node, "type", null, true);
                var sid = context.getAttributeAsString(node, "sid", null, false);
                if ((name != null) && (type != null)) {
                    source.params[name] = type;
                }
                else if ((semantic != null) && (type != null)) {
                    source.params[semantic] = type;
                }
                else {
                    context.log.write("Accessor param for source " + source.id + " ignored due to missing type, name, or semantic", 3 /* Warning */);
                }
            };
            return Source;
        })(COLLADA.Loader.Element);
        Loader.Source = Source;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var Input = (function (_super) {
            __extends(Input, _super);
            function Input() {
                _super.call(this);
                this._className += "Input|";
                this.semantic = null;
                this.source = null;
                this.offset = null;
                this.set = null;
            }
            /**
            *   Parses an <input> element.
            */
            Input.parse = function (node, shared, context) {
                var result = new COLLADA.Loader.Input();
                result.semantic = context.getAttributeAsString(node, "semantic", null, true);
                result.source = context.getAttributeAsUrlLink(node, "source", true);
                if (shared) {
                    result.offset = context.getAttributeAsInt(node, "offset", 0, true);
                    result.set = context.getAttributeAsInt(node, "set", null, false);
                }
                return result;
            };
            return Input;
        })(COLLADA.Loader.Element);
        Loader.Input = Input;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="input.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var Triangles = (function (_super) {
            __extends(Triangles, _super);
            function Triangles() {
                _super.call(this);
                this._className += "Triangles|";
                this.type = null;
                this.count = null;
                this.material = null;
                this.inputs = [];
                this.indices = null;
                this.vcount = null;
            }
            /**
            *   Parses a <triangles> element.
            */
            Triangles.parse = function (node, context) {
                var result = new COLLADA.Loader.Triangles();
                result.name = context.getAttributeAsString(node, "name", null, false);
                result.material = context.getAttributeAsString(node, "material", null, false);
                result.count = context.getAttributeAsInt(node, "count", 0, true);
                result.type = node.nodeName;
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "input":
                            result.inputs.push(COLLADA.Loader.Input.parse(child, true, context));
                            break;
                        case "vcount":
                            result.vcount = context.getIntsContent(child);
                            break;
                        case "p":
                            result.indices = context.getIntsContent(child);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            return Triangles;
        })(COLLADA.Loader.Element);
        Loader.Triangles = Triangles;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="input.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var Vertices = (function (_super) {
            __extends(Vertices, _super);
            function Vertices() {
                _super.call(this);
                this._className += "Vertices|";
                this.inputs = [];
            }
            Vertices.fromLink = function (link, context) {
                return COLLADA.Loader.Element._fromLink(link, "Vertices", context);
            };
            /**
            *   Parses a <vertices> element.
            */
            Vertices.parse = function (node, context) {
                var result = new COLLADA.Loader.Vertices();
                result.id = context.getAttributeAsString(node, "id", null, true);
                result.name = context.getAttributeAsString(node, "name", null, false);
                context.registerUrlTarget(result, true);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "input":
                            result.inputs.push(COLLADA.Loader.Input.parse(child, false, context));
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            return Vertices;
        })(COLLADA.Loader.Element);
        Loader.Vertices = Vertices;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="source.ts" />
/// <reference path="triangles.ts" />
/// <reference path="vertices.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var Geometry = (function (_super) {
            __extends(Geometry, _super);
            function Geometry() {
                _super.call(this);
                this._className += "Geometry|";
                this.sources = [];
                this.vertices = [];
                this.triangles = [];
            }
            Geometry.fromLink = function (link, context) {
                return COLLADA.Loader.Element._fromLink(link, "Geometry", context);
            };
            /**
            *   Parses a <geometry> element
            */
            Geometry.parse = function (node, context) {
                var result = new COLLADA.Loader.Geometry();
                result.id = context.getAttributeAsString(node, "id", null, true);
                result.name = context.getAttributeAsString(node, "name", null, false);
                context.registerUrlTarget(result, true);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "mesh":
                            COLLADA.Loader.Geometry.parseMesh(child, result, context);
                            break;
                        case "convex_mesh":
                        case "spline":
                            context.log.write("Geometry type " + child.nodeName + " not supported.", 4 /* Error */);
                            break;
                        case "extra":
                            COLLADA.Loader.Geometry.parseGeometryExtra(child, result, context);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            /**
            *   Parses a <geometry>/<mesh> element
            */
            Geometry.parseMesh = function (node, geometry, context) {
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "source":
                            geometry.sources.push(COLLADA.Loader.Source.parse(child, context));
                            break;
                        case "vertices":
                            geometry.vertices.push(COLLADA.Loader.Vertices.parse(child, context));
                            break;
                        case "triangles":
                        case "polylist":
                        case "polygons":
                            geometry.triangles.push(COLLADA.Loader.Triangles.parse(child, context));
                            break;
                        case "lines":
                        case "linestrips":
                        case "trifans":
                        case "tristrips":
                            context.log.write("Geometry primitive type " + child.nodeName + " not supported.", 4 /* Error */);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
            };
            /**
            *   Parses a <geometry>/<extra> element
            */
            Geometry.parseGeometryExtra = function (node, geometry, context) {
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "technique":
                            var profile = context.getAttributeAsString(child, "profile", null, true);
                            COLLADA.Loader.Geometry.parseGeometryExtraTechnique(child, geometry, profile, context);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
            };
            /**
            *   Parses a <geometry>/<extra>/<technique> element
            */
            Geometry.parseGeometryExtraTechnique = function (node, geometry, profile, context) {
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        default:
                            context.reportUnhandledChild(child);
                    }
                });
            };
            return Geometry;
        })(COLLADA.Loader.Element);
        Loader.Geometry = Geometry;
        ;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="input.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var Joints = (function (_super) {
            __extends(Joints, _super);
            function Joints() {
                _super.call(this);
                this._className += "Joints|";
                this.joints = null;
                this.invBindMatrices = null;
            }
            /**
            *   Parses a <joints> element.
            */
            Joints.parse = function (node, context) {
                var result = new COLLADA.Loader.Joints();
                var inputs = [];
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "input":
                            var input = COLLADA.Loader.Input.parse(child, false, context);
                            COLLADA.Loader.Joints.addInput(result, input, context);
                            inputs.push();
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            Joints.addInput = function (joints, input, context) {
                switch (input.semantic) {
                    case "JOINT":
                        joints.joints = input;
                        break;
                    case "INV_BIND_MATRIX":
                        joints.invBindMatrices = input;
                        break;
                    default:
                        context.log.write("Unknown joints input semantic " + input.semantic, 4 /* Error */);
                }
            };
            return Joints;
        })(COLLADA.Loader.Element);
        Loader.Joints = Joints;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="input.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var VertexWeights = (function (_super) {
            __extends(VertexWeights, _super);
            function VertexWeights() {
                _super.call(this);
                this._className += "VertexWeights|";
                this.inputs = [];
                this.vcount = null;
                this.v = null;
                this.joints = null;
                this.weights = null;
                this.count = null;
            }
            /**
            *   Parses a <vertex_weights> element.
            */
            VertexWeights.parse = function (node, context) {
                var result = new COLLADA.Loader.VertexWeights();
                result.count = context.getAttributeAsInt(node, "count", 0, true);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "input":
                            var input = COLLADA.Loader.Input.parse(child, true, context);
                            COLLADA.Loader.VertexWeights.addInput(result, input, context);
                            break;
                        case "vcount":
                            result.vcount = context.getIntsContent(child);
                            break;
                        case "v":
                            result.v = context.getIntsContent(child);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            VertexWeights.addInput = function (weights, input, context) {
                switch (input.semantic) {
                    case "JOINT":
                        weights.joints = input;
                        break;
                    case "WEIGHT":
                        weights.weights = input;
                        break;
                    default:
                        context.log.write("Unknown vertex weights input semantic " + input.semantic, 4 /* Error */);
                }
            };
            return VertexWeights;
        })(COLLADA.Loader.Element);
        Loader.VertexWeights = VertexWeights;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="source.ts" />
/// <reference path="joints.ts" />
/// <reference path="vertex_weights.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var Skin = (function (_super) {
            __extends(Skin, _super);
            function Skin() {
                _super.call(this);
                this._className += "Skin|";
                this.source = null;
                this.bindShapeMatrix = null;
                this.sources = [];
                this.joints = null;
                this.vertexWeights = null;
            }
            /**
            *   Parses a <skin> element.
            */
            Skin.parse = function (node, context) {
                var result = new COLLADA.Loader.Skin();
                result.source = context.getAttributeAsUrlLink(node, "source", true);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "bind_shape_matrix":
                            result.bindShapeMatrix = context.getFloatsContent(child);
                            break;
                        case "source":
                            result.sources.push(COLLADA.Loader.Source.parse(child, context));
                            break;
                        case "joints":
                            result.joints = COLLADA.Loader.Joints.parse(child, context);
                            break;
                        case "vertex_weights":
                            result.vertexWeights = COLLADA.Loader.VertexWeights.parse(child, context);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            return Skin;
        })(COLLADA.Loader.Element);
        Loader.Skin = Skin;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var Morph = (function (_super) {
            __extends(Morph, _super);
            function Morph() {
                _super.call(this);
                this._className += "Morph|";
            }
            /**
            *   Parses a <morph> element.
            */
            Morph.parse = function (node, context) {
                var result = new COLLADA.Loader.Morph();
                context.log.write("Morph controllers not implemented", 4 /* Error */);
                return result;
            };
            return Morph;
        })(COLLADA.Loader.Element);
        Loader.Morph = Morph;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="skin.ts" />
/// <reference path="morph.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var Controller = (function (_super) {
            __extends(Controller, _super);
            function Controller() {
                _super.call(this);
                this._className += "Controller|";
                this.skin = null;
                this.morph = null;
            }
            Controller.fromLink = function (link, context) {
                return COLLADA.Loader.Element._fromLink(link, "Controller", context);
            };
            /**
            *   Parses a <controller> element.
            */
            Controller.parse = function (node, context) {
                var result = new COLLADA.Loader.Controller();
                result.id = context.getAttributeAsString(node, "id", null, true);
                result.name = context.getAttributeAsString(node, "name", null, false);
                context.registerUrlTarget(result, true);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "skin":
                            if (result.skin != null) {
                                context.log.write("Controller " + result.id + " has multiple skins", 4 /* Error */);
                            }
                            result.skin = COLLADA.Loader.Skin.parse(child, context);
                            break;
                        case "morph":
                            if (result.morph != null) {
                                context.log.write("Controller " + result.id + " has multiple morphs", 4 /* Error */);
                            }
                            result.morph = COLLADA.Loader.Morph.parse(child, context);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            return Controller;
        })(COLLADA.Loader.Element);
        Loader.Controller = Controller;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var LightParam = (function (_super) {
            __extends(LightParam, _super);
            function LightParam() {
                _super.call(this);
                this._className += "LightParam|";
                this.value = null;
            }
            /**
            *   Parses a light parameter element.
            */
            LightParam.parse = function (node, context) {
                var result = new COLLADA.Loader.LightParam();
                result.sid = context.getAttributeAsString(node, "sid", null, false);
                result.name = node.nodeName;
                result.value = context.getFloatContent(node);
                return result;
            };
            return LightParam;
        })(COLLADA.Loader.Element);
        Loader.LightParam = LightParam;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="light_param.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var Light = (function (_super) {
            __extends(Light, _super);
            function Light() {
                _super.call(this);
                this._className += "Light|";
                this.type = null;
                this.color = null;
                this.params = {};
            }
            /**
            *   Parses a <light> element.
            */
            Light.parse = function (node, context) {
                var result = new COLLADA.Loader.Light();
                result.id = context.getAttributeAsString(node, "id", null, true);
                result.name = context.getAttributeAsString(node, "name", null, false);
                context.registerUrlTarget(result, false);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "technique_common":
                            COLLADA.Loader.Light.parseTechniqueCommon(child, result, context);
                            break;
                        case "extra":
                            context.reportUnhandledChild(child);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            /**
            *   Parses a <light>/<technique_common> element.
            */
            Light.parseTechniqueCommon = function (node, light, context) {
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "ambient":
                        case "directional":
                        case "point":
                        case "spot":
                            COLLADA.Loader.Light.parseParams(child, light, "COMMON", context);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
            };
            /**
            *   Parses a <light>/<technique_common>/(<ambient>|<directional>|<point>|<spot>) element.
            */
            Light.parseParams = function (node, light, profile, context) {
                light.type = node.nodeName;
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "color":
                            light.color = context.getFloatsContent(child);
                            break;
                        case "constant_attenuation":
                        case "linear_attenuation":
                        case "quadratic_attenuation":
                        case "falloff_angle":
                        case "falloff_exponent":
                            var param = COLLADA.Loader.LightParam.parse(child, context);
                            context.registerSidTarget(param, light);
                            light.params[param.name] = param;
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
            };
            return Light;
        })(COLLADA.Loader.Element);
        Loader.Light = Light;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var CameraParam = (function (_super) {
            __extends(CameraParam, _super);
            function CameraParam() {
                _super.call(this);
                this._className += "CameraParam|";
                this.value = null;
            }
            /**
            *   Parses a camera parameter element.
            */
            CameraParam.parse = function (node, context) {
                var result = new COLLADA.Loader.CameraParam();
                result.sid = context.getAttributeAsString(node, "sid", null, false);
                result.name = node.nodeName;
                result.value = parseFloat(context.getTextContent(node));
                return result;
            };
            return CameraParam;
        })(COLLADA.Loader.Element);
        Loader.CameraParam = CameraParam;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="camera_param.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var Camera = (function (_super) {
            __extends(Camera, _super);
            function Camera() {
                _super.call(this);
                this._className += "Camera|";
                this.type = null;
                this.params = {};
            }
            /**
            *   Parses a <camera> element.
            */
            Camera.parse = function (node, context) {
                var result = new COLLADA.Loader.Camera();
                result.id = context.getAttributeAsString(node, "id", null, true);
                result.name = context.getAttributeAsString(node, "name", null, false);
                context.registerUrlTarget(result, false);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "asset":
                            context.reportUnhandledChild(child);
                            break;
                        case "optics":
                            COLLADA.Loader.Camera.parseOptics(child, result, context);
                            break;
                        case "imager":
                            context.reportUnhandledChild(child);
                            break;
                        case "extra":
                            context.reportUnhandledChild(child);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            /**
            *   Parses a <camera>/<optics> element.
            */
            Camera.parseOptics = function (node, camera, context) {
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "technique_common":
                            COLLADA.Loader.Camera.parseTechniqueCommon(child, camera, context);
                            break;
                        case "technique":
                            context.reportUnhandledChild(child);
                            break;
                        case "extra":
                            context.reportUnhandledChild(child);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
            };
            /**
            *   Parses a <camera>/<optics>/<technique_common> element.
            */
            Camera.parseTechniqueCommon = function (node, camera, context) {
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "orthographic":
                            COLLADA.Loader.Camera.parseParams(child, camera, context);
                            break;
                        case "perspective":
                            COLLADA.Loader.Camera.parseParams(child, camera, context);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
            };
            /**
            *   Parses a <camera>/<optics>/<technique_common>/(<orthographic>|<perspective>) element.
            */
            Camera.parseParams = function (node, camera, context) {
                camera.type = node.nodeName;
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "xmag":
                        case "ymag":
                        case "xfov":
                        case "yfov":
                        case "aspect_ratio":
                        case "znear":
                        case "zfar":
                            var param = COLLADA.Loader.CameraParam.parse(child, context);
                            context.registerSidTarget(param, camera);
                            camera.params[param.name] = param;
                            break;
                        case "extra":
                            context.reportUnhandledChild(child);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
            };
            return Camera;
        })(COLLADA.Loader.Element);
        Loader.Camera = Camera;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var Image = (function (_super) {
            __extends(Image, _super);
            function Image() {
                _super.call(this);
                this._className += "Image|";
                this.initFrom = null;
            }
            Image.fromLink = function (link, context) {
                return COLLADA.Loader.Element._fromLink(link, "Image", context);
            };
            /**
            *   Parses an <image> element.
            */
            Image.parse = function (node, context) {
                var result = new COLLADA.Loader.Image();
                result.id = context.getAttributeAsString(node, "id", null, true);
                context.registerUrlTarget(result, true);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "init_from":
                            result.initFrom = context.getTextContent(child);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            return Image;
        })(COLLADA.Loader.Element);
        Loader.Image = Image;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var InstanceCamera = (function (_super) {
            __extends(InstanceCamera, _super);
            function InstanceCamera() {
                _super.call(this);
                this._className += "InstanceCamera|";
                this.camera = null;
            }
            /**
            *   Parses a <instance_light> element.
            */
            InstanceCamera.parse = function (node, parent, context) {
                var result = new COLLADA.Loader.InstanceCamera();
                result.camera = context.getAttributeAsUrlLink(node, "url", true);
                result.sid = context.getAttributeAsString(node, "sid", null, false);
                result.name = context.getAttributeAsString(node, "name", null, false);
                context.registerSidTarget(result, parent);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "extra":
                            context.reportUnhandledChild(child);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            return InstanceCamera;
        })(COLLADA.Loader.Element);
        Loader.InstanceCamera = InstanceCamera;
        ;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var BindMaterial = (function () {
            function BindMaterial() {
            }
            /**
            *   Parses a <bind_material> element. Can be child of <instance_geometry> or <instance_controller>
            */
            BindMaterial.parse = function (node, parent, context) {
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "technique_common":
                            COLLADA.Loader.BindMaterial.parseTechniqueCommon(child, parent, context);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
            };
            /**
            *   Parses a <instance_geometry>/<bind_material>/<technique_common> element.
            */
            BindMaterial.parseTechniqueCommon = function (node, parent, context) {
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "instance_material":
                            parent.materials.push(COLLADA.Loader.InstanceMaterial.parse(child, parent, context));
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
            };
            return BindMaterial;
        })();
        Loader.BindMaterial = BindMaterial;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var InstanceMaterial = (function (_super) {
            __extends(InstanceMaterial, _super);
            function InstanceMaterial() {
                _super.call(this);
                this._className += "InstanceMaterial|";
                this.material = null;
                this.symbol = null;
                this.params = {};
                this.vertexInputs = {};
            }
            /**
            *   Parses a <instance_material> element.
            */
            InstanceMaterial.parse = function (node, parent, context) {
                var result = new COLLADA.Loader.InstanceMaterial();
                result.symbol = context.getAttributeAsString(node, "symbol", null, false);
                result.material = context.getAttributeAsUrlLink(node, "target", true);
                context.registerSidTarget(result, parent);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "bind_vertex_input":
                            COLLADA.Loader.InstanceMaterial.parseBindVertexInput(child, result, context);
                            break;
                        case "bind":
                            COLLADA.Loader.InstanceMaterial.parseBind(child, result, context);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            /**
            *   Parses a <instance_material>/<bind_vertex_input> element.
            */
            InstanceMaterial.parseBindVertexInput = function (node, instanceMaterial, context) {
                var semantic = context.getAttributeAsString(node, "semantic", null, true);
                var inputSemantic = context.getAttributeAsString(node, "input_semantic", null, true);
                var inputSet = context.getAttributeAsInt(node, "input_set", null, false);
                if ((semantic != null) && (inputSemantic != null)) {
                    instanceMaterial.vertexInputs[semantic] = {
                        inputSemantic: inputSemantic,
                        inputSet: inputSet
                    };
                }
                else {
                    context.log.write("Skipped a material vertex binding because of missing semantics.", 3 /* Warning */);
                }
            };
            /**
            *   Parses a <instance_material>/<bind> element.
            */
            InstanceMaterial.parseBind = function (node, instanceMaterial, context) {
                var semantic = context.getAttributeAsString(node, "semantic", null, false);
                var target = context.getAttributeAsSidLink(node, "target", null, true);
                if (semantic != null) {
                    instanceMaterial.params[semantic] = {
                        target: target
                    };
                }
                else {
                    context.log.write("Skipped a material uniform binding because of missing semantics.", 3 /* Warning */);
                }
            };
            return InstanceMaterial;
        })(COLLADA.Loader.Element);
        Loader.InstanceMaterial = InstanceMaterial;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="bind_material.ts" />
/// <reference path="instance_material.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var InstanceController = (function (_super) {
            __extends(InstanceController, _super);
            function InstanceController() {
                _super.call(this);
                this._className += "InstanceController|";
                this.controller = null;
                this.skeletons = [];
                this.materials = [];
            }
            /**
            *   Parses a <instance_controller> element.
            */
            InstanceController.parse = function (node, parent, context) {
                var result = new COLLADA.Loader.InstanceController();
                result.controller = context.getAttributeAsUrlLink(node, "url", true);
                result.sid = context.getAttributeAsString(node, "sid", null, false);
                result.name = context.getAttributeAsString(node, "name", null, false);
                context.registerSidTarget(result, parent);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "skeleton":
                            result.skeletons.push(context.createUrlLink(context.getTextContent(child)));
                            break;
                        case "bind_material":
                            COLLADA.Loader.BindMaterial.parse(child, result, context);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            return InstanceController;
        })(COLLADA.Loader.Element);
        Loader.InstanceController = InstanceController;
        ;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="instance_material.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var InstanceGeometry = (function (_super) {
            __extends(InstanceGeometry, _super);
            function InstanceGeometry() {
                _super.call(this);
                this._className += "InstanceGeometry|";
                this.geometry = null;
                this.materials = [];
            }
            /**
            *   Parses a <instance_geometry> element.
            */
            InstanceGeometry.parse = function (node, parent, context) {
                var result = new COLLADA.Loader.InstanceGeometry();
                result.geometry = context.getAttributeAsUrlLink(node, "url", true);
                result.sid = context.getAttributeAsString(node, "sid", null, false);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "bind_material":
                            COLLADA.Loader.BindMaterial.parse(child, result, context);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            return InstanceGeometry;
        })(COLLADA.Loader.Element);
        Loader.InstanceGeometry = InstanceGeometry;
        ;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var InstanceLight = (function (_super) {
            __extends(InstanceLight, _super);
            function InstanceLight() {
                _super.call(this);
                this._className += "InstanceLight|";
                this.light = null;
            }
            /**
            *   Parses a <instance_light> element.
            */
            InstanceLight.parse = function (node, parent, context) {
                var result = new COLLADA.Loader.InstanceLight();
                result.light = context.getAttributeAsUrlLink(node, "url", true);
                result.sid = context.getAttributeAsString(node, "sid", null, false);
                result.name = context.getAttributeAsString(node, "name", null, false);
                context.registerSidTarget(result, parent);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "extra":
                            context.reportUnhandledChild(child);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            return InstanceLight;
        })(COLLADA.Loader.Element);
        Loader.InstanceLight = InstanceLight;
        ;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var NodeTransform = (function (_super) {
            __extends(NodeTransform, _super);
            function NodeTransform() {
                _super.call(this);
                this._className += "NodeTransform|";
                this.type = null;
                this.data = null;
            }
            /**
            *   Parses a transformation element.
            */
            NodeTransform.parse = function (node, parent, context) {
                var result = new COLLADA.Loader.NodeTransform();
                result.sid = context.getAttributeAsString(node, "sid", null, false);
                result.type = node.nodeName;
                context.registerSidTarget(result, parent);
                result.data = context.getFloatsContent(node);
                var expectedDataLength = 0;
                switch (result.type) {
                    case "matrix":
                        expectedDataLength = 16;
                        break;
                    case "rotate":
                        expectedDataLength = 4;
                        break;
                    case "translate":
                        expectedDataLength = 3;
                        break;
                    case "scale":
                        expectedDataLength = 3;
                        break;
                    case "skew":
                        expectedDataLength = 7;
                        break;
                    case "lookat":
                        expectedDataLength = 9;
                        break;
                    default:
                        context.log.write("Unknown transformation type " + result.type + ".", 4 /* Error */);
                }
                if (result.data.length !== expectedDataLength) {
                    context.log.write("Wrong number of elements for transformation type '" + result.type + "': expected " + expectedDataLength + ", found " + result.data.length, 4 /* Error */);
                }
                return result;
            };
            return NodeTransform;
        })(COLLADA.Loader.Element);
        Loader.NodeTransform = NodeTransform;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="instance_camera.ts" />
/// <reference path="instance_controller.ts" />
/// <reference path="instance_geometry.ts" />
/// <reference path="instance_light.ts" />
/// <reference path="node_transform.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        /**
        *   A <node> element (child of <visual_scene>, <library_nodes>, or another <node>).
        */
        var VisualSceneNode = (function (_super) {
            __extends(VisualSceneNode, _super);
            function VisualSceneNode() {
                _super.call(this);
                this._className += "VisualSceneNode|";
                this.type = null;
                this.layer = null;
                this.children = [];
                this.parent = null;
                this.transformations = [];
                this.geometries = [];
                this.controllers = [];
                this.lights = [];
                this.cameras = [];
            }
            VisualSceneNode.fromLink = function (link, context) {
                return COLLADA.Loader.Element._fromLink(link, "VisualSceneNode", context);
            };
            VisualSceneNode.registerParent = function (child, parent, context) {
                child.parent = parent;
                context.registerSidTarget(child, parent);
            };
            VisualSceneNode.parse = function (node, context) {
                var result = new COLLADA.Loader.VisualSceneNode();
                result.id = context.getAttributeAsString(node, "id", null, false);
                result.sid = context.getAttributeAsString(node, "sid", null, false);
                result.name = context.getAttributeAsString(node, "name", null, false);
                result.type = context.getAttributeAsString(node, "type", null, false);
                result.layer = context.getAttributeAsString(node, "layer", null, false);
                context.registerUrlTarget(result, false);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "instance_geometry":
                            result.geometries.push(COLLADA.Loader.InstanceGeometry.parse(child, result, context));
                            break;
                        case "instance_controller":
                            result.controllers.push(COLLADA.Loader.InstanceController.parse(child, result, context));
                            break;
                        case "instance_light":
                            result.lights.push(COLLADA.Loader.InstanceLight.parse(child, result, context));
                            break;
                        case "instance_camera":
                            result.cameras.push(COLLADA.Loader.InstanceCamera.parse(child, result, context));
                            break;
                        case "matrix":
                        case "rotate":
                        case "translate":
                        case "scale":
                            result.transformations.push(COLLADA.Loader.NodeTransform.parse(child, result, context));
                            break;
                        case "node":
                            var childNode = COLLADA.Loader.VisualSceneNode.parse(child, context);
                            COLLADA.Loader.VisualSceneNode.registerParent(childNode, result, context);
                            result.children.push(childNode);
                            break;
                        case "extra":
                            context.reportUnhandledChild(child);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            return VisualSceneNode;
        })(COLLADA.Loader.Element);
        Loader.VisualSceneNode = VisualSceneNode;
        ;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="visual_scene_node.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        /**
        *   An <visual_scene> element.
        */
        var VisualScene = (function (_super) {
            __extends(VisualScene, _super);
            function VisualScene() {
                _super.call(this);
                this._className += "VisualScene|";
                this.children = [];
            }
            VisualScene.fromLink = function (link, context) {
                return COLLADA.Loader.Element._fromLink(link, "VisualScene", context);
            };
            VisualScene.parse = function (node, context) {
                var result = new COLLADA.Loader.VisualScene();
                result.id = context.getAttributeAsString(node, "id", null, false);
                context.registerUrlTarget(result, false);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "node":
                            var childNode = COLLADA.Loader.VisualSceneNode.parse(child, context);
                            COLLADA.Loader.VisualSceneNode.registerParent(childNode, result, context);
                            result.children.push(childNode);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                            break;
                    }
                });
                return result;
            };
            return VisualScene;
        })(COLLADA.Loader.Element);
        Loader.VisualScene = VisualScene;
        ;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="input.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var Sampler = (function (_super) {
            __extends(Sampler, _super);
            function Sampler() {
                _super.call(this);
                this._className += "Sampler|";
                this.input = null;
                this.outputs = [];
                this.inTangents = [];
                this.outTangents = [];
                this.interpolation = null;
            }
            Sampler.fromLink = function (link, context) {
                return COLLADA.Loader.Element._fromLink(link, "Sampler", context);
            };
            /**
            *   Parses a <sampler> element.
            */
            Sampler.parse = function (node, context) {
                var result = new COLLADA.Loader.Sampler();
                result.id = context.getAttributeAsString(node, "id", null, false);
                context.registerUrlTarget(result, false);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "input":
                            var input = COLLADA.Loader.Input.parse(child, false, context);
                            COLLADA.Loader.Sampler.addInput(result, input, context);
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            Sampler.addInput = function (sampler, input, context) {
                switch (input.semantic) {
                    case "INPUT":
                        sampler.input = input;
                        break;
                    case "OUTPUT":
                        sampler.outputs.push(input);
                        break;
                    case "INTERPOLATION":
                        sampler.interpolation = input;
                        break;
                    case "IN_TANGENT":
                        sampler.inTangents.push(input);
                        break;
                    case "OUT_TANGENT":
                        sampler.outTangents.push(input);
                        break;
                    default:
                        context.log.write("Unknown sampler input semantic " + input.semantic, 4 /* Error */);
                }
            };
            return Sampler;
        })(COLLADA.Loader.Element);
        Loader.Sampler = Sampler;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var Channel = (function (_super) {
            __extends(Channel, _super);
            function Channel() {
                _super.call(this);
                this._className += "Channel|";
                this.source = null;
                this.target = null;
            }
            /**
            *   Parses a <channel> element.
            */
            Channel.parse = function (node, parent, context) {
                var result = new COLLADA.Loader.Channel();
                result.source = context.getAttributeAsUrlLink(node, "source", true);
                result.target = context.getAttributeAsSidLink(node, "target", parent.id, true);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            return Channel;
        })(COLLADA.Loader.Element);
        Loader.Channel = Channel;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="element.ts" />
/// <reference path="sampler.ts" />
/// <reference path="source.ts" />
/// <reference path="channel.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var Animation = (function (_super) {
            __extends(Animation, _super);
            function Animation() {
                _super.call(this);
                this._className += "Animation|";
                this.parent = null;
                this.children = [];
                this.sources = [];
                this.samplers = [];
                this.channels = [];
            }
            Animation.prototype.root = function () {
                if (this.parent != null) {
                    return this.parent.root();
                }
                else {
                    return this;
                }
            };
            /**
            *   Parses an <animation> element.
            */
            Animation.parse = function (node, context) {
                var result = new COLLADA.Loader.Animation();
                result.id = context.getAttributeAsString(node, "id", null, false);
                result.name = context.getAttributeAsString(node, "name", null, false);
                context.registerUrlTarget(result, false);
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "animation":
                            var animation = COLLADA.Loader.Animation.parse(child, context);
                            animation.parent = result;
                            result.children.push(animation);
                            break;
                        case "source":
                            result.sources.push(COLLADA.Loader.Source.parse(child, context));
                            break;
                        case "sampler":
                            result.samplers.push(COLLADA.Loader.Sampler.parse(child, context));
                            break;
                        case "channel":
                            result.channels.push(COLLADA.Loader.Channel.parse(child, result, context));
                            break;
                        default:
                            context.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            return Animation;
        })(COLLADA.Loader.Element);
        Loader.Animation = Animation;
        ;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="library.ts" />
/// <reference path="asset.ts" />
/// <reference path="scene.ts" />
/// <reference path="context.ts" />
/// <reference path="effect.ts" />
/// <reference path="material.ts" />
/// <reference path="geometry.ts" />
/// <reference path="controller.ts" />
/// <reference path="light.ts" />
/// <reference path="camera.ts" />
/// <reference path="image.ts" />
/// <reference path="visual_scene.ts" />
/// <reference path="animation.ts" />
/// <reference path="visual_scene_node.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var Document = (function () {
            function Document() {
                this.scene = null;
                this.asset = null;
                this.libEffects = new COLLADA.Loader.Library();
                this.libMaterials = new COLLADA.Loader.Library();
                this.libGeometries = new COLLADA.Loader.Library();
                this.libControllers = new COLLADA.Loader.Library();
                this.libLights = new COLLADA.Loader.Library();
                this.libCameras = new COLLADA.Loader.Library();
                this.libImages = new COLLADA.Loader.Library();
                this.libVisualScenes = new COLLADA.Loader.Library();
                this.libAnimations = new COLLADA.Loader.Library();
                this.libNodes = new COLLADA.Loader.Library();
            }
            Document.parse = function (doc, context) {
                // There should be one top level <COLLADA> element
                var colladaNodes = doc.getElementsByTagName("COLLADA");
                if (colladaNodes.length === 0) {
                    context.log.write("Cannot parse document, no top level COLLADA element.", 4 /* Error */);
                    return new COLLADA.Loader.Document();
                }
                else if (colladaNodes.length > 1) {
                    context.log.write("Cannot parse document, more than one top level COLLADA element.", 4 /* Error */);
                    return new COLLADA.Loader.Document();
                }
                return COLLADA.Loader.Document.parseCOLLADA(colladaNodes[0] || colladaNodes.item(0), context);
            };
            Document.parseCOLLADA = function (node, context) {
                var result = new COLLADA.Loader.Document();
                Loader.Utils.forEachChild(node, function (child) {
                    switch (child.nodeName) {
                        case "asset":
                            result.asset = COLLADA.Loader.Asset.parse(child, context);
                            break;
                        case "scene":
                            result.scene = COLLADA.Loader.Scene.parse(child, context);
                            break;
                        case "library_effects":
                            result.libEffects = COLLADA.Loader.Library.parse(child, COLLADA.Loader.Effect.parse, "effect", context);
                            break;
                        case "library_materials":
                            result.libMaterials = COLLADA.Loader.Library.parse(child, COLLADA.Loader.Material.parse, "material", context);
                            break;
                        case "library_geometries":
                            result.libGeometries = COLLADA.Loader.Library.parse(child, COLLADA.Loader.Geometry.parse, "geometry", context);
                            break;
                        case "library_images":
                            result.libImages = COLLADA.Loader.Library.parse(child, COLLADA.Loader.Image.parse, "image", context);
                            break;
                        case "library_visual_scenes":
                            result.libVisualScenes = COLLADA.Loader.Library.parse(child, COLLADA.Loader.VisualScene.parse, "visual_scene", context);
                            break;
                        case "library_controllers":
                            result.libControllers = COLLADA.Loader.Library.parse(child, COLLADA.Loader.Controller.parse, "controller", context);
                            break;
                        case "library_animations":
                            result.libAnimations = COLLADA.Loader.Library.parse(child, COLLADA.Loader.Animation.parse, "animation", context);
                            break;
                        case "library_lights":
                            result.libLights = COLLADA.Loader.Library.parse(child, COLLADA.Loader.Light.parse, "effect", context);
                            break;
                        case "library_cameras":
                            result.libCameras = COLLADA.Loader.Library.parse(child, COLLADA.Loader.Camera.parse, "camera", context);
                            break;
                        case "library_nodes":
                            result.libNodes = COLLADA.Loader.Library.parse(child, COLLADA.Loader.VisualSceneNode.parse, "node", context);
                            break;
                        default:
                            this.reportUnexpectedChild(child);
                    }
                });
                return result;
            };
            return Document;
        })();
        Loader.Document = Document;
        ;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
var COLLADA;
(function (COLLADA) {
    (function (LogLevel) {
        LogLevel[LogLevel["Trace"] = 1] = "Trace";
        LogLevel[LogLevel["Info"] = 2] = "Info";
        LogLevel[LogLevel["Warning"] = 3] = "Warning";
        LogLevel[LogLevel["Error"] = 4] = "Error";
        LogLevel[LogLevel["Exception"] = 5] = "Exception";
    })(COLLADA.LogLevel || (COLLADA.LogLevel = {}));
    var LogLevel = COLLADA.LogLevel;
    ;
    function LogLevelToString(level) {
        switch (level) {
            case 1 /* Trace */:
                return "TRACE";
            case 2 /* Info */:
                return "INFO";
            case 3 /* Warning */:
                return "WARNING";
            case 4 /* Error */:
                return "ERROR";
            case 5 /* Exception */:
                return "EXCEPTION";
            default:
                return "OTHER";
        }
    }
    COLLADA.LogLevelToString = LogLevelToString;
    var LogCallback = (function () {
        function LogCallback() {
        }
        LogCallback.prototype.write = function (message, level) {
            if (this.onmessage) {
                this.onmessage(message, level);
            }
        };
        return LogCallback;
    })();
    COLLADA.LogCallback = LogCallback;
    var LogArray = (function () {
        function LogArray() {
            this.messages = [];
        }
        LogArray.prototype.write = function (message, level) {
            this.messages.push({ message: message, level: level });
        };
        return LogArray;
    })();
    COLLADA.LogArray = LogArray;
    var LogConsole = (function () {
        function LogConsole() {
        }
        LogConsole.prototype.write = function (message, level) {
            console.log(LogLevelToString(level) + ": " + message);
        };
        return LogConsole;
    })();
    COLLADA.LogConsole = LogConsole;
    var LogTextArea = (function () {
        function LogTextArea(area) {
            this.area = area;
        }
        LogTextArea.prototype.write = function (message, level) {
            var line = LogLevelToString(level) + ": " + message;
            this.area.textContent += line + "\n";
        };
        return LogTextArea;
    })();
    COLLADA.LogTextArea = LogTextArea;
    var LogFilter = (function () {
        function LogFilter(log, level) {
            this.log = log;
            this.level = level;
        }
        LogFilter.prototype.write = function (message, level) {
            if (level > this.level) {
                this.log.write(message, level);
            }
        };
        return LogFilter;
    })();
    COLLADA.LogFilter = LogFilter;
})(COLLADA || (COLLADA = {}));
/// <reference path="loader/context.ts" />
/// <reference path="loader/document.ts" />
/// <reference path="log.ts" />
var COLLADA;
(function (COLLADA) {
    var Loader;
    (function (Loader) {
        var ColladaLoader = (function () {
            function ColladaLoader() {
                this.onFinished = null;
                this.onProgress = null;
                this.log = new COLLADA.LogConsole();
            }
            ColladaLoader.prototype._reportError = function (id, context) {
                if (this.onFinished) {
                    this.onFinished(id, null);
                }
            };
            ColladaLoader.prototype._reportSuccess = function (id, doc, context) {
                if (this.onFinished) {
                    this.onFinished(id, doc);
                }
            };
            ColladaLoader.prototype._reportProgress = function (id, context) {
                if (this.onProgress) {
                    this.onProgress(id, context.loadedBytes, context.totalBytes);
                }
            };
            ColladaLoader.prototype.loadFromXML = function (id, doc) {
                var context = new COLLADA.Loader.Context();
                context.log = this.log;
                return this._loadFromXML(id, doc, context);
            };
            ColladaLoader.prototype._loadFromXML = function (id, doc, context) {
                var result = null;
                try {
                    result = COLLADA.Loader.Document.parse(doc, context);
                    context.resolveAllLinks();
                }
                catch (err) {
                    context.log.write(err.message, 5 /* Exception */);
                    this._reportError(id, context);
                    return null;
                }
                this._reportSuccess(id, result, context);
                return result;
            };
            ColladaLoader.prototype.loadFromURL = function (id, url) {
                var context = new COLLADA.Loader.Context();
                context.log = this.log;
                var loader = this;
                if (document != null && document.implementation != null && document.implementation.createDocument != null) {
                    var req = new XMLHttpRequest();
                    if (typeof req.overrideMimeType === "function") {
                        req.overrideMimeType("text/xml");
                    }
                    req.onreadystatechange = function () {
                        if (req.readyState === 4) {
                            if (req.status === 0 || req.status === 200) {
                                if (req.responseXML) {
                                    var result = COLLADA.Loader.Document.parse(req.responseXML, context);
                                    loader._reportSuccess(id, result, context);
                                }
                                else {
                                    context.log.write("Empty or non-existing file " + url + ".", 4 /* Error */);
                                    loader._reportError(id, context);
                                }
                            }
                        }
                        else if (req.readyState === 3) {
                            if (!(context.totalBytes > 0)) {
                                context.totalBytes = parseInt(req.getResponseHeader("Content-Length"));
                            }
                            context.loadedBytes = req.responseText.length;
                            loader._reportProgress(id, context);
                        }
                    };
                    req.open("GET", url, true);
                    req.send(null);
                }
                else {
                    context.log.write("Don't know how to parse XML!", 4 /* Error */);
                    loader._reportError(id, context);
                }
            };
            return ColladaLoader;
        })();
        Loader.ColladaLoader = ColladaLoader;
    })(Loader = COLLADA.Loader || (COLLADA.Loader = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
var COLLADA;
(function (COLLADA) {
    var Converter;
    (function (Converter) {
        var MaterialMap = (function () {
            function MaterialMap() {
                this.symbols = {};
            }
            return MaterialMap;
        })();
        Converter.MaterialMap = MaterialMap;
        var Material = (function () {
            function Material() {
                this.name = null;
                this.diffuse = null;
                this.specular = null;
                this.normal = null;
            }
            Material.createDefaultMaterial = function (context) {
                var result = context.materials.findConverter(null);
                if (result) {
                    return result;
                }
                else {
                    result = new COLLADA.Converter.Material();
                    context.materials.register(null, result);
                    return result;
                }
            };
            Material.createMaterial = function (instanceMaterial, context) {
                var material = COLLADA.Loader.Material.fromLink(instanceMaterial.material, context);
                if (material === null) {
                    context.log.write("Material not found, material skipped.", 3 /* Warning */);
                    return COLLADA.Converter.Material.createDefaultMaterial(context);
                }
                var effect = COLLADA.Loader.Effect.fromLink(material.effect, context);
                if (effect === null) {
                    context.log.write("Material effect not found, using default material", 3 /* Warning */);
                    return COLLADA.Converter.Material.createDefaultMaterial(context);
                }
                var technique = effect.technique;
                if (technique === null) {
                    context.log.write("Material effect not found, using default material", 3 /* Warning */);
                    return COLLADA.Converter.Material.createDefaultMaterial(context);
                }
                if (technique.diffuse.color !== null || technique.specular.color !== null) {
                    context.log.write("Material " + material.id + " contains constant colors, colors ignored", 3 /* Warning */);
                }
                var result = context.materials.findConverter(material);
                if (result)
                    return result;
                result = new COLLADA.Converter.Material();
                result.name = material.id;
                result.diffuse = COLLADA.Converter.Texture.createTexture(technique.diffuse, context);
                result.specular = COLLADA.Converter.Texture.createTexture(technique.specular, context);
                result.normal = COLLADA.Converter.Texture.createTexture(technique.bump, context);
                context.materials.register(material, result);
                return result;
            };
            Material.getMaterialMap = function (instanceMaterials, context) {
                var result = new COLLADA.Converter.MaterialMap();
                var numMaterials = 0;
                for (var i = 0; i < instanceMaterials.length; i++) {
                    var instanceMaterial = instanceMaterials[i];
                    var symbol = instanceMaterial.symbol;
                    if (symbol === null) {
                        context.log.write("Material instance has no symbol, material skipped.", 3 /* Warning */);
                        continue;
                    }
                    if (result.symbols[symbol] != null) {
                        context.log.write("Material symbol " + symbol + " used multiple times", 4 /* Error */);
                        continue;
                    }
                    result.symbols[symbol] = COLLADA.Converter.Material.createMaterial(instanceMaterial, context);
                }
                return result;
            };
            return Material;
        })();
        Converter.Material = Material;
    })(Converter = COLLADA.Converter || (COLLADA.Converter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="gl-matrix.d.ts" />
/// <reference path="external/gl-matrix.i.ts" />
var COLLADA;
(function (COLLADA) {
    var MathUtils = (function () {
        function MathUtils() {
        }
        MathUtils.prototype.contructor = function () {
        };
        MathUtils.round = function (num, decimals) {
            if (decimals !== null) {
                // Nice, but does not work for scientific notation numbers
                // return +(Math.round(+(num + "e+" + decimals)) + "e-" + decimals);
                return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
            }
            else {
                return num;
            }
        };
        MathUtils.copyNumberArray = function (src, dest, count) {
            for (var i = 0; i < count; ++i) {
                dest[i] = src[i];
            }
        };
        MathUtils.copyNumberArrayOffset = function (src, srcOffset, dest, destOffset, count) {
            for (var i = 0; i < count; ++i) {
                dest[destOffset + i] = src[srcOffset + i];
            }
        };
        /**
        * Calls the given function for each src[i*stride + offset]
        */
        MathUtils.forEachElement = function (src, stride, offset, fn) {
            var count = src.length / stride;
            for (var i = 0; i < count; ++i) {
                fn(src[i * stride + offset]);
            }
        };
        /**
        * Extracts a 4D matrix from an array of matrices (stored as an array of numbers)
        */
        MathUtils.mat4Extract = function (src, srcOff, dest) {
            for (var i = 0; i < 16; ++i) {
                dest[i] = src[srcOff * 16 + i];
            }
            // Collada matrices are row major
            // glMatrix matrices are column major
            // webgl matrices are column major
            mat4.transpose(dest, dest);
        };
        MathUtils.decompose = function (mat, pos, rot, scl) {
            var tempVec3 = MathUtils._decomposeVec3;
            var tempMat3 = MathUtils._decomposeMat3;
            var tempMat4 = MathUtils._decomposeMat4;
            // Translation
            vec3.set(pos, mat[12], mat[13], mat[14]);
            // Scale
            scl[0] = vec3.length(vec3.fromValues(mat[0], mat[1], mat[2]));
            scl[1] = vec3.length(vec3.fromValues(mat[4], mat[5], mat[6]));
            scl[2] = vec3.length(vec3.fromValues(mat[8], mat[9], mat[10]));
            // Remove the scaling from the remaining transformation matrix
            // This will greatly improve the precision of the matrix -> quaternion conversion
            // FIXME: for non-uniform scale, this might not be the correct order of scale and rotation
            vec3.set(tempVec3, 1 / scl[0], 1 / scl[1], 1 / scl[2]);
            mat4.scale(tempMat4, mat, tempVec3);
            // Rotation
            mat3.fromMat4(tempMat3, tempMat4);
            quat.fromMat3(rot, tempMat3);
            quat.normalize(rot, rot);
            rot[3] = -rot[3]; // Because glmatrix matrix-to-quaternion somehow gives the inverse rotation
            // Checking the precision of the conversion
            if (false) {
                MathUtils.compose(pos, rot, scl, tempMat4);
                for (var i = 0; i < 16; ++i) {
                    if (Math.abs(tempMat4[i] - mat[i]) > 1e-6) {
                        throw new Error("Low precision decomposition");
                    }
                }
            }
        };
        MathUtils.compose = function (pos, rot, scl, mat) {
            mat4.identity(mat);
            mat4.scale(mat, mat, scl);
            mat4.fromRotationTranslation(mat, rot, pos);
        };
        MathUtils.bakeTransform = function (mat, scale, rotation, transform) {
            // Old translation
            var translation = vec3.fromValues(mat[12], mat[13], mat[14]);
            // Compute new translation
            vec3.transformMat4(translation, translation, transform);
            // Compute new rotation
            mat4.multiply(mat, rotation, mat);
            // Set new translation
            mat[12] = translation[0];
            mat[13] = translation[1];
            mat[14] = translation[2];
        };
        MathUtils.bezier = function (p0, c0, c1, p1, s) {
            if (s < 0 || s > 1)
                throw new Error("Invalid Bezier parameter: " + s);
            return p0 * (1 - s) * (1 - s) * (1 - s) + 3 * c0 * s * (1 - s) * (1 - s) + 3 * c1 * s * s * (1 - s) + p1 * s * s * s;
        };
        MathUtils.hermite = function (p0, t0, t1, p1, s) {
            if (s < 0 || s > 1)
                throw new Error("Invalid Hermite parameter: " + s);
            var s2 = s * s;
            var s3 = s2 * s;
            return p0 * (2 * s3 - 3 * s2 + 1) + t0 * (s3 - 2 * s2 + s) + p1 * (-2 * s3 + 3 * s2) + t1 * (s3 - s2);
        };
        /**
        * Given a monotonously increasing function fn and a value target_y, finds a value x with 0<=x<=1 such that fn(x)=target_y
        */
        MathUtils.bisect = function (target_y, fn, tol_y, max_iterations) {
            var x0 = 0;
            var x1 = 1;
            var y0 = fn(x0);
            var y1 = fn(x1);
            if (target_y <= y0)
                return x0;
            if (target_y >= y1)
                return x1;
            var x = 0.5 * (x0 + x1);
            var y = fn(x);
            var iteration = 0;
            while (Math.abs(y - target_y) > tol_y) {
                // Update bounds
                if (y < target_y) {
                    x0 = x;
                }
                else if (y > target_y) {
                    x1 = x;
                }
                else {
                    return x;
                }
                // Update values
                x = 0.5 * (x0 + x1);
                y = fn(x);
                // Check iteration count
                ++iteration;
                if (iteration > max_iterations) {
                    throw new Error("Too many iterations");
                }
            }
            return x;
        };
        MathUtils.TO_RADIANS = Math.PI / 180.0;
        MathUtils._decomposeVec3 = vec3.create();
        MathUtils._decomposeMat3 = mat3.create();
        MathUtils._decomposeMat4 = mat4.create();
        return MathUtils;
    })();
    COLLADA.MathUtils = MathUtils;
    ;
})(COLLADA || (COLLADA = {}));
var COLLADA;
(function (COLLADA) {
    var Converter;
    (function (Converter) {
        var Utils = (function () {
            function Utils() {
            }
            /**
            * Re-indexes data.
            * Copies srcData[srcIndices[i*srcStride + srcOffset]] to destData[destIndices[i*destStride + destOffset]]
            *
            * Used because in COLLADA, each geometry attribute (position, normal, ...) can have its own index buffer,
            * whereas for GPU rendering, there is only one index buffer for the whole geometry.
            *
            */
            Utils.reIndex = function (srcData, srcIndices, srcStride, srcOffset, srcDim, destData, destIndices, destStride, destOffset, destDim) {
                var dim = Math.min(srcDim, destDim);
                var srcIndexCount = srcIndices.length;
                // Index in the "indices" array at which the next index can be found
                var srcIndexIndex = srcOffset;
                var destIndexIndex = destOffset;
                while (srcIndexIndex < srcIndexCount) {
                    // Index in the "data" array at which the vertex data can be found
                    var srcIndex = srcIndices[srcIndexIndex];
                    srcIndexIndex += srcStride;
                    var destIndex = destIndices[destIndexIndex];
                    destIndexIndex += destStride;
                    for (var d = 0; d < dim; ++d) {
                        destData[srcDim * destIndex + d] = srcData[destDim * srcIndex + d];
                    }
                }
            };
            /**
            * Given a list of indices stored as indices[i*stride + offset],
            * returns a similar list of indices stored as an array of consecutive numbers.
            */
            Utils.compactIndices = function (indices, stride, offset) {
                var uniqueCount = 0;
                var indexCount = indices.length / stride;
                var uniqueMap = new Uint32Array(indexCount);
                var invalidIndex = 0xffffff;
                for (var i = 0; i < indexCount; ++i) {
                    var previousIndex = invalidIndex;
                    for (var j = 0; j < i; ++j) {
                        if (indices[j * stride + offset] === indices[i * stride + offset]) {
                            previousIndex = j;
                            break;
                        }
                    }
                    uniqueMap[i] = previousIndex;
                    if (previousIndex !== invalidIndex) {
                        uniqueCount++;
                    }
                }
                // Create new indices
                var result = new Uint32Array(indexCount);
                var nextIndex = 0;
                for (var i = 0; i < indexCount; ++i) {
                    var previousIndex = uniqueMap[i];
                    if (previousIndex === invalidIndex) {
                        result[i] = nextIndex;
                        nextIndex++;
                    }
                    else {
                        result[i] = result[previousIndex];
                    }
                }
                return result;
            };
            /**
            * Returns the maximum element of a list of non-negative integers
            */
            Utils.maxIndex = function (indices) {
                if (indices === null) {
                    return null;
                }
                var result = -1;
                var length = indices.length;
                for (var i = 0; i < length; ++i) {
                    if (indices[i] > result)
                        result = indices[i];
                }
                return result;
            };
            Utils.createFloatArray = function (source, name, outDim, context) {
                if (source === null) {
                    return null;
                }
                if (source.stride > outDim) {
                    context.log.write("Source data for " + name + " contains too many dimensions, " + (source.stride - outDim) + " dimensions will be ignored", 3 /* Warning */);
                }
                else if (source.stride < outDim) {
                    context.log.write("Source data for " + name + " does not contain enough dimensions, " + (outDim - source.stride) + " dimensions will be zero", 3 /* Warning */);
                }
                // Start and end index
                var iBegin = source.offset;
                var iEnd = source.offset + source.count * source.stride;
                if (iEnd > source.data.length) {
                    context.log.write("Source for " + name + " tries to access too many elements, data ignored", 3 /* Warning */);
                    return null;
                }
                // Get source raw data
                if (!(source.data instanceof Float32Array)) {
                    context.log.write("Source for " + name + " does not contain floating point data, data ignored", 3 /* Warning */);
                    return null;
                }
                var srcData = source.data;
                // Copy data
                var result = new Float32Array(source.count * outDim);
                var src_offset = source.offset;
                var src_stride = source.stride;
                var dest_offset = 0;
                var dest_stride = outDim;
                for (var i = 0; i < source.count; ++i) {
                    for (var j = 0; j < outDim; ++j) {
                        result[dest_offset + dest_stride * i + j] = srcData[src_offset + src_stride * i + j];
                    }
                }
                return result;
            };
            Utils.createStringArray = function (source, name, outDim, context) {
                if (source === null) {
                    return null;
                }
                if (source.stride > outDim) {
                    context.log.write("Source data for " + name + " contains too many dimensions, " + (source.stride - outDim) + " dimensions will be ignored", 3 /* Warning */);
                }
                else if (source.stride < outDim) {
                    context.log.write("Source data for " + name + " does not contain enough dimensions, " + (outDim - source.stride) + " dimensions will be zero", 3 /* Warning */);
                }
                // Start and end index
                var iBegin = source.offset;
                var iEnd = source.offset + source.count * source.stride;
                if (iEnd > source.data.length) {
                    context.log.write("Source for " + name + " tries to access too many elements, data ignored", 3 /* Warning */);
                    return null;
                }
                // Get source raw data
                if (!(source.data instanceof Array)) {
                    context.log.write("Source for " + name + " does not contain string data, data ignored", 3 /* Warning */);
                    return null;
                }
                var srcData = source.data;
                // Copy data
                var result = new Array(source.count * outDim);
                var src_offset = source.offset;
                var src_stride = source.stride;
                var dest_offset = 0;
                var dest_stride = outDim;
                for (var i = 0; i < source.count; ++i) {
                    for (var j = 0; j < outDim; ++j) {
                        result[dest_offset + dest_stride * i + j] = srcData[src_offset + src_stride * i + j];
                    }
                }
                return result;
            };
            Utils.spawElements = function (array, i1, i2) {
                var temp = array[i1];
                array[i1] = array[i2];
                array[i2] = temp;
            };
            Utils.insertBone = function (indices, weights, index, weight, offsetBegin, offsetEnd) {
                if (weights[offsetEnd] < weight) {
                    // Insert at last position
                    weights[offsetEnd] = weight;
                    indices[offsetEnd] = index;
                    for (var i = offsetEnd; i > offsetBegin; --i) {
                        if (weights[i] > weights[i - 1]) {
                            Utils.spawElements(weights, i, i - 1);
                            Utils.spawElements(indices, i, i - 1);
                        }
                    }
                }
            };
            Utils.getWorldTransform = function (context) {
                var mat = Utils.worldTransform;
                mat4.copy(mat, Utils.getWorldRotation(context));
                mat4.scale(mat, mat, Utils.getWorldScale(context));
                return mat;
            };
            Utils.getWorldInvTransform = function (context) {
                var mat = Utils.getWorldTransform(context);
                mat4.invert(Utils.worldInvTransform, mat);
                return Utils.worldInvTransform;
            };
            Utils.getWorldScale = function (context) {
                var scale = context.options.worldTransformScale.value;
                vec3.set(Utils.worldScale, scale, scale, scale);
                return Utils.worldScale;
            };
            Utils.getWorldInvScale = function (context) {
                var invScale = 1 / context.options.worldTransformScale.value;
                vec3.set(Utils.worldInvScale, invScale, invScale, invScale);
                return Utils.worldInvScale;
            };
            Utils.getWorldRotation = function (context) {
                var rotationAxis = context.options.worldTransformRotationAxis.value;
                var rotationAngle = context.options.worldTransformRotationAngle.value * Math.PI / 180;
                var mat = Utils.worldRotation;
                mat4.identity(mat);
                switch (rotationAxis) {
                    case "none":
                        break;
                    case "x":
                        mat4.rotateX(mat, mat, rotationAngle);
                        break;
                    case "y":
                        mat4.rotateY(mat, mat, rotationAngle);
                        break;
                    case "z":
                        mat4.rotateZ(mat, mat, rotationAngle);
                        break;
                    default:
                        context.log.write("Unknown rotation axis", 3 /* Warning */);
                        break;
                }
                return mat;
            };
            Utils.worldTransform = mat4.create();
            Utils.worldInvTransform = mat4.create();
            Utils.worldScale = vec3.create();
            Utils.worldInvScale = vec3.create();
            Utils.worldRotation = mat4.create();
            return Utils;
        })();
        Converter.Utils = Utils;
    })(Converter = COLLADA.Converter || (COLLADA.Converter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="../math.ts" />
/// <reference path="context.ts" />
/// <reference path="utils.ts" />
/// <reference path="node.ts" />
var COLLADA;
(function (COLLADA) {
    var Converter;
    (function (Converter) {
        var Bone = (function () {
            function Bone(node) {
                this.node = node;
                this.name = node.name;
                this.index = null;
                this.parent = null;
                this.attachedToSkin = false;
                this.invBindMatrix = mat4.create();
            }
            Bone.prototype.parentIndex = function () {
                return this.parent === null ? -1 : this.parent.index;
            };
            Bone.prototype.depth = function () {
                return this.parent === null ? 0 : (this.parent.depth() + 1);
            };
            Bone.create = function (node) {
                return new COLLADA.Converter.Bone(node);
            };
            /**
            * Finds the visual scene node that is referenced by the joint SID.
            * The skin element contains the skeleton root nodes.
            */
            Bone.findBoneNode = function (boneSid, skeletonRootNodes, context) {
                // The spec is inconsistent here.
                // The joint ids do not seem to be real scoped identifiers(chapter 3.3, "COLLADA Target Addressing"), since they lack the first part (the anchor id)
                // The skin element(chapter 5, "skin" element) * implies * that the joint ids are scoped identifiers relative to the skeleton root node,
                // so perform a sid - like breadth - first search.
                var boneNode = null;
                for (var i = 0; i < skeletonRootNodes.length; i++) {
                    var skeletonRoot = skeletonRootNodes[i];
                    var sids = boneSid.split("/");
                    boneNode = COLLADA.Loader.SidLink.findSidTarget(boneSid, skeletonRoot, sids, context);
                    if (boneNode != null) {
                        break;
                    }
                }
                if (context.isInstanceOf(boneNode, "VisualSceneNode")) {
                    return boneNode;
                }
                else {
                    context.log.write("Joint " + boneSid + " does not point to a visual scene node, joint ignored", 3 /* Warning */);
                    return null;
                }
            };
            /**
            * Find the parent for each bone
            * The skeleton(s) may contain more bones than referenced by the skin
            * This function also adds all bones that are not referenced but used for the skeleton transformation
            */
            Bone.findBoneParents = function (bones, context) {
                var i = 0;
                while (i < bones.length) {
                    // Select the next unprocessed bone
                    var bone = bones[i];
                    i = i + 1;
                    for (var k = 0; k < bones.length; k++) {
                        var parentBone = bones[k];
                        if (bone.node.parent === parentBone.node) {
                            bone.parent = parentBone;
                            break;
                        }
                    }
                    // If no parent bone found, add it to the list
                    if ((bone.node.parent != null) && (bone.parent == null)) {
                        bone.parent = COLLADA.Converter.Bone.create(bone.node.parent);
                        bones.push(bone.parent);
                    }
                }
            };
            /**
            * Create all bones used in the given skin
            */
            Bone.createSkinBones = function (jointSids, skeletonRootNodes, bindShapeMatrix, invBindMatrices, context) {
                var bones = [];
                for (var i = 0; i < jointSids.length; i++) {
                    var jointSid = jointSids[i];
                    var jointNode = COLLADA.Converter.Bone.findBoneNode(jointSid, skeletonRootNodes, context);
                    if (jointNode === null) {
                        context.log.write("Joint " + jointSid + " not found for skeleton, no bones created", 3 /* Warning */);
                        return [];
                    }
                    var converterNode = context.nodes.findConverter(jointNode);
                    if (converterNode === null) {
                        context.log.write("Joint " + jointSid + " not converted for skeleton, no bones created", 3 /* Warning */);
                        return [];
                    }
                    var bone = COLLADA.Converter.Bone.create(converterNode);
                    bone.attachedToSkin = true;
                    COLLADA.MathUtils.mat4Extract(invBindMatrices, i, bone.invBindMatrix);
                    // Collada skinning equation: boneWeight*boneMatrix*invBindMatrix*bindShapeMatrix*vertexPos
                    // (see chapter 4: "Skin Deformation (or Skinning) in COLLADA")
                    // Here we could pre-multiply the inverse bind matrix and the bind shape matrix
                    // We do not pre-multiply the bind shape matrix, because the same bone could be bound to
                    // different meshes using different bind shape matrices and we would have to duplicate the bones
                    // mat4.multiply(bone.invBindMatrix, bone.invBindMatrix, bindShapeMatrix);
                    bones.push(bone);
                }
                // Add all missing bones of the skeleton
                COLLADA.Converter.Bone.findBoneParents(bones, context);
                // Set indices
                COLLADA.Converter.Bone.updateIndices(bones);
                return bones;
            };
            /**
            * Updates the index member for all bones of the given array
            */
            Bone.updateIndices = function (bones) {
                for (var i = 0; i < bones.length; ++i) {
                    var bone = bones[i];
                    bone.index = i;
                }
            };
            /**
            * Returns true if the two bones can safely be merged, i.e.,
            * they reference the same scene graph node and have the same inverse bind matrix
            */
            Bone.sameBone = function (a, b) {
                if (a.node !== b.node) {
                    return false;
                }
                for (var i = 0; i < 16; ++i) {
                    var ai = a.invBindMatrix[i];
                    var bi = b.invBindMatrix[i];
                    if (Math.abs(ai - bi) > 1e-5) {
                        return false;
                    }
                }
                return true;
            };
            /**
            * Appends bones from src to dest, so that each bone is unique
            */
            Bone.appendBones = function (dest, src) {
                for (var is = 0; is < src.length; ++is) {
                    var src_bone = src[is];
                    COLLADA.Converter.Bone.appendBone(dest, src_bone);
                }
                // Update bone indices
                COLLADA.Converter.Bone.updateIndices(dest);
            };
            /**
            * Appends src_bone to dest
            */
            Bone.appendBone = function (dest, src_bone) {
                var already_present = false;
                for (var id = 0; id < dest.length; ++id) {
                    var dest_bone = dest[id];
                    if (COLLADA.Converter.Bone.sameBone(dest_bone, src_bone)) {
                        already_present = true;
                        // Merge the 'attached to skin' property
                        dest_bone.attachedToSkin = dest_bone.attachedToSkin || src_bone.attachedToSkin;
                        return dest_bone;
                    }
                }
                if (!already_present) {
                    dest.push(src_bone);
                    if (src_bone.parent !== null) {
                        src_bone.parent = COLLADA.Converter.Bone.appendBone(dest, src_bone.parent);
                    }
                }
                return src_bone;
            };
            /**
            * Given two arrays a and b, such that each bone from a is contained in b,
            * compute a map that maps the old index (a) of each bone to the new index (b).
            */
            Bone.getBoneIndexMap = function (a, b) {
                var result = new Uint32Array(a.length);
                for (var i = 0; i < a.length; ++i) {
                    var bone_a = a[i];
                    // Find the index of the current bone in b
                    var new_index = -1;
                    for (var j = 0; j < b.length; ++j) {
                        var bone_b = b[j];
                        if (COLLADA.Converter.Bone.sameBone(bone_a, bone_b)) {
                            new_index = j;
                            break;
                        }
                    }
                    if (new_index < 0) {
                        var a_name = bone_a.name;
                        var b_names = b.map(function (b) { return b.name; });
                        throw new Error("Bone " + a_name + " not found in " + b_names);
                    }
                    result[i] = new_index;
                }
                return result;
            };
            /**
            * Returns true if the bones are sorted so that child bones appear after their parents in the list.
            */
            Bone.bonesSorted = function (bones) {
                var errors = 0;
                bones.forEach(function (bone) {
                    if (bone.index <= bone.parentIndex()) {
                        ++errors;
                    }
                });
                return errors == 0;
            };
            /**
            * Sorts bones so that child bones appear after their parents in the list.
            */
            Bone.sortBones = function (bones) {
                var result = bones.slice(0);
                result = result.sort(function (a, b) {
                    var ad = a.depth();
                    var bd = b.depth();
                    if (ad < bd) {
                        return -1;
                    }
                    else if (ad > bd) {
                        return 1;
                    }
                    else {
                        return (a.parentIndex() - b.parentIndex()) + 0.001 * (a.index - b.index);
                    }
                });
                // Bone indices have changed
                Bone.updateIndices(result);
                if (result.length != bones.length || Bone.bonesSorted(result) == false) {
                    throw new Error("Error while sorting bones");
                }
                return result;
            };
            return Bone;
        })();
        Converter.Bone = Bone;
    })(Converter = COLLADA.Converter || (COLLADA.Converter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="../math.ts" />
var COLLADA;
(function (COLLADA) {
    var Converter;
    (function (Converter) {
        var BoundingBox = (function () {
            function BoundingBox() {
                this.min = vec3.create();
                this.max = vec3.create();
                this.reset();
            }
            BoundingBox.prototype.reset = function () {
                vec3.set(this.min, Infinity, Infinity, Infinity);
                vec3.set(this.max, -Infinity, -Infinity, -Infinity);
            };
            BoundingBox.prototype.fromPositions = function (p, offset, count) {
                this.reset();
                for (var i = 0; i < count; ++i) {
                    for (var d = 0; d < 3; ++d) {
                        var value = p[(offset + i) * 3 + d];
                        this.min[d] = Math.min(this.min[d], value);
                        this.max[d] = Math.max(this.max[d], value);
                    }
                }
            };
            BoundingBox.prototype.extend = function (p) {
                vec3.max(this.max, this.max, p);
                vec3.min(this.min, this.min, p);
            };
            BoundingBox.prototype.extendBox = function (b) {
                vec3.max(this.max, this.max, b.max);
                vec3.min(this.min, this.min, b.min);
            };
            return BoundingBox;
        })();
        Converter.BoundingBox = BoundingBox;
    })(Converter = COLLADA.Converter || (COLLADA.Converter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="utils.ts" />
/// <reference path="material.ts" />
/// <reference path="bone.ts" />
/// <reference path="bounding_box.ts" />
/// <reference path="../external/gl-matrix.i.ts" />
/// <reference path="../math.ts" />
var COLLADA;
(function (COLLADA) {
    var Converter;
    (function (Converter) {
        var GeometryData = (function () {
            function GeometryData() {
                this.indices = null;
                this.position = null;
                this.normal = null;
                this.texcoord = null;
                this.boneweight = null;
                this.boneindex = null;
            }
            return GeometryData;
        })();
        Converter.GeometryData = GeometryData;
        var GeometryChunkSourceIndices = (function () {
            function GeometryChunkSourceIndices() {
                this.indices = null;
                this.indexStride = null;
                this.indexOffset = null;
            }
            return GeometryChunkSourceIndices;
        })();
        Converter.GeometryChunkSourceIndices = GeometryChunkSourceIndices;
        var GeometryChunk = (function () {
            function GeometryChunk() {
                this.name = null;
                this.vertexCount = null;
                this.vertexBufferOffset = null;
                this.triangleCount = null;
                this.indexBufferOffset = null;
                this.boundingBox = new Converter.BoundingBox();
                this.data = null;
                this.bindShapeMatrix = null;
                this._colladaIndices = null;
            }
            /**
            * Creates a geometry chunk with its own geometry data buffers.
            *
            * This de-indexes the COLLADA data, so that it is usable by GPUs.
            */
            GeometryChunk.createChunk = function (geometry, triangles, context) {
                // Per-triangle data input
                var inputTriVertices = null;
                var inputTriNormal = null;
                var inputTriColor = null;
                var inputTriTexcoord = [];
                for (var i = 0; i < triangles.inputs.length; i++) {
                    var input = triangles.inputs[i];
                    switch (input.semantic) {
                        case "VERTEX":
                            inputTriVertices = input;
                            break;
                        case "NORMAL":
                            inputTriNormal = input;
                            break;
                        case "COLOR":
                            inputTriColor = input;
                            break;
                        case "TEXCOORD":
                            inputTriTexcoord.push(input);
                            break;
                        default:
                            context.log.write("Unknown triangles input semantic " + input.semantic + " ignored", 3 /* Warning */);
                    }
                }
                // Per-triangle data source
                var srcTriVertices = COLLADA.Loader.Vertices.fromLink(inputTriVertices.source, context);
                if (srcTriVertices === null) {
                    context.log.write("Geometry " + geometry.id + " has no vertices, geometry ignored", 3 /* Warning */);
                    return null;
                }
                var srcTriNormal = COLLADA.Loader.Source.fromLink(inputTriNormal != null ? inputTriNormal.source : null, context);
                var srcTriColor = COLLADA.Loader.Source.fromLink(inputTriColor != null ? inputTriColor.source : null, context);
                var srcTriTexcoord = inputTriTexcoord.map(function (x) { return COLLADA.Loader.Source.fromLink(x != null ? x.source : null, context); });
                // Per-vertex data input
                var inputVertPos = null;
                var inputVertNormal = null;
                var inputVertColor = null;
                var inputVertTexcoord = [];
                for (var i = 0; i < srcTriVertices.inputs.length; i++) {
                    var input = srcTriVertices.inputs[i];
                    switch (input.semantic) {
                        case "POSITION":
                            inputVertPos = input;
                            break;
                        case "NORMAL":
                            inputVertNormal = input;
                            break;
                        case "COLOR":
                            inputVertColor = input;
                            break;
                        case "TEXCOORD":
                            inputVertTexcoord.push(input);
                            break;
                        default:
                            context.log.write("Unknown vertices input semantic " + input.semantic + " ignored", 3 /* Warning */);
                    }
                }
                // Per-vertex data source
                var srcVertPos = COLLADA.Loader.Source.fromLink(inputVertPos.source, context);
                if (srcVertPos === null) {
                    context.log.write("Geometry " + geometry.id + " has no vertex positions, geometry ignored", 3 /* Warning */);
                    return null;
                }
                var srcVertNormal = COLLADA.Loader.Source.fromLink(inputVertNormal != null ? inputVertNormal.source : null, context);
                var srcVertColor = COLLADA.Loader.Source.fromLink(inputVertColor != null ? inputVertColor.source : null, context);
                var srcVertTexcoord = inputVertTexcoord.map(function (x) { return COLLADA.Loader.Source.fromLink(x != null ? x.source : null, context); });
                // Raw data
                var dataVertPos = COLLADA.Converter.Utils.createFloatArray(srcVertPos, "vertex position", 3, context);
                var dataVertNormal = COLLADA.Converter.Utils.createFloatArray(srcVertNormal, "vertex normal", 3, context);
                var dataTriNormal = COLLADA.Converter.Utils.createFloatArray(srcTriNormal, "vertex normal (indexed)", 3, context);
                var dataVertColor = COLLADA.Converter.Utils.createFloatArray(srcVertColor, "vertex color", 4, context);
                var dataTriColor = COLLADA.Converter.Utils.createFloatArray(srcTriColor, "vertex color (indexed)", 4, context);
                var dataVertTexcoord = srcVertTexcoord.map(function (x) { return COLLADA.Converter.Utils.createFloatArray(x, "texture coordinate", 2, context); });
                var dataTriTexcoord = srcTriTexcoord.map(function (x) { return COLLADA.Converter.Utils.createFloatArray(x, "texture coordinate (indexed)", 2, context); });
                // Make sure the geometry only contains triangles
                if (triangles.type !== "triangles") {
                    var vcount = triangles.vcount;
                    if (vcount) {
                        for (var i = 0; i < vcount.length; i++) {
                            var c = vcount[i];
                            if (c !== 3) {
                                context.log.write("Geometry " + geometry.id + " has non-triangle polygons, geometry ignored.", 3 /* Warning */);
                                return null;
                            }
                        }
                    }
                    else {
                        context.log.write("Geometry " + geometry.id + " has polygons with an unknown number of vertices per polygon. Assuming all triangles.", 3 /* Warning */);
                    }
                }
                // Security checks
                if (srcVertPos.stride !== 3) {
                    context.log.write("Geometry " + geometry.id + " vertex positions are not 3D vectors, geometry ignored", 3 /* Warning */);
                    return null;
                }
                // Extract indices used by this chunk
                var colladaIndices = triangles.indices;
                var trianglesCount = triangles.count;
                var triangleStride = colladaIndices.length / triangles.count;
                var triangleVertexStride = triangleStride / 3;
                var indices = COLLADA.Converter.Utils.compactIndices(colladaIndices, triangleVertexStride, inputTriVertices.offset);
                if ((indices === null) || (indices.length === 0)) {
                    context.log.write("Geometry " + geometry.id + " does not contain any indices, geometry ignored", 4 /* Error */);
                    return null;
                }
                // The vertex count (size of the vertex buffer) is the number of unique indices in the index buffer
                var vertexCount = COLLADA.Converter.Utils.maxIndex(indices) + 1;
                var triangleCount = indices.length / 3;
                if (triangleCount !== trianglesCount) {
                    context.log.write("Geometry " + geometry.id + " has an inconsistent number of indices, geometry ignored", 4 /* Error */);
                    return null;
                }
                // Position buffer
                var position = new Float32Array(vertexCount * 3);
                var indexOffsetPosition = inputTriVertices.offset;
                COLLADA.Converter.Utils.reIndex(dataVertPos, colladaIndices, triangleVertexStride, indexOffsetPosition, 3, position, indices, 1, 0, 3);
                // Normal buffer
                var normal = new Float32Array(vertexCount * 3);
                var indexOffsetNormal = inputTriNormal !== null ? inputTriNormal.offset : null;
                if (dataVertNormal !== null) {
                    COLLADA.Converter.Utils.reIndex(dataVertNormal, colladaIndices, triangleVertexStride, indexOffsetPosition, 3, normal, indices, 1, 0, 3);
                }
                else if (dataTriNormal !== null) {
                    COLLADA.Converter.Utils.reIndex(dataTriNormal, colladaIndices, triangleVertexStride, indexOffsetNormal, 3, normal, indices, 1, 0, 3);
                }
                else {
                    context.log.write("Geometry " + geometry.id + " has no normal data, using zero vectors", 3 /* Warning */);
                }
                // Texture coordinate buffer
                var texcoord = new Float32Array(vertexCount * 2);
                var indexOffsetTexcoord = inputTriTexcoord.length > 0 ? inputTriTexcoord[0].offset : null;
                if (dataVertTexcoord.length > 0) {
                    COLLADA.Converter.Utils.reIndex(dataVertTexcoord[0], colladaIndices, triangleVertexStride, indexOffsetPosition, 2, texcoord, indices, 1, 0, 2);
                }
                else if (dataTriTexcoord.length > 0) {
                    COLLADA.Converter.Utils.reIndex(dataTriTexcoord[0], colladaIndices, triangleVertexStride, indexOffsetTexcoord, 2, texcoord, indices, 1, 0, 2);
                }
                else {
                    context.log.write("Geometry " + geometry.id + " has no texture coordinate data, using zero vectors", 3 /* Warning */);
                }
                // Geometry data buffers
                var geometryData = new GeometryData();
                geometryData.indices = indices;
                geometryData.position = position;
                geometryData.normal = normal;
                geometryData.texcoord = texcoord;
                // Backup of the original COLLADA indices
                var sourceIndices = new GeometryChunkSourceIndices();
                sourceIndices.indices = colladaIndices;
                sourceIndices.indexStride = triangleVertexStride;
                sourceIndices.indexOffset = indexOffsetPosition;
                // Geometry chunk
                var result = new COLLADA.Converter.GeometryChunk();
                result.vertexCount = vertexCount;
                result.vertexBufferOffset = 0;
                result.triangleCount = triangleCount;
                result.indexBufferOffset = 0;
                result.data = geometryData;
                result._colladaIndices = sourceIndices;
                return result;
            };
            /**
            * Computes the bounding box of the static (unskinned) geometry
            */
            GeometryChunk.computeBoundingBox = function (chunk, context) {
                chunk.boundingBox.fromPositions(chunk.data.position, chunk.vertexBufferOffset, chunk.vertexCount);
            };
            /**
            * Transforms the positions and normals of the given Chunk by the given matrices
            */
            GeometryChunk.transformChunk = function (chunk, positionMatrix, normalMatrix, context) {
                var position = chunk.data.position;
                if (position !== null) {
                    vec3.forEach(position, 3, 0, position.length / 3, vec3.transformMat4, positionMatrix);
                }
                var normal = chunk.data.normal;
                if (normal !== null) {
                    vec3.forEach(normal, 3, 0, normal.length / 3, vec3.transformMat3, normalMatrix);
                }
            };
            /**
            * Scales the positions of the given Chunk
            */
            GeometryChunk.scaleChunk = function (chunk, scale, context) {
                var position = chunk.data.position;
                if (position !== null) {
                    for (var i = 0; i < position.length; ++i) {
                        position[i] = position[i] * scale;
                    }
                }
            };
            /**
            * Merges the geometric data from all the chunks into a single set of buffers.
            * The old buffers of the chunks are discarded and replaced by the new (bigger) buffers.
            * Each chunk then uses the same buffers, but uses a different portion of the buffers, according to the triangleCount and triangleOffset.
            * A single new chunk containing all the geometry is returned.
            */
            GeometryChunk.mergeChunkData = function (chunks, context) {
                if (chunks.length < 2) {
                    return;
                }
                // Count number of data elements
                var vertexCount = 0;
                var triangleCount = 0;
                var has_position = (chunks.length > 0);
                var has_normal = (chunks.length > 0);
                var has_texcoord = (chunks.length > 0);
                var has_boneweight = (chunks.length > 0);
                var has_boneindex = (chunks.length > 0);
                for (var i = 0; i < chunks.length; ++i) {
                    var chunk = chunks[i];
                    var chunkData = chunk.data;
                    vertexCount += chunk.vertexCount;
                    triangleCount += chunk.triangleCount;
                    has_position = has_position && (chunkData.position !== null);
                    has_normal = has_normal && (chunkData.normal !== null);
                    has_texcoord = has_texcoord && (chunkData.texcoord !== null);
                    has_boneweight = has_boneweight && (chunkData.boneweight !== null);
                    has_boneindex = has_boneindex && (chunkData.boneindex !== null);
                }
                // Create data buffers
                var resultData = new GeometryData();
                resultData.indices = new Uint32Array(triangleCount * 3);
                if (has_position) {
                    resultData.position = new Float32Array(vertexCount * 3);
                }
                if (has_normal) {
                    resultData.normal = new Float32Array(vertexCount * 3);
                }
                if (has_texcoord) {
                    resultData.texcoord = new Float32Array(vertexCount * 2);
                }
                if (has_boneindex) {
                    resultData.boneindex = new Uint8Array(vertexCount * 4);
                }
                if (has_boneweight) {
                    resultData.boneweight = new Float32Array(vertexCount * 4);
                }
                // Copy data
                var indexBufferOffset = 0;
                var vertexBufferOffset = 0;
                for (var i = 0; i < chunks.length; ++i) {
                    var chunk = chunks[i];
                    var chunkData = chunk.data;
                    for (var j = 0; j < chunk.triangleCount * 3; ++j) {
                        resultData.indices[indexBufferOffset + j] = chunkData.indices[j + chunk.indexBufferOffset] + vertexBufferOffset;
                    }
                    // Copy vertex data
                    if (has_position) {
                        COLLADA.MathUtils.copyNumberArrayOffset(chunkData.position, chunk.vertexBufferOffset * 3, resultData.position, vertexBufferOffset * 3, chunk.vertexCount * 3);
                    }
                    if (has_normal) {
                        COLLADA.MathUtils.copyNumberArrayOffset(chunkData.normal, chunk.vertexBufferOffset * 3, resultData.normal, vertexBufferOffset * 3, chunk.vertexCount * 3);
                    }
                    if (has_texcoord) {
                        COLLADA.MathUtils.copyNumberArrayOffset(chunkData.texcoord, chunk.vertexBufferOffset * 2, resultData.texcoord, vertexBufferOffset * 2, chunk.vertexCount * 2);
                    }
                    if (has_boneweight) {
                        COLLADA.MathUtils.copyNumberArrayOffset(chunkData.boneweight, chunk.vertexBufferOffset * 4, resultData.boneweight, vertexBufferOffset * 4, chunk.vertexCount * 4);
                    }
                    if (has_boneindex) {
                        COLLADA.MathUtils.copyNumberArrayOffset(chunkData.boneindex, chunk.vertexBufferOffset * 4, resultData.boneindex, vertexBufferOffset * 4, chunk.vertexCount * 4);
                    }
                    // Discard the original chunk data
                    chunk.data = resultData;
                    chunk.vertexBufferOffset = vertexBufferOffset;
                    chunk.indexBufferOffset = indexBufferOffset;
                    // Update offset
                    vertexBufferOffset += chunk.vertexCount;
                    indexBufferOffset += chunk.triangleCount * 3;
                }
            };
            return GeometryChunk;
        })();
        Converter.GeometryChunk = GeometryChunk;
    })(Converter = COLLADA.Converter || (COLLADA.Converter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="utils.ts" />
/// <reference path="material.ts" />
/// <reference path="bone.ts" />
/// <reference path="geometry_chunk.ts" />
/// <reference path="bounding_box.ts" />
/// <reference path="../external/gl-matrix.i.ts" />
/// <reference path="../math.ts" />
var COLLADA;
(function (COLLADA) {
    var Converter;
    (function (Converter) {
        var Geometry = (function () {
            function Geometry() {
                this.name = "";
                this.chunks = [];
                this.bones = [];
                this.boundingBox = new Converter.BoundingBox();
            }
            /**
            * Creates a static (non-animated) geometry
            */
            Geometry.createStatic = function (instanceGeometry, context) {
                var geometry = COLLADA.Loader.Geometry.fromLink(instanceGeometry.geometry, context);
                if (geometry === null) {
                    context.log.write("Geometry instance has no geometry, mesh ignored", 3 /* Warning */);
                    return null;
                }
                return COLLADA.Converter.Geometry.createGeometry(geometry, instanceGeometry.materials, context);
            };
            /**
            * Creates an animated (skin or morph) geometry
            */
            Geometry.createAnimated = function (instanceController, context) {
                var controller = COLLADA.Loader.Controller.fromLink(instanceController.controller, context);
                if (controller === null) {
                    context.log.write("Controller instance has no controller, mesh ignored", 3 /* Warning */);
                    return null;
                }
                if (controller.skin !== null) {
                    return COLLADA.Converter.Geometry.createSkin(instanceController, controller, context);
                }
                else if (controller.morph !== null) {
                    return COLLADA.Converter.Geometry.createMorph(instanceController, controller, context);
                }
                return null;
            };
            /**
            * Creates a skin-animated geometry
            */
            Geometry.createSkin = function (instanceController, controller, context) {
                // Controller element
                var controller = COLLADA.Loader.Controller.fromLink(instanceController.controller, context);
                if (controller === null) {
                    context.log.write("Controller instance has no controller, mesh ignored", 4 /* Error */);
                    return null;
                }
                // Skin element
                var skin = controller.skin;
                if (skin === null) {
                    context.log.write("Controller has no skin, mesh ignored", 4 /* Error */);
                    return null;
                }
                // Geometry element
                var loaderGeometry = COLLADA.Loader.Geometry.fromLink(skin.source, context);
                if (loaderGeometry === null) {
                    context.log.write("Controller has no geometry, mesh ignored", 4 /* Error */);
                    return null;
                }
                // Create skin geometry
                var geometry = COLLADA.Converter.Geometry.createGeometry(loaderGeometry, instanceController.materials, context);
                // Skeleton root nodes
                var skeletonLinks = instanceController.skeletons;
                var skeletonRootNodes = [];
                for (var i = 0; i < skeletonLinks.length; i++) {
                    var skeletonLink = skeletonLinks[i];
                    var skeletonRootNode = COLLADA.Loader.VisualSceneNode.fromLink(skeletonLink, context);
                    if (skeletonRootNode === null) {
                        context.log.write("Skeleton root node " + skeletonLink.getUrl() + " not found, skeleton root ignored", 3 /* Warning */);
                        continue;
                    }
                    skeletonRootNodes.push(skeletonRootNode);
                }
                if (skeletonRootNodes.length === 0) {
                    context.log.write("Controller has no skeleton, using the whole scene as the skeleton root", 3 /* Warning */);
                    skeletonRootNodes = context.nodes.collada.filter(function (node) { return (context.isInstanceOf(node.parent, "VisualScene")); });
                }
                if (skeletonRootNodes.length === 0) {
                    context.log.write("Controller still has no skeleton, using unskinned geometry", 3 /* Warning */);
                    return geometry;
                }
                // Joints
                var jointsElement = skin.joints;
                if (jointsElement === null) {
                    context.log.write("Skin has no joints element, using unskinned mesh", 3 /* Warning */);
                    return geometry;
                }
                var jointsInput = jointsElement.joints;
                if (jointsInput === null) {
                    context.log.write("Skin has no joints input, using unskinned mesh", 3 /* Warning */);
                    return geometry;
                }
                var jointsSource = COLLADA.Loader.Source.fromLink(jointsInput.source, context);
                if (jointsSource === null) {
                    context.log.write("Skin has no joints source, using unskinned mesh", 3 /* Warning */);
                    return geometry;
                }
                var jointSids = jointsSource.data;
                // Bind shape matrix
                var bindShapeMatrix = null;
                if (skin.bindShapeMatrix !== null) {
                    bindShapeMatrix = mat4.create();
                    COLLADA.MathUtils.mat4Extract(skin.bindShapeMatrix, 0, bindShapeMatrix);
                }
                // InvBindMatrices
                var invBindMatricesInput = jointsElement.invBindMatrices;
                if (invBindMatricesInput === null) {
                    context.log.write("Skin has no inverse bind matrix input, using unskinned mesh", 3 /* Warning */);
                    return geometry;
                }
                var invBindMatricesSource = COLLADA.Loader.Source.fromLink(invBindMatricesInput.source, context);
                if (jointsSource === null) {
                    context.log.write("Skin has no inverse bind matrix source, using unskinned mesh", 3 /* Warning */);
                    return geometry;
                }
                if (invBindMatricesSource.data.length !== jointsSource.data.length * 16) {
                    context.log.write("Skin has an inconsistent length of joint data sources, using unskinned mesh", 3 /* Warning */);
                    return geometry;
                }
                if (!(invBindMatricesSource.data instanceof Float32Array)) {
                    context.log.write("Skin inverse bind matrices data does not contain floating point data, using unskinned mesh", 3 /* Warning */);
                    return geometry;
                }
                var invBindMatrices = invBindMatricesSource.data;
                // Vertex weights
                var weightsElement = skin.vertexWeights;
                if (weightsElement === null) {
                    context.log.write("Skin contains no bone weights element, using unskinned mesh", 3 /* Warning */);
                    return geometry;
                }
                var weightsInput = weightsElement.weights;
                if (weightsInput === null) {
                    context.log.write("Skin contains no bone weights input, using unskinned mesh", 3 /* Warning */);
                    return geometry;
                }
                var weightsSource = COLLADA.Loader.Source.fromLink(weightsInput.source, context);
                if (weightsSource === null) {
                    context.log.write("Skin has no bone weights source, using unskinned mesh", 3 /* Warning */);
                    return geometry;
                }
                if (!(weightsSource.data instanceof Float32Array)) {
                    context.log.write("Bone weights data does not contain floating point data, using unskinned mesh", 3 /* Warning */);
                    return geometry;
                }
                var weightsData = weightsSource.data;
                // Indices
                if (skin.vertexWeights.joints.source.url !== skin.joints.joints.source.url) {
                    // Holy crap, how many indirections does this stupid format have?!?
                    // If the data sources differ, we would have to reorder the elements of the "bones" array.
                    context.log.write("Skin uses different data sources for joints in <joints> and <vertex_weights>, this is not supported. Using unskinned mesh.", 3 /* Warning */);
                    return geometry;
                }
                // Bones
                var bones = COLLADA.Converter.Bone.createSkinBones(jointSids, skeletonRootNodes, bindShapeMatrix, invBindMatrices, context);
                if (bones === null || bones.length === 0) {
                    context.log.write("Skin contains no bones, using unskinned mesh", 3 /* Warning */);
                    return geometry;
                }
                // Sort bones if necessary
                var index_map = null;
                if (context.options.sortBones.value) {
                    var unsorted_bones = bones;
                    bones = COLLADA.Converter.Bone.sortBones(unsorted_bones);
                    index_map = COLLADA.Converter.Bone.getBoneIndexMap(unsorted_bones, bones);
                }
                else {
                    index_map = COLLADA.Converter.Bone.getBoneIndexMap(bones, bones);
                }
                // Compact skinning data
                var bonesPerVertex = 4;
                var weightsIndices = skin.vertexWeights.v;
                var weightsCounts = skin.vertexWeights.vcount;
                var skinVertexCount = weightsCounts.length;
                var skinWeights = new Float32Array(skinVertexCount * bonesPerVertex);
                var skinIndices = new Uint8Array(skinVertexCount * bonesPerVertex);
                var vindex = 0;
                var verticesWithTooManyInfluences = 0;
                var verticesWithInvalidTotalWeight = 0;
                var weightCounts = new Float32Array(32);
                for (var i = 0; i < skinVertexCount; ++i) {
                    // Number of bone references for the current vertex
                    var weightCount = weightsCounts[i];
                    if (weightCount > bonesPerVertex) {
                        verticesWithTooManyInfluences++;
                    }
                    weightCounts[Math.min(weightCount, weightCounts.length - 1)]++;
                    for (var w = 0; w < weightCount; ++w) {
                        var boneIndex = weightsIndices[vindex];
                        boneIndex = index_map[boneIndex];
                        var boneWeightIndex = weightsIndices[vindex + 1];
                        vindex += 2;
                        var boneWeight = weightsData[boneWeightIndex];
                        var offsetBegin = i * bonesPerVertex;
                        var offsetEnd = i * bonesPerVertex + bonesPerVertex - 1;
                        Converter.Utils.insertBone(skinIndices, skinWeights, boneIndex, boneWeight, offsetBegin, offsetEnd);
                    }
                    // Total weight
                    var totalWeight = 0;
                    for (var w = 0; w < bonesPerVertex; ++w) {
                        totalWeight += skinWeights[i * bonesPerVertex + w];
                    }
                    // Normalize weights (COLLADA weights should be already normalized)
                    if (totalWeight < 1e-6 || totalWeight > 1e6) {
                        verticesWithInvalidTotalWeight++;
                    }
                    else {
                        for (var w = 0; w < weightCount; ++w) {
                            skinWeights[i * bonesPerVertex + w] /= totalWeight;
                        }
                    }
                }
                if (verticesWithTooManyInfluences > 0) {
                    context.log.write("" + verticesWithTooManyInfluences + " vertices are influenced by too many bones, some influences were ignored. Only " + bonesPerVertex + " bones per vertex are supported.", 3 /* Warning */);
                }
                if (verticesWithInvalidTotalWeight > 0) {
                    context.log.write("" + verticesWithInvalidTotalWeight + " vertices have zero or infinite total weight, skin will be broken.", 3 /* Warning */);
                }
                for (var i = 0; i < geometry.chunks.length; ++i) {
                    var chunk = geometry.chunks[i];
                    var chunkData = chunk.data;
                    var chunkSrcIndices = chunk._colladaIndices;
                    // Distribute indices to chunks
                    chunkData.boneindex = new Uint8Array(chunk.vertexCount * bonesPerVertex);
                    COLLADA.Converter.Utils.reIndex(skinIndices, chunkSrcIndices.indices, chunkSrcIndices.indexStride, chunkSrcIndices.indexOffset, bonesPerVertex, chunkData.boneindex, chunkData.indices, 1, 0, bonesPerVertex);
                    // Distribute weights to chunks
                    chunkData.boneweight = new Float32Array(chunk.vertexCount * bonesPerVertex);
                    COLLADA.Converter.Utils.reIndex(skinWeights, chunkSrcIndices.indices, chunkSrcIndices.indexStride, chunkSrcIndices.indexOffset, bonesPerVertex, chunkData.boneweight, chunkData.indices, 1, 0, bonesPerVertex);
                }
                for (var i = 0; i < geometry.chunks.length; ++i) {
                    var chunk = geometry.chunks[i];
                    chunk.bindShapeMatrix = mat4.clone(bindShapeMatrix);
                }
                // Apply bind shape matrices
                if (context.options.applyBindShape.value === true) {
                    Geometry.applyBindShapeMatrices(geometry, context);
                }
                geometry.bones = bones;
                return geometry;
            };
            Geometry.createMorph = function (instanceController, controller, context) {
                context.log.write("Morph animated meshes not supported, mesh ignored", 3 /* Warning */);
                return null;
            };
            Geometry.createGeometry = function (geometry, instanceMaterials, context) {
                var materialMap = COLLADA.Converter.Material.getMaterialMap(instanceMaterials, context);
                var result = new COLLADA.Converter.Geometry();
                result.name = geometry.name || geometry.id || geometry.sid || "geometry";
                // Loop over all <triangle> elements
                var trianglesList = geometry.triangles;
                for (var i = 0; i < trianglesList.length; i++) {
                    var triangles = trianglesList[i];
                    // Find the used material
                    var material;
                    if (triangles.material !== null) {
                        material = materialMap.symbols[triangles.material];
                        if (material === null) {
                            context.log.write("Material symbol " + triangles.material + " has no bound material instance, using default material", 3 /* Warning */);
                            material = COLLADA.Converter.Material.createDefaultMaterial(context);
                        }
                    }
                    else {
                        context.log.write("Missing material index, using default material", 3 /* Warning */);
                        material = COLLADA.Converter.Material.createDefaultMaterial(context);
                    }
                    // Create a geometry chunk
                    var chunk = COLLADA.Converter.GeometryChunk.createChunk(geometry, triangles, context);
                    if (chunk !== null) {
                        chunk.name = result.name;
                        if (trianglesList.length > 1) {
                            chunk.name += (" #" + i);
                        }
                        chunk.material = material;
                        result.chunks.push(chunk);
                    }
                }
                return result;
            };
            /**
            * Transforms the given geometry (position and normals) by the given matrix
            */
            Geometry.transformGeometry = function (geometry, transformMatrix, context) {
                // Create the normal transformation matrix
                var normalMatrix = mat3.create();
                mat3.normalFromMat4(normalMatrix, transformMatrix);
                for (var i = 0; i < geometry.chunks.length; ++i) {
                    var chunk = geometry.chunks[i];
                    Converter.GeometryChunk.transformChunk(chunk, transformMatrix, normalMatrix, context);
                }
            };
            /**
            * Adapts inverse bind matrices to account for any additional transformations due to the world transform
            */
            Geometry.setupWorldTransform = function (geometry, context) {
                if (geometry.bones == null)
                    return;
                // Skinning equation:                [worldMatrix]     * [invBindMatrix]        * [pos]
                // Same with transformation A added: [worldMatrix]     * [invBindMatrix * A^-1] * [A * pos]
                // Same with transformation B added: [worldMatrix * B] * [B^-1 * invBindMatrix] * [pos]
                geometry.bones.forEach(function (bone) {
                    // Transformation A (the world scale)
                    if (context.options.worldTransformBake) {
                        mat4.multiply(bone.invBindMatrix, bone.invBindMatrix, Converter.Utils.getWorldInvTransform(context));
                    }
                    // Transformation B (the post-transformation of the corresponding node)
                    if (context.options.worldTransformUnitScale) {
                        var mat = mat4.create();
                        mat4.invert(mat, bone.node.transformation_post);
                        mat4.multiply(bone.invBindMatrix, mat, bone.invBindMatrix);
                    }
                });
            };
            /**
            * Scales the given geometry
            */
            Geometry.scaleGeometry = function (geometry, scale, context) {
                for (var i = 0; i < geometry.chunks.length; ++i) {
                    var chunk = geometry.chunks[i];
                    Converter.GeometryChunk.scaleChunk(chunk, scale, context);
                }
                if (geometry.bones) {
                    geometry.bones.forEach(function (bone) {
                        bone.invBindMatrix[12] *= scale;
                        bone.invBindMatrix[13] *= scale;
                        bone.invBindMatrix[14] *= scale;
                    });
                }
            };
            /**
            * Applies the bind shape matrix to the given geometry.
            *
            * This transforms the geometry by the bind shape matrix, and resets the bind shape matrix to identity.
            */
            Geometry.applyBindShapeMatrices = function (geometry, context) {
                for (var i = 0; i < geometry.chunks.length; ++i) {
                    var chunk = geometry.chunks[i];
                    var bindShapeMatrix = chunk.bindShapeMatrix;
                    if (bindShapeMatrix) {
                        var normalMatrix = mat3.create();
                        mat3.normalFromMat4(normalMatrix, bindShapeMatrix);
                        // Pre-multiply geometry data by the bind shape matrix
                        Converter.GeometryChunk.transformChunk(chunk, bindShapeMatrix, normalMatrix, context);
                        // Reset the bind shape matrix
                        mat4.identity(chunk.bindShapeMatrix);
                    }
                }
            };
            /**
            * Computes the bounding box of the static (unskinned) geometry
            */
            Geometry.computeBoundingBox = function (geometry, context) {
                geometry.boundingBox.reset();
                for (var i = 0; i < geometry.chunks.length; ++i) {
                    var chunk = geometry.chunks[i];
                    Converter.GeometryChunk.computeBoundingBox(chunk, context);
                    geometry.boundingBox.extendBox(chunk.boundingBox);
                }
            };
            Geometry.addSkeleton = function (geometry, node, context) {
                // Create a single bone
                var colladaNode = context.nodes.findCollada(node);
                var bone = COLLADA.Converter.Bone.create(node);
                mat4.identity(bone.invBindMatrix);
                geometry.bones.push(bone);
                COLLADA.Converter.Bone.updateIndices(geometry.bones);
                for (var i = 0; i < geometry.chunks.length; ++i) {
                    var chunk = geometry.chunks[i];
                    var chunkData = chunk.data;
                    chunkData.boneindex = new Uint8Array(chunk.vertexCount * 4);
                    chunkData.boneweight = new Float32Array(chunk.vertexCount * 4);
                    for (var v = 0; v < chunk.vertexCount; ++v) {
                        chunkData.boneindex[4 * v + 0] = 0;
                        chunkData.boneindex[4 * v + 1] = 0;
                        chunkData.boneindex[4 * v + 2] = 0;
                        chunkData.boneindex[4 * v + 3] = 0;
                        chunkData.boneweight[4 * v + 0] = 1;
                        chunkData.boneweight[4 * v + 1] = 0;
                        chunkData.boneweight[4 * v + 2] = 0;
                        chunkData.boneweight[4 * v + 3] = 0;
                    }
                }
            };
            /**
            * Moves all data from given geometries into one merged geometry.
            * The original geometries will be empty after this operation (lazy design to avoid data duplication).
            */
            Geometry.mergeGeometries = function (geometries, context) {
                if (geometries.length === 1) {
                    return geometries[0];
                }
                var result = new COLLADA.Converter.Geometry();
                result.name = "merged_geometry";
                // Merge skeleton bones
                var merged_bones = [];
                for (var i = 0; i < geometries.length; ++i) {
                    COLLADA.Converter.Bone.appendBones(merged_bones, geometries[i].bones);
                }
                result.bones = merged_bones;
                // Sort bones if necessary
                if (context.options.sortBones.value) {
                    merged_bones = COLLADA.Converter.Bone.sortBones(merged_bones);
                }
                for (var i = 0; i < geometries.length; ++i) {
                    COLLADA.Converter.Geometry.adaptBoneIndices(geometries[i], merged_bones, context);
                }
                // Set bone indices
                COLLADA.Converter.Bone.updateIndices(merged_bones);
                for (var i = 0; i < merged_bones.length; ++i) {
                    var bone = merged_bones[i];
                    if (bone.parent !== null) {
                        if (bone.parent != merged_bones[bone.parentIndex()])
                            throw new Error("Inconsistent bone parent");
                    }
                }
                for (var i = 0; i < geometries.length; ++i) {
                    result.chunks = result.chunks.concat(geometries[i].chunks);
                }
                for (var i = 0; i < geometries.length; ++i) {
                    geometries[i].chunks = [];
                    geometries[i].bones = [];
                }
                return result;
            };
            /**
            * Change all vertex bone indices so that they point to the given new_bones array, instead of the current geometry.bones array
            */
            Geometry.adaptBoneIndices = function (geometry, new_bones, context) {
                if (geometry.bones.length === 0) {
                    return;
                }
                // Compute the index map
                var index_map = COLLADA.Converter.Bone.getBoneIndexMap(geometry.bones, new_bones);
                for (var i = 0; i < geometry.chunks.length; ++i) {
                    var chunk = geometry.chunks[i];
                    var boneindex = chunk.data.boneindex;
                    for (var j = 0; j < boneindex.length; ++j) {
                        boneindex[j] = index_map[boneindex[j]];
                    }
                }
            };
            return Geometry;
        })();
        Converter.Geometry = Geometry;
    })(Converter = COLLADA.Converter || (COLLADA.Converter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="../math.ts" />
/// <reference path="context.ts" />
/// <reference path="utils.ts" />
/// <reference path="animation_channel.ts" />
var COLLADA;
(function (COLLADA) {
    var Converter;
    (function (Converter) {
        var AnimationTimeStatistics = (function () {
            function AnimationTimeStatistics() {
                this.minTime = Infinity;
                this.maxTime = -Infinity;
                this.minAvgFps = Infinity;
                this.maxAvgFps = -Infinity;
                this.sumAvgFps = 0;
                this.count = 0;
            }
            AnimationTimeStatistics.prototype.avgFps = function () {
                return (this.count > 0) ? (this.sumAvgFps / this.count) : null;
            };
            AnimationTimeStatistics.prototype.addDataPoint = function (minTime, maxTime, avgFps) {
                this.count++;
                this.minTime = Math.min(this.minTime, minTime);
                this.maxTime = Math.max(this.maxTime, maxTime);
                this.minAvgFps = Math.min(this.minAvgFps, avgFps);
                this.maxAvgFps = Math.max(this.maxAvgFps, avgFps);
                this.sumAvgFps += avgFps;
            };
            return AnimationTimeStatistics;
        })();
        Converter.AnimationTimeStatistics = AnimationTimeStatistics;
        var Animation = (function () {
            function Animation() {
                this.id = null;
                this.name = null;
                this.channels = [];
            }
            Animation.create = function (animation, context) {
                var result = new COLLADA.Converter.Animation();
                result.id = animation.id;
                result.name = animation.name;
                COLLADA.Converter.Animation.addChannelsToAnimation(animation, result, context);
                return result;
            };
            Animation.addChannelsToAnimation = function (collada_animation, converter_animation, context) {
                for (var i = 0; i < collada_animation.channels.length; ++i) {
                    var channel = COLLADA.Converter.AnimationChannel.create(collada_animation.channels[i], context);
                    converter_animation.channels.push(channel);
                }
                for (var i = 0; i < collada_animation.children.length; ++i) {
                    var child = collada_animation.children[i];
                    COLLADA.Converter.Animation.addChannelsToAnimation(child, converter_animation, context);
                }
            };
            /**
            * Returns the time and fps statistics of this animation
            */
            Animation.getTimeStatistics = function (animation, index_begin, index_end, result, context) {
                for (var i = 0; i < animation.channels.length; ++i) {
                    var channel = animation.channels[i];
                    var channelMinTime = channel.input[(index_begin !== null) ? index_begin : 0];
                    var channelMaxTime = channel.input[(index_end !== null) ? index_end : (channel.input.length - 1)];
                    var channelAvgFps = channel.input.length / (channelMaxTime - channelMinTime);
                    result.addDataPoint(channelMinTime, channelMaxTime, channelAvgFps);
                }
            };
            return Animation;
        })();
        Converter.Animation = Animation;
    })(Converter = COLLADA.Converter || (COLLADA.Converter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="../math.ts" />
/// <reference path="context.ts" />
/// <reference path="utils.ts" />
/// <reference path="animation.ts" />
var COLLADA;
(function (COLLADA) {
    var Converter;
    (function (Converter) {
        var AnimationChannel = (function () {
            function AnimationChannel() {
                this.target = null;
                this.interpolation = null;
                this.input = null;
                this.output = null;
                this.inTangent = null;
                this.outTangent = null;
                this.dataOffset = null;
                this.dataCount = null;
            }
            AnimationChannel.prototype.findInputIndices = function (t, context) {
                var input = this.input;
                // Handle borders
                if (t < input[0]) {
                    var warningCount = context.messageCount["findInputIndices-invalidTime"] || 0;
                    if (warningCount < 10) {
                        context.log.write("Invalid time for resampling: t=" + t + ", t_begin=" + input[0] + ", using first keyframe", 3 /* Warning */);
                    }
                    else if (warningCount == 10) {
                        context.log.write("Further warnings about invalid time suppressed.", 3 /* Warning */);
                    }
                    context.messageCount["findInputIndices-invalidTime"] = warningCount + 1;
                    return { i0: 0, i1: 1 };
                }
                else if (t > input[input.length - 1]) {
                    var warningCount = context.messageCount["findInputIndices-invalidTime"] || 0;
                    if (warningCount < 10) {
                        context.log.write("Invalid time for resampling: t=" + t + ", t_end=" + input[input.length - 1] + ", using last keyframe", 3 /* Warning */);
                    }
                    else if (warningCount == 10) {
                        context.log.write("Further warnings about invalid time suppressed.", 3 /* Warning */);
                    }
                    context.messageCount["findInputIndices-invalidTime"] = warningCount + 1;
                    return { i0: input.length - 2, i1: input.length - 1 };
                }
                for (var i = 0; i < input.length - 1; ++i) {
                    var t0 = input[i];
                    var t1 = input[i + 1];
                    if (t0 <= t && t <= t1) {
                        return { i0: i, i1: i + 1 };
                    }
                }
                // Should never get to this
                context.log.write("Keyframes for time " + t + "not found, using first keyframe", 3 /* Warning */);
                return { i0: 0, i1: 1 };
            };
            AnimationChannel.createInputData = function (input, inputName, dataDim, context) {
                // Input
                if (input === null) {
                    return null;
                }
                // Source
                var source = COLLADA.Loader.Source.fromLink(input.source, context);
                if (source === null) {
                    context.log.write("Animation channel has no " + inputName + " input data, data ignored", 3 /* Warning */);
                    return null;
                }
                // Data
                if (dataDim != source.stride) {
                    context.log.write("Animation channel has a nonstandard dimensionality for " + inputName + ", data ignored", 3 /* Warning */);
                    return null;
                }
                return COLLADA.Converter.Utils.createFloatArray(source, inputName, dataDim, context);
            };
            AnimationChannel.createInputDataFromArray = function (inputs, inputName, dataDim, context) {
                // Samplers can have more than one output if they describe multiple curves at once.
                // I don't understand from the spec how a single channel could describe the animation of multiple parameters,
                // since each channel references a single SID target
                if (inputs.length > 0) {
                    if (inputs.length > 1) {
                        context.log.write("Animation channel has more than one " + inputName + " input, using only the first one", 3 /* Warning */);
                    }
                    return COLLADA.Converter.AnimationChannel.createInputData(inputs[0], inputName, dataDim, context);
                }
                else {
                    return null;
                }
            };
            AnimationChannel.create = function (channel, context) {
                var result = new COLLADA.Converter.AnimationChannel();
                // Element
                var element = COLLADA.Loader.Element.fromLink(channel.target, context);
                if (element === null) {
                    context.log.write("Animation channel has an invalid target '" + channel.target.url + "', animation ignored", 3 /* Warning */);
                    return null;
                }
                // Target
                var target = context.animationTargets.findConverter(element);
                if (target === null) {
                    context.log.write("Animation channel has no converter target '" + channel.target.url + "', animation ignored", 3 /* Warning */);
                    return null;
                }
                result.target = target;
                // Sampler
                var sampler = COLLADA.Loader.Sampler.fromLink(channel.source, context);
                if (sampler === null) {
                    context.log.write("Animation channel has an invalid sampler '" + channel.source.url + "', animation ignored", 3 /* Warning */);
                    return null;
                }
                // Target dimensionality
                var targetDataRows = target.getTargetDataRows();
                var targetDataColumns = target.getTargetDataColumns();
                var targetDataDim = targetDataRows * targetDataColumns;
                // Destination data offset and count
                var targetLink = channel.target;
                if (targetLink.dotSyntax) {
                    // Member syntax: single named element
                    result.dataCount = 1;
                    switch (targetLink.member) {
                        case "X":
                            result.dataOffset = 0;
                            break;
                        case "Y":
                            result.dataOffset = 1;
                            break;
                        case "Z":
                            result.dataOffset = 2;
                            break;
                        case "W":
                            result.dataOffset = 3;
                            break;
                        case "R":
                            result.dataOffset = 0;
                            break;
                        case "G":
                            result.dataOffset = 1;
                            break;
                        case "B":
                            result.dataOffset = 2;
                            break;
                        case "U":
                            result.dataOffset = 0;
                            break;
                        case "V":
                            result.dataOffset = 1;
                            break;
                        case "S":
                            result.dataOffset = 0;
                            break;
                        case "T":
                            result.dataOffset = 1;
                            break;
                        case "P":
                            result.dataOffset = 2;
                            break;
                        case "Q":
                            result.dataOffset = 3;
                            break;
                        case "ANGLE":
                            result.dataOffset = 3;
                            break;
                        default:
                            context.log.write("Unknown semantic for '" + targetLink.url + "', animation ignored", 3 /* Warning */);
                            return null;
                    }
                }
                else if (channel.target.arrSyntax) {
                    // Array syntax: single element at a given index
                    result.dataCount = 1;
                    switch (targetLink.indices.length) {
                        case 1:
                            result.dataOffset = targetLink.indices[0];
                            break;
                        case 2:
                            result.dataOffset = targetLink.indices[0] * targetDataRows + targetLink.indices[1];
                            break;
                        default:
                            context.log.write("Invalid number of indices for '" + targetLink.url + "', animation ignored", 3 /* Warning */);
                            return null;
                    }
                }
                else {
                    // Default: data for the whole vector/array
                    result.dataOffset = 0;
                    result.dataCount = targetDataColumns * targetDataRows;
                }
                // Interpolation data
                result.input = COLLADA.Converter.AnimationChannel.createInputData(sampler.input, "input", 1, context);
                result.output = COLLADA.Converter.AnimationChannel.createInputDataFromArray(sampler.outputs, "output", result.dataCount, context);
                result.inTangent = COLLADA.Converter.AnimationChannel.createInputDataFromArray(sampler.inTangents, "intangent", result.dataCount + 1, context);
                result.outTangent = COLLADA.Converter.AnimationChannel.createInputDataFromArray(sampler.outTangents, "outtangent", result.dataCount + 1, context);
                if (result.input === null) {
                    context.log.write("Animation channel has no input data, animation ignored", 3 /* Warning */);
                    return null;
                }
                if (result.output === null) {
                    context.log.write("Animation channel has no output data, animation ignored", 3 /* Warning */);
                    return null;
                }
                // Interpolation type
                var interpolationInput = sampler.interpolation;
                if (interpolationInput === null) {
                    context.log.write("Animation channel has no interpolation input, animation ignored", 3 /* Warning */);
                    return null;
                }
                var interpolationSource = COLLADA.Loader.Source.fromLink(interpolationInput.source, context);
                if (interpolationSource === null) {
                    context.log.write("Animation channel has no interpolation source, animation ignored", 3 /* Warning */);
                    return null;
                }
                result.interpolation = COLLADA.Converter.Utils.createStringArray(interpolationSource, "interpolation type", 1, context);
                target.registerAnimation(result);
                return result;
            };
            AnimationChannel.interpolateLinear = function (time, t0, t1, i0, i1, dataCount, dataOffset, channel, destData) {
                // Find s
                var s = (time - t0) / (t1 - t0);
                for (var i = 0; i < dataCount; ++i) {
                    var p0 = channel.output[i0 * dataCount + i];
                    var p1 = channel.output[i1 * dataCount + i];
                    destData[dataOffset + i] = p0 + s * (p1 - p0);
                }
            };
            AnimationChannel.interpolateBezier = function (time, t0, t1, i0, i1, dataCount, dataOffset, channel, destData) {
                // Find s
                var tc0 = channel.outTangent[i0 * (dataCount + 1)];
                var tc1 = channel.inTangent[i1 * (dataCount + 1)];
                var tol = Math.abs(t1 - t0) * 1e-4;
                var s = COLLADA.MathUtils.bisect(time, function (s) { return COLLADA.MathUtils.bezier(t0, tc0, tc1, t1, s); }, tol, 100);
                var t_err = Math.abs(time - COLLADA.MathUtils.bezier(t0, tc0, tc1, t1, s));
                for (var i = 0; i < dataCount; ++i) {
                    var p0 = channel.output[i0 * dataCount + i];
                    var p1 = channel.output[i1 * dataCount + i];
                    var c0 = channel.outTangent[i0 * (dataCount + 1) + i + 1];
                    var c1 = channel.inTangent[i1 * (dataCount + 1) + i + 1];
                    destData[dataOffset + i] = COLLADA.MathUtils.bezier(p0, c0, c1, p1, s);
                }
            };
            AnimationChannel.interpolateHermite = function (time, t0, t1, i0, i1, dataCount, dataOffset, channel, destData) {
                // Find s
                var tt0 = channel.outTangent[i0 * (dataCount + 1)];
                var tt1 = channel.inTangent[i1 * (dataCount + 1)];
                var tol = Math.abs(t1 - t0) * 1e-5;
                var s = COLLADA.MathUtils.bisect(time, function (s) { return COLLADA.MathUtils.hermite(t0, tt0, tt1, t1, s); }, tol, 100);
                for (var i = 0; i < dataCount; ++i) {
                    var p0 = channel.output[i0 * dataCount + i];
                    var p1 = channel.output[i1 * dataCount + i];
                    var t0 = channel.outTangent[i0 * (dataCount + 1) + i + 1];
                    var t1 = channel.inTangent[i1 * (dataCount + 1) + i + 1];
                    destData[dataOffset + i] = COLLADA.MathUtils.hermite(p0, t0, t1, p1, s);
                }
            };
            AnimationChannel.applyToData = function (channel, destData, time, context) {
                // Do nothing if the channel does not contain a minimum of information
                if (channel.input === null || channel.output === null) {
                    return;
                }
                var indices = channel.findInputIndices(time, context);
                var i0 = indices.i0;
                var i1 = indices.i1;
                var t0 = channel.input[i0];
                var t1 = channel.input[i1];
                var dataCount = channel.dataCount;
                var dataOffset = channel.dataOffset;
                var interpolation = channel.interpolation[indices.i0];
                switch (interpolation) {
                    case "STEP":
                        for (var i = 0; i < dataCount; ++i) {
                            destData[dataOffset + i] = channel.output[i0 * dataCount + i];
                        }
                        break;
                    case "LINEAR":
                        COLLADA.Converter.AnimationChannel.interpolateLinear(time, t0, t1, i0, i1, dataCount, dataOffset, channel, destData);
                        break;
                    case "BEZIER":
                        if (channel.inTangent !== null && channel.outTangent !== null) {
                            COLLADA.Converter.AnimationChannel.interpolateBezier(time, t0, t1, i0, i1, dataCount, dataOffset, channel, destData);
                        }
                        else {
                            COLLADA.Converter.AnimationChannel.interpolateLinear(time, t0, t1, i0, i1, dataCount, dataOffset, channel, destData);
                        }
                        break;
                    case "HERMITE":
                        if (channel.inTangent !== null && channel.outTangent !== null) {
                            COLLADA.Converter.AnimationChannel.interpolateHermite(time, t0, t1, i0, i1, dataCount, dataOffset, channel, destData);
                        }
                        else {
                            COLLADA.Converter.AnimationChannel.interpolateLinear(time, t0, t1, i0, i1, dataCount, dataOffset, channel, destData);
                        }
                        break;
                    case "CARDINAL":
                    case "BSPLINE":
                        context.log.write("Interpolation type " + interpolation + " not supported, using STEP", 3 /* Warning */);
                        for (var i = 0; i < dataCount; ++i) {
                            destData[dataOffset + i] = channel.input[i0 * dataCount + i];
                        }
                        break;
                    default:
                        context.log.write("Unknown interpolation type " + interpolation + " at time " + time + ", using STEP", 3 /* Warning */);
                        for (var i = 0; i < dataCount; ++i) {
                            destData[dataOffset + i] = channel.input[i0 * dataCount + i];
                        }
                }
            };
            return AnimationChannel;
        })();
        Converter.AnimationChannel = AnimationChannel;
    })(Converter = COLLADA.Converter || (COLLADA.Converter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="../math.ts" />
/// <reference path="animation_channel.ts" />
/// <reference path="animation.ts" />
var COLLADA;
(function (COLLADA) {
    var Converter;
    (function (Converter) {
        (function (TransformType) {
            TransformType[TransformType["Translation"] = 1] = "Translation";
            TransformType[TransformType["Rotation"] = 2] = "Rotation";
            TransformType[TransformType["Scale"] = 3] = "Scale";
        })(Converter.TransformType || (Converter.TransformType = {}));
        var TransformType = Converter.TransformType;
        ;
        var Transform = (function () {
            function Transform(transform, rows, columns) {
                this.rows = rows;
                this.colums = columns;
                this.channels = [];
                var data_elements = rows * columns;
                this.data = new Float32Array(data_elements);
                this.original_data = new Float32Array(data_elements);
                for (var i = 0; i < data_elements; ++i) {
                    this.data[i] = transform.data[i];
                    this.original_data[i] = transform.data[i];
                }
            }
            Transform.prototype.getTargetDataRows = function () {
                return this.rows;
            };
            Transform.prototype.getTargetDataColumns = function () {
                return this.colums;
            };
            Transform.prototype.applyAnimation = function (channel, time, context) {
                COLLADA.Converter.AnimationChannel.applyToData(channel, this.data, time, context);
                this.updateFromData();
            };
            Transform.prototype.registerAnimation = function (channel) {
                this.channels.push(channel);
            };
            Transform.prototype.isAnimated = function () {
                return this.channels.length > 0;
            };
            Transform.prototype.isAnimatedBy = function (animation) {
                if (animation !== null) {
                    for (var i = 0; i < this.channels.length; ++i) {
                        var channel = this.channels[i];
                        if (animation.channels.indexOf(channel) !== -1) {
                            return true;
                        }
                    }
                    return false;
                }
                else {
                    return this.channels.length > 0;
                }
            };
            Transform.prototype.resetAnimation = function () {
                for (var i = 0; i < this.data.length; ++i) {
                    this.data[i] = this.original_data[i];
                }
                this.updateFromData();
            };
            Transform.prototype.applyTransformation = function (mat) {
                throw new Error("Not implemented");
            };
            Transform.prototype.updateFromData = function () {
                throw new Error("Not implemented");
            };
            Transform.prototype.hasTransformType = function (type) {
                throw new Error("Not implemented");
            };
            return Transform;
        })();
        Converter.Transform = Transform;
        var TransformMatrix = (function (_super) {
            __extends(TransformMatrix, _super);
            function TransformMatrix(transform) {
                _super.call(this, transform, 4, 4);
                this.matrix = mat4.create();
                this.updateFromData();
            }
            TransformMatrix.prototype.updateFromData = function () {
                COLLADA.MathUtils.mat4Extract(this.data, 0, this.matrix);
            };
            TransformMatrix.prototype.applyTransformation = function (mat) {
                mat4.multiply(mat, mat, this.matrix);
            };
            TransformMatrix.prototype.hasTransformType = function (type) {
                return true;
            };
            return TransformMatrix;
        })(Transform);
        Converter.TransformMatrix = TransformMatrix;
        var TransformRotate = (function (_super) {
            __extends(TransformRotate, _super);
            function TransformRotate(transform) {
                _super.call(this, transform, 4, 1);
                this.axis = vec3.create();
                this.radians = 0;
                this.updateFromData();
            }
            TransformRotate.prototype.updateFromData = function () {
                vec3.set(this.axis, this.data[0], this.data[1], this.data[2]);
                this.radians = this.data[3] / 180 * Math.PI;
            };
            TransformRotate.prototype.applyTransformation = function (mat) {
                mat4.rotate(mat, mat, this.radians, this.axis);
            };
            TransformRotate.prototype.hasTransformType = function (type) {
                return (type === 2 /* Rotation */);
            };
            return TransformRotate;
        })(Transform);
        Converter.TransformRotate = TransformRotate;
        var TransformTranslate = (function (_super) {
            __extends(TransformTranslate, _super);
            function TransformTranslate(transform) {
                _super.call(this, transform, 3, 1);
                this.pos = vec3.create();
                this.updateFromData();
            }
            TransformTranslate.prototype.updateFromData = function () {
                vec3.set(this.pos, this.data[0], this.data[1], this.data[2]);
            };
            TransformTranslate.prototype.applyTransformation = function (mat) {
                mat4.translate(mat, mat, this.pos);
            };
            TransformTranslate.prototype.hasTransformType = function (type) {
                return (type === 1 /* Translation */);
            };
            return TransformTranslate;
        })(Transform);
        Converter.TransformTranslate = TransformTranslate;
        var TransformScale = (function (_super) {
            __extends(TransformScale, _super);
            function TransformScale(transform) {
                _super.call(this, transform, 3, 1);
                this.scl = vec3.create();
                this.updateFromData();
            }
            TransformScale.prototype.updateFromData = function () {
                vec3.set(this.scl, this.data[0], this.data[1], this.data[2]);
            };
            TransformScale.prototype.applyTransformation = function (mat) {
                mat4.scale(mat, mat, this.scl);
            };
            TransformScale.prototype.hasTransformType = function (type) {
                return (type === 3 /* Scale */);
            };
            return TransformScale;
        })(Transform);
        Converter.TransformScale = TransformScale;
    })(Converter = COLLADA.Converter || (COLLADA.Converter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="../external/gl-matrix.i.ts" />
/// <reference path="../math.ts" />
/// <reference path="context.ts" />
/// <reference path="geometry.ts" />
/// <reference path="transform.ts" />
var COLLADA;
(function (COLLADA) {
    var Converter;
    (function (Converter) {
        var Node = (function () {
            function Node() {
                this.name = "";
                this.parent = null;
                this.children = [];
                this.geometries = [];
                this.transformations = [];
                this.matrix = mat4.create();
                this.worldMatrix = mat4.create();
                this.initialLocalMatrix = mat4.create();
                this.initialWorldMatrix = mat4.create();
                this.transformation_pre = mat4.create();
                mat4.identity(this.transformation_pre);
                this.transformation_post = mat4.create();
                mat4.identity(this.transformation_post);
            }
            Node.prototype.addTransform = function (mat) {
                var loader_transform = new COLLADA.Loader.NodeTransform();
                loader_transform.data = mat;
                loader_transform.type = "matrix";
                loader_transform.name = "virtual static transform";
                var transform = new Converter.TransformMatrix(loader_transform);
                this.transformations.unshift(transform);
            };
            /**
            * Returns the world transformation matrix of this node
            */
            Node.prototype.getWorldMatrix = function (context) {
                if (this.parent != null) {
                    mat4.multiply(this.worldMatrix, this.parent.getWorldMatrix(context), this.getLocalMatrix(context));
                }
                else {
                    mat4.copy(this.worldMatrix, this.getLocalMatrix(context));
                }
                return this.worldMatrix;
            };
            /**
            * Returns the local transformation matrix of this node
            */
            Node.prototype.getLocalMatrix = function (context) {
                // Static pre-transform
                mat4.copy(this.matrix, this.transformation_pre);
                for (var i = 0; i < this.transformations.length; i++) {
                    var transform = this.transformations[i];
                    transform.applyTransformation(this.matrix);
                }
                // Static post-transform
                mat4.multiply(this.matrix, this.matrix, this.transformation_post);
                return this.matrix;
            };
            /**
            * Returns true if this node contains any scene graph items (geometry, lights, cameras, ...)
            */
            Node.prototype.containsSceneGraphItems = function () {
                if (this.geometries.length > 0) {
                    return true;
                }
                else {
                    return false;
                }
            };
            /**
            * Returns whether there exists any animation that targets the transformation of this node
            */
            Node.prototype.isAnimated = function (recursive) {
                return this.isAnimatedBy(null, recursive);
            };
            /**
            * Returns whether there the given animation targets the transformation of this node
            */
            Node.prototype.isAnimatedBy = function (animation, recursive) {
                for (var i = 0; i < this.transformations.length; i++) {
                    var transform = this.transformations[i];
                    if (transform.isAnimatedBy(animation))
                        return true;
                }
                if (recursive && this.parent !== null) {
                    return this.parent.isAnimatedBy(animation, recursive);
                }
                return false;
            };
            Node.prototype.resetAnimation = function () {
                for (var i = 0; i < this.transformations.length; i++) {
                    var transform = this.transformations[i];
                    transform.resetAnimation();
                }
            };
            /**
            * Removes all nodes from that list that are not relevant for the scene graph
            */
            Node.pruneNodes = function (nodes, context) {
                for (var n = 0; n < nodes.length; ++n) {
                    var node = nodes[n];
                    COLLADA.Converter.Node.pruneNodes(node.children, context);
                }
                // Remove all nodes from the list that are not relevant
                nodes = nodes.filter(function (value, index, array) { return (value.containsSceneGraphItems() || value.children.length > 0); });
            };
            /**
            * Recursively creates a converter node tree from the given collada node root node
            */
            Node.createNode = function (node, parent, context) {
                // Create new node
                var converterNode = new COLLADA.Converter.Node();
                converterNode.parent = parent;
                if (parent) {
                    parent.children.push(converterNode);
                }
                context.nodes.register(node, converterNode);
                converterNode.name = node.name || node.id || node.sid || "Unnamed node";
                for (var i = 0; i < node.transformations.length; ++i) {
                    var transform = node.transformations[i];
                    var converterTransform = null;
                    switch (transform.type) {
                        case "matrix":
                            converterTransform = new COLLADA.Converter.TransformMatrix(transform);
                            break;
                        case "rotate":
                            converterTransform = new COLLADA.Converter.TransformRotate(transform);
                            break;
                        case "translate":
                            converterTransform = new COLLADA.Converter.TransformTranslate(transform);
                            break;
                        case "scale":
                            converterTransform = new COLLADA.Converter.TransformScale(transform);
                            break;
                        default:
                            context.log.write("Transformation type " + transform.type + " not supported, transform ignored", 3 /* Warning */);
                    }
                    if (converterTransform !== null) {
                        context.animationTargets.register(transform, converterTransform);
                        converterNode.transformations.push(converterTransform);
                    }
                }
                Node.updateInitialMatrices(converterNode, context);
                for (var i = 0; i < node.children.length; i++) {
                    var colladaChild = node.children[i];
                    var converterChild = COLLADA.Converter.Node.createNode(colladaChild, converterNode, context);
                }
                return converterNode;
            };
            Node.updateInitialMatrices = function (node, context) {
                node.getLocalMatrix(context);
                mat4.copy(node.initialLocalMatrix, node.matrix);
                node.getWorldMatrix(context);
                mat4.copy(node.initialWorldMatrix, node.worldMatrix);
            };
            Node.createNodeData = function (converter_node, context) {
                var collada_node = context.nodes.findCollada(converter_node);
                for (var i = 0; i < collada_node.geometries.length; i++) {
                    var loaderGeometry = collada_node.geometries[i];
                    var converterGeometry = COLLADA.Converter.Geometry.createStatic(loaderGeometry, context);
                    converter_node.geometries.push(converterGeometry);
                }
                for (var i = 0; i < collada_node.controllers.length; i++) {
                    var loaderController = collada_node.controllers[i];
                    var converterGeometry = COLLADA.Converter.Geometry.createAnimated(loaderController, context);
                    converter_node.geometries.push(converterGeometry);
                }
                // Lights, cameras
                if (collada_node.lights.length > 0) {
                    context.log.write("Node " + collada_node.id + " contains lights, lights are ignored", 3 /* Warning */);
                }
                if (collada_node.cameras.length > 0) {
                    context.log.write("Node " + collada_node.id + " contains cameras, cameras are ignored", 3 /* Warning */);
                }
                for (var i = 0; i < converter_node.children.length; i++) {
                    var child = converter_node.children[i];
                    COLLADA.Converter.Node.createNodeData(child, context);
                }
            };
            /**
            * Calls the given function for all given nodes and their children (recursively)
            */
            Node.forEachNode = function (nodes, fn) {
                for (var i = 0; i < nodes.length; ++i) {
                    var node = nodes[i];
                    fn(node);
                    COLLADA.Converter.Node.forEachNode(node.children, fn);
                }
            };
            /**
            * Extracts all geometries in the given scene and merges them into a single geometry.
            * The geometries are detached from their original nodes in the process.
            */
            Node.extractGeometries = function (scene_nodes, context) {
                // Collect all geometries and the corresponding nodes
                // Detach geometries from nodes in the process
                var nodes = [];
                var geometries = [];
                COLLADA.Converter.Node.forEachNode(scene_nodes, function (node) {
                    for (var i = 0; i < node.geometries.length; ++i) {
                        nodes.push(node);
                        geometries.push(node.geometries[i]);
                    }
                    node.geometries = [];
                });
                if (geometries.length === 0) {
                    context.log.write("No geometry found in the scene, returning an empty geometry", 3 /* Warning */);
                    var geometry = new COLLADA.Converter.Geometry();
                    geometry.name = "empty_geometry";
                    return [geometry];
                }
                for (var i = 0; i < geometries.length; ++i) {
                    var geometry = geometries[i];
                    var node = nodes[i];
                    var is_skinned = geometry.bones.length > 0;
                    var is_animated = node.isAnimated(true);
                    if (!is_skinned) {
                        if (is_animated) {
                            context.log.write("Geometry '" + geometry.name + "' is not skinned, but attached to an animated node. " + "This animation will be lost because the geometry is being detached from the node.", 3 /* Warning */);
                        }
                        COLLADA.Converter.Geometry.transformGeometry(geometry, node.getWorldMatrix(context), context);
                    }
                }
                // Merge all geometries
                if (context.options.singleGeometry) {
                    var geometry = COLLADA.Converter.Geometry.mergeGeometries(geometries, context);
                    geometries = [geometry];
                }
                return geometries;
            };
            Node.setupWorldTransform = function (node, context) {
                var worldScale = Converter.Utils.getWorldScale(context);
                var worldInvScale = Converter.Utils.getWorldInvScale(context);
                var worldRotation = Converter.Utils.getWorldRotation(context);
                var worldTransform = Converter.Utils.getWorldTransform(context);
                var uniform_scale = context.options.worldTransformUnitScale.value;
                // Pre-transformation
                // Root nodes: the world transformation
                // All other nodes: undo whatever post-transformation the parent has added
                if (node.parent == null) {
                    mat4.copy(node.transformation_pre, worldTransform);
                }
                else if (uniform_scale) {
                    mat4.invert(node.transformation_pre, node.parent.transformation_post);
                }
                // Post-transformation
                if (uniform_scale) {
                    // This way, the node transformation will not contain any scaling
                    // Only the translation part will be scaled
                    mat4.identity(node.transformation_post);
                    mat4.scale(node.transformation_post, node.transformation_post, worldInvScale);
                }
                Node.updateInitialMatrices(node, context);
                for (var i = 0; i < node.children.length; ++i) {
                    Node.setupWorldTransform(node.children[i], context);
                }
            };
            return Node;
        })();
        Converter.Node = Node;
    })(Converter = COLLADA.Converter || (COLLADA.Converter = {}));
})(COLLADA || (COLLADA = {}));
var COLLADA;
(function (COLLADA) {
    var Converter;
    (function (Converter) {
        var Texture = (function () {
            function Texture(img) {
                this.id = img.id;
                this.url = "";
            }
            Texture.createTexture = function (colorOrTexture, context) {
                if (colorOrTexture === null) {
                    return null;
                }
                if (colorOrTexture.textureSampler === null) {
                    return null;
                }
                var textureSamplerParam = COLLADA.Loader.EffectParam.fromLink(colorOrTexture.textureSampler, context);
                if (textureSamplerParam === null) {
                    context.log.write("Texture sampler not found, texture will be missing", 3 /* Warning */);
                    return null;
                }
                var textureSampler = textureSamplerParam.sampler;
                if (textureSampler === null) {
                    context.log.write("Texture sampler param has no sampler, texture will be missing", 3 /* Warning */);
                    return null;
                }
                var textureImage = null;
                if (textureSampler.image != null) {
                    // Collada 1.5 path: texture -> sampler -> image
                    textureImage = COLLADA.Loader.Image.fromLink(textureSampler.image, context);
                    if (textureImage === null) {
                        context.log.write("Texture image not found, texture will be missing", 3 /* Warning */);
                        return null;
                    }
                }
                else if (textureSampler.surface != null) {
                    // Collada 1.4 path: texture -> sampler -> surface -> image
                    var textureSurfaceParam = COLLADA.Loader.EffectParam.fromLink(textureSampler.surface, context);
                    if (textureSurfaceParam === null) {
                        context.log.write("Texture surface not found, texture will be missing", 3 /* Warning */);
                        return null;
                    }
                    var textureSurface = textureSurfaceParam.surface;
                    if (textureSurface === null) {
                        context.log.write("Texture surface param has no surface, texture will be missing", 3 /* Warning */);
                        return null;
                    }
                    textureImage = COLLADA.Loader.Image.fromLink(textureSurface.initFrom, context);
                    if (textureImage === null) {
                        context.log.write("Texture image not found, texture will be missing", 3 /* Warning */);
                        return null;
                    }
                }
                var result = context.textures.findConverter(textureImage);
                if (result)
                    return result;
                result = new COLLADA.Converter.Texture(textureImage);
                result.url = textureImage.initFrom;
                if (context.options.removeTexturePath.value === true) {
                    result.url = result.url.replace(/^.*[\\\/]/, '');
                }
                context.textures.register(textureImage, result);
                return result;
            };
            return Texture;
        })();
        Converter.Texture = Texture;
    })(Converter = COLLADA.Converter || (COLLADA.Converter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="../context.ts" />
/// <reference path="material.ts" />
/// <reference path="node.ts" />
/// <reference path="texture.ts" />
/// <reference path="animation.ts" />
var COLLADA;
(function (COLLADA) {
    var Converter;
    (function (Converter) {
        /**
        * A map that maps various COLLADA objects to converter objects
        *
        * The converter does not store direct references to COLLADA objects,
        * so that the old COLLADA document can be garbage collected.
        */
        var ObjectMap = (function () {
            function ObjectMap() {
                this.collada = [];
                this.converter = [];
            }
            ObjectMap.prototype.register = function (collada, converter) {
                this.collada.push(collada);
                this.converter.push(converter);
            };
            ObjectMap.prototype.findConverter = function (collada) {
                for (var i = 0; i < this.collada.length; ++i) {
                    if (this.collada[i] === collada)
                        return this.converter[i];
                }
                return null;
            };
            ObjectMap.prototype.findCollada = function (converter) {
                for (var i = 0; i < this.collada.length; ++i) {
                    if (this.converter[i] === converter)
                        return this.collada[i];
                }
                return null;
            };
            return ObjectMap;
        })();
        Converter.ObjectMap = ObjectMap;
        var Context = (function (_super) {
            __extends(Context, _super);
            function Context(log, options) {
                _super.call(this);
                this.log = log;
                this.options = options;
                this.materials = new COLLADA.Converter.ObjectMap();
                this.textures = new COLLADA.Converter.ObjectMap();
                this.nodes = new COLLADA.Converter.ObjectMap();
                this.animationTargets = new COLLADA.Converter.ObjectMap();
                this.messageCount = {};
            }
            return Context;
        })(COLLADA.Context);
        Converter.Context = Context;
    })(Converter = COLLADA.Converter || (COLLADA.Converter = {}));
})(COLLADA || (COLLADA = {}));
var COLLADA;
(function (COLLADA) {
    var Converter;
    (function (Converter) {
        var OptionBool = (function () {
            function OptionBool(title, defaultValue, description) {
                this.type = "boolean";
                this.title = title;
                this.value = defaultValue;
                this.description = description;
            }
            return OptionBool;
        })();
        Converter.OptionBool = OptionBool;
        var OptionFloat = (function () {
            function OptionFloat(title, defaultValue, min, max, description) {
                this.type = "number";
                this.title = title;
                this.value = defaultValue;
                this.min = min;
                this.max = max;
                this.description = description;
            }
            return OptionFloat;
        })();
        Converter.OptionFloat = OptionFloat;
        var OptionSelect = (function () {
            function OptionSelect(title, defaultValue, options, description) {
                this.type = "select";
                this.title = title;
                this.value = defaultValue;
                this.options = options;
                this.description = description;
            }
            return OptionSelect;
        })();
        Converter.OptionSelect = OptionSelect;
        var OptionArray = (function () {
            function OptionArray(title, defaultValue, description) {
                this.type = "array";
                this.title = title;
                this.value = defaultValue;
                this.description = description;
            }
            return OptionArray;
        })();
        Converter.OptionArray = OptionArray;
        var Options = (function () {
            function Options() {
                this.singleAnimation = new OptionBool("Single animation", true, "If enabled, all animations are merged into a single animation. Enable if each bone has a separate top level animation.");
                this.singleGeometry = new OptionBool("Single geometry", true, "If enabled, all geometries are merged into a single geometry. Only has an effect if 'enableExtractGeometry' is enabled.");
                this.singleBufferPerGeometry = new OptionBool("Single buffer", false, "If enabled, all chunks within one geometry use one set of vertex buffers, each chunk occupying a different part of each buffer.");
                this.enableAnimations = new OptionBool("Animations", true, "If enabled, animations are exported. Otherwise, all animations are ignored.");
                this.enableExtractGeometry = new OptionBool("Extract geometry", true, "If enabled, extracts all geometries from the scene and detaches them from their scene graph nodes. Otherwise, geometries remain attached to nodes.");
                this.enableResampledAnimations = new OptionBool("Resampled animations", true, "If enabled, generates resampled animations for all skeleton bones.");
                this.useAnimationLabels = new OptionBool("Animation labels", false, "If enabled, animations labels are used to split the global animation into separete animations.");
                this.animationLabels = new OptionArray("Animation labels", [], "An array of animation labels ({name, begin, end, fps)} that describes how the global animation is split. Only has an effect if 'useAnimationLabels' is enabled.");
                this.animationFps = new OptionFloat("Animation samples per second", 10, 0, 100, "Default FPS for resampled animations.");
                this.removeConstAnimationTracks = new OptionBool("Remove static animations", true, "If enabled, animation tracks are removed if they only contain the rest pose transformation for all times.");
                this.applyBindShape = new OptionBool("Apply bind shape", true, "If enabled, the positions and normals of skin-animated meshes are pre-multiplied by the bind shape matrix.");
                this.removeTexturePath = new OptionBool("Remove texture path", true, "If enabled, only the filename and extension of textures are kept and the remaining path is discarded.");
                this.sortBones = new OptionBool("Sort bones", true, "If enabled, bones are sorted so that child bones always appear after their parent bone in the list of bones.");
                this.worldTransform = new OptionBool("World transform", false, "If enabled, all objects (geometries, animations, skeletons) are transformed as specified by the corresponding options.");
                this.worldTransformBake = new OptionBool("Bake world transform", true, "If enabled, the world transformation is applied to skinned geometry. Otherwise, it is only applied to the bones.");
                this.worldTransformUnitScale = new OptionBool("World transform no node scale", true, "If enabled, the world scale will not add any scaling transformation to any nodes. The world scale will instead be distributed to the translation part of all local transformations.");
                this.worldTransformScale = new OptionFloat("World transform: scale", 1.0, 1e-6, 1e6, "Scale factor. See the 'worldTransform' option.");
                this.worldTransformRotationAxis = new OptionSelect("World transform: rotation axis", "none", ["none", "x", "y", "z"], "Rotation axis. See the 'worldTransform' option.");
                this.worldTransformRotationAngle = new OptionFloat("World transform: rotation angle", 0, 0, 360, "Rotation angle (in degrees). See the 'worldTransform' option.");
            }
            return Options;
        })();
        Converter.Options = Options;
    })(Converter = COLLADA.Converter || (COLLADA.Converter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="../math.ts" />
/// <reference path="context.ts" />
/// <reference path="utils.ts" />
/// <reference path="bone.ts" />
/// <reference path="animation.ts" />
/// <reference path="animation_channel.ts" />
var COLLADA;
(function (COLLADA) {
    var Converter;
    (function (Converter) {
        var AnimationDataTrack = (function () {
            function AnimationDataTrack() {
                this.pos = null;
                this.rot = null;
                this.scl = null;
                this.rel_pos = null;
                this.rel_rot = null;
                this.rel_scl = null;
            }
            return AnimationDataTrack;
        })();
        Converter.AnimationDataTrack = AnimationDataTrack;
        var AnimationData = (function () {
            function AnimationData() {
                this.name = "";
                this.duration = null;
                this.keyframes = null;
                this.fps = null;
                this.tracks = [];
            }
            AnimationData.create = function (bones, animation, index_begin, index_end, fps, context) {
                var result = new COLLADA.Converter.AnimationData();
                result.name = animation.name;
                var src_channels = animation.channels;
                // Get timeline statistics
                var stat = new COLLADA.Converter.AnimationTimeStatistics();
                COLLADA.Converter.Animation.getTimeStatistics(animation, index_begin, index_end, stat, context);
                // Default fps if none give: average fps of source data
                if (fps === null) {
                    fps = stat.avgFps();
                }
                if (fps === null || fps <= 0) {
                    context.log.write("Could not determine FPS for animation, skipping animation", 3 /* Warning */);
                    return null;
                }
                // Duration (in seconds)
                var start_time = stat.minTime;
                var end_time = stat.maxTime;
                var duration = end_time - start_time;
                // Keyframes (always include first and last keyframe)
                var keyframes = Math.ceil(fps * duration) + 1;
                fps = (keyframes - 1) / duration;
                var spf = 1 / fps;
                // Store fps
                result.fps = fps;
                result.keyframes = keyframes;
                result.duration = duration;
                result.original_fps = stat.avgFps();
                if (!(fps > 0)) {
                    context.log.write("Invalid FPS: " + fps + ", skipping animation", 3 /* Warning */);
                }
                if (!(duration > 0)) {
                    context.log.write("Invalid duration: " + duration + ", skipping animation", 3 /* Warning */);
                }
                if (!(keyframes > 0)) {
                    context.log.write("Invalid number of keyframes: " + keyframes + ", skipping animation", 3 /* Warning */);
                }
                for (var i = 0; i < bones.length; ++i) {
                    var bone = bones[i];
                    var track = new COLLADA.Converter.AnimationDataTrack();
                    track.pos = new Float32Array(keyframes * 3);
                    track.rot = new Float32Array(keyframes * 4);
                    track.scl = new Float32Array(keyframes * 3);
                    track.rel_pos = new Float32Array(keyframes * 3);
                    track.rel_rot = new Float32Array(keyframes * 4);
                    track.rel_scl = new Float32Array(keyframes * 3);
                    result.tracks.push(track);
                }
                var result_tracks = result.tracks;
                for (var i = 0; i < bones.length; ++i) {
                    var bone = bones[i];
                    bone.node.resetAnimation();
                }
                // Process all keyframes
                var pos = vec3.create();
                var rot = quat.create();
                var scl = vec3.create();
                for (var k = 0; k < keyframes; ++k) {
                    var time = start_time + k * spf;
                    for (var c = 0; c < src_channels.length; ++c) {
                        var channel = src_channels[c];
                        channel.target.applyAnimation(channel, time, context);
                    }
                    for (var b = 0; b < bones.length; ++b) {
                        var bone = bones[b];
                        var track = result_tracks[b];
                        var mat = bone.node.getLocalMatrix(context);
                        COLLADA.MathUtils.decompose(mat, pos, rot, scl);
                        var mat2 = mat4.create();
                        mat4.fromRotationTranslation(mat2, rot, pos);
                        if (track.pos !== null) {
                            track.pos[k * 3 + 0] = pos[0];
                            track.pos[k * 3 + 1] = pos[1];
                            track.pos[k * 3 + 2] = pos[2];
                        }
                        if (track.rot !== null) {
                            track.rot[k * 4 + 0] = rot[0];
                            track.rot[k * 4 + 1] = rot[1];
                            track.rot[k * 4 + 2] = rot[2];
                            track.rot[k * 4 + 3] = rot[3];
                        }
                        if (track.scl !== null) {
                            track.scl[k * 3 + 0] = scl[0];
                            track.scl[k * 3 + 1] = scl[1];
                            track.scl[k * 3 + 2] = scl[2];
                        }
                    }
                }
                for (var i = 0; i < bones.length; ++i) {
                    var bone = bones[i];
                    bone.node.resetAnimation();
                }
                // Remove unnecessary tracks
                var output_relative = false;
                var pos0 = vec3.create();
                var inv_pos0 = vec3.create();
                var rot0 = quat.create();
                var inv_rot0 = quat.create();
                var scl0 = vec3.create();
                var inv_scl0 = vec3.create();
                for (var b = 0; b < bones.length; ++b) {
                    var bone = bones[b];
                    var track = result_tracks[b];
                    // Get rest pose transformation of the current bone
                    var mat0 = bone.node.getLocalMatrix(context);
                    COLLADA.MathUtils.decompose(mat0, pos0, rot0, scl0);
                    quat.invert(inv_rot0, rot0);
                    vec3.negate(inv_pos0, pos0);
                    vec3.set(inv_scl0, 1 / scl0[0], 1 / scl0[1], 1 / scl0[2]);
                    // Check whether there are any changes to the rest pose
                    var pos_change = 0;
                    var rot_change = 0;
                    var scl_change = 0;
                    var max_pos_change = 0; // max length
                    var max_rot_change = 0; // max rotation angle (in radians)
                    var max_scl_change = 0; // max scale along any axis
                    for (var k = 0; k < keyframes; ++k) {
                        // Relative position
                        pos[0] = track.pos[k * 3 + 0];
                        pos[1] = track.pos[k * 3 + 1];
                        pos[2] = track.pos[k * 3 + 2];
                        vec3.add(pos, inv_pos0, pos);
                        pos_change = vec3.length(pos);
                        max_pos_change = Math.max(max_pos_change, pos_change);
                        // Relative rotation
                        rot[0] = track.rot[k * 4 + 0];
                        rot[1] = track.rot[k * 4 + 1];
                        rot[2] = track.rot[k * 4 + 2];
                        rot[3] = track.rot[k * 4 + 3];
                        quat.multiply(rot, inv_rot0, rot);
                        rot_change = 2 * Math.acos(Math.min(Math.max(rot[3], -1), 1));
                        max_rot_change = Math.max(max_rot_change, rot_change);
                        // Relative scale
                        scl[0] = track.scl[k * 3 + 0];
                        scl[1] = track.scl[k * 3 + 1];
                        scl[2] = track.scl[k * 3 + 2];
                        vec3.multiply(scl, inv_scl0, scl);
                        scl_change = Math.max(Math.abs(1 - scl[0]), Math.abs(1 - scl[1]), Math.abs(1 - scl[2]));
                        max_scl_change = Math.max(max_scl_change, scl_change);
                        // Store relative transformations
                        track.rel_pos[k * 3 + 0] = pos[0];
                        track.rel_pos[k * 3 + 1] = pos[1];
                        track.rel_pos[k * 3 + 2] = pos[2];
                        track.rel_scl[k * 3 + 0] = scl[0];
                        track.rel_scl[k * 3 + 1] = scl[1];
                        track.rel_scl[k * 3 + 2] = scl[2];
                        track.rel_rot[k * 4 + 0] = rot[0];
                        track.rel_rot[k * 4 + 1] = rot[1];
                        track.rel_rot[k * 4 + 2] = rot[2];
                        track.rel_rot[k * 4 + 3] = rot[3];
                    }
                    // Delete tracks that do not contain any animation
                    if (context.options.removeConstAnimationTracks.value === true) {
                        // TODO: This needs better tolerances.
                        // TODO: Maybe use relative instead of absolute tolerances?
                        // TODO: For COLLADA files that use matrix animations, the decomposition will have low precision
                        // TODO: and scale will have an absolute error of >1e-2 even if the scale never changes in the original modelling application.
                        var tol_pos = 1e-4;
                        var tol_rot = 0.05; // 0.05 radians (2.86 degrees) rotation
                        var tol_scl = 0.5; // 5% scaling
                        if (max_pos_change < tol_pos) {
                            track.pos = null;
                            track.rel_pos = null;
                        }
                        if (max_rot_change < tol_rot) {
                            track.rot = null;
                            track.rel_rot = null;
                        }
                        if (max_scl_change < tol_scl) {
                            track.scl = null;
                            track.rel_scl = null;
                        }
                    }
                }
                return result;
            };
            AnimationData.createFromLabels = function (bones, animation, labels, context) {
                var result = [];
                for (var i = 0; i < labels.length; ++i) {
                    var label = labels[i];
                    var data = COLLADA.Converter.AnimationData.create(bones, animation, label.begin, label.end, label.fps, context);
                    if (data !== null) {
                        data.name = label.name;
                        result.push(data);
                    }
                }
                return result;
            };
            return AnimationData;
        })();
        Converter.AnimationData = AnimationData;
    })(Converter = COLLADA.Converter || (COLLADA.Converter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="node.ts" />
/// <reference path="animation.ts" />
/// <reference path="animation_data.ts" />
/// <reference path="geometry.ts" />
var COLLADA;
(function (COLLADA) {
    var Converter;
    (function (Converter) {
        var Document = (function () {
            function Document() {
                this.nodes = [];
                this.animations = [];
                this.geometries = [];
                this.resampled_animations = [];
            }
            return Document;
        })();
        Converter.Document = Document;
    })(Converter = COLLADA.Converter || (COLLADA.Converter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="log.ts" />
/// <reference path="converter/context.ts" />
/// <reference path="converter/options.ts" />
/// <reference path="converter/file.ts" />
/// <reference path="converter/node.ts" />
/// <reference path="converter/geometry.ts" />
/// <reference path="converter/animation.ts" />
/// <reference path="converter/animation_data.ts" />
var COLLADA;
(function (COLLADA) {
    var Converter;
    (function (Converter) {
        var ColladaConverter = (function () {
            function ColladaConverter() {
                this.log = new COLLADA.LogConsole();
                this.options = new COLLADA.Converter.Options();
            }
            ColladaConverter.prototype.forEachGeometry = function (doc, fn) {
                for (var i = 0; i < doc.geometries.length; ++i) {
                    fn(doc.geometries[i]);
                }
                COLLADA.Converter.Node.forEachNode(doc.nodes, function (node) {
                    for (var i = 0; i < node.geometries.length; ++i) {
                        fn(node.geometries[i]);
                    }
                });
            };
            ColladaConverter.prototype.convert = function (doc) {
                var _this = this;
                var context = new COLLADA.Converter.Context(this.log, this.options);
                if (doc === null) {
                    context.log.write("No document to convert", 3 /* Warning */);
                    return null;
                }
                var result = new COLLADA.Converter.Document();
                // Scene nodes
                result.nodes = ColladaConverter.createScene(doc, context);
                // Set up the world transform
                if (context.options.worldTransform.value) {
                    for (var i = 0; i < result.nodes.length; ++i) {
                        Converter.Node.setupWorldTransform(result.nodes[i], context);
                    }
                    // Adapt inverse bind matrices
                    this.forEachGeometry(result, function (geometry) {
                        COLLADA.Converter.Geometry.setupWorldTransform(geometry, context);
                    });
                    // Bake: Apply the world transform to skinned geometries
                    if (context.options.worldTransformBake.value) {
                        var mat = Converter.Utils.getWorldTransform(context);
                        this.forEachGeometry(result, function (geometry) {
                            if (geometry.bones.length > 0) {
                                COLLADA.Converter.Geometry.transformGeometry(geometry, mat, context);
                            }
                        });
                    }
                }
                // Extract geometries
                if (context.options.enableExtractGeometry.value === true) {
                    result.geometries = COLLADA.Converter.Node.extractGeometries(result.nodes, context);
                }
                // Merge chunk data
                if (context.options.singleBufferPerGeometry.value === true) {
                    this.forEachGeometry(result, function (geometry) {
                        COLLADA.Converter.GeometryChunk.mergeChunkData(geometry.chunks, context);
                    });
                }
                // Compute bounding boxes
                COLLADA.Converter.Node.forEachNode(result.nodes, function (node) {
                    _this.forEachGeometry(result, function (geometry) {
                        COLLADA.Converter.Geometry.computeBoundingBox(geometry, context);
                    });
                });
                // Original animations curves
                if (context.options.enableAnimations.value === true) {
                    result.animations = ColladaConverter.createAnimations(doc, context);
                }
                // Resampled animations
                if (context.options.enableResampledAnimations.value === true) {
                    result.resampled_animations = ColladaConverter.createResampledAnimations(doc, result, context);
                }
                return result;
            };
            ColladaConverter.createScene = function (doc, context) {
                var result = [];
                // Get the COLLADA scene
                if (doc.scene === null) {
                    context.log.write("Collada document has no scene", 3 /* Warning */);
                    return result;
                }
                var scene = COLLADA.Loader.VisualScene.fromLink(doc.scene.instance, context);
                if (scene === null) {
                    context.log.write("Collada document has no scene", 3 /* Warning */);
                    return result;
                }
                for (var i = 0; i < scene.children.length; ++i) {
                    var topLevelNode = scene.children[i];
                    result.push(COLLADA.Converter.Node.createNode(topLevelNode, null, context));
                }
                for (var i = 0; i < result.length; ++i) {
                    var node = result[i];
                    COLLADA.Converter.Node.createNodeData(node, context);
                }
                return result;
            };
            ColladaConverter.createAnimations = function (doc, context) {
                var result = [];
                for (var i = 0; i < doc.libAnimations.children.length; ++i) {
                    var animation = doc.libAnimations.children[i];
                    result.push(COLLADA.Converter.Animation.create(animation, context));
                }
                // If requested, create a single animation
                if (context.options.singleAnimation.value === true && result.length > 1) {
                    var topLevelAnimation = new COLLADA.Converter.Animation();
                    topLevelAnimation.id = "";
                    topLevelAnimation.name = "animation";
                    for (var i = 0; i < result.length; ++i) {
                        var child = result[i];
                        topLevelAnimation.channels = topLevelAnimation.channels.concat(child.channels);
                        child.channels = [];
                    }
                    result = [topLevelAnimation];
                }
                return result;
            };
            ColladaConverter.createResampledAnimations = function (doc, file, context) {
                var result = [];
                if (file.animations.length === 0) {
                    // context.log.write("No original animations available, no resampled animations generated.", LogLevel.Warning);
                    return [];
                }
                // Get the geometry
                if (file.geometries.length > 1) {
                    context.log.write("Converted document contains multiple geometries, resampled animations are only generated for single geometries.", 3 /* Warning */);
                    return [];
                }
                if (file.geometries.length === 0) {
                    context.log.write("Converted document does not contain any geometries, no resampled animations generated.", 3 /* Warning */);
                    return [];
                }
                var geometry = file.geometries[0];
                // Process all animations in the document
                var labels = context.options.animationLabels.value;
                var fps = context.options.animationFps.value;
                for (var i = 0; i < file.animations.length; ++i) {
                    var animation = file.animations[i];
                    if (context.options.useAnimationLabels.value === true) {
                        var datas = COLLADA.Converter.AnimationData.createFromLabels(geometry.bones, animation, labels, context);
                        result = result.concat(datas);
                    }
                    else {
                        var data = COLLADA.Converter.AnimationData.create(geometry.bones, animation, null, null, fps, context);
                        if (data !== null) {
                            result.push(data);
                        }
                    }
                }
                return result;
            };
            return ColladaConverter;
        })();
        Converter.ColladaConverter = ColladaConverter;
    })(Converter = COLLADA.Converter || (COLLADA.Converter = {}));
})(COLLADA || (COLLADA = {}));
var COLLADA;
(function (COLLADA) {
    var Exporter;
    (function (Exporter) {
        ;
        ;
        ;
        ;
        ;
        ;
        ;
        ;
        ;
    })(Exporter = COLLADA.Exporter || (COLLADA.Exporter = {}));
})(COLLADA || (COLLADA = {}));
var COLLADA;
(function (COLLADA) {
    var Exporter;
    (function (Exporter) {
        var Utils = (function () {
            function Utils() {
            }
            Utils.stringToBuffer = function (str) {
                // Get ASCII string with non-printable characters using base64 decoding
                var ascii = atob(str);
                // Convert ASCII string to Uint8Array
                var result = new Uint8Array(ascii.length);
                for (var i = 0, len = ascii.length; i < len; ++i) {
                    result[i] = ascii.charCodeAt(i);
                }
                return result;
            };
            Utils.bufferToString = function (buf) {
                // Convert Uint8Array to ASCII string
                var ascii = "";
                for (var i = 0, len = buf.length; i < len; ++i) {
                    ascii += String.fromCharCode(buf[i]);
                }
                // Remove non-printable characters using base64 encoding
                return btoa(ascii);
            };
            Utils.bufferToDataURI = function (buf, mime) {
                var base64 = COLLADA.Exporter.Utils.bufferToString(buf);
                if (!mime) {
                    mime = "application/octet-stream";
                }
                return "data:" + mime + ";base64," + base64;
            };
            Utils.bufferToBlobURI = function (buf, mime) {
                if (!mime) {
                    mime = "application/octet-stream";
                }
                var blob = new Blob([buf], { type: mime });
                return URL.createObjectURL(blob);
            };
            Utils.jsonToDataURI = function (json, mime) {
                var json_str = JSON.stringify(json);
                if (!mime) {
                    mime = "application/json";
                }
                return "data:" + mime + "," + json_str;
            };
            Utils.jsonToBlobURI = function (json, mime) {
                if (!mime) {
                    mime = "application/json";
                }
                var blob = new Blob([JSON.stringify(json)], { type: mime });
                return URL.createObjectURL(blob);
            };
            return Utils;
        })();
        Exporter.Utils = Utils;
    })(Exporter = COLLADA.Exporter || (COLLADA.Exporter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="format.ts" />
/// <reference path="utils.ts" />
var COLLADA;
(function (COLLADA) {
    var Exporter;
    (function (Exporter) {
        var Document = (function () {
            function Document() {
                this.json = null;
                this.data = null;
            }
            return Document;
        })();
        Exporter.Document = Document;
    })(Exporter = COLLADA.Exporter || (COLLADA.Exporter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="format.ts" />
var COLLADA;
(function (COLLADA) {
    var Exporter;
    (function (Exporter) {
        var DataChunk = (function () {
            function DataChunk() {
                this.data = null;
                this.stride = null;
                this.count = null;
                this.byte_offset = null;
                this.bytes_per_element = null;
            }
            DataChunk.prototype.getDataView = function () {
                return new Uint8Array(this.data.buffer, 0, this.stride * this.count * this.bytes_per_element);
            };
            DataChunk.prototype.getBytesCount = function () {
                return this.data.length * this.bytes_per_element;
            };
            DataChunk.toJSON = function (chunk) {
                if (chunk === null) {
                    return null;
                }
                var result = {
                    type: chunk.type,
                    byte_offset: chunk.byte_offset,
                    stride: chunk.stride,
                    count: chunk.count
                };
                return result;
            };
            DataChunk.create = function (data, stride, context) {
                if (data === null) {
                    return null;
                }
                var result = new COLLADA.Exporter.DataChunk();
                result.data = data;
                result.stride = stride;
                result.count = data.length / stride;
                if (data instanceof Float32Array) {
                    result.type = "float";
                    result.bytes_per_element = 4;
                }
                else if (data instanceof Float64Array) {
                    result.type = "double";
                    result.bytes_per_element = 8;
                }
                else if (data instanceof Uint8Array) {
                    result.type = "uint8";
                    result.bytes_per_element = 1;
                }
                else if (data instanceof Uint16Array) {
                    result.type = "uint16";
                    result.bytes_per_element = 2;
                }
                else if (data instanceof Uint32Array) {
                    result.type = "uint32";
                    result.bytes_per_element = 4;
                }
                else if (data instanceof Int8Array) {
                    result.type = "int8";
                    result.bytes_per_element = 1;
                }
                else if (data instanceof Int16Array) {
                    result.type = "int16";
                    result.bytes_per_element = 2;
                }
                else if (data instanceof Int32Array) {
                    result.type = "int32";
                    result.bytes_per_element = 4;
                }
                else {
                    context.log.write("Unknown data type, data chunk ignored", 3 /* Warning */);
                    return null;
                }
                context.registerChunk(result);
                return result;
            };
            return DataChunk;
        })();
        Exporter.DataChunk = DataChunk;
        ;
    })(Exporter = COLLADA.Exporter || (COLLADA.Exporter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="../context.ts" />
/// <reference path="data_chunk.ts" />
var COLLADA;
(function (COLLADA) {
    var Exporter;
    (function (Exporter) {
        var Context = (function (_super) {
            __extends(Context, _super);
            function Context(log) {
                _super.call(this);
                this.log = log;
                this.chunks = [];
                this.chunk_data = [];
                this.bytes_written = 0;
            }
            Context.prototype.registerChunk = function (chunk) {
                this.chunks.push(chunk);
                chunk.byte_offset = this.bytes_written;
                this.bytes_written += chunk.getBytesCount();
            };
            Context.prototype.assembleData = function () {
                // Allocate result
                var buffer = new ArrayBuffer(this.bytes_written);
                var result = new Uint8Array(buffer);
                for (var i = 0; i < this.chunks.length; ++i) {
                    var chunk = this.chunks[i];
                    var chunk_data = chunk.getDataView();
                    var chunk_data_length = chunk_data.length;
                    var chunk_data_offet = chunk.byte_offset;
                    for (var j = 0; j < chunk_data_length; ++j) {
                        result[j + chunk_data_offet] = chunk_data[j];
                    }
                }
                return result;
            };
            return Context;
        })(COLLADA.Context);
        Exporter.Context = Context;
    })(Exporter = COLLADA.Exporter || (COLLADA.Exporter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="format.ts" />
var COLLADA;
(function (COLLADA) {
    var Exporter;
    (function (Exporter) {
        var Material = (function () {
            function Material() {
            }
            Material.toJSON = function (material, context) {
                if (material === null) {
                    return null;
                }
                return {
                    name: material.name,
                    diffuse: (material.diffuse !== null) ? (material.diffuse.url) : null,
                    specular: (material.specular !== null) ? (material.specular.url) : null,
                    normal: (material.normal !== null) ? (material.normal.url) : null
                };
            };
            return Material;
        })();
        Exporter.Material = Material;
        ;
    })(Exporter = COLLADA.Exporter || (COLLADA.Exporter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="data_chunk.ts" />
/// <reference path="format.ts" />
/// <reference path="../math.ts" />
var COLLADA;
(function (COLLADA) {
    var Exporter;
    (function (Exporter) {
        var BoundingBox = (function () {
            function BoundingBox() {
            }
            BoundingBox.toJSON = function (box) {
                if (box === null) {
                    return null;
                }
                return {
                    min: [box.min[0], box.min[1], box.min[2]],
                    max: [box.max[0], box.max[1], box.max[2]]
                };
            };
            return BoundingBox;
        })();
        Exporter.BoundingBox = BoundingBox;
        var Geometry = (function () {
            function Geometry() {
            }
            Geometry.toJSON = function (chunk, material_index, context) {
                var indices = COLLADA.Exporter.DataChunk.create(chunk.data.indices, 3, context);
                var position = COLLADA.Exporter.DataChunk.create(chunk.data.position, 3, context);
                var normal = COLLADA.Exporter.DataChunk.create(chunk.data.normal, 3, context);
                var texcoord = COLLADA.Exporter.DataChunk.create(chunk.data.texcoord, 2, context);
                var boneweight = COLLADA.Exporter.DataChunk.create(chunk.data.boneweight, 4, context);
                var boneindex = COLLADA.Exporter.DataChunk.create(chunk.data.boneindex, 4, context);
                return {
                    name: chunk.name,
                    material: material_index,
                    vertex_count: chunk.vertexCount,
                    triangle_count: chunk.triangleCount,
                    indices: Exporter.DataChunk.toJSON(indices),
                    position: Exporter.DataChunk.toJSON(position),
                    normal: Exporter.DataChunk.toJSON(normal),
                    texcoord: Exporter.DataChunk.toJSON(texcoord),
                    boneweight: Exporter.DataChunk.toJSON(boneweight),
                    boneindex: Exporter.DataChunk.toJSON(boneindex),
                    bounding_box: BoundingBox.toJSON(chunk.boundingBox)
                };
            };
            return Geometry;
        })();
        Exporter.Geometry = Geometry;
    })(Exporter = COLLADA.Exporter || (COLLADA.Exporter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="format.ts" />
/// <reference path="../math.ts" />
var COLLADA;
(function (COLLADA) {
    var Exporter;
    (function (Exporter) {
        var Bone = (function () {
            function Bone() {
            }
            Bone.toJSON = function (bone, context) {
                if (bone === null) {
                    return null;
                }
                // TODO: options for this
                var mat_tol = 6;
                var pos_tol = 6;
                var scl_tol = 3;
                var rot_tol = 6;
                // Bone default transform
                var mat = bone.node.initialLocalMatrix;
                var pos = [0, 0, 0];
                var rot = [0, 0, 0, 1];
                var scl = [1, 1, 1];
                COLLADA.MathUtils.decompose(mat, pos, rot, scl);
                // Bone inverse bind matrix
                var inv_bind_mat = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
                COLLADA.MathUtils.copyNumberArray(bone.invBindMatrix, inv_bind_mat, 16);
                return {
                    name: bone.name,
                    parent: (bone.parent !== null) ? (bone.parent.index) : -1,
                    skinned: bone.attachedToSkin,
                    inv_bind_mat: inv_bind_mat.map(function (x) { return COLLADA.MathUtils.round(x, mat_tol); }),
                    pos: pos.map(function (x) { return COLLADA.MathUtils.round(x, pos_tol); }),
                    rot: rot.map(function (x) { return COLLADA.MathUtils.round(x, rot_tol); }),
                    scl: scl.map(function (x) { return COLLADA.MathUtils.round(x, scl_tol); })
                };
            };
            return Bone;
        })();
        Exporter.Bone = Bone;
    })(Exporter = COLLADA.Exporter || (COLLADA.Exporter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="data_chunk.ts" />
/// <reference path="format.ts" />
var COLLADA;
(function (COLLADA) {
    var Exporter;
    (function (Exporter) {
        var AnimationTrack = (function () {
            function AnimationTrack() {
            }
            AnimationTrack.toJSON = function (track, index, context) {
                if (track === null) {
                    return null;
                }
                var pos = COLLADA.Exporter.DataChunk.create(track.pos, 3, context);
                var rot = COLLADA.Exporter.DataChunk.create(track.rot, 4, context);
                var scl = COLLADA.Exporter.DataChunk.create(track.scl, 3, context);
                return {
                    bone: index,
                    pos: Exporter.DataChunk.toJSON(pos),
                    rot: Exporter.DataChunk.toJSON(rot),
                    scl: Exporter.DataChunk.toJSON(scl)
                };
            };
            return AnimationTrack;
        })();
        Exporter.AnimationTrack = AnimationTrack;
    })(Exporter = COLLADA.Exporter || (COLLADA.Exporter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="animation_track.ts" />
/// <reference path="format.ts" />
var COLLADA;
(function (COLLADA) {
    var Exporter;
    (function (Exporter) {
        var Animation = (function () {
            function Animation() {
            }
            Animation.toJSON = function (animation, context) {
                if (animation === null) {
                    return null;
                }
                return {
                    name: animation.name,
                    frames: animation.keyframes,
                    fps: animation.fps,
                    tracks: animation.tracks.map(function (e, i) { return Exporter.AnimationTrack.toJSON(e, i, context); })
                };
            };
            return Animation;
        })();
        Exporter.Animation = Animation;
    })(Exporter = COLLADA.Exporter || (COLLADA.Exporter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="log.ts" />
/// <reference path="exporter/document.ts" />
/// <reference path="exporter/context.ts" />
/// <reference path="exporter/material.ts" />
/// <reference path="exporter/geometry.ts" />
/// <reference path="exporter/bone.ts" />
/// <reference path="exporter/animation.ts" />
/// <reference path="exporter/animation_track.ts" />
var COLLADA;
(function (COLLADA) {
    var Exporter;
    (function (Exporter) {
        var ColladaExporter = (function () {
            function ColladaExporter() {
                this.log = new COLLADA.LogConsole();
            }
            ColladaExporter.prototype.export = function (doc) {
                var context = new COLLADA.Exporter.Context(this.log);
                if (doc === null) {
                    context.log.write("No document to convert", 3 /* Warning */);
                    return null;
                }
                if (doc.geometries.length === 0) {
                    context.log.write("Document contains no geometry, nothing exported", 3 /* Warning */);
                    return null;
                }
                else if (doc.geometries.length > 1) {
                    context.log.write("Document contains multiple geometries, only the first geometry is exported", 3 /* Warning */);
                }
                // Geometry and materials
                var converter_materials = [];
                var materials = [];
                var converter_geometry = doc.geometries[0];
                var chunks = [];
                for (var c = 0; c < converter_geometry.chunks.length; ++c) {
                    var chunk = converter_geometry.chunks[c];
                    // Create the material, if it does not exist yet
                    var material_index = converter_materials.indexOf(chunk.material);
                    if (material_index === -1) {
                        var material = Exporter.Material.toJSON(chunk.material, context);
                        material_index = materials.length;
                        converter_materials.push(chunk.material);
                        materials.push(material);
                    }
                    // Create the geometry
                    chunks.push(Exporter.Geometry.toJSON(chunk, material_index, context));
                }
                // Result
                var result = new COLLADA.Exporter.Document();
                var info = {
                    bounding_box: Exporter.BoundingBox.toJSON(converter_geometry.boundingBox)
                };
                var bones = converter_geometry.bones.map(function (e) { return Exporter.Bone.toJSON(e, context); });
                var animations = doc.resampled_animations.map(function (e) { return Exporter.Animation.toJSON(e, context); });
                // Assemble result: JSON part
                result.json = {
                    info: info,
                    materials: materials,
                    chunks: chunks,
                    bones: bones,
                    animations: animations
                };
                // Assemble result: Binary data part
                result.data = context.assembleData();
                //result.json.data = COLLADA.Exporter.Utils.bufferToString(result.data);
                return result;
            };
            return ColladaExporter;
        })();
        Exporter.ColladaExporter = ColladaExporter;
    })(Exporter = COLLADA.Exporter || (COLLADA.Exporter = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="../context.ts" />
var COLLADA;
(function (COLLADA) {
    var Threejs;
    (function (Threejs) {
        var Context = (function (_super) {
            __extends(Context, _super);
            function Context(log) {
                _super.call(this);
                this.log = log;
                this.mat_tol = 5;
                this.pos_tol = 5;
                this.scl_tol = 3;
                this.rot_tol = 5;
                this.uvs_tol = 4;
                this.nrm_tol = 5;
            }
            return Context;
        })(COLLADA.Context);
        Threejs.Context = Context;
    })(Threejs = COLLADA.Threejs || (COLLADA.Threejs = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="../converter/material.ts" />
var COLLADA;
(function (COLLADA) {
    var Threejs;
    (function (Threejs) {
        var Material = (function () {
            function Material() {
            }
            Material.toJSON = function (material, context) {
                if (material === null) {
                    return null;
                }
                return {
                    "DbgColor": 0,
                    "DbgIndex": 1,
                    "DbgName": material.name,
                    "blending": "NormalBlending",
                    "colorAmbient": [1, 1, 1],
                    "colorDiffuse": [1, 1, 1],
                    "colorSpecular": [0.5, 0.5, 0.5],
                    "depthTest": true,
                    "depthWrite": true,
                    "mapDiffuse": (material.diffuse !== null) ? (material.diffuse.url.replace(".tga", ".png")) : null,
                    "mapDiffuseWrap": ["repeat", "repeat"],
                    "mapSpecular": (material.specular !== null) ? (material.specular.url.replace(".tga", ".png")) : null,
                    "mapSpecularWrap": ["repeat", "repeat"],
                    "mapNormal": (material.normal !== null) ? (material.normal.url.replace(".tga", ".png")) : null,
                    "mapNormalWrap": ["repeat", "repeat"],
                    "shading": "Lambert",
                    "specularCoef": 50,
                    "transparency": 1.0,
                    "transparent": false,
                    "vertexColors": false
                };
            };
            return Material;
        })();
        Threejs.Material = Material;
        ;
    })(Threejs = COLLADA.Threejs || (COLLADA.Threejs = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
/// <reference path="../converter/bone.ts" />
/// <reference path="../math.ts" />
var COLLADA;
(function (COLLADA) {
    var Threejs;
    (function (Threejs) {
        var Bone = (function () {
            function Bone() {
            }
            Bone.toJSON = function (bone, context) {
                if (bone === null) {
                    return null;
                }
                // Matrices
                var mat = mat4.clone(bone.node.initialLocalMatrix);
                var matWorld = mat4.clone(bone.node.initialWorldMatrix);
                var matBindInv = mat4.clone(bone.invBindMatrix);
                var matBind = mat4.create();
                mat4.invert(matBind, matBindInv);
                if (bone.parent) {
                    mat4.multiply(mat, bone.parent.invBindMatrix, matBind);
                }
                else {
                    mat = matBind;
                }
                // Bone default transform
                var pos = [0, 0, 0];
                var rot = [0, 0, 0, 1];
                var scl = [1, 1, 1];
                COLLADA.MathUtils.decompose(mat, pos, rot, scl);
                // Bone inverse bind matrix
                var inv_bind_mat = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
                COLLADA.MathUtils.copyNumberArray(bone.invBindMatrix, inv_bind_mat, 16);
                // Compose
                return {
                    "parent": bone.parentIndex(),
                    "name": bone.name,
                    "pos": pos.map(function (x) { return COLLADA.MathUtils.round(x, context.pos_tol); }),
                    "rotq": rot.map(function (x) { return COLLADA.MathUtils.round(x, context.rot_tol); }),
                    "scl": scl.map(function (x) { return COLLADA.MathUtils.round(x, context.scl_tol); }),
                    "inv_bind_mat": inv_bind_mat.map(function (x) { return COLLADA.MathUtils.round(x, context.mat_tol); })
                };
            };
            return Bone;
        })();
        Threejs.Bone = Bone;
        ;
    })(Threejs = COLLADA.Threejs || (COLLADA.Threejs = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="context.ts" />
var COLLADA;
(function (COLLADA) {
    var Threejs;
    (function (Threejs) {
        function roundTo(value, digits) {
            return +value.toFixed(digits);
        }
        function vec3Key(data, k, digits) {
            return [roundTo(data[3 * k + 0], digits), roundTo(data[3 * k + 1], digits), roundTo(data[3 * k + 2], digits)];
        }
        function vec4Key(data, k, digits) {
            return [roundTo(data[4 * k + 0], digits), roundTo(data[4 * k + 1], digits), roundTo(data[4 * k + 2], digits), roundTo(data[4 * k + 3], digits)];
        }
        var Animation = (function () {
            function Animation() {
            }
            Animation.toJSON = function (animation, bones, threejsBones, context) {
                if (animation === null) {
                    return null;
                }
                var original_fps = Math.floor(animation.original_fps + 0.5);
                var time_scale = original_fps / animation.fps;
                return {
                    "name": animation.name || "animation",
                    "length": animation.keyframes,
                    "fps": animation.fps,
                    "hierarchy": animation.tracks.map(function (track, index) {
                        var keys = [];
                        for (var k = 0; k < animation.keyframes; ++k) {
                            var key = { "time": roundTo(k * time_scale, 2) };
                            if (track.pos)
                                key.pos = vec3Key(track.pos, k, 4);
                            if (track.rot)
                                key.rot = vec4Key(track.rot, k, 4);
                            if (track.scl)
                                key.scl = vec3Key(track.scl, k, 3);
                            if (k == 0 || k == animation.keyframes - 1) {
                                if (!track.pos)
                                    key.pos = threejsBones[index].pos;
                                if (!track.rot)
                                    key.rot = threejsBones[index].rotq;
                                if (!track.scl)
                                    key.scl = threejsBones[index].scl;
                            }
                            keys.push(key);
                        }
                        return {
                            "parent": index - 1,
                            "keys": keys
                        };
                    })
                };
            };
            return Animation;
        })();
        Threejs.Animation = Animation;
    })(Threejs = COLLADA.Threejs || (COLLADA.Threejs = {}));
})(COLLADA || (COLLADA = {}));
/// <reference path="log.ts" />
/// <reference path="threejs/context.ts" />
/// <reference path="threejs/material.ts" />
/// <reference path="threejs/bone.ts" />
/// <reference path="threejs/animation.ts" />
var COLLADA;
(function (COLLADA) {
    var Threejs;
    (function (Threejs) {
        var ThreejsExporter = (function () {
            function ThreejsExporter() {
                this.log = new COLLADA.LogConsole();
            }
            ThreejsExporter.prototype.export = function (doc) {
                var context = new COLLADA.Threejs.Context(this.log);
                if (doc === null) {
                    context.log.write("No document to convert", 3 /* Warning */);
                    return null;
                }
                if (doc.geometries.length === 0) {
                    context.log.write("Document contains no geometry, nothing exported", 3 /* Warning */);
                    return null;
                }
                else if (doc.geometries.length > 1) {
                    context.log.write("Document contains multiple geometries, only the first geometry is exported", 3 /* Warning */);
                }
                var converter_geometry = doc.geometries[0];
                // Geometry and materials
                var converter_materials = [];
                var materials = [];
                var vertices = [];
                var normals = [];
                var uvs = [];
                var faces = [];
                var skinIndices = [];
                var skinWeights = [];
                var baseIndexOffset = 0;
                for (var c = 0; c < converter_geometry.chunks.length; ++c) {
                    var chunk = converter_geometry.chunks[c];
                    // Create the material, if it does not exist yet
                    var material_index = converter_materials.indexOf(chunk.material);
                    if (material_index === -1) {
                        var material = Threejs.Material.toJSON(chunk.material, context);
                        material_index = materials.length;
                        converter_materials.push(chunk.material);
                        materials.push(material);
                    }
                    for (var i = 0; i < chunk.vertexCount; ++i) {
                        if (chunk.data.position) {
                            var i0 = 3 * chunk.vertexBufferOffset + 3 * i;
                            vertices.push(chunk.data.position[i0 + 0]);
                            vertices.push(chunk.data.position[i0 + 1]);
                            vertices.push(chunk.data.position[i0 + 2]);
                        }
                        if (chunk.data.normal) {
                            var i0 = 3 * chunk.vertexBufferOffset + 3 * i;
                            normals.push(chunk.data.normal[i0 + 0]);
                            normals.push(chunk.data.normal[i0 + 1]);
                            normals.push(chunk.data.normal[i0 + 2]);
                        }
                        if (chunk.data.texcoord) {
                            var i0 = 2 * chunk.vertexBufferOffset + 2 * i;
                            uvs.push(chunk.data.texcoord[i0 + 0]);
                            uvs.push(chunk.data.texcoord[i0 + 1]);
                        }
                        if (chunk.data.boneindex) {
                            var i0 = 4 * chunk.vertexBufferOffset + 4 * i;
                            skinIndices.push(chunk.data.boneindex[i0 + 0]);
                            skinIndices.push(chunk.data.boneindex[i0 + 1]);
                        }
                        if (chunk.data.boneweight) {
                            var i0 = 4 * chunk.vertexBufferOffset + 4 * i;
                            var w0 = chunk.data.boneweight[i0 + 0];
                            var w1 = chunk.data.boneweight[i0 + 1];
                            var total = w0 + w1;
                            if (total > 0) {
                                w0 = w0 / total;
                                w1 = w1 / total;
                            }
                            skinWeights.push(w0);
                            skinWeights.push(w1);
                        }
                    }
                    for (var i = 0; i < chunk.triangleCount; ++i) {
                        var i0 = chunk.indexBufferOffset + 3 * i;
                        var index0 = baseIndexOffset + chunk.data.indices[i0 + 0];
                        var index1 = baseIndexOffset + chunk.data.indices[i0 + 1];
                        var index2 = baseIndexOffset + chunk.data.indices[i0 + 2];
                        faces.push(42);
                        faces.push(index0);
                        faces.push(index1);
                        faces.push(index2);
                        faces.push(material_index);
                        faces.push(index0);
                        faces.push(index1);
                        faces.push(index2);
                        faces.push(index0);
                        faces.push(index1);
                        faces.push(index2);
                    }
                    baseIndexOffset += chunk.vertexCount;
                }
                var bones = converter_geometry.bones.map(function (bone) {
                    return COLLADA.Threejs.Bone.toJSON(bone, context);
                });
                var animations = doc.resampled_animations.map(function (e) {
                    return COLLADA.Threejs.Animation.toJSON(e, converter_geometry.bones, bones, context);
                });
                // Assemble result
                return {
                    "metadata": {
                        "formatVersion": 3.1,
                        "generatedBy": "Collada Converter",
                    },
                    "scale": 1,
                    "materials": materials,
                    "vertices": vertices.map(function (x) { return COLLADA.MathUtils.round(x, context.pos_tol); }),
                    "morphTargets": [],
                    "normals": normals.map(function (x) { return COLLADA.MathUtils.round(x, context.nrm_tol); }),
                    "colors": [],
                    "uvs": [uvs.map(function (x) { return COLLADA.MathUtils.round(x, context.uvs_tol); })],
                    "faces": faces,
                    "skinIndices": skinIndices,
                    "skinWeights": skinWeights.map(function (x) { return COLLADA.MathUtils.round(x, context.uvs_tol); }),
                    "bones": bones,
                    "animation": animations[0]
                };
            };
            return ThreejsExporter;
        })();
        Threejs.ThreejsExporter = ThreejsExporter;
    })(Threejs = COLLADA.Threejs || (COLLADA.Threejs = {}));
})(COLLADA || (COLLADA = {}));
//# sourceMappingURL=collada.js.map