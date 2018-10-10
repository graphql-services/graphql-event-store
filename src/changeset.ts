// please check if this is already accepted: https://github.com/eugeneware/changeset/pull/7
import * as _ from 'underscore';

export function diff(old, new_) {
  let changes = [];

  changes = changes.concat(compare([], old, new_));

  comparing = [];
  return changes;
}

function delCheck(op) {
  if (op.type === 'put' && op.value === undefined) {
    op.type = 'del';
    delete op.value;
  }
  return op;
}

let comparing = [];
function compare(path, old, new_) {
  let changes = [];
  if (
    old !== null &&
    new_ !== null &&
    typeof old === 'object' &&
    !_.contains(comparing, old)
  ) {
    comparing.push(old);
    const oldKeys = Object.keys(old);
    const newKeys = Object.keys(new_);

    const sameKeys = _.intersection(oldKeys, newKeys);
    sameKeys.forEach(k => {
      const childChanges = compare(path.concat(k), old[k], new_[k]);
      changes = changes.concat(childChanges);
    });

    const delKeys = _.difference(oldKeys, newKeys);
    delKeys.forEach(k => {
      changes.push({ type: 'del', key: path.concat(k) });
    });

    const newKeys_ = _.difference(newKeys, oldKeys);
    newKeys_.forEach(k => {
      changes.push(
        delCheck({ type: 'put', key: path.concat(k), value: new_[k] }),
      );
    });
  } else if (old !== new_) {
    changes.push(delCheck({ type: 'put', key: path, value: new_ }));
  }

  return changes;
}

export function apply(changes, target, modify = false) {
  let obj, clone;
  if (modify) {
    obj = target;
  } else {
    clone = require('udc');
    obj = clone(target);
  }
  changes.forEach(ch => {
    let ptr, keys, len;
    switch (ch.type) {
      case 'put':
        ptr = obj;
        keys = ch.key;
        len = keys.length;
        if (len) {
          keys.forEach((prop, i) => {
            if (!(prop in ptr)) {
              ptr[prop] = {};
            }

            if (i < len - 1) {
              ptr = ptr[prop];
            } else {
              ptr[prop] = ch.value;
            }
          });
        } else {
          obj = ch.value;
        }
        break;

      case 'del':
        ptr = obj;
        keys = ch.key;
        len = keys.length;
        if (len) {
          keys.forEach((prop, i) => {
            if (!(prop in ptr)) {
              ptr[prop] = {};
            }

            if (i < len - 1) {
              ptr = ptr[prop];
            } else {
              if (Array.isArray(ptr)) {
                ptr.splice(parseInt(prop, 10), 1);
              } else {
                delete ptr[prop];
              }
            }
          });
        } else {
          obj = null;
        }
        break;
    }
  });
  return obj;
}
