const express = require('express');
const router = express.Router();
const {
  upload,
  createTicket,
  getUserTickets,
  getTicketDetails,
  addMessage,
  updateTicket,
  updateTicketStatus,
  rateTicket,
  getAllTickets,
  getUserTicketHistory,
  getSupportStaff
} = require('../controller/supportTicketController');

const {
  getFAQs,
  getFAQCategories,
  rateFAQ,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  getAllFAQsForAdmin
} = require('../controller/faqController');

const { requireAuth } = require('../middleware/auth');

// Support Ticket Routes
router.post('/tickets', requireAuth, upload.array('attachments', 5), createTicket);
router.get('/tickets', requireAuth, getUserTickets);
router.get('/tickets/:ticketId', requireAuth, getTicketDetails);
router.post('/tickets/:ticketId/messages', requireAuth, upload.array('attachments', 5), addMessage);
router.patch('/tickets/:ticketId', requireAuth, updateTicket);
router.patch('/tickets/:ticketId/status', requireAuth, updateTicketStatus);
router.post('/tickets/:ticketId/rate', requireAuth, rateTicket);

// Admin Routes for Tickets
router.get('/admin/tickets', requireAuth, getAllTickets);
router.get('/admin/users/:userId/tickets', requireAuth, getUserTicketHistory);
router.get('/admin/staff', requireAuth, getSupportStaff);

// FAQ Routes (Public)
router.get('/faq', getFAQs);
router.get('/faq/categories', getFAQCategories);
router.post('/faq/:faqId/rate', rateFAQ);

// Admin Routes for FAQ
router.post('/admin/faq', requireAuth, createFAQ);
router.put('/admin/faq/:faqId', requireAuth, updateFAQ);
router.delete('/admin/faq/:faqId', requireAuth, deleteFAQ);
router.get('/admin/faq', requireAuth, getAllFAQsForAdmin);

module.exports = router;
