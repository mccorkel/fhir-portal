# FHIR Portal Application Architecture

This document provides an overview of the FHIR Portal application architecture, explaining how the different components interact with each other and with Azure services.

## Architecture Overview

The FHIR Portal is a Next.js application that allows users to authenticate with Entra ID, upload FHIR bundles, and access their FHIR health records. The application communicates with an Azure Health Data Services FHIR service through a secure API layer.

```
┌─────────────────┐     ┌───────────────┐     ┌────────────────┐     ┌─────────────────┐
│                 │     │               │     │                │     │                 │
│  Next.js Client │────▶│  Next.js API  │────▶│  Azure Key     │     │  Azure Health   │
│  (React UI)     │     │  Backend      │◀───▶│  Vault         │     │  Data Services  │
│                 │     │               │     │                │     │  FHIR Service   │
└────────┬────────┘     └───────┬───────┘     └────────────────┘     └────────┬────────┘
         │                      │                                             │
         │                      │                                             │
         ▼                      ▼                                             ▼
┌─────────────────┐     ┌───────────────┐                           ┌─────────────────┐
│                 │     │               │                           │                 │
│  Entra ID       │◀───▶│  Managed      │                           │  FHIR Resources │
│  Authentication │     │  Identity     │                           │                 │
│                 │     │               │                           │                 │
└─────────────────┘     └───────────────┘                           └─────────────────┘
```

## Component Details

### 1. Next.js Client (React UI)

The client-side of the application is built with Next.js and React, providing a responsive user interface for:
- User authentication with Entra ID
- FHIR bundle file upload
- Viewing and navigating FHIR health records

Key components:
- `src/app/layout.tsx`: Root layout with authentication provider
- `src/app/auth/*`: Authentication-related pages (signin, signout, error)
- `src/app/upload/page.tsx`: FHIR bundle upload page
- `src/app/records/page.tsx`: Health records viewing page
- `src/components/fhir/bundle-uploader.tsx`: FHIR bundle upload component
- `src/components/fhir/patient-records.tsx`: FHIR data display component

### 2. Next.js API Backend

The API layer is implemented as Next.js API routes that handle:
- Authentication verification
- Secure communication with the FHIR service
- FHIR bundle processing and validation

Key components:
- `src/app/api/auth/[...nextauth]/route.ts`: NextAuth authentication handler
- `src/app/api/fhir/bundle/route.ts`: FHIR bundle upload endpoint
- `src/app/api/fhir/patients/route.ts`: Patient data retrieval endpoint
- `src/app/api/fhir/[type]/route.ts`: Dynamic endpoint for various FHIR resource types
- `src/lib/fhir-api.ts`: Utility function for FHIR API requests

### 3. Azure Key Vault

Azure Key Vault securely stores sensitive information:
- Entra ID client ID and secret
- FHIR service URL and credentials
- NextAuth secret for session encryption

The application uses managed identity to access Key Vault, eliminating the need for storing credentials in the application code or configuration.

### 4. Azure Health Data Services FHIR Service

The FHIR service stores and manages FHIR resources:
- Patient information
- Observations (lab results, vital signs)
- Conditions (diagnoses)
- Medications
- Procedures
- Other health-related data

### 5. Entra ID Authentication

Entra ID (formerly Azure Active Directory) provides:
- User authentication
- Single sign-on capabilities
- User management
- Access control

### 6. Managed Identity

Azure Managed Identity eliminates the need for managing credentials by:
- Providing an automatically managed identity for the application in Azure AD
- Enabling secure access to Azure Key Vault without storing credentials
- Simplifying secret rotation and management

## Data Flow

1. **Authentication Flow**:
   - User initiates login through the UI
   - Application redirects to Entra ID login page
   - User authenticates with Entra ID credentials
   - Entra ID returns an access token to the application
   - Application creates a session for the authenticated user

2. **FHIR Bundle Upload Flow**:
   - Authenticated user selects a FHIR bundle file
   - Client validates the file format
   - Client sends the file to the API backend
   - API backend verifies authentication
   - API backend retrieves FHIR service credentials from Key Vault
   - API backend forwards the bundle to the FHIR service
   - API backend returns the result to the client

3. **FHIR Data Retrieval Flow**:
   - Authenticated user navigates to the records page
   - Client requests patient data from the API backend
   - API backend verifies authentication
   - API backend retrieves FHIR service credentials from Key Vault
   - API backend queries the FHIR service for patient data
   - API backend returns the data to the client
   - Client displays the data in a user-friendly format

## Security Considerations

1. **Authentication Security**:
   - All authentication is handled by Entra ID
   - Access tokens are short-lived and securely stored
   - Session management follows security best practices

2. **API Security**:
   - All API endpoints verify authentication
   - HTTPS is enforced for all communication
   - Input validation is performed on all requests

3. **Secrets Management**:
   - No secrets are stored in code or environment variables
   - Azure Key Vault securely manages all secrets
   - Managed Identity eliminates the need for credential management

4. **FHIR Data Security**:
   - FHIR service access is restricted to authenticated users
   - Client ID is stored securely in Azure Key Vault
   - API backend acts as a secure proxy for FHIR service access

## Scalability and Performance

1. **Scalability**:
   - Next.js application can be scaled horizontally
   - Azure App Service provides auto-scaling capabilities
   - FHIR service can handle large volumes of health data

2. **Performance**:
   - Client-side rendering for interactive components
   - Efficient data fetching with proper pagination
   - Optimized API calls to minimize latency

## Monitoring and Logging

1. **Application Monitoring**:
   - Azure Application Insights integration
   - Performance metrics collection
   - Error tracking and alerting

2. **Security Monitoring**:
   - Azure Security Center integration
   - Authentication activity monitoring
   - Access control auditing

## Deployment Architecture

The application is deployed to Azure using:
- Azure App Service for hosting the Next.js application
- Azure Key Vault for secrets management
- Managed Identity for secure access to Azure services
- CI/CD pipeline for automated deployment

See the `deployment-guide.md` document for detailed deployment instructions.
