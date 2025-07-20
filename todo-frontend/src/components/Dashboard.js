import { useEffect, useState, useCallback } from "react";
import "./Dashboard.css";
import Sidebar from "./Sidebar";
import Overlay from "./Overlay";
import ActivityLog from "./ActivityLog";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";

const TaskCard = ({ task, onDragStart, isDragging, draggedTaskId, onEdit, onDelete }) => {
  const [showActions, setShowActions] = useState(false);
  const isBeingDragged = isDragging && draggedTaskId === task._id;

  const handleDragStart = (e) => {
    e.dataTransfer.setData("text/plain", task._id);
    e.dataTransfer.setData("application/json", JSON.stringify(task));
    onDragStart(task._id);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(task);
    setShowActions(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this task?')) {
      onDelete(task._id);
    }
    setShowActions(false);
  };

  return (
    <div 
      className={`task-card ${isBeingDragged ? 'dragging' : ''}`}
      draggable="true"
      onDragStart={handleDragStart}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="task-card-header">
        <span className="task-title">{task.title}</span>
        <div className="task-actions">
          <span className="priority-indicator" style={{
            backgroundColor: task.priority === 'high' ? '#ff4444' : 
                            task.priority === 'medium' ? '#ffaa00' : '#00cc44'
          }}></span>
          {showActions && (
            <div className="task-action-buttons">
              <button 
                className="edit-btn" 
                onClick={handleEdit}
                title="Edit task"
              >
                ✏️
              </button>
              <button 
                className="delete-btn" 
                onClick={handleDelete}
                title="Delete task"
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="task-desc">{task.description}</p>
      <div className="task-footer">
        <div className="task-assigned">
          <img src={`https://ui-avatars.com/api/?name=${task.assignedUser}&background=random`} 
               alt={task.assignedUser} 
               className="avatar" />
          <span className="assigned-name">{task.assignedUser}</span>
        </div>
        {task.status === 'done' && (
          <div className="completed-info">
            <span className="checkmark">✓</span>
            <span>Completed 2 days ago</span>
          </div>
        )}
      </div>
    </div>
  );
};

const TaskColumn = ({ title, status, tasks, taskCount, loading, onDrop, isDragOver, onDragEnter, onDragLeave, onDragStart, isDragging, draggedTaskId, onEdit, onDelete }) => {
  const handleDrop = (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    const taskData = JSON.parse(e.dataTransfer.getData("application/json"));
    
    if (taskData.status !== status) {
      onDrop(taskId, status);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div 
      className={`task-column ${isDragOver ? 'drag-over' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
    >
      <div className="column-header">
        <div className="column-title">
          <span>{title}</span>
          <span className="task-count">{taskCount}</span>
        </div>
      </div>
      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="tasks-container">
          {tasks.map((task, i) => (
            <TaskCard 
              task={task} 
              key={task._id || i} 
              onDragStart={onDragStart}
              isDragging={isDragging}
              draggedTaskId={draggedTaskId}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const socket = io.connect("http://localhost:3001");
  const navigate = useNavigate();

  const [openSide, setOpenSide] = useState(true);
  const [addTaskMenu, setAddTaskMenu] = useState(false);
  const [editTaskMenu, setEditTaskMenu] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [tasks, setTasks] = useState({
    todo: [],
    inprogress: [],
    done: []
  });
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const isLoggedIn = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  const fetchTasks = async () => {
    try {
      const response = await fetch('http://localhost:3001/todo/get-task');
      if (response.ok) {
        const data = await response.json();
        const {tasks} = data;
        console.log(tasks);
        const groupedTasks = tasks.reduce((acc, task) => {
          if (!acc[task.status]) {
            acc[task.status] = [];
          }
          acc[task.status].push(task);
          return acc;
        }, { todo: [], inprogress: [], done: [] });
        
        setTasks(groupedTasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = useCallback(async (taskId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/todo/update-task-status/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Optimistically update the UI
        setTasks(prevTasks => {
          const newTasks = { todo: [], inprogress: [], done: [] };
          
          // Find the task and move it to the new status
          Object.keys(prevTasks).forEach(status => {
            prevTasks[status].forEach(task => {
              if (task._id === taskId) {
                newTasks[newStatus].push({ ...task, status: newStatus });
              } else {
                newTasks[status].push(task);
              }
            });
          });
          
          return newTasks;
        });

        // Emit socket event to notify other users
        socket.emit('task-status-updated', { taskId, newStatus });
      } else {
        console.error('Failed to update task status');
        // Optionally show error message to user
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      // Optionally show error message to user
    }
  }, [socket]);

  const deleteTask = useCallback(async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/todo/delete-task/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Optimistically remove from UI
        setTasks(prevTasks => {
          const newTasks = { todo: [], inprogress: [], done: [] };
          
          Object.keys(prevTasks).forEach(status => {
            prevTasks[status].forEach(task => {
              if (task._id !== taskId) {
                newTasks[status].push(task);
              }
            });
          });
          
          return newTasks;
        });

        // Emit socket event to notify other users
        socket.emit('task-deleted', { taskId });
      } else {
        console.error('Failed to delete task');
        alert('Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task');
    }
  }, [socket]);

  const handleEditTask = (task) => {
    setEditingTask(task);
    setEditTaskMenu(true);
  };

  const handleDragStart = (taskId) => {
    setIsDragging(true);
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDrop = (taskId, newStatus) => {
    updateTaskStatus(taskId, newStatus);
    handleDragEnd();
  };

  const handleDragEnter = (status) => {
    setDragOverColumn(status);
  };

  const handleDragLeave = (e) => {
    // Only clear drag over if we're leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  useEffect(() => {
    socket.on("receive-form-data", async (data) => {
      console.log(data);
      fetchTasks();
    });

    socket.on("task-status-updated", (data) => {
      const { taskId, newStatus } = data;
      setTasks(prevTasks => {
        const newTasks = { todo: [], inprogress: [], done: [] };
        
        Object.keys(prevTasks).forEach(status => {
          prevTasks[status].forEach(task => {
            if (task._id === taskId) {
              newTasks[newStatus].push({ ...task, status: newStatus });
            } else {
              newTasks[status].push(task);
            }
          });
        });
        
        return newTasks;
      });
    });

    socket.on("task-deleted", (data) => {
      const { taskId } = data;
      setTasks(prevTasks => {
        const newTasks = { todo: [], inprogress: [], done: [] };
        
        Object.keys(prevTasks).forEach(status => {
          prevTasks[status].forEach(task => {
            if (task._id !== taskId) {
              newTasks[status].push(task);
            }
          });
        });
        
        return newTasks;
      });
    });

    socket.on("task-updated", (data) => {
      const { task: updatedTask } = data;
      setTasks(prevTasks => {
        const newTasks = { todo: [], inprogress: [], done: [] };
        
        Object.keys(prevTasks).forEach(status => {
          prevTasks[status].forEach(task => {
            if (task._id === updatedTask._id) {
              newTasks[updatedTask.status].push(updatedTask);
            } else {
              newTasks[status].push(task);
            }
          });
        });
        
        return newTasks;
      });
    });

    const handleGlobalDragEnd = () => {
      handleDragEnd();
    };

    document.addEventListener('dragend', handleGlobalDragEnd);

    return () => {
      socket.off("receive-form-data");
      socket.off("task-status-updated");
      socket.off("task-deleted");
      socket.off("task-updated");
      document.removeEventListener('dragend', handleGlobalDragEnd);
    };
  }, [socket]);

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <main className="main">
      <Sidebar openSide={openSide} setOpenSide={setOpenSide} />
      <div className="content">
        <header className="header">
          <div className="header-inside">
            {!openSide && (
              <img
                src="/images/bars.svg"
                alt="Menu"
                className="sidebar-icon"
                style={{cursor: "pointer"}}
                onClick={() => setOpenSide(true)}
              />
            )}
            <span className="title">TaskFlow</span>
          </div>
          {isLoggedIn ? 
          <div>
            <div className="task-assigned">
              <img src={`https://ui-avatars.com/api/?name=${user.fullName}&background=random`} 
                  alt={user.fullName} 
                  className="avatar-2" />
              <span className="assigned-name-2">{user.fullName}</span>
            </div>
          </div>
          : 
          <div className="auth">
            <button className="auth-login" onClick={() => navigate("/login")}>Login</button>
            <button className="auth-register" onClick={() => navigate("/register")}>Register</button>
          </div>
          }
        </header>
        
        {addTaskMenu && (
          <Overlay
            onClose={() => setAddTaskMenu(false)}
            fetchTasks={fetchTasks}
            setAddTaskMenu={setAddTaskMenu}
          />
        )}

        {editTaskMenu && (
          <Overlay
            onClose={() => {
              setEditTaskMenu(false);
              setEditingTask(null);
            }}
            fetchTasks={fetchTasks}
            setAddTaskMenu={setEditTaskMenu}
            editingTask={editingTask}
            isEditing={true}
          />
        )}

        <ActivityLog
          isOpen={activityLogOpen}
          onClose={() => setActivityLogOpen(false)}
        />

        <div className="top-row">
          <div className="search-in">
            <input className="search-bar" placeholder="Search tasks, users, and boards" />
            <img src="/images/magnifying-glass.svg" alt="Search" className="search-icon" />
          </div>
          <div className="top-row-buttons">
            <button onClick={() => setActivityLogOpen(true)} className="activity-log-btn">
              📋 Activity Log
            </button>
            <button onClick={() => setAddTaskMenu(true)} className="add-task-btn">
              + Add task
            </button>
          </div>
        </div>
        
        <hr className="ver-line"></hr>

        <div className="task-board">
          <TaskColumn
            title="To Do"
            status="todo"
            tasks={tasks.todo}
            taskCount={tasks.todo.length}
            loading={loading}
            onDrop={handleDrop}
            isDragOver={dragOverColumn === 'todo'}
            onDragEnter={() => handleDragEnter('todo')}
            onDragLeave={handleDragLeave}
            onDragStart={handleDragStart}
            isDragging={isDragging}
            draggedTaskId={draggedTaskId}
            onEdit={handleEditTask}
            onDelete={deleteTask}
          />

          <TaskColumn
            title="In Progress"
            status="inprogress"
            tasks={tasks.inprogress}
            taskCount={tasks.inprogress.length}
            loading={loading}
            onDrop={handleDrop}
            isDragOver={dragOverColumn === 'inprogress'}
            onDragEnter={() => handleDragEnter('inprogress')}
            onDragLeave={handleDragLeave}
            onDragStart={handleDragStart}
            isDragging={isDragging}
            draggedTaskId={draggedTaskId}
            onEdit={handleEditTask}
            onDelete={deleteTask}
          />

          <TaskColumn
            title="Done"
            status="done"
            tasks={tasks.done}
            taskCount={tasks.done.length}
            loading={loading}
            onDrop={handleDrop}
            isDragOver={dragOverColumn === 'done'}
            onDragEnter={() => handleDragEnter('done')}
            onDragLeave={handleDragLeave}
            onDragStart={handleDragStart}
            isDragging={isDragging}
            draggedTaskId={draggedTaskId}
            onEdit={handleEditTask}
            onDelete={deleteTask}
          />
        </div>
      </div>
    </main>
  );
};

export default Dashboard;