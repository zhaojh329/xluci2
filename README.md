# DEPRECATED. use [vuci](https://github.com/zhaojh329/vuci)

# xLuCI2([中文](https://github.com/zhaojh329/xluci2/blob/master/README_ZH.md))([github](https://github.com/zhaojh329/xluci2))

![](https://img.shields.io/badge/license-GPLV3-brightgreen.svg?style=plastic "License")

xLuCI2 is a JavaScript Webgui for embedded devices running OpenWRT or LEDE. xLuCI2 based on original [LuCI2](https://wiki.openwrt.org/doc/techref/luci2), 
fix a large number of bug on the basis of the original LuCI2, and added some features: dynamic skin, dynamic switching language, modularization.

![](https://github.com/zhaojh329/xluci2/blob/master/image/demo1.png)
![](https://github.com/zhaojh329/xluci2/blob/master/image/demo2.png)
![](https://github.com/zhaojh329/xluci2/blob/master/image/demo3.png)
![](https://github.com/zhaojh329/xluci2/blob/master/image/demo4.png)
![](https://github.com/zhaojh329/xluci2/blob/master/image/demo5.png)
![](https://github.com/zhaojh329/xluci2/blob/master/image/demo6.png)
![](https://github.com/zhaojh329/xluci2/blob/master/image/demo7.png)
![](https://github.com/zhaojh329/xluci2/blob/master/image/demo8.png)
![](https://github.com/zhaojh329/xluci2/blob/master/image/demo9.png)

# Features
* Based on bootstrap framework(You can write beautiful pages)
* The front end is communicated with the background through UBUS
* Dynamic skin
* Dynamic switching language
* Multi user rights management(read only, invisible, writable)

# Usage on OpenWRT/LEDE
	
	# go to your OpenWRT/LEDE directory
	cd openwrt
	
	# add xLuCI2 feed to feeds conf
	echo "src-git xluci2 https://github.com/zhaojh329/xluci2.git" >> feeds.conf.default
	
	# update your feeds
	./scripts/feeds update -a 
	
	# install all xluci2 packages
	./scripts/feeds install -a -p xluci2

	# select xluci2 packages
	make menuconfig
	LuCI2  --->
		Applications  --->
		Themes  --->
		<*> luci2-base
	
	# compile
	make V=s

# How To Contribute
Feel free to create issues or pull-requests if you have any problems.

**Please read [contributing.md](https://github.com/zhaojh329/xluci2/blob/master/contributing.md)
before pushing any changes.**

# If the project is helpful to you, please do not hesitate to star. Thank you!
