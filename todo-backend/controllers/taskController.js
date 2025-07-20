const Task = require('../models/task');
const {check, validationResult} = require("express-validator")

exports.postAddTask = [
    check('title')
        .trim()
        .custom(async (value) => {
            const existingTitle = await Task.findOne({title: value});
            if (existingTitle) {
                throw new Error('Title already exist');
            }
            return true;
        }),

    async (req, res, next) => {
        try {
            const {title, description, assignedUser, status, priority} = req.body;
            const errors = validationResult(req);

            if(!errors.isEmpty()) {
                const errorMessages = {};
                errors.array().forEach(error => {
                    errorMessages[error.path] = error.msg;
                });
                
                return res.status(422).json({
                    message: "Validation failed",
                    errors: errorMessages,
                    success: false
                });
            }
            
            const task = new Task({
                title,
                description,
                assignedUser,
                status,
                priority
            });

            await task.save();
            
            res.status(201).json({
                message: 'Task created successfully',
                task: task
            });
        } catch (error) {
            console.error('Error creating task:', error);
            res.status(500).json({
                message: 'Failed to create task',
                error: error.message
            });
        }
    }
]

exports.getTask = async (req, res, next) => {
  try {
      const tasks = await Task.find();
      res.status(200).json({
          message: 'Tasks fetched successfully',
          tasks: tasks
      });
  } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({
          message: 'Failed to fetch tasks',
          error: error.message
      });
  }
}

exports.updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['todo', 'inprogress', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be one of: todo, inprogress, done' 
      });
    }

    // Find and update the task
    const task = await Task.findByIdAndUpdate(
      taskId,
      { 
        status,
      },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ 
        success: false, 
        message: 'Task not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task status updated successfully',
      task
    });

  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};
  
  exports.deleteTask = async (req, res) => {
    try {
      const { taskId } = req.params;
  
      // Find and delete the task
      const task = await Task.findByIdAndDelete(taskId);
  
      if (!task) {
        return res.status(404).json({ 
          success: false, 
          message: 'Task not found' 
        });
      }
  
      res.status(200).json({
        success: true,
        message: 'Task deleted successfully',
        taskId: task._id
      });
  
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  };

exports.editTask = [
    check('title')
        .trim()
        .custom(async (value, { req }) => {
            const { taskId } = req.params;
            const existingTitle = await Task.findOne({
                title: value,
                _id: { $ne: taskId } // Exclude current task from uniqueness check
            });
            if (existingTitle) {
                throw new Error('Title already exists');
            }
            return true;
        }),

    async (req, res, next) => {
        try {
            const { taskId } = req.params;
            const { title, description, assignedUser, status, priority } = req.body;
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                const errorMessages = {};
                errors.array().forEach(error => {
                    errorMessages[error.path] = error.msg;
                });
                
                return res.status(422).json({
                    message: "Validation failed",
                    errors: errorMessages,
                    success: false
                });
            }

            // Validate status and priority if provided
            const validStatuses = ['todo', 'inprogress', 'done'];
            const validPriorities = ['low', 'medium', 'high'];
            
            if (status && !validStatuses.includes(status)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid status. Must be one of: todo, inprogress, done' 
                });
            }

            if (priority && !validPriorities.includes(priority)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid priority. Must be one of: low, medium, high' 
                });
            }

            // Find and update the task
            const task = await Task.findByIdAndUpdate(
                taskId,
                {
                    title,
                    description,
                    assignedUser,
                    status,
                    priority
                },
                { new: true }
            );

            if (!task) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Task not found' 
                });
            }
            
            res.status(200).json({
                success: true,
                message: 'Task updated successfully',
                task: task
            });
        } catch (error) {
            console.error('Error updating task:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update task',
                error: error.message
            });
        }
    }
]