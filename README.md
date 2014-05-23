Collada converter
==================

Loads and converts COLLADA files into a format more usable for WebGL


Building
========

First, make sure you have typescript installed 
There are several ways of building the library:

* Using Microsoft Visual Studio
    * Make sure you have typescript for Visual Studio installed (http://www.typescriptlang.org/#Download)
    * Open the solution in the `visual_studio` subdirectory
    * Build the project
* Using the command line
    * Windows: run make.bat in the project root
    * Unix: 


Architecture
============

1. COLLADA files are text files.
2. Use a *DOMParser* (built in in all browsers) to convert the text file into an XML document.
3. Use a *ColladaLoader* (from this library) to convert COLLADA XML document into a corresponding COLLADA javascript object. The resulting object is just easier to work with than a generic XML document and provides some convenience functionality for navigating the links within the file.
4. Use a *ColladaConverter* (from this library) to extract all geometries, materials, and animations from the COLLADA javascript object and transform them into a representation that is suitable for realtime rendering on the GPU.
5. Use a *ColladaExporter* (from this library) to pack the converted data into a file that is suitable for extremely fast loading in WebGL (a few milliseconds).