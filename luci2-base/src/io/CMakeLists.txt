cmake_minimum_required(VERSION 2.6)

PROJECT(luci2-io C)

INCLUDE(CheckFunctionExists)

ADD_DEFINITIONS(-Os -Wall -Werror --std=gnu99 -g3 -Wmissing-declarations)

SET(CMAKE_SHARED_LIBRARY_LINK_C_FLAGS "")

IF(APPLE)
  INCLUDE_DIRECTORIES(/opt/local/include)
  LINK_DIRECTORIES(/opt/local/lib)
ENDIF()

ADD_EXECUTABLE(luci2-io main.c multipart_parser.c)
TARGET_LINK_LIBRARIES(luci2-io ubox ubus)

INSTALL(TARGETS luci2-io RUNTIME DESTINATION sbin)
