#!/bin/sh

# Replace environment variables in built files
# This allows runtime configuration of the React app

if [ -f /usr/share/nginx/html/static/js/*.js ]; then
    # Replace API base URL if provided
    if [ ! -z "$REACT_APP_API_BASE_URL" ]; then
        find /usr/share/nginx/html/static/js -name "*.js" -exec sed -i "s|http://localhost:3001/api|$REACT_APP_API_BASE_URL|g" {} \;
    fi
fi

# Start nginx
exec "$@"