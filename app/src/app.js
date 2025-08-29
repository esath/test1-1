const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const exphbs = require('express-handlebars');
require('dotenv').config();

const netboxService = require('./services/netbox');
const awxService = require('./services/awx');
const taskService = require('./services/taskManager');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan('combined'));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Handlebars setup with helpers
app.engine('handlebars', exphbs.engine({
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, '../views/layouts'),
    helpers: {
        eq: function(a, b) {
            return a === b;
        },
        and: function(a, b) {
            return a && b;
        },
        or: function(a, b) {
            return a || b;
        },
        not: function(a) {
            return !a;
        },
        formatDate: function(date) {
            if (!date) return 'N/A';
            return new Date(date).toLocaleString();
        },
        countByStatus: function(tasks, status) {
            if (!Array.isArray(tasks)) return 0;
            return tasks.filter(task => task.status === status).length;
        }
    }
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, '../views'));

// Routes
app.get('/', (req, res) => {
    res.render('index', { 
        title: 'AWX Netbox Frontend',
        description: 'Network Automation Interface'
    });
});

app.get('/form', async (req, res) => {
    try {
        // Get available VLANs from Netbox
        const vlans = await netboxService.getAvailableVlans();
        res.render('form', { 
            title: 'Network Configuration Form',
            vlans: vlans
        });
    } catch (error) {
        console.error('Error loading form:', error);
        res.render('form', { 
            title: 'Network Configuration Form',
            error: 'Unable to load VLAN data from Netbox',
            vlans: []
        });
    }
});

app.post('/submit', async (req, res) => {
    try {
        const formData = req.body;
        
        // Validate required fields
        if (!formData.hostname || !formData.vlan) {
            return res.status(400).json({ 
                error: 'Hostname and VLAN are required' 
            });
        }

        // Check available switch ports from Netbox
        const availablePort = await netboxService.getAvailableSwitchPort(formData.switch);
        
        if (!availablePort) {
            return res.status(400).json({ 
                error: 'No available switch ports found' 
            });
        }

        // Prepare data for AWX
        const awxData = {
            hostname: formData.hostname,
            vlan: formData.vlan,
            switch: formData.switch,
            port: availablePort.name,
            description: formData.description || 'Automated configuration',
            extra_vars: {
                target_hostname: formData.hostname,
                target_vlan: formData.vlan,
                target_switch: formData.switch,
                target_port: availablePort.name,
                netbox_port_id: availablePort.id
            }
        };

        // Submit job to AWX
        const awxJob = await awxService.submitJob(awxData);
        
        // Store task information
        taskService.addTask(awxJob.id, {
            job_id: awxJob.id,
            status: 'pending',
            data: awxData,
            created: new Date(),
            url: awxJob.url
        });

        res.json({ 
            success: true, 
            job_id: awxJob.id,
            message: 'Job submitted successfully',
            redirect: `/status/${awxJob.id}`
        });

    } catch (error) {
        console.error('Error submitting form:', error);
        res.status(500).json({ 
            error: 'Failed to submit configuration',
            details: error.message 
        });
    }
});

app.get('/status', (req, res) => {
    const tasks = taskService.getAllTasks();
    res.render('status', { 
        title: 'Task Status',
        tasks: tasks
    });
});

app.get('/status/:jobId', async (req, res) => {
    try {
        const jobId = req.params.jobId;
        const awxStatus = await awxService.getJobStatus(jobId);
        const localTask = taskService.getTask(jobId);
        
        // Update local task status
        if (localTask && awxStatus) {
            localTask.status = awxStatus.status;
            localTask.finished = awxStatus.finished;
            taskService.updateTask(jobId, localTask);
        }

        res.render('task-detail', { 
            title: `Task ${jobId}`,
            job: awxStatus,
            task: localTask
        });
    } catch (error) {
        console.error('Error getting job status:', error);
        res.render('task-detail', { 
            title: 'Task Status',
            error: 'Unable to retrieve task status'
        });
    }
});

app.post('/rollback/:jobId', async (req, res) => {
    try {
        const jobId = req.params.jobId;
        const task = taskService.getTask(jobId);
        
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Create rollback job data
        const rollbackData = {
            ...task.data,
            action: 'rollback',
            original_job_id: jobId
        };

        // Submit rollback job to AWX
        const rollbackJob = await awxService.submitRollbackJob(rollbackData);
        
        // Store rollback task
        taskService.addTask(rollbackJob.id, {
            job_id: rollbackJob.id,
            status: 'pending',
            data: rollbackData,
            created: new Date(),
            type: 'rollback',
            original_job_id: jobId
        });

        res.json({ 
            success: true, 
            rollback_job_id: rollbackJob.id,
            message: 'Rollback job submitted successfully'
        });

    } catch (error) {
        console.error('Error submitting rollback:', error);
        res.status(500).json({ 
            error: 'Failed to submit rollback',
            details: error.message 
        });
    }
});

// API endpoints
app.get('/api/vlans', async (req, res) => {
    try {
        const vlans = await netboxService.getAvailableVlans();
        res.json(vlans);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/switches', async (req, res) => {
    try {
        const switches = await netboxService.getSwitches();
        res.json(switches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/ports/:switchId', async (req, res) => {
    try {
        const ports = await netboxService.getAvailablePorts(req.params.switchId);
        res.json(ports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { 
        title: 'Error',
        error: 'Something went wrong!'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', { 
        title: 'Not Found',
        error: 'Page not found'
    });
});

app.listen(PORT, () => {
    console.log(`AWX Netbox Frontend running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;