/**
 * @file The main workbench object of the application that allows users
 * to arrange views in a flexible manner.
 *
 * This file contains a singleton instance of the workbench that is then
 * imported by the app. The app then binds the workbench to the central
 * workbench view and the sidebar.
 */

import config from 'config';

import debounce from 'lodash-es/debounce';
import React from 'react';
import {
  PerspectiveBuilder,
  PerspectiveStorage,
  WorkbenchBuilder,
} from 'react-flexible-workbench';

import loadable from '@loadable/component';
import BackgroundHint from '@skybrush/mui-components/lib/BackgroundHint';

import { makeDetachable } from '~/features/detachable-panels/DetachablePanel';
import { saveWorkbenchState } from './features/workbench/slice';
import { injectFlockFromContext } from './flock';
import store from './store';
import { hasFeature } from './utils/configuration';
import views from './views';

const MapView = loadable(() =>
  import(/* webpackChunkName: "map" */ './views/map/MapView')
);

require('../assets/css/workbench.less');

/**
 * Dummy component that renders nothing.
 */
const Nothing = () => null;

/**
 * Fallback component to use in the workbench in case of errors.
 */
const FallbackComponent = () => (
  <BackgroundHint text='This component is not available in this version' />
);

/**
 * Helper function that returns the given value if and only if the given
 * feature is present in the configuration.
 */
const onlyWithFeature = (featureName, component) =>
  hasFeature(featureName) ? component : FallbackComponent;

/**
 * Registry that maps component types to be used in the top-level
 * GoldenLayout object to the corresponding React components.
 *
 * The React components will be created without any props. If you need the
 * components to have props, use a wrapper HOC.
 */

export const componentRegistry = {
  'beacon-list': {
    component: views.BeaconList,
    label: 'Beacons',
    detachable: true,
    feature: 'beacons',
  },
  'connection-list': {
    // deprecated, kept there for compatibility
    component: views.ConnectionList,
    label: 'Connections',
  },
  'dataset-list': {
    component: views.DatasetList,
    label: 'Datasets',
    detachable: true,
  },
  'dock-list': {
    component: views.DockList,
    label: 'Docks',
    detachable: true,
    feature: 'docks',
  },
  'feature-list': {
    component: views.FeatureList,
    label: 'Features',
    detachable: true,
    feature: 'features',
  },
  'ground-control-view': {
    component: injectFlockFromContext(views.GroundControlView),
    label: 'Ground control',
  },
  'layer-list': {
    component: views.LayerList,
    label: 'Layers',
    detachable: true,
  },
  'light-control': {
    component: views.LightControlPanel,
    label: 'Light control',
    detachable: true,
    feature: 'showControl',
  },
  'lcd-clock-panel': {
    component: views.LCDClockPanel,
    label: 'Clocks',
    detachable: true,
  },
  'log-panel': {
    component: views.LogPanel,
    label: 'Event log',
    detachable: true,
  },
  map: {
    component: MapView,
    label: 'Map',
    detachable: true,
  },
  messages: {
    // deprecated, kept there for compatibility
    component: views.MessagesPanelView,
    label: 'Messages',
  },
  placeholder: {
    component: Nothing,
    label: 'Placeholder',
  },
  'saved-location-list': {
    component: views.SavedLocationList,
    label: 'Locations',
    detachable: true,
  },
  'show-control': {
    component: views.ShowControlPanel,
    label: 'Show control',
    detachable: true,
    feature: 'showControl',
  },
  'three-d-view': {
    component: views.ThreeDTopLevelView,
    label: '3D View',
    feature: 'threeDView',
  },
  'uav-list': {
    component: injectFlockFromContext(views.UAVList),
    label: 'UAVs',
    detachable: true,
  },
};

function constructDefaultWorkbench(store) {
  const builder = new WorkbenchBuilder();

  // Register all our supported components in the builder
  for (const [name, entry] of Object.entries(componentRegistry)) {
    const featureModifier = (c) =>
      entry.feature ? onlyWithFeature(entry.feature, c) : c;
    const detachModifier = (c) =>
      entry.detachable ? makeDetachable(name, entry.label, c) : c;
    builder.registerComponent(
      name,
      featureModifier(detachModifier(entry.component))
    );
  }

  // prettier-ignore
  const workbench = builder
    .makeColumns()
      .makeStack()
        .add('map')
          .setTitle('Map')
          .setId('map')
        .add('uav-list')
          .setTitle('UAVs')
          .setId('uavs')
        .add('three-d-view')
          .setTitle('3D View')
          .setId('threeDView')
          .preventReorder()
        .finish()
      .makeRows()
        .makeStack()
          .add('lcd-clock-panel')
            .setTitle('Clocks')
            .setId('clocks')
          .add('saved-location-list')
            .setTitle('Locations')
            .setId('locations')
          .add('layer-list')
            .setTitle('Layers')
            .setId('layers')
          .finish()
          .setRelativeHeight(25)
        .makeStack()
          .add('show-control')
            .setTitle('Show control')
            .setId('show')
          .add('light-control')
            .setTitle('Light control')
            .setId('lights')
          .finish()
        .finish()
        .setRelativeWidth(25)
      .finish()
    .build();

  // Set a fallback component for cases when we cannot show a component
  workbench.fallback = FallbackComponent;

  // Wire the workbench to the store so the store is updated when
  // the workbench state changes
  workbench.on(
    'stateChanged',
    debounce(() => {
      store.dispatch(saveWorkbenchState(workbench));
    }, 1000)
  );

  return workbench;
}

const workbench = constructDefaultWorkbench(store);

/**
 * React context that exposes the workbench instance to components.
 */
export const Workbench = React.createContext(workbench);

export default workbench;

const addLayoutToPerspective = (perspectiveBuilder, layout) => {
  const typeMapping = {
    rows: 'makeRows',
    columns: 'makeColumns',
    stack: 'makeStack',
  };

  switch (layout.type) {
    case 'columns':
    case 'rows':
    case 'stack': {
      perspectiveBuilder[typeMapping[layout.type]]();
      for (const c of layout.contents) {
        addLayoutToPerspective(perspectiveBuilder, c);
      }
      perspectiveBuilder.finish();

      break;
    }

    case 'panel': {
      perspectiveBuilder
        .add(layout.component)
        .setTitle(componentRegistry[layout.component].label);
        // TODO Set ids of panels for the sidebar to work properly
        // .setId(layout.component);

      break;
    }

    default: {
      throw new Error(`Unknown layout type: ${layout.type}`);
    }
  }

  if (layout.width) {
    perspectiveBuilder.setRelativeWidth(layout.width);
  }
  if (layout.height) {
    perspectiveBuilder.setRelativeHeight(layout.height);
  }
};

const buildPerspective = ({ hasHeaders, isFixed, label, layout }) => {
  const perspectiveBuilder = new PerspectiveBuilder(workbench);

  addLayoutToPerspective(perspectiveBuilder, layout);

  return {
    label,
    isFixed,
    state: { content: perspectiveBuilder.build(), settings: { hasHeaders } },
  };
};

export const perspectives = PerspectiveStorage.fromArray(
  config.perspectives.map(buildPerspective)
);
