#!/bin/bash

ICON="build/icon.png"
ICONSET="build/icon.iconset"

mkdir -p $ICONSET

# Resize to standard sizes
sips -s format png -z 16 16     $ICON --out "${ICONSET}/icon_16x16.png"
sips -s format png -z 32 32     $ICON --out "${ICONSET}/icon_16x16@2x.png"
sips -s format png -z 32 32     $ICON --out "${ICONSET}/icon_32x32.png"
sips -s format png -z 64 64     $ICON --out "${ICONSET}/icon_32x32@2x.png"
sips -s format png -z 128 128   $ICON --out "${ICONSET}/icon_128x128.png"
sips -s format png -z 256 256   $ICON --out "${ICONSET}/icon_128x128@2x.png"
sips -s format png -z 256 256   $ICON --out "${ICONSET}/icon_256x256.png"
sips -s format png -z 512 512   $ICON --out "${ICONSET}/icon_256x256@2x.png"
sips -s format png -z 512 512   $ICON --out "${ICONSET}/icon_512x512.png"
sips -s format png -z 1024 1024 $ICON --out "${ICONSET}/icon_512x512@2x.png"

# Convert to icns
iconutil -c icns $ICONSET

# Clean up
rm -rf $ICONSET
echo "Icon generated at build/icon.icns"
