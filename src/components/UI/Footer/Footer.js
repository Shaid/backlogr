import React, {Component} from 'react';

export default class Footer extends Component {

  render() {
    // const {info, load} = this.props; // eslint-disable-line no-shadow
    const styles = require('./Footer.scss');
    return (
      <div className={styles.footer}>
        <div className={styles.content}>
          <div className={styles.crest}>
            <img src={require('../../../theme/assets/logo-crest-black.svg')} />
          </div>
          <div className={styles.brand + ' ' + styles.bold}>
              Australian Government
          </div>
          <div className={styles.brand}>
            Bureau of Meteorology
          </div>
        </div>
      </div>
    );
  }
}
