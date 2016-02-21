import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { MainMenu, MenuBar, Footer } from 'components/UI';

const injectTapEventPlugin = require("react-tap-event-plugin");
injectTapEventPlugin();

@connect(
  state => ({pathname: state.routing.location.pathname, mainMenu: state.mainmenu}))
export default class App extends Component {
  static propTypes = {
    pathname: PropTypes.string,
    mainMenu: PropTypes.object
  };
  render() {
    const styles = require('./App.scss');

    return (
      <div className={styles.app}>
        <MenuBar />
        <MainMenu />
        <div>Hello world!</div>
        <Footer />
      </div>
    );
  }
}
