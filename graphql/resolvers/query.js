const { models } = require('../../models');

module.exports = {
  event ({ id }) {
    return models.Event.findById(id);
  },
  events (args, context) {
    return models.Event.findAll(args, context);
  },
  user ({ id }) {
    return models.User.findById(id);
  },
  users (args, context) {
    return models.User.findAll(args, context);
  },
  room ({ id }) {
    return models.Room.findById(id);
  },
  rooms (args, context) {
    return models.Room.findAll(args, context);
  }
};
