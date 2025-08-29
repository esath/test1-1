class TaskManager {
    constructor() {
        // In-memory storage for tasks
        // In production, this should be replaced with a persistent database
        this.tasks = new Map();
    }

    addTask(jobId, taskData) {
        const task = {
            ...taskData,
            id: jobId,
            created: taskData.created || new Date(),
            updated: new Date()
        };
        this.tasks.set(jobId.toString(), task);
        return task;
    }

    getTask(jobId) {
        return this.tasks.get(jobId.toString()) || null;
    }

    updateTask(jobId, taskData) {
        const existingTask = this.tasks.get(jobId.toString());
        if (existingTask) {
            const updatedTask = {
                ...existingTask,
                ...taskData,
                updated: new Date()
            };
            this.tasks.set(jobId.toString(), updatedTask);
            return updatedTask;
        }
        return null;
    }

    deleteTask(jobId) {
        return this.tasks.delete(jobId.toString());
    }

    getAllTasks() {
        return Array.from(this.tasks.values()).sort((a, b) => 
            new Date(b.created) - new Date(a.created)
        );
    }

    getTasksByStatus(status) {
        return Array.from(this.tasks.values())
            .filter(task => task.status === status)
            .sort((a, b) => new Date(b.created) - new Date(a.created));
    }

    getTasksByType(type) {
        return Array.from(this.tasks.values())
            .filter(task => task.type === type)
            .sort((a, b) => new Date(b.created) - new Date(a.created));
    }

    getRecentTasks(limit = 10) {
        return Array.from(this.tasks.values())
            .sort((a, b) => new Date(b.created) - new Date(a.created))
            .slice(0, limit);
    }

    getTaskStats() {
        const tasks = Array.from(this.tasks.values());
        const stats = {
            total: tasks.length,
            pending: 0,
            running: 0,
            successful: 0,
            failed: 0,
            canceled: 0,
            rollback_tasks: 0
        };

        tasks.forEach(task => {
            switch (task.status) {
                case 'pending':
                    stats.pending++;
                    break;
                case 'running':
                    stats.running++;
                    break;
                case 'successful':
                    stats.successful++;
                    break;
                case 'failed':
                    stats.failed++;
                    break;
                case 'canceled':
                    stats.canceled++;
                    break;
            }

            if (task.type === 'rollback') {
                stats.rollback_tasks++;
            }
        });

        return stats;
    }

    cleanup(olderThanDays = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        let deletedCount = 0;
        for (const [jobId, task] of this.tasks.entries()) {
            if (new Date(task.created) < cutoffDate) {
                this.tasks.delete(jobId);
                deletedCount++;
            }
        }

        console.log(`Cleaned up ${deletedCount} old tasks`);
        return deletedCount;
    }

    // Get tasks that can be rolled back (successful configuration tasks)
    getRollbackableTasks() {
        return Array.from(this.tasks.values())
            .filter(task => 
                task.status === 'successful' && 
                task.type !== 'rollback' &&
                !this.hasRollbackTask(task.id)
            )
            .sort((a, b) => new Date(b.created) - new Date(a.created));
    }

    // Check if a task already has a rollback task
    hasRollbackTask(originalJobId) {
        return Array.from(this.tasks.values()).some(task => 
            task.type === 'rollback' && task.original_job_id === originalJobId.toString()
        );
    }

    // Get rollback tasks for a specific original task
    getRollbackTasks(originalJobId) {
        return Array.from(this.tasks.values())
            .filter(task => 
                task.type === 'rollback' && 
                task.original_job_id === originalJobId.toString()
            )
            .sort((a, b) => new Date(b.created) - new Date(a.created));
    }
}

module.exports = new TaskManager();