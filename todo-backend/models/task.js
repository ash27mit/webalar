const mongoose = require('mongoose');

const taskSchema = mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true
    },
    description: String,
    assignedUser: {
        type: String, 
        required: true
    },
    status: {
        type: String, 
        enum: ["todo", "inprogress", "done"], 
        default: "todo"
    },
    priority: {
        type:String, 
        enum: ["low", "medium", "high"], 
        default: "low"
    },
})

module.exports = mongoose.model('Task', taskSchema);