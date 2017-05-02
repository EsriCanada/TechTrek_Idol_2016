__author__ = 'menglish'

import arcpy, os, glob, json, requests
import arcrest
from arcresthelper import securityhandlerhelper
from arcrest.agol import FeatureLayer
from arcrest.common.filters import StatisticFilter
from arcrest.common.filters import GeometryFilter


token = {}
url = "http://services.arcgis.com/zmLUiqh7X11gGV2d/arcgis/rest/services/gumAuthenticated/FeatureServer/0"
itemId = "774026c1c055425883e2d01b66c2c3b1" #"6255c7bc52024351bae1ec3f09f152f3" #"4ef0c74ca585417f88ab548803715a3f" #"370b7f3cecc94398bfd88d09468dfb15"
itemTitle = "GB1"
rootDir = "D:/Data/Gum/"
stagingGDB = rootDir + "Staging/TorontoGum.gdb"
backupStagingGDB = rootDir + "BAK/TorontoGum_Vanilla.gdb"
backupPublishGDB = rootDir + "BAK/TorontoGum_Vanilla_Publish.gdb"
publishGDB = rootDir + "Staging/Publish/TorontoGum_Publish.gdb"
jsonDir = rootDir + "Staging/json/"
outJsonDir = "C:/inetpub/wwwroot/gumbuster/data/"
gumCountField = "GUM_COUNT"

def setupEnvironment():
    arcpy.env.workspace = stagingGDB
    arcpy.env.overwriteOutput = True

def getLastTotalGumCount():
    table = backupPublishGDB + "/UnsortedWorldwideGumCountByDate"

    # List all of the row values as a list of tuples
    rows = [row for row in arcpy.da.SearchCursor(table, "*")]

    # Get the last row
    print rows[-1]

    arcpy.AddMessage("Retrieved Last Total Gum Count of " + str(rows[-1][2]) + " from " + table)

    return rows[-1] #[2]


def getCurrentGumCount():
    global token
    gumCountOutField = "total_gum_count"
    observationsCountOutField = "total_observations"
    fl = FeatureLayer(url = url, securityHandler=token.securityhandler,initialize=True)
    statisticFilter = StatisticFilter()

    statisticFilter.add(statisticType="count", onStatisticField="gum_count", outStatisticFieldName=observationsCountOutField)
    statisticFilter.add(statisticType="sum", onStatisticField="gum_count", outStatisticFieldName=gumCountOutField)
    result = fl.query(statisticFilter=statisticFilter) #groupByFieldsForStatistics="city",

    gumCount = 0
    obsCount = 0

    for f in result.features:

        for key in f.asDictionary['attributes'] :
            arcpy.AddMessage(key + ": " + str(f.asDictionary['attributes'][key]))

            if key == gumCountOutField:
                gumCount = f.asDictionary['attributes'][key]
            if key == observationsCountOutField:
                obsCount = f.asDictionary['attributes'][key]

    #arcpy.AddMessage("Retrieved Total Gum Count: " + str(gumCount) + " and Total Observations Count: " + str(obsCount) + " from AGOL")

    return gumCount, obsCount, fl, statisticFilter

def performSummaryStatistics(featureLayer, statisticFilter, tableName, groupByField, whereClause, ungeocodedSummaryTable):

    table = publishGDB + "/UnSorted" + tableName
    arcpy.Copy_management(publishGDB + "/" + tableName, table)


    #table = publishGDB + "/" + tableName  #WorldwideGumCountByCity"

    gumCountOutField = "total_gum_count"
    observationsCountOutField = "total_observations"

     #Get Gum Count By City
    result = featureLayer.query(groupByFieldsForStatistics=groupByField, statisticFilter=statisticFilter,where=whereClause) #"city <> '(none)'"

    rows = arcpy.da.InsertCursor(table, [groupByField, "total_gum_count", "total_observations", "avg_gum_count"])
    for f in result.features:
        #row = rows.newRow()
        for key in f.asDictionary['attributes'] :
            #arcpy.AddMessage(key + ": " + str(f.asDictionary['attributes'][key]))
            if key == groupByField:
                if groupByField == "twitter":
                    group = "@" + f.asDictionary['attributes'][key]
                else:
                    group = f.asDictionary['attributes'][key]
            if key == gumCountOutField:
                gumCount = f.asDictionary['attributes'][key]
            if key == observationsCountOutField:
                obsCount = f.asDictionary['attributes'][key]

            #row.setValue(key,f.asDictionary['attributes'][key])

        rows.insertRow([group, gumCount, obsCount, gumCount / obsCount])
        #row.setValue("avg_gum_count", gumCount / obsCount)
        #rows.insertRow(row)

    if ungeocodedSummaryTable is not None:

        with arcpy.da.SearchCursor(ungeocodedSummaryTable, ['*']) as cursor:
            for row1 in cursor:
                print(row1)
                city = row1[1]
                gumCount = row1[3]
                obsCount = row1[2]

                #row = rows.newRow()
                #row.setValue("city", city)
                #row.setValue("total_gum_count", gumCount)
                #row.setValue("total_observations", obsCount)
                #row.setValue("avg_gum_count", round(gumCount / obsCount, 0))

                rows.insertRow([city, gumCount, obsCount, round(gumCount / obsCount, 0)])
                #rows.insertRow(row)

    del rows

    sort_fields = [["total_gum_count", "DESCENDING"]]


    sortTable = publishGDB + "/" + tableName
    arcpy.Sort_management(table, sortTable, sort_fields)

    arcpy.Delete_management(table)

    return sortTable
    #insert inmem table of ungeocoded
    #del row #row1


def updateCurrentGumCount(inRow, currentCount, currentObs):

    import datetime

    table = backupPublishGDB + "/UnsortedWorldwideGumCountByDate"

    rows = arcpy.InsertCursor(table)

    row = rows.newRow()
    row.setValue("GUM_COUNT_DATE", datetime.datetime.now())
    row.setValue("GUM_COUNT", currentCount)
    row.setValue("GUM_OBS", currentObs)

    newGumCount = currentCount - inRow[2]
    newGumObs = currentObs - inRow[3]

    row.setValue("NEW_GUM_COUNT", newGumCount)
    row.setValue("NEW_OBS_COUNT", newGumObs)

    rows.insertRow(row)


    del row

def connectToAGOL():

    global token, config

    with open('config.json') as json_data:
        config = json.load(json_data)

    token = securityhandlerhelper.securityhandlerhelper(config)

    arcpy.AddMessage("Connected to AGOL")

def copyBackupGDBtoStaging():
    arcpy.Copy_management(backupStagingGDB, stagingGDB)

def prepPublishGDB():

    arcpy.Copy_management(backupPublishGDB, publishGDB)

    tableName = "/GumCountByCity"
    inTable = stagingGDB + tableName
    outTable = publishGDB + tableName

    arcpy.Copy_management(inTable, outTable)

    tableName = "/GumCountByCategory"
    inTable = stagingGDB + tableName
    outTable = publishGDB + tableName

    arcpy.Copy_management(inTable, outTable)

    return publishGDB
    #return zipGDB(publishGDB)

def clearStagingDirectory():
    # Check for existence of data before deleting
    if arcpy.Exists(stagingGDB):
        arcpy.Delete_management(stagingGDB)

    if arcpy.Exists(publishGDB):
        arcpy.Delete_management(publishGDB)

    # clean up other files like zip files
    files = glob.glob(rootDir + '/Staging/Publish/*.zip')
    for f in files:
        os.remove(f)

    files = glob.glob(rootDir + '/Staging/json/*.json')
    for f in files:
        os.remove(f)

    # files = glob.glob(outJsonDir + '*.json')
    # for f in files:
    #     os.remove(f)

def getTotalGumCount():
    global token
    gumCountOutField = "total_gum_count"
    observationsCountOutField = "total_observations"
    fl = FeatureLayer(url = url, securityHandler=token.securityhandler,initialize=True)
    statisticFilter = StatisticFilter()

    statisticFilter.add(statisticType="count", onStatisticField="gum_count", outStatisticFieldName=observationsCountOutField)
    statisticFilter.add(statisticType="sum", onStatisticField="gum_count", outStatisticFieldName=gumCountOutField)
    result = fl.query(statisticFilter=statisticFilter) #groupByFieldsForStatistics="city",

    # with open('D:/Data/Gum/Staging/0_TotalGum.json', 'w') as fp:
    #     json.dump(result.value, fp)

    #Get Total Gum Count
    #cursor = arcpy.UpdateCursor(table_GumSummaryByCity,"City = 'Total'")
    rows = arcpy.InsertCursor(table_GumSummaryByCity)
    for f in result.features:
        row = rows.newRow()
        row.setValue("city", "Total")
        for key in f.asDictionary['attributes'] :
            arcpy.AddMessage(key + ": " + str(f.asDictionary['attributes'][key]))

            if key == gumCountOutField:
                gumCount = f.asDictionary['attributes'][key]
            if key == observationsCountOutField:
                obsCount = f.asDictionary['attributes'][key]

            row.setValue(key, f.asDictionary['attributes'][key])

        row.setValue("avg_gum_count", gumCount / obsCount)
        rows.insertRow(row)


    del row

    #Get Gum Count By City
    result = fl.query(groupByFieldsForStatistics="city", statisticFilter=statisticFilter)

    # with open('D:/Data/Gum/Staging/1_GumByCity.json', 'w') as fp:
    #     json.dump(result.value, fp)

    #rows = arcpy.InsertCursor(table_GumSummaryByCity)
    for f in result.features:
        row = rows.newRow()
        for key in f.asDictionary['attributes'] :
            #arcpy.AddMessage(key + ": " + str(f.asDictionary['attributes'][key]))
            if key == gumCountOutField:
                gumCount = f.asDictionary['attributes'][key]
            if key == observationsCountOutField:
                obsCount = f.asDictionary['attributes'][key]

            row.setValue(key,f.asDictionary['attributes'][key])

        row.setValue("avg_gum_count", gumCount / obsCount)
        rows.insertRow(row)
    del row

    #result = fl.query(groupByFieldsForStatistics="city",statisticFilter=[{"statisticType": "sum","onStatisticField": "gum_count","outStatisticFieldName": "Total Gum Count"}])
    #arcpy.AddMessage(result)
def retrieveObservationsForCity():

    #connectToAGOL()
    #setupEnvironment()

    fc = "Boundary"
    global token

    geometry = None

    for row in arcpy.da.SearchCursor(fc, ["OID@", "SHAPE@"]):
        # Print the current multipoint's ID
        print("Feature {}:".format(row[0]))
        geometry = row[1]

    print(geometry)

    geomFilter = GeometryFilter(geomObject=geometry)

    fl = FeatureLayer(url = url, securityHandler=token.securityhandler,initialize=True)
    result = fl.query(out_fields='*',returnGeometry=True,geometryFilter=geomFilter)

    return result.features

def getCountryName(FID):
    fc = stagingGDB + "/country"

    cursor = arcpy.SearchCursor(fc, "OBJECTID = " + str(FID))
    row = cursor.next()
    while row:
        countryName = row.getValue("CNTRY_NAME")
        row = cursor.next()

    return countryName

def processUnGeocodedObservations():
    global token

    fsToken = token.securityhandler._token
    where = "city = '(none)' AND OBJECTID <> 307"
    fields = "*"

    query = "/query?where={}&outFields={}&returnGeometry=true&outSR=4326&f=json&token={}".format(where, fields, fsToken)

    fsUrl = url + query
    fs = arcpy.FeatureSet()
    fs.load(fsUrl)

    featureLength = 0
    data = json.loads(fs.JSON)
    if "features" in data:
        featureLength = data["features"].__len__()

    if featureLength == 0:
        return None

    countryFC = stagingGDB + "/country"
    #joinFC = stagingGDB +"/ObservationsSpatialJoinCountry"
    joinFC = "in_memory/ObservationsSpatialJoinCountry"

    arcpy.AddMessage("Doing spatial join with countries on " + str(featureLength) + " features")
    arcpy.SpatialJoin_analysis(fs, countryFC, joinFC,"#", "#")

    arcpy.MakeFeatureLayer_management(joinFC, "joinlayer")
    arcpy.SelectLayerByAttribute_management("joinlayer","NEW_SELECTION", "CNTRY_NAME IS NULL")

    result = arcpy.GetCount_management("joinlayer")
    count = int(result.getOutput(0))

    if count > 0:

        arcpy.AddMessage("Doing Near analysis with countries on " + str(count) + " features")
        #arcpy.CopyFeatures_management(countryFC, "in_memory/dude")
        arcpy.Near_analysis("joinlayer", countryFC,"2000 Kilometers", "NO_LOCATION", "NO_ANGLE", "PLANAR")

        arcpy.SelectLayerByAttribute_management("joinlayer", "CLEAR_SELECTION")

        cursor = arcpy.UpdateCursor("joinlayer", "CNTRY_NAME IS NULL")
        for row in cursor:
            print(row)
            countryName = getCountryName(row.getValue("NEAR_FID"))
            row.setValue("CNTRY_NAME", countryName)
            cursor.updateRow(row)
    else:
        arcpy.SelectLayerByAttribute_management("joinlayer", "CLEAR_SELECTION")


    statsTable = stagingGDB + "/UnGeocodedObservationsSummary"
    #statsTable = "in_memory/UnGeocodedObservationsSummary"
    arcpy.analysis.Statistics("joinlayer", statsTable, "gum_count SUM", "CNTRY_NAME")

    return statsTable

    #arcpy.CopyFeatures_management("joinlayer", stagingGDB +"/ObservationsSpatialJoinCountry")


    #arcpy.SpatialJoin_analysis(fs, countryFC, joinFC, "JOIN_ONE_TO_ONE", "KEEP_ALL", r'date "date" true true false 8 Date 0 0,First,#,gumAuthenticated\gum_droppings,date,-1,-1;camera "camera" true true false 50 Text 0 0,First,#,gumAuthenticated\gum_droppings,camera,0,50;direction "direction" true true false 0 Double 0 0,First,#,gumAuthenticated\gum_droppings,direction,-1,-1;gum_count "gum_count" true true false 0 Short 0 0,First,#,gumAuthenticated\gum_droppings,gum_count,-1,-1;twitter "twitter" true true false 50 Text 0 0,First,#,gumAuthenticated\gum_droppings,twitter,0,50;city "city" true true false 256 Text 0 0,First,#,gumAuthenticated\gum_droppings,city,0,256;NAME "NAME" true true false 50 Text 0 0,First,#,country,NAME,0,50;LONG_NAME "LONG_NAME" true true false 60 Text 0 0,First,#,country,LONG_NAME,0,60;CAPITAL "CAPITAL" true true false 25 Text 0 0,First,#,country,CAPITAL,0,25;CONTINENT "CONTINENT" true true false 15 Text 0 0,First,#,country,CONTINENT,0,15', "INTERSECT", None, None)

    #arcpy.analysis.Near("c0_SpatialJoin1", "country", "2000 Kilometers", "NO_LOCATION", "NO_ANGLE", "PLANAR")
    #arcpy.analysis.Near("c0_SpatialJoin1", "country", "1000 Kilometers", "NO_LOCATION", "NO_ANGLE", "PLANAR")


    #arcpy.management.SelectLayerByAttribute("c0_SpatialJoin1", "NEW_SELECTION", "NAME IS NULL", None)

def retrieveObservations():

    #token = securityhandlerhelper.securityhandlerhelper(config)
    global token
    #admin = arcrest.manageorg.Administration(securityHandler=token.securityhandler)
    #content = admin.content
    #userInfo = content.users.user()
    #userInfo.folders


    #arcpy.AddMessage(userInfo.folders)

    fl = FeatureLayer(url = url, securityHandler=token.securityhandler,initialize=True)
    result = fl.query(where="city = '(none)'",out_fields='*',returnGeometry=True)
    fl.query()
    #print(result.features)
    #print (fl.query(where="1=1",out_fields='*',returnGeometry=False) )
    return result.features

def iterateGumCount(features):

    #d = Feature
    #d = features[0] as Feature
    layer = "sites_lyr"
    #arcpy.env.workspace = "D:/Data/Gum/TorontoGum.gdb"
    arcpy.MakeFeatureLayer_management("Sites", layer)
    siteID = -1

    fc = "D:/Data/Gum/Staging/TorontoGum.gdb/Sites"
    fields = ['GUM_COUNT_ACTUAL']

    #arcpy.CopyFeatures_management(layer, 'in_memory\dude')

    for f in features:

        gumCount = f.get_value('gum_count')
        OID = str(f.get_value('OBJECTID'))
        #print(f.get_value('gum_count'))
        pt = f.geometry.centroid
        #arcpyPt = pt.asArcpyObject
        print(pt.X)

        arcpyPt = arcpy.Point(pt.X, pt.Y)
        spatial_reference = arcpy.SpatialReference(102100)
        ptGeometry = arcpy.PointGeometry(arcpyPt, spatial_reference)

        #if f.get_value('OBJECTID') == 109:
        siteID = findNearestFeature(ptGeometry, layer, OID)
        arcpy.AddMessage("closest feature ID: " + str(siteID))
        where = "SITE_ID = " + str(siteID)

        if siteID > -1:
            # Create update cursor for feature class
            with arcpy.da.UpdateCursor(fc, fields, where) as cursor:
                # For each row, evaluate the WELL_YIELD value (index position
                # of 0), and update WELL_CLASS (index position of 1)
                for row in cursor:
                    row[0] = row[0] + gumCount
                    cursor.updateRow(row)
                    #print(row)

            #arcpy.SelectLayerByLocation_management()
            #print(f.geometry.type)
            #print(f.asDictionary['attributes']['gum_count'])

    #print(d.attributes['gum_count'])

def findNearestFeature(geometry, layer, OID):


    dude = arcpy.SelectLayerByLocation_management(layer,"within_a_distance",geometry,20)

    matchcount = int(arcpy.GetCount_management(layer)[0])
    inMemLayer = "in_memory\site" + OID
    if matchcount == 0:
        print('no features matched spatial and attribute criteria')
        return -1
    else:
        arcpy.CopyFeatures_management(layer, inMemLayer)


    minSiteID = -1
    mindist = 1000
    with arcpy.da.SearchCursor(inMemLayer, ['*']) as cursor: #, ['CONAME', 'SHAPE@']
        for row in cursor:
            print(row)
            x, y = row[1]
            arcpyPt = arcpy.Point(x,y)
            spatial_reference = arcpy.SpatialReference(102100)
            newgeometry = arcpy.PointGeometry(arcpyPt, spatial_reference)

            #newgeometry = row[1]
            tmpdist = geometry.distanceTo(newgeometry)

            if tmpdist < mindist:
                mindist = tmpdist
                minSiteID = row[6] #42

        print mindist

    return minSiteID

def summarizeGumByCategory():

    layer = "in_memory\gumcount_0plus"
    #table = "GumCountByCategory"
    table = "in_memory/CityGumCountByCategory"
    #table = publishGDB + "/CityGumCountByCategory"
    #arcpy.Delete_management(layer)


    arcpy.MakeFeatureLayer_management("Sites", "lyr")
    arcpy.SelectLayerByAttribute_management("lyr", "NEW_SELECTION", "GUM_COUNT_ACTUAL > 0")
    arcpy.CopyFeatures_management("lyr", layer)

    #arcpy.Statistics_analysis(layer, "GumCountByCategory", "GUM_COUNT_ACTUAL SUM", "SIC_NAME")
    arcpy.Statistics_analysis(layer, table, "GUM_COUNT_ACTUAL SUM", "SIC_NAME")
    arcpy.AddField_management(table,"AVG_GUM_COUNT", "SHORT")

    fields = ['SIC_NAME','FREQUENCY','SUM_GUM_COUNT_ACTUAL', 'AVG_GUM_COUNT']

    with arcpy.da.UpdateCursor(table, fields) as cursor:
        for row in cursor:
            print(row)
            if row[0] == None:
                row[0] = "ADDRESS POINT"
            row[3] = round( row[2] / row[1])
            cursor.updateRow(row)

    sort_fields = [["SUM_GUM_COUNT_ACTUAL", "DESCENDING"]]


    sortTable = publishGDB + "/CityGumCountByCategory"
    arcpy.Sort_management(table, sortTable, sort_fields)

def performGumPredictionForAddressPoints():

    table = publishGDB + "/CityGumCountByCategory"
    fc = "Sites"
    field = 'GUM_COUNT_PREDICTED'
    gumCount = 0

    #Query GumByCategory table for the average gum count per observation at address points
    cursor = arcpy.SearchCursor(table, "SIC_NAME = 'ADDRESS POINT'")
    row = cursor.next()
    while row:
        gumCount = row.getValue('AVG_GUM_COUNT')
        #print(row.getValue('AVG_GUM_COUNT'))
        row = cursor.next()

    del row, cursor

    arcpy.Delete_management("lyr")
    arcpy.MakeFeatureLayer_management(fc, "lyr")

    arcpy.SelectLayerByAttribute_management("lyr", "CLEAR_SELECTION")
    arcpy.SelectLayerByAttribute_management("lyr", "NEW_SELECTION", "Type = 0 And GUM_COUNT_ACTUAL = 0")

    arcpy.CalculateField_management("lyr",field, gumCount )


def performGumPredictionForAddressPointsOLD():
    table = "GumCountByCategory"
    fc = "Sites"
    fields = ['GUM_COUNT_PREDICTED']
    gumCount = 0

    #First, let's take care of Address points that didn't get any actual gum counts

    #Query GumByCategory table for the average gum count per observation at address points
    cursor = arcpy.SearchCursor(table, "SIC_NAME = 'ADDRESS POINT'")
    row = cursor.next()
    while row:
        gumCount = row.getValue('AVG_GUM_COUNT')
        #print(row.getValue('AVG_GUM_COUNT'))
        row = cursor.next()

    del row, cursor

    #Update all address point whose actual gum count is 0 after going thru iterateGumCount()
    with arcpy.da.UpdateCursor(fc, fields, "Type = 0 And GUM_COUNT_ACTUAL = 0") as cursor:
        # For each row, evaluate the WELL_YIELD value (index position
        # of 0), and update WELL_CLASS (index position of 1)
        for row in cursor:
            row[0] = gumCount
            cursor.updateRow(row)

    del row, cursor

def performGumPredictionForCategories():

    #Now let's take care of Business who didn't get any actual gum counts

    table = publishGDB + "/CityGumCountByCategory"
    # fc = "Sites"
    # fields = ['GUM_COUNT_PREDICTED']
    # gumCount = 0

    # Iterate through GumByCategory table and get average gum count per category
    # The update predicted gumcount values in Sites by category
    cursor = arcpy.SearchCursor(table, "SIC_NAME <> 'ADDRESS POINT'")
    row = cursor.next()
    while row:
        category = row.getValue('SIC_NAME')
        gumCount = row.getValue('AVG_GUM_COUNT')
        addPredictedGumCountToBusiness(category, gumCount)
        #print(row.getValue('AVG_GUM_COUNT'))
        row = cursor.next()

def addPredictedGumCountToBusiness(category, gumCount):
    fc = "Sites"
    field = 'GUM_COUNT_PREDICTED'
    category = category.replace("'", "''")
    where = "Type <> 0 And GUM_COUNT_ACTUAL = 0 And SIC_NAME = '" + category + "'"
    arcpy.AddMessage(where)
    arcpy.Delete_management("lyr")
    arcpy.MakeFeatureLayer_management(fc, "lyr")

    arcpy.SelectLayerByAttribute_management("lyr", "CLEAR_SELECTION")
    arcpy.SelectLayerByAttribute_management("lyr", "NEW_SELECTION",where)

    arcpy.CalculateField_management("lyr",field, gumCount)

def createNeighbourhoodJSONfiles(makeCompactJson):
    neighbourhoods = "Neighbourhoods"
    sites = "Sites"

    if makeCompactJson:
        files = glob.glob(outJsonDir + '*.json')
        for f in files:
            os.remove(f)

    arcpy.env.outputCoordinateSystem = arcpy.SpatialReference("WGS 1984")
    #arcpy.SelectLayerByAttribute_management("lyr", "NEW_SELECTION", "GUM_COUNT_ACTUAL > 0")

    arcpy.MakeFeatureLayer_management(neighbourhoods, "Neighbourhoods")
    arcpy.MakeFeatureLayer_management(sites, "Sites")

    #arcpy.management.SelectLayerByLocation("Sites", "INTERSECT", "Neighbourhoods", None, "NEW_SELECTION", "NOT_INVERT")

    with arcpy.da.SearchCursor(neighbourhoods, ["AREA_NAME"]) as cursor:
        for row in cursor:
            print(row)
            hood = row[0].replace("'", "''")
            arcpy.SelectLayerByAttribute_management("Neighbourhoods", "NEW_SELECTION", "AREA_NAME = '" + hood + "'")
            arcpy.SelectLayerByLocation_management("Sites", "INTERSECT", "Neighbourhoods", None, "NEW_SELECTION", "NOT_INVERT")

            hood = hood.replace("''", "'")
            hood = hood.replace("/", "-")
            arcpy.AddMessage(hood)

            jsonFile = jsonDir + hood + ".json"
            arcpy.FeaturesToJSON_conversion("Sites", jsonFile ,"NOT_FORMATTED")

            if makeCompactJson == True:
                compactJSON(jsonFile, hood)

    arcpy.SelectLayerByAttribute_management("Sites", "CLEAR_SELECTION")

def zipGDB(gdbPath):

    import zipfile, os

    zippedGDB = gdbPath[:-4]+".zip"

    zipf = zipfile.ZipFile(zippedGDB,'w',zipfile.ZIP_DEFLATED)

    gdbBasename = os.path.basename(gdbPath)
    for dirpath, dirnames, filenames in os.walk(gdbPath):
        for filename in filenames:
            if filename[-5:].lower() != ".lock": # Ignore lock files...
                zipName = os.path.join(gdbBasename,dirpath[len(gdbPath):],filename)
                zipf.write(os.path.join(dirpath,filename),zipName)
    zipf.close()

    return zippedGDB
def testUpload():
    token = securityhandlerhelper.securityhandlerhelper(config)

#def uploadToOnline(fileGDB,username,password,orgUrl,title,description,tags,itemId=None, tokenExpiration=30):
def uploadToOnline(fileGDB, itemId=None, tokenExpiration=30):
    global token

    fsToken = token.securityhandler._token

    arcpy.AddMessage("=== Starting Upload of File Geodatabase ===")
    arcpy.AddMessage(fsToken)
    # Override the default token expiration to accommodate large files / slow connections
    # (sometimes the ArcREST default of 5 minutes is not enough)
    arcrest.security._defaultTokenExpiration = tokenExpiration

    #loginHandler = arcrest.security.AGOLTokenSecurityHandler(username,password,orgUrl)
    #org = arcrest.manageorg.Administration(orgUrl,loginHandler,None,None,False)
    org = arcrest.manageorg.Administration(securityHandler=token.securityhandler)


    arcpy.AddMessage("Creating zipped copy of %s" % fileGDB)
    zippedGDB = zipGDB(fileGDB)

    content = org.content
    user = content.users.user()



    if itemId is None:

        arcpy.AddMessage("Adding file geodatabase as an item to ArcGIS Online organization...")

        itemParams = arcrest.manageorg.ItemParameter()
        itemParams.title = title
        itemParams.type = "File Geodatabase"
        itemParams.overwrite = False

        if description is not None:
            itemParams.description = description

        if tags is not None:
            itemParams.tags = ", ".join(tags) if type(tags) is list else tags

        itemParams.filename = os.path.basename(zippedGDB)
        addedItem = user.addItem(
            itemParameters=itemParams,
            overwrite=False,
            relationshipType=None,
            originItemId=None,
            destinationItemId=None,
            serviceProxyParams=None,
            metadata=None,
            filePath=zippedGDB,
            multipart=False
        )

        arcpy.AddMessage("File Geodatabase added with item ID: %s" % addedItem.id)

        return addedItem.id

    else:

        arcpy.AddMessage("Updating file geodatabase for item id %s in ArcGIS Online organization..." % itemId)

        item = content.getItem(itemId)


        itemParams = arcrest.manageorg.ItemParameter()
        itemParams.title = itemTitle
        itemParams.tags = itemTitle
        itemParams.overwrite = True
        itemParams.type = "File Geodatabase"

        # if title is not None and title != "":
        #     itemParams.title = title
        #
        # if description is not None:
        #     itemParams.description = description
        #
        # if tags is not None:
        #     itemParams.tags = ", ".join(tags) if type(tags) is list else tags


        item.userItem.updateItem(
            itemParameters=itemParams,
            data=zippedGDB
        )


        #ppFGDB = arcrest.manageorg.PublishFGDBParameter(name="GB",layerInfo={"capabilities": "Query"},overwrite=True,maxRecordCount=500)
        parameters = readPublishParametersJSON()
        #parameters = requestPublishParametersJSON(org, item)

        query_dict = {
            'itemID': item.id,
            'filetype': 'fileGeodatabase',
            'f': 'json',
            'token': fsToken,
            'overWrite': True,
            'publishParameters':json.dumps(parameters)}

        #ppFGDB = arcrest.manageorg.PublishFGDBParameter()
        #user.publishItem(itemId=item.id,fileType="fileGeodatabase",publishParameters=ppFGDB)
        publishURL = org._url + "/content/users/" + user.username + "/publish"
        #publishURL = "http://esrica-tsg.maps.arcgis.com/sharing/rest/content/users/menglish_esrica_tsg/publish"
        request = requests.post(publishURL, data=query_dict)

        arcpy.AddMessage(request.json())

        jobId = str(request.json()['services'][0]['jobId'])
        statusUrl = org._url + "/content/users/" + user.username + "/items/" + item.id + "/status?jobId=" + jobId + "&f=json&token=" + fsToken

        arcpy.AddMessage("File Geodatabase Updated: %s" % item.id)
        arcpy.AddMessage(statusUrl)

        #http://esrica-tsg.maps.arcgis.com/sharing/rest/content/users/menglish_esrica_tsg/0853aff172aa4739bd73d6cadd6d8e43/items/f14987b3b33d44279486c76f0f4f9701/status?jobid=fd841489-a287-45e7-bf2b-bae9b7ead8f7&f=json&token=ZA8jTozAMUYNwLWgbHYhQfT2Ogs-b-Ka0tkKiTZZ0xKj6XPbMKx5fGwOVDbwpgOYh9vHA5kY1B4sDAwqQTB2iXha-XwSaJTlvZ4j_i-dmIKJNvOzdrxGxsJRwefM9b2sKCTtHmlpWgxNw4RwVC1PZ4V9uu2K2d8B2ffdWZi55U357d6ghD6BWhD6_ncXQ0ij


        return item.id

def exportGDBtoJSON():
    arcpy.env.workspace = "D:/Data/Gum/Staging"

    arcpy.FeaturesToJSON_conversion(os.path.join("TorontoGum.gdb","Sites"),"mypjsonfeatures.json","NOT_FORMATTED")

def calculateGumCountOnNearFeatures():
    obs = "Observations"
    sites = "Sites"


    fields = ['GUM_COUNT_ACTUAL']

    #Iterate thru Observations
    with arcpy.da.SearchCursor(obs, ['*']) as cursor: #, ['CONAME', 'SHAPE@']
        for row in cursor:
            print(row)
            NEAR_FID = row[8]
            gumCount = row[5]
            where = "OBJECTID = " + str(NEAR_FID) #SITE_ID

            # Create update cursor for feature class
            with arcpy.da.UpdateCursor(sites, fields, where) as cursor:

                for row in cursor:
                    row[0] = row[0] + gumCount
                    cursor.updateRow(row)

def copyObservationsToLocalGDB():

    global token


    # fl = FeatureLayer(url = url, securityHandler=token.securityhandler,initialize=True)
    # result = fl.query(returnGeometry=False)
    # fs = arcpy.FeatureSet()
    # fs.load(result.value)

    fsToken = token.securityhandler._token
    where = "city = 'Toronto, CAN'" #"1=1"
    fields = "*"

    query = "/query?where={}&outFields={}&returnGeometry=true&outSR=4326&f=json&token={}".format(where, fields, fsToken)

    fsUrl = url + query
    fs = arcpy.FeatureSet()
    fs.load(fsUrl)

    #arcpy.CopyFeatures_management(fs, stagingGDB + "/Observations" )
    arcpy.CopyFeatures_management(fs, "Observations")
    arcpy.Near_analysis(in_features="Observations",near_features="Sites")

def readPublishParametersJSON():
    with open(rootDir +  'BAK/PublishParameters.json') as json_data:
        d = json.load(json_data)
        return d
        #json_data.close()

def requestPublishParametersJSON(org, item):

    global token

    fsToken = token.securityhandler._token

    query_dict = {
            'itemID': item.id,
            'f': 'json',
            'token': fsToken}

    publishURL = org._url + "/content/features/analyze"

    request = requests.post(publishURL, data=query_dict)
    print(request)

    return request.json()#["publishParameters"]

def summarizeActualAndPredictedGumCountForCity():

    setupEnvironment()

    fc = "Sites"
    table = "CityGumCount"  #publishGDB = "/GumCountForCity"

    arcpy.Statistics_analysis(fc, table, [["GUM_COUNT_ACTUAL", "Sum"],["GUM_COUNT_PREDICTED", "Sum"]], None)

    outTable = publishGDB + "/" + table

    arcpy.Copy_management(table, outTable)


def geocodeAddresses(table):

    global config

    folder = rootDir + "BAK"
    conn_file_name = "arcgis_online_batch_geocoding.ags"
    conn_file = os.path.join(folder, conn_file_name)
    server_url = "https://geocode.arcgis.com/arcgis/services"
    username = config["username"]
    password = config["password"]

    #if not arcpy.Exists(stagingGDB):
    arcpy.mapping.CreateGISServerConnectionFile("USE_GIS_SERVICES", folder, conn_file_name, server_url,
                                            "ARCGIS_SERVER", username=username, password=password)


    #Perform batch geocoding
    address_locator = os.path.join(conn_file, "World.GeocodeServer")

    arcpy.GeocodeAddresses_geocoding(table, address_locator, "SingleLine city VISIBLE NONE", publishGDB + "/" + "GeocodedCityLeaderboard", "STATIC")

def copyBackupPublishGDBtoStaging():

    arcpy.Copy_management(backupPublishGDB, publishGDB)

    sort_fields = [["GUM_COUNT_DATE", "DESCENDING"]]


    table = publishGDB + "/UnsortedWorldwideGumCountByDate"
    sortTable = publishGDB + "/WorldwideGumCountByDate"

    arcpy.Sort_management(table, sortTable, sort_fields)

    arcpy.Delete_management(table)

def compactJSON(jsonFile, hood):

    from pprint import pprint
    with open(jsonFile) as data_file:
        data = json.load(data_file)

        obj = open(outJsonDir + hood + ".json", 'wb')
        obj.write("[")

        count = 0

        # ways to loop over "data"
        for item in data['features']:
            #pprint(item)
            suffix = "," if count < data['features'].__len__() - 1 else ""
            outJson = "[" + str(item["geometry"]["x"]) + "," + str(item["geometry"]["y"]) + ",\"" + str(item["attributes"]["SIC_NAME"]) + "\"," + str(item["attributes"]["Type"]) + "," + str(item["attributes"]["GUM_COUNT_ACTUAL"]) + "," + str(item["attributes"]["GUM_COUNT_PREDICTED"]) + "]" + suffix

            obj.write(outJson)
            count += 1
        obj.write("]")
        obj.close()




if __name__ == '__main__':


    # 1. setup GP environment
    # 2. Get token from AGOL
    # 3. getTotalGumCount() - query AGOL for observations, group by city and insert rows into GumCountByCity table
    #    Fields include total_gum_count, total_observations and avg_gum_count for each city
    # 4. retrieveObservations() => iterateGumCount() - Get all AGOL observations, find nearest Site in local gdb
    #    add to GUM_COUNT_ACTUAL field on the Site fclass with gum_count from AGOL's nearest feature
    # 5. summarizeGumByCategory() select all Sites with GUM_COUNT_ACTUAL > 0 then use GP to create a summary table
    #    called CumCountByCategory
    # 6. Iterate through GumByCategory table and get average gum count per category, select Sites fclass
    #    where = "Type = 1 And GUM_COUNT_ACTUAL = 0 And SIC_NAME = '" + category + "'"
    # 7. query GumCountByCategory table for 'ADDRES POINT' AVG_GUM_COUNT
    #    update Sites fclass using CalculateField GP on GUM_COUNT_PREDICTED field for records where  GUM_COUNT_ACTUAL = 0

    row = getLastTotalGumCount()
    lastGumCount = row[2]

    connectToAGOL()

    currentGumCount, currentObsCount, featureLayer, statisticFilter = getCurrentGumCount()

    if currentGumCount == lastGumCount:
        arcpy.AddMessage("No new gum observations since last run date. Engine set to idle.")
        #raise SystemExit
    else:
        arcpy.AddMessage(str(currentGumCount - lastGumCount) + " new gum observations: Engine starting to rev")
        updateCurrentGumCount(row, currentGumCount, currentObsCount)

    setupEnvironment()

    clearStagingDirectory()

    copyBackupGDBtoStaging()

    ungeocodedSummaryTable = processUnGeocodedObservations()

    copyBackupPublishGDBtoStaging()

    table = performSummaryStatistics(featureLayer, statisticFilter, "WorldwideGumCountByCity", "city", "city <> '(none)'", ungeocodedSummaryTable)

    geocodeAddresses(table)

    performSummaryStatistics(featureLayer, statisticFilter, "WorldwideGumCountByTwitter", "twitter", "twitter <> ''", None)

    copyObservationsToLocalGDB()

    calculateGumCountOnNearFeatures()

    summarizeGumByCategory()

    performGumPredictionForCategories()

    performGumPredictionForAddressPoints()

    createNeighbourhoodJSONfiles(True)

    summarizeActualAndPredictedGumCountForCity()

    uploadToOnline(publishGDB, itemId)


