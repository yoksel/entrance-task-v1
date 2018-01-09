const resolvers = require('../graphql/resolvers')();
const mutation = resolvers.Mutation;
const dtTools = require('./dateTimeTools');

// var result = resolvers.Mutation.createEvent ({ input, usersIds, roomId });

function createEvent(req, res) {
  console.log('hi createEvent');
  // console.log(req.query);
  console.log(req.body);
  const title = req.body['event-title'];
  const dayKey = req.body['event-daykey'];
  const time = req.body['event-time'];
  const durationMins = req.body['event-duration'];
  const dataList = dayKey.split('-');
  const month = dataList[1] - 1;
  const dateDay = dataList[0];

  const now = new Date();
  const year = now.getFullYear();
  const dateStart = new Date(year, month, dateDay, time);

  const duration = 60 * 1000 * durationMins;
  const oneDayLater = new Date(dateStart.getTime() + duration);

  console.log('\n\dateStart');
  console.log(dateStart);


  mutation.createEvent ({
    input: {
      title: title,
      dateStart: dateStart,
      dateEnd: oneDayLater
    },
    usersIds: [1, 2],
    roomId: 2
  })
    .then(eventData => {
      console.log(eventData.dataValues);
      const event = eventData.dataValues;
      const title = event.title;
      const dateStartObj = dtTools.parseDate(event.dateStart);
      const dateEndObj = dtTools.parseDate(event.dateEnd);
      const date = dtTools.prettyDate(dateStartObj, dateEndObj);
      const roomId = event.RoomId;

      res.send(`
          <h1>Событие добавлено</h1>
          <h2>${title}</h2>
          <time>${date}</time>
          <div>Room: ${roomId}</div>

          <div><p><a href="./">Назад</a></p></div>
        `);

    });

  console.log('createEvent');
  // console.log(createEvent);
  // res.send('hi');
}

module.exports.createEvent = createEvent;
