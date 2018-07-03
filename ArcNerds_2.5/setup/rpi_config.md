#Raspberry Pi Configuration

This section outlines the steps used to configure the Raspberry Pi for this project.  Most of these steps can be done with a keyboard, mouse and monitor directly connected to the Raspberry Pi.  However, it is recommended to connect the Raspberry Pi to your network and access the device using a Secure Shell client like PuTTY or SSH.

##Step 1:  Download Raspbian and prepare SD card

WeeWx is supported on several Linux platforms.  For this project, the latest Raspbian Jessie Lite release was used.  Raspbian is currently available on the Raspberry Pi downloads page:

<a href="https://www.raspberrypi.org/downloads/raspbian/">https://www.raspberrypi.org/downloads/raspbian/</a>

The Raspberry Pi documentation provides additional steps for writing the downloaded image file to an SD Card.  The SD card should have a minimum of 8GB.  The following Raspberry Pi documentation provides steps for installing the image using a Linux, Windows or Mac OS client:

<a href="https://www.raspberrypi.org/documentation/installation/installing-images/README.md">https://www.raspberrypi.org/documentation/installation/installing-images/README.md</a>

##Step 2:  Change the default user's password

All installations of Raspian create a default user called 'pi' with a password of 'raspberry'.  You should change this password before proceeding with any additional steps.

1. Launch raspi-config:
<pre>
sudo raspi-config
</pre>
![change-passwd-1](./setup_img/change_passwd_1.png?raw=true)

2. Select: <b>Change User Password</b>
![change-passwd-2](./setup_img/change_passwd_2.png?raw=true)

3. Select <b>&lt;Ok&gt;</b>

4. When prompted, provide new password.
![change-passwd-3](./setup_img/change_passwd_3.png?raw=true)

##Step 3:  Expand Filesystem

Depending on the size of the SD Card used to store the OS image, it is possible that much of that memory remains unallocated.  Use the following steps to expand the filesystem:

1. Launch raspi-config:
<pre>
sudo raspi-config
</pre>
![raspi-config](./setup_img/raspi_config.png?raw=true)

2. Select: <b>Expand Filesystem</b>
![Partition Resized](./setup_img/partition_resized.png?raw=true)

3. Select <b>&lt;Finish&gt;</b>

4. When prompted, select Yes to reboot.

##Step 4 (Optional):  Install and setup a simple Firewall

It is a good idea to install a firewall on any Raspberry Pi device used as a server or connected to the internet.  The following steps will install and configure the Uncomplicated Firewall (ufw).  If you are remotely connected to the device using an SSH client, it is important to add a firewall rule to allow connections on port 22.  These steps will configure the firewall to allow connections on port 22, 80 (HTTP) and 443 (HTTPs).

1. Download the current installation package list:
<pre>
sudo apt-get update
</pre>

2. Install the uncomplicated firewall (ufw):
<pre>
sudo apt-get install ufw
</pre>

3. Configure the firewall to allow SSH, HTTP and HTTPs:
<pre>
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
</pre>

4. Enable the firewall:
<pre>
sudo ufw enable
</pre>

##Step 5:  Create a user to own and run the weewx software

1. Run the following command to create the user:
<pre>
sudo adduser weewx
</pre>

2. When prompted, provide a password.

3. The new user will need to be in the sudoers group to install weewx.  To add the user to sudoers:
<pre>
sudo visudo
</pre>

4. At the end of the file add:
<pre>
weewx ALL=(ALL) PASSWD: ALL
</pre>

5.  Select Ctrl+X to save and exit file.

6.  Exit your current session and log in as the new weewx user.

##Step 6:  Download and install WeeWX software

The following link contains complete instructions for downloading and installing WeeWX on Debian-based systems like Raspian:
<a href="http://www.weewx.com/docs/debian.htm">weewx: Installation on Debian-based systems</a> <br />
http://www.weewx.com/docs/debian.htm

1.  Determine the latest WeeWX debian package.  Currently (Oct 2016) the installs are located at
<a href="http://weewx.com/downloads/">WeeWX: downloads</a> <br />
The latest debian distribution as of October 2016 is weewx_3.6.1-1_all.deb.

2.  Download the latest WeeWX package for Debian based systems.  At the prompt type:
<pre>
wget http://www.weewx.com/downloads/weewx_3.6.1-1_all.deb
</pre>

3.  Run the installation package and follow the instructions:
<pre>
sudo dpkg -i weewx_3.6.1-1_all.deb
</pre>
You may see dependency errors similar to:
<pre>
dpkg: dependency problems prevent configuration of weewx:
 weewx depends on python-configobj (>= 4.5); however:
  Package python-configobj is not installed.
 weewx depends on python-cheetah (>= 2.0); however:
  Package python-cheetah is not installed.
 weewx depends on python-imaging (>= 1.1.6); however:
  Package python-imaging is not installed.
 weewx depends on python-serial (>= 2.3); however:
  Package python-serial is not installed.
 weewx depends on python-usb (>= 0.4); however:
  Package python-usb is not installed.
dpkg: error processing package weewx (--install):
 dependency problems - leaving unconfigured
Processing triggers for systemd (215-17+deb8u5) ...
Errors were encountered while processing:
 weewx
</pre>
If you do see dependency errors, run the following commands:
<pre>
sudo apt-get update
sudo apt-get -f install
</pre>

4.  Shutdown the Raspberry Pi:
<pre>
sudo shutdown -h now
</pre>
Once the device has stopped, plug in the USB cable for the weather station and restart the device.

5.  You can check the system logs to see if WeeWX is working.  
<pre>
sudo tail -f /var/log/syslog
</pre>
Every 5 minutes you should see messages like:
<pre>
weewx[661]: manager: added record 2016-10-28 14:55:00 UTC (1477666500) to database 'weewx.sdb'
weewx[661]: manager: added record 2016-10-28 14:55:00 UTC (1477666500) to daily summary in 'weewx.sdb'
weewx[661]: cheetahgenerator: Generated 14 files for report StandardReport in 3.46 seconds
weewx[661]: genimages: Generated 49 images for StandardReport in 3.58 seconds
weewx[661]: reportengine: copied 9 files to /var/www/html/weewx
</pre>

6.  Confirm that the html reports are being created.
By default, the html reports are being written to /var/www/html/weewx.  These files should be updated every 5 minutes.

##Step 7:  Install a Web Server to access the WeeWX reports

By default, WeeWX generates HTML reports summarizing the current weather conditions every 5 minutes.  You can setup a web server so that you can view this information remotely.  The following instructions walk through installing and configuring a web server called NGINX on your raspberry pi.

1.  Install NGINX:
<pre>
sudo apt-get install nginx
</pre>

2.  Open a browser to http://my_raspberrypi_ip_address/weewx to test the site.
