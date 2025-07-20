const express = require('express');

const taskRouter = express.Router();

const taskController = require('../controllers/taskController');

taskRouter.post('/add-task', taskController.postAddTask);

taskRouter.get('/get-task', taskController.getTask);

taskRouter.put('/update-task-status/:taskId', taskController.updateTaskStatus);

taskRouter.delete('/delete-task/:taskId', taskController.deleteTask);

taskRouter.put('/edit-task/:taskId', taskController.editTask);

taskRouter.get('/smart-assign-suggestion', taskController.getSmartAssignSuggestion);

module.exports = taskRouter;