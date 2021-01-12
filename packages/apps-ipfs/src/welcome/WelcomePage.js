// [object Object]
// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { connect } from 'redux-bundler-react';
import { withTranslation } from 'react-i18next';
import ReactJoyride from 'react-joyride';
import withTour from '../components/tour/withTour';
import { welcomeTour } from '../lib/tours';
import { getJoyrideLocales } from '../helpers/i8n';

// Components
import IsNotConnected from '../components/is-not-connected/IsNotConnected';
import ComponentLoader from '../loader/ComponentLoader.js';
import { useHistory } from 'react-router-dom';

const WelcomePage = ({ doUpdateHash, ipfsConnected, ipfsInitFailed, ipfsReady }) => {
  const history = useHistory();

  if (!ipfsInitFailed && !ipfsReady) {
    return <ComponentLoader pastDelay />;
  }

  if (ipfsConnected) {
    history.push('/storage');
  }

  return (
    <IsNotConnected />
  );
};

export default connect(
  'selectIpfsInitFailed',
  'selectIpfsConnected',
  'selectIpfsReady',
  'selectApiUrl',
  'selectToursEnabled',
  'doUpdateHash',
  withTour(withTranslation('welcome')(WelcomePage))
);