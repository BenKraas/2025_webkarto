# Simple nginx container for serving static files
FROM nginx:alpine

# Copy static files
COPY src/ /usr/share/nginx/html/

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]