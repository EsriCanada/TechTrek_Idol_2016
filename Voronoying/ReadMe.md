# Team: Voronoying.


## Team Members:

   * Fabien Ancelin
   * Marc St. Onge
   * Travis Val   
   
   
## Technology mix:

Our project is aimed to integrate an external library into a geoprocessing workflow. It could certainly be published as a service... and we might even do that at the last minute.
   
   
## The Basic Idea:

The idea came from an unresolved client requirement that eventually required the use of a third party developer and command line program to fulfill. The solution was never completely satisfactory from a workflow, integration, maintenance, licensing, and upgrade perspective.
   
This bothered us. In fact, we found it "voronoying".
   
So we decided to see if we could do a better job.
   
   
## The Challenge:

We were able to locate a Python library on GitHub that provided a wrapper around some specific [Boost C++ library](http://www.boost.org/) functions, but it didn't quite work the way we needed. This code was forked, extended, rewritten, signed in triplicate, sent in, sent back, queried, lost, found, subjected to public inquiry, lost again, and finally buried in soft peat for three months and recycled as firelighters. Now it works for our purposes.
   

## The Product:

There are two products of this project. Browse to each on to access the requirements and documentation of each one of them.:

1. a Python library to wrap specific Boost C++ functions and expose the results as Python objects. This requires some C++ coding of the C++/Cython/Python bridge.
       
2. an ArcGIS Geoprocessing Python Script to pre-process and post-process data and provide integration into the Desktop and/or Server environment.