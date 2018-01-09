const resolvers = require('../graphql/resolvers')();
const query = resolvers.Query;
const mutation = resolvers.Mutation;
const header = require('./header');
const tools = require('./tools');
let pageResponse = null;
let pageReq = null;
let pageReqBody = null;
let data = {};

const popupData = {};

popupData.add = {
  template: 'popup-add',
  id: 'add-room',
  title: 'Добавить переговорку',
  inputs: [
    {
      id: 'title',
      type: 'text',
      label: 'Название*',
      required: true
    },
    {
      id: 'capacity',
      type: 'number',
      label: 'Количество&nbsp;мест',
    },
    {
      id: 'floor',
      type: 'number',
      label: 'Этаж',
    }
  ]
};

popupData.edit = {
  id: 'edit-room',
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
    {
      id: 'capacity',
      type: 'number',
      label: 'Количество&nbsp;мест',
    },
    {
      id: 'floor',
      type: 'number',
      label: 'Этаж',
    }
  ]
};

const searchData = {
  id: 'rooms',
  selector: '.room',
  placeholderText: 'Найти переговорку'
};

// ------------------------------

function getPage(req, res) {
  pageResponse = res;
  pageReq = req;
  pageReqBody = req.body;

  if (!pageReqBody.action) {
    queryRooms();
    return;
  }

  // console.log(pageReqBody);
  query.rooms()
    .then(rooms => {
      data.rooms = rooms;
      const matches = tools.findMatches(rooms, pageReqBody);

      if (pageReqBody.action == 'create' && matches.byName == 0) {
        createRoom();
      }
      else if (pageReqBody.action == 'update') {
        if (pageReqBody.save) {
          updateRoom();
        }
        else if (pageReqBody.remove && matches.byId > 0) {
          removeRoom();
        }
        else {
          queryRooms();
        }
      }
      else {
        queryRooms();
      }
    });
}

// ------------------------------

function createRoom() {
  // console.log(pageReqBody);
  const title = pageReqBody['title'];
  const floor = pageReqBody['floor'];
  const capacity = pageReqBody['capacity'];

  mutation.createRoom ({
    input: {
      title: title,
      floor: floor,
      capacity: capacity
    }
  })
    .then(roomData => {
      queryRooms()
    });
}

// ------------------------------

function updateRoom() {
  const title = pageReqBody['title'];
  const floor = pageReqBody['floor'];
  const capacity = pageReqBody['capacity'];

  mutation.updateRoom ({
    id: pageReqBody.itemid,
    input: {
      title: title,
      floor: floor,
      capacity: capacity
    }
  })
    .then(roomData => {
      queryRooms()
    });
}

// ------------------------------

function removeRoom() {
  mutation.removeRoom ({
    id: pageReqBody.itemid
  })
    .then(roomData => {
      queryRooms()
    });
}

// const room = roomData.dataValues;
// const title = room.title;
// const floor = room.floor;
// const capacity = room.capacity;

// pageResponse.send(`
//     <h1>Переговорка добавлена</h1>
//     <h2>${title}</h2>
//     <div>${floor} этаж</div>
//     <div>На ${capacity} человека</div>

//     <div><p><a href="./">Назад</a></p></div>
//   `);


// ------------------------------

function queryRooms() {
  query.rooms()
    .then(rooms => {
      data.rooms = rooms.sort(tools.sortByFloor);
      renderPage();
    })
}

// ------------------------------

function renderPage() {
  const rooms = getAllRooms();
  const counter = data.rooms.length;
  const popupProms = [tools.renderPopup(popupData.add), tools.renderPopup(popupData.edit)];
  let search = '';

  tools.getSearch(searchData)
    .then(response => {
      search = response;

      return Promise.all(popupProms)
    })
    .then((popups) => {
      const popupAdd = popups[0];
      const popupEdit = popups[1];

      // console.log(popupAdd);
      pageResponse.render(
        'rooms',
        {
          header: header(pageReq),
          counter: counter,
          popupAdd: popupAdd,
          popupEdit: popupEdit,
          rooms: rooms,
          search: search,
        }
      );
    });
}

// ------------------------------

function getAllRooms() {
  const listItems = data.rooms.map(item => {

    const itemData = item.dataValues;
    // fillSheduleEvents(itemData);

    // // console.log(itemData.shedule);
    // if (Object.keys(itemData.shedule).length == 0) {
    //   console.log('No actual events');
    //   return '';
    // }

    // let shedulesForDays = [];
    // let tabsForDays = [];

    // dtTools.daysList.forEach((day, i) => {
    //   const roomId = itemData.id;
    //   const sheduleId = `room-${roomId}__${day.key}`;
    //   const sheduleList = getSheduleList(itemData, day, sheduleId);
    //   const tab = getTab(day, sheduleId);

    //   shedulesForDays.push(sheduleList);
    //   tabsForDays.push(tab);
    // });

    // shedulesForDays = shedulesForDays.join('\n');
    // tabsForDays = tabsForDays.join('\n');
    // tabsForDays = `<ul class="tabs__controls">${tabsForDays}</ul>`

    let floor = itemData.floor;
    if (floor) {
      floor += '. ';
    }

    const liItem = `<li class="item room editable"
      data-searchtitle="${itemData.title}"
      data-group="edit-room"
      data-itemid="${itemData.id}"
      data-title="${itemData.title}"
      data-floor="${itemData.floor}"
      data-capacity="${itemData.capacity}">
      <div class="room__content editable__container">
        <h3 class="room__title">
          ${floor}${itemData.title}
        </h3>
        <div class="room__capacity">На ${itemData.capacity} человек</div>

        <button class="button-edit room__button-edit popup-control popup-control--edit">&#9998;</button>
      </div>
    </li>`
    return liItem;
  });

  //       <div class="tabs">
  // ${tabsForDays}
  // ${shedulesForDays}

  //     </div>


  const list = `<ul class="rooms__list list list--cells">${listItems.join('')}</ul>`;

  return list;
}

// ------------------------------

module.exports.rooms = getPage
