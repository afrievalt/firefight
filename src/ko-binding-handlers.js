import ko from 'knockout'
import jQuery from 'jquery'
import _ from './utility.js'
import getExtentions from './extentions.js'

let $ = jQuery;

ko.bindingHandlers.ffEvent = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var event = $(element).attr("atr-event") || 'click';
        if (valueAccessor && valueAccessor()) {
            $(element).on(event, valueAccessor().bind(element, valueAccessor, allBindings, viewModel, bindingContext));
        }
    }
};

ko.bindingHandlers.ffInlineUpdate = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var ESC = 27;
        var LF = 10;
        var CR = 13; //carrage return
        //var listId = _.unwrapValueAccessor(valueAccessor);
        var listId = ko.contextFor(element).$listId;
        let $elm = $(element);
        var valueBinding, orgValue;

        if (listId) {
            valueBinding = allBindings().value;  //we grab the value binding as in data-bind="value: something"
            $(element).keypress(handleReturn);
            $(element).keyup(handleEscape);
        }
        return;

        function handleReturn(e) {
            if (e.which === LF || e.which === CR) {
                let newVal = $elm.val();
                unselect();
                console.log("in return");

                if ($elm.hasAttr("atr-trim") && valueBinding) {
                    newVal = newVal.trim()
                    valueBinding(newVal);

                }
                //delete if empty
                if (newVal === "") {
                    $elm.next("[atr-empty]").click();
                }
                $elm.blur(); //force blur for ie 
            }
        }

        function handleEscape(e) {//if escaped, grab original value, wait and reset original value
            if (e.which === ESC) {
                unselect();
                orgValue = valueBinding && valueBinding()
                if (!_.isUndefined(orgValue)) {
                    setTimeout(resetValue, 100);
                    function resetValue() {
                        valueBinding(orgValue);
                    }
                }
            }
        }

        function unselect() {
            //ff.vm._selected[listId]([]); //todo: handle multi-select, find index and delete
            bindingContext.$root._selected[listId]([]); //todo: handle multi-select, find index and delete
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
            if (event.preventDefault) {
                event.preventDefault();  //prevent site from submitting
            }
            console.log("in ffSubmit");
            $(":focus").blur();
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

ko.bindingHandlers.ffVisible = {
    //todo: rename get Objects Length, move into update
    testForObject: function (valueAccessor) {
        var list, length;
        //If the valueAccessor is not an object, return itself.  
        //If the valueAccessor is an object, retrun count of attributes
        var unwrapped = _.unwrapValueAccessor(valueAccessor);
        if (_.isObject(unwrapped)) {
            list = _.objectToArray(unwrapped);
            length = list.reduce(countProperties, 0);
            return _.wrap(length);
        }
        return valueAccessor;

        function countProperties(total, obj) {
            return total + 1;
        }
    },
    // init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {        
    //     var ffValueAccessor = ko.bindingHandlers.ffVisible.testForObject(valueAccessor);
    //     return ko.bindingHandlers.visible.init(element, ffValueAccessor, allBindings, viewModel, bindingContext)
    // },
    update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var ffValueAccessor = ko.bindingHandlers.ffVisible.testForObject(valueAccessor);
        return ko.bindingHandlers.visible.update(element, ffValueAccessor, allBindings, viewModel, bindingContext)
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
    makeTemplateValueAccessor: function (valueAccessor, element, bindingContext) {
        return function () {
            var $elm = $(element),
                modelValue = valueAccessor(),
                unwrappedValue = ko.utils.peekObservable(modelValue),    // Unwrap without setting a dependency here
                sortOrder = $elm.attr("atr-sortorder"),
                filter = $elm.attr("atr-filter"),
                rewrapped;
            ko.utils.extend(bindingContext, {
                $list: _.unwrapValueAccessor(valueAccessor),
                $listId: $elm.attr("ff-foreach")
            });

            unwrappedValue = _.objectToArray(unwrappedValue);
            filter && (unwrappedValue = unwrappedValue.filter(filterCallback)); //if filter
            sortOrder && (unwrappedValue = unwrappedValue.sort(_.sort(sortOrder)));
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
        return ko.bindingHandlers['template']['init'](element, ko.bindingHandlers['ffForEachObject'].makeTemplateValueAccessor(valueAccessor, element, bindingContext), allBindings, viewModel, bindingContext);
    },
    update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        //Odd: if I don't use this next line, this function does not get called on update
        ko.utils.unwrapObservable(valueAccessor());
        return ko.bindingHandlers['template']['update'](element, ko.bindingHandlers['ffForEachObject'].makeTemplateValueAccessor(valueAccessor, element, bindingContext), allBindings, viewModel, bindingContext);
    },
};
