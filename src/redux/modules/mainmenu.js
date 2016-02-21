const SHOW = 'bomelette/mainMenu/SHOW';
const HIDE = 'bomelette/mainMenu/HIDE';

const initialState = {
  display: false
};

export default function mainmenu(state = initialState, action = {}) {
  switch (action.type) {
    case SHOW:
      return {
        ...state,
        display: true
      };
    case HIDE:
      return {
        ...state,
        display: false
      };
    default:
      return state;
  }
}

export function show() {
  return {
    type: SHOW
  };
}

export function hide() {
  return {
    type: HIDE
  };
}
