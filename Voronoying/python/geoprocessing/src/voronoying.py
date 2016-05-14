import arcpy
import pyvoronoi

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


def main():

    ##################################################################################
    #READ PARAMETERS
    ##################################################################################
    inpoints = arcpy.GetParameterAsText(0)
    inlines = arcpy.GetParameterAsText(1)
    outpoints = arcpy.GetParameterAsText(2)
    outsegments = arcpy.GetParameterAsText(3)
    outpolygons = arcpy.GetParameterAsText(4)

    ##################################################################################
    #VALIDATION
    ##################################################################################
    #Validate license requirements
    validateLicense()

    #Validate lines are provided
    if len(arcpy.GetParameterAsText(1)) == 0:
        raise Exception("Input lines were not provided.")

    #Validate input line feature class.
    inlinesBBox = validateInputLineFeatureClass(inlines)

    #Validate input point feature class if required.
    inPointsBBox = validateInputPointFeatureClass(inpoints) if len(arcpy.GetParameterAsText(0)) > 0 else None


    ##################################################################################
    #FORMAT INPUT. NEED TO MAKE SURE LINE ARE SPLIT AT VERTICES AND THAT THERE ARE NO OVERLAPS
    ##################################################################################


    ##################################################################################
    # CALL PYVORONOI AND SOLVE THE OUTPUT
    ##################################################################################


if __name__ == '__main__':
    main()