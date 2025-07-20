import { useState, useEffect } from 'react';
import './Overlay.css';
import io from 'socket.io-client';

const socket = io.connect('http://localhost:3001');

const Overlay = ({ onClose, fetchTasks, setAddTaskMenu, editingTask, isEditing = false }) => {
    const handleBackgroundClick = (e) => {
        if (e.target.className === 'overlay-background') {
            onClose();
        }
    };

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assignedUser: '',
        status: 'todo',
        priority: ''
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isEditing && editingTask) {
            setFormData({
                title: editingTask.title || '',
                description: editingTask.description || '',
                assignedUser: editingTask.assignedUser || '',
                status: editingTask.status || 'todo',
                priority: editingTask.priority || ''
            });
        }
    }, [isEditing, editingTask]);

    const handleAddTask = async () => {
        setErrors({});
        setIsSubmitting(true);

        socket.emit("form-data", {message: "Task Added"});

        try {
            const response = await fetch('http://localhost:3001/todo/add-task', {
              method: "POST",
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData),
            });

            const data = await response.json();
      
            if (response.ok) {
              await fetchTasks();
              setFormData({
                title: '',
                description: '',
                assignedUser: '',
                status: 'todo',
                priority: ''
              });
              setAddTaskMenu(false);
            } else {
                if (data.errors) {
                    setErrors(data.errors);
                } else {
                    setErrors({ general: data.message || 'An error occurred while adding the task' });
                }
            }
          } catch (error) {
                console.error('Error adding task:', error);
                setErrors({ general: 'Failed to connect to the server. Please try again.' });
          } finally {
                setIsSubmitting(false);
          }
    };

    const handleEditTask = async () => {
        setErrors({});
        setIsSubmitting(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:3001/todo/edit-task/${editingTask._id}`, {
              method: "PUT",
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(formData),
            });

            const data = await response.json();
      
            if (response.ok) {
              // Emit socket event to notify other users
              socket.emit('task-updated', { task: data.task });
              await fetchTasks();
              onClose();
            } else {
                if (data.errors) {
                    setErrors(data.errors);
                } else {
                    setErrors({ general: data.message || 'An error occurred while updating the task' });
                }
            }
          } catch (error) {
                console.error('Error updating task:', error);
                setErrors({ general: 'Failed to connect to the server. Please try again.' });
          } finally {
                setIsSubmitting(false);
          }
    };

    const handleSubmit = () => {
        if (isEditing) {
            handleEditTask();
        } else {
            handleAddTask();
        }
    };

    const handleInputChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: '' });
        }
    };

    return (
        <div className="overlay-background" onClick={handleBackgroundClick}>
            <div className="overlay-content">
                <div className="overlay-header">
                    <h2>{isEditing ? 'Edit Task' : 'Add New Task'}</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="overlay-form">
                    {errors.general && (
                        <div className="error-message general-error">
                            {errors.general}
                        </div>
                    )}
                    <div className="form-group">
                        <label>Task Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            placeholder="Enter task title"
                            className={errors.title ? 'error-input' : ''}
                        />
                        {errors.title && (
                            <div className="error-message field-error">
                                {errors.title}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            placeholder="Enter task description"
                        />
                    </div>

                    <div className="form-group">
                        <label>Assigned User</label>
                        <input
                            type="text"
                            value={formData.assignedUser}
                            onChange={(e) => handleInputChange('assignedUser', e.target.value)}
                            placeholder="Enter user name"
                        />
                    </div>

                    <div className="form-group">
                        <label>Priority</label>
                        <div className="radio-group">
                            <label>
                                <input
                                    type="radio"
                                    name="priority"
                                    value="low"
                                    checked={formData.priority === 'low'}
                                    onChange={(e) => handleInputChange('priority', e.target.value)}
                                /> Low
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    name="priority"
                                    value="medium"
                                    checked={formData.priority === 'medium'}
                                    onChange={(e) => handleInputChange('priority', e.target.value)}
                                /> Medium
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    name="priority"
                                    value="high"
                                    checked={formData.priority === 'high'}
                                    onChange={(e) => handleInputChange('priority', e.target.value)}
                                /> High
                            </label>
                        </div>
                    </div>
                    <button 
                        className={`add-task-button ${isSubmitting ? 'submitting' : ''}`} 
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (isEditing ? 'Updating Task...' : 'Adding Task...') : (isEditing ? 'Update Task' : 'Add Task')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Overlay;