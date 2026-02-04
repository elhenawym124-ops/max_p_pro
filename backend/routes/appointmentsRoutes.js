const express = require('express');
const router = express.Router();
const appointmentsController = require('../controller/appointmentsController');
const verifyToken = require('../utils/verifyToken');

// Get all appointments with optional filters
router.get('/', verifyToken.authenticateToken, appointmentsController.getAllAppointments);

// Get available time slots for a staff member on a specific date
router.get('/available-slots', verifyToken.authenticateToken, appointmentsController.getAvailableSlots);

// Create new appointment
router.post('/', verifyToken.authenticateToken, appointmentsController.createAppointment);

// Update appointment status
router.put('/:id/status', verifyToken.authenticateToken, appointmentsController.updateAppointmentStatus);

module.exports = router;

