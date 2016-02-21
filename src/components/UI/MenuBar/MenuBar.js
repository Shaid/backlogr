import React, {Component, PropTypes} from 'react';
import { Link } from 'react-router';
import { connect } from 'react-redux';

import { Icon } from 'components/UI';
import { show as showMenu } from 'redux/modules/mainmenu';

@connect(null,
{showMenu})
export default class MenuBar extends Component {
  static propTypes = {
    path: PropTypes.string,
    showMenu: PropTypes.func.isRequired,
    viewing: PropTypes.string
  }

  render() {
    const styles = require('./MenuBar.scss');

    let menuIcon = 'menu';
    let menuAction = this.props.showMenu;
    let links;
    switch (this.props.viewing) {
      case 'radar' : case 'warnings' :
        links = <Link className={styles.back} to="/weather">Back to Weather</Link>;
        menuIcon = 'chevron_left';
        menuAction = ''; // @TODO Make this 'navigate' to /weather
        break;
      default:
        links = <Link className={styles.radar} to="/radar">Radar</Link>;
    }

    return (
      <div className={styles.menuBar}>
        <div onTouchTap={menuAction}><Icon icon={menuIcon} styling={styles.hamburgerIcon} /></div>
        <div className={styles.controls}>
          {links}
        </div>
        <Link to="/warnings"><Icon icon="warning" styling={styles.warningIcon} /></Link>
      </div>
    );
  }
}
