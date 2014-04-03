#!/bin/bash

echo "$JPM_FIREFOX_BINARY"
if [ -f $JPM_FIREFOX_BINARY ];
then
   echo "File $FILE exists"
else
   echo "File $FILE does not exists"
fi
