# Voronoying (Python)

##Description
This section contains a geoprocessing tool. Consult the help of associated with the geoprocessing tools for more information.

##Limitations
The output feature class (vertices, edges, cells) may not be exactly snapped to the input line feature class. The reason for that is that the underlying Boost API takes integer as an input. When the coordinates are sent to the voronoi API, they get rounded. There are different strategies we have implemented to fix that issues for customers, so feel free to contact us if some information is needed. One of the solution is to use snappping.
