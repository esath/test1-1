# AWX Netbox Frontend

A web frontend for Ansible AWX with Netbox IPAM integration, designed for OpenShift 4.19.

## Features

- **Web Interface**: Easy-to-use web form for network configuration
- **Netbox Integration**: Automatically checks available VLANs and switch ports from Netbox IPAM
- **AWX Integration**: Submits configuration jobs to Ansible AWX via REST API
- **Real-time Monitoring**: Status page showing AWX job progress and results
- **Rollback Functionality**: Ability to rollback successful configurations
- **OpenShift Ready**: Designed specifically for OpenShift 4.19 with proper Routes and security contexts

## Architecture

This application consists of:
1. **Node.js Web Application** - Provides the user interface and API integrations
2. **Helm Chart** - For easy deployment on OpenShift/Kubernetes
3. **Service Integrations** - Connects to Netbox IPAM and Ansible AWX

## Screenshots

### Homepage
![Homepage](https://github.com/user-attachments/assets/053fcb84-6ae7-493a-80f6-a5f9559627d5)

### Configuration Form
![Configuration Form](https://github.com/user-attachments/assets/854bac6a-cdb9-4809-84a9-55d5f5a08749)

### Form with Preview
![Form with Preview](https://github.com/user-attachments/assets/a8b025a4-8271-4382-871c-fe6097e4265d)

### Task Status Overview
![Task Status](https://github.com/user-attachments/assets/58dab2c3-18bd-4a01-9d1b-19f29e302305)

### Task Detail View
![Task Detail](https://github.com/user-attachments/assets/d1603e3c-fa23-47a2-b9d1-f63f463c64cd)

## Quick Start

### Prerequisites

- OpenShift 4.19 or Kubernetes cluster
- Helm 3.x
- Access to Netbox IPAM instance
- Access to Ansible AWX instance

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd test1-1
   ```

2. **Configure the application**:
   ```bash
   cd awx-netbox-frontend
   cp values.yaml values-custom.yaml
   # Edit values-custom.yaml with your Netbox and AWX details
   ```

3. **Install with Helm**:
   ```bash
   helm install awx-frontend . -f values-custom.yaml
   ```

### Configuration

Edit the `values.yaml` file or create a custom values file:

```yaml
# Configuration values
config:
  netbox:
    url: "https://your-netbox.example.com"
  awx:
    url: "https://your-awx.example.com"
    jobTemplateId: "1"
    rollbackTemplateId: "2"
    inventoryId: "1"

# Secrets (for sensitive data)
secrets:
  netbox:
    token: "your-netbox-api-token"
  awx:
    username: "admin"
    password: "your-awx-password"

# OpenShift Route configuration
route:
  enabled: true
  host: "awx-frontend.apps.your-cluster.com"
  tls:
    enabled: true
```

## Development

### Running Locally

1. **Install dependencies**:
   ```bash
   cd app
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the application**:
   ```bash
   npm start
   ```

4. **Access the application**:
   Open http://localhost:3000

### Building Docker Image

```bash
cd app
docker build -t awx-netbox-frontend:latest .
```

## Usage

### Creating a Network Configuration

1. Navigate to the Configuration Form
2. Enter the target hostname
3. Select a VLAN from the available options (pulled from Netbox)
4. Choose the target switch
5. Add an optional description
6. Review the configuration preview and preflight checks
7. Submit the configuration

The system will:
- Check for available switch ports on the target switch via Netbox
- Submit a job to AWX with the configuration parameters
- Redirect to the task status page

### Monitoring Tasks

1. Navigate to Task Status to see all jobs
2. Click on a specific Job ID to see detailed information
3. View job output and status in real-time
4. Use the rollback functionality for successful configurations

### Rollback

1. From the Task Status page, click the rollback button for a successful task
2. Or from the task detail page, click "Rollback Configuration"
3. A new rollback job will be submitted to AWX

## API Integration

### Netbox IPAM

The application integrates with Netbox to:
- Fetch available VLANs
- Check available switch ports
- Validate network configurations

### Ansible AWX

The application integrates with AWX to:
- Submit configuration jobs
- Monitor job status
- Submit rollback jobs
- Retrieve job output

## Security

- Runs with non-root user (UID 1001)
- Implements proper OpenShift security contexts
- Stores sensitive data in Kubernetes secrets
- Uses TLS-enabled routes by default

## Troubleshooting

### Common Issues

1. **Connection to Netbox fails**: Check the `NETBOX_URL` and `NETBOX_TOKEN` configuration
2. **AWX jobs fail**: Verify `AWX_URL`, credentials, and job template IDs
3. **Permission errors**: Ensure proper OpenShift security context configuration

### Logs

Check application logs:
```bash
oc logs deployment/awx-netbox-frontend
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.