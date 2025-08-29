# AWX Netbox Frontend Helm Chart

This Helm chart deploys the AWX Netbox Frontend application on OpenShift 4.19 or Kubernetes.

## Prerequisites

- OpenShift 4.19 or Kubernetes 1.19+
- Helm 3.0+
- Access to Netbox IPAM instance
- Access to Ansible AWX instance

## Installing the Chart

To install the chart with the release name `awx-frontend`:

```bash
# Add your custom configuration
helm install awx-frontend . -f values-custom.yaml
```

## Uninstalling the Chart

To uninstall/delete the `awx-frontend` deployment:

```bash
helm uninstall awx-frontend
```

## Configuration

The following table lists the configurable parameters of the AWX Netbox Frontend chart and their default values.

### Application Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `config.netbox.url` | Netbox IPAM URL | `https://netbox.example.com` |
| `config.awx.url` | Ansible AWX URL | `https://awx.example.com` |
| `config.awx.jobTemplateId` | AWX Job Template ID for configuration | `1` |
| `config.awx.rollbackTemplateId` | AWX Job Template ID for rollback | `2` |
| `config.awx.inventoryId` | AWX Inventory ID | `1` |

### Secrets Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `secrets.netbox.token` | Netbox API Token | `""` |
| `secrets.awx.username` | AWX Username | `admin` |
| `secrets.awx.password` | AWX Password | `""` |

### Deployment Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `1` |
| `image.repository` | Image repository | `awx-netbox-frontend` |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `image.tag` | Image tag | `latest` |

### Service Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `service.type` | Kubernetes service type | `ClusterIP` |
| `service.port` | Service port | `80` |
| `service.targetPort` | Target port | `3000` |

### OpenShift Route Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `route.enabled` | Enable OpenShift Route | `true` |
| `route.host` | Route hostname | `""` |
| `route.tls.enabled` | Enable TLS | `true` |
| `route.tls.termination` | TLS termination type | `edge` |

### Security Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `podSecurityContext.runAsUser` | User ID to run the container | `1001` |
| `podSecurityContext.fsGroup` | Group ID for filesystem permissions | `1001` |
| `securityContext.runAsUser` | User ID for the container | `1001` |
| `securityContext.runAsNonRoot` | Run as non-root | `true` |

### Resource Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `resources.limits.cpu` | CPU limit | `500m` |
| `resources.limits.memory` | Memory limit | `512Mi` |
| `resources.requests.cpu` | CPU request | `250m` |
| `resources.requests.memory` | Memory request | `256Mi` |

## Example Configuration

Create a `values-custom.yaml` file:

```yaml
# Custom configuration for production deployment
config:
  netbox:
    url: "https://netbox.company.com"
  awx:
    url: "https://awx.company.com"
    jobTemplateId: "10"
    rollbackTemplateId: "11"
    inventoryId: "5"

secrets:
  netbox:
    token: "0123456789abcdef0123456789abcdef01234567"
  awx:
    username: "automation-user"
    password: "secure-password-here"

route:
  enabled: true
  host: "network-automation.apps.ocp.company.com"
  tls:
    enabled: true
    termination: edge

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5
  targetCPUUtilizationPercentage: 70
```

## OpenShift Deployment

For OpenShift deployments, ensure you have the proper permissions:

```bash
# Create a new project
oc new-project network-automation

# Deploy the application
helm install awx-frontend . -f values-custom.yaml

# Check the route
oc get route
```

## Health Checks

The application includes health endpoints:

- **Liveness Probe**: `GET /health` - Checks if the application is running
- **Readiness Probe**: `GET /health` - Checks if the application is ready to serve traffic

## Monitoring

The deployment includes:

- Resource limits and requests for proper scheduling
- Health checks for automatic restart on failure
- OpenShift Route for external access
- ConfigMaps for configuration management
- Secrets for sensitive data

## Troubleshooting

### Common Issues

1. **Image Pull Errors**: Ensure the image is built and available in your registry
2. **Route Access Issues**: Check OpenShift router configuration
3. **Permission Errors**: Verify security context settings
4. **External Service Connectivity**: Ensure Netbox and AWX are accessible from the cluster

### Debug Commands

```bash
# Check pod status
oc get pods

# View pod logs
oc logs deployment/awx-frontend

# Check configuration
oc get configmap awx-frontend-config -o yaml

# Test connectivity
oc rsh deployment/awx-frontend
curl http://localhost:3000/health
```

### Updating Configuration

To update configuration without recreating the deployment:

```bash
# Update values
helm upgrade awx-frontend . -f values-custom.yaml

# Force pod restart
oc rollout restart deployment/awx-frontend
```