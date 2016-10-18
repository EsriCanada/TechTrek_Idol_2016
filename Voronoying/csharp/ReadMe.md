#Voronoi From Line And Points

This tool uses the following library in order to generate Voronoi cells from line and points input: https://github.com/fabanc/SharpBoostVoronoi. The current release used for that tool is 1.0.2. The libraries are stored under the lib folder.

#Usage

In short, the tool takes the following parameters:

1. Input Features: a set of input lines and points. Lines must not crosses each other. Lines must have only 2 points.
2. Output Feature Class: the output feature class.
3. Curve type: the method used to interpolate the curve.

The tool has is provided with an help. Use the help section of the geoprocessing tool for information on proper usage, and the limitations.

#Registration

The following command-line is required to register the geoprocessing after compiling it on a local machine:
"Path To Regasm.exe" /p:desktop "Path To Dll"

The utility is usually located in the following directory:
C:\Program Files (x86)\Common Files\ArcGIS\bin

Example of command line:
C:\Program Files (x86)\Common Files\ArcGIS\bin\ESRIRegAsm.exe /p:desktop "C:\github\TechTrek_Idol_2016\Voronoying\csharp\GPVoronoi\bin\Debug\GPVoronoi.dll".

Note: that command can also be made part of the post-build process in Visual Studio.