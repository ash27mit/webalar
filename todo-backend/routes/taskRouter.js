const express = require('express');

const taskRouter = express.Router();

const taskController = require('../controllers/taskController');

taskRouter.post('/add-task', taskController.postAddTask);

taskRouter.get('/get-task', taskController.getTask);

taskRouter.put('/update-task-status/:taskId', taskController.updateTaskStatus);

taskRouter.delete('/delete-task/:taskId', taskController.deleteTask);

taskRouter.put('/edit-task/:taskId', taskController.editTask);

taskRouter.get('/smart-assign-suggestion', taskController.getSmartAssignSuggestion);

taskRouter.post('/lock-task/:taskId', taskController.lockTaskForEditing);

taskRouter.post('/unlock-task/:taskId', taskController.unlockTask);

taskRouter.get('/check-conflict/:taskId', taskController.checkTaskConflict);

taskRouter.post('/resolve-conflict/:taskId', taskController.resolveTaskConflict);

module.exports = taskRouter;