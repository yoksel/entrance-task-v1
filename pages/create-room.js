const resolvers = require('../graphql/resolvers')();
const mutation = resolvers.Mutation;

// var result = resolvers.Mutation.createEvent ({ input, usersIds, roomId });

function createRoom(req, res) {
  // console.log(req.body);
  const title = req.body['title'];
  const floor = req.body['floor'];
  const capacity = req.body['capacity'];

  mutation.createRoom ({
    input: {
      title: title,
      floor: floor,
      capacity: capacity
    }
  })
    .then(roomData => {
      // console.log(roomData);
      const room = roomData.dataValues;
      const title = room.title;
      const floor = room.floor;
      const capacity = room.capacity;

      res.send(`
          <h1>Переговорка добавлена</h1>
          <h2>${title}</h2>
          <div>${floor} этаж</div>
          <div>На ${capacity} человека</div>

          <div><p><a href="./">Назад</a></p></div>
        `);

    });

  console.log('createRoom');
  // console.log(createRoom);
  // res.send('hi');
}

module.exports.createRoom = createRoom;
