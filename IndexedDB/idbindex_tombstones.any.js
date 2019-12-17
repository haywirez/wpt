// META: title=Index Tombstones
// META: script=support-promises.js

async function iterateAndReturnAllCursorResult(testCase, cursor) {
  return new Promise((resolve, reject) => {
    let results = [];
    cursor.onsuccess = testCase.step_func(function(e) {
      let cursor = e.target.result;
      if (!cursor) {
        resolve(results);
        return;
      }
      results.push(cursor.value);
      cursor.continue();
    });
    cursor.onerror = reject;
  });
}

function createTombstones(db) {
  const txn1 = db.transaction(['objectStore'], 'readwrite');
  txn1.objectStore('objectStore').add({'key': 'firstItem', 'indexedOn': 1});
  txn1.objectStore('objectStore').add({'key': 'secondItem', 'indexedOn': 2});
  txn1.objectStore('objectStore').add({'key': 'thirdItem', 'indexedOn': 3});
  const txn2 = db.transaction(['objectStore'], 'readwrite');
  txn2.objectStore('objectStore').put({'key': 'firstItem', 'indexedOn': -10});
  txn2.objectStore('objectStore').put({'key': 'secondItem', 'indexedOn': 4});
  txn2.objectStore('objectStore').put({'key': 'thirdItem', 'indexedOn': 10});
}

async function run_test(testCase, txn_mode, direction) {
  const db = await createDatabase(testCase, db => {
    db.createObjectStore('objectStore', {keyPath: 'key'})
              .createIndex('index', 'indexedOn');
  });
  createTombstones(db);

  // Prev cursor
  const txn4 = db.transaction(['objectStore'], txn_mode);
  cursor = txn4.objectStore('objectStore').index('index').openCursor(IDBKeyRange.bound(-11, 11), direction);
  let results = await iterateAndReturnAllCursorResult(testCase, cursor);
  assert_equals(results.length, 3);
  db.close();
}

promise_test(async testCase => {
  await run_test(testCase, 'readonly', 'next');
}, 'Tombstones are ignored in readonly next cursors');

promise_test(async testCase => {
  await run_test(testCase, 'readonly', 'prev');
}, 'Tombstones are ignored in readonly prev cursors');

promise_test(async testCase => {
  await run_test(testCase, 'readwrite', 'next');
}, 'Tombstones are ignored in readwrite next cursors');

promise_test(async testCase => {
  await run_test(testCase, 'readwrite', 'prev');
}, 'Tombstones are ignored in readwrite prev cursors');
