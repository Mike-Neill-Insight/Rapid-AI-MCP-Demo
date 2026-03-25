# Azure Deployment

> **Prerequisites**: [Testing](testing.md), [Local Development](local-development.md)
>
> **Next**: [Copilot Studio Setup](copilot-studio-setup.md) (if not done), [Exercises](exercises.md)

## Overview

Deploy the MCP server to **Azure Container Apps** for a production-ready HTTPS endpoint that Copilot Studio can access without a tunnel.

## Prerequisites

- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed
- An Azure subscription
- Docker installed (for building the container image)

## Step 1: Build the Container Image

```bash
# Build the Docker image
docker build -t rapid-ai-mcp-demo .

# Test locally
docker run -p 3100:3100 rapid-ai-mcp-demo
curl http://localhost:3100/health
```

## Step 2: Create Azure Resources

```bash
# Login to Azure
az login

# Set variables (customize these)
RESOURCE_GROUP="rg-mcp-demo"
LOCATION="eastus"
ACR_NAME="youracrname"          # Must be globally unique
APP_NAME="mcp-demo"
ENVIRONMENT="mcp-demo-env"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure Container Registry
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic
az acr login --name $ACR_NAME

# Tag and push the image
docker tag rapid-ai-mcp-demo $ACR_NAME.azurecr.io/rapid-ai-mcp-demo:latest
docker push $ACR_NAME.azurecr.io/rapid-ai-mcp-demo:latest
```

## Step 3: Deploy to Container Apps

```bash
# Create Container Apps environment
az containerapp env create \
  --name $ENVIRONMENT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Deploy the container app
az containerapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT \
  --image $ACR_NAME.azurecr.io/rapid-ai-mcp-demo:latest \
  --registry-server $ACR_NAME.azurecr.io \
  --target-port 3100 \
  --ingress external \
  --env-vars PORT=3100 \
  --min-replicas 1 \
  --max-replicas 3

# Get the app URL
az containerapp show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  --output tsv
```

## Step 4: Verify

```bash
# Replace with your actual URL
APP_URL="https://mcp-demo.azurecontainerapps.io"

# Health check
curl $APP_URL/health

# MCP Initialize
curl -X POST $APP_URL/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": { "name": "curl-test", "version": "1.0.0" }
    }
  }'
```

## Step 5: Update OpenAPI Spec

Update `openapi.json` with your Container Apps URL:

```json
{
  "host": "mcp-demo.azurecontainerapps.io",
  "schemes": ["https"]
}
```

Then follow the [Copilot Studio Setup](copilot-studio-setup.md) guide to create the connector.

## Cleanup

```bash
# Remove all resources when done
az group delete --name $RESOURCE_GROUP --yes --no-wait
```
