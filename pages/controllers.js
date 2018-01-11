const resolvers = require('../graphql/resolvers')();
const query = resolvers.Query;
const mutation = resolvers.Mutation;
const header = require('./header');
const dtTools = require('./dateTimeTools');
const tools = require('./tools');
let pageResponse = null;
let pageReq = null;
let pageReqBody = null;
let actionError = null;
let actionMessage = null;

let data = {};
const now = new Date();
const year = now.getFullYear();
const slotWidth = 20; //px;

const popupData = {};

popupData.add = {
  template: 'popup-add',
  id: 'add-event',
  title: 'Добавить событие',
  inputs: [
    {
      id: 'itemid',
      type: 'hidden'
    },
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

popupData.edit = {
  template: 'popup-edit',
  id: 'edit-event',
  title: 'Редактировать событие',
  inputs: [
    {
      id: 'itemid',
      type: 'hidden'
    },
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

function getPage(req, res) {
  pageResponse = res;
  pageReq = req;
  pageReqBody = req.body;
  actionError = null;
  actionMessage = null;

  // console.log('getPage()');
  // console.log(req.body);

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

      const usersProms = data.events.map(event => {
        return event.getUsers();
      });

      return Promise.all(usersProms);
    })
    .then(users => {
      data.events.map((event, i) => {
        event.dataValues.userIds = users[i].map(user => {
          return user.dataValues.id;
        });
      });

      if (!pageReqBody.action) {
        renderPage();
        return;
      }
      handleRequest();
    });
}

// ------------------------------

function handleRequest() {
  const matches = tools.findMatches(data.events, pageReqBody);

  // console.log('matches');
  // console.log(matches);

  if (pageReqBody.action == 'create') {
    // Dont check unique names
    // Check users in other events
    // console.log(matches.byDateUsers);
    if (matches.byDateUsers.length > 0) {
      const users = getLoginsByIds(matches.byDateUsers);

      actionError = `Событие <b>«${pageReqBody.title}»</b> не было создано, потому что некоторые сотрудники <i>${users.join(', ')}</i> будут в это время на другой встрече`;

      queryEvents();
    }
    else if (matches.byDateRoom > 0) {
      actionError = `Событие <b>«${pageReqBody.title}»</b> не было создано, потому что до завершения этого события в этой переговорке начнётся другое`;

      queryEvents();
    }
    else {
      createEvent();
    }
  }

  //
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
}

// ------------------------------

function createEvent() {
  // console.log('\n\ncreateEvent()\n');

  const time = tools.getTimeFromRequest(pageReqBody);

  mutation.createEvent({
    input: {
      title: pageReqBody.title,
      dateStart: time.start,
      dateEnd: time.end
      },
     usersIds: pageReqBody.usersids,
     roomId: pageReqBody.roomid
  })
    .then(response => {
      // console.log('response');
      // console.log(response.dataValues);

      actionMessage = `Событие <b>«${response.dataValues.title}»</b> создано.`;

      queryEvents();
    });
}

// ------------------------------

function updateEvent() {
  // console.log('\n\n updateEvent()');
  // console.log(pageReqBody);

  const time = tools.getTimeFromRequest(pageReqBody);

  mutation.updateEvent({
    id: pageReqBody.itemid,
    input: {
      title: pageReqBody.title,
      dateStart: time.start,
      dateEnd: time.end
      },
     usersIds: pageReqBody.usersids,
     roomId: pageReqBody.roomid
  })
    .then(response => {
      // console.log('response');
      // console.log(response.dataValues);

      actionMessage = `Событие <b>«${response.dataValues.title}»</b> изменено.`;

      queryEvents();
    });
}

// ------------------------------

function removeEvent() {
  mutation.removeEvent({
    id: pageReqBody.itemid,
  })
    .then(response => {
      // console.log('response');
      // console.log(response.dataValues);

      actionMessage = `Событие <b>«${response.dataValues.title}»</b> удалено.`;

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

      const usersProms = data.events.map(event => {
        return event.getUsers();
      });

      return Promise.all(usersProms);
    })
    .then(users => {
      data.events.map((event, i) => {
        event.dataValues.userIds = users[i].map(user => {
          return user.dataValues.id;
        });
      });

      renderPage();
    })
}

// ------------------------------

function renderPage() {
  // console.log('\nrenderPage()\n');


  const rooms = getRoomsNav();
  const shedule = getShedule();
  const days = getDays().join('');
  actionError = tools.getErrorMarkup(actionError);
  actionMessage = tools.getMessageMarkup(actionMessage);

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
          'index',
          {
            actionError: actionError,
            actionMessage: actionMessage,
            days: days,
            header: header(pageReq),
            rooms: rooms,
            search: search.events,
            shedule: shedule,
            popupAdd: popupAdd,
            popupEdit: popupEdit
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
          actionError: actionError,
          actionMessage: actionMessage,
          days: days,
          header: header(pageReq),
          rooms: rooms,
          shedule: shedule,
          search: search.events,
          popupAdd: popupAdd,
          popupEdit: popupEdit
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

  dtTools.daysList.forEach(day => {
    shedule[day.key] = {};
    shedule[day.key].day = day;
    shedule[day.key].rooms = dtTools.getEmptySheduleForDay(data.rooms.ids);
  });

  // Fill shedule with events
  data.events.forEach((event) => {
    const itemData = event.dataValues;
    const RoomId = itemData.RoomId;
    const duration = dtTools.getEventDuration(itemData);
    const durationInSlots = duration / dtTools.eventsStep;

    const date = {
      start: dtTools.parseDate(itemData.dateStart),
      end: dtTools.parseDate(itemData.dateEnd)
    };
    const dayKey = dtTools.getDayKey(date.start);
    const dayKeyEnd = dtTools.getDayKey(date.end);

    // Old events
    if (!shedule[dayKey] || !shedule[dayKey].rooms[RoomId]) {
      return;
    }

    const dayRoomShedule = shedule[dayKey].rooms[RoomId];

    let foundedIndex = null;
    const eventSlot = dayRoomShedule.events.filter((slot, i) => {
      if (date.start.hours == slot.hour
        && date.start.mins == slot.mins) {
        foundedIndex = i;
        return slot;
      }
    });

    if (eventSlot[0]) {
      eventSlot[0].event = event;
      eventSlot[0].eventDuration = duration;
      eventSlot[0].eventSlots = durationInSlots;

      if (durationInSlots > 1) {
        const spliced = dayRoomShedule.events.splice(foundedIndex + 1, durationInSlots - 1);
        // console.log('foundedIndex:', foundedIndex);
        // console.log('duration:',duration);
        // console.log('durationInSlots:', durationInSlots);
        // console.log('spliced');
        // console.log(spliced.length);
      }
    }
    else {
      // console.log('\n\neventSlot[0] not found, bc already filled with another event\n');
      // console.log('- date.start.hours', date.start.hours);
      // console.log('- date.start.mins', date.start.mins);
      // console.log('dayRoomShedule.events');
      // console.log(dayRoomShedule.events);
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
      const hoursList = getHoursForRoom();

      return `<div
        class="rooms-events"
        data-day="${day.date}"
        data-daycode="${day.code}"
        data-roomid="${roomId}"
        data-roomtitle="${roomTitle}"
        >
        ${roomEvents}
        ${hoursList}
        </div> `;
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

const Color = function() {
  this.counter = 0;

  this.colors = [
    'salmon',
    'sandybrown',
    'gold',
    'lightgreen',
    'lightseagreen'
    ];
}

Color.prototype.getColor = function() {
  const color = this.colors[this.counter];

  this.counter++;
  if (this.counter > this.colors.length - 1) {
    this.counter = 0;
  }

  return color;
}

// ------------------------------

function getSheduleForRoom(roomEvents) {
  // console.log('\n\ngetSheduleForRoom\n');
  const roomId = roomEvents.roomId;
  const color = new Color();

  const sheduleEventsForRoom = roomEvents.events.map(slot => {
    const hour = slot.hour;
    const mins = slot.mins;
    const minsText = slot.mins > 9 ? slot.mins : `0${slot.mins}`;
    let slotClass = 'rooms-events__slot';
    let eventId = '';
    let titleText = '';
    let title = '';
    let usersids = '';
    let duration = dtTools.eventsStep;
    let style = '';
    let eventColor = '';
    const timeText = `${hour}:${minsText}`;
    const time = `<span class="rooms-events__time">${timeText}</span>`;

    if (slot.event) {
      const itemData = slot.event.dataValues;
      eventId = itemData.id;
      titleText = itemData.title;
      title = `<span class="rooms-events__title">${titleText}</span>`;
      const start = itemData.dateStart;
      duration = slot.eventDuration;
      usersids = itemData.userIds.join();
      eventColor = color.getColor();
      const styleVals = [
        `width: ${slot.eventSlots * slotWidth}px`,
        `background: ${eventColor}`
      ];
      style = `style="${styleVals.join(';')}"`;

      slotClass = tools.addMods({
        class: slotClass,
        mods: ['has-event', `width-${slot.eventSlots}`]
      });
    }

    const slotContent = `<span class="rooms-events__slot-content">${time}${title}</span>`;

    return `<li
      class="${slotClass} shedule__cell"
      data-itemid="${eventId}"
      data-start="${timeText}"
      data-hours="${hour}"
      data-mins="${mins}"
      data-duration="${duration}"
      data-title="${titleText}"
      data-usersids="${usersids}"
      title="${titleText}"
      ${style}
      >${slotContent}</li>`;

    return eventsList;
  });

  const sheduleEventsForRoomList = `<ul class="room-events__slots">${sheduleEventsForRoom.join('')}</ul>`;

  return sheduleEventsForRoomList;
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

function getHoursForRoom() {
  const hours = [];
  const start = dtTools.startHour;
  const end = dtTools.startHour + dtTools.hoursInDay;

  for (var i = start; i < end; i++) {
    const mins = `<sup class="rooms-events__mins">00</sup>`;
    hours.push(`<li class="rooms-events__hour rooms-events__hour--${i}">${i}${mins}</li>`)
  }

  const hoursList = `<ul class="room-events__hours">${hours.join('')}</ul>`;

  return hoursList;
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

function getLoginsByIds(ids) {
  const logins = [];

  data.users.forEach(item => {
    if (ids.indexOf(`${item.dataValues.id}`) >= 0) {
      logins.push(item.dataValues.login);
    }
  });

  return logins;
}

// ------------------------------


module.exports.index = getPage;

