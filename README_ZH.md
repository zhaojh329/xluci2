# xLuCI2([github](https://github.com/zhaojh329/xluci2))

![](https://img.shields.io/badge/license-GPLV3-brightgreen.svg?style=plastic "License")

xLuCI2基于原LuCI2，修复大量bug，新增动态换肤和动态语言切换。

![](https://github.com/zhaojh329/xluci2/blob/master/image/demo_zh1.png)
![](https://github.com/zhaojh329/xluci2/blob/master/image/demo_zh2.png)
![](https://github.com/zhaojh329/xluci2/blob/master/image/demo_zh3.png)
![](https://github.com/zhaojh329/xluci2/blob/master/image/demo_zh4.png)
![](https://github.com/zhaojh329/xluci2/blob/master/image/demo_zh5.png)
![](https://github.com/zhaojh329/xluci2/blob/master/image/demo_zh6.png)
![](https://github.com/zhaojh329/xluci2/blob/master/image/demo_zh7.png)
![](https://github.com/zhaojh329/xluci2/blob/master/image/demo_zh8.png)

# 特性
* 基于bootstrap框架
* 前端通过调用后台注册的ubus进行数据交互
* 动态换肤
* 动态语言切换
* 多用户权限控制(只读、可写、不可见)

# 使用方法
	
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

# 贡献代码

xLuCI2使用github托管其源代码，贡献代码使用github的PR(Pull Request)的流程，十分的强大与便利:

1. [创建 Issue](https://github.com/zhaojh329/xluci2/issues/new) - 对于较大的
	改动(如新功能，大型重构等)最好先开issue讨论一下，较小的improvement(如文档改进，bugfix等)直接发PR即可
2. Fork [xluci2](https://github.com/zhaojh329/xluci2) - 点击右上角**Fork**按钮
3. Clone你自己的fork: ```git clone https://github.com/$userid/xluci2.git```
4. 创建dev分支，在**dev**修改并将修改push到你的fork上
5. 创建从你的fork的**dev**分支到主项目的**dev**分支的[Pull Request] -  
	[在此](https://github.com/zhaojh329/xluci2)点击**Compare & pull request**
6. 等待review, 需要继续改进，或者被Merge!

# 技术交流
QQ群：153530783

# 如果该项目对您有帮助，请随手star，谢谢！
