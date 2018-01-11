'use strict';

const body = document.body;

// ------------------------------
// TABS
// ------------------------------

const Tabs = function (container) {
  this.container = container;
  const controls = container.querySelectorAll('.tabs__control');

  this.currentClasses = {
    control: 'tabs__control--current',
    content: 'tabs__content--current'
  };

  this.currents = {
    control: container.querySelector(`.${this.currentClasses.control}`),
    content: container.querySelector(`.${this.currentClasses.content}`)
  }

  controls.forEach(tabControl => {
    tabControl.addEventListener('click', (event) => {
      if(!tabControl.classList.contains(this.currentClasses.control)) {
        this.showTab(tabControl);
      }
    });
  });
};

Tabs.prototype.showTab = function (tabControl) {
    const targetSelector = tabControl.dataset.target;
    const contentToShow = this.container.querySelector(targetSelector);

    // Content
    contentToShow.classList.add(this.currentClasses.content);
    this.currents.content.classList.remove(this.currentClasses.content);
    this.currents.content = contentToShow;

    // Control
    tabControl.classList.add(this.currentClasses.control);
    this.currents.control.classList.remove(this.currentClasses.control);
    this.currents.control = tabControl;
};

const tabsSets = document.querySelectorAll('.tabs');

tabsSets.forEach(tabsSet => {
  var tabs = new Tabs(tabsSet);
});

// ------------------------------
// FALSE RANGE
// ------------------------------

const FalseRange = function (elem, popup) {
  this.elem = elem;
  this.popup = popup;

  const targetSelector = elem.dataset.target;
  this.target = popup.querySelector(targetSelector);

  const tiedSelector = elem.dataset.tied;
  this.tied = this.target.form.querySelector(`input[name="${tiedSelector}"]`);
  this.stripe = elem.querySelector('.false-range__stripe');

  this.content = elem.querySelector('.false-range__content');
  this.period = elem.querySelector('.false-range__period');
  this.start = elem.querySelector('.false-range__start');
  this.end = elem.querySelector('.false-range__end');
  this.val = elem.querySelector('.false-range__value');
  this.setValues();
  this.isMouseDown = false;

  const that = this;

  this.content.addEventListener('click', (event) => {
    this.moveControl(event);
  });

  this.content.addEventListener('mousedown', (event) => {
    this.isMouseDown = true;
    this.content.addEventListener('mousemove', mouseMove);
  });

  this.content.addEventListener('mouseup', (event) => {
    this.isMouseDown = false;
    this.content.removeEventListener('mousemove', mouseMove);
  });

  this.stripe.addEventListener('mouseout', (event) => {
    if (!event.toElement.classList.contains('false-range__content')
      && !event.toElement.classList.contains('false-range__stripe')
      && !event.toElement.classList.contains('false-range__value')) {
      this.content.removeEventListener('mousemove', mouseMove);
    }
    else {
      this.isMouseDown = false;
    }
  });

  this.target.addEventListener('input', () => {
    this.setValues();
  });

  function mouseMove (event) {
    that.moveControl(event);
  }
}

FalseRange.prototype.setValues = function () {
  const stripeWidth = this.target.value / this.target.max * 100;
  this.stripe.style.width = `${stripeWidth}%`;
  this.period.style.width = `${stripeWidth}%`;
  this.showTime();
}

FalseRange.prototype.moveControl = function (event) {
  const proportion = (event.offsetX + 5) / this.elem.clientWidth;
  const stripeWidth = proportion * 100;
  this.stripe.style.width = `${stripeWidth}%`;
  this.period.style.width = `${stripeWidth}%`;

  const targetValueSrc = this.target.max * proportion;
  const targetValue = targetValueSrc - (targetValueSrc % this.target.step);
  this.target.value = targetValue;

  this.showTime();
}

FalseRange.prototype.showTime = function() {
  const startTimeSrc = this.tied.value.split(':');
  const startHours = startTimeSrc[0];
  const startMins = startTimeSrc[1];

  const time = new Date(2000,0,1, startHours, startMins);
  const durInMs = this.target.value * 60 * 1000
  const nextTimeSrc = new Date(time.getTime() + durInMs);

  let nextTimeHours = nextTimeSrc.getHours();
  let nextTimeMins = nextTimeSrc.getMinutes();
  if (nextTimeMins < 10) {
    nextTimeMins = `0${nextTimeMins}`;
  }
  const nextTime = `${nextTimeHours}:${nextTimeMins}`;

  this.start.innerHTML = this.tied.value;
  this.val.innerHTML = this.target.value;
  this.end.innerHTML = nextTime;


  if (this.target.value < 60) {
    this.val.innerHTML = `${this.target.value} минут`;
    return;
  }

  let mins = this.target.value % 60;

  if (mins < 10) {
    mins = `0${mins}`;
  }

  const hours = (this.target.value - mins) / 60;
  this.val.innerHTML = `${hours}<sup class="false-range__mins">${mins}</sup>`;
}

// ------------------------------
// ROOMS EVENTS
// ------------------------------

const RoomEvents = function(elem) {
  this.elem = elem;
  const slots = elem.querySelectorAll('.rooms-events__slot');

  slots.forEach(slot => {
    slot.addEventListener('mouseover', () => {
      this.showTime(slot.dataset);
    });

    slot.addEventListener('mouseout', () => {
      this.hour.innerHTML = this.hourInitValue;
      this.hour.classList.remove('rooms-events__hour--hovered');
    });
  });
}

RoomEvents.prototype.showTime = function(dataset) {
  this.hour = this.elem.querySelector(`.rooms-events__hour--${dataset.hours}`);
  this.hourInitValue = this.hour.innerHTML;
  this.hour.innerHTML = `${dataset.hours}<sup class="rooms-events__mins">${dataset.mins}</sup>`;
  this.hour.classList.add('rooms-events__hour--hovered');
}

const roomEvents = document.querySelectorAll('.rooms-events');
roomEvents.forEach(item => {
  const roomEvent = new RoomEvents(item);
});

// Add classes for popup--add
roomEvents.forEach(item => {
  item.classList.add('popup-control--add');
  item.dataset.target = '.popup--add-event';
});

// ------------------------------
// POPUP--ADD CONTROL
// ------------------------------

let openedPopup = null;

const PopupControlAdd = function (elem) {
  const targetSelector = elem.dataset.target;
  this.target = document.querySelector(targetSelector);
  this.inputs = this.target.querySelectorAll('input, select');
  this.elem = elem;
  this.data = Object.assign({}, elem.dataset);

  elem.addEventListener('click', (event) => {

    // Change popup
    if (event.target.dataset.itemid) {
      this.target = document.querySelector('.popup--edit');
      this.inputs = this.target.querySelectorAll('input, select');
    }
    // Fill popup for shedule events
    if (this.elem.dataset.day) {
      this.data = Object.assign(this.data, event.target.dataset);
      this.fillInputs();
    }

    this.initRanges();

    closeOpenedPopup();
    openedPopup = this.target;
    this.openPopup();
    body.classList.add('body--popup-shown');
  });
};

PopupControlAdd.prototype.fillInputs = function () {
  this.inputs.forEach(input => {
    const dataForName = this.data[input.name];

    if (dataForName == undefined || dataForName == '') {
      return;
    }
    // For users
    if (input.type == 'checkbox') {
      input.checked = false;
      const valsList = dataForName.split(',');

      if (valsList.indexOf(input.value) >= 0){
        input.checked = true;
      }
    }
    else {
      input.value = dataForName;

      if (input.dataset.textelem) {
        const textElem = this.target.querySelector(input.dataset.textelem);
        textElem.innerHTML = dataForName;
      }
    }
  });
}

PopupControlAdd.prototype.openPopup = function() {
  this.target.classList.toggle('popup--openened');

  const firstInput = this.target.querySelector('.popup__input[type="text"],.popup__range');
  setFocus(firstInput);
};

PopupControlAdd.prototype.initRanges = function() {
  const falseRanges = this.target.querySelectorAll('.false-range');
  falseRanges.forEach(item => {
    const falseRange = new FalseRange(item, this.target);
  })
};

const popupControlsAdd = document.querySelectorAll('.popup-control--add');

popupControlsAdd.forEach(item => {
  const popupControlAdd = new PopupControlAdd(item);
});

// ------------------------------
// EDIT-ITEMS DATA
// ------------------------------

// Popup element
let editUser = {
  widget: document.querySelector('.edit-user')
};

if (editUser.widget !== null) {
  editUser = {
    widget: editUser.widget,
    // Inputs names is equal to data attrs on editable item
    inputs: editUser.widget.querySelectorAll('input'),
    close: editUser.widget.querySelector('.popup__button-close'),
    current: null
  };
}

// Popup element
let editRoom = {
  widget: document.querySelector('.edit-room')
};

if (editRoom.widget !== null) {
  editRoom = {
    // Popup element
    widget: editRoom.widget,
    // Inputs names is equal to data attrs on editable item
    inputs: editRoom.widget.querySelectorAll('input'),
    close: editRoom.widget.querySelector('.popup__button-close'),
    current: null
  };
}


// Tie group data to particular popup for editable item
const editGroupsData = {
  'edit-user': editUser,
  'edit-room': editRoom
};

// ------------------------------
// POPUP--EDIT CONTROL
// ------------------------------

// Usage:
// Fill data above^ and:
//
// <li
//   class="item user editable" <-- mark elem as editable
//   data-group="edit-user"  <-- tie group
//   data-userid="${id}"  <-- place to data content for filling popup inputs
//   data-login="${login}"
//   data-floor="${floorNum}">
//     <div class="editable__container"> <-- mark content wich would be replaced
//         <button
//           class="popup-control popup-control--edit" <-- add control for opening popup
//           >&#9998;</button>
//         [...]
//     </div>
//   </li>

const EditableItem = function (elem) {
  this.elem = elem;
  const group = elem.dataset.group;
  this.groupData = editGroupsData[group];
  this.container = elem.querySelector('.editable__container');
  const controlEdit = elem.querySelector('.popup-control--edit');

  this.isOpen = false;

  controlEdit.addEventListener('click', () => {
    closeOpenedPopup();

    openedPopup = this.groupData.widget;
    this.elem.classList.add('editable--opened');
    this.edit();
  });
}

EditableItem.prototype.fillInputs = function () {
  this.groupData.inputs.forEach(input => {
    const dataForName = this.elem.dataset[input.name];
    if (dataForName) {
      input.value = dataForName;
    }
  });
}

EditableItem.prototype.edit = function () {
  this.fillInputs();

  this.elem.replaceChild(this.groupData.widget, this.container);

  const firstInput = this.groupData.widget.querySelector('.popup__input:not([type="hidden"])');
  setFocus(firstInput);


  this.isOpen = true;
  this.groupData.current = this;

  this.groupData.close.addEventListener('click', () => {
    this.close();
  });
};

EditableItem.prototype.close = function () {
  if (!this.isOpen) {
    return;
  }
  this.elem.replaceChild(this.container, this.groupData.widget);
  this.groupData.current = null;
  this.isOpen = false;
  this.elem.classList.remove('editable--opened');
}

const editableItems = document.querySelectorAll('.editable');

editableItems.forEach(item => {
  const editableItem = new EditableItem(item);
});

// ------------------------------
// CLOSE POPUP
// ------------------------------

const Popup = function (elem) {
  this.elem = elem;
  this.popupClass = findPopupClass(elem.classList);
  const close = elem.querySelector('.popup__button-close');

  if (!close) {
    // Нет закрывашки
    return;
  }

  this.elem.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  close.addEventListener('click', () => {
    this.closePopup();
  });
}

Popup.prototype.closePopup = function(){
  this.elem.classList.remove('popup--openened');
  body.classList.remove('body--popup-shown');
  openedPopup = null;
}

// Close on Esc
document.body.addEventListener('keyup', (event) => {
  if (event.keyCode == 27) {
    closeOpenedPopup();
  }
})

function closeOpenedPopup() {
  if (!openedPopup) {
    return;
  }
  const group = openedPopup.dataset.group;
  const groupData = editGroupsData[group];

  if (groupData) {
    groupData.current.close();
  }
  else {
    openedPopup.classList.remove('popup--openened');
    body.classList.remove('body--popup-shown');
  }

  openedPopup = null;
}

const popups = document.querySelectorAll('.popup');

popups.forEach(item => {
  const popup = new Popup(item);
});

// Close on click on glass
const popupGlass = document.querySelector('.popup-glass');
popupGlass.addEventListener('click', () => {
  closeOpenedPopup();
});

// ------------------------------
// SEARCH
// ------------------------------

// Usage:
// <input
//  class="search-input"
//  type="search"
//  data-selector=".room"  <-- class of items for search on the same page
//  placeholder="Найти переговорку">
//
// Searchable item markup:
// <li class="item room" data-searchtitle="${itemData.title}">

const Search = function (elem) {
  const searchItemsSelector = elem.dataset.selector;
  const searchItems = document.querySelectorAll(searchItemsSelector);

  if (!searchItems[0]) {
    return;
  }

  const searchItemsParent = searchItems[0].parentNode;
  const usersSearchResultsClass = 'search-results';
  const classFounded = 'search-results__founded';
  let searchResults = [];

  elem.addEventListener('input', findItems);

  function findItems() {
    searchResults.forEach(item => {
      item.classList.remove(classFounded);
    });
    searchResults = [];

    if (this.value.length == 0) {
      searchItemsParent.classList.remove(usersSearchResultsClass);
      return;
    }

    searchItemsParent.classList.add(usersSearchResultsClass);

    searchItems.forEach(item => {
      const valueLowerCase = this.value.toLowerCase();
      const titleLowerCase = item.dataset.searchtitle.toLowerCase();

      // console.log(searchStr);
      if (titleLowerCase.indexOf(valueLowerCase) >= 0) {
        item.classList.add(classFounded);
        searchResults.push(item);
      }
    });
  }
}

const searchInputs = document.querySelectorAll('.search-input');

searchInputs.forEach(item => {
  const searchInput = new Search(item);
});

// ------------------------------
// HELPERS
// ------------------------------

function findPopupClass(classList) {
  classList.filter = [].filter;
  let result = '';

  const modClassList = classList.filter(item => {
    return item.indexOf('--') >=0;
  })

  if (modClassList.length > 0) {
    result = `.${modClassList[0]}`;
  }

  return result;
}

// ------------------------------

function setFocus(elem) {
  setTimeout(function() {
    elem.focus();
  }, 0);
}
