import React, {Component, PropTypes} from 'react';
import { connect } from 'react-redux';
import { change as changeLocation } from 'redux/modules/location';
import { remove as removeRecent } from 'redux/modules/recent';
import { hide as hideMenu } from 'redux/modules/mainmenu';
import { stateNames } from 'helpers/stateNames';
import { Icon } from 'components/UI';

@connect(null,
{changeLocation, hideMenu, removeRecent})
export default class Recent extends Component {
  static propTypes = {
    recent: PropTypes.object,
    changeLocation: PropTypes.func.isRequired,
    hideMenu: PropTypes.func.isRequired,
    removeRecent: PropTypes.func.isRequired,
  }

  handleChangeLocation(newLocation) {
    this.props.changeLocation(newLocation);
    this.props.hideMenu();
  }

  handleRemove(event) {
    this.props.removeRecent(this.props.recent);
    event.stopPropagation();
  }

  render() {
    const styles = require('./Recent.scss');
    const recent = this.props.recent;

    return (
      <div onTouchTap={() => this.handleChangeLocation(recent)} className={styles.recent}>
        <div onTouchTap={(event) => this.handleRemove(event)}><Icon icon="close" styling={styles.delete} /></div>
        <Icon icon="chevron_right" styling={styles.chevron} />
        <div className={styles.labelName}>{recent.name}</div>
        <div className={styles.labelState}>{stateNames[recent.state].toUpperCase()}</div>
      </div>
    );
  }
}
