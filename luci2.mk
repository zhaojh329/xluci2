LUCI2_NAME?=$(notdir ${CURDIR})
LUCI2_TYPE?=$(word 2,$(subst -, ,$(LUCI2_NAME)))
LUCI2_DEFAULTS:=$(notdir $(wildcard ${CURDIR}/root/etc/uci-defaults/*))

# Submenu titles
LUCI2_MENU.theme=Themes
LUCI2_MENU.app=Applications

PKG_NAME?=$(LUCI2_NAME)

PKG_RELEASE?=1

include $(INCLUDE_DIR)/package.mk

define Package/$(PKG_NAME)
  SECTION:=luci2
  CATEGORY:=LuCI2
  SUBMENU:=$(if $(LUCI2_MENU.$(LUCI2_TYPE)),$(LUCI2_MENU.$(LUCI2_TYPE)),$(LUCI2_MENU.app))
  TITLE:=$(if $(LUCI2_TITLE),$(LUCI2_TITLE),LuCI $(LUCI2_NAME) $(LUCI2_TYPE))
  DEPENDS:=$(LUCI2_DEPENDS)
endef

ifneq ($(LUCI2_DESCRIPTION),)
 define Package/$(PKG_NAME)/description
   $(strip $(LUCI2_DESCRIPTION))
 endef
endif

define Build/Prepare
	for d in share htdocs root src; do \
	  if [ -d ./$$$$d ]; then \
	    mkdir -p $(PKG_BUILD_DIR)/$$$$d; \
		$(CP) ./$$$$d/* $(PKG_BUILD_DIR)/$$$$d/; \
	  fi; \
	done
	$(call Build/Prepare/Default)
endef

define Build/Configure
endef

# src/Makefile示例:
#OBJ=test
#%.o: %.c
#	$(CC) $(CPPFLAGS) $(CFLAGS) $(FPIC) -c -o $@ $<
#
#compile: test.o
#	$(CC) $(LDFLAGS) -shared test.o -o $(OBJ)
#
#install: compile
#	mkdir -p $(DESTDIR)/usr/sbin
#	cp $(OBJ) $(DESTDIR)/usr/sbin/$(OBJ)
#
#clean:
#	rm -f *.o $(OBJ)
	
ifneq ($(wildcard ${CURDIR}/src/Makefile),)
 MAKE_PATH := src/

 define Build/Compile
	$(call Build/Compile/Default,clean compile)
 endef
else
 define Build/Compile
 endef
endif

HTDOCS = /www
SHARE = /usr/share/rpcd

define Package/$(PKG_NAME)/install
	if [ -d $(PKG_BUILD_DIR)/share ]; then \
	  $(INSTALL_DIR) $(1)$(SHARE); \
	  cp -pR $(PKG_BUILD_DIR)/share/* $(1)$(SHARE)/; \
	else true; fi
	if [ -d $(PKG_BUILD_DIR)/htdocs ]; then \
	  $(INSTALL_DIR) $(1)$(HTDOCS); \
	  cp -pR $(PKG_BUILD_DIR)/htdocs/* $(1)$(HTDOCS)/; \
	else true; fi
	if [ -d $(PKG_BUILD_DIR)/root ]; then \
	  $(INSTALL_DIR) $(1)/; \
	  cp -pR $(PKG_BUILD_DIR)/root/* $(1)/; \
	else true; fi
	if [ -d $(PKG_BUILD_DIR)/src ]; then \
	  $(call Build/Install/Default) \
	  $(CP) $(PKG_INSTALL_DIR)/* $(1)/; \
	else true; fi
endef

define Package/$(PKG_NAME)/postinst
[ -n "$${IPKG_INSTROOT}" ] || {$(foreach script,$(LUCI2_DEFAULTS),
	(. /etc/uci-defaults/$(script)) && rm -f /etc/uci-defaults/$(script))
	exit 0
}
endef

$(eval $(call BuildPackage,$(PKG_NAME)))