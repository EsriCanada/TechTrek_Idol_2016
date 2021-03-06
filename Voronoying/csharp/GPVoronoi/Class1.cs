﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using System.Runtime.InteropServices;
using ESRI.ArcGIS.Geodatabase;
using ESRI.ArcGIS.Geometry;
using ESRI.ArcGIS.Geoprocessing;
using ESRI.ArcGIS.esriSystem;
using ESRI.ArcGIS.ADF.CATIDs;
using SharpBoostVoronoi;
using SharpBoostVoronoi.Output;

using VPoint = SharpBoostVoronoi.Input.Point;
using VSegment = SharpBoostVoronoi.Input.Segment;
using SharpBoostVoronoi.Exceptions;

namespace GPVoronoi
{

    public class VoronoiFromLinesFunction : IGPFunction2
    {
        public enum ArcConstructionMethods {  Straight, Approximate, Circular, Ellipse }

        const string FEATURE_SOURCE_FIELD_NAME = "feature_souce";
        const string FEATURE_ID_FIELD_NAME = "feature_id";
        
        //Local members
        private string m_ToolName = "VoronoiFromLines"; //Function Name
        private string m_metadatafile = "VoronoiFromLines.xml";
        private string m_DisplayName = "Voronoi From Lines";
        private IArray m_Parameters;             // Array of Parameters
        private IGPUtilities m_GPUtilities;      // GPUtilities object

        public VoronoiFromLinesFunction()
        {
            m_GPUtilities = new GPUtilitiesClass();
        }

        #region IGPFunction Members

        // Set the name of the function tool. 
        // This name appears when executing the tool at the command line or in scripting. 
        // This name should be unique to each toolbox and must not contain spaces.
        public string Name { get { return m_ToolName; } }

        // Set the function tool Display Name as seen in ArcToolbox.
        public string DisplayName { get { return m_DisplayName; } }

        // This is the location where the parameters to the Function Tool are defined. 
        // This property returns an IArray of parameter objects (IGPParameter). 
        // These objects define the characteristics of the input and output parameters. 
        public IArray ParameterInfo
        {
            get
            {
                //Array to the hold the parameters  
                IArray parameters = new ArrayClass();
                parameters.Add(CreateParameter(
                    new GPMultiValueTypeClass() { MemberDataType = new GPFeatureLayerTypeClass() },
                    new GPMultiValueClass() { MemberDataType = new GPFeatureLayerTypeClass() },
                    esriGPParameterDirection.esriGPParameterDirectionInput,
                    "Input Features",
                    "input_features",
                    esriGPParameterType.esriGPParameterTypeRequired));

                IGPParameterEdit3 outputParameter = (IGPParameterEdit3)CreateParameter(
                    new DEFeatureClassTypeClass(),
                    new DEFeatureClassClass(),
                    esriGPParameterDirection.esriGPParameterDirectionOutput,
                    "Output FeatureClass",
                    "out_featureclass",
                    esriGPParameterType.esriGPParameterTypeRequired);

                outputParameter.AddDependency("input_features");

                // Create a new schema object - schema means the structure or design of the feature class (field information, geometry information, extent)
                IGPFeatureSchema outSchema = new GPFeatureSchemaClass();
                outSchema.FieldsRule = esriGPSchemaFieldsType.esriGPSchemaFieldsNone;
                outSchema.FeatureType = esriFeatureType.esriFTSimple;
                outSchema.FeatureTypeRule =  esriGPSchemaFeatureType.esriGPSchemaFeatureAsSpecified;
                outSchema.GeometryType = esriGeometryType.esriGeometryPolygon;
                outSchema.ExtentRule = esriGPSchemaExtentType.esriGPSchemaExtentFirstDependency;

                IGPSchema schema = outSchema as IGPSchema;
                // Generate the default output path.
                schema.GenerateOutputCatalogPath = true;
                outputParameter.Schema = (IGPSchema)outSchema;
                                
                parameters.Add(outputParameter);

                IGPParameter curveTypeParameter = CreateParameter(
                    new GPStringTypeClass(),
                    new GPStringClass() { Value = ArcConstructionMethods.Circular.ToString() },
                    esriGPParameterDirection.esriGPParameterDirectionInput,
                    "Curve Type",
                    "curveType",
                    esriGPParameterType.esriGPParameterTypeOptional);
                IGPCodedValueDomain cvDomain = new GPCodedValueDomainClass();
                foreach(string v in Enum.GetNames(typeof(ArcConstructionMethods)))
                    cvDomain.AddStringCode(v,v);
                ((IGPParameterEdit)curveTypeParameter).Domain = (IGPDomain)cvDomain;
                parameters.Add(curveTypeParameter);

               // parameters.Add(CreateParameter(
               //    new GPLinearUnitTypeClass(),
               //    new GPLinearUnitClass() { Value = 1, Units = esriUnits.esriMeters },
               //    esriGPParameterDirection.esriGPParameterDirectionInput,
               //    "Snapping Tolerance",
               //    "tolerance",
               //    esriGPParameterType.esriGPParameterTypeOptional));
               //
               // parameters.Add(CreateParameter(
               //     new GPFieldMappingTypeClass(),
               //     new GPFieldMappingClass(),
               //     esriGPParameterDirection.esriGPParameterDirectionInput,
               //     "Field Map",
               //     "fieldMap",
               //     esriGPParameterType.esriGPParameterTypeOptional));

                return parameters;
            }
        }
        private IGPParameter CreateParameter(IGPDataType dataType, IGPValue value, esriGPParameterDirection direction, string displayName, string name, esriGPParameterType parameterType)
        {
            // Area field parameter
            IGPParameterEdit3 inputParameter = new GPParameterClass();
            inputParameter.DataType = dataType;
            inputParameter.Value = value;

            // Set field name parameter properties
            inputParameter.Direction = direction;
            inputParameter.DisplayName = displayName;
            inputParameter.Name = name;
            inputParameter.ParameterType = parameterType;

          
            return (IGPParameter)inputParameter;
        }
        

        // Validate: 
        // - Validate is an IGPFunction method, and we need to implement it in case there
        //   is legacy code that queries for the IGPFunction interface instead of the IGPFunction2 
        //   interface.  
        // - This Validate code is boilerplate - copy and insert into any IGPFunction2 code..
        // - This is the calling sequence that the gp framework now uses when it QI's for IGPFunction2..
        public IGPMessages Validate(IArray paramvalues, bool updateValues, IGPEnvironmentManager envMgr)
        {
            if (m_Parameters == null)
                m_Parameters = ParameterInfo;

            // Call UpdateParameters(). 
            // Only Call if updatevalues is true.
            if (updateValues == true)
            {
                UpdateParameters(paramvalues, envMgr);
            }

            // Call InternalValidate (Basic Validation). Are all the required parameters supplied?
            // Are the Values to the parameters the correct data type?
            IGPMessages validateMsgs = m_GPUtilities.InternalValidate(m_Parameters, paramvalues, updateValues, true, envMgr);

            // Call UpdateMessages();
            UpdateMessages(paramvalues, envMgr, validateMsgs);

            // Return the messages
            return validateMsgs;
        }

        // This method will update the output parameter value with the additional area field.
        public void UpdateParameters(IArray paramvalues, IGPEnvironmentManager pEnvMgr)
        {
            m_Parameters = paramvalues;

            IGPMultiValue inputValues = (IGPMultiValue)m_GPUtilities.UnpackGPValue(m_Parameters.get_Element(0));

            // Get the derived output feature class schema and empty the additional fields. This will ensure you don't get duplicate entries.
            IGPParameter3 derivedFeatures = (IGPParameter3)paramvalues.get_Element(1);
            IGPValue derivedValue = m_GPUtilities.UnpackGPValue(derivedFeatures);
            IGPFeatureSchema schema = (IGPFeatureSchema)derivedFeatures.Schema;
            schema.AdditionalFields = null;

            // If we have an input value, create a new field based on the field name the user entered.            
            if (!derivedValue.IsEmpty() && inputValues.Count > 0)
            {
                IFields inputFields = m_GPUtilities.GetFields(inputValues.get_Value(0));
                IField shapeField = null;
                for(int i = 0; i < inputFields.FieldCount; i++)
                {
                    if (inputFields.get_Field(i).Type == esriFieldType.esriFieldTypeGeometry)
                    {
                        shapeField = inputFields.get_Field(i);
                        break;
                    }
                }
                
                IFields fields = new FieldsClass();
                fields.AddField("ObjectID", esriFieldType.esriFieldTypeOID);
                fields.AddField(FEATURE_SOURCE_FIELD_NAME, esriFieldType.esriFieldTypeString);
                fields.AddField(FEATURE_ID_FIELD_NAME, esriFieldType.esriFieldTypeInteger);
                fields.AddField(shapeField);

                schema.AdditionalFields = fields;
            }
        }


        // Called after returning from the update parameters routine. 
        // You can examine the messages created from internal validation and change them if desired. 
        public void UpdateMessages(IArray paramvalues, IGPEnvironmentManager pEnvMgr, IGPMessages Messages)
        {
            try
            {
                IGPLinearUnit distVal = (IGPLinearUnit)m_GPUtilities.UnpackGPValue(paramvalues.get_Element(2));

                if (distVal.Value <= 0)
                {
                    Messages.ReplaceError(2, 2, "Zero or a negative distance is invalid when specifying a tolerance.");
                }
            }
            catch (Exception exx)
            {
            }
        }

        struct site_key
        {
            public short featureClassIndex;
            public int objectID;

            public bool isEmpty { get { return featureClassIndex < 0 && objectID <= 0; } }

            public site_key(short featureClassIndex, int objectID)
            {
                this.featureClassIndex = featureClassIndex;
                this.objectID = objectID;
            }
        }
        class layer
        {
            public IFeatureClass featureclass;
            public IQueryFilter qFilter;
        }

        // Execute: Execute the function given the array of the parameters
        public void Execute(IArray paramvalues, ITrackCancel trackcancel, IGPEnvironmentManager envMgr, IGPMessages message)
        {
            IFeatureClass outputFeatureClass = null;
            try
            {
                // get the input feature class
                IGPMultiValue inputFeatureClasses_Parameter = (IGPMultiValue)m_GPUtilities.UnpackGPValue(paramvalues.get_Element(0));
                layer[] input_featureClasses = new layer[inputFeatureClasses_Parameter.Count];
                for (int i = 0; i < inputFeatureClasses_Parameter.Count; i++)
                {
                    IGPValue inputFeatureClass_Parameter = inputFeatureClasses_Parameter.get_Value(i);

                    IFeatureClass inputFeatureClass;
                    IQueryFilter inputQF;

                    m_GPUtilities.DecodeFeatureLayer(inputFeatureClass_Parameter, out inputFeatureClass, out inputQF);

                    input_featureClasses[i] = new layer() { featureclass = inputFeatureClass, qFilter = inputQF};
                }
                

                if (input_featureClasses.Length == 0 || input_featureClasses.Any(w=> w.featureclass == null))
                {
                    message.AddError(2, "Could not open one or more input dataset.");
                    return;
                }

                //IFields additionalFields = new FieldsClass();
                //additionalFields.AddField(FEATURE_SOURCE_FIELD_NAME, esriFieldType.esriFieldTypeString);
                //additionalFields.AddField(FEATURE_ID_FIELD_NAME, esriFieldType.esriFieldTypeInteger);
                //additionalFields.AddField(
                //    input_featureClasses[0].featureclass.Fields.get_Field(
                //    input_featureClasses[0].featureclass.Fields.FindField(
                //    input_featureClasses[0].featureclass.ShapeFieldName)));

                // create the output feature class
                IGPValue outputFeatureClass_Parameter = m_GPUtilities.UnpackGPValue(paramvalues.get_Element(1));
                outputFeatureClass = GPHelperFunctions.CreateFeatureClass(outputFeatureClass_Parameter, envMgr);

                if (outputFeatureClass == null)
                {
                    message.AddError(2, "Could not create output dataset.");
                    return;
                }
                


                IGPString curveTypeParameter = (IGPString)m_GPUtilities.UnpackGPValue(paramvalues.get_Element(2));
                ArcConstructionMethods method; 
                if (!Enum.TryParse<ArcConstructionMethods>(curveTypeParameter.Value, true, out method))
                {
                    message.AddError(2, string.Format("The value {0} is not expected.  Expected values are: {1}.", 
                        curveTypeParameter.Value, 
                        string.Join(",", Enum.GetNames(typeof(ArcConstructionMethods)))));
                    return;
                }

                IStepProgressor stepPro = (IStepProgressor)trackcancel;
                GPHelperFunctions.dropSpatialIndex(outputFeatureClass);

                BoostVoronoi bv = new BoostVoronoi(100);

                double minX = int.MaxValue, minY = int.MaxValue, maxX = int.MinValue, maxY = int.MinValue;
                List<site_key> point_sites = new List<site_key>();
                List<site_key> segment_sites = new List<site_key>();

                for (short i = 0; i < input_featureClasses.Length; i++)
                {
                    layer l = input_featureClasses[i];
                    int featcount = l.featureclass.FeatureCount(l.qFilter);

                    stepPro.MinRange = 0;
                    stepPro.MaxRange = featcount;
                    stepPro.StepValue = (1);
                    stepPro.Message = "Reading features";
                    stepPro.Position = 0;
                    stepPro.Show();

                    IFeatureCursor cursor = null;
                    IFeature row = null;

                    try
                    {
                        cursor = l.featureclass.Search(l.qFilter, false);
                        while ((row = cursor.NextFeature()) != null)
                        {
                            stepPro.Step();
                            IPoint point = row.Shape as IPoint;
                            if (point != null)
                            {
                                double X = point.X;
                                double Y = point.Y;

                                minX = Math.Min(minX, X);
                                maxX = Math.Max(maxX, X);

                                minY = Math.Min(minY, Y);
                                maxY = Math.Max(maxY, Y);

                                bv.AddPoint(point.X, point.Y);
                                point_sites.Add(new site_key(i, row.OID));
                            }

                            IMultipoint multipoint = row.Shape as IMultipoint;
                            if (multipoint != null)
                            {
                                IPointCollection pointCollection = (IPointCollection)multipoint;
                                IEnumVertex vertices = pointCollection.EnumVertices;
                                
                                IPoint vertex = null; int part, index;
                                vertices.Next(out vertex, out part, out index);

                                minX = Math.Min(minX, multipoint.Envelope.XMin);
                                maxX = Math.Max(maxX, multipoint.Envelope.XMax);

                                minY = Math.Min(minY, multipoint.Envelope.YMin);
                                maxY = Math.Max(maxY, multipoint.Envelope.YMax);

                                while (vertex != null)
                                {
                                    bv.AddPoint(vertex.X, vertex.Y);
                                    point_sites.Add(new site_key(i, row.OID));

                                    vertices.Next(out vertex, out part, out index);
                                }
                            }

                            IPolyline polyline = row.Shape as IPolyline;
                            if (polyline != null)
                            {
                                double fromX = polyline.FromPoint.X;
                                double fromY = polyline.FromPoint.Y;
                                double toX = polyline.ToPoint.X;
                                double toY = polyline.ToPoint.Y;

                                if (toX < fromX)
                                {
                                    minX = Math.Min(minX, toX);
                                    maxX = Math.Max(maxX, fromX);
                                }
                                else
                                {
                                    minX = Math.Min(minX, fromX);
                                    maxX = Math.Max(maxX, toX);
                                }

                                if (toY < fromY)
                                {
                                    minY = Math.Min(minY, toY);
                                    maxY = Math.Max(maxY, fromY);
                                }
                                else
                                {
                                    minY = Math.Min(minY, fromY);
                                    maxY = Math.Max(maxY, toY);
                                }

                                bv.AddSegment(
                                    polyline.FromPoint.X, polyline.FromPoint.Y,
                                    polyline.ToPoint.X, polyline.ToPoint.Y
                                );


                                segment_sites.Add(new site_key(i, row.OID));
                            }

                            Marshal.ReleaseComObject(row);
                        }
                    }
                    finally
                    {
                        if (row != null) Marshal.ReleaseComObject(row);
                        if (cursor != null) Marshal.ReleaseComObject(cursor);

                        stepPro.Hide();
                    }
                }

                message.AddMessage(String.Format("{0}, {1} -> {2}, {3}", minX, minY, maxX, maxY));

                int width = Math.Max((int)((maxX - minX) * 0.1), 1);
                int height = Math.Max((int)((maxY - minY) * 0.1), 1);

                maxX = maxX + width;
                minX = minX - width;
                maxY = maxY + height;
                minY = minY - height;

                message.AddMessage(String.Format("{0}, {1} -> {2}, {3}", minX, minY, maxX, maxY));
                bv.AddSegment(minX, minY, maxX, minY);
                segment_sites.Add(new site_key(-1, -1));
                bv.AddSegment(maxX, minY, maxX, maxY);
                segment_sites.Add(new site_key(-1, -1));
                bv.AddSegment(maxX, maxY, minX, maxY);
                segment_sites.Add(new site_key(-1, -1));
                bv.AddSegment(minX, maxY, minX, minY);
                segment_sites.Add(new site_key(-1, -1));

                stepPro.Message = "Solve Voronoi";
                stepPro.MaxRange = 0;
                stepPro.MaxRange = 0;
                stepPro.Show();

                bv.Construct();

                stepPro.Hide();

                int featureSourceIndx = outputFeatureClass.Fields.FindField(FEATURE_SOURCE_FIELD_NAME);
                int featureIDIndx = outputFeatureClass.Fields.FindField(FEATURE_ID_FIELD_NAME);

                IFeatureCursor inserts = null;
                IFeatureBuffer buffer = null;
                try
                {
                    object missing = Type.Missing;
                    ISpatialReference spatialReference = ((IGeoDataset)outputFeatureClass).SpatialReference;
                    inserts = outputFeatureClass.Insert(false);
                    buffer = outputFeatureClass.CreateFeatureBuffer();

                    List<Cell> cells = bv.Cells;
                    message.AddMessage(string.Format("{0} cells calculated", cells.Count));
                    List<Edge> edges = bv.Edges;
                    message.AddMessage(string.Format("{0} edges calculated", edges.Count));
                    List<Vertex> vertices = bv.Vertices;
                    message.AddMessage(string.Format("{0} vertexes calculated", vertices.Count));

                    stepPro.Message = "Write cells";
                    stepPro.MaxRange = 0;
                    stepPro.MaxRange = cells.Count;
                    stepPro.Show();


                    for (int cellIndex = 0; cellIndex < cells.Count; cellIndex++)
                    {
                        try
                        {
                            if(cellIndex % 5000 == 0) message.AddMessage(String.Format("{0}. {1} cells processed.", DateTime.Now, cellIndex));

                            Cell cell = cells[cellIndex];
                            int currentSite = cell.Site;
                            IGeometryCollection geometryCollection = new GeometryBagClass() { SpatialReference = spatialReference };

                            //ignores any sliver cells
                            if (cell.IsOpen || cell.EdgesIndex.Count < 3)
                                continue;

                            ISegmentCollection segmentCollection = createSegments(cell, bv, method, spatialReference);

                            if (((IArea)segmentCollection).Area <= 0)
                            {

                                message.AddMessage("A invalid geometry has been detected, try reversing the orientation.");
                                ISegmentCollection reversed_segmentCollection = new PolygonClass() { SpatialReference = spatialReference };
                                for (int i = segmentCollection.SegmentCount - 1; i >= 0; i--)
                                {
                                    ISegment segment = (ISegment)segmentCollection.get_Segment(i);
                                    segment.ReverseOrientation();
                                    reversed_segmentCollection.AddSegment(segment);
                                }
                                segmentCollection = reversed_segmentCollection;
                            }

                            ((IPolygon)segmentCollection).SpatialReference = spatialReference;
                            if (((IArea)segmentCollection).Area <= 0)
                            {
                                message.AddWarning("An empty shell has been created");

                                for (int i = 0; i < segmentCollection.SegmentCount; i++)
                                {
                                    ISegment segment = (ISegment)segmentCollection.get_Segment(i);
                                    message.AddMessage(String.Format("From {0}, {1} To {2},{3}",
                                    segment.FromPoint.X, segment.FromPoint.Y,
                                    segment.ToPoint.X, segment.ToPoint.Y));
                                }

                            }


                            //set attributes
                            site_key sk = (currentSite >= point_sites.Count) ? segment_sites[currentSite - point_sites.Count] : point_sites[currentSite];
                            if (!sk.isEmpty)
                            {
                                buffer.set_Value(featureSourceIndx, input_featureClasses[sk.featureClassIndex].featureclass.AliasName);
                                buffer.set_Value(featureIDIndx, sk.objectID);
                            }
                            else
                            {
                                buffer.set_Value(featureSourceIndx, DBNull.Value);
                                buffer.set_Value(featureIDIndx, DBNull.Value);
                            }


                            IPolygon voronoiPolygon = (IPolygon)segmentCollection;
                            buffer.Shape = (IPolygon)voronoiPolygon;
                            inserts.InsertFeature(buffer);
                        }
                        catch (Exception e)
                        {
                            message.AddWarning("Failed to create a cell");
                        }
                    }
                }
                finally
                {
                    if (buffer != null) Marshal.ReleaseComObject(buffer);
                    if (inserts != null) Marshal.ReleaseComObject(inserts);
                }

                GPHelperFunctions.createSpatialIndex(outputFeatureClass);

            }
            catch (Exception exx)
            {
                message.AddError(2, exx.Message);
                message.AddMessage(exx.ToString());
            }
            finally
            {
                if (outputFeatureClass != null) Marshal.ReleaseComObject(outputFeatureClass);

                ((IProgressor)trackcancel).Hide();
            }
        }



        private ISegmentCollection createSegments(Cell cell,BoostVoronoi bv,ArcConstructionMethods method,ISpatialReference spatialReference)
        {
            List<Cell> cells = bv.Cells;
            List<Edge> edges = bv.Edges;
            List<Vertex> vertices = bv.Vertices;

            IPoint previousEndPoint = null;

            ISegmentCollection segmentCollection = new PolygonClass() { SpatialReference = spatialReference };
            // As per boost documentation, edges are returned in counter clockwise (CCW) rotation.
            //  voronoi_edge_type* next()	Returns the pointer to the CCW next edge within the corresponding Voronoi cell.  Edges not necessarily share a common vertex (e.g. infinite edges).
            for (int i = cell.EdgesIndex.Count - 1; i >= 0; i--)
            {
                Edge edge = edges[cell.EdgesIndex[i]];


                //If the vertex index equals -1, it means the edge is infinite. It is impossible to print the coordinates.
                if (!edge.IsFinite && edge.End < 0)
                {
                    // this is the ending portion of a pair of infinite edges, file the previous edge with Start >= 0
                    Edge previous = null;
                    for (int k = i + 1; k < cell.EdgesIndex.Count; k++)
                    {
                        previous = edges[cell.EdgesIndex[k]];
                        if (previous.End >= 0)
                            break;
                        previous = null;
                    }
                    if (previous == null)
                    {
                        for (int k = 0; k < i; k++)
                        {
                            previous = edges[cell.EdgesIndex[k]];
                            if (previous.End >= 0)
                                break;
                            previous = null;
                        }
                    }
                    if (previous == null)
                        throw new Exception("No outbound infinite edge could be found");

                    //Add a straight line segment
                    Vertex start = vertices[previous.End];
                    IPoint FromPoint = new PointClass() { X = start.X, Y = start.Y, SpatialReference = spatialReference };
                    Vertex end = vertices[edge.Start];
                    IPoint ToPoint = new PointClass() { X = end.X, Y = end.Y, SpatialReference = spatialReference };

                    segmentCollection.AddSegment(new LineClass() { FromPoint = FromPoint, ToPoint = ToPoint, SpatialReference = spatialReference });
                    previousEndPoint = ToPoint;
                }
                else if (edge.IsFinite)
                {
                    Vertex start = vertices[edge.End];
                    IPoint FromPoint = new PointClass() { X = start.X, Y = start.Y, SpatialReference = spatialReference };
                    if (previousEndPoint != null)
                    {
                        if ((Math.Abs(previousEndPoint.X - FromPoint.X) > 0.05 || Math.Abs(previousEndPoint.X - FromPoint.X) > 0.05))
                            throw new Exception("Significant change between last end point and current start point");
                        else
                            FromPoint = previousEndPoint;
                    }
                    Vertex end = vertices[edge.Start];
                    IPoint ToPoint = new PointClass() { X = end.X, Y = end.Y, SpatialReference = spatialReference };

                    if (method == ArcConstructionMethods.Straight || edge.IsLinear)
                    {
                        segmentCollection.AddSegment(new LineClass() { FromPoint = FromPoint, ToPoint = ToPoint, SpatialReference = spatialReference });
                        previousEndPoint = ToPoint;
                    }
                    else
                    {
                        // We need three points, use start, end, mid-point between focus and directrix
                        Cell twinCell = cells[edges[edge.Twin].Cell];


                        VPoint pointSite; VSegment lineSite;
                        if (cell.ContainsPoint && twinCell.ContainsSegment)
                        {
                            pointSite = bv.RetrieveInputPoint(cell);
                            lineSite = bv.RetrieveInputSegment(twinCell);
                        }
                        else if (cell.ContainsSegment && twinCell.ContainsPoint)
                        {
                            pointSite = bv.RetrieveInputPoint(twinCell);
                            lineSite = bv.RetrieveInputSegment(cell);
                        }
                        
                        else
                        {
                            throw new Exception("Invalid edge, curves should only be present between a point and a line");
                        }

                        double scaleFactor = Convert.ToDouble(bv.ScaleFactor);
                        IPoint aoPointSite = new Point() 
                        { 
                                X = Convert.ToDouble(pointSite.X) / scaleFactor, 
                                Y = Convert.ToDouble(pointSite.Y) / scaleFactor, 
                                SpatialReference = spatialReference 
                        };

                        ISegment aoLineSite = new LineClass()
                        {
                            FromPoint = new PointClass() 
                            { 
                                    X = Convert.ToDouble(lineSite.Start.X) / scaleFactor, 
                                    Y = Convert.ToDouble(lineSite.Start.Y) / scaleFactor, 
                                    SpatialReference = spatialReference 
                            },
                            ToPoint = new PointClass() 
                            { 
                                    X = Convert.ToDouble(lineSite.End.X) / scaleFactor, 
                                    Y = Convert.ToDouble(lineSite.End.Y) / scaleFactor, 
                                    SpatialReference = spatialReference 
                            },
                            SpatialReference = spatialReference
                        };


                        if (method == ArcConstructionMethods.Approximate)
                        {
                            List<Vertex> sampledVerticed = null;
                            try
                            {
                                sampledVerticed = bv.SampleCurvedEdge(edge, aoLineSite.Length / 10);

                            }
                            catch (FocusOnDirectixException e)
                            {
                                //Log any exception here is required
                                sampledVerticed = new List<Vertex>() { start, end };
                            }
                            catch (UnsolvableVertexException e)
                            {
                                sampledVerticed = new List<Vertex>() { start, end };
                            }

                            sampledVerticed.Reverse();
                            List<IPoint> discretizedEdge = sampledVerticed.Select(
                                p => new Point() { X = p.X, Y = p.Y }
                            ).ToList<IPoint>();

                            IPoint prev = discretizedEdge[0];
                            foreach (IPoint v in discretizedEdge.Skip(1))
                            {
                                segmentCollection.AddSegment(new LineClass()
                                {
                                    FromPoint = new Point() { X = prev.X, Y = prev.Y, SpatialReference = spatialReference },
                                    ToPoint = new Point() { X = v.X, Y = v.Y, SpatialReference = spatialReference },
                                    SpatialReference = spatialReference
                                });
                                prev = v;
                            }
                            previousEndPoint = discretizedEdge.Last();
                        }
                        else if (method == ArcConstructionMethods.Circular)
                        {
                            IPoint nearPoint = ((IProximityOperator)aoLineSite).ReturnNearestPoint(aoPointSite, esriSegmentExtension.esriNoExtension);
                            IPoint midpoint = new PointClass()
                            {
                                X = (nearPoint.X + aoPointSite.X) / 2,
                                Y = (nearPoint.Y + aoPointSite.Y) / 2,
                                SpatialReference = spatialReference
                            };

                            IConstructCircularArc constArc = new CircularArcClass() { SpatialReference = spatialReference };
                            constArc.ConstructThreePoints(FromPoint, midpoint, ToPoint, false);
                            ICircularArc arc = (ICircularArc)constArc;

                            if (!arc.IsMinor)
                            {
                                constArc = new CircularArcClass() { SpatialReference = spatialReference };
                                constArc.ConstructEndPointsRadius(FromPoint, ToPoint, !arc.IsCounterClockwise, arc.Radius, true);
                                arc = (ICircularArc)constArc;
                            }
                            segmentCollection.AddSegment((ISegment)arc);
                            previousEndPoint = arc.ToPoint;
                        }
                        else if (method == ArcConstructionMethods.Ellipse)
                        {
                            IPoint nearPoint = ((IProximityOperator)aoLineSite).ReturnNearestPoint(aoPointSite, esriSegmentExtension.esriExtendTangents);
                            nearPoint.SpatialReference = spatialReference;

                            ILine lineToFocus = new LineClass() { FromPoint = nearPoint, ToPoint = aoPointSite, SpatialReference = spatialReference };
                            ILine semiMajor = new LineClass() { SpatialReference = spatialReference };
                            lineToFocus.QueryTangent(esriSegmentExtension.esriExtendTangentAtTo, 1, true, 100 * lineToFocus.Length, semiMajor);

                            IPoint center = new PointClass()
                            {
                                X = (semiMajor.FromPoint.X + semiMajor.ToPoint.X) / 2,
                                Y = (semiMajor.FromPoint.Y + semiMajor.ToPoint.Y) / 2,
                                SpatialReference = spatialReference
                            };

                            double minor_length = Math.Sqrt(
                                        Math.Pow(distance(semiMajor.FromPoint, ToPoint) + distance(semiMajor.ToPoint, ToPoint), 2)
                                        - Math.Pow(semiMajor.Length, 2));

                            IEllipticArc arc = new EllipticArcClass() { SpatialReference = spatialReference };
                            double rotation = lineToFocus.Angle;
                            double from = GetAngle(center, FromPoint);

                            arc.PutCoords(false, center, FromPoint, ToPoint, rotation, minor_length / semiMajor.Length, esriArcOrientation.esriArcMinor);

                            segmentCollection.AddSegment((ISegment)arc);
                            previousEndPoint = arc.ToPoint;

                        }
                    }
                }
            }
            return segmentCollection;
        }



        private double GetAngle(IPoint from, IPoint to)
        {
            ILine line = new LineClass() { FromPoint = from, ToPoint = to };
            return line.Angle;
        }


        int toI(double v)
        {
            return (int)(v * 100.0); 
        }


        double getDistance(IPoint A, IPoint B)
        {
            return ((IProximityOperator)A).ReturnDistance(B);
        }
        double getDistance(IPoint A, ISegment B)
        {
            return ((IProximityOperator)A).ReturnDistance(B);
        }
        IPoint getClosestPoint(IPoint A, ISegment L)
        {
            IPoint near = new Point();
            ((IProximityOperator)L).QueryNearestPoint(A, esriSegmentExtension.esriNoExtension, near);
            return near;

        }

        private IPoint newPoint(double x, double y)
        {
            return new PointClass() { X = x, Y = y };
        }

        private double distance(IPoint mid_cord, IPoint mid_curve)
        {
            return Math.Sqrt(Math.Pow(mid_curve.X - mid_cord.X, 2) + Math.Pow(mid_curve.Y - mid_cord.Y, 2));
        }

        double porabola_y(double x, IPoint focus, double directrix_y)
        {
            return (Math.Pow(x - focus.X, 2) + Math.Pow(focus.Y, 2) - Math.Pow(directrix_y, 2)) / (2 * (focus.Y - directrix_y));
        }





        // This is the function name object for the Geoprocessing Function Tool. 
        // This name object is created and returned by the Function Factory.
        // The Function Factory must first be created before implementing this property.
        public IName FullName
        {
            get
            {
                // Add CalculateArea.FullName getter implementation
                IGPFunctionFactory functionFactory = new VoronoiFromLinesFunctionFactory();
                return (IName)functionFactory.GetFunctionName(m_ToolName);
            }
        }

        // This is used to set a custom renderer for the output of the Function Tool.
        public object GetRenderer(IGPParameter pParam)
        {
            return null;
        }

        // This is the unique context identifier in a [MAP] file (.h). 
        // ESRI Knowledge Base article #27680 provides more information about creating a [MAP] file. 
        public int HelpContext
        {
            get { return 0; }
        }

        // This is the path to a .chm file which is used to describe and explain the function and its operation. 
        public string HelpFile
        {
            get { return ""; }
        }

        // This is used to return whether the function tool is licensed to execute.
        public bool IsLicensed()
        {
            IAoInitialize aoi = new AoInitializeClass();
            ILicenseInformation licInfo = (ILicenseInformation)aoi;

            var licName = aoi.InitializedProduct();

            if (licName == esriLicenseProductCode.esriLicenseProductCodeAdvanced)
            {
                return true;
            }
            else
                return false;
        }

        // This is the name of the (.xml) file containing the default metadata for this function tool. 
        // The metadata file is used to supply the parameter descriptions in the help panel in the dialog. 
        // If no (.chm) file is provided, the help is based on the metadata file. 
        // ESRI Knowledge Base article #27000 provides more information about creating a metadata file.
        public string MetadataFile
        {
            // if you just return the name of an *.xml file as follows:
            // get { return m_metadatafile; }
            // then the metadata file will be created 
            // in the default location - <install directory>\help\gp

            // alternatively, you can send the *.xml file to the location of the DLL.
            // 
            get
            {
                string filePath;
                filePath = System.IO.Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location);
                filePath = System.IO.Path.Combine(filePath, m_metadatafile);
                return filePath;
            }
        }

        // By default, the Toolbox will create a dialog based upon the parameters returned 
        // by the ParameterInfo property.
        public UID DialogCLSID
        {
            // DO NOT USE. INTERNAL USE ONLY.
            get { return null; }
        }

        #endregion
    }

    //////////////////////////////
    // Function Factory Class
    ////////////////////////////
    [
    Guid("1c17fa4a-121a-11e6-a148-3e1d05defe78"),
    ComVisible(true)
    ]
    public class VoronoiFromLinesFunctionFactory : IGPFunctionFactory
    {
        // Register the Function Factory with the ESRI Geoprocessor Function Factory Component Category.
        #region "Component Category Registration"
        [ComRegisterFunction()]
        static void Reg(string regKey)
        {

            GPFunctionFactories.Register(regKey);
        }

        [ComUnregisterFunction()]
        static void Unreg(string regKey)
        {
            GPFunctionFactories.Unregister(regKey);
        }
        #endregion

        // Utility Function added to create the function names.
        private IGPFunctionName CreateGPFunctionNames(long index)
        {
            IGPFunctionName functionName = new GPFunctionNameClass();
            functionName.MinimumProduct = esriProductCode.esriProductCodeAdvanced;
            IGPName name;

            switch (index)
            {
                case (0):
                    name = (IGPName)functionName;
                    name.Category = "VoronoiFromLines";
                    name.Description = "Create Voronoi From Lines";
                    name.DisplayName = "Voronoi From Lines";
                    name.Name = "VoronoiFromLines";
                    name.Factory = (IGPFunctionFactory)this;
                    break;
            }

            return functionName;
        }

        // Implementation of the Function Factory
        #region IGPFunctionFactory Members

        // This is the name of the function factory. 
        // This is used when generating the Toolbox containing the function tools of the factory.
        public string Name
        {
            get { return "VoronoiFromLines"; }
        }

        // This is the alias name of the factory.
        public string Alias
        {
            get { return "voronoiLines"; }
        }

        // This is the class id of the factory. 
        public UID CLSID
        {
            get
            {
                UID id = new UIDClass();
                id.Value = this.GetType().GUID.ToString("B");
                return id;
            }
        }

        // This method will create and return a function object based upon the input name.
        public IGPFunction GetFunction(string Name)
        {
            switch (Name)
            {
                case ("VoronoiFromLines"):
                    IGPFunction gpFunction = new VoronoiFromLinesFunction();
                    return gpFunction;
            }

            return null;
        }

        // This method will create and return a function name object based upon the input name.
        public IGPName GetFunctionName(string Name)
        {
            IGPName gpName = new GPFunctionNameClass();

            switch (Name)
            {
                case ("VoronoiFromLines"):
                    return (IGPName)CreateGPFunctionNames(0);

            }
            return null;
        }

        // This method will create and return an enumeration of function names that the factory supports.
        public IEnumGPName GetFunctionNames()
        {
            IArray nameArray = new EnumGPNameClass();
            nameArray.Add(CreateGPFunctionNames(0));
            return (IEnumGPName)nameArray;
        }

        // This method will create and return an enumeration of GPEnvironment objects. 
        // If tools published by this function factory required new environment settings, 
        //then you would define the additional environment settings here. 
        // This would be similar to how parameters are defined. 
        public IEnumGPEnvironment GetFunctionEnvironments()
        {
            return null;
        }

        #endregion
    }

}