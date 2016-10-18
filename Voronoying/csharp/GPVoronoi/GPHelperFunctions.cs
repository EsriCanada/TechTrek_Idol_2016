using ESRI.ArcGIS.esriSystem;
using ESRI.ArcGIS.Geodatabase;
using ESRI.ArcGIS.Geometry;
using ESRI.ArcGIS.Geoprocessing;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;

namespace GPVoronoi
{
    static class GPHelperFunctions
    {
        static string CONFIG_KEYWORD_PROP_NAME = "configKeyword";

        static IGPUtilities gpUtilities = new GPUtilitiesClass();

        public static void AddField(this IFields fields, string name, esriFieldType type)
        {
            IFieldEdit fe = new FieldClass();
            fe.Name_2 = name;
            fe.Type_2 = type;
            ((IFieldsEdit)fields).AddField((IField)fe);
        }
        public static void AddField(this IFields fields, IField field)
        {
            IFieldEdit fe = new FieldClass();
            ((IFieldsEdit)fields).AddField((IField)((IClone)field).Clone());
        }

        public static IFeatureClass CreateFeatureClass(IGPValue gpFeatureClass, IGPEnvironmentManager environment, IFields fields = null)
        {
            if (gpFeatureClass == null)
                throw new ArgumentException("Argument can not be null", "gpFeatureClass");
            if (environment == null)
                throw new ArgumentException("Argument can not be null", "environment");


            IGeoProcessorSettings gpSettings = (IGeoProcessorSettings)environment;
            if (gpUtilities.Exists(gpFeatureClass))
            {
                if (gpSettings.OverwriteOutput == true)
                    gpUtilities.Delete(gpFeatureClass);
                else
                    throw new Exception("Output feature class already exists: " + gpFeatureClass.GetAsText());
            }
            

            IDEFeatureClass deFeatureClass = (IDEFeatureClass)gpUtilities.DecodeDETable(gpFeatureClass);
            if (deFeatureClass == null)
                throw new Exception("Data Element decode return null");
            
            IObjectClassDescription objectClassDescription = (IObjectClassDescription)new FeatureClassDescriptionClass();
            UID clsid = objectClassDescription.InstanceCLSID;
            UID extclsid = objectClassDescription.ClassExtensionCLSID;

            IDataElement dataElement = (IDataElement)deFeatureClass;
            if (dataElement.CatalogPath == null)
                throw new ArgumentException("Catalog path is null", "CatalogPath");
            IFeatureClassName featureClassName = (IFeatureClassName)gpUtilities.CreateFeatureClassName(dataElement.CatalogPath);
            
            string path = dataElement.GetPath();
            string name = dataElement.Name;
            
            IDEGeoDataset geoDataElement = (IDEGeoDataset)deFeatureClass;
            ISpatialReference spatialReference = geoDataElement.SpatialReference;
            
            IDETable deTable = (IDETable)deFeatureClass;
            string shapeFieldName = deFeatureClass.ShapeFieldName;

            Dictionary<string,IField> fieldBuilder = new Dictionary<string,IField>();
            foreach(var input_fields in new IFields[] { deTable.Fields, fields })
            {
                if (input_fields == null) continue;
                for (int i = 0; i < input_fields.FieldCount; i++)
                {
                    IField field = deTable.Fields.get_Field(i);

                    if (fieldBuilder.ContainsKey(field.Name.ToLower()))
                        fieldBuilder[field.Name.ToLower()] = (IField)((IClone)field).Clone();
                    else
                        fieldBuilder.Add(field.Name.ToLower(), (IField)((IClone)field).Clone());

                    if (field.Type == esriFieldType.esriFieldTypeGeometry)
                    {
                        shapeFieldName = field.Name;
                        break;
                    }
                }
            }

            IFields output_fields = new FieldsClass();
            IFieldsEdit fields_edit = (IFieldsEdit)output_fields;
            foreach(IField field in fieldBuilder.Values)
            {
                fields_edit.AddField(field);
                if(field.Type == esriFieldType.esriFieldTypeGeometry)
                {
                    IGeometryDefEdit defEdit = (IGeometryDefEdit)field.GeometryDef;
                    defEdit.GeometryType_2 = esriGeometryType.esriGeometryPolygon;
                }
            }

            string configKeyword = ((IGPString)environment.FindEnvironment(CONFIG_KEYWORD_PROP_NAME).Value).Value;
            //if (String.IsNullOrWhiteSpace(configKeyword)) configKeyword = "DEFAULTS";

            IFeatureClass ret = null;
            if(featureClassName.FeatureDatasetName != null)
            {
                IFeatureDataset featureDataset = (IFeatureDataset)((IName)featureClassName.FeatureDatasetName).Open();
                try
                {
                    ret = featureDataset.CreateFeatureClass(name, output_fields, clsid, extclsid, esriFeatureType.esriFTSimple, shapeFieldName, configKeyword);
                }
                finally
                {
                    Marshal.ReleaseComObject(featureDataset);
                }
            }
            else
            {
                IWorkspace workspace = (IWorkspace)((IName)((IDatasetName)featureClassName).WorkspaceName).Open();
                try
                {
                    IFeatureWorkspace featureWorkspace = (IFeatureWorkspace)workspace;
                    ret = featureWorkspace.CreateFeatureClass(name, output_fields, clsid, extclsid, esriFeatureType.esriFTSimple, shapeFieldName, configKeyword);
                }
                finally
                {
                    Marshal.ReleaseComObject(workspace);
                }
            }
            return ret;
        }

        public static void createSpatialIndex(IFeatureClass fc, double gridOneSize = 0.0, double gridTwoSize = 0.0, double gridThreeSize = 0.0)
        {
            String shapeFieldName = fc.ShapeFieldName;

            // Clone the shape field from the feature class.
            int shapeFieldIndex = fc.FindField(shapeFieldName);
            IFields fields = fc.Fields;
            IField sourceField = fields.get_Field(shapeFieldIndex);
            IClone sourceFieldClone = (IClone)sourceField;
            IClone targetFieldClone = sourceFieldClone.Clone();
            IField targetField = (IField)targetFieldClone;

            // Open the geometry definition from the cloned field and modify it.
            IGeometryDef geometryDef = targetField.GeometryDef;
            IGeometryDefEdit geometryDefEdit = (IGeometryDefEdit)geometryDef;
            if (gridTwoSize > 0.0)
            {
                geometryDefEdit.GridCount_2 = 1;
                geometryDefEdit.set_GridSize(0, gridOneSize);
            }
            if (gridTwoSize > 0.0)
            {
                geometryDefEdit.GridCount_2 = 2;
                geometryDefEdit.set_GridSize(1, gridTwoSize);
            }
            if (gridThreeSize > 0.0)
            {
                geometryDefEdit.GridCount_2 = 3;
                geometryDefEdit.set_GridSize(2, gridThreeSize);
            }

            // Create a spatial index and set the required attributes.
            IIndex newIndex = new IndexClass();
            IIndexEdit newIndexEdit = (IIndexEdit)newIndex;
            newIndexEdit.Name_2 = shapeFieldName + "_Indx";

            // Create a fields collection and assign it to the new index.
            IFields newIndexFields = new FieldsClass();
            IFieldsEdit newIndexFieldsEdit = (IFieldsEdit)newIndexFields;
            newIndexFieldsEdit.AddField(targetField);
            newIndexEdit.Fields_2 = newIndexFields;

            // Add the spatial index back into the feature class.
            fc.AddIndex(newIndex);
        }

        public static void dropSpatialIndex(IFeatureClass fc)
        {
            //Delete the spatial index
            IIndexes indexes = fc.Indexes;
            String shapeFieldName = fc.ShapeFieldName;
            IEnumIndex enumIndex = indexes.FindIndexesByFieldName(shapeFieldName);
            enumIndex.Reset();

            // Get the index based on the shape field (should only be one) and delete it.
            IIndex index = enumIndex.Next();
            if (index != null)
            {
                fc.DeleteIndex(index);
            }
        }


        internal static void AddField(IFeatureClass featureClass, string name, esriFieldType type)
        {
            IFieldEdit field = new FieldClass();
            field.Name_2 = name;
            field.Type_2 = type;

            featureClass.AddField(field);
        }
    }
}
