const path = require('path');
const fs = require('fs');
const mustache = require('mustache');

const now = new Date();
const year = now.getFullYear();

// ------------------------------

function getTimeFromRequest(req) {
  const dateSrc = req.daycode.split('/');
  const date = dateSrc[0];
  const month = dateSrc[1] - 1;

  const hours = req.hours;
  const mins = req.mins;
  const duration = req.duration * 60 * 1000;

  const eventDateStart = new Date(year, month, date, hours, mins);
  const eventDateEnd = new Date(eventDateStart.getTime() + duration);

  return {
    start: eventDateStart,
    end: eventDateEnd
  };
}

// ------------------------------

function findMatches(items, pageReqBody) {
  const matches = {
    byId: 0,
    byName: 0,
    byDateRoom: 0,
    byDateUsers: [],
  };

  if (pageReqBody.action)  {
    items.forEach(item => {
      if (pageReqBody.title && (pageReqBody.title == item.dataValues.title)) {
        matches.byName++;
      }
      else if (pageReqBody.login && pageReqBody.login == item.dataValues.login) {
        matches.byName++;
      }

      if (pageReqBody.itemid == item.dataValues.id) {
        matches.byId++;
      }

      // Event, need check room & users
      if (pageReqBody.start) {

        const itemStartTime = item.dataValues.dateStart;
        const itemEndTime = item.dataValues.dateEnd;
        const time = getTimeFromRequest(pageReqBody);
        const userIds = item.dataValues.userIds;

        if ((time.start >= itemStartTime && time.start <= itemEndTime)
          || (time.end >= itemStartTime && time.end <= itemEndTime)) {
          // console.log('----->> Совпало время');

          if (item.dataValues.RoomId == pageReqBody.roomid) {
            // console.log('-->> Совпала переговорка');
            matches.byDateRoom++;
          }
          else {
            // console.log('pageReqBody');
            // console.log(pageReqBody);

            const usersAsKeys = {};

            userIds.forEach(item => {
              usersAsKeys[item] = item;
            });

            if (typeof pageReqBody.usersids == 'string') {
              pageReqBody.usersids = [pageReqBody.usersids];
            }

            const founded = pageReqBody.usersids.filter(item => {
              if (usersAsKeys[item] !== undefined) {
                return item;
              }
            });

            matches.byDateUsers = founded

            if (founded.length > 0) {
              // console.log('-->> Совпали пользователи');
            }
          }
        }
      }
    });
  }

  return matches;
}

// ------------------------------

function sortByFloor(a, b) {
  const aFloor = a.dataValues.floor;
  const bFloor = b.dataValues.floor;

  if (aFloor > bFloor) {
    return 1;
  }
  else if (aFloor < bFloor) {
    return -1;
  }

  return 0;
}

// ------------------------------

function getAddPopupInputs(inputsData) {

  const inputs = inputsData.map(item => {
    const required = item.required ? 'required' : '';
    let result = '';

    // checkbox/radio
    if (item.variantsData) {
      if (item.variants == 'users') {
        result += getUsersList(item);
      }
      else if (item.variants == 'rooms') {
        result += getRoomsList(item);
      }
    }
    else if (item.type == 'range'){
      result += getRange(item);
    }
    else if (item.type == 'content'){
      result += getConentInput(item);
    }
    // single input
    else {
      result = `<input
      class="popup__input popup__input--${item.id}"
      type="${item.type}"
      name="${item.id}"
      ${required}>`;

      if (item.type !== 'hidden') {
        result = `<label class="popup__label popup__label--text">
          <span class="popup__label-text">${item.label}</span>
          ${result}
        </label>`;
      }
    }

    if (item.type !== 'hidden') {
      result = `<div class="popup__item popup__item--${item.type}">${result}</div>`;
    }


    return result;
  });

  return inputs.join('\n');
}

// ------------------------------

function getUsersList(popupData) {
  const items = popupData.variantsData;

  const usersItems = items.map(item => {
    // console.log(item.dataValues);
    const itemData = item.dataValues;
    const id = itemData.id;
    const login = itemData.login;

    const avatarUrl = itemData.avatarUrl;
    const avatar = avatarUrl ? `<img class="user__avatar user__avatar--choose-user" src="${avatarUrl}">` : '';

    const floorNum = itemData.homeFloor;
    let floor = '';
    if (floorNum !== '') {
      floor = `<div class="user__floor">${floorNum} этаж</div>`;
    }

    const input = `<input
      class="popup__checkbox"
      type="checkbox"
      name="${popupData.id}"
      value="${item.dataValues.id}"
      >`;

    const label = `<label class="popup__label user__label">
        ${input}
        <span class="popup__label-content user__container user__container--choose-user">
          <span class="user__content user__content--choose-user">
            ${avatar}
            ${login}
          </span>
        </span>
      </label>`;

    const liItem = `<li
      class="item user user--choose-user"
      data-searchtitle="${login}">
        ${label}
      </li>`;

    return liItem;
  });

  const list = `<ul class="popup__users users users--choose-user list list--columns">${usersItems.join('\n')}</ul>`;

  return `<fieldset class="popup__fieldset">
    <legend class="popup__legend">Участники</legend>
    ${popupData.search}
    <div class="popup__users-wrapper">
      ${list}
    </div>
  </fieldset>`;
}

// ------------------------------

function getRoomsList(popupData) {
  const rooms = popupData.variantsData.sort(sortByFloor);
  let groupOpen = false;
  let currentFloor = 0;

  const roomsItems = rooms.map(item => {
    // console.log(item.dataValues);
    const itemData = item.dataValues;
    const id = itemData.id;
    const title = itemData.title;

    const floorNum = itemData.floor;
    let floor = '';
    if (floorNum !== '') {
      floor = `${floorNum}. `;
    }

    let result = '';

    if (floorNum !== currentFloor) {
      if (groupOpen) {
        // Close group
        result += `</optgroup>`;
      }

      groupOpen = true;
      currentFloor = floorNum;
      result += `<optgroup label="${floorNum} этаж">`;
    }

    result +=`<option value="${id}">${floor}${title}</option>`;

    return result;
  });

  const roomsList = `${roomsItems.join('\n')}</optgroup>`;

  const select = `<select class="popup__select" name="roomid">${roomsList}</select>`;

  const label = `<label class="popup__label popup__label--select popup__label--rooms">
    <span class="popup__label-text">${popupData.label}</span>
    ${select}
  </label>`;


  return `${label}`;
}

// ------------------------------

function getRange(popupData) {
  // console.log(popupData);
  const input = `<input
    class="popup__range popup__range--${popupData.id}"
    type="range"
    name="${popupData.id}"
    id="${popupData.id}"
    min="0"
    max="180"
    step="15"
    value="15"
    data-tied='${popupData.tied}'
    >`;
  const label = `<label class="popup__label popup__label--range" for="${popupData.id}">
    <span class="popup__label-text">${popupData.label}</span>
  </label>`;

  const falseRange = `<div
    class="false-range"
    data-target=".popup__range--${popupData.id}"
    data-tied='${popupData.tied}'
    >
      <span class="false-range__period">
        <span class="false-range__start"></span>
        <span class="false-range__end"></span>
      </span>
      <span class="false-range__content">
        <span class="false-range__stripe">
          <span class="false-range__value"></span>
        </span>
      </span>

  </div>`
  return `${label} ${input} ${falseRange}`;
}

// ------------------------------

function getConentInput(item) {

  let result = `<input
    class="popup__input popup__input--${item.id}"
    type="hidden"
    name="${item.id}"
    data-textelem=".popup__value--${item.id}"
    >`;

  result += `${item.label}: <span class="popup__value popup__value--${item.id}"></span>`;

  return result;
}

// ------------------------------

function renderPopup(popupData){
  const template = popupData.template;
  const view = {
    id: popupData.id,
    title: popupData.title,
    inputs: getAddPopupInputs(popupData.inputs)
  };

  return new Promise(function(resolve, reject) {
    fs.readFile(path.join(__dirname, `../views/${template}.mustache`), 'utf8', (err, template) => {
      if (err) throw err;
      resolve(mustache.render(template, view));
    });
  });
}

// ------------------------------

function getSearch(view) {
  const template = 'search';

  return new Promise(function(resolve, reject) {
    fs.readFile(path.join(__dirname, `../views/${template}.mustache`), 'utf8', (err, template) => {
      if (err) throw err;
      resolve(mustache.render(template, view));
    });
  });
}

// ------------------------------

function addMods(params) {
  let classList = [params.class];

  if (params.mods) {
    params.mods.forEach(mod => {
      classList.push(`${classList[0]}--${mod}`);
    })
  }

  if (params.isCurrent) {
    classList.push(`${classList[0]}--current`);
  }
  if (params.mix) {
    params.mix.forEach(mix => {
      classList.push(mix);
    })
  }

  return classList.join(' ');
}

// ------------------------------

function getErrorMarkup(error) {
  if (!error) {
    return '';
  }

  return `<div class="message message--error">
    <div class="container">${error}</div>
  </div>`;
}

// ------------------------------

function getMessageMarkup(message) {
  if (!message) {
    return '';
  }

  return `<div class="message">
    <div class="container">${message}</div>
  </div>`;
}

// ------------------------------

module.exports = {
  addMods: addMods,
  findMatches: findMatches,
  getAddPopupInputs: getAddPopupInputs,
  getErrorMarkup: getErrorMarkup,
  getMessageMarkup: getMessageMarkup,
  getSearch: getSearch,
  getTimeFromRequest: getTimeFromRequest,
  renderPopup: renderPopup,
  sortByFloor: sortByFloor,
};
