import jQuery from 'jquery'
import ko from 'knockout'
let $ = jQuery;

const _ = {
    extend: $.extend,
    unwrap: ko.utils.unwrapObservable,
    //def ValueAccessors: double wraped values passed into a custom-binding.  see knockout custom bindings 
    unwrapValueAccessor: function (valueAccessor) { //todo: find places that should use this function 
        return _.unwrap(valueAccessor());
    },
    wrap: function (target) { //todo: find places that should use this function
        return function () { return target };
    },
    //given "listTarget[parameterTarget]"
    //return {listTarget: 'listTarget', parameterTarget:'parameterTarget'}
    parseListTokens: function (content) {
        //consider using regex
        var parts = content && content.split(']'); //"x[y]=1" => ['x[y', '=1']
        parts = parts.length && parts[0].split('['); // 'x[y' => ['x', 'y']
        if (parts.length === 2) {
            return {
                listTarget: parts[0], //x
                parameterTarget: parts[1] //y
            }
        }
        return {};
    },
    parseValue: function (str, vm) {
        var lastChar = str.slice(-1),
            result;
        if (lastChar === "'" || lastChar === '"') {
            return str.substr(1, str.length - 2);
        }
        result = parseInt(str, 10);

        if (_.isNaN(result)) {
            //return vm[str];
            return '&' + str;
        }
        return result;
    },
    addToSortOrder: function (list, value) {
        var result = [];
        var command = _.getCommand(value);
        var i = 0;
        var firstValue = _.getToggleResult(command, list[0]);
        var temp;

        result.push(firstValue);
        for (; list.length > i; i += 1) {
            temp = _.getCommand(list[i]);
            if (temp.key === command.key) {
                continue;
            }
            result.push(list[i]);
        }
        return result;
    },
    getToggleResult: function getToggleResult(newCommand, firstItem) {
        var firstCommand;
        if (newCommand.inverse) {
            return "-" + newCommand.key;
        }
        if (newCommand.plus) {
            return newCommand.key;
        }
        firstCommand = _.getCommand(firstItem);
        if (firstCommand.key === newCommand.key) {
            if (firstCommand.inverse) {
                newCommand.plus = true;
            } else {
                newCommand.inverse = true;
            }
            return _.getToggleResult(newCommand);
        }
        return newCommand.key;
    },
    getCommand: function (value) {
        var inverse = false;
        var plus = false;
        var key = value;
        if (value[0] === "-") {
            inverse = true;
            key = value.substring(1);
        }
        else if (value[0] === "+") {
            plus = true;
            key = value.substring(1);
        }
        return {
            inverse: inverse,
            plus: plus,
            key: key
        };
    },
    sort: function sort(keys) {
        return function compare(left, right, order) {
            var l, r, key, reverse = 1;
            order = order || keys.replace(/\s/, "").split(",");
            key = order[0];
            if (key[0] === "-") {
                key = key.substring(1);
                reverse = -1;
            }
            l = _.unwind(left, key);
            r = _.unwind(right, key);

            if (l === r) {
                order.shift();
                if (order.length) {
                    return compare(left, right, order);
                }
                return 0;
            }
            if (_.isUndefined(l)) return 1 * reverse;
            if (_.isUndefined(r)) return -1 * reverse;
            return ((l > r) ? 1 : -1) * reverse;
        };
    },
    isUndefined: function (val) {
        return (typeof val === 'undefined');
    },
    isNaN: function (val) {
        return (typeof val === 'number') && val != +val;
    },
    isIn: function (item, list) {
        if (!item || !item.toLowerCase || !list || !list.length) return false;
        return list.indexOf(item.toLowerCase()) !== -1;
    },
    empty: function () { },
    /// pass in an obj and string like "val1.val2.val3"
    /// will do a safe call like obj.val1().val2().val3 even val* is not an observalbe
    ///   if val* is undefined or returns undefined, return empty string;
    unwind: function (obj, str) {
        var ary = str && str.split(".");
        var o = ko.utils.peekObservable(obj);
        var first = ary && o[ary.shift()];
        if (!str) {
            return o;
        }
        if (_.isUndefined(first)) {
            return "";
        }
        return _.unwind(first, ary.join("."));
    },
    safeVmNode: function (vm, target, defaultValue) {
        var result = vm[target];
        if (!result) {
            vm[target] = ko.observable(defaultValue);
            result = vm[target];
        }
        return result;
    },
    //todo: document this helper
    getExtention: function (extend, name) {
        var result = extend[name];
        var child;
        if (result && result.extend) {
            child = _.getExtention(extend, result.extend);
            result = $.extend({}, child, result);
            if (!child.extend) {
                delete result.extend;
            };
        }
        return result;

    },
    addDataBind: function ($elm, bind, target) {
        var oldBind;
        if (!($elm && bind && target)) return;
        oldBind = $elm.attr("data-bind");
        oldBind = oldBind ? oldBind + "," : ""; //append a ; to the old bind (or use empty)
        $elm.attr("data-bind", oldBind + bind + ": " + target);
    },
    isObject: function (value) {
        var type = typeof value;
        return type == 'function' || (!!value && type == 'object');
    },
    //not used
    // this function will convert an object to array
    // prototypes and key's staring with _ are filtered to the array

    //todo: dry up.
    //called during binding
    objectToArray: function (targetObj) {
        var result = [],
            key, obj, unwrapped;
        for (key in targetObj) {
            if (!targetObj.hasOwnProperty(key) || key[0] === '_') {
                continue;
            }
            obj = targetObj[key];
            unwrapped = _.unwrap(obj);

            if (_.isObject(unwrapped)) {
                unwrapped._key = key;
                result.push(obj);
            } else {
                result.push({ _key: key, _value: obj });
            }
        }
        return result;
    },
    //works like Array.filter but over a ff dictionary 
    filterObject: function (targetObj, callback) {
        var result = {},
            key, obj, unwrapped;
        for (key in targetObj) {
            if (!targetObj.hasOwnProperty(key) || key[0] === '_') {
                continue;
            }
            obj = targetObj[key];
            unwrapped = _.unwrap(obj);
            if (callback(unwrapped)) {
                result[key] = targetObj[key];
            }
        }
        return result;
    },
    setupType: function ($elm, observable) {
        var type = $elm.attr("atr-type")
        if (type) {
            observable.extend({ type: type })
        }
    },
    //ff.extend helpers

};

export default _;