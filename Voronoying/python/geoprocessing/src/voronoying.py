"""
Author: Fabien Ancelin
Script created with:
    Python 2.7
    ArcGIS 10.3
The script required the library Pyvoronoi to be installed.
    https://github.com/Voxel8/pyvoronoi
"""

from __future__ import division
import os,sys, traceback, math
import arcpy
import pyvoronoi


def distance(p0, p1):
    return math.sqrt((p0[0] - p1[0])**2 + (p0[1] - p1[1])**2)

def mergeExtent(extents):
    """
    Read through a set of extent an return the extent containing them all.
    :param extents: a list of arcpy.Extent objects
    :return: an arcpy.Extent containing all other extents.
    """
    if len(extents) == 0:
        raise Exception("No extent was provided")

    if len(extents) == 1:
        return extents[0]

    outExtent = arcpy.Extent(extents[0].XMin, extents[0].YMin, extents[0].XMax, extents[0].YMax)
    for i in range(1, len(extents)):

        if extents[i].XMin < outExtent.XMin:
            outExtent.XMin =  extents[i].XMin

        if extents[i].YMin < outExtent.YMin:
            outExtent.YMin = extents[i].YMin

        if extents[i].XMax > outExtent.XMax:
            outExtent.XMax = extents[i].XMax

        if extents[i].YMax > outExtent.YMax:
            outExtent.YMax = extents[i].YMax

    return outExtent


def validateInputPointFeatureClass(inPointFeatureClass):
    """
    Validate that the input feature class comply with the requirements and returns its extent.
    :param inPointFeatureClass: the input point feature class
    :return: an arcpy.Extent object representing the extent of the feature class
    """

    #Check the characteristic of the feature class. Simple lines are expected.
    desc = arcpy.Describe(inPointFeatureClass)

    if desc.featureType != "Simple":
        raise Exception('The feature class should contains simple features.')

    if desc.shapeType != "Point":
        raise Exception('The feature class should contain points')

    #Validate that the input geometry does have self intersecting features
    return desc.extent


def validateInputLineFeatureClass(inLineFeatureClass):
    """
    Validate that the input feature class comply with the requirements and returns its extent.
    :param inLineFeatureClass:
    :return: an arcpy.Extent object representing the extent of the feature class
    """

    #Check the characteristic of the feature class. Simple lines are expected.
    desc = arcpy.Describe(inLineFeatureClass)

    if desc.featureType != "Simple":
        raise Exception('The feature class should contains simple features.')

    if desc.shapeType != "Polyline":
        raise Exception('The feature class should contain line')

    #Validate that the input geometry does have self intersecting features
    return desc.extent



def validateLicense():
    """
    Check that the current license is using advanced.
    :return:
    """
    if not arcpy.ProductInfo() == 'ArcInfo':
        if arcpy.CheckProduct('ArcInfo') == 'available':
            arcpy.SetProduct('ArcInfo')
        else:
            raise Exception('An advanced license was not available')


def checkSelfOverlap(inputFC, outPath, outFCName, triggerFailure):
    """
    Check if a feature class contains overlapping features. Based on the value of the triggerFailure parameter,
    it will return either a warning or an exception.
    :param inputFC: The input feature class
    :param outPath: The output path for the feature class that will contain overlaps.
    :param outFCName: The name of the feature class containing the overlaps.
    :param triggerFailure: If true, then the function will return an exception when duplicates are found.
    :return:
    """
    tempFC = "in_memory/{0}".format(outFCName)
    outFCPath = "{0}{1}{2}".format(outPath,os.path.sep, outFCName)
    #Spatial Join into temporary feature class
    arcpy.SpatialJoin_analysis (inputFC, inputFC, tempFC, 'JOIN_ONE_TO_ONE', 'KEEP_COMMON', match_option='SHARE_A_LINE_SEGMENT_WITH')

    #Generate an output feature class
    arcpy.FeatureClassToFeatureClass_conversion (tempFC, outPath, outFCName, 'Join_Count > 1')

    #Delete the in memory feature class
    arcpy.Delete_management(tempFC)
    #Count if there are any issues
    count = int(arcpy.GetCount_management(outFCPath).getOutput(0))
    if count > 0:
        arcpy.AddMessage("Overlapping segments found. See feature class {0}".format(outFCPath))
        if triggerFailure:
            arcpy.AddError("Overlapping segments found. See feature class {0}".format(outFCPath))
            sys.exit(-1)

def main():
    try:
        ##################################################################################
        #READ PARAMETERS
        ##################################################################################
        inpoints = arcpy.GetParameterAsText(0)
        inlines = arcpy.GetParameterAsText(1)
        outWorkspace = arcpy.GetParameterAsText(2)
        outpoints = arcpy.GetParameterAsText(3)
        outsegments = arcpy.GetParameterAsText(4)
        outpolygons = arcpy.GetParameterAsText(5)
        arcpy.env.workspace = outWorkspace

        ##################################################################################
        #HARD CODED PARAMETERS
        ##################################################################################
        factor = 100
        inroads_split = "{0}{1}{2}".format(arcpy.env.scratchWorkspace, os.path.sep, "voronoying_lines_split")
        inroads_split_line = "{0}{1}{2}".format(arcpy.env.scratchWorkspace, os.path.sep,"voronoying_lines_split_lines")
        spatial_reference = arcpy.Describe(inlines).spatialReference

        ##################################################################################
        #VALIDATION
        ##################################################################################
        arcpy.AddMessage("Validation")
        #Validate license requirements
        validateLicense()

        #Validate lines are provided
        if len(arcpy.GetParameterAsText(1)) == 0:
            raise Exception("Input lines were not provided.")

        extents = []
        #Validate input line feature class.
        inlinesBBox = validateInputLineFeatureClass(inlines)
        extents.append(inlinesBBox)
        #Validate input point feature class if required.
        inPointsBBox = validateInputPointFeatureClass(inpoints) if len(arcpy.GetParameterAsText(0)) > 0 else None


        ##################################################################################
        #FORMAT INPUT. NEED TO MAKE SURE LINE ARE SPLIT AT VERTICES AND THAT THERE ARE NO OVERLAPS
        ##################################################################################
        arcpy.AddMessage("Format lines")
        arcpy.AddMessage("Split lines at vertices")
        arcpy.SplitLine_management(in_features=inlines, out_feature_class=inroads_split)
        arcpy.AddMessage("Split lines at intersections")
        arcpy.FeatureToLine_management(inroads_split, inroads_split_line, '#', 'ATTRIBUTES')


        ##################################################################################
        #SEND INPUT TO VORONOI AND CONSTRUCT THE GRAPH
        ##################################################################################
        #Instanciate pyvoronoi
        pv = pyvoronoi.Pyvoronoi(factor)

        arcpy.AddMessage("Add points to voronoi")
        if inPointsBBox != None:
            extents.append(inPointsBBox)
            for point in arcpy.da.SearchCursor(inpoints, ['SHAPE@X', 'SHAPE@Y', 'OID@']):
                pv.AddPoint([point[0], point[1]])

        arcpy.AddMessage("Add lines to voronoi")
        for road in arcpy.da.SearchCursor(inlines, ['SHAPE@', 'OID@', 'SHAPE@LENGTH']):
            if (road[2] > 0):
                pv.AddSegment(
                    [
                        [
                            road[0].firstPoint.X,
                            road[0].firstPoint.Y
                        ],
                        [
                            road[0].lastPoint.X,
                            road[0].lastPoint.Y
                        ]
                    ])

        #arcpy.AddMessage("Computing bounding box outlines")
        #finalBBox = mergeExtent(extents)
        #bbox_line = [
        #    arcpy.Array([arcpy.Point(finalBBox.XMin, finalBBox.YMin),
        #                 arcpy.Point(finalBBox.XMin + finalBBox.width, finalBBox.YMin)]),
        #    arcpy.Array([arcpy.Point(finalBBox.XMin, finalBBox.YMin),
        #                 arcpy.Point(finalBBox.XMin, finalBBox.YMin + + finalBBox.height)]),
        #    arcpy.Array([arcpy.Point(finalBBox.XMax, finalBBox.YMax),
        #                 arcpy.Point(finalBBox.XMax - finalBBox.width, finalBBox.YMax)]),
        #    arcpy.Array([arcpy.Point(finalBBox.XMax, finalBBox.YMax),
        #                 arcpy.Point(finalBBox.XMax, finalBBox.YMax - finalBBox.height)]),
        #]

        #for pointArray in bbox_line:
            #Check if the feature already exist

        arcpy.AddMessage("Construct voronoi")
        pv.Construct()
        cells = pv.GetCells()
        edges = pv.GetEdges()
        vertices = pv.GetVertices()

        ##################################################################################
        #CREATE THE OUTPUT FEATURE CLASSES
        ##################################################################################
        arcpy.AddMessage("Construct output segment feature class")
        if len(outsegments) > 0:
            arcpy.CreateFeatureclass_management(outWorkspace, outsegments, 'POLYLINE', spatial_reference=spatial_reference)
            arcpy.AddField_management(outsegments, 'EdgeIndex', "LONG")
            arcpy.AddField_management(outsegments, 'Start', "LONG")
            arcpy.AddField_management(outsegments, 'End', "LONG")
            arcpy.AddField_management(outsegments, 'IsLinear', "SHORT")
            arcpy.AddField_management(outsegments, 'IsPrimary', "SHORT")
            arcpy.AddField_management(outsegments, 'Site1', "LONG")
            arcpy.AddField_management(outsegments, 'Site2', "LONG")
            arcpy.AddField_management(outsegments, 'Cell', "LONG")
            arcpy.AddField_management(outsegments, 'Twin', "LONG")

            fields = ['EdgeIndex', 'Start', 'End', 'IsLinear', 'IsPrimary','Site1','Site2','Cell','Twin','SHAPE@']
            cursor = arcpy.da.InsertCursor(outsegments, fields)
            for cIndex in range(len(cells)):
                cell = cells[cIndex]
                if cell.is_open == False:
                    if (cIndex % 5000 == 0 and cIndex > 0):
                        print "Cell Index: {0}".format(cIndex)

                    for i in range(len(cell.edges)):
                        e = edges[cell.edges[i]]
                        startVertex = vertices[e.start]
                        endVertex = vertices[e.end]

                        max_distance  = distance([startVertex.X, startVertex.Y], [endVertex.X, endVertex.Y]) / 10
                        array = arcpy.Array()
                        if startVertex != -1 and endVertex != -1:
                            if(e.is_linear == True):
                                array = arcpy.Array([arcpy.Point(startVertex.X, startVertex.Y),arcpy.Point(endVertex.X, endVertex.Y)])

                            else:
                                try:
                                    points = pv.DiscretizeCurvedEdge(cell.edges[i], max_distance)
                                    for p in points:
                                        #print "{0},{1}".format(p[0], p[1])
                                        array.append(arcpy.Point(p[0], p[1]))
                                except:
                                    arcpy.AddMessage(
                                        "Issue at: {5}. Length {0} - From: {1}, {2} To: {3}, {4}".format(max_distance, startVertex.X,
                                                                                   startVertex.Y, endVertex.X,
                                                                                   endVertex.Y, i))
                                    array = arcpy.Array([arcpy.Point(startVertex.X, startVertex.Y), arcpy.Point(endVertex.X, endVertex.Y)])

                            polyline = arcpy.Polyline(array)
                            cursor.insertRow((cIndex,e.start,e.end, e.is_linear, e.is_primary, e.site1, e.site2,e.cell, e.twin, polyline))

        arcpy.AddMessage("Construct output cells feature class")
        if len(outpolygons) > 0:
            arcpy.CreateFeatureclass_management(outWorkspace, outpolygons,'POLYGON', spatial_reference=spatial_reference)
            arcpy.AddField_management(outpolygons, 'CELL_ID', "LONG")
            arcpy.AddField_management(outpolygons, 'CONTAINS_POINT', "SHORT")
            arcpy.AddField_management(outpolygons, 'CONTAINS_SEGMENT', "SHORT")
            arcpy.AddField_management(outpolygons, 'SITE', "LONG")
            arcpy.AddField_management(outpolygons, 'SOURCE_CATEGORY', "SHORT")
            fields = ['CELL_ID', 'CONTAINS_POINT', 'CONTAINS_SEGMENT', 'SHAPE@', 'SITE', 'SOURCE_CATEGORY']
            cursor = arcpy.da.InsertCursor(outpolygons, fields)
            for cIndex in range(len(cells)):
                cell = cells[cIndex]
                if cell.is_open == False:
                    if (cIndex % 5000 == 0 and cIndex > 0):
                        print "Cell Index: {0}".format(cIndex)
                    pointArray = arcpy.Array()
                    for vIndex in cell.vertices:
                        pointArray.add(arcpy.Point(
                            vertices[vIndex].X,
                            vertices[vIndex].Y
                        ))

                    polygon = arcpy.Polygon(pointArray)
                    cursor.insertRow((cell.cell_identifier, cell.contains_point, cell.contains_segment, polygon, cell.site,
                                      cell.source_category))
            del cursor

    except Exception:
        tb = sys.exc_info()[2]
        tbInfo = traceback.format_tb(tb)[-1]
        arcpy.AddError('PYTHON ERRORS:\n%s\n%s: %s\n' %
                       (tbInfo, sys.exc_type, sys.exc_value))
        # print('PYTHON ERRORS:\n%s\n%s: %s\n' %
        #                 (tbInfo, _sys.exc_type, _sys.exc_value))
        arcpy.AddMessage('PYTHON ERRORS:\n%s\n%s: %s\n' %
                  (tbInfo, sys.exc_type, sys.exc_value))
        gp_errors = arcpy.GetMessages(2)
        if gp_errors:
            arcpy.AddError('GP ERRORS:\n%s\n' % gp_errors)


if __name__ == '__main__':
    main()