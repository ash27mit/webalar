const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

router.post('/add-task', taskController.postAddTask);
router.get('/get-task', taskController.getTask);
router.put('/update-task-status/:taskId', taskController.updateTaskStatus);
router.delete('/delete-task/:taskId', taskController.deleteTask);
router.put('/edit-task/:taskId', taskController.editTask);
router.get('/smart-assign-suggestion', taskController.getSmartAssignSuggestion);

// Conflict handling routes
router.post('/lock-task/:taskId', taskController.lockTaskForEditing);
router.post('/unlock-task/:taskId', taskController.unlockTask);
router.get('/check-conflict/:taskId', taskController.checkTaskConflict);
router.post('/resolve-conflict/:taskId', taskController.resolveTaskConflict);

module.exports = router;