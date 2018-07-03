#WeeWx service to upload Weather Station data to ArcGIS Online

This script periodically updates an ArcGIS Online feature service maintaining data from a home-use weather station.  

This script was built to run as a <a href="http://www.weewx.com/">WeeWX</a> service running on a Raspberry Pi.  WeeWx is python based software that extracts data from a weather station on a configured interval.  Custom python code can be written to perform additional tasks when WeeWX reads data from the Weather Station.

##Configuring agolUpload.py

This code was created using WeeWX running in Raspian on a Raspberry Pi device.  However, it should be able to run on any environments supported by WeeWX.  To run this code you will need to:

###1.  Install WeeWX

The following link contains instructions on downloading and installing WeeWX on Debian-based systems like Raspian:
<a href="http://www.weewx.com/docs/debian.htm">weewx: Installation on Debian-based systems</a> <br />
http://www.weewx.com/docs/debian.htm

###2.  Configure python

This script uses <a href="http://www.python-requests.org/en/latest/">Python Requests</a> to send HTTP requests and <a href="https://pypi.python.org/pypi/pytz?">pytz</a> for creating timestamps.  To install these packages run:

<pre>
sudo pip install requests
sudo pip install pytz
</pre>

###3.  Copy script to WeeWX /usr/share/weewx/user folder

###4.  Register service in /etc/weewx/weewx.conf

Add the following lines to the end of the /etc/weewx/weewx.conf file:

<pre>
[AgolUpload]
  agol_service_url = "http://[service_url]/FeatureServer/[layer_id]/addFeatures"
  client_id = "[client_id]"
  client_secret = "[client_secret]"
  station_id = [station_id]
</pre>  

where:

<b>service_url</b>: the URL to the ArcGIS Online Feature Service maintaining weather station data.<br/>
<b>layer_id:</b> the layer id of the Feature Layer that maintains the weather station data. <br/>
<b>client_id:</b> the registered client ID for the Application. <br/>
<b>client_secret:</b>  the registered credentials for token generation. <br/>
<b>station_id:</b>  the registered station ID for the weather station. <br/>


Finally, you will need to configure WeeWx to load the service.  Add a reference for user.agolUpload.AgolUpload to the list of report_services in the [Engine][[Services]] section of the weewx.conf file:

<pre>
[Engine]
    [[Services]]
        report_services = weewx.engine.StdPrint, weewx.engine.StdReport, user.agolUpload.AgolUpload
</pre>

###Resources:

WeeWX Customization guide<br />
<a href="http://www.weewx.com/docs/customizing.htm">http://www.weewx.com/docs/customizing.htm</a>

WeeWX Customizing a service<br />
<a href="http://www.weewx.com/docs/customizing.htm#Customizing_a_service">http://www.weewx.com/docs/customizing.htm#Customizing_a_service</a>

Implementing App Login<br />
<a href="https://developers.arcgis.com/authentication/accessing-arcgis-online-services/">https://developers.arcgis.com/authentication/accessing-arcgis-online-services/</a>
