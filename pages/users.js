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

const popupData = {};

popupData.add = {
  template: 'popup-add',
  id: 'add-user',
  title: 'Добавить сотрудника',
  inputs: [
    {
      id: 'login',
      type: 'text',
      label: 'Логин*',
      required: true
    },
    {
      id: 'floor',
      type: 'number',
      label: 'Этаж',
    }
  ]
};

popupData.edit = {
  id: 'edit-user',
  template: 'popup-edit',
  title: 'Редактировать сотрудника',
  inputs: [
    {
      id: 'itemid',
      type: 'hidden'
    },
    {
      id: 'login',
      type: 'text',
      label: 'Логин*',
      required: true
    },
    {
      id: 'floor',
      type: 'number',
      label: 'Этаж',
    }
  ]
};

const searchData = {
  id: 'users',
  selector: '.user',
  placeholderText: 'Найти сотрудника'
};

// ------------------------------

function getPage(req, res) {
  pageResponse = res;
  pageReq = req;
  pageReqBody = req.body;

  // console.log(pageReqBody);

  if (!pageReqBody.action) {
    queryUsers();
    return;
  }

  query.users()
    .then(users => {
      data.users = users;
      const matches = tools.findMatches(users, pageReqBody);

      if (pageReqBody.action == 'create' && matches.byName == 0) {
        // console.log('create');
        createUser();
      }
      else if (pageReqBody.action == 'update') {
        if (pageReqBody.save) {
          updateUser();
        }
        else if (pageReqBody.remove && matches.byId > 0) {
          removeUser();
        }
        else {
          queryUsers();
        }
      }
      else {
        queryUsers();
      }
    });
}

// ------------------------------

function createUser() {
  mutation.createUser({
    input: {
      login: pageReqBody.login,
      homeFloor: pageReqBody.floor
    }
  })
    .then(response => {
      queryUsers();
    });
}

// ------------------------------

function updateUser() {
  mutation.updateUser({
    id: pageReqBody.itemid,
    input: {
      login: pageReqBody.login,
      homeFloor: pageReqBody.floor
    }
  })
    .then(response => {
      queryUsers();
    });
}

// ------------------------------

function removeUser() {
  mutation.removeUser({
    id: pageReqBody.itemid
  })
    .then(response => {
      queryUsers();
    });
}

// ------------------------------

function queryUsers() {
  query.users()
    .then(users => {
      data.users = users;

      renderPage();
    });
}

// ------------------------------

function renderPage() {
  const users = getAllUsers();
  const counter = data.users.length;

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
        'users',
        {
          header: header(pageReq),
          counter: counter,
          popupAdd: popupAdd,
          popupEdit: popupEdit,
          search: search,
          users: users,
        }
      );
    });
}

// ------------------------------

function getAllUsers() {
  const listItems = data.users.map(item => {
    const itemData = item.dataValues;
    const id = itemData.id;
    const login = itemData.login;

    const floorNum = itemData.homeFloor;
    let floor = '';
    if (floorNum !== '') {
      floor = `<div class="user__floor">${floorNum} этаж</div>`;
    }

    const avatarUrl = itemData.avatarUrl;
    const avatar = avatarUrl ? `<img class="user__avatar" src="${avatarUrl}">` : '';

    const liItem = `<li
      class="item user editable"
      data-searchtitle="${login}"
      data-group="edit-user"
      data-itemid="${id}"
      data-login="${login}"
      data-floor="${floorNum}">
      <div class="user__container editable__container">
        ${avatar}
        <div class="user__content">
          <h3 class="user__login">${login}</h3>
          ${floor}
        </div>

        <button
            class="button-edit user__button-edit popup-control popup-control--edit">&#9998;</button>
      </div>
    </li>`;
    return liItem;
  });

  const list = `<ul class="users__list list list--cells">${listItems.join('')}</ul>`;

  return list;
}

module.exports.users = getPage;
