#Raspberry Pi Configuration

This section outlines the steps used to configure the Raspberry Pi for this project.

##Step 1:  Download Raspbian and prepare SD card

WeeWx is supported on several Linux platforms.  For this project, the latest Raspbian Jessie Lite release was used.  Raspbian is currently available on the Raspberry Pi downloads page:

<a href="https://www.raspberrypi.org/downloads/raspbian/">https://www.raspberrypi.org/downloads/raspbian/</a>

The Raspberry Pi documentation provides additional steps for writing the downloaded image file to an SD Card.  The SD card should have a minimum of 8GB.  The following Raspberry Pi documentation provides steps for installing the image using a Linux, Windows or Mac OS client:

<a href="https://www.raspberrypi.org/documentation/installation/installing-images/README.md">https://www.raspberrypi.org/documentation/installation/installing-images/README.md</a>

##Step 2:  Expand Filesystem

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
