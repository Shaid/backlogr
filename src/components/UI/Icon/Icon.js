import React, {Component, PropTypes} from 'react';

export default class Icon extends Component {
  static propTypes = {
    icon: PropTypes.string,
    styling: PropTypes.string,
  }

  render() {
    const {icon, styling} = this.props; // eslint-disable-line no-shadow
    // const styles = require('./Icon.scss');

    const extraStyle = styling ? styling : '';
    return (
      <div className={'material-icons ' + extraStyle}>
        {icon}
      </div>
    );
  }
}
