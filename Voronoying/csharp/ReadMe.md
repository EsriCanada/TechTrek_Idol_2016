The following command-line is required to register the geoprocessing after compiling it on a local machine:
"Path To Regasm.exe" /p:desktop "Path To Dll"

The utility is usually located in the following directory:
C:\Program Files (x86)\Common Files\ArcGIS\bin

Example of command line:
C:\Program Files (x86)\Common Files\ArcGIS\bin\ESRIRegAsm.exe /p:desktop "C:\github\TechTrek_Idol_2016\Voronoying\csharp\GPVoronoi\bin\Debug\GPVoronoi.dll".

Note: that command can also be made part of the post-build process in Visual Studio.