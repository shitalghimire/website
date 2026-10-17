/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Mock socket for single-player mode (no server needed)
const noop = () => {};
const mockSocket = {
  id: 'local-player',
  connected: false,
  on: noop,
  off: noop,
  emit: noop,
  connect: noop,
  disconnect: noop,
};

export const socket = mockSocket as any;
