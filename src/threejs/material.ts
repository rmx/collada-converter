/// <reference path="context.ts" />
/// <reference path="../converter/material.ts" />

module COLLADA.Threejs {

    export class Material {

        static toJSON(material: COLLADA.Converter.Material, context: COLLADA.Threejs.Context): any {
            if (material === null) {
                return null;
            }

            return {
                "DbgColor": 0,
                "DbgIndex": 1,
                "DbgName": material.name,
                "blending": "NormalBlending",
                "colorAmbient": [1,1,1],
                "colorDiffuse": [1,1,1],
                "colorSpecular": [0.5,0.5,0.5],
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
        }
    };
}