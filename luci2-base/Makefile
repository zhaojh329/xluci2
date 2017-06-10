#
# Copyright (C) 2013 Jo-Philipp Wich <jow@openwrt.org>
#
# Licensed under the Apache License, Version 2.0.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci2-base
PKG_VERSION:=2015-02-14
PKG_MAINTAINER:=Jo-Philipp Wich <jow@openwrt.org>

PKG_LICENSE:=Apache-2.0
PKG_LICENSE_FILES:=

PKG_BUILD_PARALLEL:=1

include $(INCLUDE_DIR)/package.mk
include $(INCLUDE_DIR)/cmake.mk

define Build/Prepare
	$(INSTALL_DIR) $(PKG_BUILD_DIR)
	$(CP) ./src/* $(PKG_BUILD_DIR)/
endef

define Package/$(PKG_NAME)
  SECTION:=luci2
  CATEGORY:=LuCI2
  TITLE:=LuCI2 UI modified by zjh
  DEPENDS:=+rpcd +rpcd-mod-file +rpcd-mod-iwinfo +uhttpd +uhttpd-mod-ubus +libubox +libubus +lua-cjson +libubus-lua +libubox-lua
endef

define Package/$(PKG_NAME)/description
 Provides the LuCI2 web interface with standard functionality.
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/www
	$(CP) ./htdocs/* $(1)/www/
	$(INSTALL_DIR) $(1)/usr/share/rpcd
	$(CP) ./share/* $(1)/usr/share/rpcd/
	$(INSTALL_DIR) $(1)/usr/lib/rpcd
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/rpcd/luci2.so $(1)/usr/lib/rpcd/
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/rpcd/bwmon.so $(1)/usr/lib/rpcd/
	$(INSTALL_DIR) $(1)/usr/libexec $(1)/www/cgi-bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/io/luci2-io $(1)/usr/libexec/
	$(LN) /usr/libexec/luci2-io $(1)/www/cgi-bin/luci-upload
	$(LN) /usr/libexec/luci2-io $(1)/www/cgi-bin/luci-backup

	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/luci2.config $(1)/etc/config/luci2

	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_DATA) ./files/luci2.default $(1)/etc/uci-defaults/luci2
endef

define Package/$(PKG_NAME)/postinst
#!/bin/sh

uci set uhttpd.main.index_page="luci2.html"
uci set uhttpd.main.ubus_prefix="/ubus"
uci commit uhttpd

exit 0
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
