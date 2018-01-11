const now = new Date();
const year = now.getFullYear();
const eventsStep = 15;
const eventsStepsInHour = 60 / eventsStep;

const monthes = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

const monthesShortEng = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

const todayObj = parseDate(now);
const daysList = getDaysList();

const hours = [];
const startHour = 8;
const hoursInDay = 12;
for (let i = startHour; i < (startHour + hoursInDay); i++) {
  hours.push(i);
}

// ------------------------------

function parseDate(date) {
  return {
    year: date.getFullYear(),
    monthNum: date.getMonth() + 1,
    month: monthes[date.getMonth()],
    dayNum: date.getDate(),
    hours: date.getHours(),
    mins: date.getMinutes()
  };
}

// ------------------------------

// Input needs parsed date
function prettyDate (dateStart, dateEnd) {
  const dayStart = dateStart.dayNum;
  const dayEnd = dateEnd.dayNum;
  const monthStart = dateStart.month;
  const monthEnd = dateEnd.month;
  const year = dateStart.year;
  const hoursStart = dateStart.hours;
  const minsStart = dateStart.mins > 9 ? dateStart.mins : `0${dateStart.mins}`;
  const hoursEnd = dateEnd.hours;
  const minsEnd = dateEnd.mins > 9 ? dateEnd.mins : `0${dateEnd.mins}`;;

  if (dayStart == dayEnd && monthStart == monthEnd) {
    const period = `${hoursStart} <sup>${minsStart}</sup> &ndash; ${hoursEnd}<sup>${minsEnd}</sup>`;

    return `<span class="date">${dayStart} ${monthStart}</span>
    <span class="time">${period}</span>`;
  }
  else {
    return `<span class="date">${dayStart} ${monthStart}</span>
    <span class="time">${hoursStart} <sup>${minsStart}</sup></span>
    &ndash;
    <span class="date">${dayEnd} ${monthEnd}</span>
    <span class="time">${hoursEnd} <sup>${minsEnd}</sup></span>`;
  }
};

// ------------------------------

function getDaysList () {
  const daysList = [];
  const todayObj = parseDate(now);
  const hour = 60 * 60 * 1000;

  const day = hour * 24;
  const oneDayLater = new Date(now.getTime() + day);
  const twoDaysLater = new Date(now.getTime() + day * 2);

  const oneDayObj = parseDate(oneDayLater);
  const twoDaysObj = parseDate(twoDaysLater);

  [todayObj, oneDayObj, twoDaysObj].forEach(dateObj => {
    const key = getDayKey(dateObj);
    const code = `${dateObj.dayNum}/${dateObj.monthNum}`;
    const date = `${dateObj.dayNum} ${dateObj.month}`;

    daysList.push({
      key: key,
      code: code,
      date: date
    });
  });

  return daysList;
}

// ------------------------------

function getDayKey (dateObj) {
  return `${dateObj.dayNum}-${monthesShortEng[dateObj.monthNum - 1]}`;
}

// ------------------------------

function getEmptySheduleForDay(roomsIds) {
  const shedule = {};

  roomsIds.forEach(roomId => {
    shedule[roomId] = {};
    shedule[roomId].roomId = roomId;
    shedule[roomId].events = [];

    hours.forEach(hour => {

      shedule[roomId].events = shedule[roomId].events.concat(getEmptyEvents(hour));

    });
  });

  return shedule;
}

// ------------------------------

function getEmptyEvents(hour) {
  const events = [];

  for (var i = 0; i < eventsStepsInHour; i++) {
    let mins = eventsStep * i;

    events.push({
      hour: hour,
      mins: mins,
      event: null
    });
  }

  return events;
}

// ------------------------------

function getEventDuration(itemData) {
  const start = itemData.dateStart;
  const end = itemData.dateEnd;
  let duration = end.getTime() - start.getTime();
  duration = duration / 60 / 1000;

  return duration;
}

// ------------------------------

module.exports = {
    daysList: daysList,
    eventsStep: eventsStep,
    eventsStepsInHour: eventsStepsInHour,
    getDayKey: getDayKey,
    getEmptySheduleForDay: getEmptySheduleForDay,
    getEventDuration: getEventDuration,
    hoursInDay: hoursInDay,
    monthes: monthes,
    prettyDate: prettyDate,
    parseDate: parseDate,
    startHour: startHour,
    todayDayKey: getDayKey(todayObj),
  };
