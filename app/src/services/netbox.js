const axios = require('axios');

class NetboxService {
    constructor() {
        this.baseURL = process.env.NETBOX_URL || 'http://netbox.example.com';
        this.apiToken = process.env.NETBOX_TOKEN || '';
        this.headers = {
            'Authorization': `Token ${this.apiToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        try {
            const config = {
                method,
                url: `${this.baseURL}/api${endpoint}`,
                headers: this.headers
            };
            
            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error(`Netbox API error: ${error.message}`);
            if (error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
            }
            throw new Error(`Netbox API request failed: ${error.message}`);
        }
    }

    async getAvailableVlans() {
        try {
            const response = await this.makeRequest('/ipam/vlans/?status=active&limit=100');
            return response.results.map(vlan => ({
                id: vlan.id,
                name: vlan.name,
                vid: vlan.vid,
                description: vlan.description,
                site: vlan.site?.name || 'N/A'
            }));
        } catch (error) {
            console.error('Error fetching VLANs:', error);
            // Return mock data if Netbox is not available
            return [
                { id: 1, name: 'VLAN-100', vid: 100, description: 'Production VLAN', site: 'Main' },
                { id: 2, name: 'VLAN-200', vid: 200, description: 'Development VLAN', site: 'Main' },
                { id: 3, name: 'VLAN-300', vid: 300, description: 'Testing VLAN', site: 'Main' }
            ];
        }
    }

    async getSwitches() {
        try {
            const response = await this.makeRequest('/dcim/devices/?device_type__manufacturer__name=Cisco&role__name=switch&limit=100');
            return response.results.map(device => ({
                id: device.id,
                name: device.name,
                model: device.device_type?.model || 'Unknown',
                site: device.site?.name || 'N/A',
                status: device.status?.label || 'Unknown'
            }));
        } catch (error) {
            console.error('Error fetching switches:', error);
            // Return mock data if Netbox is not available
            return [
                { id: 1, name: 'SW01', model: 'Catalyst 2960', site: 'Main', status: 'Active' },
                { id: 2, name: 'SW02', model: 'Catalyst 3750', site: 'Main', status: 'Active' },
                { id: 3, name: 'SW03', model: 'Catalyst 2960', site: 'Branch', status: 'Active' }
            ];
        }
    }

    async getAvailablePorts(switchId) {
        try {
            const response = await this.makeRequest(`/dcim/interfaces/?device_id=${switchId}&type=1000base-t&enabled=true&limit=100`);
            return response.results
                .filter(port => !port.connected_endpoints || port.connected_endpoints.length === 0)
                .map(port => ({
                    id: port.id,
                    name: port.name,
                    description: port.description || '',
                    type: port.type?.label || 'Unknown',
                    enabled: port.enabled
                }));
        } catch (error) {
            console.error('Error fetching available ports:', error);
            // Return mock data if Netbox is not available
            return [
                { id: 1, name: 'GigabitEthernet0/1', description: 'Available port', type: '1000BASE-T', enabled: true },
                { id: 2, name: 'GigabitEthernet0/2', description: 'Available port', type: '1000BASE-T', enabled: true },
                { id: 3, name: 'GigabitEthernet0/3', description: 'Available port', type: '1000BASE-T', enabled: true }
            ];
        }
    }

    async getAvailableSwitchPort(switchName) {
        try {
            // First get the switch by name
            const switchResponse = await this.makeRequest(`/dcim/devices/?name=${switchName}`);
            if (!switchResponse.results || switchResponse.results.length === 0) {
                throw new Error(`Switch ${switchName} not found`);
            }

            const switchDevice = switchResponse.results[0];
            const availablePorts = await this.getAvailablePorts(switchDevice.id);
            
            if (availablePorts.length === 0) {
                return null;
            }

            // Return the first available port
            return availablePorts[0];
        } catch (error) {
            console.error('Error finding available switch port:', error);
            // Return mock data if Netbox is not available
            return {
                id: 1,
                name: 'GigabitEthernet0/1',
                description: 'Auto-assigned port',
                type: '1000BASE-T',
                enabled: true
            };
        }
    }

    async getVlanByVid(vid) {
        try {
            const response = await this.makeRequest(`/ipam/vlans/?vid=${vid}`);
            if (response.results && response.results.length > 0) {
                return response.results[0];
            }
            return null;
        } catch (error) {
            console.error('Error fetching VLAN by VID:', error);
            return null;
        }
    }

    async updatePortConnection(portId, cableData) {
        try {
            // This would update the port connection in Netbox
            // Implementation depends on your specific Netbox schema
            const response = await this.makeRequest(`/dcim/interfaces/${portId}/`, 'PATCH', {
                description: cableData.description,
                // Add other relevant fields
            });
            return response;
        } catch (error) {
            console.error('Error updating port connection:', error);
            throw error;
        }
    }
}

module.exports = new NetboxService();