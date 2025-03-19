#!/bin/bash

# Build the Docker image
docker build -t tigercareregistry.azurecr.io/fhir-portal:latest .

# Run the container locally
docker run -p 3000:3000 \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e NEXTAUTH_SECRET=your-secret-here \
  -e AZURE_AD_CLIENT_ID=your-client-id \
  -e AZURE_AD_CLIENT_SECRET=your-client-secret \
  -e AZURE_AD_TENANT_ID=your-tenant-id \
  -e FHIR_SERVICE_URL=your-fhir-service-url \
  tigercareregistry.azurecr.io/fhir-portal:latest 