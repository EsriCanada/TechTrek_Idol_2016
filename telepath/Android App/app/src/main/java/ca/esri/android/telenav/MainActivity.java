package ca.esri.android.telenav;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.Dialog;
import android.content.Context;
import android.content.CursorLoader;
import android.content.Intent;
import android.content.IntentSender;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.AsyncTask;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.support.v4.content.ContextCompat;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ImageButton;
import android.widget.ListView;
import android.widget.TextView;

import com.esri.arcgisruntime.geometry.Geometry;
import com.esri.arcgisruntime.geometry.GeometryEngine;
import com.esri.arcgisruntime.geometry.PointCollection;
import com.esri.arcgisruntime.geometry.Polyline;
import com.esri.arcgisruntime.geometry.SpatialReference;
import com.esri.arcgisruntime.geometry.SpatialReferences;
import com.esri.arcgisruntime.geometry.Point;
import com.esri.arcgisruntime.mapping.view.Graphic;
import com.esri.arcgisruntime.mapping.view.GraphicsOverlay;
import com.esri.arcgisruntime.mapping.view.MapView;
import com.esri.arcgisruntime.mapping.Map;
import com.esri.arcgisruntime.layers.ArcGISVectorTiledLayer;
import com.esri.arcgisruntime.symbology.SimpleMarkerSymbol;
import com.esri.arcgisruntime.symbology.SimpleRenderer;
import com.esri.arcgisruntime.util.ListenableList;
import com.google.android.gms.appindexing.Action;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.common.api.GoogleApiClient;
import com.google.android.gms.common.api.ResultCallback;
import com.google.android.gms.drive.Drive;
import com.google.android.gms.drive.DriveApi;
import com.google.android.gms.drive.DriveFile;
import com.google.android.gms.drive.DriveId;
import com.google.android.gms.drive.DriveResource;
import com.google.android.gms.drive.Metadata;
import com.google.android.gms.drive.MetadataChangeSet;

import com.google.android.gms.drive.DriveFolder.DriveFileResult;

import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;

import com.google.api.client.extensions.android.http.AndroidHttp;
import com.google.api.client.googleapis.extensions.android.gms.auth.GoogleAccountCredential;
import com.google.api.client.googleapis.extensions.android.gms.auth.UserRecoverableAuthIOException;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.Permission;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;
import java.math.BigDecimal;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.text.DecimalFormat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Timer;
import java.util.TimerTask;

import javax.net.ssl.HttpsURLConnection;



public class MainActivity extends Activity implements
        GoogleApiClient.ConnectionCallbacks,
        GoogleApiClient.OnConnectionFailedListener {



    protected static final int RESOLVE_CONNECTION_REQUEST_CODE = 100;

    private MapView mMapView;
    private String token;
    private boolean recording;
    private TextView textCounter;
    private TextView textSubmit;
    private TextView textDelete;
    private Timer timer;
    private MyTimerTask myTimerTask;
    private static int ctr;
    private TextView distance;
    private ImageButton record;
    private ImageButton delete;
    private ImageButton add;
    private ImageButton submit;
    private Dialog menu;
    private Point lastPoint;
    private PointCollection points;
    private PointCollection allPoints;
    private List<Graphic> path = new ArrayList<>();
    private List<DriveFile> files = new ArrayList<>();
    private List<Graphic> moments = new ArrayList<>();
    private List<Graphic> tempMoments = new ArrayList<>();
    private List<String> urls = new ArrayList<>();
    private int pathID;
    private float lastBearing;
    private double startMomentTime;
    private boolean firstPointDrawn;
    private GoogleApiClient mGoogleApiClient;
    private String description;

    private int segmentId;
    private SpatialReference webmercatorRef;
    private SpatialReference wgs84Ref = SpatialReferences.getWgs84();
    private static final DecimalFormat DECIMAL_FORMAT = new DecimalFormat("#,###.00");
    private static final DecimalFormat DECIMAL_FORMAT_4 = new DecimalFormat("#,###.0000");
    private static LocationManager locationManager;

    private static final String TAG = "CreateFileActivity";
    private static final String MIME_PHOTO = "image/jpg";
    private static final String MIME_VIDEO = "video/mp4";
    private com.google.api.services.drive.Drive service;
    private File photoFile;
    private int tempMemoryType;

    /**
     * ATTENTION: This was auto-generated to implement the App Indexing API.
     * See https://g.co/AppIndexing/AndroidStudio for more information.
     */


    final class MyEntry<K, V> {
        private final K key;
        private V value;

        public MyEntry(K key, V value) {
            this.key = key;
            this.value = value;
        }

        public K getKey() {
            return key;
        }

        public V getValue() {
            return value;
        }

        public V setValue(V value) {
            V old = this.value;
            this.value = value;
            return old;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState)  {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        mMapView = (MapView) findViewById(R.id.mapView);
        textCounter = (TextView) findViewById(R.id.textView3);
        textDelete = (TextView) findViewById(R.id.deleteText);
        textSubmit = (TextView) findViewById(R.id.submitText);
        record = (ImageButton) findViewById(R.id.record);
        delete = (ImageButton) findViewById(R.id.delete);
        add = (ImageButton) findViewById(R.id.add);
        submit = (ImageButton) findViewById(R.id.submit);
        distance = (TextView) findViewById(R.id.textView4);
        recording = false;
        firstPointDrawn = false;
        locationManager = (LocationManager) this.getSystemService(getApplicationContext().LOCATION_SERVICE);
        startLocation();
        webmercatorRef = SpatialReferences.getWebMercator();
        points = new PointCollection(webmercatorRef);
        allPoints = new PointCollection(webmercatorRef);
        segmentId = 0;



        record.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (recording) {
                    pauseTimer();
                } else {
                    record.setBackgroundResource(android.R.drawable.ic_media_pause);
                    submit.setVisibility(v.VISIBLE);
                    textSubmit.setVisibility(v.VISIBLE);
                    delete.setVisibility(v.VISIBLE);
                    textDelete.setVisibility(v.VISIBLE);
                    add.setVisibility(View.VISIBLE);

                    if (ctr == 0) {
                        createMoment(START_SEGMENT);
                    }
                    startTimer();
                }
            }
        });

        submit.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (moments.size() > 0) {
                    createMoment(END_SEGMENT);
                    stopTimer();
                    submitPath();
                    makePublic();
                    moments = new ArrayList<>();
                    path = new ArrayList<>();
                }
            }
        });

        delete.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                stopTimer();
                points = new PointCollection(webmercatorRef);
                allPoints = new PointCollection(webmercatorRef);
                moments = new ArrayList<>();
                path = new ArrayList<>();
                resetMoments();

            }
        });

        add.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showMediaDialog();
            }
        });


        String vectorTileStyle = "http://www.arcgis.com/sharing/rest/content/items/f96366254a564adda1dc468b447ed956/resources/styles/root.json?f=json";

        ArcGISVectorTiledLayer layer = new ArcGISVectorTiledLayer(vectorTileStyle);
        layer.getStyle();
        Map map = new Map();
        map.getOperationalLayers().add(layer);
        mMapView.setMap(map);

        JSONObject data = new JSONObject();

        try {
            //data.put("f", "json");
            data.put("client_id", "PCxobQLvRvGlkUi5");
            data.put("client_secret", "6f911ea8d7b34739b2fefb63b58bd633");
            data.put("grant_type", "client_credentials");
            data.put("expiration", "1440");
        } catch (JSONException e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }


        GoogleAccountCredential credential = GoogleAccountCredential.usingOAuth2(this, Collections.singleton(DriveScopes.DRIVE));
        credential.setSelectedAccountName("ENTER GMAIL ADDRESS HERE");
        service = new com.google.api.services.drive.Drive.Builder(AndroidHttp.newCompatibleTransport(), new GsonFactory(), credential).setApplicationName("\"AppName/1.0\"").build();

        if (mGoogleApiClient == null) {
            mGoogleApiClient = new GoogleApiClient.Builder(this)
                    .addApi(Drive.API)
                    .addScope(Drive.SCOPE_FILE)
                    .addScope(Drive.SCOPE_APPFOLDER) // required for App Folder sample
                    .addConnectionCallbacks(this)
                    .addOnConnectionFailedListener(this)
                    .build();
        }
        mGoogleApiClient.connect();
        getPathID();
    }

    class insertPermission extends AsyncTask<String, Void, String> {
        @Override
        protected String doInBackground(String... params) {
            Permission newPermission = new Permission();
            newPermission.setType("anyone");
            newPermission.setRole("reader");
            newPermission.setValue("");
            newPermission.setWithLink(true);

            try {
                return service.permissions().insert(params[0], newPermission).execute().toString();
            } catch (UserRecoverableAuthIOException e) {
                startActivityForResult(e.getIntent(), 404);
            } catch (IOException e) {
                System.out.println("An error occurred: " + e);
            } catch (Exception e) {
                System.out.println("ERROR: " + e);
            }
            return null;
        }

        @Override
        protected void onPostExecute(String token) {
            Log.i(TAG, "Access token retrieved:" + token);
        }
    }



    /**
     * Called when {@code mGoogleApiClient} is disconnected.
     */
    @Override
    public void onConnectionSuspended(int cause) {
        Log.i(TAG, "GoogleApiClient connection suspended");
    }



    @Override
    public void onConnectionFailed(ConnectionResult result) {
        // Called whenever the API client fails to connect.
        Log.i(TAG, "GoogleApiClient connection failed: " + result.toString());
        if (!result.hasResolution()) {
            // show the localized error dialog.
            GoogleApiAvailability.getInstance().getErrorDialog(this, result.getErrorCode(), 0).show();
            return;
        }
        // The failure has a resolution. Resolve it.
        // Called typically when the app is not yet authorized, and an
        // authorization
        // dialog is displayed to the user.
        try {
            result.startResolutionForResult(this, RESOLVE_CONNECTION_REQUEST_CODE);
        } catch (IntentSender.SendIntentException e) {
            Log.e(TAG, "Exception while starting resolution activity", e);
        }
    }

    @Override
    public void onConnected(Bundle connectionHint) {
        //super.onConnected(connectionHint);
        // create new contents resource
        //Drive.DriveApi.newDriveContents(mGoogleApiClient).setResultCallback(driveContentsCallback);
    }


    final private ResultCallback<DriveFileResult> fileCallback = new ResultCallback<DriveFileResult>() {
        @Override
        public void onResult(DriveFileResult result) {
            if (!result.getStatus().isSuccess()) {
                //showMessage("Error while trying to create the file");
                return;
            }

            DriveId driveId =  result.getDriveFile().getDriveId();
            Log.d(TAG, "Created an empty file: " + driveId);
            DriveFile file = driveId.asDriveFile();
            files.add(file);
        }
    };


 private static boolean VERBOSE = true;

    private void saveFiletoDrive(final File file, final String mime) {

        // Start by creating a new contents, and setting a callback.

        Drive.DriveApi.newDriveContents(mGoogleApiClient).setResultCallback(
                new ResultCallback<DriveApi.DriveContentsResult>() {
                    @Override
                    public void onResult(DriveApi.DriveContentsResult result) {
                        // If the operation was not successful, we cannot do
                        // anything
                        // and must
                        // fail.
                        if (!result.getStatus().isSuccess()) {
                            Log.i(TAG, "Failed to create new contents.");
                            return;
                        }
                        Log.i(TAG, "Connection successful, creating new contents...");
                        // Otherwise, we can write our data to the new contents.
                        // Get an output stream for the contents.
                        OutputStream outputStream = result.getDriveContents().getOutputStream();
                        FileInputStream fis;
                        try {
                            fis = new FileInputStream(file.getPath());
                            ByteArrayOutputStream baos = new ByteArrayOutputStream();
                            byte[] buf = new byte[1024];
                            int n;
                            while (-1 != (n = fis.read(buf)))
                                baos.write(buf, 0, n);
                            byte[] photoBytes = baos.toByteArray();
                            outputStream.write(photoBytes);

                            outputStream.close();
                            fis.close();

                        } catch (FileNotFoundException e) {
                            Log.w(TAG, "FileNotFoundException: " + e.getMessage());
                        } catch (IOException e1) {
                            Log.w(TAG, "Unable to write file contents." + e1.getMessage());
                        }

                        String title = file.getName();
                        MetadataChangeSet metadataChangeSet = new MetadataChangeSet.Builder()
                                .setMimeType(mime).setTitle(title).build();

                        if (mime.equals(MIME_PHOTO)) {
                            if (VERBOSE)
                                Log.i(TAG, "Creating new photo on Drive (" + title + ")");
                            Drive.DriveApi.getRootFolder(mGoogleApiClient)
                                    .createFile(mGoogleApiClient, metadataChangeSet,  result.getDriveContents())
                                    .setResultCallback(fileCallback);
                        } else if (mime.equals(MIME_VIDEO)) {
                            Log.i(TAG, "Creating new video on Drive (" + title + ")");
                            Drive.DriveApi.getRootFolder(mGoogleApiClient)
                                    .createFile(mGoogleApiClient, metadataChangeSet,  result.getDriveContents())
                                    .setResultCallback(fileCallback);
                        }

                        if (file.delete()) {
                            if (VERBOSE)
                                Log.d(TAG, "Deleted " + file.getName() + " from sdcard");
                        } else {
                            Log.w(TAG, "Failed to delete " + file.getName() + " from sdcard");
                        }
                    }
                });
            }



    private void submitPath(){

        JSONObject data = new JSONObject();
        try {
            data.put("f", "json");
            data.put("token", token);
            data.put("features", path);

        } catch (JSONException e) {
            e.printStackTrace();
        }
        path = new ArrayList<>();
        performNetworkRequest("https://ENTER PATH FEATURE SERVICE URL HERE", data, "addPath");

    }


    private void submitMoment(List<Graphic> newMoments){
        JSONObject data = new JSONObject();
        try {
            data.put("f", "json");
            data.put("token", token);
            data.put("features", newMoments);

        } catch (JSONException e) {
            e.printStackTrace();
        }

        performNetworkRequest("https://ENTER MOMENTS FEATURE SERVICE URL HERE", data, "addMoment");

    }


    private void getPathID(){
        JSONObject data = new JSONObject();
        try {
            data.put("f", "json");
            data.put("token", token);
            data.put("where", "1 = 1");
            data.put("returnGeometry", false);
            data.put("outStatistics", "[{\"statisticType\":\"max\",\"onStatisticField\":\"PathID\",\"outStatisticFieldName\":\"ID\"}]");

        } catch (JSONException e) {
            e.printStackTrace();
        }
        performNetworkRequest("https://ENTER PATH FEATURE SERVICE URL HERE", data, "pathID");
    }

    @Override
    public void onStart() {
        super.onStart();

        // ATTENTION: This was auto-generated to implement the App Indexing API.
        // See https://g.co/AppIndexing/AndroidStudio for more information.
        //client.connect();
        Action viewAction = Action.newAction(
                Action.TYPE_VIEW, // TODO: choose an action type.
                "Main Page", // TODO: Define a title for the content shown.
                // TODO: If you have web page content that matches this app activity's content,
                // make sure this auto-generated web page URL is correct.
                // Otherwise, set the URL to null.
                Uri.parse("http://host/path"),
                // TODO: Make sure this auto-generated app URL is correct.
                Uri.parse("android-app://ca.esri.android.telenav/http/host/path")
        );
        //AppIndex.AppIndexApi.start(client, viewAction);
    }

    @Override
    public void onStop() {
        super.onStop();

        // ATTENTION: This was auto-generated to implement the App Indexing API.
        // See https://g.co/AppIndexing/AndroidStudio for more information.
        Action viewAction = Action.newAction(
                Action.TYPE_VIEW, // TODO: choose an action type.
                "Main Page", // TODO: Define a title for the content shown.
                // TODO: If you have web page content that matches this app activity's content,
                // make sure this auto-generated web page URL is correct.
                // Otherwise, set the URL to null.
                Uri.parse("http://host/path"),
                // TODO: Make sure this auto-generated app URL is correct.
                Uri.parse("android-app://ca.esri.android.telenav/http/host/path")
        );
        //AppIndex.AppIndexApi.end(client, viewAction);
        //client.disconnect();
    }


    // Uses AsyncTask to create a task away from the main UI thread. This task takes a
    // URL string and uses it to create an HttpUrlConnection. Once the connection
    // has been established, the AsyncTask downloads the contents of the webpage as
    // an InputStream. Finally, the InputStream is converted into a string, which is
    // displayed in the UI by the AsyncTask's onPostExecute method.
    private class DownloadWebpageTask extends AsyncTask<Object, Void, MyEntry<String, Object>> {
        @Override
        protected MyEntry<String, Object> doInBackground(Object... urls) {
            return downloadUrl((String) urls[0], (JSONObject) urls[1], (String)urls[2]);
        }

        protected void onPostExecute(MyEntry<String, Object> result) {
            try {
                String output = (String) result.getValue();
                String key = result.getKey();
                switch (key) {
                    case "token":
                        String tokenJSON = (String) result.getValue();
                        JSONObject tokenObject = new JSONObject(tokenJSON);
                        token = (String)tokenObject.get("access_token");
                        break;
                    case "pathID":
                        String resultJSON  = (String) result.getValue();
                        JSONObject queryResult = new JSONObject(resultJSON);
                        JSONArray out = (JSONArray)queryResult.get("features");
                        JSONObject ts = (JSONObject)out.get(0);
                        JSONObject p = ts.getJSONObject("attributes");
                        String done = p.getString("ID");
                        pathID = Integer.parseInt(done);
                        pathID++;
                        break;
                    case "uploadMemory":
                        break;
                    case "addPath":
                        String t = output;
                        break;
                    case "addMomemnt":
                        break;
                    default:
                        break;
                }
            }
            catch(Exception e){

            }
        }
    }

    // Given a URL, establishes an HttpUrlConnection and retrieves
    // the web page content as a InputStream, which it returns as
    // a string.
    private MyEntry<String, Object> downloadUrl(String myurl, JSONObject data, String key) {

        String result = "";

        try {
            URL url = new URL(myurl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setReadTimeout(10000 /* milliseconds */);
            conn.setConnectTimeout(15000 /* milliseconds */);
            conn.setDoOutput(true);
            conn.setDoInput(true);
            //conn.setRequestProperty("Content-Type", "application/json");
            //conn.setRequestProperty("Accept", "application/json");

            conn.setRequestMethod("POST");
            // Starts the query
            //conn.connect();

            //Write
            OutputStream outputStream = conn.getOutputStream();
            BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(outputStream, "UTF-8"));
            String dataString = getPostDataString(data, key);
            writer.write(dataString);
            writer.flush();
            writer.close();
            outputStream.close();


            int responseCode=conn.getResponseCode();

            if (responseCode == HttpsURLConnection.HTTP_OK) {

                BufferedReader in=new BufferedReader(new
                        InputStreamReader(
                        conn.getInputStream()));

                StringBuffer sb = new StringBuffer("");
                String line = "";

                while((line = in.readLine()) != null) {

                    sb.append(line);
                    break;
                }

                in.close();
                result = sb.toString();

            }
            else {
                result = "false : "+responseCode;
            }

        } catch (UnsupportedEncodingException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }
        catch (Exception e){
            e.printStackTrace();
        }

        MyEntry<String, Object> entry = new MyEntry(key, result);
        return entry;
    }

    ResultCallback<DriveResource.MetadataResult> metadataRetrievedCallback = new
            ResultCallback<DriveResource.MetadataResult>() {
                @Override
                public void onResult(DriveResource.MetadataResult result) {
                    if (!result.getStatus().isSuccess()) {
                        //showMessage("Problem while trying to fetch metadata");
                        return;
                    }
                    Metadata metadata = result.getMetadata();
                    String url = metadata.getWebContentLink();
                    if (url != null) {
                        Uri uri = Uri.parse(url);
                        urls.add(uri.toString());
                        String ids = uri.getQueryParameter("id");
                        new insertPermission().execute(ids);
                        if (tempMoments.size() == urls.size()){
                            updateMemoryUrl();
                        }
                        else if (urls.size() > tempMoments.size()){
                            resetMoments();
                        }
                        //sharedUrl = "http://googledrive.com/host/" + ids;
                    }
                    else{
                        resetMoments();

                    }
                }
            };


    private void makePublic(){
        tempMoments = moments;
        //if we have files submitted
        if (files.size() > 0) {

            for (DriveFile d : files) {
                d.getMetadata(mGoogleApiClient).setResultCallback(metadataRetrievedCallback);
            }
        }
        else {
            //reset variables;
            resetMoments();
        }
    }


    private void updateMemoryUrl(){

        String[] urlArray = urls.toArray(new String[urls.size()]);
        int ctr = urls.size() - files.size();
        for (Graphic moment: tempMoments){
            int medium = (int)moment.getAttributes().get("Medium");
            if (medium == PHOTO || medium == VIDEO) {
                moment.getAttributes().put("MemoryURL", urlArray[ctr]);
                ctr++;
            }
        }
       resetMoments();
    }


    private void resetMoments(){
        urls = new ArrayList<>();
        files = new ArrayList<>();
        submitMoment(tempMoments);
        tempMoments = new ArrayList<>();
        pathID++;
        segmentId = 0;

    }

    public String getPostDataString(JSONObject params, String type) throws Exception {

        StringBuilder result = new StringBuilder();
        boolean first = true;


        Iterator<String> itr = params.keys();

        while(itr.hasNext()){

            String key= itr.next();
            Object value = params.get(key);

            if (first)
                first = false;
            else
                result.append("&");

            result.append(URLEncoder.encode(key, "UTF-8"));
            result.append("=");


            //if we are dealing with features
            if (value instanceof ArrayList<?>){
                String out = "";
                out += "[";

                ArrayList<Graphic> graphics = ((ArrayList) value);
                for(Graphic g: graphics ){
                    out += "{\"geometry\":";
                    Geometry line = g.getGeometry();
                    out += line.toJson();
                    out += ",\"attributes\":{";
                    java.util.Map<String, Object> attributes = g.getAttributes();
                    for (java.util.Map.Entry<String, Object> entry : attributes.entrySet())
                    {
                        if (entry.getKey().equals("Start") || entry.getKey().equals("End")){
                            out += "\"" + entry.getKey() + "\"" + ":" +  entry.getValue();
                        }
                        else {
                            out += "\"" + entry.getKey() + "\"" + ":" + "\"" + entry.getValue() + "\"";
                        }
                        out += ",";
                    }
                    //remove trailing comma
                    out = out.substring(0,out.length()-1);
                    out += "}},";
                }
                //remove trailing comma
                out = out.substring(0,out.length()-1);
                out += "]";
                result.append(URLEncoder.encode(out, "UTF-8"));
            }
            else {
                result.append(URLEncoder.encode(value.toString(), "UTF-8"));
            }
        }
        return result.toString();
    }


    LocationListener locationListener = new LocationListener() {
        public void onLocationChanged(Location location) {
            // Called when a new location is found by the network location provider.
            writeResultToTable(location);
            //makeUseOfNewLocation(location);
        }

        public void onStatusChanged(String provider, int status, Bundle extras) {
            int t = status + 3;
        }

        public void onProviderEnabled(String provider) {
            Log.d(provider, "dsfg");
        }

        public void onProviderDisabled(String provider) {
            Log.d(provider, "sadf");
        }
    };

    private void performNetworkRequest(String stringUrl, JSONObject data, String requestID) {
        ConnectivityManager connMgr = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo networkInfo = connMgr.getActiveNetworkInfo();

        if (networkInfo != null && networkInfo.isConnected()) {
            new DownloadWebpageTask().execute(stringUrl, data, requestID);
        } else {
            //textView.setText("No network connection available.");
        }


    }

    private void writeResultToTable(Location location) {

        double _gpsLatitude = location.getLatitude();
        double _gpsLongitude = location.getLongitude();
        final double time = location.getTime();
        final float bearing = location.getBearing();

        try {
            locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
            locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER);
        } catch (Exception exc) {
        }

        Point wgs84Point = new Point(_gpsLongitude, _gpsLatitude, wgs84Ref);
        Point projected = (Point) GeometryEngine.project(wgs84Point, webmercatorRef);


        Point pt = Point.createWithM(projected.getX(), projected.getY(), time);


        lastPoint = pt;
        lastBearing = bearing;


        if (recording || !firstPointDrawn) {
            // create color for graphic
            int yellow = Color.YELLOW;

            //draw starting point
            if (!firstPointDrawn){
                yellow = Color.GREEN;
                firstPointDrawn = true;
            }
            else{
                points.add(pt);
                allPoints.add(pt);
            }

            // create graphics overlay
            GraphicsOverlay grOverlay = new GraphicsOverlay();

            // create list of graphics
            ListenableList<Graphic> graphics = grOverlay.getGraphics();
            // add points from PointCollection to graphics list

            graphics.add(new Graphic(wgs84Point));

            // create simple renderer
            SimpleRenderer simpleRenderer = new SimpleRenderer();
            // create point symbol
            SimpleMarkerSymbol pointSymbol = new SimpleMarkerSymbol(yellow, 8, SimpleMarkerSymbol.Style.CIRCLE);
            // set symbol to renderer
            simpleRenderer.setSymbol(pointSymbol);
            // set renderer to graphics overlay
            grOverlay.setRenderer(simpleRenderer);
            // add graphics overlay to the MapView
            mMapView.getGraphicsOverlays().add(grOverlay);
            mMapView.setViewpointCenterWithScaleAsync(wgs84Point, 15000);

            Polyline line = new Polyline(allPoints);
            double length = GeometryEngine.length(line)/1000;
            DecimalFormat twoDForm = new DecimalFormat("#.##");
            distance.setText(Double.valueOf(twoDForm.format(length)) + " km");
        }

    }


    private void startLocation() {
        String locationProvider = LocationManager.GPS_PROVIDER;
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            locationManager.requestLocationUpdates(locationProvider, 50, 0, locationListener);
        }
    }

    private void showMediaDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Select your Medium:");

        ListView modeList = new ListView(this);
        modeList.setFastScrollEnabled(true);
        modeList.setOnItemClickListener(new AdapterView.OnItemClickListener() {
            public void onItemClick(AdapterView<?> parent, View arg1, int position, long arg3) {
                String medium = (String) parent.getItemAtPosition(position);
                startMomentTime  = lastPoint.getM();
                switch (medium) {
                    case "Photo": {
                        dispatchTakePictureIntent();
                        break;
                    }
                    case "Video": {
                        dispatchTakeVideoIntent();
                        break;
                    }
                    case "Text": {
                        openTextActivity(REQUEST_TEXT);
                        break;
                    }
                }
                menu.hide();
            }
        });
        List<String> stringList = new ArrayList<>();
        stringList.add(0, "Photo");
        stringList.add(1, "Video");
        stringList.add(2, "Text");
        modeList.setAdapter(new ListAdapter(this, stringList));
        builder.setView(modeList);

        menu = builder.create();
        menu.show();
    }


    public void createMoment(int type){
        HashMap<String, Object> attributes = new HashMap<>();
        attributes.put("UserID", 1);
        attributes.put("PathID", pathID);
        attributes.put("Time", 1);
        attributes.put("SegmentID", segmentId);


        int colour = Color.GREEN;

        if (type != START_SEGMENT) {
            Polyline line = new Polyline(points);
            Graphic graphic = new Graphic(line, attributes);
            path.add(graphic);
            //clear the points collections
            points = new PointCollection(webmercatorRef);
            segmentId = segmentId + 1;

            colour = Color.MAGENTA;

        }


        GraphicsOverlay grOverlay = new GraphicsOverlay();

        // create list of graphics
        ListenableList<Graphic> graphics = grOverlay.getGraphics();
        // add points from PointCollection to graphics list

        if (type == END_SEGMENT) colour = Color.RED;

        graphics.add(new Graphic(lastPoint));


        // create simple renderer
        SimpleRenderer simpleRenderer = new SimpleRenderer();
        // create point symbol
        SimpleMarkerSymbol pointSymbol = new SimpleMarkerSymbol(colour, 8, SimpleMarkerSymbol.Style.CIRCLE);
        // set symbol to renderer
        simpleRenderer.setSymbol(pointSymbol);
        // set renderer to graphics overlay
        grOverlay.setRenderer(simpleRenderer);
        // add graphics overlay to the MapView
        mMapView.getGraphicsOverlays().add(grOverlay);


        if (type != END_SEGMENT) {
            //add the last point to the start of the next segment
            points.add(lastPoint);
            allPoints.add(lastPoint);
        }

        HashMap<String, Object> momentAttributes = new HashMap<>();
        momentAttributes.put("UserID", 1);

        momentAttributes.put("Start",new BigDecimal(lastPoint.getM()).toPlainString());
        if (type == END_SEGMENT || type == START_SEGMENT){
            urls.add("");
            description = "";
        }
        else if (type == TEXT){
            urls.add("");
        }
        else {
            //if media type
            momentAttributes.put("Start",  new BigDecimal(startMomentTime).toPlainString());
        }
        momentAttributes.put("End", new BigDecimal(lastPoint.getM()).toPlainString());
        momentAttributes.put("MemoryURL", "");
        momentAttributes.put("Heading", lastBearing);
        momentAttributes.put("Medium", type);
        momentAttributes.put("Description", description);
        momentAttributes.put("PathID", pathID);

        Point pt = new Point(lastPoint.getX(), lastPoint.getY(), webmercatorRef);

        Graphic moment = new Graphic(pt, momentAttributes);
        moments.add(moment);
    }


    public void openTextActivity(int requestCode) {
        Intent intent = new Intent(this, Text.class);
        startActivityForResult(intent, requestCode);
    }

    String mCurrentPhotoPath;

    private void stopTimer() {
        ctr = 0;
        textCounter.setText("00:00:00");
        distance.setText("0.00 km");
        if (timer != null) {
            timer.cancel();
            timer = null;
        }
        record.setBackgroundResource(R.drawable.icontrans);
        submit.setVisibility(View.INVISIBLE);
        delete.setVisibility(View.INVISIBLE);
        textDelete.setVisibility(View.INVISIBLE);
        textSubmit.setVisibility(View.INVISIBLE);
        add.setVisibility(View.INVISIBLE);
        recording = false;
    }

    private void pauseTimer() {
        if (timer != null) {
            timer.cancel();
            timer = null;
        }
        record.setBackgroundResource(android.R.drawable.ic_media_play);
        recording = false;
    }


    private void startTimer() {
        timer = new Timer();
        myTimerTask = new MyTimerTask();
        timer.schedule(myTimerTask, 1000, 1000);
        recording = true;
    }


    private File createImageFile() throws IOException {
        // Create an image file name
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date());
        String imageFileName = "JPEG_" + timeStamp + "_";
        File storageDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES);
        File image = File.createTempFile(
                imageFileName,  /* prefix */
                ".jpg",         /* suffix */
                storageDir      /* directory */
        );

        // Save a file: path for use with ACTION_VIEW intents
        mCurrentPhotoPath = "file:" + image.getAbsolutePath();
        return image;
    }


    static final int REQUEST_TAKE_PHOTO = 0;
    static final int REQUEST_VIDEO_CAPTURE = 1;
    static final int REQUEST_TEXT = 2;
    static final int REQUEST_DESCRIPTION = 3;

    static final int START_SEGMENT = 0;
    static final int END_SEGMENT = 1;
    static final int TEXT = 2;
    static final int PHOTO = 3;
    static final int VIDEO = 4;

    private void dispatchTakePictureIntent() {
        Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        // Ensure that there's a camera activity to handle the intent
        if (takePictureIntent.resolveActivity(getPackageManager()) != null) {
            photoFile = null;
            try {
                photoFile = createImageFile();
            } catch (IOException ex) {

            }
            // Continue only if the File was successfully created
            if (photoFile != null) {
                takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, Uri.fromFile(photoFile));
                startActivityForResult(takePictureIntent, REQUEST_TAKE_PHOTO);
            }
        }
    }


    private void dispatchTakeVideoIntent() {
        Intent takeVideoIntent = new Intent(MediaStore.ACTION_VIDEO_CAPTURE);
        if (takeVideoIntent.resolveActivity(getPackageManager()) != null) {
            startActivityForResult(takeVideoIntent, REQUEST_VIDEO_CAPTURE);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        int memoryType = TEXT;
        if (requestCode == REQUEST_VIDEO_CAPTURE && resultCode == RESULT_OK) {
            memoryType = VIDEO;
            Uri videoUri = data.getData();

            String[] proj = { MediaStore.Video.Media.DATA };
            String result = null;

            CursorLoader cursorLoader = new CursorLoader(
                    this,
                    videoUri, proj, null, null, null);
            Cursor cursor = cursorLoader.loadInBackground();

            if(cursor != null) {
                int column_index = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DATA);
                cursor.moveToFirst();
                result = cursor.getString(column_index);
            }
            File f = new File(result);
            saveFiletoDrive(f, MIME_VIDEO);
            tempMemoryType = memoryType;
            openTextActivity(REQUEST_DESCRIPTION);
            //videoView.setVideoURI(videoUri);
        } else if (requestCode == REQUEST_TAKE_PHOTO && resultCode == RESULT_OK) {
            memoryType = PHOTO;
            saveFiletoDrive(photoFile, MIME_PHOTO);
            tempMemoryType = memoryType;
            openTextActivity(REQUEST_DESCRIPTION);

            //mImageView.setImageBitmap(imageBitmap);
        } else if (requestCode == REQUEST_TEXT && resultCode == RESULT_OK) {
            description = data.getStringExtra("description");
            memoryType = TEXT;
            createMoment(memoryType);
        }
        else if (requestCode == REQUEST_DESCRIPTION){
            description = data.getStringExtra("description");
            createMoment(tempMemoryType);
        }
        else if (requestCode == RESOLVE_CONNECTION_REQUEST_CODE){
            mGoogleApiClient.connect();
        }

    }


    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.menu_main, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle action bar item clicks here. The action bar will
        // automatically handle clicks on the Home/Up button, so long
        // as you specify a parent activity in AndroidManifest.xml.
        int id = item.getItemId();

        //noinspection SimplifiableIfStatement
        if (id == R.id.action_settings) {
            return true;
        }

        return super.onOptionsItemSelected(item);
    }

    @Override
    protected void onPause() {
        mMapView.pause();
        super.onPause();
    }


    @Override
    protected void onResume() {
        super.onResume();
        mMapView.resume();

        }


    public class MyTimerTask extends TimerTask {

        @Override
        public void run() {
            ctr++;
            int hours = ctr / 3600;
            int minutes = (ctr / 60) % 60;
            int seconds = ctr % 60;

            final String strDate = padTime(hours) + ":" + padTime(minutes) + ":" + padTime(seconds);
            runOnUiThread(new Runnable() {

                @Override
                public void run() {
                    textCounter.setText(strDate);
                }
            });
        }
    }

    private static String padTime(int t) {
        if (t < 10) {
            return "0" + String.valueOf(t);
        } else {
            return String.valueOf(t);
        }
    }
}
