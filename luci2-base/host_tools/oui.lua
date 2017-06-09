#!/usr/bin/lua
local cjson = require 'cjson'

local list = {}

local cnt

tmp = {}
venders = {
	['Xiaomi Communications Co Ltd'] = 'xiaomi',
	['Apple, Inc'] = 'apple',
	['HUAWEI TECHNOLOGIES'] = 'huawei',
	['GUANGDONG OPPO MOBILE TELECOMMUNICATIONS CORP'] = 'oppo',
	['Samsung Electronics'] = 'samsung'
}

for e in io.lines("oui.txt") do
	tmp[#tmp + 1] = e
end

for i = 1, #tmp do
	if tmp[i]:match("%x+%-%x+%-%x+%s+%(hex%)") then
		for k, v in pairs(venders) do
			if tmp[i]:match(k) then
				list[tmp[i + 1]:match("%S+")] = v
			end
		end
	end
end

print(cjson.encode(list))