const resolvers = require('../graphql/resolvers')();
const query = resolvers.Query;
const mutation = resolvers.Mutation;
const header = require('./header');
const dtTools = require('./dateTimeTools');
const tools = require('./tools');
let pageResponse = null;
let pageReq = null;
let pageReqBody = null;
let data = {};
let now = new Date();

const popupData = {};

popupData.add = {
  template: 'popup-add',
  id: 'add-event',
  title: 'Добавить событие',
  inputs: [
    {
      id: 'title',
      type: 'text',
      label: 'Название*',
      required: true
    },
    {
      id: 'datestart',
      type: 'text',
      label: 'Время начала*',
      required: true
    },
    {
      id: 'dateend',
      type: 'text',
      label: 'Время конца*',
      required: true
    },
    {
      id: 'roomid',
      type: 'radio',
      label: 'Переговорка',
      variants: 'rooms',
    },
    {
      id: 'usersids',
      type: 'checkbox',
      label: 'Участники',
      variants: 'users',
    },
  ]
};

// input: {
//       title: 'Helloween',
//       dateStart: now,
//       dateEnd: oneDayLater
//       },
//      usersIds: [1],
//      roomId: pageReqBody.roomid

popupData.edit = {
  id: 'edit-event',
  template: 'popup-edit',
  title: 'Редактировать переговорку',
  inputs: [
    {
      id: 'itemid',
      type: 'hidden'
    },
    {
      id: 'title',
      type: 'text',
      label: 'Название*',
      required: true
    },
  ]
};

const searchData = {
  events: {
    id: 'events',
    selector: '.event',
    placeholderText: 'Найти событие'
  },
  users: {
    id: 'users',
    selector: '.user',
    placeholderText: 'Найти сотрудника'
  },
  rooms: {
    id: 'rooms',
    selector: '.room',
    placeholderText: 'Найти переговорку'
  }
};

// ------------------------------

function getPage(req, res) {
  pageResponse = res;
  pageReq = req;
  pageReqBody = req.body;

  // console.log('getPage');
  // console.log(req);

  const dataProms = [query.events(), query.rooms(), query.users()];

  Promise.all(dataProms)
    .then(response => {

      data.events = response[0];
      data.rooms = response[1];
      data.users = response[2];

      if (!pageReqBody.action) {
        renderPage();
        return;
      }

      const matches = tools.findMatches(data.events, pageReqBody);

      if (pageReqBody.action == 'create' && matches.byName == 0) {
        createEvent();
      }
      else if (pageReqBody.action == 'update') {
        if (pageReqBody.save) {
          updateEvent();
        }
        else if (pageReqBody.remove && matches.byId > 0) {
          removeEvent();
        }
        else {
          renderPage();
        }
      }
      else {
        renderPage();
      }
    });
}

// createEvent
// updateEvent
// removeUserFromEvent
// changeEventRoom
// removeEvent

// ------------------------------

function createEvent() {
  // console.log('createEvent()');
  // console.log(pageReqBody);
  const minute = 60 * 1000;

  let duration = minute * Math.round(Math.random(3 * 60) + 15);
  duration = minute * 160;

  console.log(now);
  // now = now.setHours(0);
  console.log(now);
  // console.log('duration', duration);
  const later = new Date(now.getTime() + duration);

  // console.log(now, later);

  // queryEvents();

  mutation.createEvent({
    input: {
      title: pageReqBody.title,
      dateStart: now,
      dateEnd: later
      },
     usersIds: pageReqBody.usersids,
     roomId: pageReqBody.roomid
  })
    .then(response => {
      renderPage();
    });
}

// ------------------------------

function renderPage() {
  const events = getAllEvents();
  const counter = data.events.length;
  const dataPromsSet = pickDataPromises();
  const dataProms = dataPromsSet.promises;
  const dataPromsTargets = dataPromsSet.targets;
  const searchProms = [
    tools.getSearch(searchData.events),
    tools.getSearch(searchData.rooms),
    tools.getSearch(searchData.users)
  ];
  let search = {};
  let popupProms = [];

  // Need to download data for popups (users, rooms, etc)
  if (dataProms.length > 0) {

    Promise.all(searchProms)
      .then(response => {
        search = {
           events: response[0],
           rooms: response[1],
           users: response[2]
        };

        return Promise.all(dataProms)
      })
      .then(response => {
        response.forEach((item, i) => {
          dataPromsSet.targets[i].variantsData = item;
          const variantsKey = dataPromsSet.targets[i].variants;
          dataPromsSet.targets[i].search = search[variantsKey];
        });

        popupProms = [
          tools.renderPopup(popupData.add),
          tools.renderPopup(popupData.edit)
        ];

        return Promise.all(popupProms);
      })
      .then((popups) => {
        const popupAdd = popups[0];
        const popupEdit = popups[1];

        pageResponse.render(
          'events',
          {
            header: header(pageReq),
            counter: counter,
            events: events,
            search: search.events,
            popupAdd: popupAdd,
            // popupEdit: popupEdit
          }
        );
      });

      return;
  }

  // No need data for popups
  popupProms = [
    tools.renderPopup(popupData.add),
    tools.renderPopup(popupData.edit)
  ];

  tools.getSearch(searchData.events)
    .then(response => {
      search.events = response;

      return Promise.all(popupProms);
    })
    .then((popups) => {
      const popupAdd = popups[0];
      const popupEdit = popups[1];

      pageResponse.render(
        'events',
        {
          header: header(pageReq),
          counter: counter,
          events: events,
          search: search.events,
          popupAdd: popupAdd,
          // popupEdit: popupEdit
        }
      );
    });
}

// ------------------------------

function pickDataPromises() {
  const promises = [];
  const targets = [];

  for(key in popupData) {
    const dataSet = popupData[key].inputs;

    dataSet.forEach(item => {
      if(item.variants) {
        promises.push(query[item.variants]());
        targets.push(item);
      }
    });
  }

  return {
    promises: promises,
    targets: targets
  };
}

// ------------------------------

function getAllEvents() {
  const listItems = data.events.map((item) => {
    const itemData = item.dataValues;
    const roomData = getRoomById(itemData.RoomId);
    const dateStart = dtTools.parseDate(itemData.dateStart);
    const dateEnd = dtTools.parseDate(itemData.dateEnd);
    const prettyDate = dtTools.prettyDate(dateStart, dateEnd);

    let liItem = `<li class="item event" data-searchtitle="${itemData.title}">
        <h3 class="event__title">${itemData.title}</h3>
        <div class="event__room">${roomData.floor}. ${roomData.title}</div>
        <div class="event__datetime">${prettyDate} </div>
      </li>`;
    return liItem;
  });

  const list = `<ul class="events__list list list--cells">${listItems.join('')}</ul>`;

  return list;
}

// ------------------------------

function getRoomById(roomId) {
  const rooms = data.rooms.filter(item => {
    const itemData = item.dataValues;
    if (itemData.id == roomId) {
      return item;
    }
  });

  return rooms[0].dataValues;
}

// ------------------------------

module.exports.events = getPage;
