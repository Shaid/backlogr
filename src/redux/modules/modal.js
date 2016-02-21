const SHOW = 'bomelette/modal/SHOW';
const HIDE = 'bomelette/modal/HIDE';
const SET_DAY = 'bomelette/moda/SET_DAY';
const PREVIOUS = 'bomelette/modal/PREVIOUS';
const NEXT = 'bomelette/modal/NEXT';

const initialState = {
  display: false,
  day: 0,
};

export default function mainmenu(state = initialState, action = {}) {
  switch (action.type) {
    case SHOW:
      return {
        ...state,
        display: true,
      };
    case HIDE:
      return {
        ...state,
        display: false
      };
    case PREVIOUS:
      return {
        ...state,
        day: --state.day >= 0 ? state.day : 0
      };
    case NEXT:
      return {
        ...state,
        day: ++state.day <= 6 ? state.day : 6
      };
    case SET_DAY:
      return {
        ...state,
        day: action.day,
      };
    default:
      return state;
  }
}

export function show() {
  return {
    type: SHOW,
  };
}

export function hide() {
  return {
    type: HIDE,
  };
}

export function setDay(day) {
  return {
    type: SET_DAY,
    day: day,
  };
}

export function previous() {
  return {
    type: PREVIOUS,
  };
}

export function next() {
  return {
    type: NEXT,
  };
}
