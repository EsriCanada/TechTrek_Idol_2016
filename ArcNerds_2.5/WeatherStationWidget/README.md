#Weather Station Widget

This is a custom ArcGIS Web App Builder (Developer Edition) widget. It is designed to work with a Weather Station feature service in an ArcGIS Online Web Map. The widget pulls and summarizes weather data from a table related to a Weather Station feature service. Below is a sample of the widgets' user interface. This widget was created internally as part of a project to educate students on using a microcomputer (Rasberry Pi) to pull weather data  from a weather station and push it to a RESTful service using python and a REST API. Check out the full scope of the project here:

<Change project name, add URL in brackets>
[Project Name Here]()

<Add screenshot of Widget in Action>
![Widget UI](./README_img/WidgetUI.PNG?raw=true)

##Installing The Widget

###1 - Install Web App Builder (Developer Edition)

In order to install this widget you will need to install the ArcGIS Web App Builder (Developer Edition). The installation requires an ArcGIS Online Subscription account. You can start a free 60-day trial by contacting Esri [here](http://www.arcgis.com/features/free-trial.html?origin=arcgis).

Steps to [install Web App Builder (Developer Edition)](https://developers.arcgis.com/web-appbuilder/guide/getstarted.htm).

###2 - Download the Widget Code

Download a zipped copy of the source code from this repository to your Web App Builder machine. Once extracted, place the **WeatherStationWidget** folder in the appropriate location inside the Web App Builder (Developer Edition) directory:


C:\Users\\\<local user>\Documents\WebAppBuilderForArcGIS\\**client\stemapp\widgets**

###3 - Add the Widget to an Application

Follow the steps on Esri's Developer site to [create a New App](https://developers.arcgis.com/web-appbuilder/guide/build-your-first-app.htm) and [Adding a Widget](https://developers.arcgis.com/web-appbuilder/guide/widgets-tab.htm) to an application. You should see the option for the icon for Weather Station Widget in the widget list.

<Add screenshot of Widget in Widget List>
![Photo of Widget List](http://placehold.it/350x150)

###4 - Modify the Configuration

Once you select the widget from the widget list you will need to modify the configuration parameters to use the appropriate Weather Station feature service. Below is a key - value map to help you out.

<Add screenshot of Config Page>
![Photo of Config Page](./README_img/Configuration.png?raw=true)

* **weatherDataService** - URL of Feature Service containing weather data related to the Weather Station feature service
* **date_epoch** - The name of the Date field (formatted as epoch time) from the *weatherDataService* REST endpoint.
* **station_id** - The name of the station_id field from the *weatherDataService* REST endpoint. This id associates weather data with   the appropriate weather station in the map.
* **barometer** - The name of the barometer field from the *weatherDataService* REST endpoint.
* **pressure** - The name of the pressure field from the *weatherDataService* REST endpoint.
* **altimeter** - The name of the altimeter field from the *weatherDataService* REST endpoint.
* **outTemp** - The name of the outside temperature field from the *weatherDataService* REST endpoint.
* **outHumidity** - The name of the outdoor humidity field from the *weatherDataService* REST endpoint.
* **windSpeed** - The name of the wind speed field from the *weatherDataService* REST endpoint.
* **windDir** - The name of the wind direction field from the *weatherDataService* REST endpoint.
* **windGust** - The name of the wind gust field from the *weatherDataService* REST endpoint.
* **windGustDir** - The name of the wind gust direction field from the *weatherDataService* REST endpoint.
* **rainRate** - The name of the rain rate field from the *weatherDataService* REST endpoint.
* **rain** - The name of the rainfall field from the *weatherDataService* REST endpoint.
* **dewPoint** - The name of the dew point field from the *weatherDataService* REST endpoint.
* **windChill"** - The name of the wind chill field from the *weatherDataService* REST endpoint.
* **heatIndex** - The name of the heat index field from the *weatherDataService* REST endpoint.
* **stationLayer** - The display name of the weather station layer is it appears in the Layer List of the web map chosen for the application.
