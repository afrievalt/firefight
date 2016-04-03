var ff = ff || {};
ff.vm = ff.vm || {};
ff.nextId = 0;

//backlog
// 
// with=&_hash, I'm not sure this is a good idea, lets use filter & root instead,
// and multi root
//      forms are always set to the root, Should we put the form inside the current data context?
//          Yes: we have to do this so we can use & with
//          No: we are going to have to update the vm when & with changes
//      todo: consider passing in context when adding form so with:foo or forech:x will put from or input items inside foo.form
//          consider if with:&_hash, don't put in context
//      
//      //fix form.reset (doesn't work with <br/>? ; consider giving devs ability to run js after submit
//      //get paths of multiple depth w/ recursion
//      // _hash() shouldn't return #
//      // create default hash
// create ffEmpty attribute that will replace <div> element with <!-- ko: xxx
// create $data.smartPath("parent/child") that will un-wrap each leafe and if not found, search $parent then $root
// create set |= to toggle between two values.  
// add ffDefualtHash in ff-connect hash home will have _hash() return ffDefualtHash when there is no hash and clear the url hash when _hash(ffDefualtHash) is called

// todo: build new dom-emulator with type, security builder and tests

//ko extentions
ko.extenders.save = function (target, options) {
    target.subscribe(function (newVal) {
        var data;
        var update = {};
        var path = "";
        var child = ff.fb;
        if (target.type === 'array') {
            return;
        }
        //todo:
        //figure out why this is called twice when child value is updated
        if (target.path && target.path.length) {
            path = target.path.join("/");
            child = ff.fb.child(path);
        }
        data = ko.mapping.toJS(newVal);
        update[options] = data;
        child.update(update);
    });
    return target;
};

ko.extenders.path = function (target, options) {
    target.path = options;
    return target;
};

ko.extenders.type = function (target, options) {
    if (options === 'number') {
        //create a writable computed observable to intercept writes to our observable
        var precision = 0;
        var result = ko.pureComputed({
            read: target,  //always return the original observables value
            write: function (newValue) {
                var current = target(),
                    roundingMultiplier = Math.pow(10, precision),
                    newValueAsNum = isNaN(newValue) ? 0 : parseFloat(+newValue),
                    valueToWrite = Math.round(newValueAsNum * roundingMultiplier) / roundingMultiplier;

                //only write if it changed
                if (valueToWrite !== current) {
                    target(valueToWrite);
                } else {
                    //if the rounded value is the same, but a different value was written, force a notification for the current field
                    if (newValue !== current) {
                        target.notifySubscribers(valueToWrite);
                    }
                }
            }
        }).extend({ notify: 'always' });

        //initialize with current value to make sure it is rounded appropriately
        result(target());

        //return the new computed observable
        return result;
    }
    target.type = options;
    return target;
};

ko.bindingHandlers.ffEvent = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        if (valueAccessor && valueAccessor()) {
            $(element).on('click', valueAccessor().bind(element, valueAccessor, allBindings, viewModel, bindingContext));
        }
    }
};
ko.bindingHandlers.ffChangeEvent = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        if (valueAccessor && valueAccessor()) {
            $(element).on('change', valueAccessor().bind(element, valueAccessor, allBindings, viewModel, bindingContext));
        }
    }
};

ko.bindingHandlers.ffSubmit = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        ko.utils.registerEventHandler(element, "submit", function (event) {

            if (event.preventDefault)
                event.preventDefault();
            valueAccessor().call(element, valueAccessor, allBindings, viewModel, bindingContext);
        });
    }
};

ko.bindingHandlers.ffImg = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        if (value) {
            $(element).attr("src", value);
        }
    },
    update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        if (value) {
            $(element).attr("src", value);
        }
    },
};

ko.bindingHandlers.ffWith = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        function ffValueAccessorComputed() {
            var x = viewModel._hash().substr(1) || 'bar';
            return viewModel[x](); //unwrap
        }
        var ffValueAccessor = ko.computed(ffValueAccessorComputed);
        return ko.bindingHandlers.with.init(element, ffValueAccessor, allBindings, viewModel, bindingContext)
    }
};

ko.bindingHandlers.ffForEachObject = {
    makeTemplateValueAccessor: function (valueAccessor, element) {
        return function () {
            var modelValue = valueAccessor(),
                unwrappedValue = ko.utils.peekObservable(modelValue),    // Unwrap without setting a dependency here
                sortOrder = $(element).attr("atr-sortorder"),
                filter = $(element).attr("atr-filter"),
                rewrapped;

            unwrappedValue = ff._.objectToArray(unwrappedValue);
            filter && (unwrappedValue = unwrappedValue.filter(filterCallback)); //if filter
            sortOrder && (unwrappedValue = unwrappedValue.sort(ff._.sort(sortOrder)));
            function filterCallback(object) {
                var filterParts = filter.split('=');
                var key = filterParts[0];
                var unwrappedObject = ko.utils.peekObservable(object);
                var firstValue = unwrappedObject[key] && ko.utils.peekObservable(unwrappedObject[key])
                var secondValue = filterParts.length && filterParts[1];
                return firstValue === secondValue;
            }
            rewrapped = ko.observableArray(unwrappedValue);

            // If unwrappedValue is the array, pass in the wrapped value on its own
            // The value will be unwrapped and tracked within the template binding
            // (See https://github.com/SteveSanderson/knockout/issues/523)
            if ((!unwrappedValue) || typeof unwrappedValue.length == "number")
                return { 'foreach': rewrapped, 'templateEngine': ko.nativeTemplateEngine.instance };

            // If unwrappedValue.data is the array, preserve all relevant options and unwrap again value so we get updates
            ko.utils.unwrapObservable(rewrapped);
            return {
                'foreach': unwrappedValue['data'],
                'as': unwrappedValue['as'],
                'includeDestroyed': unwrappedValue['includeDestroyed'],
                'afterAdd': unwrappedValue['afterAdd'],
                'beforeRemove': unwrappedValue['beforeRemove'],
                'afterRender': unwrappedValue['afterRender'],
                'beforeMove': unwrappedValue['beforeMove'],
                'afterMove': unwrappedValue['afterMove'],
                'templateEngine': ko.nativeTemplateEngine.instance
            };
        };
    },
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        return ko.bindingHandlers['template']['init'](element, ko.bindingHandlers['ffForEachObject'].makeTemplateValueAccessor(valueAccessor, element));
    },
    update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        //Odd: if I don't use this next line, this function does not get called on update
        ko.utils.unwrapObservable(valueAccessor());
        return ko.bindingHandlers['template']['update'](element, ko.bindingHandlers['ffForEachObject'].makeTemplateValueAccessor(valueAccessor, element), allBindings, viewModel, bindingContext);
    },
};

//$ extentions
jQuery.fn.extend({
    reset: function () {
        var $form = this;
        var elm = $form[0];
        elm && elm.reset && elm.reset();
        //$form.find("input:checked").trigger('click'); 
        //$form.trigger("reset");
        //$form.find("input").trigger('change');
    },
    //this function will return an ordered array of attributes starting with ff-
    //if ff-target is in the list, it will be last.    
    ffAttrs: function () {
        var $this = this,
            attrs = $this[0] && $this[0].attributes,
            result = [];
        $(attrs).each(function (i, elm) {
            if (elm.name.substring(0, 3) === "ff-") {
                result.unshift(elm);
            }
        });
        return result;
    },
    ffInit: function () {
        var $this = this;
        var p = parse();
        var node = ff._.getExtention(p.name);
        if (!node) return;
        $this.data('_ffName', p.name);
        node.init($this, p.value);

        //parse returns an object with a name and optional value
        //if node contains an attribute string with ff- name = the string after ff-;  ff-set => name: 'set'
        //                                              & value = the value of attribute;  ff-set="foo=1" => value: 'foo=1'
        //else if tagName is <input> name = the type attribute surronded by []; <input type='number'/> => name: '[number]'
        //else name = tagName <>; <textarea/> => name: '<textarea>'        
        //
        //todo: document specificity ff-, over tag name
        function parse() {
            var attrs = $this[0] && $this[0].attributes,
                result, name,
                type = $this.attr("type"),
                tagName = $this[0] && $this[0].tagName.toLowerCase();
            $(attrs).each(function (i, elm) {
                if (elm.name.substring(0, 3) === "ff-") {
                    name = elm.name.substring(3);
                    result = { name: name, value: elm.value };
                    return;
                }
            });
            if (result) return result;
            if (tagName === 'input') {
                if (type) {
                    type = type.toLowerCase();
                }
                return { name: "[" + type + "]" };
            }
            return { name: "<" + tagName.toLowerCase() + ">" };
        }
    },

    ffVmSetup: function (vm) {
        var $this = $(this);
        var child = false;
        var name = $this.data('_ffName');
        var node = ff._.getExtention(name);
        var pContext = $this.parent().closest("[ffContext]").attr("ffContext"); //todo: keep looping
        if (pContext) {
            vm = vm[pContext]();
            child = true;
        }
        if (node) {
            node.vmSetup($this, vm, child);
        }
    },
    ffAddDataBind: function () {
        var $this = $(this);
        var name = $this.data("_ffName");
        var ext = ff._.getExtention(name);
        if (ext) {
            ext.addDataBind($this);
        }
    },

});

//ff helpers 
ff._ = {
    parseValue: function (str, vm) {
        var lastChar = str.slice(-1),
            result;
        if (lastChar === "'" || lastChar === '"') {
            return str.substr(1, str.length - 2);
        }
        result = parseInt(str, 10);

        if (ff._.isNaN(result)) {
            //return vm[str];
            return '&' + str;
        }
        return result;
    },
    addToSortOrder: function (list, value) {
        var result = [];
        var command = ff._.getCommand(value);
        var i = 0;
        var firstValue = ff._.getToggleResult(command, list[0]);
        var temp;

        result.push(firstValue);
        for (; list.length > i ; i += 1) {
            temp = ff._.getCommand(list[i]);
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
        firstCommand = ff._.getCommand(firstItem);
        if (firstCommand.key === newCommand.key) {
            if (firstCommand.inverse) {
                newCommand.plus = true;
            } else {
                newCommand.inverse = true;
            }
            return ff._.getToggleResult(newCommand);
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
            l = ff._.unwind(left, key);
            r = ff._.unwind(right, key);

            if (l === r) {
                order.shift();
                if (order.length) {
                    return compare(left, right, order);
                }
                return 0;
            }
            if (ff._.isUndefined(l)) return 1 * reverse;
            if (ff._.isUndefined(r)) return -1 * reverse;
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
        if (ff._.isUndefined(first)) {
            return "";
        }
        return ff._.unwind(first, ary.join("."));
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
    getExtention: function (name) {
        var result = ff.extend[name];
        var child;
        if (result.extend) {
            child = ff._.getExtention(result.extend);
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
    //todo: remove
    asArrayComputed: function (target) {
        var result = function () {
            var obj, arr = [];
            if (ff.vm && ff.vm[target]) { //todo: this will not work with nested data
                obj = ff.vm[target]();
                arr = Object.keys(obj).map(function (key) {
                    var r = obj[key];
                    r._key = key;
                    return r;
                });
            }
            return arr;
        };
        return result;
    },
    // this function will convert an object to array
    // prototypes and key's staring with _ are filtered to the array
    objectToArray: function (targetObj) {
        var result = [],
            key, obj;
        for (key in targetObj) {
            if (!targetObj.hasOwnProperty(key) || key[0] === '_') {
                continue;
            }
            obj = targetObj[key];
            if (ff._.isObject(obj())) {
                obj()._key = key;
                result.push(obj);
            } else {
                result.push({ _key: key, _value: obj });
            }
        }
        return result;
    },
    setupType: function ($elm, observable) {
        var type = $elm.attr("atr-type")
        if (type) {
            observable.extend({ type: type })
        }
    }
};
//ff extensions 
ff.extend = {
    '[number]': {
        extend: '_default',
        type: 'Number'
    },
    '[undefined]': { extend: '_default' },
    '[text]': {
        binding: 'textInput',
        extend: '_default'
    },
    '[hidden]': {
        vmSetup: function ($elm, vm, child) {
            var id = $elm.data('_ffBindTarget');
            var userAttr = $elm.attr("atr-user");
            if (!id) { return; }
            if (userAttr) {
                if (!ff.vm._user) {
                    console.log("Warring: atr-user can not be used without login")
                    return;
                }
                if (!ff.vm._user()[userAttr]) {
                    console.log("Warring: unknown atr-user value: " + userAttr)
                    return;
                }
                if (ff.vm._user()[userAttr]) {
                    vm[id] = ff.vm._user()[userAttr];
                }
                if (!child) {
                    vm[id].extend({ save: id, type: 'number' });
                }
            } else {
                ff.extend._default.vmSetup($elm, vm, child);
            }

        },
        binding: 'value',
        extend: '[text]'
    },
    '[checkbox]': {
        binding: 'checked',
        defaultValue: false,
        extend: '_default'
    },
    '<textarea>': {
        binding: 'textInput',
        extend: '_default'
    },
    '<select>': {
        extend: '_default'
    },
    'value': {
        binding: 'value',
        extend: '_default',
        vmSetup: ff._.empty,
    },
    'visible': {
        binding: 'visible',
        extend: '_defaultFf',
        vmSetup: ff._.empty,
    },
    'with': {
        init: function (elm, content) {
            var $elm = $(elm);
            $elm.data('_ffBindTarget', content);
            $elm.attr('_ffContext', content);
        },
        binding: 'ffWith',
        extend: '_defaultFf',
    },
    'src': {
        binding: 'ffImg',
        extend: '_defaultFf',
        vmSetup: ff._.empty,
    },
    'if': {
        binding: 'if',
        vmSetup: ff._.empty,
        extend: '_default',
    },
    'ifnot': {
        binding: 'ifnot',
        vmSetup: ff._.empty,
        extend: '_default'
    },
    'foreach': {
        init: function (elm, content) {
            var $elm = $(elm);
            $elm.data('_ffBindTarget', content);
        },
        vmSetup: function ($elm, vm, child) {
            //consider calling base function
            var id = $elm.data('_ffBindTarget');
            var self = this;
            var value;
            if (!id) return;
            if (!vm[id]) {
                value = $elm.attr("value") || self.defaultValue;
                vm[id] = ko.observable(value);
            }
            //if (!child) {
            //    vm[id].extend({ save: id });
            //}
            //vm[id].extend({ type: 'array' });
            $elm.data("_observable", vm[id]);
        },
        extend: '_default',
        binding: 'ffForEachObject',
    },
    'filter': {
        init: function ($elm, content) {
            var parts = content.split(":");
            if (parts.length !== 2) {
                console.log("invalid ff-filter:  '" + content + "' does not contain :")
                return;
            }
            $elm.data('_ffBindTarget', "_filterChange" + parts[0]);
            $elm.data('_ffFilterTarget', parts[0]);
            $elm.data('_ffFilterCommand', parts[1]);
        },
        vmSetup: function ($elm, vm) {
            var targetBind = $elm.data("_ffBindTarget");
            vm[targetBind] = ff.extend.filter.change;
        },
        extend: '_default',
        binding: 'ffChangeEvent',
        change: function () {
            var $elm = $(this);
            var $filterTarget = $("#" + $elm.data("_ffFilterTarget"));
            var command = $elm.data("_ffFilterCommand");
            var value = $elm.val();
            if (value === "*") {
                $filterTarget.removeAttr("atr-filter");
            } else {
                $filterTarget.attr("atr-filter", command + "=" + value);
            }
            $filterTarget.data("_observable").valueHasMutated();
        }
    },
    'sort': { //todo: move to _event
        init: function ($elm, content) {
            var parts = content.split(":");
            if (parts.length !== 2) {
                console.log("invalid ff-sort:  '" + content + "' does not contain :")
                return;
            }
            $elm.data('_ffBindTarget', "_sortClick" + parts[0]);
            $elm.data('_ffSortTarget', parts[0]);
            $elm.data('_ffSortCommand', parts[1]);
        },
        vmSetup: function ($elm, vm) {
            var targetBind = $elm.data("_ffBindTarget");
            vm[targetBind] = ff.extend.sort.click;
        },
        extend: '_default',
        binding: 'ffEvent',
        click: function (valueAccessor, allBindings, viewModel, bindingContext) {
            var $elm = $(this);
            var $sortTarget = $("#" + $elm.data("_ffSortTarget"));
            var observableTarget = $sortTarget.data("_observable");
            var command = $elm.attr("_ffSortCommand");
            var sortOrder, sortParts;
            if ($sortTarget.length !== 1) {
                console.log("Problem in sort click: could not find one and only one instance of #" + $elm.data("_ffSortTarget"));
            }
            sortOrder = $sortTarget.attr("atr-sortorder") || "";
            sortParts = sortOrder.replace(/\s/, "").split(",");
            sortParts = ff._.addToSortOrder(sortParts, $elm.data("_ffSortCommand"));
            $sortTarget.attr("atr-sortorder", sortParts.join());
            observableTarget.extend({ 'type': 'array' });
            $sortTarget.data("_observable").valueHasMutated()
        }
    },
    'set': {
        init: function (elm, content) {
            var $elm = $(elm);
            var operatorMap = {
                '=': function (p1, p2) {
                    return p2;
                },
                '+': function (p1, p2) {
                    return p1 + p2;
                },
                '-': function (p1, p2) {
                    return p1 - p2;
                },
                '*': function (p1, p2) {
                    return p1 * p2;
                },
                '/': function (p1, p2) {
                    return p1 / p2;
                },
                '{{': function (p1, p2, key) {
                    var obj = p1 || {};
                    obj[key] = p2();
                    return obj;
                }
            };
            var array = content.split('=', 2);
            var operator = '=';
            var target, lastChar, targetParts, str;
            if (array.length !== 2) {
                console.error('ff-set syntax error, missing equal sign, expect ff-set="somevalue=0" or += -= /= *=');
                return;
            }
            targetParts = array[0].split("{{");

            target = targetParts[0];
            lastChar = target.slice(-1);
            if (ff._.isIn(lastChar, ['+', '-', '*', '/'])) {
                target = target.substring(0, target.length - 1);
                operator = lastChar;
            }
            if (targetParts.length == 2) {
                str = targetParts[1];
                operator = "{{";
                $elm.data('_ffDynamic', str.substring(0, str.length - 2));
            }
            $elm.data('_ffOperatorFunc', operatorMap[operator]);
            $elm.data('_ffTarget', target);
            $elm.data('_ffValue', ff._.parseValue(array[1]));
            ff.nextId += 1;//make  _setClick unique so it doesn't get overridden if more then on set function            
            $elm.data('_ffBindTarget', "_setClick" + ff.nextId);
        },
        extend: '_default',
        binding: 'ffEvent',
        vmSetup: function ($elm, vm) {
            var target = $elm.data("_ffTarget"),
                targetBind = $elm.data("_ffBindTarget");
            if (!target) return;
            console.log('in extend.set.vmSetup');
            vm[targetBind] = ff.extend.set.click;
            if (ff.vm[target]) { //if observable exists, extend so value is saved on changed, this may result in duplicate extend functions and don't know if this is a problem
                ff.vm[target].extend({ save: target });
            } else { //else create observable and extend
                ff.vm[target] = ko.observable().extend({ save: target }); //todo: if a later input elm has a default value, consider setting that value in a similar if clause for that input value
            }
        },
        // ReSharper disable once UnusedParameter
        click: function (valueAccessor, allBindings, viewModel, bindingContext) {
            var self = this;
            var $this = $(self);
            var bc = bindingContext.$data;
            var target = $this.data("_ffTarget");
            var func, result, value, observable;
            //if there is no target, we are in a loop and need to call init.
            if (!target) {
                ff.extend.set.init(self, $this.attr("ff-set"));
                target = $this.data("_ffTarget");
            }
            value = $this.data("_ffValue");
            //value = function () { return $this.data("_ffValue"); };
            //value = observable();
            if (value[0] === '&') {
                value = bc[value.substr(1)](); //todo: make safer?
            }
            func = $this.data("_ffOperatorFunc");
            //problem: bc[target] may not be an observable
            result = func(bc[target](), value, $this.attr("_ffKey"));
            bc[target].extend({ save: target });
            bc[target](result);
        },
        addDataBind: function ($elm) {
            var result = $elm.data("_ffDynamic");

            if (result) {
                if (result[0] === "_") {
                    result = "$root." + result;
                }
                ff._.addDataBind($elm, "attr", "{'_ffkey':" + result + "}");
            }
            ff._.addDataBind($elm, this.binding, "$root." + $elm.data('_ffBindTarget'));
        },
        id: function ($elm) {
            return $elm.data("_ffBindTarget");
        }
    },
    'count': {
        init: function (elm, content) {
            var $elm = $(elm);
            var $totals = $elm.parent().closest("[ff-totals]");
            if (!$totals.length) return;
            ff.nextId += 1; //todo: remove
            $elm.data("_ffBindTarget", "count_" + content + ff.nextId);
            $elm.data("_ffListTarget", $totals.attr("ff-totals"));
            $elm.data("_ffCondition", content);
        },
        extend: '_default',
        binding: 'text',
        vmSetup: function ($elm, vm) {
            var tb = $elm.data("_ffBindTarget");
            var listName = $elm.data("_ffListTarget");
            var condition = $elm.data("_ffCondition");
            if (!tb) return;
            vm[tb] = ko.computed(function () {
                var unwrappedValue = ko.utils.unwrapObservable(vm[listName]);
                unwrappedValue = ff._.objectToArray(unwrappedValue);
                if (unwrappedValue && unwrappedValue.length) {
                    return unwrappedValue.reduce(function (total, obj) {
                        return total + (condition === obj._value);
                    }, 0);
                }
                return 0;
            });
        }
    },

    'login': {
        init: function (elm, content) {
            var $elm = $(elm);
            var loginMap = {
                'facebook': function () {
                    ff.fb.authWithOAuthPopup("facebook", function (error, authData) {
                        if (error) {
                            console.log("Login Failed!", error);
                        } else {
                            console.log("Authenticated successfully with payload:", authData);
                        }
                    });
                }
            };
            if (!ff._.isIn(content, ['facebook'])) {
                return;
            }
            $elm.data('_ffLoginFunc', loginMap[content]);

            ff.nextId += 1;//make  _setClick unique so it doesn't get overridden if more then on set function
            $elm.data('_ffBindTarget', "_loginClick" + ff.nextId);
        },
        extend: '_default',
        binding: 'ffEvent',
        vmSetup: function ($elm, vm) {
            var targetBind = $elm.data('_ffBindTarget');
            vm._user = ko.observable({
                firstName: ko.observable(""),
                lastName: ko.observable(""),
                name: ko.observable(""),
                imgUrl: ko.observable(""),
                timezone: ko.observable(""),
                ageMin: ko.observable(""),
                gender: ko.observable(""),
                id: ko.observable(""),
                link: ko.observable(""),
                locale: ko.observable(""),
                isImgSilhouette: ko.observable(false),

            });
            vm[targetBind] = ff.extend.login.click;
        },
        click: function (valueAccessor, allBindings, viewModel, bindingContext) {
            ff.fb.authWithOAuthPopup("facebook", function (error, authData) {
                if (error) {
                    console.log("Login Failed!", error);
                } else {
                    ff.vm._user().firstName(ff._.unwind(authData, "facebook.cachedUserProfile.first_name"));
                    ff.vm._user().lastName(ff._.unwind(authData, "facebook.cachedUserProfile.last_name"));
                    ff.vm._user().name(ff._.unwind(authData, "facebook.cachedUserProfile.name"));
                    ff.vm._user().imgUrl(ff._.unwind(authData, "facebook.cachedUserProfile.picture.data.url"));
                    ff.vm._user().isImgSilhouette(ff._.unwind(authData, "facebook.cachedUserProfile.picture.data.is_silhouette"));
                    ff.vm._user().timezone(ff._.unwind(authData, "facebook.cachedUserProfile.timezone"));
                    ff.vm._user().ageMin(ff._.unwind(authData, "facebook.cachedUserProfile.age_range.min"));
                    ff.vm._user().gender(ff._.unwind(authData, "facebook.cachedUserProfile.gender"));
                    ff.vm._user().id(ff._.unwind(authData, "facebook.cachedUserProfile.id"));
                    ff.vm._user().link(ff._.unwind(authData, "facebook.cachedUserProfile.link"));
                    ff.vm._user().locale(ff._.unwind(authData, "facebook.cachedUserProfile.locale"));
                }
            });
        },
        id: function () {
            return undefined;
        }
    },
    'push': {
        init: function (elm, content) {
            var $elm = $(elm),
                array = content.split('<', 2),
                target;
            if (array.length !== 2) {
                console.log('ff-push syntax error, missing < sign, expect ff-push="myArray<"someval"');
                return;
            }
            target = array[0];
            $elm.data('_ffValue', ff._.parseValue(array[1], ff.vm)); //todo: don't pass in vm, this will not work for nested properties
            $elm.data('_ffTarget', target);
            ff.nextId += 1;//make  _pushClick unique so it doesn't get overridden if more then on set function
            $elm.data('_ffBindTarget', "_pushClick" + ff.nextId);
        },
        extend: '_default',
        binding: 'ffEvent',
        vmSetup: function ($elm, vm) { //todo: dry up
            var target = $elm.data("_ffTarget"),
                targetBind = $elm.data("_ffBindTarget");
            if (!target) return;
            console.log("in ff-push.vmSetup");
            vm[targetBind] = ff.extend.push.click;
            if (ff.vm[target]) { //if observable exists, extend so value is saved on changed, this may result in duplicate extend functions and don't know if this is a problem
                ff.vm[target].extend({ save: target });
            } else { //else create observable and extend
                ff.vm[target] = ko.observableArray().extend({ save: target }); //todo: if a later input elm has a default value, consider setting that value in a similar if clause for that input value
            }
        },
        id: function ($elm) {
            return $elm.data("_ffBindTarget");
        },
        click: function (valueAccessor, allBindings, viewModel, bindingContext) {
            var $this = $(this);
            var bc = bindingContext.$data;
            var value = $this.data("_ffValue");
            var target = $this.data("_ffTarget");
            var fbTarget = ff.fb.child(target);
            var child = fbTarget.push();
            if (value[0] === '&') {
                value = bc[value.substr(1)](); //todo: make safer? //DRY
                // check $data, then $parent, then $root
            }
            child.set(ko.unwrap(value));
        },
    },
    'delete': { //Bug: removing last element doens't update vm.  
        init: function (elm, content) {
        },
        extend: '_default',
        binding: 'ffEvent',
        vmSetup: function ($elm, vm) { //todo: dry up
            if (!vm["deleteFromList"]) {
                vm["deleteFromList"] = ff.extend.delete.click;
            }

        },
        click: function (valueAccessor, allBindings, viewModel, bindingContext) {
            var $this = $(this);
            var list = $this.parent().closest("[ff-foreach]").attr("ff-foreach");
            var idToDelete = $this.data("keytoremove");
            //if there is only one item in the list, we must clear the vm's list because the vm will not get updated when data is null.
            //this may be fixed if we create a _meta tag in the db
            var listVm = bindingContext.$parent && bindingContext.$parent[list];

            if (ff._.objectToArray(listVm()).length === 1) {
                listVm({});
            }
            ff.fb.child(list).child(idToDelete).remove();
        },
        addDataBind: function ($elm) {
            ff._.addDataBind($elm, this.binding, "$parent.deleteFromList");
            ff._.addDataBind($elm, "attr", "{'data-keytoremove': _key}");
        },
    },
    'populate': {
        init: function (elm, content) {
        },
        extend: '_default',
        binding: 'ffEvent',
        vmSetup: function ($elm, vm) { //todo: dry up
            if (!vm["populateForm"]) {
                vm["populateForm"] = ff.extend["populate"].click;
            }

        },
        click: function (valueAccessor, allBindings, viewModel, bindingContext) {
            var $this = $(this);
            var formId = $this.attr("ff-populate");
            var $submit;
            var updateText;
            bindingContext.$parent[formId](bindingContext.$data);

            var $submit = $("#" + formId).find(":submit");
            if (!$submit.attr("atr-add-text")) {
                $submit.attr("atr-add-text", $submit.text());
            }

            var updateText = $submit.attr("atr-update-text");
            if (updateText) {
                $submit.text(updateText);
            }
        },
        addDataBind: function ($elm) {
            ff._.addDataBind($elm, this.binding, "$parent.populateForm");
        },
    },

    'submit': {//consider renaming submit to form or target or formTarget
        init: function (elm, content) {
            var $elm = $(elm);
            var id = $elm.attr("id");
            $elm.data('_ffSubmitTarget', content);
            ff.nextId += 1;//make  _pushClick unique so it doesn't get overridden if more then on set function
            //todo: get id

            $elm.data('_ffBindTarget', "_submit" + ff.nextId);
            $elm.data('_ffFormContent', id || "_formContent" + ff.nextId);
            $elm.attr("ffContext", id || "_formContent" + ff.nextId);
        },
        extend: '_default',
        binding: 'ffSubmit',
        vmSetup: function ($elm, vm) { //todo: dry up
            var bindTarget = $elm.data("_ffBindTarget");
            var formContent = $elm.data("_ffFormContent");
            var submitTarget = $elm.data("_ffSubmitTarget");
            console.log("in ff-submit.vmSetup");
            vm[bindTarget] = ff.extend.submit.click;
            vm[formContent] = ko.observable({});
            //todo: dry
            //todo: get path???
            if (ff.vm[submitTarget]) { //if observable exists, extend so value is saved on changed, this may result in duplicate extend functions and don't know if this is a problem
                ff.vm[submitTarget].extend({ save: submitTarget });
            } else { //else create observable and extend
                //ff.vm[submitTarget] = ko.observableArray([{ hi: 'hi' }]).extend({ save: submitTarget }); //todo: if a later input elm has a default value, consider setting that value in a similar if clause for that input value
                ff.vm[submitTarget] = ko.observable().extend({ save: submitTarget }); //todo: if a later input elm has a default value, consider setting that value in a similar if clause for that input value
            }
            ff.vm[submitTarget].extend({ type: 'array' });
        },
        id: function ($elm) {
            return $elm.data("_ffBindTarget");
        },
        click: function (valueAccessor, allBindings, viewModel, bindingContext) {
            var $elm = $(this); // if this is the clicked button, we will have to go up the dom and grab the form            
            // when a dom element is removed and reloaded, data values are lost
            // when data is empty, re-init and get the data again
            // problem: _ffBindTarget is an incremented value so we have to call ffVmSetup too and now we have an orphaned vm value
            // problem: ouch form is not populated
            // todo: find a better way.  Consider setting a firefight id attribute.  
            var formContent = $elm.data("_ffFormContent") || $elm.ffInit() || $elm.ffVmSetup(ff.vm) || $elm.data("_ffFormContent")
            var submitTarget = $elm.data("_ffSubmitTarget");
            var child = getFirebaseChild();
            function getFirebaseChild() {
                var fbTarget, fullPath;
                var target = viewModel[submitTarget];
                var pathArray = target && target.path // if no path (new data in fb) get path from DOM
                    || getPathFromDomContext($elm);
                function getPathFromDomContext($element) {
                    var result = [];
                    var $outerElm = $element.closest('[_ffContext]');
                    var path = $outerElm.attr("_ffContext");
                    if (path) {
                        //climb up the dom tree recursively  
                        result = getPathFromDomContext($outerElm.parent())
                        result.push(path);
                    }
                    return result;
                }
                var fullPathArray = pathArray.slice(); //copy ???needed?
                fullPathArray.push(submitTarget)
                fullPath = fullPathArray.join("/");
                fbTarget = ff.fb.child(fullPath);
                return fbTarget.push()
            }

            var fbTarget = ff.fb.child(submitTarget);
            console.log("in ff-submit.click");
            //var data = ko.mapping.toJS(viewModel[formContent]);
            var data = ko.mapping.toJS(bindingContext.$root[formContent]);
            //var child = fbTarget.push();
            var id = data._key;
            if (id) {
                delete data._key;
                viewModel[formContent](data);
                fbTarget.child(id).update(data);
            } else {
                child.set(data);//may need to use bind donctext, and ko.util.toJson            
            }
            $elm.reset();
            //$elm.add($elm.closest("form")).reset(); 

            var $submit = $elm.find(":submit");
            var addText = $submit.attr("atr-add-text");
            if ($submit.attr("atr-add-text")) {
                $submit.text(addText);
            }
        },
        addDataBind: function ($elm) {
            ff._.addDataBind($elm, this.binding, "$root." + $elm.data('_ffBindTarget'));
            ff._.addDataBind($elm, "with", "$root." + $elm.data('_ffFormContent'));
        },

    },
    '_defaultFf': {
        init: function (elm, content) {
            var $elm = $(elm);
            content = content.replace(/\./g, "().")
            $elm.data('_ffBindTarget', content);
        },
        extend: '_default',
    },
    '_default': {
        init: function (elm) {
            var $elm = $(elm);
            $elm.data('_ffBindTarget', $elm.attr('atr-id') || $elm.attr('id'));
        },
        defaultValue: "",
        vmSetup: function ($elm, vm, child) {
            var id = $elm.data('_ffBindTarget');
            var self = this;
            var value;
            if (!id) return;
            if (!vm[id]) {
                value = $elm.attr("value") || self.defaultValue;
                vm[id] = ko.observable(value)
            }
            if (!child) {
                //vm[id].extend({ save: id });

                vm[id].extend({ save: id });
            }
            console.log("id: ", id);
            ff._.setupType($elm, vm[id]);
        },
        id: ff._.empty,
        binding: 'value',
        addDataBind: function ($elm) {
            ff._.addDataBind($elm, this.binding, $elm.data('_ffBindTarget'));
        },
    }
};



(function () {

    if (!setRoot() && ko.punches) return;
    ko.punches.interpolationMarkup.enable();

    ff.fb.on('value', function (data) {
        var property;
        var val = data.val() || {};
        setOrUpdateViewModel(ff.vm, val);
        //for (property in val) {
        //    if (val.hasOwnProperty(property)) {
        //        if (ff.vm.hasOwnProperty(property)) {
        //            ff.vm[property](val[property]);
        //        } else {
        //            ff.vm[property] = ko.observable(val[property]);
        //        }
        //    }
        //}

        applyBindingsOnce();
    });

    function setOrUpdateViewModel(vm, json, path) {
        path = path || [];
        var property;
        for (property in json) {
            if (json.hasOwnProperty(property)) {
                if (vm.hasOwnProperty(property)) {
                    vm[property](getValue());
                } else {
                    vm[property] = ko.observable(getValue()).extend({ path: path });
                }
            }
        }
        return vm;
        function getValue() {
            var value = json[property];
            var newPath;
            if (typeof value !== "object") {
                return value;
            }
            newPath = path.slice();
            newPath.push(property);
            return setOrUpdateViewModel({}, value, newPath);
        }
    }

    function setRoot() {
        var fbName;
        var type;
        var rootAtr;
        ff.$root = $('[ff-root],[ff-connect]');
        if (ff.$root.length !== 1) return false;
        fbName = ff.$root.attr('ff-connect') || ff.$root.attr('ff-root');
        ff.options = {
            connectionType: ff.$root.attr('atr-type')
        };
        ff.fb = new window.Firebase("https://" + fbName + ".firebaseio.com");
        rootAtr = ff.$root.attr('atr-root');
        if (rootAtr) {
            ff.fb = ff.fb.child(rootAtr);
        }
        return true;
    }

    function applyBindingsOnce() {
        setupHash();
        extendVmFromFields();
        proccessComputedObservables();
        ko.applyBindings(ff.vm);
        if (ff.options.connectionType === 'offline') {
            Firebase.goOffline();
        }
        ff.$root
            .removeClass("loading")
            .addClass("ready")
            .find("div.loading").remove();
        applyBindingsOnce = function () { };
    }

    function setupHash() {
        ff.vm._hash = ko.observable(location.hash);
        ff.vm._hash.subscribe(hashChanged);
        function hashChanged(newHash) {
            if (newHash !== location.hash) {
                location.hash = newHash;
            }
        }
        window.onhashchange = locationHashChanged;
        function locationHashChanged() {
            ff.vm._hash(location.hash);
        }


        window.onhashchange = locationHashChanged;
    }

    function proccessComputedObservables() {
        var list = ff.computedObservables;
        var key;
        for (key in list) {
            if (list.hasOwnProperty(key)) {
                ff.vm["$" + key + "$"] = ko.computed(list[key], ff.vm);
            }
        }
    }

    function extendVmFromFields() {
        //use textInput, check         
        ff.$root.find("input,select,textarea,[ff-set],[ff-count],[ff-push],[ff-foreach],[ff-visible],[ff-submit],[ff-login],[ff-with],[ff-hide],[ff-delete],[ff-populate],[ff-src],[ff-sort]").each(function (i, elm) {
            var $elm = $(elm);
            $elm.ffInit();
            $elm.ffVmSetup(ff.vm); //todo: pass in vm context
            $elm.ffAddDataBind();
        });
    }
})();
