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


def delete_feature_class(feature_class_path):
    """
    Attempts to delete a specified feature class
    :param FC: The path to the feature class
    :return: 
    """
    """"""
    if arcpy.Exists(feature_class_path):
        arcpy.Delete_management(feature_class_path)


def merge_extent(extents):
    """
    Read through a set of extent an return the extent containing them all.
    :param extents: a list of arcpy.Extent objects
    :return: an arcpy.Extent containing all other extents.
    """
    if len(extents) == 0:
        raise Exception("No extent was provided")

    if len(extents) == 1:
        return extents[0]

    out_extent = arcpy.Extent(extents[0].XMin, extents[0].YMin, extents[0].XMax, extents[0].YMax)
    for i in range(1, len(extents)):

        if extents[i].XMin < out_extent.XMin:
            out_extent.XMin =  extents[i].XMin

        if extents[i].YMin < out_extent.YMin:
            out_extent.YMin = extents[i].YMin

        if extents[i].XMax > out_extent.XMax:
            out_extent.XMax = extents[i].XMax

        if extents[i].YMax > out_extent.YMax:
            out_extent.YMax = extents[i].YMax

    return out_extent


def validate_input_point_feature_class(input_points_feature_class):
    """
    Validate that the input feature class comply with the requirements and returns its extent.
    :param input_points_feature_class: the input point feature class
    :return: an arcpy.Extent object representing the extent of the feature class
    """

    # Check the characteristic of the feature class. Simple lines are expected.
    desc = arcpy.Describe(input_points_feature_class)

    if desc.featureType != "Simple":
        raise Exception('The feature class should contains simple features.')

    if desc.shapeType != "Point":
        raise Exception('The feature class should contain points')

    # Validate that the input geometry does have self intersecting features
    return desc.extent


def validate_input_line_feature_class(input_lines_feature_class):
    """
    Validate that the input feature class comply with the requirements and returns its extent.
    :param input_lines_feature_class:
    :return: an arcpy.Extent object representing the extent of the feature class
    """

    # Check the characteristic of the feature class. Simple lines are expected.
    desc = arcpy.Describe(input_lines_feature_class)

    if desc.featureType != "Simple":
        raise Exception('The feature class should contains simple features.')

    if desc.shapeType != "Polyline":
        raise Exception('The feature class should contain line')

    # Validate that the input geometry does have self intersecting features
    return desc.extent


def validate_license():
    """
    Check that the current license is using advanced.
    :return:
    """
    if not arcpy.ProductInfo() == 'ArcInfo':
        if arcpy.CheckProduct('ArcInfo') == 'available':
            arcpy.SetProduct('ArcInfo')
        else:
            raise Exception('An advanced license was not available')


def main():
    try:
        ##################################################################################
        # READ PARAMETERS
        ##################################################################################
        inpoints = arcpy.GetParameterAsText(0)
        inlines = arcpy.GetParameterAsText(1)
        out_workspace = arcpy.GetParameterAsText(2)
        outpoints = arcpy.GetParameterAsText(3)
        outsegments = arcpy.GetParameterAsText(4)
        outpolygons = arcpy.GetParameterAsText(5)
        inroads_identifier = arcpy.GetParameterAsText(6)
        #TODO Implement curve ratio
        curve_ratio = arcpy.GetParameterAsText(7)
        arcpy.env.workspace = out_workspace

        ##################################################################################
        # HARD CODED PARAMETERS
        ##################################################################################
        if arcpy.env.scratchWorkspace is None:
            arcpy.env.scratchWorkspace = r'in_memory'
        factor = 100
        inroads_split_name = "voronoying_lines_split"
        inroads_split_line_name = "voronoying_lines_split_lines"
        inroads_split = os.path.join(arcpy.env.scratchWorkspace, inroads_split_name)
        inroads_split_line = os.path.join(arcpy.env.scratchWorkspace, inroads_split_line_name)
        spatial_reference = arcpy.Describe(inlines).spatialReference

        ##################################################################################
        # VALIDATION
        ##################################################################################
        arcpy.AddMessage("Validation")
        # Validate license requirements
        validate_license()

        # Validate lines are provided
        if len(outsegments) == 0:
            raise Exception("Input lines were not provided.")

        # Validate that a line identifier was provided
        if len(inroads_identifier) == 0:
            raise Exception("Input lines identifier was not provided.")

        extents = []
        # Validate input line feature class.
        input_lines_bbox = validate_input_line_feature_class(inlines)
        extents.append(input_lines_bbox)
        # Validate input point feature class if required.
        input_points_bbox = validate_input_point_feature_class(inpoints) if len(arcpy.GetParameterAsText(0)) > 0 else None

        if curve_ratio < 1:
            raise Exception('Invalid curve ratio. It must be greater than 1. Current value: {}'.format(curve_ratio))
        

        ##################################################################################
        # REMOVE FEATURE CLASSES
        ##################################################################################
        for fc in [
            inroads_split,
            inroads_split_line,
            os.path.join(out_workspace, outpoints),
            os.path.join(out_workspace,outsegments),
            os.path.join(out_workspace,outpolygons)]:
            delete_feature_class(fc)


        ##################################################################################
        # COMPUTING THE BOUNDING BOX
        ##################################################################################
        # Invoke pyvoronoi
        pv = pyvoronoi.Pyvoronoi(factor)
        arcpy.AddMessage("Add points to voronoi")
        point_identifiers = []
        if input_points_bbox is not None:
            extents.append(input_points_bbox)
            for point in arcpy.da.SearchCursor(inpoints, ['SHAPE@X', 'SHAPE@Y', 'OID@']):
                point_identifiers.append(point[2])
                pv.AddPoint([point[0], point[1]])

        arcpy.AddMessage("Computing bounding box outlines")
        final_bounding_box = merge_extent(extents)
        final_bounding_box_expended = arcpy.Extent(
            final_bounding_box.XMin -1,
            final_bounding_box.YMin - 1,
            final_bounding_box.XMax + 1,
            final_bounding_box.YMax + 1
        )

        bbox_line = [
                arcpy.Array([
                    arcpy.Point(final_bounding_box.XMin, final_bounding_box.YMin),
                    arcpy.Point(final_bounding_box.XMax, final_bounding_box.YMin)
                ]),
                arcpy.Array([
                    arcpy.Point(final_bounding_box.XMin, final_bounding_box.YMin),
                    arcpy.Point(final_bounding_box.XMin, final_bounding_box.YMax)
                ]),
                arcpy.Array([
                    arcpy.Point(final_bounding_box.XMax, final_bounding_box.YMax),
                    arcpy.Point(final_bounding_box.XMin, final_bounding_box.YMax)
                ]),
                arcpy.Array([
                    arcpy.Point(final_bounding_box.XMax, final_bounding_box.YMax),
                    arcpy.Point(final_bounding_box.XMax, final_bounding_box.YMin)
                ]),
                arcpy.Array([
                    arcpy.Point(final_bounding_box_expended.XMin, final_bounding_box_expended.YMin),
                    arcpy.Point(final_bounding_box_expended.XMax, final_bounding_box_expended.YMin)
                ]),
                arcpy.Array([
                    arcpy.Point(final_bounding_box_expended.XMin, final_bounding_box_expended.YMin),
                arcpy.Point(final_bounding_box_expended.XMin, final_bounding_box_expended.YMax)
                ]),
                arcpy.Array([
                    arcpy.Point(final_bounding_box_expended.XMax, final_bounding_box_expended.YMax),
                    arcpy.Point(final_bounding_box_expended.XMin, final_bounding_box_expended.YMax)
                ]),
                arcpy.Array([
                    arcpy.Point(final_bounding_box_expended.XMax, final_bounding_box_expended.YMax),
                    arcpy.Point(final_bounding_box_expended.XMax, final_bounding_box_expended.YMin)
                ])
        ]

        arcpy.AddMessage(
            "Bounding Box Info: {0},{1} | {2},{3}".format(
                final_bounding_box.XMin,
                final_bounding_box.YMin,
                final_bounding_box.XMax,
                final_bounding_box.YMax)
        )


        ##################################################################################
        # FORMAT INPUT. NEED TO MAKE SURE LINE ARE SPLIT AT VERTICES AND THAT THERE ARE NO OVERLAPS
        ##################################################################################
        arcpy.AddMessage("Format lines")
        arcpy.AddMessage("Split lines at vertices")
        arcpy.SplitLine_management(in_features=inlines, out_feature_class=inroads_split)

        arcpy.AddMessage("Add bounding box")
        with arcpy.da.InsertCursor(inroads_split, ['SHAPE@', inroads_identifier]) as op:
            for pointArray in bbox_line:
                arcpy.AddMessage(
                    "{0},{1} - {2},{3}".format(
                        pointArray[0].X,
                        pointArray[0].Y,
                        pointArray[1].X,
                        pointArray[1].Y)
                )
                op.insertRow([arcpy.Polyline(pointArray), None])
        del op

        arcpy.AddMessage("Split lines at intersections")
        arcpy.FeatureToLine_management(inroads_split, inroads_split_line, '#', 'ATTRIBUTES')


        ##################################################################################
        # SEND LINE INPUT TO VORONOI AND CONSTRUCT THE GRAPH
        ##################################################################################
        arcpy.AddMessage("Add lines to voronoi")
        line_identifier = []
        for road in arcpy.da.SearchCursor(inroads_split_line, ['SHAPE@', 'OID@', 'SHAPE@LENGTH', inroads_identifier]):
            if road[2] > 0:
                line_identifier.append(road[3])
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

        arcpy.AddMessage("Construct voronoi")
        pv.Construct()
        count_cells = pv.CountCells()


        ##################################################################################
        # CREATE THE OUTPUT FEATURE CLASSES
        ##################################################################################
        arcpy.AddMessage("Construct output point feature class")
        if len(outpoints) > 0:
            arcpy.CreateFeatureclass_management(out_workspace, outpoints, 'POINT', spatial_reference=spatial_reference)
            arcpy.AddField_management(outpoints, 'IDENTIFIER', "LONG")		
            fields = ['IDENTIFIER', 'SHAPE@X', 'SHAPE@Y']
            with arcpy.da.InsertCursor(outpoints, fields) as cursor:
                count_vertex = pv.CountVertices()
                for vIndex in xrange(count_vertex):
                    v = pv.GetVertex(vIndex)
                    cursor.insertRow([vIndex, v.X, v.Y])

        arcpy.AddMessage("Construct output segment feature class")
        if len(outsegments) > 0:
            arcpy.CreateFeatureclass_management(out_workspace, outsegments, 'POLYLINE', spatial_reference=spatial_reference)
            arcpy.AddField_management(outsegments, 'EdgeIndex', "LONG")
            arcpy.AddField_management(outsegments, 'Start', "LONG")
            arcpy.AddField_management(outsegments, 'End', "LONG")
            arcpy.AddField_management(outsegments, 'IsLinear', "SHORT")
            arcpy.AddField_management(outsegments, 'IsPrimary', "SHORT")
            arcpy.AddField_management(outsegments, 'Cell', "LONG")
            arcpy.AddField_management(outsegments, 'Twin', "LONG")

            fields = ['EdgeIndex', 'Start', 'End', 'IsLinear', 'IsPrimary', 'Cell', 'Twin', 'SHAPE@']
            with arcpy.da.InsertCursor(outsegments, fields) as cursor:
                for cIndex in xrange(count_cells):
                    cell = pv.GetCell(cIndex)
                    if not cell.is_open:
                        if cIndex % 5000 == 0 and cIndex > 0:
                            arcpy.AddMessage("Cell Index: {0}".format(cIndex))

                        for i in range(len(cell.edges)):
                            e = pv.GetEdge(cell.edges[i])
                            start_vertex = pv.GetVertex(e.start)
                            end_vertex = pv.GetVertex(e.end)
                            max_distance = pyvoronoi.Distance(
                                [start_vertex.X, start_vertex.Y],
                                [end_vertex.X, end_vertex.Y]
                            ) / 10
                            array = arcpy.Array()
                            if start_vertex != -1 and end_vertex != -1:
                                if e.is_linear:
                                    array = arcpy.Array([arcpy.Point(start_vertex.X, start_vertex.Y),arcpy.Point(end_vertex.X, end_vertex.Y)])

                                else:
                                    try:
                                        points = pv.DiscretizeCurvedEdge(cell.edges[i], max_distance, 1/ curve_ratio)
                                        for p in points:
                                            array.append(arcpy.Point(p[0], p[1]))

                                    except pyvoronoi.FocusOnDirectixException:
                                        arcpy.AddMessage(
                                            "FocusOnDirectixException at: {5}. The drawing has been defaulted from a curved line to a straight line. Length {0} - From: {1}, {2} To: {3}, {4}".format(
                                                max_distance,
                                                start_vertex.X,
                                                start_vertex.Y,
                                                end_vertex.X,
                                                end_vertex.Y,
                                                cell.edges[i]
                                            )
                                        )
                                        array = arcpy.Array([arcpy.Point(start_vertex.X, start_vertex.Y), arcpy.Point(end_vertex.X, end_vertex.Y)])

                                    except pyvoronoi.UnsolvableParabolaEquation:
                                        edge = pv.outputEdges[cell.edges[i]]
                                        sites = pv.ReturnCurvedSiteInformation(edge)
                                        point_site = sites[0]
                                        segment_site = sites[1]
                                        edge_start_vertex = pv.outputVertices[edge.start]
                                        edge_end_vertex = pv.outputVertices[edge.end]

                                        arcpy.AddWarning("Input Point: {0}".format(point_site))
                                        arcpy.AddWarning("Input Segment: {0}".format(segment_site))
                                        arcpy.AddWarning("Parabola Start: {0}".format(
                                            [edge_start_vertex.X, edge_start_vertex.Y])
                                        )
                                        arcpy.AddWarning("Parabola End: {0}".format(
                                            [edge_end_vertex.X, edge_end_vertex.Y])
                                        )

                                        arcpy.AddWarning("Distance: {0}".format(max_distance))

                                        arcpy.AddWarning(
                                            "UnsolvableParabolaEquation exception at: {5}. The drawing has been defaulted from a curved line to a straight line. Length {0} - From: {1}, {2} To: {3}, {4}".format(
                                                max_distance,
                                                start_vertex.X,
                                                start_vertex.Y,
                                                end_vertex.X,
                                                end_vertex.Y,
                                                cell.edges[i])
                                        )

                                        array = arcpy.Array([
                                            arcpy.Point(start_vertex.X, start_vertex.Y),
                                            arcpy.Point(end_vertex.X, end_vertex.Y)
                                        ])

                                    except Exception as e:
                                        print "Exception happened at cell '{0}'".format(i)
                                        raise e

                                polyline = arcpy.Polyline(array)
                                cursor.insertRow((cell.edges[i],e.start,e.end, e.is_linear, e.is_primary,e.cell, e.twin, polyline))

        arcpy.AddMessage("Construct output cells feature class")
        if len(outpolygons) > 0:
            arcpy.CreateFeatureclass_management(out_workspace, outpolygons,'POLYGON', spatial_reference=spatial_reference)
            arcpy.AddField_management(outpolygons, 'CELL_ID', "LONG")
            arcpy.AddField_management(outpolygons, 'CONTAINS_POINT', "SHORT")
            arcpy.AddField_management(outpolygons, 'CONTAINS_SEGMENT', "SHORT")
            arcpy.AddField_management(outpolygons, 'SITE', "LONG")
            arcpy.AddField_management(outpolygons, 'SOURCE_CATEGORY', "SHORT")
            arcpy.AddField_management(outpolygons, 'INPUT_TYPE', "TEXT")
            arcpy.AddField_management(outpolygons, 'INPUT_ID', "LONG")
            fields = ['CELL_ID', 'CONTAINS_POINT', 'CONTAINS_SEGMENT', 'SHAPE@', 'SITE', 'SOURCE_CATEGORY', 'INPUT_TYPE', 'INPUT_ID']
            with arcpy.da.InsertCursor(outpolygons, fields) as cursor:
                for cIndex in xrange(count_cells):
                    try:
                        cell = pv.GetCell(cIndex)
                        if not cell.is_open and not cell.is_degenerate:

                            if cIndex % 5000 == 0 and cIndex > 0:
                                arcpy.AddMessage("Cell Index: {0}".format(cIndex))

                            cell_points_array = arcpy.Array()
                            previous_vertex_index = -1
                            for edge_index in cell.edges:
                                e = pv.GetEdge(edge_index)
                                start_vertex = pv.GetVertex(e.start)
                                end_vertex = pv.GetVertex(e.end)
                                max_distance = pyvoronoi.Distance([start_vertex.X, start_vertex.Y], [end_vertex.X, end_vertex.Y]) / 10

                                points = []
                                if e.is_linear:
                                    points.append([start_vertex.X, start_vertex.Y])
                                    points.append([end_vertex.X, end_vertex.Y])
                                else:
                                    try:
                                        curved_points = pv.DiscretizeCurvedEdge(edge_index, max_distance, 1/ curve_ratio)
                                        points.extend(curved_points)

                                    except Exception as e:
                                        arcpy.AddError("Exception happened at cell '{0}'".format(i))
                                        points.append([start_vertex.X, start_vertex.Y])
                                        points.append([end_vertex.X, end_vertex.Y])

                                start_index = 1 if previous_vertex_index == e.start else 0
                                for index in range(start_index, len(points)):
                                    point = points[index]
                                    cell_points_array.append(arcpy.Point(point[0], point[1]))

                            input_type = 'LINE' if cell.site >= len(point_identifiers) else 'POINT'
                            input_id = line_identifier[cell.site - len(point_identifiers)] if cell.site >= len(point_identifiers) else point_identifiers[cell.site]

                            polygon = arcpy.Polygon(cell_points_array)
                            cursor.insertRow((cell.cell_identifier, cell.contains_point, cell.contains_segment, polygon, cell.site,
                                              cell.source_category, input_type, input_id))
                    except Exception as e:
                        print "Failed on cell {0}".format(cIndex)
                        raise Exception(e)

    except Exception:
        tb = sys.exc_info()[2]
        tbInfo = traceback.format_tb(tb)[-1]
        arcpy.AddError('PYTHON ERRORS:\n%s\n%s: %s\n' %
                       (tbInfo, sys.exc_type, sys.exc_value))

        arcpy.AddMessage('PYTHON ERRORS:\n%s\n%s: %s\n' %
                  (tbInfo, sys.exc_type, sys.exc_value))
        gp_errors = arcpy.GetMessages(2)
        if gp_errors:
            arcpy.AddError('GP ERRORS:\n%s\n' % gp_errors)


if __name__ == '__main__':
    main()