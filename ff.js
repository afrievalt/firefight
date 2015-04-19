var ff = ff || {};
ff.vm = ff.vm || {};
ff.nextId = 0;

//ko extentions
ko.extenders.save = function (target, options) {
    target.subscribe(function (newVal) {
        var update = {};
        update[options] = newVal;
        ff.fb.update(update);
    });
    return target;
};

ko.bindingHandlers.ffEvent = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        if (valueAccessor) {
            $(element).on('click', valueAccessor().bind(element, valueAccessor, allBindings, viewModel, bindingContext));
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

ko.bindingHandlers.ffForEachObject = {
    makeTemplateValueAccessor: function (valueAccessor) {
        return function () {
            var modelValue = valueAccessor(),
                unwrappedValue = ko.utils.peekObservable(modelValue),    // Unwrap without setting a dependency here
                rewrapped;

            unwrappedValue = ff._.objectToArray(unwrappedValue);
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
        return ko.bindingHandlers['template']['init'](element, ko.bindingHandlers['ffForEachObject'].makeTemplateValueAccessor(valueAccessor));
    },
    update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        //Odd: if I don't use this next line, this function does not get called on update
        ko.utils.unwrapObservable(valueAccessor());
        return ko.bindingHandlers['template']['update'](element, ko.bindingHandlers['ffForEachObject'].makeTemplateValueAccessor(valueAccessor), allBindings, viewModel, bindingContext);
    },
};

ko.bindingHandlers.ffForEachObjectX = {
    makeTemplateValueAccessor: function (valueAccessor) {
        return function () {
            var modelValue = valueAccessor(),
                unwrappedValue = ko.utils.peekObservable(modelValue),    // Unwrap without setting a dependency here
                rewrapped;

            unwrappedValue = ff._.objectToArray(unwrappedValue);
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
        return ko.bindingHandlers['template']['init'](element, ko.bindingHandlers['ffForEachObject'].makeTemplateValueAccessor(valueAccessor));
    },
    update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var foo = valueAccessor();
        console.log("in update ===============================" + foo);
        return ko.bindingHandlers['template']['update'](element, ko.bindingHandlers['ffForEachObject'].makeTemplateValueAccessor(valueAccessor), allBindings, viewModel, bindingContext);
    }
};



//$ extentions
jQuery.fn.extend({
    reset: function () {
        var $form = this;
        $form.find("input:checked").trigger('click'); 
        $form.trigger("reset");
        $form.find("input").trigger('change');
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
            return vm[str];
        }
        return result;
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
    unwind: function (obj, str) {
        var ary = str.split(".");
        var first = obj[ary.shift()];
        if (ff._.isUndefined(first)) {
            return "";
        }
        if (ary.length === 1) {
            return first[ary[0]];
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
            if (ff._.isObject(obj)) {
                obj._key = key;
                result.push(obj);
            } else {
                result.push({ _key: key, _value: obj });
            }
        }
        return result;
    }
};
//ff extensions 
ff.extend = {
    '[number]': { extend: '_default' },
    '[undefined]': { extend: '_default' },
    '[text]': {
        binding: 'textInput',
        extend: '_default'
    },
    '[hidden]': {
        vmSetup: function ($elm, vm, child) {
            var id = $elm.data('_ffBindTarget');
            var userAttr = $elm.attr("atr-user");
            if (!id ) { return;}            
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
                    vm[id].extend({ save: id });
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
    'with': {
        binding: 'with',
        extend: '_defaultFf',
        vmSetup: ff._.empty,
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
        extend: '_default',
        binding: 'ffForEachObject',
        //vmSetup: function ($elm, vm) {
        //    var tb = $elm.data("_ffBindTarget");
        //    if (!tb) return;
        //    //tb = someKey.asArray, get key
        //    var key = tb.split(".")[0];
        //    var vmNode = ff._.safeVmNode(vm, key, {});
        //    vmNode.asArray = ko.computed(ff._.asArrayComputed(key));            
        //}
    },
    'set': {
        init: function (elm, content) {
            var $elm = $(elm);
            var operatorMap = {
                '=': function (p1, p2) {
                    return p2();
                },
                '+': function (p1, p2) {
                    return p1() + p2();
                },
                '-': function (p1, p2) {
                    return p1() - p2();
                },
                '*': function (p1, p2) {
                    return p1() * p2();
                },
                '/': function (p1, p2) {
                    return p1() / p2();
                }
            };
            var array = content.split('=', 2);
            var operator = '=';
            var target, lastChar;
            if (array.length !== 2) {
                console.log('ff-set syntax error, missing equal sign, expect ff-set="somevalue=0"');
                return;
            }
            target = array[0];
            lastChar = target.slice(-1);
            if (ff._.isIn(lastChar, ['+', '-', '*', '/'])) {
                target = target.substring(0, target.length - 1);
                operator = lastChar;
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
            var $this = $(this);
            var value = function () { return $this.data("_ffValue"); };
            var target = $this.data("_ffTarget");
            var func = $this.data("_ffOperatorFunc");
            var result = func(viewModel[target], value);

            viewModel[target](result);
        },
        id: function ($elm) {
            return $elm.data("_ffBindTarget");
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
                console.log('ff-push syntax error, missing equal sign, expect ff-push="myArray<"someval"');
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
        click: function () { 
            var $this = $(this);
            var value = $this.data("_ffValue");
            var target = $this.data("_ffTarget");
            var fbTarget = ff.fb.child(target);
            var child = fbTarget.push();
            child.set(ko.unwrap(value));
        },
    },
    'delete': { //Bug: removing last element doens't update vm.  
        init: function (elm, content) {            
        },
        extend: '_default',
        binding: 'ffEvent',
        vmSetup: function ($elm, vm) { //todo: dry up
            if (!vm["deleteFromList"])
            {
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
            if (listVm.asArray().length === 1) {
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
                $submit.attr("atr-add-text", $submit.text())
            }
                        
            var updateText = $submit.attr("atr-update-text")
            if (updateText) {
                $submit.text(updateText);
            }            
        },
        addDataBind: function ($elm) {
            ff._.addDataBind($elm, this.binding, "$parent.populateForm");
        },
    },
    'submit': {
        init: function (elm, content) {
            var $elm = $(elm);
            var id = $elm.attr("id");
            $elm.data('_ffSubmitTarget', content);
            ff.nextId += 1;//make  _pushClick unique so it doesn't get overridden if more then on set function
            //todo: get id
            
            $elm.data('_ffBindTarget',  "_submit" + ff.nextId);
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
            if (ff.vm[submitTarget]) { //if observable exists, extend so value is saved on changed, this may result in duplicate extend functions and don't know if this is a problem
                ff.vm[submitTarget].extend({ save: submitTarget });
            } else { //else create observable and extend
                ff.vm[submitTarget] = ko.observableArray([{ hi: 'hi' }]).extend({ save: submitTarget }); //todo: if a later input elm has a default value, consider setting that value in a similar if clause for that input value

            }
        },
        id: function ($elm) {
            return $elm.data("_ffBindTarget");
        },
        click: function (valueAccessor, allBindings, viewModel, bindingContext) {
            var $elm = $(this); // if this is the clicked button, we will have to go up the dom and grab the form
            var formContent = $elm.data("_ffFormContent");
            var submitTarget = $elm.data("_ffSubmitTarget");
            var fbTarget = ff.fb.child(submitTarget);
            console.log("in ff-submit.click");            
            var data = ko.mapping.toJS(viewModel[formContent]);
            var child = fbTarget.push();
            var id = data._key;
            if (id) {
                fbTarget.child(id).update(data);
            } else {
                child.set(data);//may need to use bind donctext, and ko.util.toJson            
            }
            
            $elm.closest("form").reset(); 
            //find("input:checked").trigger('click').trigger('change');
            //$elm.closest("form").trigger("reset");
            //$elm.closest("form").find("input").trigger('change');
            

            var $submit = $elm.find(":submit");
            var addText = $submit.attr("atr-add-text");
            if ($submit.attr("atr-add-text")) {
                $submit.text(addText);
            }
        },
        addDataBind: function ($elm) {
            ff._.addDataBind($elm, this.binding, $elm.data('_ffBindTarget'));
            ff._.addDataBind($elm, "with", $elm.data('_ffFormContent'));
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
            $elm.data('_ffBindTarget', $elm.attr('id'));
        },
        defaultValue: "",
        vmSetup: function ($elm, vm, child) {
            var id = $elm.data('_ffBindTarget');
            var self = this;
            var value;
            if (!id) return;
            if (!vm[id]) {
                value = $elm.attr("value") || self.defaultValue;
                vm[id] = ko.observable(value);
            }
            if (!child) {
                vm[id].extend({ save: id });
            }
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
        for (property in val) {
            if (val.hasOwnProperty(property)) {
                if (ff.vm.hasOwnProperty(property)) {
                    ff.vm[property](val[property]);
                } else {
                    ff.vm[property] = ko.observable(val[property]);
                }
            }
        }
        applyBindingsOnce();
    });

    function setRoot() {
        var fbName;
        var type;
        var rootAtr;
        ff.$root = $('[ff-root],[ff-connect]');
        if (ff.$root.length !== 1) return false;
        fbName = ff.$root.attr('ff-connect') || ff.$root.attr('ff-root');
        ff.options = {
            connectionType:ff.$root.attr('atr-type')
        };        
        ff.fb = new window.Firebase("https://" + fbName + ".firebaseio.com");
        rootAtr = ff.$root.attr('atr-root');
        if (rootAtr) {
            ff.fb = ff.fb.child(rootAtr);
        }
        return true;
    }

    function applyBindingsOnce() {
        extendVmFromFields();
        proccessComputedObservables();
        ko.applyBindings(ff.vm);        
        if (ff.options.connectionType === 'offline') {
            Firebase.goOffline();
        }
        applyBindingsOnce = function () { };
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
        ff.$root.find("input,select,textarea,[ff-set],[ff-push],[ff-foreach],[ff-submit],[ff-login],[ff-with],[ff-hide],[ff-delete],[ff-populate],[ff-src]").each(function (i, elm) {
            var $elm = $(elm);
            // ReSharper disable once UnusedLocals
            $elm.ffInit();
            $elm.ffVmSetup(ff.vm); //todo: pass in vm context
            $elm.ffAddDataBind();
        });
    }
})();
