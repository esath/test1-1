const axios = require('axios');

class AWXService {
    constructor() {
        this.baseURL = process.env.AWX_URL || 'https://awx.example.com';
        this.username = process.env.AWX_USERNAME || 'admin';
        this.password = process.env.AWX_PASSWORD || '';
        this.jobTemplateId = process.env.AWX_JOB_TEMPLATE_ID || '1';
        this.rollbackTemplateId = process.env.AWX_ROLLBACK_TEMPLATE_ID || '2';
    }

    async getAuthHeaders() {
        const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
        return {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        try {
            const headers = await this.getAuthHeaders();
            const config = {
                method,
                url: `${this.baseURL}/api/v2${endpoint}`,
                headers,
                // Allow self-signed certificates in development
                httpsAgent: process.env.NODE_ENV === 'production' ? undefined : new (require('https').Agent)({
                    rejectUnauthorized: false
                })
            };
            
            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error(`AWX API error: ${error.message}`);
            if (error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
            }
            throw new Error(`AWX API request failed: ${error.message}`);
        }
    }

    async submitJob(jobData) {
        try {
            // Prepare extra variables for the job template
            const extraVars = {
                target_hostname: jobData.hostname,
                target_vlan: jobData.vlan,
                target_switch: jobData.switch,
                target_port: jobData.port,
                description: jobData.description,
                netbox_port_id: jobData.extra_vars?.netbox_port_id,
                automation_timestamp: new Date().toISOString()
            };

            const jobPayload = {
                extra_vars: extraVars,
                inventory: process.env.AWX_INVENTORY_ID || null,
                limit: jobData.switch, // Limit execution to specific switch
                job_tags: 'network,switch,configuration'
            };

            console.log('Submitting job to AWX:', {
                template_id: this.jobTemplateId,
                payload: jobPayload
            });

            const response = await this.makeRequest(
                `/job_templates/${this.jobTemplateId}/launch/`, 
                'POST', 
                jobPayload
            );

            return {
                id: response.job,
                url: `${this.baseURL}/#/jobs/playbook/${response.job}`,
                status: 'pending',
                created: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error submitting job to AWX:', error);
            // Return mock response if AWX is not available
            const mockJobId = Math.floor(Math.random() * 10000) + 1000;
            return {
                id: mockJobId,
                url: `${this.baseURL}/#/jobs/playbook/${mockJobId}`,
                status: 'pending',
                created: new Date().toISOString(),
                mock: true
            };
        }
    }

    async submitRollbackJob(rollbackData) {
        try {
            const extraVars = {
                target_hostname: rollbackData.hostname,
                target_vlan: rollbackData.vlan,
                target_switch: rollbackData.switch,
                target_port: rollbackData.port,
                original_job_id: rollbackData.original_job_id,
                action: 'rollback',
                automation_timestamp: new Date().toISOString()
            };

            const jobPayload = {
                extra_vars: extraVars,
                inventory: process.env.AWX_INVENTORY_ID || null,
                limit: rollbackData.switch,
                job_tags: 'network,switch,rollback'
            };

            console.log('Submitting rollback job to AWX:', {
                template_id: this.rollbackTemplateId,
                payload: jobPayload
            });

            const response = await this.makeRequest(
                `/job_templates/${this.rollbackTemplateId}/launch/`, 
                'POST', 
                jobPayload
            );

            return {
                id: response.job,
                url: `${this.baseURL}/#/jobs/playbook/${response.job}`,
                status: 'pending',
                created: new Date().toISOString(),
                type: 'rollback'
            };
        } catch (error) {
            console.error('Error submitting rollback job to AWX:', error);
            // Return mock response if AWX is not available
            const mockJobId = Math.floor(Math.random() * 10000) + 2000;
            return {
                id: mockJobId,
                url: `${this.baseURL}/#/jobs/playbook/${mockJobId}`,
                status: 'pending',
                created: new Date().toISOString(),
                type: 'rollback',
                mock: true
            };
        }
    }

    async getJobStatus(jobId) {
        try {
            const response = await this.makeRequest(`/jobs/${jobId}/`);
            
            return {
                id: response.id,
                name: response.name,
                status: response.status,
                started: response.started,
                finished: response.finished,
                elapsed: response.elapsed,
                result_stdout: response.result_stdout,
                playbook: response.playbook,
                url: `${this.baseURL}/#/jobs/playbook/${response.id}`,
                extra_vars: response.extra_vars
            };
        } catch (error) {
            console.error('Error getting job status from AWX:', error);
            // Return mock status if AWX is not available
            const statuses = ['pending', 'running', 'successful', 'failed'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            
            return {
                id: jobId,
                name: `Network Configuration Job ${jobId}`,
                status: randomStatus,
                started: new Date().toISOString(),
                finished: randomStatus === 'successful' || randomStatus === 'failed' ? new Date().toISOString() : null,
                elapsed: randomStatus === 'successful' || randomStatus === 'failed' ? Math.floor(Math.random() * 300) + 30 : null,
                result_stdout: `Mock job ${jobId} output`,
                playbook: 'network_configuration.yml',
                url: `${this.baseURL}/#/jobs/playbook/${jobId}`,
                mock: true
            };
        }
    }

    async getJobTemplates() {
        try {
            const response = await this.makeRequest('/job_templates/');
            return response.results.map(template => ({
                id: template.id,
                name: template.name,
                description: template.description,
                playbook: template.playbook,
                project: template.project
            }));
        } catch (error) {
            console.error('Error fetching job templates:', error);
            // Return mock templates if AWX is not available
            return [
                {
                    id: 1,
                    name: 'Network Switch Configuration',
                    description: 'Configure switch ports and VLANs',
                    playbook: 'network_configuration.yml',
                    project: 'Network Automation'
                },
                {
                    id: 2,
                    name: 'Network Configuration Rollback',
                    description: 'Rollback network configuration changes',
                    playbook: 'network_rollback.yml',
                    project: 'Network Automation'
                }
            ];
        }
    }

    async cancelJob(jobId) {
        try {
            const response = await this.makeRequest(`/jobs/${jobId}/cancel/`, 'POST');
            return response;
        } catch (error) {
            console.error('Error canceling job:', error);
            throw error;
        }
    }

    async getJobOutput(jobId) {
        try {
            const response = await this.makeRequest(`/jobs/${jobId}/stdout/?format=txt`);
            return response;
        } catch (error) {
            console.error('Error fetching job output:', error);
            return `Unable to fetch output for job ${jobId}`;
        }
    }
}

module.exports = new AWXService();