import ko from 'knockout'
import mapping from 'knockout-mapping'
import jQuery from 'jquery'
import _ from './utility.js'
let $ = jQuery;

export default function getExtentions(ff) {
    let extentions = {
        '[number]': {
            extend: '_default',
            type: 'Number'
        },
        //default input, same as text
        '[undefined]': {
            extend: '_default',
            addDataBind: function ($elm) {
                _.addDataBind($elm, this.binding, $elm.data('_ffBindTarget'));
                _.addDataBind($elm, "ffInlineUpdate", "null");
            }
        },
        '[text]': {
            binding: 'textInput',
            extend: '_default',
            addDataBind: function ($elm) {
                _.addDataBind($elm, this.binding, $elm.data('_ffBindTarget'));
                _.addDataBind($elm, "ffInlineUpdate", "null");
            },
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
                    extentions._default.vmSetup($elm, vm, child);
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
            vmSetup: _.empty,
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
            vmSetup: _.empty,
        },
        'if': {
            binding: 'if',
            vmSetup: _.empty,
            extend: '_default',
        },
        'ifnot': {
            binding: 'ifnot',
            vmSetup: _.empty,
            extend: '_default'
        },
        'visible': {
            init: function init(elm, content) {
                var result = {
                    $elm: elm,
                    content: content || ""
                };
                return result;
            },
            addDataBind: function ($elm, tokens) {
                _.addDataBind($elm, this.binding, tokens.content);
            },
            binding: 'ffVisible',
            vmSetup: _.empty,
            extend: '_default'
        },
        'class': {
            init: function init(elm, content) {
                var result = {
                    $elm: elm,
                    content: content || ""
                };
                return result;
            },
            binding: 'css',
            vmSetup: _.empty,
            extend: '_default',
            addDataBind: function ($elm, tokens) {
                var contentArray = tokens.content.split(/\s*,\s*/);
                var cssArray = contentArray.map(cssMap);
                var target = "{" + cssArray.join(",") + "}";
                _.addDataBind($elm, this.binding, target);

                function cssMap(value) {

                    var first, second, third;
                    if (value.startsWith("#")) {

                        first = value.substr(1);
                        second = ": $root._hash() === '" + value + "'"
                        return first + second;
                    }
                    if (value.startsWith("_")) {
                        first = "'" + value.substr(1);
                        second = "': $root._selected[$listId].indexOf(_key)";
                        third = first.startsWith("not") ? "=" : "!";
                        return first + second + third + "== -1";
                    }
                    return value + ": " + value;
                }
            },
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
                var selected = ff.vm._selected[id];
                var value;
                if (!id) return;
                if (!selected) {
                    selected = ko.observableArray([]);
                    ff.vm._selected[id] = selected;
                }
                if (!vm[id]) {
                    value = $elm.attr("value") || self.defaultValue;
                    vm[id] = ko.observable(value);
                }
                if (!child) {
                    vm[id].extend({ save: id });
                }
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
                vm[targetBind] = extentions.filter.change;
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
                vm[targetBind] = extentions.sort.click;
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
                sortParts = _.addToSortOrder(sortParts, $elm.data("_ffSortCommand"));
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
                if (_.isIn(lastChar, ['+', '-', '*', '/'])) {
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
                $elm.data('_ffValue', _.parseValue(array[1]));
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
                vm[targetBind] = extentions.set.click;
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
                    extentions.set.init(self, $this.attr("ff-set"));
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
                bc[target].extend({ save: target });//depricate save
                bc[target](result);
            },
            addDataBind: function ($elm) {
                var result = $elm.data("_ffDynamic");

                if (result) {
                    if (result[0] === "_") {
                        result = "$root." + result;
                    }
                    _.addDataBind($elm, "attr", "{'_ffkey':" + result + "}");
                }
                _.addDataBind($elm, this.binding, "$root." + $elm.data('_ffBindTarget'));
            },
            id: function ($elm) {
                return $elm.data("_ffBindTarget");
            }
        },
        'count': {
            init: function (elm, content, tokens) {
                var result = $.extend({}, tokens,
                    {
                        condition: content,
                        not: false
                    });
                var $elm = $(elm);
                var $totals = $elm.parent().closest("[ff-totals]");
                if (!$totals.length) return;
                if (content.startsWith("!")) {
                    result.not = true;
                    result.condition = content.substring(1);
                }
                //todo: figrue out why we need this            
                $elm.data("_ffBindTarget", "count_" + result.condition);
                result.bindTarget = "count_" + result.condition;
                result.listTarget = $totals.attr("ff-totals");

                return result;
            },
            extend: '_default',
            binding: 'text',
            vmSetup: function ($elm, vm, child, tokens) {
                var result = $.extend({}, tokens);
                //var tb = $elm.data("_ffBindTarget");
                var bindTarget = result.bindTarget;
                var listName = result.listTarget;
                var condition = result.condition;
                if (!bindTarget) return;
                vm[bindTarget] = ko.computed(function () {
                    var unwrappedValue = ko.utils.unwrapObservable(vm[listName]);
                    unwrappedValue = _.objectToArray(unwrappedValue);
                    if (unwrappedValue && unwrappedValue.length) {
                        return unwrappedValue.reduce(function (total, obj) {
                            //unwind doesn't triger change for computed observable 
                            //var shouldCount = _.unwind(obj, result.condition);
                            var unwrappedObject = _.unwrap(obj);
                            var shouldCount = unwrappedObject[condition] && _.unwrap(unwrappedObject[condition]);
                            if (result.not) {
                                shouldCount = !shouldCount;
                            }
                            return total + (shouldCount ? 1 : 0);
                        }, 0);
                    }
                    return 0;
                });
            },
            oldVmSetupForTotal: function ($elm, vm) {
                var tb = $elm.data("_ffBindTarget");
                var listName = $elm.data("_ffListTarget");
                var condition = $elm.data("_ffCondition");
                if (!tb) return;
                vm[tb] = ko.computed(function () {
                    var unwrappedValue = ko.utils.unwrapObservable(vm[listName]);
                    unwrappedValue = _.objectToArray(unwrappedValue);
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
                if (!_.isIn(content, ['facebook'])) {
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
                vm[targetBind] = extentions.login.click;
            },
            click: function (valueAccessor, allBindings, viewModel, bindingContext) {
                ff.fb.authWithOAuthPopup("facebook", function (error, authData) {
                    if (error) {
                        console.log("Login Failed!", error);
                    } else {
                        ff.vm._user().firstName(_.unwind(authData, "facebook.cachedUserProfile.first_name"));
                        ff.vm._user().lastName(_.unwind(authData, "facebook.cachedUserProfile.last_name"));
                        ff.vm._user().name(_.unwind(authData, "facebook.cachedUserProfile.name"));
                        ff.vm._user().imgUrl(_.unwind(authData, "facebook.cachedUserProfile.picture.data.url"));
                        ff.vm._user().isImgSilhouette(_.unwind(authData, "facebook.cachedUserProfile.picture.data.is_silhouette"));
                        ff.vm._user().timezone(_.unwind(authData, "facebook.cachedUserProfile.timezone"));
                        ff.vm._user().ageMin(_.unwind(authData, "facebook.cachedUserProfile.age_range.min"));
                        ff.vm._user().gender(_.unwind(authData, "facebook.cachedUserProfile.gender"));
                        ff.vm._user().id(_.unwind(authData, "facebook.cachedUserProfile.id"));
                        ff.vm._user().link(_.unwind(authData, "facebook.cachedUserProfile.link"));
                        ff.vm._user().locale(_.unwind(authData, "facebook.cachedUserProfile.locale"));
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
                    console.log('ff-push syntax error, missing equal sign, expect ff-push="myArray<"someval"');
                    return;
                }
                target = array[0];
                $elm.data('_ffValue', _.parseValue(array[1], ff.vm)); //todo: don't pass in vm, this will not work for nested properties
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
                vm[targetBind] = extentions.push.click;
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
                var value = $this.data("_ffValue");
                var target = $this.data("_ffTarget");
                var fbTarget = ff.fb.child(target);
                var child = fbTarget.push();
                var bc = bindingContext.$data;
                if (value[0] === '&') {
                    value = bc[value.substr(1)](); //todo: make safer?
                }
                child.set(ko.unwrap(value));
            },
        },
        'delete': { //Bug: removing last element doens't update vm.  
            init: function (elm, content, tokens) {
                var resultTokens = _.extend({}, tokens,
                    _.parseListTokens(content)
                );
                return resultTokens;
            },
            extend: '_default',
            binding: 'ffEvent',
            vmSetup: function ($elm, vm) { //todo: dry up
                if (!vm["deleteFromList"]) {
                    vm["deleteFromList"] = extentions.delete.click;
                }
            },
            click: function (valueAccessor, allBindings, viewModel, bindingContext) {
                var $this = $(this);
                var tokens = $this.data("_ffTokens");
                var newList = [];
                var oldList, listItem;
                if (tokens && tokens.listTarget) {
                    oldList = bindingContext.$data[tokens.listTarget];
                    newList = _.filterObject(oldList(), testItem);
                    function testItem(elm) {
                        listItem = _.unwind(elm, tokens.parameterTarget);
                        if (_.isUndefined(listItem)) {
                            console.warn("Property " + tokens.parameterTarget + " not found in  " + tokens.listTarget);
                            return true;
                        }
                        if (listItem) {
                            //todo: get path so this works in deep paths
                            ff.fb.child(tokens.listTarget).child(elm._key).remove();
                        }
                        return !listItem;
                    }
                    //if(oldList.length === newList.length)
                    oldList(newList);
                    return;
                }
                var list = $this.parent().closest("[ff-foreach]").attr("ff-foreach");
                var idToDelete = $this.data("keytoremove");
                //if there is only one item in the list, we must clear the vm's list because the vm will not get updated when data is null.
                //this may be fixed if we create a _meta tag in the db
                var listVm = bindingContext.$parent && bindingContext.$parent[list];

                if (_.objectToArray(listVm()).length === 1) {
                    listVm({});
                }
                ff.fb.child(list).child(idToDelete).remove();
            },
            addDataBind: function ($elm, tokens) {
                if (tokens && tokens.listTarget) {
                    _.addDataBind($elm, this.binding, "deleteFromList");
                    return;
                }
                _.addDataBind($elm, this.binding, "$parent.deleteFromList");
                _.addDataBind($elm, "attr", "{'data-keytoremove': _key}");
            },
        },
        'select': {
            init: function (elm, content, tokens) {
                var resultTokens = _.extend({}, tokens);
                return resultTokens;
            },
            extend: '_default',
            binding: 'ffEvent',
            vmSetup: function vmSetup($elm, vm) {
                ff.vm._select = extentions.select.event;
            },
            event: function event(valueAccessor, allBindings, viewModel, bindingContext) {
                console.log("in SELECT event", valueAccessor, allBindings, viewModel, bindingContext)
                var key = bindingContext.$data._key;
                var listId = bindingContext.$listId;
                var listTarget = bindingContext.$root._selected[listId];
                //todo: handel multi select,  if not atr-multi-select reset all list items to _active === false
                //if atr-multi-select use listTarget.push(key)
                listTarget([key]);
            },
            addDataBind: function ($elm) {
                _.addDataBind($elm, this.binding, "$root._select");
            },
        },
        'toggle': {
            init: function (elm, content, tokens) {
                var resultTokens = _.extend({}, tokens,
                    _.parseListTokens(content)
                );
                resultTokens.toggleState = false;
                return resultTokens;
            },
            extend: '_default',
            binding: 'ffEvent',
            vmSetup: function vmSetup($elm, vm) {
                ff.vm.$toggle = extentions.toggle.event;
            },
            event: function event(valueAccessor, allBindings, viewModel, bindingContext) {
                var $this = $(this);
                var tokens = $this.data("_ffTokens");
                var list;
                if (tokens && tokens.listTarget) {
                    tokens.toggleState = !tokens.toggleState;
                    list = bindingContext.$data[tokens.listTarget];
                    _.filterObject(list(), toggleValue);
                    function toggleValue(elm) {
                        var listItem = _.unwrap(elm);
                        if (_.isUndefined(listItem) && _.isFunciton(listItem[tokens.parameterTarget])) {
                            console.warn("Property " + tokens.listColumTest + " not found in  " + tokens.parameterTarget);
                            return true;
                        }
                        //todo: get path so this works in deep paths
                        listItem[tokens.parameterTarget](tokens.toggleState);
                        return true;
                    }
                    return;
                }
                var target = $this.attr("ff-toggle");
                var observable = viewModel[target];
                if (observable) {
                    observable(!observable());
                }
            },
            addDataBind: function ($elm) {
                _.addDataBind($elm, this.binding, "$root.$toggle");
            },
        },
        'populate': {
            init: function (elm, content) {
            },
            extend: '_default',
            binding: 'ffEvent',
            vmSetup: function ($elm, vm) { //todo: dry up
                if (!vm["populateForm"]) {
                    vm["populateForm"] = extentions["populate"].click;
                }

            },
            click: function (valueAccessor, allBindings, viewModel, bindingContext) {
                var $this = $(this);
                var formId = $this.attr("ff-populate");
                var $form = $("#" + formId);
                var $submit;
                var updateText;
                //var temp = $.extend({},  bindingContext.$data)
                var temp = ko.mapping.toJS(bindingContext.$data);
                bindingContext.$parent[formId](temp);
                $form.data("isUpdating", true);
                $submit = $form.find(":submit");
                if (!$submit.attr("atr-add-text")) {
                    $submit.attr("atr-add-text", $submit.text());
                }

                updateText = $submit.attr("atr-update-text");
                if (updateText) {
                    $submit.text(updateText);
                }
            },
            addDataBind: function ($elm) {
                _.addDataBind($elm, this.binding, "$parent.populateForm");
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
                vm[bindTarget] = extentions.submit.click;
                vm[formContent] = ko.observable({});
                //todo: dry
                //todo: get path???
                if (ff.vm[submitTarget]) { //if observable exists, extend so value is saved on changed, this may result in duplicate extend functions and don't know if this is a problem
                    ff.vm[submitTarget].extend({ save: submitTarget });
                } else { //else create observable and extend
                    ff.vm[submitTarget] = ko.observableArray([]).extend({ save: submitTarget }); //todo: if a later input elm has a default value, consider setting that value in a similar if clause for that input value
                    // ff.vm[submitTarget] = ko.observable().extend({ save: submitTarget }); //todo: if a later input elm has a default value, consider setting that value in a similar if clause for that input value
                }
                ff.vm[submitTarget].extend({ type: 'array' });
            },
            id: function ($elm) {
                return $elm.data("_ffBindTarget");
            },
            click: function (valueAccessor, allBindings, viewModel, bindingContext) {
                var $form = $(this);
                var isUpdating = $form.data("isUpdating");
                // when a dom element is removed and reloaded, data values are lost
                // when data is empty, re-init and get the data again
                // problem: _ffBindTarget is an incremented value so we have to call ffVmSetup too and now we have an orphaned vm value
                // problem: ouch form is not populated
                // todo: find a better way.  Consider setting a firefight id attribute.  
                var formContent = $form.data("_ffFormContent") || $form.ffInit(extend) || $form.ffVmSetup(ff.vm) || $form.data("_ffFormContent")
                var submitTarget = $form.data("_ffSubmitTarget");
                var $submit = $form.find(":submit");
                var addText = $submit.attr("atr-add-text");


                var child = getFirebaseChild();  //new child to be updated. 
                function getFirebaseChild() {
                    var fbTarget, fullPath;
                    var target = viewModel[submitTarget];
                    var pathArray = target && target.path // if no path (new data in fb) get path from DOM
                        || getPathFromDomContext($form);
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
                $form.reset();
                //$elm.add($elm.closest("form")).reset(); 

                if ($submit.attr("atr-add-text")) {
                    $submit.text(addText);
                }
            },
            addDataBind: function ($elm) {
                _.addDataBind($elm, this.binding, "$root." + $elm.data('_ffBindTarget'));
                _.addDataBind($elm, "with", "$root." + $elm.data('_ffFormContent'));
            },

        },
        // 'end-edit': {//consider renaming submit to form or target or formTarget
        //     init: function (elm, content) {  
        //         var $elm = $(elm);
        //         var id = $elm.attr("id");
        //         $elm.data('_ffSubmitTarget', content);
        //         ff.nextId += 1;//make  _pushClick unique so it doesn't get overridden if more then on set function
        //         //todo: get id

        //         $elm.data('_ffBindTarget',  "_submit" + ff.nextId);
        //         $elm.data('_ffFormContent', id || "_formContent" + ff.nextId);
        //         $elm.attr("ffContext", id || "_formContent" + ff.nextId);            
        //     },
        //     extend: '_default',
        //     binding: 'ffSubmit',
        //     vmSetup: function ($elm, vm) { //todo: dry up
        //         var bindTarget = $elm.data("_ffBindTarget");            
        //         var formContent = $elm.data("_ffFormContent");
        //         var submitTarget = $elm.data("_ffSubmitTarget");
        //         console.log("in ff-submit.vmSetup");
        //         vm[bindTarget] = extentions["end-edit"].click;
        //         vm[formContent] = ko.observable({});
        //         //todo: dry
        //         //todo: get path???
        //         if (ff.vm[submitTarget]) { //if observable exists, extend so value is saved on changed, this may result in duplicate extend functions and don't know if this is a problem
        //             ff.vm[submitTarget].extend({ save: submitTarget });
        //         } else { //else create observable and extend
        //             ff.vm[submitTarget] = ko.observableArray([{ hi: 'hi' }]).extend({ save: submitTarget }); //todo: if a later input elm has a default value, consider setting that value in a similar if clause for that input value
        //            // ff.vm[submitTarget] = ko.observable().extend({ save: submitTarget }); //todo: if a later input elm has a default value, consider setting that value in a similar if clause for that input value
        //         }
        //         ff.vm[submitTarget].extend({type: 'array'});
        //     },
        //     id: function ($elm) {
        //         return $elm.data("_ffBindTarget");
        //     },
        //     click: function (valueAccessor, allBindings, viewModel, bindingContext) {
        //         debugger;
        //         viewModel._active && viewModel._active(false); 
        //     },
        //     addDataBind: function ($elm) {
        //         _.addDataBind($elm, this.binding, "$root." + $elm.data('_ffBindTarget'));    
        //     },

        // },
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
                if (child) {
                    //vm[id].extend({ save: id });

                    vm[id].extend({ save: id });
                }
                vm[id].extend({ save: id });
                console.log("id: ", id);
                _.setupType($elm, vm[id]);
            },
            id: _.empty,
            binding: 'value',
            addDataBind: function ($elm) {
                _.addDataBind($elm, this.binding, $elm.data('_ffBindTarget'));
            },
        }
    };
    return extentions;
}
