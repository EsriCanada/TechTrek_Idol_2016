# telepath
_Team members: Cameron Plouffe, Michael Luubert, Krista Amolins_

## What is telepath?
* Telepath is an Android app to record your paths and capture memories through pictures, video and text. A Web app is also available retrace your path and share your memories with friends.
* The path is represented as a polyline and the moments are represented as points with an attribute pointing to the URL of the associated photos or videos.
* You can view the Web app with some sample paths [here](https://luubert.github.io/TechTrek_Idol_2016/telepath/Web%20App/all-paths.html). 

## Requirements for setting up telepath
* An ArcGIS Online account for storing the path and moment feature services
* A Google account for storing photos and videos on Google Drive

## ArcGIS Online Configuration
* Download the two shapefiles from the Shapefiles folder and publish them to ArcGIS Online
* Share the two feature services publicly and make them editable

## Android app
* The Android app is not currently available on the Google Play Store, but the code is available in the Android app folder. You will need Android Studio to build the app and transfer it to your phone.
* Go [here](https://developers.google.com/drive/android/auth) for instruction how to authorize the telepath Android apps to work with your Google Drive account.
* You also need to update the following lines of code of the MainActivity.java file:
    * Line 290 with the email associated with your Google Drive account 
    * Line 472, 488, and 505 with the URL of the feature services you published to ArcGIS Online

## Web App
* The code behind the Web app is available in the Web app folder. To deploy the app on your server you will need to update the following:

all-paths.html
* Change lines 99 and 102 to the URL of your Path and Moment feature services

main.js
* Change lines 112 and 113 to the URL of your Path and Moment feature services

## Technology stack
* ArcGIS Online
* ArcGIS Runtime SDKs (Android)
* ArcGIS API for JavaScript
* Standard Web stuff (HTML, SASS, Grunt/Gulp, other JS libraries, etc.)