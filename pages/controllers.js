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
const now = new Date();
const year = now.getFullYear();
const timeOffsetHours = now.getTimezoneOffset() / 60;

const popupData = {};

popupData.add = {
  template: 'popup-add',
  id: 'add-event',
  title: 'Добавить событие',
  inputs: [
    {
      id: 'daycode',
      type: 'hidden',
      label: 'Дата-код'
    },
    {
      id: 'hours',
      type: 'hidden',
      label: 'Часы'
    },
    {
      id: 'mins',
      type: 'hidden',
      label: 'Минуты'
    },
    {
      id: 'day',
      type: 'content',
      label: 'Дата'
    },
    {
      id: 'roomid',
      type: 'hidden',
      label: 'ID переговорки',
      // variants: 'rooms',
    },
    {
      id: 'roomtitle',
      type: 'content',
      label: 'Переговорка',
      // variants: 'rooms',
    },
    {
      id: 'start',
      type: 'content',
      label: 'Начало'
    },
    {
      id: 'duration',
      type: 'range',
      label: 'Продолжительность',
      tied: 'start'
    },
    // {
    //   id: 'datestart',
    //   type: 'text',
    //   label: 'Время начала*',
    //   required: true
    // },
    // {
    //   id: 'dateend',
    //   type: 'text',
    //   label: 'Время конца*',
    //   required: true
    // },
    {
      id: 'title',
      type: 'text',
      label: 'Название*',
      required: true
    },
    {
      id: 'usersids',
      type: 'checkbox',
      label: 'Участники',
      variants: 'users',
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

// mutation.updateEvent ({
//   id: 5,
//   input: {
//     title: 'aksd;lka;sldk;alsd',
//     dateEnd: oneDayLater
//   }
// });


function getPage(req, res) {
  pageResponse = res;
  pageReq = req;
  pageReqBody = req.body;

  // console.log('req');
  // console.log(req);
  // console.log(root);

  // console.log('getPage()');
  // console.log(req);

  const dataProms = [query.events(), query.rooms(), query.users()];

  Promise.all(dataProms)
    .then(response => {

      data.events = response[0];
      data.rooms = response[1].sort(tools.sortByFloor);
      const roomsData = getRoomsData();
      data.rooms.ids = roomsData.ids;
      data.rooms.titles = roomsData.titles;
      data.users = response[2];
      data.shedule = fillShedule();

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
      // Unhandled action
      else {
        renderPage();
      }
    });
}

// ------------------------------

function createEvent() {
  // console.log('\n\ncreateEvent()');
  const minute = 60 * 1000;

  const dateSrc = pageReqBody.daycode.split('/');
  const date = dateSrc[0];
  const month = dateSrc[1] - 1;

  const hours = pageReqBody.hours;
  const mins = pageReqBody.mins;
  const duration = pageReqBody.duration * 60 * 1000;

  const eventDateStart = new Date(year, month, date, hours, mins);
  const eventDateEnd = new Date(eventDateStart.getTime() + duration);

  mutation.createEvent({
    input: {
      title: pageReqBody.title,
      dateStart: eventDateStart,
      dateEnd: eventDateEnd
      },
     usersIds: pageReqBody.usersids,
     roomId: pageReqBody.roomid
  })
    .then(response => {
      queryEvents();
    });
}

// ------------------------------

function queryEvents() {
  // console.log('queryEvents()');
  query.events()
    .then(response => {
      data.events = response;
      data.shedule = fillShedule();
      renderPage();
    })
}

// ------------------------------

function renderPage() {
  // console.log('\nrenderPage()\n');

  const rooms = getRoomsNav();
  const shedule = getShedule();//`<div class="shedule__events">${roomsData.shedule.join('')}</div>`;
  const days = getDays().join('');

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
          // tools.renderPopup(popupData.edit)
        ];

        return Promise.all(popupProms);
      })
      .then((popups) => {
        const popupAdd = popups[0];
        const popupEdit = popups[1];

        pageResponse.render(
          'index',
          {
            days: days,
            header: header(pageReq),
            rooms: rooms,
            search: search.events,
            shedule: shedule,
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
        'index',
        {
          days: days,
          header: header(pageReq),
          rooms: rooms,
          shedule: shedule,
          search: search.events,
          popupAdd: popupAdd,
          // popupEdit: popupEdit
        }
      );
    });
}

// ------------------------------

function getRoomsNav() {
  const roomsItems = data.rooms.map(item => {

    const itemData = item.dataValues;
    const roomItem = `<li class="item rooms-nav__item shedule__cell"
      data-id="${itemData.id}"
      data-searchtitle="${itemData.title}">
        <div class="rooms-nav__title">${itemData.floor}. ${itemData.title}</div>
    </li>`;

    return roomItem;
  });

  const roomsList = `<ul class="rooms-nav__list list">${roomsItems.join('')}</ul>`;
  return roomsList;
}

// ------------------------------

function getRoomsData() {
  const roomsData = {
    ids: [],
    titles: {}
  };

  data.rooms.forEach(item => {
    const itemData = item.dataValues;
    roomsData.ids.push(itemData.id)
    roomsData.titles[itemData.id] = `${itemData.floor}. ${itemData.title}`;
  });

  return roomsData;
}

// ------------------------------

function fillShedule() {
  const shedule = {};
  // console.log('fillShedule()');
  // console.log('(check 3 hours events)');

  dtTools.daysList.forEach(day => {
    shedule[day.key] = {};
    shedule[day.key].day = day;
    shedule[day.key].rooms = dtTools.getEmptySheduleForDay(data.rooms.ids);
  });

  // Fill shedule with events
  data.events.forEach((event) => {
    const itemData = event.dataValues;
    const RoomId = itemData.RoomId;

    const date = {
      start: dtTools.parseDate(itemData.dateStart),
      end: dtTools.parseDate(itemData.dateEnd)
    };
    const dayKey = dtTools.getDayKey(date.start);

    // Old events
    if (!shedule[dayKey] || !shedule[dayKey].rooms[RoomId].hours[date.start.hours]) {
      return;
    }

    const hoursSlots = shedule[dayKey].rooms[RoomId].hours;

    const quartNum = {
      start: Math.floor(date.start.mins / dtTools.eventsStep),
      end: Math.floor(date.end.mins / dtTools.eventsStep)
    };

    // End in next hour
    if (date.end.hours !== date.start.hours) {
      for(let quart = quartNum.start; quart < dtTools.eventsStepsInHour; quart++) {
        hoursSlots[date.start.hours].events[quart]['event'] = event;
      }
      for(let quart = 0; quart < quartNum.end; quart++) {
        hoursSlots[date.end.hours].events[quart]['event'] = event;
      }
    }
    // End the same hour
    else {
      for(let quart = quartNum.start; quart < quartNum.end; quart++) {
        hoursSlots[date.start.hours].events[quart]['event'] = event;
      }
    }
  });
  return shedule;
}

// ------------------------------

function getShedule() {

  // console.log('\n\ngetShedule()\n');

  const shedulesItems = dtTools.daysList.map(day => {
    const rooms = data.shedule[day.key].rooms;
    const listsForRooms = data.rooms.ids.map(roomId => {
      const roomEvents = getSheduleForRoom(rooms[roomId]);
      const roomTitle = data.rooms.titles[roomId];
      return `<div
        class="rooms-events"
        data-day="${day.date}"
        data-daycode="${day.code}"
        data-roomid="${roomId}"
        data-roomtitle="${roomTitle}"
        >${roomEvents}</div> `;
    });

    const dayClasses = tools.addMods({
      class: 'shedule__day',
      mods: [day.key]
    });

    const tabClasses = tools.addMods({
      class: 'tabs__content',
      isCurrent: (day.key == dtTools.todayDayKey)
    });

    const dayList = `<li class="${dayClasses} ${tabClasses}">${listsForRooms.join('')}</li>`;

    return dayList;
  });

  const shedules = `<ul class="shedule__days">${shedulesItems.join('')}</ul>`;
  return shedules;
}

// ------------------------------

function getSheduleForRoom(roomEvents) {
  const hoursKeys = Object.keys(roomEvents.hours);
  const roomId = roomEvents.roomId;

  const eventsForHours = hoursKeys.map(key => {
    const hour = roomEvents.hours[key];
    const mins = hour.mins;
    const events = hour.events;

    const eventsItems = events.map(item => {
      let slotClass = 'rooms-events__slot';
      let titleText = '';
      let eventTitle = '';

      const mins = `<span class="rooms-events__mins">${item.mins}</span>`;

      if (item.event) {
        titleText = item.event.dataValues.title;
        eventTitle = `<span class="rooms-events__title">${titleText}</span>`;
        slotClass += ` ${slotClass}--has-event`;
      }

      return `<span
        class="${slotClass} shedule__cell"
        data-start="${hour.hour}:${item.mins}"
        data-hours="${hour.hour}"
        data-mins="${item.mins}"
        title="${titleText}"
        >${mins}${eventTitle}</span>`;
    });

    const eventsList = `<div class="rooms-events__hour-events" data-hour="${hour.hour}">
      ${eventsItems.join('')}

      <span class="rooms-events__hour">${hour.hour}<sup class="">00</sup></span>
      </div>
      `;

    return eventsList;
  });

  const eventsForHoursList = eventsForHours.join('');

  return eventsForHoursList;
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

function getDays() {
  return daysNav = dtTools.daysList.map((day) => {
    // let itemClass = 'days-nav__item';

    const itemClass = tools.addMods({
      class: 'tabs__control',
      mix: ['days-nav__item', 'false-link'],
      isCurrent: (day.key == dtTools.todayDayKey)
      });

    return `<a
      class="${itemClass}"
      href="#${day.key}"
      data-target=".shedule__day--${day.key}"
      >${day.date}</a>`;
  });
}

// ------------------------------

function getTab(day, sheduleId) {
  let tabClass = 'tabs__label';
  let controlClass = 'tabs__control';
  let controlTextClass = 'tabs__control-text';

  if (day.key == dtTools.todayDayKey) {
    controlClass += ` ${controlClass}--current`;
  }

  return `<li class="${tabClass}">
    <button class="${controlClass}" type="button" value="${sheduleId}">
      <span class="${controlTextClass}">${day.date}</span>
    </button>
  </li>`;
}

// ------------------------------


module.exports.index = getPage;

