Collada converter
=================

Loads and converts COLLADA files into a format more usable for WebGL.

User interface
==============

The converter comes with a simple user interface in the form of an local web page.
You don't need any web server to use this page - simply download and build the project,
then open `examples/convert.html` from the project folder.
If you do not want to build the project yourself,
there is a live preview [here](http://rmx.github.io/collada-converter/examples/convert.html).

Building
========

There are several ways of building the library:

* Using the command line
    * Make sure you have [Node.js](http://nodejs.org/) installed
    * Navigate to the project root
    * Type `npm update` (only need to do this once)
    * Type `make.bat` (Windows) or `make` (Unix)
* Using Microsoft Visual Studio
    * Make sure you have [typescript for Visual Studio](http://www.typescriptlang.org/#Download) installed 
    * Open the solution in the `visual_studio` subdirectory
    * Build the project

Architecture
============

COLLADA files are text files, with their content structured as an XML document.
This converter transforms such files into documents that are suitable for loading in a WebGL engine.
This conversion is performed in 4 stages, implemented by the following modules:

1. **DOMParser** (built in in all browsers), to convert the text file into an XML document.
2. **ColladaLoader** (from this library), to convert the XML document into a corresponding COLLADA javascript object. The resulting object is just easier to work with than a generic XML document and provides some convenience functionality for navigating the COLLADA document.
3. **ColladaConverter** (from this library), to extract all geometries, materials, and animations from the COLLADA javascript object and transform them into a representation that is suitable for realtime rendering on the GPU.
4. **ColladaExporter** (from this library), to pack the converted data into a file that is suitable for extremely fast loading in WebGL.
