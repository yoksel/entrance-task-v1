const { models } = require('../../models');

module.exports = {
  // User
  createUser ({ input }) {
    return models.User.create(input);
  },

  updateUser ({ id, input }) {
    return models.User.findById(id)
            .then(user => {
              return user.update(input);
            });
  },

  removeUser ({ id }) {
    return models.User.findById(id)
            .then(user => user.destroy());
  },

  // Room
  createRoom ({ input }) {
    return models.Room.create(input);
  },

  updateRoom ({ id, input }) {
    return models.Room.findById(id)
            .then(room => {
              return room.update(input);
            });
  },

  removeRoom ({ id }) {
    return models.Room.findById(id)
            .then(room => room.destroy());
  },

  // Event
  createEvent ({ input, usersIds, roomId }) {
    return models.Event.create(input)
            .then(event => {
              event.setRoom(roomId);
              return event.setUsers(usersIds)
                    .then(() => event);
            });
  },

  updateEvent ({ id, input }) {
    return models.Event.findById(id)
            .then(event => {
              return event.update(input);
            });
  },

  removeUserFromEvent ({ id, userId }) {
    return models.Event.findById(id)
            .then(event => {
              event.removeUser(userId);
              return event;
            });
  },

  changeEventRoom ({ id, roomId }) {
    return models.Event.findById(id)
            .then(event => {
              event.setRoom(id);
            });
  },

  removeEvent ({ id }) {
    return models.Event.findById(id)
            .then(event => event.destroy());
  }
};
