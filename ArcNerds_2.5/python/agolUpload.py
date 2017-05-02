"""
A sample script that uses WeeWx to upload data from a
weather station to ArcGIS Online

********************************************************************************

To use this script, add the following somewhere in your configuration file
weewx.conf:

[AgolUpload]
  agol_service_url = "http://<service_url>/addFeatures"
  client_id = <client_id>
  client_secret = <client_secret>
  station_id = <station_id>

********************************************************************************
"""

import time
import syslog
import requests
from requests.exceptions import ConnectionError

import weewx
from weewx.engine import StdService

import datetime
import pytz

# Inherit from the base class StdService:
class AgolUpload(StdService):

    def __init__(self, engine, config_dict):
        # Pass the initialization information on to my superclass:
        super(AgolUpload, self).__init__(engine, config_dict)

        try:
            # Dig the needed options out of the configuration dictionary.
            # If a critical option is missing, an exception will be raised and
            # the alarm will not be set.
            self.service    = config_dict['AgolUpload']['agol_service_url']
            self.client_id       = config_dict['AgolUpload']['client_id']
            self.client_secret   = config_dict['AgolUpload']['client_secret']
            self.station_id = int(config_dict['AgolUpload'].get('station_id', 1))
            self.username       = config_dict['AgolUpload'].get('username', None)
            self.password   = config_dict['AgolUpload'].get('password', None)
            syslog.syslog(syslog.LOG_INFO, "AGOL test: {0}, {1}, {2}, {3}]".format(self.service,
                                                                                   self.client_id,
                                                                                   self.client_secret,
                                                                                   self.station_id))

            # If we got this far, it's ok to start intercepting events:
            self.bind(weewx.NEW_ARCHIVE_RECORD, self.newArchiveRecord)    # NOTE 1

        except ValueError as e:
            syslog.syslog(syslog.LOG_INFO, "Failed to initialize service. %s" % e)

    def newArchiveRecord(self, event):
        """Gets called on a new archive record event."""
        syslog.syslog(syslog.LOG_INFO, "Record. %s" % event.record)

        try:
            token = ""
            if self.username:
                token = self.get_agol_token_user(self.username, self.password)
            else:
                token = self.get_agol_token(self.client_id, self.client_secret)
            feature_json = self.format_attributes(event.record)
            add_features_params = {'f': 'json', 'token': token, 'features': feature_json}
            data = requests.post(self.service, params=add_features_params)
            syslog.syslog(syslog.LOG_INFO, "result: %s" % data.text)
        except KeyError as key:
            syslog.syslog(syslog.LOG_INFO, "Lookup error: %s" % key)
        except ConnectionError as conn_error:
            syslog.syslog(syslog.LOG_INFO, "Error occured connecting to service: %s" % conn_error)
        except Exception as e:
            syslog.syslog(syslog.LOG_INFO, "General error occured: %s" % e)

    def format_attributes(self, rec):

        epoch = datetime.datetime.fromtimestamp(int(rec['dateTime']), pytz.utc)
        day_epoch = self.get_day_epoch(epoch)
        week_epoch = self.get_week_epoch(epoch)
        month_epoch = self.get_month_epoch(epoch)
        year_epoch = self.get_year_epoch(epoch)

        atts = '[{"attributes": {'
        atts += self.get_attribute('usUnits', rec['usUnits'], False) + ', '
        atts += self.get_attribute('interval', rec['interval'], False) + ', '
        atts += self.get_attribute('barometer', rec['barometer'], False) + ', '
        atts += self.get_attribute('pressure', rec['pressure'], False) + ', '
        atts += self.get_attribute('altimeter', rec['altimeter'], False) + ', '
        atts += self.get_attribute('outTemp', rec['outTemp'], False) + ', '
        atts += self.get_attribute('outHumidity', rec['outHumidity'], False) + ', '
        atts += self.get_attribute('windSpeed', rec['windSpeed'], False) + ', '
        atts += self.get_attribute('windDir', rec['windDir'], False) + ', '
        atts += self.get_attribute('rainRate', rec['rainRate'], False) + ', '
        atts += self.get_attribute('rain', rec['rain'], False) + ', '
        atts += self.get_attribute('windGustDir', rec['windGustDir'], False) + ', '
        atts += self.get_attribute('dewpoint', rec['dewpoint'], False) + ', '
        atts += self.get_attribute('windchill', rec['windchill'], False) + ', '
        atts += self.get_attribute('heatindex', rec['heatindex'], False) + ', '
        atts += self.get_attribute('rxCheckPercent', rec['rxCheckPercent'], False) + ', '
        atts += self.get_attribute('windGust', rec['windGust'], False) + ', '
        atts += self.get_attribute('date_epoch', rec['dateTime'], False) + ', '
        atts += self.get_attribute('station_id', self.station_id, False) + ', '
        atts += self.get_attribute('week_epoch', week_epoch, False) + ', '
        atts += self.get_attribute('month_epoch', month_epoch, False) + ', '
        atts += self.get_attribute('year_epoch', year_epoch, False) + ', '
        atts += self.get_attribute('day_epoch', day_epoch, False)
        atts += '}}]'

        return atts

    def get_attribute(self, att_name, att_value, is_string):
        if att_value is None:
            return '"{0}": null'.format(att_name)

        if is_string:
            return '"{0}": "{1}"'.format(att_name, att_value)

        return '"{0}": {1}'.format(att_name, att_value)

    def get_agol_token_user(self, user, password):
        syslog.syslog(syslog.LOG_INFO, "Get token using username and password.")
        token = requests.post('https://www.arcgis.com/sharing/rest/generateToken', params={
            'f': 'json',
            'username': user,
            'password': password,
            'expiration': '1440'
        })

        syslog.syslog(syslog.LOG_INFO, "%s" % token.json())
        access_token = token.json()['token']
        return access_token

    def get_agol_token(self, client_id, client_secret):
        syslog.syslog(syslog.LOG_INFO, "Get token using oauth2.")
        token = requests.post('https://www.arcgis.com/sharing/rest/oauth2/token/', params={
            'f': 'json',
            'client_id': client_id,
            'client_secret': client_secret,
            'grant_type': 'client_credentials',
            'expiration': '1440'
        })

        access_token = token.json()['access_token']
        return access_token

    def get_day_epoch(self, d):
        epoch_1970 = datetime.datetime(1970, 1, 1)
        return int((datetime.datetime(d.year, d.month, d.day, 0, 0, 0) - epoch_1970).total_seconds())

    def get_month_epoch(self, d):
        epoch_1970 = datetime.datetime(1970, 1, 1)
        return int((datetime.datetime(d.year, d.month, 1, 0, 0, 0) - epoch_1970).total_seconds())

    def get_year_epoch(self, d):
        epoch_1970 = datetime.datetime(1970, 1, 1)
        return int((datetime.datetime(d.year, 1, 1, 0, 0, 0) - epoch_1970).total_seconds())

    def get_week_epoch(self, d):
        epoch_1970 = datetime.datetime(1970, 1, 1)
        return int((datetime.datetime(d.year, d.month, d.day, 0, 0, 0) -
                    epoch_1970).total_seconds() - (86400 * d.weekday()))

if __name__ == '__main__':
    """This section is used for testing the code. """
    import sys
    import configobj
    from optparse import OptionParser

    usage_string ="""Usage:

    agol.py config_path

    Arguments:

      config_path: Path to weewx.conf"""
    parser = OptionParser(usage=usage_string)
    (options, args) = parser.parse_args()

    if len(args) < 1:
        sys.stderr.write("Missing argument(s).\n")
        sys.stderr.write(parser.parse_args(["--help"]))
        exit()

    config_path = args[0]

    weewx.debug = 1

    try :
        config_dict = configobj.ConfigObj(config_path, file_error=True)
    except IOError:
        print "Unable to open configuration file ", config_path
        exit()

    if 'AgolUpload' not in config_dict:
        print >>sys.stderr, "No [AgolUpload] section in the configuration file %s" % config_path
        exit(1)

    engine = None
    agolUpload = AgolUpload(engine, config_dict)

    rec = {'sensor_id': 202.0, 'outHumidity': 68.11111111111111,
           'maxSolarRad': None, 'altimeter': 29.823221685949683,
           'heatindex': 52.2, 'inDewpoint': None, 'rain_total': 6.0452,
           'channel': None, 'inTemp': 64.148, 'barometer': 29.833421107623444,
           'windchill': 52.2, 'dewpoint': 42.00258940579695, 'windrun': 13.919082015408213,
           'rain': 0.0, 'humidex': 52.2, 'pressure': 29.637920850561137,
           'sensor_battery': 0.0, 'rxCheckPercent': 100.0,
           'ET': None, 'rainRate': 0.0,
           'usUnits': 1, 'txTempBatteryStatus': 0.0,
           'appTemp': 49.96160682651161, 'interval': 5,
           'dateTime': 1462209300.0, 'windDir': 188.19954278902236,
           'outTemp': 52.2,
           'windSpeed': 0.7995959841454, 'windGust': 1.6501133374752,
           'rssi': 3.0, 'windGustDir': None, 'cloudbase': 2498.0395113643303}

    event = weewx.Event(weewx.NEW_ARCHIVE_RECORD, record=rec)
    agolUpload.newArchiveRecord(event)
