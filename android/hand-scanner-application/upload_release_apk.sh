#!/bin/bash

# Check if filename parameter is provided
if [ -z "$1" ]; then
echo "Please provide a filename parameter."
exit 1
fi

filename=$1
key=$filename
directoryPath="app/release"
filePath="app/release/$key"

if [ -e "$filePath" ]; then
echo "File exists: $filePath"
else
echo "File does not exist: $filePath"
apkFiles=$(find "$directoryPath" -type f -name "*.apk")

# Check if any .apk files exist
if [ -n "$apkFiles" ]; then
echo "APK files found in $directoryPath:"
for file in $apkFiles; do
echo "$file"
done

previousPath="$directoryPath/$(basename "$apkFiles")"
echo "Renaming $previousPath"
newPath="$directoryPath/$filename"
mv "$previousPath" "$newPath"
if [ -e "$filePath" ]; then
echo "File Renamed Successfully: $filePath"
else
echo "Could not rename file: $filePath please try again."
exit 1
fi
else
echo "No APK files found in $directoryPath"
fi
fi

bucketName=""

# Get MD5 hash value
md5Value=$(md5 -q "$filePath")
echo "MD5 Value is: $md5Value"

# Uploading to AWS
echo "Uploading to aws..."
aws s3api put-object --bucket "$bucketName" --key "$key" --body "$filePath" --tag "md5=$md5Value"