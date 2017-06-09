cmake_minimum_required(VERSION 2.6)

PROJECT(luci2-plugin C)

ADD_DEFINITIONS(-Os -Wall -Werror --std=gnu99 -g3 -Wmissing-declarations -Iinclude)

SET(CMAKE_SHARED_LIBRARY_LINK_C_FLAGS "")

IF(APPLE)
  INCLUDE_DIRECTORIES(/opt/local/include)
  LINK_DIRECTORIES(/opt/local/lib)
ENDIF()

FIND_LIBRARY(crypt NAMES crypt)
IF(crypt STREQUAL "LIBS-NOTFOUND")
  SET(crypt "")
ENDIF()

ADD_LIBRARY(luci2-plugin MODULE luci2.c)
TARGET_LINK_LIBRARIES(luci2-plugin ubox ubus ${crypt})
SET_TARGET_PROPERTIES(luci2-plugin PROPERTIES OUTPUT_NAME luci2 PREFIX "")

ADD_LIBRARY(bwmon-plugin MODULE bwmon.c)
SET_TARGET_PROPERTIES(bwmon-plugin PROPERTIES OUTPUT_NAME bwmon PREFIX "")

INSTALL(TARGETS luci2-plugin bwmon-plugin LIBRARY DESTINATION lib)
