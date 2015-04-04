/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const dispatcher = require('./dispatcherInstance.es6');
const invariant = require('invariant');
const debug = require('./debug.es6');
const renderedComponentSet = new WeakSet();

const IN_PRODUCTION = process.env.NODE_ENV === 'production';

const StoreDisplayNames = new Set();

export default class Store {
	constructor (options) {
		const store = this;
		const ViewDisplayNames = new Set();

		invariant(
			options,
			'Cannot create FluxThis Stores without arguments'
		);

		invariant(
			options.init,
			'FluxThis Stores requires an `init` function'
		);

		invariant(
			options.displayName,
			'FluxThis Stores requires a `displayName` to assist you with debugging'
		);

		invariant(
			options.public,
			'ObjectOrientedStore requires `public` functions'
		);

		this.displayName = options.displayName;


		// Ensure we have unique display names to assist with debugging.
		if (!IN_PRODUCTION) {
			invariant(
				!StoreDisplayNames.has(this.displayName),
				`Store: Your displayName of ${this.displayName} is` +
					'not unique.'
			);
			StoreDisplayNames.add(this.displayName);
		}

		// Expose the mixin for the Store.
		this.mixin = {
			/**
			 * Automatically add the change listener for the given
			 * store when the component is going did mount.
			 */
			componentDidMount () {
				var displayName = this.constructor.displayName;
				invariant(
					displayName,
					'Could not successfully add the mixin to your ' +
					'new controller view because it\'s missing ' +
					'a displayName, which is used for debugging ' +
					'purposes.'
				);

				invariant(
					!ViewDisplayNames.has(displayName),
					`Error: ${store.toString()} already has a ` +
					'controller view registered with the display name ' +
					`of ${displayName}. Please make sure ` +
					'display names are unique.'
				);

				ViewDisplayNames.add(displayName);

				invariant(
					this.getStateFromStores instanceof Function,
					'`%s` must define `getStateFromStores` in order to use ' +
					'the FluxThis mixin.',
					this.displayName
				);

				debug.logView(this);

				if (!this.__fluxChangeListener) {
					this.__fluxChangeListener = () => {
						this.setState(this.getStateFromStores());
					};
				}

				store.__addChangeListener(this.__fluxChangeListener);
			},

			/**
			 * Automatically remove the change listener for the given
			 * store when the component is going to unmount.
			 */
			componentWillUnmount () {
				renderedComponentSet.remove(this);
				ViewDisplayNames.remove(this.displayName);
				store.__removeChangeListener(this.__fluxChangeListener);
			},

			getInitialState () {
				// This check ensures that we do not use the mixins
				// get initial state twice on the same method.
				// This is the case when a view uses more than 1 FluxThis store.
				if (!this.state && !renderedComponentSet.has(this)) {
					renderedComponentSet.add(this);

					// the initialState props is used to create state
					// from props in certain cases like tests.
					if (this.props.initialState) {
						return this.props.initialState;
					}

					return this.getStateFromStores();
				}
			},

			componentWillUpdate (nextProps, nextState) {
				debug.logView(this, nextProps, nextState);
			}
		};
	}

	waitFor (...tokens) {
		return dispatcher.waitFor(tokens);
	}

	toString () {
		return `[Store ${this.displayName}]`;
	}
}