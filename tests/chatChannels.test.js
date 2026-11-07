import test from 'node:test';
import assert from 'node:assert/strict';
import { MAIN_CHAT_CHANNELS, NATIONAL_RAIL_CHANNELS, CHAT_CHANNELS, getChatChannel, searchChatChannels } from '../src/data/chatChannels.js';

test('London selector preserves the approved exact order', () => {
  assert.deepEqual(MAIN_CHAT_CHANNELS.map(c => c.displayName), [
    'Central Line', 'Jubilee Line',
    'Northern Line', 'Piccadilly Line', 'Victoria Line', 'District Line', 'Circle Line',
    'Hammersmith & City Line', 'Metropolitan Line', 'Bakerloo Line', 'Elizabeth Line', 'London Overground', 'DLR', 'London Trams',
  ]);
});

test('National Rail contains the approved 27 passenger channels alphabetically', () => {
  const names = NATIONAL_RAIL_CHANNELS.map(c => c.displayName);
  assert.equal(names.length, 27);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, 'en')));
  assert.equal(names.includes('London Overground'), false);
  assert.equal(names.includes('Elizabeth Line'), false);
  assert.equal(getChatChannel('national_rail_great_western_railway').displayName, 'Great Western Railway');
  assert.equal(getChatChannel('national_rail_south_western_railway').displayName, 'South Western Railway');
});

test('channels have unique storage keys and distinct Northern identities', () => {
  assert.equal(new Set(CHAT_CHANNELS.map(c => c.id)).size, CHAT_CHANNELS.length);
  assert.equal(getChatChannel('national_rail_northern').displayName, 'Northern');
  assert.equal(getChatChannel('underground_northern').displayName, 'Northern Line');
  assert.equal(getChatChannel('unknown').id, 'underground_central');
  const channel = getChatChannel('national_rail_great_western_railway');
  const id = channel.id;
  const name = channel.displayName;
  channel.displayName = 'GWR';
  assert.equal(channel.id, id);
  channel.displayName = name;
});


test('search finds operator aliases across all channels and normalizes input', () => {
  for (const [query, expected] of [
    [' GWr ', 'national_rail_great_western_railway'],
    ['s.w.r', 'national_rail_south_western_railway'],
    ['Thameslink', 'national_rail_thameslink'], ['DLR', 'dlr'], ['lner', 'national_rail_lner'],
  ]) assert.deepEqual(searchChatChannels(query).map(c => c.id), [expected]);
  const northern = searchChatChannels('Northern').map(c => c.id);
  assert.ok(northern.includes('underground_northern'));
  assert.ok(northern.includes('national_rail_northern'));
  for (const channel of NATIONAL_RAIL_CHANNELS) assert.ok(searchChatChannels(channel.displayName).includes(channel));
  assert.deepEqual(searchChatChannels('no such channel'), []);
  assert.deepEqual(searchChatChannels('   '), []);
});
