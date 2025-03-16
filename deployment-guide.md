# FHIR Portal Deployment Guide

This guide provides instructions for deploying the FHIR Portal application to Azure.

## Prerequisites

Before deploying, ensure you have:

1. An Azure account with appropriate permissions
2. Azure CLI installed and configured
3. The FHIR Portal application code ready for deployment
4. Azure Health Data Services workspace with FHIR service already set up
5. Entra ID (Azure AD) application registration for authentication

## Deployment Steps

### 1. Prepare the Application for Production

```bash
# Navigate to your project directory
cd ~/fhir-app-project/tigercare

# Install production dependencies
pnpm install --production

# Build the application
pnpm build
```

### 2. Create Azure Resources

```bash
# Login to Azure
az login

# Create a resource group if you don't have one
az group create --name tigercare-rg --location eastus

# Create an App Service Plan
az appservice plan create --name tigercare-plan --resource-group tigercare-rg --sku B1 --is-linux

# Create a Web App
az webapp create --name tigercare-app --resource-group tigercare-rg --plan tigercare-plan --runtime "NODE:18-lts"
```

### 3. Configure Azure Key Vault (if not already done)

Follow the instructions in the `azure-secrets-management.md` document to:
- Create an Azure Key Vault
- Add necessary secrets
- Configure managed identity for the App Service
- Grant the managed identity access to Key Vault secrets

### 4. Configure Application Settings

```bash
# Set the Key Vault URL as an environment variable
az webapp config appsettings set --name tigercare-app --resource-group tigercare-rg --settings KEY_VAULT_URL="https://tigercare-kv.vault.azure.net/"

# Set the Node environment to production
az webapp config appsettings set --name tigercare-app --resource-group tigercare-rg --settings NODE_ENV="production"

# Set the website to always on
az webapp config set --name tigercare-app --resource-group tigercare-rg --always-on true
```

### 5. Deploy the Application

There are multiple ways to deploy the application:

#### Option 1: Deploy using Azure CLI

```bash
# Navigate to your project directory
cd ~/fhir-app-project/tigercare

# Compress the build output
zip -r deployment.zip .next node_modules public package.json next.config.js

# Deploy the zip package
az webapp deployment source config-zip --resource-group tigercare-rg --name tigercare-app --src deployment.zip
```

#### Option 2: Deploy using GitHub Actions

1. Push your code to a GitHub repository
2. Set up GitHub Actions workflow:

Create a file at `.github/workflows/azure-deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install pnpm
      run: npm install -g pnpm
        
    - name: Install dependencies
      run: pnpm install
        
    - name: Build
      run: pnpm build
        
    - name: Deploy to Azure Web App
      uses: azure/webapps-deploy@v2
      with:
        app-name: 'tigercare-app'
        publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
        package: .
```

3. Add your Azure Web App publish profile as a GitHub secret named `AZURE_WEBAPP_PUBLISH_PROFILE`

#### Option 3: Deploy using Azure DevOps

1. Push your code to an Azure DevOps repository
2. Create a new pipeline using the Azure DevOps UI
3. Select "Azure Web App" as the deployment target
4. Configure the pipeline to build and deploy your Next.js application

### 6. Configure Custom Domain and SSL (Optional)

```bash
# Add a custom domain
az webapp config hostname add --webapp-name tigercare-app --resource-group tigercare-rg --hostname your-domain.com

# Add an SSL certificate
az webapp config ssl bind --certificate-thumbprint <thumbprint> --ssl-type SNI --name tigercare-app --resource-group tigercare-rg
```

### 7. Set Up Continuous Deployment (Optional)

For continuous deployment, you can:

1. Configure GitHub Actions or Azure DevOps as described above
2. Set up deployment slots for staging and production
3. Configure auto-swap policies

```bash
# Create a staging slot
az webapp deployment slot create --name tigercare-app --resource-group tigercare-rg --slot staging

# Configure auto-swap
az webapp deployment slot auto-swap --name tigercare-app --resource-group tigercare-rg --slot staging --target-slot production --auto-swap-slot-name staging
```

## Post-Deployment Verification

After deployment, verify that:

1. The application is accessible at the Azure Web App URL
2. Authentication with Entra ID is working correctly
3. FHIR bundle upload functionality is working
4. FHIR data retrieval is displaying patient records correctly
5. All API endpoints are communicating with the FHIR service securely

## Troubleshooting

If you encounter issues:

1. Check the application logs:
   ```bash
   az webapp log tail --name tigercare-app --resource-group tigercare-rg
   ```

2. Verify Key Vault access:
   ```bash
   az keyvault show --name tigercare-kv --resource-group tigercare-rg
   ```

3. Check managed identity configuration:
   ```bash
   az webapp identity show --name tigercare-app --resource-group tigercare-rg
   ```

4. Verify application settings:
   ```bash
   az webapp config appsettings list --name tigercare-app --resource-group tigercare-rg
   ```

## Scaling the Application

To handle increased load:

```bash
# Scale up (increase the size of the App Service Plan)
az appservice plan update --name tigercare-plan --resource-group tigercare-rg --sku S1

# Scale out (increase the number of instances)
az appservice plan update --name tigercare-plan --resource-group tigercare-rg --number-of-workers 3
```

## Monitoring and Alerts

Set up monitoring and alerts:

```bash
# Enable Application Insights
az webapp config appsettings set --name tigercare-app --resource-group tigercare-rg --settings APPINSIGHTS_INSTRUMENTATIONKEY="your-instrumentation-key"

# Set up an alert for high CPU usage
az monitor alert create --name "High CPU Alert" --resource-group tigercare-rg --target-resource-type "Microsoft.Web/sites" --target-resource-name tigercare-app --condition "Metric value > 80" --metric-name "CpuPercentage" --description "Alert when CPU usage exceeds 80%"
```

## Backup and Disaster Recovery

Configure regular backups:

```bash
# Enable backups
az webapp config backup create --resource-group tigercare-rg --webapp-name tigercare-app --container-url "https://yourstorageaccount.blob.core.windows.net/backups" --storage-account-key "your-storage-account-key" --frequency 1d --retention 30
```

## Security Considerations

1. Ensure all communication uses HTTPS
2. Regularly rotate secrets in Azure Key Vault
3. Implement proper RBAC (Role-Based Access Control) for Azure resources
4. Enable Azure Security Center for threat detection
5. Regularly update dependencies to patch security vulnerabilities

## Cost Optimization

To optimize costs:

1. Use the appropriate App Service Plan tier based on your needs
2. Scale down during periods of low usage
3. Enable auto-scaling based on metrics
4. Monitor resource usage and adjust accordingly
5. Consider reserved instances for predictable workloads
