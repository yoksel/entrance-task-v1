const express = require('express');

const router = express.Router();
const { index } = require('./controllers');
const { users } = require('./users');
const { rooms } = require('./rooms');

const { events } = require('./events');
const { createEvent } = require('./create-event');

router.get('/', index);
router.post('/', index);

router.get('/users', users);
router.post('/users', users);

router.get('/events', events);
router.post('/events', events);

router.post('/create-event', createEvent);

router.get('/rooms', rooms);
router.post('/rooms', rooms);

router.get('/vote', index);

module.exports = router;
