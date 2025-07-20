const express = require('express');
const authController = require('../controllers/authController');

const authRouter = express.Router();

authRouter.post('/register', authController.postRegister);
authRouter.post('/login', authController.postLogin);

module.exports = authRouter;
