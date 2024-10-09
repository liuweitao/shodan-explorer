#!/bin/sh

# Replace placeholders with environment variables in index.html
sed -i "s|##SHODAN_API_KEY##|${SHODAN_API_KEY}|g" /usr/share/nginx/html/index.html
