# Voronoying (Python)

## Description

This section contains a geoprocessing tool. This tool will require the deployement of pyvoronoi 1.0.0. The documentation for installing pyvoronoi is available on project web page: https://github.com/Voxel8/pyvoronoi

If you have internet access, the tool can be downloaded using the following command line: 

``pip install pyvoronoi==1.0.0``

The adequate version of pypi can also be accessed through the project website: https://pypi.python.org/pypi?%3Aaction=pkg_edit&name=pyvoronoi

Note that you will need to download Microsoft Visual C++ Compiler for Python 2.7: https://www.microsoft.com/en-ca/download/details.aspx?id=44266

Consult the help of associated with the geoprocessing tools for more information. The pyovornoi github repository has also extensive documentation about installation. 

Finally, for information about the voronoi solver, please refer to the Boost API: http://www.boost.org/doc/libs/1_59_0/libs/polygon/doc/voronoi_diagram.htm

## Installing Setup tools in Python.

If you choose to install from source or from an off-line environement, you will need to install from source. For that, you will need setup tools: https://pypi.python.org/pypi/setuptools

In order to install, do the following:

* Download setuptools-XX.X.X.zip from https://pypi.python.org/pypi/setuptools

* Extract it in a directory

* Open a command prompt from the start menu or windows explorer

* Install by running this command (replace setuptools-XX.X.X with the appropriate version number. For example setuptools-31.0.1): %ArcGISPythonDirectory%\python.exe %PathToSetupTools%\setuptools-XX.X.X\setup.py install

## Limitations

The output feature class (vertices, edges, cells) may not be exactly snapped to the input line feature class. The reason for that is that the underlying Boost API takes integer as an input. When the coordinates are sent to the voronoi API, they get rounded. There are different strategies we have implemented to fix that issues for customers, so feel free to contact us if some information is needed. One of the solution is to use snappping.

The results of this tool is highly depending on the quality of your input data. It is up to validate that your input data meet the following requirements:

* Input points and line feature class use the same coordinate system.

* Input data is properly snapped. 

* No segments overlap each other.

Having invalid data usually result in the following outcome:

* Pyvoronoi never solves. Pyvoronoi is fast, and bulild the output structure for a million of input points and segments in less than a minute usually. If it lasts longer than that, it is a bad sign.

* The output data is outside of the extent of the input data, or throws an exception saying that the coordinates returned by pyvoronoi are outside of the limit of the projection system.


